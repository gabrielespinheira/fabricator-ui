import Foundation

enum FabricatorTableCellAlignment: String, Decodable, Sendable { case start, center, end }
struct FabricatorTableColumnMetrics: Decodable, Sendable {
    var size: Double
    var minSize: Double
    var align: FabricatorTableCellAlignment
    var sortDescFirst: Bool
}

public enum FabricatorTableColumnType: String, CaseIterable, Sendable {
    case text, number, currency, percent, date, status, tags, person, link, email, boolean, progress
    public var isNumeric: Bool { [.number, .currency, .percent, .progress].contains(self) }
    private var metrics: FabricatorTableColumnMetrics {
        guard let metrics = FabricatorContract.shared.dataTable[rawValue] else { preconditionFailure("Missing Data Table type defaults: \(rawValue)") }
        return metrics
    }
    public var defaultWidth: Double { metrics.size }
    public var minimumWidth: Double { metrics.minSize }
    public var isDescendingSortFirst: Bool { metrics.sortDescFirst }
    var cellAlignment: FabricatorTableCellAlignment { metrics.align }
}
public enum FabricatorTableFilterOperation: String, CaseIterable, Sendable {
    case contains, notContains, `is`, isNot, startsWith, endsWith, eq, neq, gt, gte, lt, lte, between, within, on, before, after, onOrBefore, onOrAfter, anyOf, noneOf, hasAny, hasAll, hasNone, checked, unchecked, empty, notEmpty
}
public struct FabricatorTableFilter: Sendable, Equatable {
    public var operation: FabricatorTableFilterOperation
    public var value: String
    public var to: String
    public init(operation: FabricatorTableFilterOperation = .contains, value: String = "", to: String = "") { self.operation = operation; self.value = value; self.to = to }
}
public struct FabricatorTableSort: Sendable, Equatable { public var columnID: String; public var ascending: Bool; public init(_ columnID: String, ascending: Bool = true) { self.columnID = columnID; self.ascending = ascending } }
public enum FabricatorTableAggregate: String, CaseIterable, Sendable { case count, filled, empty, unique, sum, average, median, min, max, checked, unchecked }
public enum FabricatorTableEditError: Error, Equatable { case invalidNumber, invalidBoolean, invalidDate }
public enum FabricatorDataTableEngine {
    public static func parseEdit(_ text: String, type: FabricatorTableColumnType) throws(FabricatorTableEditError) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.isEmpty { return "" }
        if type.isNumeric {
            let cleaned = trimmed.filter { $0.isNumber || $0 == "." || $0 == "-" }
            guard trimmed.contains(where: \.isNumber), let value = Double(cleaned), value.isFinite else { throw FabricatorTableEditError.invalidNumber }
            return String(type == .percent ? value / 100 : type == .progress ? Swift.min(100, Swift.max(0, value)) : value)
        }
        if type == .boolean { guard ["true", "false"].contains(trimmed.lowercased()) else { throw FabricatorTableEditError.invalidBoolean }; return trimmed.lowercased() }
        if type == .date { guard parseDate(trimmed) != nil else { throw FabricatorTableEditError.invalidDate } }
        return trimmed
    }
    public static func orderedColumns(_ columns: [FabricatorTableColumn], state: FabricatorTableState) -> [FabricatorTableColumn] {
        var seen = Set<String>()
        let order = (state.columnOrder + columns.map(\.id)).filter { seen.insert($0).inserted }
        let ordered = order.compactMap { id -> FabricatorTableColumn? in
            guard var column = columns.first(where: { $0.id == id }), !state.hiddenColumns.contains(id) else { return nil }
            if let title = state.columnTitles[id] { column.title = title }
            if let type = state.columnTypes[id] { column.type = type }
            if let options = state.columnOptions[id] { column.options = options }
            if state.readOnlyColumns.contains(id) { column.isEditable = false }
            return column
        }
        let leading = state.leadingPinnedColumns.compactMap { id in ordered.first { $0.id == id } }
        let trailing = state.trailingPinnedColumns.filter { !state.leadingPinnedColumns.contains($0) }.compactMap { id in ordered.first { $0.id == id } }
        let pinned = Set((leading + trailing).map(\.id))
        return leading + ordered.filter { !pinned.contains($0.id) } + trailing
    }
    public static func query(_ rows: [FabricatorTableRow], columns: [FabricatorTableColumn], state: FabricatorTableState, referenceDate: Date? = nil, calendar: Calendar = .current) -> [FabricatorTableRow] {
        let filtered = rows.filter { row in
            let searched = state.query.isEmpty || row.cells.values.contains { $0.localizedCaseInsensitiveContains(state.query) }
            return searched && state.filters.allSatisfy { id, filter in matches(row.cells[id, default: ""], filter: filter, type: state.columnTypes[id] ?? columns.first(where: { $0.id == id })?.type ?? .text, referenceDate: referenceDate, calendar: calendar) }
        }
        let sorting = state.sortDescriptors.isEmpty ? state.sortKey.map { [FabricatorTableSort($0, ascending: state.ascending)] } ?? [] : state.sortDescriptors
        return filtered.sorted { left, right in
            if let group = state.groupBy, left.cells[group, default: ""] != right.cells[group, default: ""] { return left.cells[group, default: ""].localizedStandardCompare(right.cells[group, default: ""]) == .orderedAscending }
            for descriptor in sorting {
                let column = columns.first { $0.id == descriptor.columnID }
                let result = compare(left.cells[descriptor.columnID, default: ""], right.cells[descriptor.columnID, default: ""], type: state.columnTypes[descriptor.columnID] ?? column?.type ?? .text, options: state.columnOptions[descriptor.columnID] ?? column?.options ?? [])
                if result != .orderedSame { return descriptor.ascending ? result == .orderedAscending : result == .orderedDescending }
            }
            return false
        }
    }
    public static func compare(_ first: String, _ second: String, type: FabricatorTableColumnType, options: [String] = []) -> ComparisonResult {
        if first == second { return .orderedSame }
        if first.isEmpty || second.isEmpty { return first.isEmpty ? .orderedAscending : .orderedDescending }
        if type.isNumeric, let left = Double(first), let right = Double(second) { return left < right ? .orderedAscending : left > right ? .orderedDescending : .orderedSame }
        if type == .date, let left = parseDate(first), let right = parseDate(second) { return left.compare(right) }
        if type == .status, let left = options.firstIndex(of: first), let right = options.firstIndex(of: second) { return left < right ? .orderedAscending : .orderedDescending }
        return first.localizedStandardCompare(second)
    }
    public static func matches(_ value: String, filter: FabricatorTableFilter, type: FabricatorTableColumnType, referenceDate: Date? = nil, calendar: Calendar = .current) -> Bool {
        let text = value.lowercased(), target = filter.value.lowercased()
        let numbers = (Double(value), Double(filter.value), Double(filter.to))
        let values = Set(value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces).lowercased() }), targets = Set(filter.value.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces).lowercased() })
        switch filter.operation {
        case .empty: return value.isEmpty
        case .notEmpty: return !value.isEmpty
        case .contains: return text.contains(target)
        case .notContains: return !text.contains(target)
        case .is: return text == target
        case .isNot: return text != target
        case .startsWith: return text.hasPrefix(target)
        case .endsWith: return text.hasSuffix(target)
        case .eq: return numbers.0 != nil && numbers.0 == numbers.1
        case .neq: return numbers.0 != numbers.1
        case .gt: return numbers.0.map { left in numbers.1.map { left > $0 } ?? false } ?? false
        case .gte: return numbers.0.map { left in numbers.1.map { left >= $0 } ?? false } ?? false
        case .lt: return numbers.0.map { left in numbers.1.map { left < $0 } ?? false } ?? false
        case .lte: return numbers.0.map { left in numbers.1.map { left <= $0 } ?? false } ?? false
        case .between:
            if type == .date, let date = parseDate(value), let start = parseDate(filter.value), let end = parseDate(filter.to) { return date >= start && date <= end }
            guard let value = numbers.0, let first = numbers.1, let last = numbers.2 else { return false }; return value >= first && value <= last
        case .anyOf: return targets.contains(text)
        case .noneOf: return !targets.contains(text)
        case .hasAny: return !values.isDisjoint(with: targets)
        case .hasAll: return targets.isSubset(of: values)
        case .hasNone: return values.isDisjoint(with: targets)
        case .checked: return text == "true"
        case .unchecked: return text != "true"
        case .on, .before, .after, .onOrBefore, .onOrAfter:
            guard let date = parseDate(value), let target = parseDate(filter.value) else { return false }
            let comparison = calendar.compare(date, to: target, toGranularity: .day)
            switch filter.operation { case .on: return comparison == .orderedSame; case .before: return comparison == .orderedAscending; case .after: return comparison == .orderedDescending; case .onOrBefore: return comparison != .orderedDescending; default: return comparison != .orderedAscending }
        case .within:
            guard let referenceDate, let date = parseDate(value), let range = presetRange(filter.value, referenceDate: referenceDate, calendar: calendar) else { return false }; return date >= range.start && date < range.end
        }
    }
    public static func operations(for type: FabricatorTableColumnType) -> [FabricatorTableFilterOperation] {
        if type.isNumeric { return [.eq, .neq, .gt, .gte, .lt, .lte, .between, .empty, .notEmpty] }
        switch type { case .date: return [.on, .before, .after, .onOrBefore, .onOrAfter, .between, .within, .empty, .notEmpty]; case .boolean: return [.checked, .unchecked, .empty, .notEmpty]; case .status, .person: return [.anyOf, .noneOf, .empty, .notEmpty]; case .tags: return [.hasAny, .hasAll, .hasNone, .empty, .notEmpty]; default: return [.contains, .notContains, .is, .isNot, .startsWith, .endsWith, .empty, .notEmpty] }
    }
    public static func aggregate(_ values: [String], operation: FabricatorTableAggregate) -> Double {
        let numbers = values.compactMap(Double.init).sorted()
        switch operation {
        case .count: return Double(values.count)
        case .filled: return Double(values.filter { !$0.isEmpty }.count)
        case .empty: return Double(values.filter(\.isEmpty).count)
        case .unique: return Double(Set(values.filter { !$0.isEmpty }).count)
        case .sum: return numbers.reduce(0, +)
        case .average: return numbers.isEmpty ? 0 : numbers.reduce(0, +) / Double(numbers.count)
        case .median: guard !numbers.isEmpty else { return 0 }; return numbers.count.isMultiple(of: 2) ? (numbers[numbers.count / 2 - 1] + numbers[numbers.count / 2]) / 2 : numbers[numbers.count / 2]
        case .min: return numbers.first ?? 0
        case .max: return numbers.last ?? 0
        case .checked: return Double(values.filter { $0 == "true" }.count)
        case .unchecked: return Double(values.filter { $0 != "true" }.count)
        }
    }
    public static func format(_ value: String, column: FabricatorTableColumn, referenceDate: Date? = nil, calendar: Calendar = .current) -> String {
        let locale = Locale(identifier: "en_US")
        if let number = Double(value), column.type.isNumeric {
            switch column.type {
            case .currency:
                if let digits = column.fractionDigits { return number.formatted(.currency(code: column.currency).precision(.fractionLength(0...digits)).locale(locale)) }
                return number.formatted(.currency(code: column.currency).locale(locale))
            case .percent: return number.formatted(.percent.precision(.fractionLength(0...(column.fractionDigits ?? 0))).locale(locale))
            case .progress: return "\(Int(number.rounded()))%"
            default: return number.formatted(.number.precision(.fractionLength(0...(column.fractionDigits ?? 2))).locale(locale))
            }
        }
        if column.type == .boolean { return value == "true" ? "Yes" : "No" }
        if [.status, .person].contains(column.type) { return column.optionLabels[value, default: value] }
        if column.type == .date, let date = parseDate(value) {
            if column.isDateRelative { return formatRelativeDate(date, referenceDate: referenceDate ?? .now, calendar: calendar) }
            return date.formatted(Date.FormatStyle(date: .abbreviated, time: .omitted).locale(locale))
        }
        return value
    }
    public static func formatAggregate(_ values: [String], operation: FabricatorTableAggregate, column: FabricatorTableColumn) -> String {
        if column.type == .date && (operation == .min || operation == .max) {
            let dates = values.compactMap(parseDate)
            guard let date = operation == .min ? dates.min() : dates.max() else { return "–" }
            var absoluteColumn = column; absoluteColumn.isDateRelative = false
            return format(String(date.timeIntervalSince1970 * 1000), column: absoluteColumn)
        }
        let result = aggregate(values, operation: operation)
        if [.count, .filled, .empty, .unique, .checked, .unchecked].contains(operation) {
            return result.formatted(.number.precision(.fractionLength(0)).locale(Locale(identifier: "en_US")))
        }
        return format(String(result), column: column)
    }
    public static func rangeSelection(rowIDs: [String], anchor: String, target: String) -> Set<String> {
        guard let first = rowIDs.firstIndex(of: anchor), let last = rowIDs.firstIndex(of: target) else { return [target] }
        return Set(rowIDs[Swift.min(first, last)...Swift.max(first, last)])
    }
    public static func parseDate(_ source: String) -> Date? {
        if let date = try? Date.ISO8601FormatStyle(includingFractionalSeconds: source.contains(".")).parse(source) { return date }
        if let number = Double(source) { return Date(timeIntervalSince1970: number / 1000) }
        let formatter = DateFormatter(); formatter.locale = Locale(identifier: "en_US_POSIX"); formatter.timeZone = TimeZone(secondsFromGMT: 0); formatter.dateFormat = "yyyy-MM-dd"; formatter.isLenient = false
        return formatter.date(from: source)
    }
    private static func formatRelativeDate(_ date: Date, referenceDate: Date, calendar: Calendar) -> String {
        let difference = date.timeIntervalSince(referenceDate), distance = abs(difference), sign = difference < 0 ? -1 : 1
        let formatter = RelativeDateTimeFormatter(); formatter.locale = Locale(identifier: "en_US"); formatter.dateTimeStyle = .named; formatter.unitsStyle = .full
        if distance < 45 { return formatter.localizedString(from: DateComponents(second: 0)) }
        if distance < 45 * 60 { return formatter.localizedString(from: DateComponents(minute: sign * Int((distance / 60).rounded()))) }
        if distance < 22 * 3600 { return formatter.localizedString(from: DateComponents(hour: sign * Int((distance / 3600).rounded()))) }
        guard let days = calendar.dateComponents([.day], from: calendar.startOfDay(for: referenceDate), to: calendar.startOfDay(for: date)).day else { preconditionFailure("Calendar did not resolve a day difference") }
        let elapsed = abs(days), daySign = days < 0 ? -1 : 1
        if elapsed < 7 { return formatter.localizedString(from: DateComponents(day: days)) }
        if elapsed < 30 { return formatter.localizedString(from: DateComponents(weekOfYear: daySign * (elapsed / 7))) }
        if elapsed < 365 { return formatter.localizedString(from: DateComponents(month: daySign * max(1, Int(Double(elapsed) / 30.4375)))) }
        return formatter.localizedString(from: DateComponents(year: daySign * Int(Double(elapsed) / 365.25)))
    }
    private static func presetRange(_ preset: String, referenceDate: Date, calendar: Calendar) -> DateInterval? {
        let day = calendar.startOfDay(for: referenceDate)
        func days(_ start: Int, _ end: Int) -> DateInterval? { guard let first = calendar.date(byAdding: .day, value: start, to: day), let last = calendar.date(byAdding: .day, value: end, to: day) else { return nil }; return DateInterval(start: first, end: last) }
        switch preset { case "today": return days(0, 1); case "yesterday": return days(-1, 0); case "pastWeek": return days(-6, 1); case "pastMonth": return days(-29, 1); case "pastYear": return days(-364, 1); case "nextWeek": return days(1, 8); case "nextMonth": return days(1, 31); case "thisMonth": return calendar.dateInterval(of: .month, for: referenceDate); case "thisYear": return calendar.dateInterval(of: .year, for: referenceDate); default: return nil }
    }
}
