import Foundation

public struct FabricatorSankeyNode: Identifiable, Equatable, Sendable {
    public var id: String
    public var title: String
    /// Kept for source compatibility. Layout derives columns from the flow graph.
    public var column: Int
    public var color: String?
    public init(id: String, title: String, column: Int = 0, color: String? = nil) { self.id = id; self.title = title; self.column = column; self.color = color }
}
public struct FabricatorSankeyLink: Identifiable, Equatable, Sendable {
    public var id: String { source + ":" + target }
    public var source: String
    public var target: String
    public var value: Double
    public init(source: String, target: String, value: Double) { self.source = source; self.target = target; self.value = value }
}
public enum FabricatorSankeyLayoutError: Error, Equatable, Sendable, LocalizedError {
    case duplicateNode(String), unknownNode(String), cycle([String]), nonFiniteFlow([String]), invalidConfiguration(String)
    public var errorDescription: String? {
        switch self {
        case .duplicateNode(let id): "Two flow nodes have the id \"\(id)\"."
        case .unknownNode(let id): "A flow names \"\(id)\", which is not in nodes."
        case .cycle(let nodes): "Flows cannot loop: \(nodes.joined(separator: " → "))."
        case .nonFiniteFlow(let nodes): "Flow totals exceed the supported number range: \(nodes.joined(separator: ", "))."
        case .invalidConfiguration(let option): "Invalid Sankey layout option: \(option)."
        }
    }
}
public struct FabricatorSankeyLayoutNode: Identifiable, Equatable, Sendable {
    public var id: String
    public var title: String
    public var color: String
    public var column: Int
    public var x: Double
    public var y: Double
    public var width: Double
    public var height: Double
    public var valueIn: Double
    public var valueOut: Double
    public var value: Double
    public var valueText: String
    public var isLabelBefore: Bool
    public var labelLines: Int
}
public struct FabricatorSankeyLayoutLink: Identifiable, Equatable, Sendable {
    public var id: String
    public var source: String
    public var target: String
    public var inputIndex: Int
    public var value: Double
    public var color: String
    public var x0: Double
    public var x1: Double
    public var sourceTop: Double
    public var sourceBottom: Double
    public var targetTop: Double
    public var targetBottom: Double
    public var share: Double
}
public struct FabricatorSankeyLayout: Equatable, Sendable {
    public var nodes: [FabricatorSankeyLayoutNode]
    public var links: [FabricatorSankeyLayoutLink]
    public var series: [FabricatorResolvedChartSeries]
    public var columns: Int
    public var markCount: Int { links.count + nodes.count }
}
public struct FabricatorSankeyHighlight: Equatable, Sendable {
    public var nodes: Set<String>
    public var links: Set<String>
}
private final class SankeyPosition {
    let id: String
    let order: Int
    var y: Double = 0
    var height: Double = 0
    var center: Double { y + height / 2 }
    init(id: String, order: Int) { self.id = id; self.order = order }
}

/// Port of shared/lib/chart-sankey-model.ts, including its six relaxation passes.
public enum FabricatorSankeyEngine {
    public static func layout(nodes: [FabricatorSankeyNode], links: [FabricatorSankeyLink], width: Double, height: Double, fontSize: Double = 12, hidden: Set<String> = [], nodeWidth: Double = 10, nodePadding: Double = 16, iterations: Int = 6) throws(FabricatorSankeyLayoutError) -> FabricatorSankeyLayout {
        var byID: [String: Int] = [:]
        for (index, node) in nodes.enumerated() {
            guard byID[node.id] == nil else { throw .duplicateNode(node.id) }
            byID[node.id] = index
        }
        for link in links { for id in [link.source, link.target] { guard byID[id] != nil else { throw .unknownNode(id) } } }
        let series = FabricatorChartEngine.series(nodes.map { FabricatorChartSeries(id: $0.id, title: $0.title, color: $0.color) })
        let empty = FabricatorSankeyLayout(nodes: [], links: [], series: series, columns: 0)
        guard width.isFinite, height.isFinite, width > 0, height > 0 else { return empty }
        guard fontSize.isFinite, fontSize > 0, nodeWidth.isFinite, nodeWidth >= 0, nodePadding.isFinite, nodePadding >= 0, iterations >= 0 else { throw .invalidConfiguration("font size, node width, padding or iterations") }
        let kept = links.enumerated().filter { _, link in link.value.isFinite && link.value > 0 && !hidden.contains(link.source) && !hidden.contains(link.target) }
        let connected = Set(kept.flatMap { [$0.element.source, $0.element.target] })
        let ids = nodes.map(\.id).filter { connected.contains($0) }
        guard !ids.isEmpty else { return empty }
        var outgoing: [String: [String]] = [:]
        for (_, link) in kept { outgoing[link.source, default: []].append(link.target) }
        let columnOf = try columns(ids, outgoing: outgoing)
        let columnCount = (columnOf.values.max() ?? 0) + 1
        var valueIn = Dictionary(uniqueKeysWithValues: ids.map { ($0, 0.0) })
        var valueOut = valueIn
        for (_, link) in kept { valueOut[link.source, default: 0] += link.value; valueIn[link.target, default: 0] += link.value }
        let overflow = ids.filter { !(valueIn[$0] ?? 0).isFinite || !(valueOut[$0] ?? 0).isFinite }
        guard overflow.isEmpty else { throw .nonFiniteFlow(overflow) }
        func value(_ id: String) -> Double { max(valueIn[id] ?? 0, valueOut[id] ?? 0) }
        var groups = Array(repeating: [SankeyPosition](), count: columnCount)
        var positions: [String: SankeyPosition] = [:]
        for id in ids {
            guard let order = byID[id], let column = columnOf[id] else { throw .unknownNode(id) }
            let position = SankeyPosition(id: id, order: order)
            groups[column].append(position); positions[id] = position
        }
        let tallest = groups.map(\.count).max() ?? 1
        let padding = min(nodePadding, height * 0.5 / Double(max(1, tallest - 1)))
        var scale = Double.infinity
        for group in groups where !group.isEmpty {
            let total = group.reduce(0.0) { total, node in total + value(node.id) }
            let available = height - Double(group.count - 1) * padding
            scale = min(scale, available / total)
        }
        guard scale.isFinite, scale > 0 else { throw .nonFiniteFlow(ids) }
        for group in groups {
            var y = 0.0
            for node in group { node.height = value(node.id) * scale; node.y = y; y += node.height + padding }
            let offset = (height - (y - padding)) / 2
            for node in group { node.y += offset }
        }
        func relax(_ index: Int, towardTargets: Bool, alpha: Double) {
            for node in groups[index] {
                let neighbours = kept.filter { towardTargets ? $0.element.source == node.id : $0.element.target == node.id }
                let total = neighbours.reduce(0) { $0 + $1.element.value }
                guard total > 0 else { continue }
                let target = neighbours.reduce(0) { sum, pair in
                    let id = towardTargets ? pair.element.target : pair.element.source
                    return sum + (pair.element.value / total) * (positions[id]?.center ?? 0)
                }
                node.y += (target - node.center) * alpha
            }
            resolveCollisions(&groups[index], padding: padding, height: height)
        }
        for index in groups.indices { resolveCollisions(&groups[index], padding: padding, height: height) }
        for pass in 0..<iterations {
            let alpha = pow(0.99, Double(pass))
            if columnCount >= 2 { for index in stride(from: columnCount - 2, through: 0, by: -1) { relax(index, towardTargets: true, alpha: alpha) } }
            for index in 1..<columnCount { relax(index, towardTargets: false, alpha: alpha) }
        }
        let barWidth = min(nodeWidth, width)
        func x(_ column: Int) -> Double { columnCount <= 1 ? 0 : Double(column) * (width - barWidth) / Double(columnCount - 1) }
        let columnGap = columnCount <= 1 ? width : x(1) - x(0) - barWidth
        let lineHeight = fontSize * 1.3
        var placedNodes: [FabricatorSankeyLayoutNode] = []
        for (column, group) in groups.enumerated() {
            for (index, node) in group.enumerated() {
                let datum = nodes[node.order], color = series[node.order].color
                let text = FabricatorChartEngine.format(value(node.id))
                let roomAbove = index > 0 ? (node.y - groups[column][index - 1].y - groups[column][index - 1].height) / 2 : node.y
                let roomBelow = index + 1 < group.count ? (group[index + 1].y - node.y - node.height) / 2 : height - node.y - node.height
                let room = columnGap - 12
                let fitsName = Double(datum.title.utf16.count) * fontSize * 0.6 <= room
                let fitsValue = Double(text.utf16.count) * fontSize * 0.6 <= room
                let lines = fitsName && fitsValue && (2 * lineHeight - node.height) / 2 <= min(roomAbove, roomBelow) ? 2 : fitsName && (lineHeight - node.height) / 2 <= min(roomAbove, roomBelow) ? 1 : 0
                placedNodes.append(FabricatorSankeyLayoutNode(id: node.id, title: datum.title, color: color, column: column, x: x(column), y: node.y, width: barWidth, height: node.height, valueIn: valueIn[node.id] ?? 0, valueOut: valueOut[node.id] ?? 0, value: value(node.id), valueText: text, isLabelBefore: column == columnCount - 1 && columnCount > 1, labelLines: lines))
            }
        }
        let placed = Dictionary(uniqueKeysWithValues: placedNodes.map { ($0.id, $0) })
        var sourceTops: [Int: Double] = [:], targetTops: [Int: Double] = [:]
        for node in placedNodes {
            for isSource in [true, false] {
                let entries = kept.enumerated().filter { _, pair in isSource ? pair.element.source == node.id : pair.element.target == node.id }.sorted { first, second in
                    let firstID = isSource ? first.element.element.target : first.element.element.source
                    let secondID = isSource ? second.element.element.target : second.element.element.source
                    let firstCenter = placed[firstID].map { $0.y + $0.height / 2 } ?? 0, secondCenter = placed[secondID].map { $0.y + $0.height / 2 } ?? 0
                    return firstCenter == secondCenter ? first.offset < second.offset : firstCenter < secondCenter
                }
                let total = isSource ? node.valueOut : node.valueIn
                var y = node.y + (node.height - total * scale) / 2
                for entry in entries { if isSource { sourceTops[entry.offset] = y } else { targetTops[entry.offset] = y }; y += entry.element.element.value * scale }
            }
        }
        var seen: Set<String> = []
        var placedLinks: [FabricatorSankeyLayoutLink] = []
        for (index, pair) in kept.enumerated() {
            let link = pair.element
            guard let source = placed[link.source], let target = placed[link.target], let sourceTop = sourceTops[index], let targetTop = targetTops[index] else { throw .unknownNode(link.source) }
            let base = "\(link.source)→\(link.target)"
            let id = seen.insert(base).inserted ? base : "\(base)#\(index)"
            let thickness = link.value * scale
            placedLinks.append(FabricatorSankeyLayoutLink(id: id, source: link.source, target: link.target, inputIndex: pair.offset, value: link.value, color: source.color, x0: source.x + source.width, x1: target.x, sourceTop: sourceTop, sourceBottom: sourceTop + thickness, targetTop: targetTop, targetBottom: targetTop + thickness, share: link.value / source.valueOut))
        }
        placedLinks.sort { first, second in
            let firstColumn = columnOf[first.source] ?? 0, secondColumn = columnOf[second.source] ?? 0
            if firstColumn != secondColumn { return firstColumn < secondColumn }
            if first.sourceTop != second.sourceTop { return first.sourceTop < second.sourceTop }
            if first.targetTop != second.targetTop { return first.targetTop < second.targetTop }
            return first.inputIndex < second.inputIndex
        }
        return FabricatorSankeyLayout(nodes: placedNodes, links: placedLinks, series: series, columns: columnCount)
    }

    public static func markAt(x: Double, y: Double, in model: FabricatorSankeyLayout) -> Int? {
        for (index, node) in model.nodes.enumerated() {
            let reachX = max(0, (24 - node.width) / 2), reachY = max(2, (8 - node.height) / 2)
            if x >= node.x - reachX && x <= node.x + node.width + reachX && y >= node.y - reachY && y <= node.y + node.height + reachY { return model.links.count + index }
        }
        var selected: Int?, distance = Double.infinity
        for (index, link) in model.links.enumerated() where x >= link.x0 && x <= link.x1 {
            let blend = ribbonBlend(x: x, x0: link.x0, x1: link.x1)
            let top = link.sourceTop + (link.targetTop - link.sourceTop) * blend, bottom = link.sourceBottom + (link.targetBottom - link.sourceBottom) * blend
            let next = abs(y - (top + bottom) / 2)
            if next <= max(bottom - top, 8) / 2 && next < distance { selected = index; distance = next }
        }
        return selected
    }

    public static func highlight(index: Int, in model: FabricatorSankeyLayout) -> FabricatorSankeyHighlight? {
        guard index >= 0 else { return nil }
        if model.links.indices.contains(index) { let link = model.links[index]; return FabricatorSankeyHighlight(nodes: [link.source, link.target], links: [link.id]) }
        let position = index - model.links.count
        guard model.nodes.indices.contains(position) else { return nil }
        let node = model.nodes[position]
        let touching = model.links.filter { $0.source == node.id || $0.target == node.id }
        return FabricatorSankeyHighlight(nodes: Set([node.id] + touching.map { $0.source == node.id ? $0.target : $0.source }), links: Set(touching.map(\.id)))
    }

    private static func columns(_ ids: [String], outgoing: [String: [String]]) throws(FabricatorSankeyLayoutError) -> [String: Int] {
        var state: [String: Bool] = [:], stack: [String] = [], order: [String] = []
        func visit(_ id: String) throws(FabricatorSankeyLayoutError) {
            state[id] = false; stack.append(id)
            for next in outgoing[id] ?? [] {
                if state[next] == false { let start = stack.firstIndex(of: next) ?? 0; throw .cycle(Array(stack[start...]) + [next]) }
                if state[next] == nil { try visit(next) }
            }
            stack.removeLast(); state[id] = true; order.append(id)
        }
        for id in ids where state[id] == nil { try visit(id) }
        var columns = Dictionary(uniqueKeysWithValues: ids.map { ($0, 0) })
        for id in order.reversed() { for next in outgoing[id] ?? [] { columns[next] = max(columns[next] ?? 0, (columns[id] ?? 0) + 1) } }
        let last = columns.values.max() ?? 0
        for id in ids where (outgoing[id] ?? []).isEmpty { columns[id] = last }
        return columns
    }
    private static func resolveCollisions(_ column: inout [SankeyPosition], padding: Double, height: Double) {
        column.sort { $0.y == $1.y ? $0.order < $1.order : $0.y < $1.y }
        var edge = 0.0
        for node in column { if node.y < edge { node.y = edge }; edge = node.y + node.height + padding }
        edge = height
        for node in column.reversed() { if node.y + node.height > edge { node.y = edge - node.height }; edge = node.y - padding }
    }
    private static func ribbonBlend(x: Double, x0: Double, x1: Double) -> Double {
        guard x1 > x0 else { return 0 }
        let along = (x - x0) / (x1 - x0)
        var low = 0.0, high = 1.0
        for _ in 0..<24 { let t = (low + high) / 2; if 1.5 * t - 1.5 * t * t + t * t * t < along { low = t } else { high = t } }
        let t = (low + high) / 2
        return 3 * t * t - 2 * t * t * t
    }
}
