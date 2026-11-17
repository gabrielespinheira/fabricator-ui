import Foundation

public struct FabricatorDateRange: Equatable, Sendable {
    public var from: Date
    public var to: Date?
    public init(from: Date, to: Date? = nil) {
        precondition(to.map { $0 >= from } ?? true, "A date range must end on or after its start")
        self.from = from; self.to = to
    }
}

extension FabricatorCalendar {
    enum Selection: Equatable, Sendable {
        case single(Date?), multiple(Set<Date>), range(FabricatorDateRange?)
        var anchor: Date? {
            switch self { case .single(let date): date; case .multiple(let dates): dates.min(); case .range(let range): range?.from }
        }
    }
    enum RangePosition { case none, single, start, middle, end }
    enum Navigation { case previousDay, nextDay, previousWeek, nextWeek, weekStart, weekEnd, previousMonth, nextMonth, previousYear, nextYear }

    static func isSelectable(_ date: Date, allowedRange: ClosedRange<Date>? = nil, disabledDates: Set<Date> = [], calendar: Calendar = .current) -> Bool {
        let day = calendar.startOfDay(for: date)
        if let allowedRange, day < calendar.startOfDay(for: allowedRange.lowerBound) || day > calendar.startOfDay(for: allowedRange.upperBound) { return false }
        return !disabledDates.contains { calendar.isDate($0, inSameDayAs: day) }
    }

    static func select(_ date: Date, from selection: Selection, isRequired: Bool = false, minimum: Int = 0, maximum: Int? = nil, allowedRange: ClosedRange<Date>? = nil, disabledDates: Set<Date> = [], excludesDisabled: Bool = false, calendar: Calendar = .current) -> Selection {
        guard isSelectable(date, allowedRange: allowedRange, disabledDates: disabledDates, calendar: calendar) else { return selection }
        let day = calendar.startOfDay(for: date)
        switch selection {
        case .single(let current):
            if !isRequired, let current, calendar.isDate(current, inSameDayAs: day) { return .single(nil) }
            return .single(day)
        case .multiple(let current):
            var dates = Set(current.map { calendar.startOfDay(for: $0) })
            if dates.contains(day) {
                guard dates.count != minimum && !(isRequired && dates.count == 1) else { return .multiple(dates) }
                dates.remove(day)
            } else {
                if maximum == dates.count { return .multiple([day]) }
                dates.insert(day)
            }
            return .multiple(dates)
        case .range(let current):
            let range = selectRange(day, current: current, isRequired: isRequired, minimum: minimum, maximum: maximum, calendar: calendar)
            if excludesDisabled, let range, let end = range.to, disabledDates.contains(where: { let disabled = calendar.startOfDay(for: $0); return disabled >= range.from && disabled <= end }) { return .range(FabricatorDateRange(from: day)) }
            return .range(range)
        }
    }

    private static func selectRange(_ day: Date, current: FabricatorDateRange?, isRequired: Bool, minimum: Int, maximum: Int?, calendar: Calendar) -> FabricatorDateRange? {
        var next: FabricatorDateRange
        if let current {
            let start = calendar.startOfDay(for: current.from), end = current.to.map { calendar.startOfDay(for: $0) }
            if let end {
                if day == start && day == end { return isRequired ? FabricatorDateRange(from: start, to: end) : nil }
                if day == start { next = FabricatorDateRange(from: start, to: minimum > 0 ? nil : day) }
                else if day == end { next = FabricatorDateRange(from: day, to: minimum > 0 ? nil : day) }
                else if day < start { next = FabricatorDateRange(from: day, to: end) }
                else { next = FabricatorDateRange(from: start, to: day) }
            } else if day == start {
                if minimum == 0 { return FabricatorDateRange(from: start, to: day) }
                return isRequired ? FabricatorDateRange(from: start) : nil
            } else { next = FabricatorDateRange(from: min(day, start), to: max(day, start)) }
        } else { next = FabricatorDateRange(from: day, to: minimum > 0 ? nil : day) }
        if let end = next.to {
            guard let count = calendar.dateComponents([.day], from: next.from, to: end).day else { preconditionFailure("Calendar did not resolve a range length") }
            if maximum.map({ count > $0 }) == true || (minimum > 1 && count < minimum) { return FabricatorDateRange(from: day) }
        }
        return next
    }

    static func isSelected(_ date: Date, in selection: Selection, calendar: Calendar) -> Bool {
        let day = calendar.startOfDay(for: date)
        switch selection {
        case .single(let selected): return selected.map { calendar.isDate(day, inSameDayAs: $0) } ?? false
        case .multiple(let selected): return selected.contains { calendar.isDate(day, inSameDayAs: $0) }
        case .range(let range):
            guard let range else { return false }
            return day >= calendar.startOfDay(for: range.from) && day <= calendar.startOfDay(for: range.to ?? range.from)
        }
    }

    static func rangePosition(_ date: Date, in selection: Selection, calendar: Calendar) -> RangePosition {
        guard case .range(let range) = selection, let range, let end = range.to else { return .none }
        let day = calendar.startOfDay(for: date), start = calendar.startOfDay(for: range.from), last = calendar.startOfDay(for: end)
        if day == start && day == last { return .single }
        if day == start { return .start }
        if day == last { return .end }
        return day > start && day < last ? .middle : .none
    }

    static func navigationTarget(from date: Date, direction: Navigation, allowedRange: ClosedRange<Date>? = nil, disabledDates: Set<Date> = [], calendar: Calendar = .current) -> Date? {
        let day = calendar.startOfDay(for: date)
        let weekday = (calendar.component(.weekday, from: day) - calendar.firstWeekday + 7) % 7
        let component: Calendar.Component, offset: Int, step: Int
        switch direction {
        case .previousDay: component = .day; offset = -1; step = -1
        case .nextDay: component = .day; offset = 1; step = 1
        case .previousWeek: component = .day; offset = -7; step = -1
        case .nextWeek: component = .day; offset = 7; step = 1
        case .weekStart: component = .day; offset = -weekday; step = 1
        case .weekEnd: component = .day; offset = 6 - weekday; step = -1
        case .previousMonth: component = .month; offset = -1; step = -1
        case .nextMonth: component = .month; offset = 1; step = 1
        case .previousYear: component = .year; offset = -1; step = -1
        case .nextYear: component = .year; offset = 1; step = 1
        }
        guard var target = calendar.date(byAdding: component, value: offset, to: day) else { return nil }
        for _ in 0...disabledDates.count {
            if let allowedRange, target < calendar.startOfDay(for: allowedRange.lowerBound) || target > calendar.startOfDay(for: allowedRange.upperBound) { return nil }
            if isSelectable(target, allowedRange: allowedRange, disabledDates: disabledDates, calendar: calendar) { return target }
            guard let next = calendar.date(byAdding: .day, value: step, to: target) else { return nil }
            target = next
        }
        return nil
    }
}
