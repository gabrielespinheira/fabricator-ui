import XCTest
@testable import FabricatorUI

@MainActor final class DatePickerInputTests: XCTestCase {
    func testDateTimeComparisonAndExternalSyncKeepClockChanges() throws {
        let calendar = try calendar(), day = try date(2026, 11, 16, calendar: calendar)
        let first = FabricatorTimeOfDay(hours: 9, minutes: 5, seconds: 4).makeDate(on: day, calendar: calendar)
        let next = first.addingTimeInterval(60), second = first.addingTimeInterval(1)
        XCTAssertTrue(FabricatorDateInputState.isSame(first, next, granularity: .day, calendar: calendar))
        XCTAssertFalse(FabricatorDateInputState.isSame(first, next, granularity: .day, calendar: calendar, hasTime: true))
        XCTAssertTrue(FabricatorDateInputState.isSame(first, second, granularity: .day, calendar: calendar, hasTime: true))
        XCTAssertFalse(FabricatorDateInputState.isSame(first, second, granularity: .day, calendar: calendar, hasTime: true, hasSeconds: true))
        var input = FabricatorDateInputState(value: first, text: "9:05")
        input.synchronize(next, text: "9:06", granularity: .day, calendar: calendar, hasTime: true)
        XCTAssertEqual(input.text, "9:06")
    }
    func testDateTimeCommitCombinesRelativeDaysAndTypedOrKeptClock() throws {
        let calendar = try calendar(), reference = try date(2026, 11, 16, calendar: calendar)
        let commit = try FabricatorDatePickerEngineAdapter().commit("tomorrow", referenceDate: reference, calendar: calendar)
        let kept = FabricatorTimeOfDay(hours: 9, minutes: 5).makeDate(on: reference, calendar: calendar)
        let typed = FabricatorDateTimeInputModel.compose(commit, timeText: "9:30:15 pm", originalText: "tomorrow at 9:30:15 pm", keptValue: kept, hourCycle: .twelve, hasSeconds: true, calendar: calendar)
        XCTAssertEqual(typed.value, FabricatorTimeOfDay(hours: 21, minutes: 30, seconds: 15).makeDate(on: reference.addingTimeInterval(86400), calendar: calendar))
        XCTAssertEqual(typed.text, "Nov 17, 2026, 9:30:15 PM"); XCTAssertFalse(typed.isInvalid)
        let preserved = FabricatorDateTimeInputModel.compose(commit, timeText: nil, originalText: "tomorrow", keptValue: kept, hourCycle: .twentyFour, hasSeconds: false, calendar: calendar)
        XCTAssertEqual(preserved.text, "Nov 17, 2026, 09:05")
        let invalid = FabricatorDateTimeInputModel.compose(commit, timeText: "9:99", originalText: "tomorrow at 9:99", keptValue: kept, hourCycle: .twelve, hasSeconds: false, calendar: calendar)
        XCTAssertNil(invalid.value); XCTAssertEqual(invalid.text, "tomorrow at 9:99"); XCTAssertTrue(invalid.isInvalid)
    }
    func testInvalidCommitSurvivesInternalSyncAndExternalValuesResetIt() throws {
        let calendar = try calendar(), date = try date(2026, 11, 16, calendar: calendar)
        var input = FabricatorDateInputState(value: date, text: "Nov 16, 2026")
        XCTAssertNil(input.commit(FabricatorDateTextCommit(value: nil, text: "bad date", isInvalid: true), allowsEmptyValue: true))
        input.synchronize(nil, text: "", granularity: .day, calendar: calendar)
        XCTAssertEqual(input.text, "bad date"); XCTAssertTrue(input.isInvalid)
        input.synchronize(date, text: "Nov 16, 2026", granularity: .day, calendar: calendar)
        XCTAssertEqual(input.text, "Nov 16, 2026"); XCTAssertFalse(input.isInvalid)
    }
    func testRequiredDateKeepsItsValueWhileInvalidTextIsVisible() throws {
        let calendar = try calendar(), date = try date(2026, 11, 16, calendar: calendar)
        var input = FabricatorDateInputState(value: date, text: "Nov 16, 2026")
        XCTAssertEqual(input.commit(FabricatorDateTextCommit(value: nil, text: "", isInvalid: false), allowsEmptyValue: false), date)
        XCTAssertTrue(input.isInvalid); XCTAssertEqual(input.text, "")
    }
    private func calendar(_ zone: String = "UTC", locale: String = "en_US") throws -> Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: zone)); calendar.locale = Locale(identifier: locale); return calendar
    }
    private func date(_ year: Int, _ month: Int, _ day: Int, calendar: Calendar) throws -> Date {
        try XCTUnwrap(calendar.date(from: DateComponents(year: year, month: month, day: day)))
    }
    func testTypedDatesCommitInTheCanonicalDisplayFormatAndRejectImpossibleDays() throws {
        let calendar = try calendar(), reference = try date(2026, 11, 16, calendar: calendar), engine = try FabricatorDatePickerEngineAdapter()
        let commit = try engine.commit("2026-11-18", referenceDate: reference, calendar: calendar)
        XCTAssertEqual(commit.value, try date(2026, 11, 18, calendar: calendar)); XCTAssertEqual(commit.text, "Nov 18, 2026"); XCTAssertFalse(commit.isInvalid)
        let invalid = try engine.commit("2026-02-30", referenceDate: reference, calendar: calendar)
        XCTAssertNil(invalid.value); XCTAssertEqual(invalid.text, "2026-02-30"); XCTAssertTrue(invalid.isInvalid)
        let empty = try engine.commit("  ", referenceDate: reference, calendar: calendar)
        XCTAssertNil(empty.value); XCTAssertEqual(empty.text, ""); XCTAssertFalse(empty.isInvalid)
    }
    func testRelativeDatesUseTheSuppliedCalendarZoneAcrossDaylightSaving() throws {
        let calendar = try calendar("Europe/Lisbon"), reference = try date(2026, 3, 29, calendar: calendar)
        let commit = try FabricatorDatePickerEngineAdapter().commit("tomorrow", referenceDate: reference, calendar: calendar)
        XCTAssertEqual(commit.value, try date(2026, 3, 30, calendar: calendar)); XCTAssertEqual(try XCTUnwrap(commit.value).timeIntervalSince(reference), 23 * 3600)
    }
    func testOutOfBoundsDatesKeepFormattedTextWhileClearingTheirValue() throws {
        let calendar = try calendar(), reference = try date(2026, 11, 16, calendar: calendar), bounds = reference...(try date(2026, 11, 20, calendar: calendar))
        let commit = try FabricatorDatePickerEngineAdapter().commit("2026-11-21", referenceDate: reference, allowedRange: bounds, calendar: calendar)
        XCTAssertNil(commit.value); XCTAssertEqual(commit.text, "Nov 21, 2026"); XCTAssertTrue(commit.isInvalid)
    }
    func testMonthsYearsAndCustomPatternsShareTheReactParser() throws {
        let calendar = try calendar(), reference = try date(2026, 11, 16, calendar: calendar), engine = try FabricatorDatePickerEngineAdapter()
        let month = try engine.commit("next month", referenceDate: reference, granularity: .month, calendar: calendar)
        XCTAssertEqual(month.value, try date(2026, 12, 1, calendar: calendar)); XCTAssertEqual(month.text, "Dec 2026")
        let year = try engine.commit("2024", referenceDate: reference, granularity: .year, calendar: calendar)
        XCTAssertEqual(year.value, try date(2024, 1, 1, calendar: calendar))
        let custom = try engine.commit("18/11/2026", referenceDate: reference, format: "dd/MM/yyyy", calendar: calendar)
        XCTAssertEqual(custom.value, try date(2026, 11, 18, calendar: calendar)); XCTAssertEqual(custom.text, "18/11/2026")
    }
    func testLocalizedTextAndFormattingUseTheSameLocale() throws {
        let calendar = try calendar(locale: "pt_BR"), reference = try date(2026, 11, 16, calendar: calendar), engine = try FabricatorDatePickerEngineAdapter()
        let commit = try engine.commit("18 de novembro de 2026", referenceDate: reference, format: "d 'de' MMMM 'de' yyyy", calendar: calendar)
        XCTAssertEqual(commit.value, try date(2026, 11, 18, calendar: calendar)); XCTAssertEqual(commit.text, "18 de novembro de 2026")
        XCTAssertEqual(try engine.format(reference, format: "yyyy-MM-dd", calendar: calendar), "2026-11-16")
    }
}
