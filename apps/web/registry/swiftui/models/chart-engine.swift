import Foundation
import CoreGraphics

public struct FabricatorChartSeries: Identifiable, Equatable, Sendable {
    public var id: String
    public var title: String
    public var color: String?
    public var isDashed: Bool
    public init(id: String, title: String, color: String? = nil, isDashed: Bool = false) {
        self.id = id; self.title = title; self.color = color; self.isDashed = isDashed
    }
}

public struct FabricatorChartRow: Identifiable, Equatable, Sendable {
    public var id: String
    public var label: String
    public var values: [String: Double]
    public init(id: String, label: String, values: [String: Double]) {
        self.id = id; self.label = label; self.values = values
    }
}

public struct FabricatorResolvedChartSeries: Identifiable, Equatable, Sendable {
    public var id: String { series.id }
    public var series: FabricatorChartSeries
    public var color: String
}

public struct FabricatorChartPart: Identifiable, Equatable, Sendable {
    public var id: String
    public var label: String
    public var value: Double
    public var color: String
    public var rowIDs: [String]
}

public enum FabricatorChartStep: Sendable { case backward, forward, start, end }

public struct FabricatorStatusPeriod: Identifiable, Equatable, Sendable {
    public var id: String
    public var label: String
    public var status: String?
    public var note: String?
    public init(id: String, label: String, status: String? = nil, note: String? = nil) {
        self.id = id; self.label = label; self.status = status; self.note = note
    }
}
public struct FabricatorStatusStyle: Equatable, Sendable {
    public var title: String
    public var color: String
    public var opacity: Double
    public init(title: String, color: String, opacity: Double = 1) { self.title = title; self.color = color; self.opacity = opacity }
}
public struct FabricatorStatusPill: Identifiable, Equatable, Sendable {
    public var id: String { period.id }
    public var period: FabricatorStatusPeriod
    public var index: Int
    public var x: Double
    public var width: Double
    public var status: FabricatorStatusStyle
}
public struct FabricatorStatusBarLayout: Equatable, Sendable {
    public var pills: [FabricatorStatusPill]
    public var uptime: Double?
}
public enum FabricatorStatusBarEngine {
    public static let noData = FabricatorStatusStyle(title: "No data", color: "muted-foreground", opacity: 0.3)
    public static let defaults: [String: FabricatorStatusStyle] = [
        "operational": FabricatorStatusStyle(title: "Operational", color: "success"),
        "degraded": FabricatorStatusStyle(title: "Degraded", color: "warning"),
        "outage": FabricatorStatusStyle(title: "Outage", color: "destructive"),
        "maintenance": FabricatorStatusStyle(title: "Maintenance", color: "info"),
        "none": noData,
    ]
    public static func layout(_ periods: [FabricatorStatusPeriod], width: Double, statuses: [String: FabricatorStatusStyle] = [:]) -> FabricatorStatusBarLayout {
        guard !periods.isEmpty, width.isFinite, width > 0 else { return FabricatorStatusBarLayout(pills: [], uptime: nil) }
        let count = periods.count
        func pillWidth(_ gap: Double, _ shown: Int) -> Double { (width - gap * Double(shown - 1)) / Double(shown) }
        var gap = pillWidth(3, count) >= 6 ? 3.0 : 2.0
        var shown = count
        if pillWidth(gap, count) < 4 { shown = min(count, max(1, Int(floor((width + 2) / 6)))); gap = 2 }
        let first = count - shown, step = (width + gap) / Double(shown)
        var styles = defaults.merging(statuses) { _, replacement in replacement }
        var extra = 0
        for period in periods {
            guard let key = period.status, !key.isEmpty, styles[key] == nil else { continue }
            styles[key] = FabricatorStatusStyle(title: key, color: extra < 8 ? "chart-series-\(extra + 1)" : "muted-foreground")
            extra += 1
        }
        let pills = periods.suffix(shown).enumerated().map { position, period in
            let x = (Double(position) * step).rounded()
            let key = period.status.flatMap { $0.isEmpty ? nil : $0 } ?? "none"
            return FabricatorStatusPill(period: period, index: first + position, x: x, width: max(1, (Double(position + 1) * step).rounded() - gap - x), status: styles[key] ?? noData)
        }
        let withData = pills.filter { !($0.period.status ?? "").isEmpty && $0.period.status != "none" }
        let uptime = withData.isEmpty ? nil : Double(withData.filter { $0.period.status == "operational" }.count) / Double(withData.count)
        return FabricatorStatusBarLayout(pills: pills, uptime: uptime)
    }
}

public enum FabricatorChartEngine {
    public static func series(_ values: [FabricatorChartSeries], hidden: Set<String> = []) -> [FabricatorResolvedChartSeries] {
        values.enumerated().compactMap { index, series in
            guard !hidden.contains(series.id) else { return nil }
            let color = series.color ?? (index < 8 ? "chart-series-\(index + 1)" : "muted-foreground")
            let resolved = color.hasPrefix("var(--") && color.hasSuffix(")") ? String(color.dropFirst(6).dropLast()) : color
            return FabricatorResolvedChartSeries(series: series, color: resolved)
        }
    }

    public static func parts(_ rows: [FabricatorChartRow], valueKey: String) -> [FabricatorChartPart] {
        let entries = rows.enumerated().compactMap { index, row -> (index: Int, row: FabricatorChartRow, value: Double)? in
            guard let value = row.values[valueKey], value.isFinite, value > 0 else { return nil }
            return (index, row, value)
        }
        let ranked = entries.sorted { $0.value == $1.value ? $0.index < $1.index : $0.value > $1.value }
        let shouldFold = entries.count > 8
        let kept = Set((shouldFold ? Array(ranked.prefix(7)) : ranked).map(\.index))
        var parts = entries.filter { kept.contains($0.index) }.enumerated().map { index, entry in
            FabricatorChartPart(id: entry.row.id, label: entry.row.label, value: entry.value, color: "chart-series-\(index + 1)", rowIDs: [entry.row.id])
        }
        if shouldFold {
            let folded = ranked.filter { !kept.contains($0.index) }
            parts.append(FabricatorChartPart(id: "__other", label: "Other", value: folded.reduce(0) { $0 + $1.value }, color: "muted-foreground", rowIDs: folded.map { $0.row.id }))
        }
        return parts
    }

    public static func step(_ current: Int?, key: FabricatorChartStep, count: Int) -> Int? {
        guard count > 0 else { return nil }
        switch key {
        case .start: return 0
        case .end: return count - 1
        case .forward: return min(count - 1, (current ?? -1) + 1)
        case .backward: return max(0, (current ?? count) - 1)
        }
    }

    public static func format(_ value: Double, compact: Bool = false) -> String {
        guard value.isFinite else { return "–" }
        if compact {
            let units: [(Double, String)] = [(1e12, "T"), (1e9, "B"), (1e6, "M"), (1e3, "K")]
            if let index = units.firstIndex(where: { abs(value) >= $0.0 }) {
                let scaled = abs(value) / units[index].0
                let decimals = scaled < 10 ? 1 : 0
                let factor = pow(10.0, Double(decimals))
                let rounded = (scaled * factor).rounded() / factor
                if rounded >= 1000, index > 0 { return format((value < 0 ? -1 : 1) * units[index - 1].0, compact: true) }
                return (value < 0 ? "-" : "") + plain(rounded, decimals: decimals, grouped: false) + units[index].1
            }
            return plain(value, decimals: abs(value) < 10 ? 1 : 0)
        }
        return plain(value, decimals: 2)
    }

    public static func percent(_ share: Double) -> String {
        guard share.isFinite else { return "–" }
        return plain(share * 100, decimals: 1, grouped: false) + "%"
    }

    private static func plain(_ value: Double, decimals: Int, grouped: Bool = true) -> String {
        let factor = pow(10.0, Double(decimals))
        let rounded = (abs(value) * factor).rounded() / factor
        var text = String(format: "%.*f", locale: Locale(identifier: "en_US_POSIX"), decimals, rounded)
        if text.contains(".") {
            while text.hasSuffix("0") { text.removeLast() }
            if text.hasSuffix(".") { text.removeLast() }
        }
        let parts = text.split(separator: ".", omittingEmptySubsequences: false)
        let whole = String(parts[0])
        let groups = whole.reversed().enumerated().map { index, character in (grouped && index > 0 && index % 3 == 0 ? "," : "") + String(character) }.joined().reversed()
        let fraction = parts.count > 1 ? "." + parts[1] : ""
        return (value < 0 && rounded > 0 ? "-" : "") + String(groups) + fraction
    }
}

public enum FabricatorTreemapLayout {
    public static func layout(_ values: [Double], in bounds: CGRect) -> [CGRect] {
        var result = Array(repeating: CGRect.zero, count: values.count)
        var entries = values.enumerated().filter { $0.element.isFinite && $0.element > 0 }.sorted { $0.element == $1.element ? $0.offset < $1.offset : $0.element > $1.element }
        var remaining = entries.reduce(0) { $0 + $1.element }
        var box = bounds
        let ratio = (1 + sqrt(5.0)) / 2
        while !entries.isEmpty, remaining > 0, box.width > 0, box.height > 0 {
            let alpha = max(box.height / box.width, box.width / box.height) / (remaining * ratio)
            var count = 1, sum = entries[0].element
            var minimum = sum, maximum = sum
            var beta = sum * sum * alpha
            var best = max(maximum / beta, beta / minimum)
            while count < entries.count {
                let value = entries[count].element
                let nextSum = sum + value, nextMinimum = min(minimum, value), nextMaximum = max(maximum, value)
                beta = nextSum * nextSum * alpha
                let candidate = max(nextMaximum / beta, beta / nextMinimum)
                if candidate > best { break }
                sum = nextSum; minimum = nextMinimum; maximum = nextMaximum; best = candidate; count += 1
            }
            var cursor: CGFloat = 0
            if box.width < box.height {
                let height = box.height * sum / remaining
                for entry in entries.prefix(count) {
                    let width = box.width * entry.element / sum
                    result[entry.offset] = CGRect(x: box.minX + cursor, y: box.minY, width: width, height: height)
                    cursor += width
                }
                box = CGRect(x: box.minX, y: box.minY + height, width: box.width, height: max(0, box.height - height))
            } else {
                let width = box.width * sum / remaining
                for entry in entries.prefix(count) {
                    let height = box.height * entry.element / sum
                    result[entry.offset] = CGRect(x: box.minX, y: box.minY + cursor, width: width, height: height)
                    cursor += height
                }
                box = CGRect(x: box.minX + width, y: box.minY, width: max(0, box.width - width), height: box.height)
            }
            remaining -= sum
            entries.removeFirst(count)
        }
        return result
    }
}
