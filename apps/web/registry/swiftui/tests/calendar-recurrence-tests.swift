import XCTest
@testable import FabricatorUI

private func recurrenceDate(_ text: String) throws -> Date { try XCTUnwrap(ISO8601DateFormatter().date(from: text)) }

final class CalendarRecurrenceTests: XCTestCase {
    func testJavaScriptCoreIntlAndDailyExpansionPreserveLisbonWallTimeAcrossDst() async throws {
        let starts = try await MainActor.run {
            var calendar = Calendar(identifier: .gregorian); calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Lisbon"))
            let adapter = try FabricatorCalendarEngineAdapter()
            XCTAssertEqual(try adapter.verifyTimeZone("Europe/Lisbon"), "Europe/Lisbon")
            let event = FabricatorEvent(id: "standup", title: "Standup", start: try recurrenceDate("2026-03-28T10:00:00Z"), end: try recurrenceDate("2026-03-28T10:15:00Z"), recurrence: "RRULE:FREQ=DAILY;COUNT=3")
            let events = try adapter.expand([event], in: DateInterval(start: try recurrenceDate("2026-03-28T00:00:00Z"), end: try recurrenceDate("2026-03-31T00:00:00Z")), calendar: calendar)
            XCTAssertEqual(events.map { calendar.component(.hour, from: $0.start) }, [10, 10, 10])
            return events.map { $0.start.ISO8601Format() }
        }
        XCTAssertEqual(starts, ["2026-03-28T10:00:00Z", "2026-03-29T09:00:00Z", "2026-03-30T09:00:00Z"])
    }
    func testScopedEditChangesOnlyOneOccurrenceAndDeleteUpdatesSeries() async throws {
        let titles = try await MainActor.run {
            var calendar = Calendar(identifier: .gregorian); calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Lisbon"))
            let adapter = try FabricatorCalendarEngineAdapter()
            let series = FabricatorEvent(id: "review", title: "Review", start: try recurrenceDate("2026-11-02T10:00:00Z"), end: try recurrenceDate("2026-11-02T11:00:00Z"), recurrence: "RRULE:FREQ=DAILY;COUNT=3")
            let interval = DateInterval(start: try recurrenceDate("2026-11-01T00:00:00Z"), end: try recurrenceDate("2026-11-06T00:00:00Z"))
            let occurrences = try adapter.expand([series], in: interval, calendar: calendar)
            var changed = occurrences[1]; changed.title = "Updated review"
            let stored = try adapter.edit(occurrence: occurrences[1], next: changed, scope: .this, stored: [series], calendar: calendar)
            let expanded = try adapter.expand(stored, in: interval, calendar: calendar).sorted { $0.start < $1.start }
            XCTAssertEqual(expanded.map(\.title), ["Review", "Updated review", "Review"])
            let deleted = try adapter.delete(occurrence: expanded[0], scope: .this, stored: stored, calendar: calendar)
            return try adapter.expand(deleted, in: interval, calendar: calendar).sorted { $0.start < $1.start }.map(\.title)
        }
        XCTAssertEqual(titles, ["Updated review", "Review"])
    }
    func testUnsupportedTimezoneAndRecurrenceAreErrors() async throws {
        try await MainActor.run {
            let adapter = try FabricatorCalendarEngineAdapter()
            XCTAssertThrowsError(try adapter.verifyTimeZone("Not/AZone"))
            XCTAssertThrowsError(try adapter.validate("RRULE:FREQ=SECONDLY"))
        }
    }
}
