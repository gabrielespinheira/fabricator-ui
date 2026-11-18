import XCTest
@testable import FabricatorUI

final class CalendarSelectionTests: XCTestCase {
    private func calendar(_ zone: String = "UTC") throws -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: zone))
        calendar.locale = Locale(identifier: "en_US")
        calendar.firstWeekday = 1
        return calendar
    }
    private func date(_ month: Int, _ day: Int, hour: Int = 0, calendar: Calendar) throws -> Date {
        try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: month, day: day, hour: hour)))
    }

    func testMonthGridUsesTheActualWeekCountUnlessFixedWeeksAreRequested() throws {
        let calendar = try calendar()
        XCTAssertEqual(FabricatorCalendar.monthDays(containing: try date(2, 1, calendar: calendar), calendar: calendar).count, 28)
        XCTAssertEqual(FabricatorCalendar.monthDays(containing: try date(11, 1, calendar: calendar), calendar: calendar).count, 35)
        XCTAssertEqual(FabricatorCalendar.monthDays(containing: try date(5, 1, calendar: calendar), calendar: calendar).count, 42)
        XCTAssertEqual(FabricatorCalendar.monthDays(containing: try date(2, 1, calendar: calendar), calendar: calendar, fixedWeeks: true).count, 42)
    }

    func testSelectionBoundsAndDisabledDatesCompareWholeCalendarDays() throws {
        let calendar = try calendar()
        let bounds = try date(11, 16, hour: 12, calendar: calendar)...date(11, 20, hour: 12, calendar: calendar)
        let disabled: Set<Date> = [try date(11, 17, hour: 18, calendar: calendar)]
        XCTAssertTrue(FabricatorCalendar.isSelectable(try date(11, 16, calendar: calendar), allowedRange: bounds, disabledDates: disabled, calendar: calendar))
        XCTAssertTrue(FabricatorCalendar.isSelectable(try date(11, 20, calendar: calendar), allowedRange: bounds, disabledDates: disabled, calendar: calendar))
        XCTAssertFalse(FabricatorCalendar.isSelectable(try date(11, 15, calendar: calendar), allowedRange: bounds, disabledDates: disabled, calendar: calendar))
        XCTAssertFalse(FabricatorCalendar.isSelectable(try date(11, 17, calendar: calendar), allowedRange: bounds, disabledDates: disabled, calendar: calendar))
    }

    func testSingleAndMultipleSelectionToggleByDayAndRespectLimits() throws {
        let calendar = try calendar(), first = try date(11, 16, calendar: calendar), next = try date(11, 17, calendar: calendar)
        XCTAssertEqual(FabricatorCalendar.select(first, from: .single(first.addingTimeInterval(3600)), calendar: calendar), .single(nil))
        XCTAssertEqual(FabricatorCalendar.select(first, from: .single(first), isRequired: true, calendar: calendar), .single(first))
        XCTAssertEqual(FabricatorCalendar.select(next, from: .multiple([first]), maximum: 1, calendar: calendar), .multiple([next]))
        XCTAssertEqual(FabricatorCalendar.select(first, from: .multiple([first]), minimum: 1, calendar: calendar), .multiple([first]))
        XCTAssertEqual(FabricatorCalendar.select(next, from: .multiple([first]), calendar: calendar), .multiple([first, next]))
        XCTAssertEqual(FabricatorCalendar.select(first, from: .multiple([first]), minimum: 2, calendar: calendar), .multiple([]))
    }

    func testRangesFollowCanonicalEndpointAndNightLimitRules() throws {
        let calendar = try calendar(), first = try date(11, 16, calendar: calendar), last = try date(11, 20, calendar: calendar)
        let single = FabricatorCalendar.Selection.range(FabricatorDateRange(from: first, to: first))
        XCTAssertEqual(FabricatorCalendar.select(first, from: .range(nil), calendar: calendar), single)
        let range = FabricatorCalendar.Selection.range(FabricatorDateRange(from: first, to: last))
        XCTAssertEqual(FabricatorCalendar.select(last, from: single, calendar: calendar), range)
        XCTAssertEqual(FabricatorCalendar.select(first, from: range, calendar: calendar), single)
        XCTAssertEqual(FabricatorCalendar.select(first, from: single, calendar: calendar), .range(nil))
        XCTAssertEqual(FabricatorCalendar.select(first, from: .range(nil), minimum: 2, calendar: calendar), .range(FabricatorDateRange(from: first)))
        let next = try date(11, 17, calendar: calendar)
        XCTAssertEqual(FabricatorCalendar.select(next, from: .range(FabricatorDateRange(from: first)), minimum: 2, calendar: calendar), .range(FabricatorDateRange(from: next)))
        XCTAssertEqual(FabricatorCalendar.select(last, from: .range(FabricatorDateRange(from: first)), maximum: 3, calendar: calendar), .range(FabricatorDateRange(from: last)))
        XCTAssertEqual(FabricatorCalendar.select(last, from: single, disabledDates: [next], excludesDisabled: true, calendar: calendar), .range(FabricatorDateRange(from: last)))
    }

    func testKeyboardNavigationSkipsDisabledDaysAndClampsMonthEnds() throws {
        let calendar = try calendar(), first = try date(1, 31, calendar: calendar)
        XCTAssertEqual(FabricatorCalendar.navigationTarget(from: first, direction: .nextMonth, calendar: calendar), try date(2, 28, calendar: calendar))
        let monday = try date(11, 16, calendar: calendar)
        XCTAssertEqual(FabricatorCalendar.navigationTarget(from: monday, direction: .nextDay, disabledDates: [try date(11, 17, calendar: calendar)], calendar: calendar), try date(11, 18, calendar: calendar))
        XCTAssertEqual(FabricatorCalendar.navigationTarget(from: monday, direction: .weekStart, calendar: calendar), try date(11, 15, calendar: calendar))
        XCTAssertEqual(FabricatorCalendar.navigationTarget(from: monday, direction: .weekEnd, calendar: calendar), try date(11, 21, calendar: calendar))
        XCTAssertNil(FabricatorCalendar.navigationTarget(from: monday, direction: .previousDay, allowedRange: monday...monday, calendar: calendar))
    }

    func testCalendarArithmeticPreservesLocalMidnightThroughDaylightSaving() throws {
        let calendar = try calendar("Europe/Lisbon"), first = try date(3, 29, calendar: calendar)
        let next = try XCTUnwrap(FabricatorCalendar.navigationTarget(from: first, direction: .nextDay, calendar: calendar))
        XCTAssertEqual(next.timeIntervalSince(first), 23 * 3600)
        XCTAssertEqual(calendar.component(.hour, from: next), 0)
        XCTAssertTrue(FabricatorCalendar.monthDays(containing: first, calendar: calendar).allSatisfy { calendar.component(.hour, from: $0) == 0 })
    }
}
