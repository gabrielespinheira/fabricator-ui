import Foundation

public struct FabricatorSelection: Sendable, Equatable {
    public private(set) var values: [String]
    public var maximum: Int?

    public init(values: [String] = [], maximum: Int? = nil) {
        var seen = Set<String>()
        self.values = values.filter { seen.insert($0).inserted }
        self.maximum = maximum
    }

    @discardableResult
    public mutating func toggle(_ value: String) -> Bool {
        if let index = values.firstIndex(of: value) {
            values.remove(at: index)
            return true
        }
        if let maximum, values.count >= maximum { return false }
        values.append(value)
        return true
    }
}

public struct FabricatorTableRow: Identifiable, Sendable, Equatable {
    public var id: String
    public var cells: [String: String]
    public init(id: String, cells: [String: String]) { self.id = id; self.cells = cells }
}

public enum FabricatorPaginationItem: Sendable, Equatable, Identifiable {
    case page(Int)
    case gap(after: Int)
    public var id: String { switch self { case .page(let index): "page:\(index)"; case .gap(let index): "gap:\(index)" } }
}

public enum FabricatorPaginationEngine {
    public static func items(page: Int, pageCount: Int) -> [FabricatorPaginationItem] {
        let count = max(1, pageCount), current = min(max(0, page), count - 1)
        let pages = Set([0, count - 1, current - 1, current, current + 1].filter { (0..<count).contains($0) }).sorted()
        var items: [FabricatorPaginationItem] = [], previous: Int?
        for index in pages {
            if let previous, index - previous > 1 { items.append(.gap(after: previous)) }
            items.append(.page(index)); previous = index
        }
        return items
    }
}

public struct FabricatorTableColumn: Identifiable, Sendable, Equatable {
    public var id: String
    public var title: String
    public var type: FabricatorTableColumnType
    public var options: [String]
    public var optionColors: [String: String]
    public var optionLabels: [String: String]
    public var optionImageURLs: [String: URL]
    public var isEditable: Bool
    public var isPrimary: Bool
    public var currency: String
    public var fractionDigits: Int?
    public var isDateRelative: Bool
    public var isNumeric: Bool { type.isNumeric }
    public init(_ id: String, title: String, isNumeric: Bool = false, type: FabricatorTableColumnType? = nil, options: [String] = [], optionColors: [String: String] = [:], isEditable: Bool = true, currency: String = "USD", isPrimary: Bool = false, optionLabels: [String: String] = [:], optionImageURLs: [String: URL] = [:], fractionDigits: Int? = nil, isDateRelative: Bool = false) {
        precondition(fractionDigits.map { (0...20).contains($0) } ?? true, "Fraction digits must be between zero and 20")
        self.id = id; self.title = title; self.type = type ?? (isNumeric ? .number : .text); self.options = options; self.optionColors = optionColors; self.isEditable = isEditable; self.currency = currency; self.isPrimary = isPrimary; self.optionLabels = optionLabels; self.optionImageURLs = optionImageURLs; self.fractionDigits = fractionDigits; self.isDateRelative = isDateRelative
    }
}

public struct FabricatorTableState: Sendable, Equatable {
    public var query: String
    public var sortKey: String?
    public var ascending: Bool
    public var page: Int
    public var pageSize: Int
    public var filters: [String: FabricatorTableFilter] = [:]
    public var sortDescriptors: [FabricatorTableSort] = []
    public var hiddenColumns: Set<String> = []
    public var leadingPinnedColumns: [String] = []
    public var trailingPinnedColumns: [String] = []
    public var columnOrder: [String] = []
    public var columnWidths: [String: Double] = [:]
    public var columnTitles: [String: String] = [:]
    public var columnTypes: [String: FabricatorTableColumnType] = [:]
    public var columnOptions: [String: [String]] = [:]
    public var readOnlyColumns: Set<String> = []
    public var aggregates: [String: FabricatorTableAggregate] = [:]
    public var groupBy: String?
    public var collapsedGroups: Set<String> = []

    public init(query: String = "", sortKey: String? = nil, ascending: Bool = true, page: Int = 0, pageSize: Int = 10) {
        self.query = query; self.sortKey = sortKey; self.ascending = ascending
        self.page = max(0, page); self.pageSize = max(1, pageSize)
    }

    public func filteredRows(_ rows: [FabricatorTableRow]) -> [FabricatorTableRow] {
        FabricatorDataTableEngine.query(rows, columns: [], state: self)
    }

    public func visibleRows(_ rows: [FabricatorTableRow]) -> [FabricatorTableRow] {
        let filtered = filteredRows(rows)
        let boundedPage = min(page, max(0, (filtered.count - 1) / pageSize))
        return Array(filtered.dropFirst(boundedPage * pageSize).prefix(pageSize))
    }

    public func pageCount(for rows: [FabricatorTableRow]) -> Int { max(1, (filteredRows(rows).count + pageSize - 1) / pageSize) }

    public mutating func sort(by key: String, type: FabricatorTableColumnType = .text) {
        let firstAscending = !type.isDescendingSortFirst
        if let current = sortDescriptor(for: key) {
            sortKey = current.ascending == firstAscending ? key : nil
            ascending = !current.ascending
        } else { sortKey = key; ascending = firstAscending }
        sortDescriptors = []
        page = 0
    }
    func sortDescriptor(for columnID: String) -> FabricatorTableSort? {
        if !sortDescriptors.isEmpty { return sortDescriptors.first { $0.columnID == columnID } }
        guard sortKey == columnID else { return nil }
        return FabricatorTableSort(columnID, ascending: ascending)
    }
}

public enum FabricatorCalendar {
    public static func monthDays(containing date: Date, calendar: Calendar = .current, fixedWeeks: Bool = false) -> [Date] {
        guard let month = calendar.dateInterval(of: .month, for: date)?.start,
              let days = calendar.range(of: .day, in: .month, for: month) else { preconditionFailure("Calendar did not resolve a month") }
        let weekday = calendar.component(.weekday, from: month)
        let offset = (weekday - calendar.firstWeekday + 7) % 7
        guard let first = calendar.date(byAdding: .day, value: -offset, to: month) else { preconditionFailure("Calendar did not resolve the first week") }
        let count = fixedWeeks ? 42 : ((offset + days.count + 6) / 7) * 7
        return (0..<count).map { offset in
            guard let day = calendar.date(byAdding: .day, value: offset, to: first) else { preconditionFailure("Calendar did not resolve a day") }
            return day
        }
    }

    public static func overlaps(start: Date, end: Date, day: Date, calendar: Calendar = .current) -> Bool {
        guard let interval = calendar.dateInterval(of: .day, for: day) else { return false }
        return start < interval.end && end > interval.start
    }
}

public struct FabricatorEvent: Identifiable, Sendable, Equatable {
    public var id: String
    public var title: String
    public var start: Date
    public var end: Date
    public var category: String
    public var allDay: Bool
    public var isEditable: Bool
    public var location: String
    public var description: String
    public var status: FabricatorEventStatus
    public var recurrence: String?
    public var recurringEventId: String?
    public var originalStart: Date?
    public var calendarId: String?
    public var editable: Bool? { get { isEditable } set { isEditable = newValue ?? true } }
    public init(id: String = UUID().uuidString, title: String, start: Date, end: Date, category: String = "primary", allDay: Bool = false, isEditable: Bool = true, location: String = "", description: String = "", status: FabricatorEventStatus = .confirmed, recurrence: String? = nil, recurringEventId: String? = nil, originalStart: Date? = nil, calendarId: String? = nil) {
        self.id = id; self.title = title; self.start = start; self.end = end; self.category = category; self.allDay = allDay; self.isEditable = isEditable; self.location = location; self.description = description; self.status = status; self.recurrence = recurrence; self.recurringEventId = recurringEventId; self.originalStart = originalStart; self.calendarId = calendarId
    }
}

public struct FabricatorQuestion: Identifiable, Sendable, Equatable {
    public var id: String
    public var title: String
    public var options: [String]
    public var isRequired: Bool
    public init(id: String, title: String, options: [String], isRequired: Bool = true) {
        self.id = id; self.title = title; self.options = options; self.isRequired = isRequired
    }
}

public struct FabricatorQuestionnaireState: Sendable, Equatable {
    public var index = 0
    public var answers: [String: String] = [:]
    public var isComplete = false
    public init() {}

    @discardableResult
    public mutating func advance(questions: [FabricatorQuestion]) -> Bool {
        guard questions.indices.contains(index) else { return false }
        let question = questions[index]
        if question.isRequired && answers[question.id, default: ""].isEmpty { return false }
        if index == questions.count - 1 { isComplete = true } else { index += 1 }
        return true
    }

    public mutating func back() { index = max(0, index - 1); isComplete = false }
}

public struct FabricatorFileNode: Identifiable, Sendable, Equatable {
    public var id: String
    public var name: String
    public var children: [FabricatorFileNode]
    public var isDisabled: Bool
    public var isMuted: Bool
    private var isDeclaredDirectory: Bool
    public var isDirectory: Bool { isDeclaredDirectory || !children.isEmpty }
    public init(id: String, name: String, isDisabled: Bool = false, isMuted: Bool = false) {
        self.id = id; self.name = name; children = []; self.isDisabled = isDisabled; self.isMuted = isMuted; isDeclaredDirectory = false
    }
    public init(id: String, name: String, children: [FabricatorFileNode], isDisabled: Bool = false, isMuted: Bool = false) {
        self.id = id; self.name = name; self.children = children; self.isDisabled = isDisabled; self.isMuted = isMuted; isDeclaredDirectory = true
    }

    public struct Entry: Identifiable, Sendable, Equatable {
        public var node: FabricatorFileNode
        public var depth: Int
        public var parentID: String?
        public var isDisabled: Bool
        public var id: String { node.id }
    }

    public enum Navigation: Sendable { case previous, next, first, last, parent, child }

    public static func flatten(_ nodes: [FabricatorFileNode], expanded: Set<String>, query: String = "", depth: Int = 0) -> [Entry] {
        func visit(_ nodes: [FabricatorFileNode], depth: Int, parentID: String?, isParentDisabled: Bool) -> [Entry] {
            nodes.flatMap { node in
                let isDisabled = isParentDisabled || node.isDisabled
                let descendants = expanded.contains(node.id) || !query.isEmpty ? visit(node.children, depth: depth + 1, parentID: node.id, isParentDisabled: isDisabled) : []
                let matches = query.isEmpty || node.name.localizedCaseInsensitiveContains(query) || !descendants.isEmpty
                guard matches else { return [Entry]() }
                return [Entry(node: node, depth: depth, parentID: parentID, isDisabled: isDisabled)] + descendants
            }
        }
        return visit(nodes, depth: depth, parentID: nil, isParentDisabled: false)
    }

    public static func navigationTarget(_ rows: [Entry], from id: String?, direction: Navigation) -> Entry? {
        let enabled = rows.filter { !$0.isDisabled }
        if direction == .first { return enabled.first }
        if direction == .last { return enabled.last }
        guard let index = enabled.firstIndex(where: { $0.id == id }) else { return nil }
        switch direction {
        case .previous: return enabled[max(0, index - 1)]
        case .next: return enabled[min(enabled.count - 1, index + 1)]
        case .parent: return enabled.first { $0.id == enabled[index].parentID }
        case .child: return enabled.first { $0.parentID == id }
        case .first, .last: return nil
        }
    }

    public static func typeaheadTarget(_ rows: [Entry], from id: String?, text: String) -> Entry? {
        let enabled = rows.filter { !$0.isDisabled }
        let query = text.lowercased()
        guard let first = query.first else { return nil }
        let prefix = query.allSatisfy { $0 == first } ? String(first) : query
        let start = enabled.firstIndex(where: { $0.id == id }).map { $0 + 1 } ?? 0
        return (Array(enabled.dropFirst(start)) + Array(enabled.prefix(start))).first { $0.node.name.lowercased().hasPrefix(prefix) }
    }

    public static func restoredFocus(_ previous: [Entry], current: [Entry], from id: String?, selected: String?) -> String? {
        guard let id else { return nil }
        let enabled = current.filter { !$0.isDisabled }
        if enabled.contains(where: { $0.id == id }) { return id }
        var parent = previous.first { $0.id == id }?.parentID
        while let ancestor = parent {
            if enabled.contains(where: { $0.id == ancestor }) { return ancestor }
            parent = previous.first { $0.id == ancestor }?.parentID
        }
        return enabled.first { $0.id == selected }?.id ?? enabled.first?.id
    }
}

public struct FabricatorChartDatum: Identifiable, Sendable, Equatable {
    public var id: String
    public var label: String
    public var value: Double
    public var secondary: Double?
    public var low: Double?
    public var high: Double?
    public init(id: String = UUID().uuidString, label: String, value: Double, secondary: Double? = nil, low: Double? = nil, high: Double? = nil) {
        self.id = id; self.label = label; self.value = value; self.secondary = secondary; self.low = low; self.high = high
    }
}
