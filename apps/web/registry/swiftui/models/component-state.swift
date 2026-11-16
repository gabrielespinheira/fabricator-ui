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

public struct FabricatorTableColumn: Identifiable, Sendable, Equatable {
    public var id: String
    public var title: String
    public var type: FabricatorTableColumnType
    public var options: [String]
    public var optionColors: [String: String]
    public var isEditable: Bool
    public var currency: String
    public var isNumeric: Bool { type.isNumeric }
    public init(_ id: String, title: String, isNumeric: Bool = false, type: FabricatorTableColumnType? = nil, options: [String] = [], optionColors: [String: String] = [:], isEditable: Bool = true, currency: String = "USD") { self.id = id; self.title = title; self.type = type ?? (isNumeric ? .number : .text); self.options = options; self.optionColors = optionColors; self.isEditable = isEditable; self.currency = currency }
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

    public mutating func sort(by key: String) {
        ascending = sortKey == key ? !ascending : true
        sortKey = key
        sortDescriptors = []
        page = 0
    }
}

public enum FabricatorCalendar {
    public static func monthDays(containing date: Date, calendar: Calendar = .current) -> [Date] {
        guard let month = calendar.dateInterval(of: .month, for: date)?.start else { return [] }
        let weekday = calendar.component(.weekday, from: month)
        let offset = (weekday - calendar.firstWeekday + 7) % 7
        guard let first = calendar.date(byAdding: .day, value: -offset, to: month) else { return [] }
        return (0..<42).compactMap { calendar.date(byAdding: .day, value: $0, to: first) }
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
    public var isDirectory: Bool { !children.isEmpty }
    public init(id: String, name: String, children: [FabricatorFileNode] = []) { self.id = id; self.name = name; self.children = children }

    public struct Entry: Identifiable, Sendable, Equatable {
        public var node: FabricatorFileNode
        public var depth: Int
        public var id: String { node.id }
    }

    public static func flatten(_ nodes: [FabricatorFileNode], expanded: Set<String>, query: String = "", depth: Int = 0) -> [Entry] {
        nodes.flatMap { node in
            let descendants = flatten(node.children, expanded: expanded, query: query, depth: depth + 1)
            let matches = query.isEmpty || node.name.localizedCaseInsensitiveContains(query) || !descendants.isEmpty
            guard matches else { return [Entry]() }
            return [Entry(node: node, depth: depth)] + (expanded.contains(node.id) || !query.isEmpty ? descendants : [])
        }
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
