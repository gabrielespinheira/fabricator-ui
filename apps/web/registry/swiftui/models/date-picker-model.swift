import Foundation

public enum FabricatorDateGranularity: String, Sendable, Hashable {
    case day, month, year
    var component: Calendar.Component { switch self { case .day: .day; case .month: .month; case .year: .year } }
    var dateFormat: String { switch self { case .day: "MMM d, yyyy"; case .month: "MMM yyyy"; case .year: "yyyy" } }
    var placeholder: String { self == .day ? "Pick a date" : "Pick a \(rawValue)" }
}

struct FabricatorDateTextCommit: Equatable, Sendable { var value: Date?; var text: String; var isInvalid: Bool }

struct FabricatorDateInputState: Equatable {
    var text: String
    var isInvalid = false
    private(set) var syncedValue: Date?
    init(value: Date?, text: String) { syncedValue = value; self.text = text }
    mutating func commit(_ result: FabricatorDateTextCommit, allowsEmptyValue: Bool) -> Date? {
        text = result.text; isInvalid = result.isInvalid || (!allowsEmptyValue && result.value == nil)
        if allowsEmptyValue || result.value != nil { syncedValue = result.value }
        return syncedValue
    }
    mutating func synchronize(_ value: Date?, text: String, granularity: FabricatorDateGranularity, calendar: Calendar, hasTime: Bool = false, hasSeconds: Bool = false) {
        guard !Self.isSame(value, syncedValue, granularity: granularity, calendar: calendar, hasTime: hasTime, hasSeconds: hasSeconds) else { return }
        self = Self(value: value, text: text)
    }
    static func isSame(_ first: Date?, _ second: Date?, granularity: FabricatorDateGranularity, calendar: Calendar, hasTime: Bool = false, hasSeconds: Bool = false) -> Bool {
        switch (first, second) {
        case (nil, nil): true
        case (.some(let first), .some(let second)): hasTime && granularity == .day ? calendar.isDate(first, equalTo: second, toGranularity: hasSeconds ? .second : .minute) : FabricatorDateGrid.start(first, granularity: granularity, calendar: calendar) == FabricatorDateGrid.start(second, granularity: granularity, calendar: calendar)
        default: false
        }
    }
}

enum FabricatorDateTimeInputModel {
    static func compose(_ commit: FabricatorDateTextCommit, timeText: String?, originalText: String, keptValue: Date?, hourCycle: FabricatorHourCycle, hasSeconds: Bool, calendar: Calendar) -> FabricatorDateTextCommit {
        let typed = timeText.flatMap(FabricatorTimeInputModel.parse)
        if timeText != nil && typed == nil { return FabricatorDateTextCommit(value: nil, text: originalText, isInvalid: true) }
        guard let day = commit.value else { return commit }
        let time = typed?.value ?? keptValue.map { FabricatorTimeOfDay($0, calendar: calendar).normalized(hasSeconds: hasSeconds) } ?? FabricatorTimeOfDay(hours: 0, minutes: 0)
        let value = time.makeDate(on: day, calendar: calendar)
        return FabricatorDateTextCommit(value: value, text: "\(commit.text), \(FabricatorTimeInputModel.format(FabricatorTimeOfDay(value, calendar: calendar), hourCycle: hourCycle, hasSeconds: hasSeconds))", isInvalid: commit.isInvalid)
    }
}

enum FabricatorDateGrid {
    static func start(_ date: Date, granularity: FabricatorDateGranularity, calendar: Calendar) -> Date {
        guard let start = calendar.dateInterval(of: granularity.component, for: date)?.start else { preconditionFailure("Calendar did not resolve the selected period") }
        return start
    }
    static func page(containing date: Date, granularity: FabricatorDateGranularity, calendar: Calendar) -> Date {
        precondition(granularity != .day, "Day selection uses Calendar")
        let start = start(date, granularity: .year, calendar: calendar)
        guard granularity == .year else { return start }
        let year = calendar.component(.year, from: start)
        return move(start, amount: -((year % 12 + 12) % 12), granularity: .year, calendar: calendar)
    }
    static func values(containing date: Date, granularity: FabricatorDateGranularity, calendar: Calendar) -> [Date] {
        let page = page(containing: date, granularity: granularity, calendar: calendar)
        return (0..<12).map { move(page, amount: $0, granularity: granularity, calendar: calendar) }
    }
    static func move(_ date: Date, amount: Int, granularity: FabricatorDateGranularity, calendar: Calendar) -> Date {
        guard let target = calendar.date(byAdding: granularity.component, value: amount, to: start(date, granularity: granularity, calendar: calendar)) else { preconditionFailure("Calendar could not move the selected period") }
        return target
    }
    static func isSelectable(_ date: Date, granularity: FabricatorDateGranularity, allowedRange: ClosedRange<Date>?, calendar: Calendar) -> Bool {
        guard let allowedRange else { return true }
        let value = start(date, granularity: granularity, calendar: calendar)
        return value >= start(allowedRange.lowerBound, granularity: granularity, calendar: calendar) && value <= start(allowedRange.upperBound, granularity: granularity, calendar: calendar)
    }
}
