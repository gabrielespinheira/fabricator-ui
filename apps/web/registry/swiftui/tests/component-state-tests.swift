import XCTest
@testable import FabricatorUI

final class ComponentStateTests: XCTestCase {
    func testSelectionPreservesOrderAndMaximum() {
        var selection = FabricatorSelection(values: ["design"], maximum: 2)
        XCTAssertTrue(selection.toggle("engineering"))
        XCTAssertFalse(selection.toggle("product"))
        XCTAssertEqual(selection.values, ["design", "engineering"])
        XCTAssertTrue(selection.toggle("design"))
        XCTAssertEqual(selection.values, ["engineering"])
    }

    func testTableFiltersBeforePagingAndSortsNumbersNumerically() {
        let rows = [
            FabricatorTableRow(id: "a", cells: ["name": "Alpine", "amount": "12"]),
            FabricatorTableRow(id: "b", cells: ["name": "Alpha", "amount": "2"]),
            FabricatorTableRow(id: "c", cells: ["name": "Orion", "amount": "8"])
        ]
        let state = FabricatorTableState(query: "Al", sortKey: "amount", ascending: true, page: 0, pageSize: 1)
        XCTAssertEqual(state.filteredRows(rows).map(\.id), ["b", "a"])
        XCTAssertEqual(state.visibleRows(rows).map(\.id), ["b"])
        XCTAssertEqual(state.pageCount(for: rows), 2)
    }

    func testCalendarUsesWeekStartAndIncludesOutsideMonthDays() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(secondsFromGMT: 0))
        calendar.firstWeekday = 2
        let november = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 11, day: 15)))
        let days = FabricatorCalendar.monthDays(containing: november, calendar: calendar)
        XCTAssertEqual(days.count, 42)
        XCTAssertEqual(calendar.component(.weekday, from: try XCTUnwrap(days.first)), 2)
        XCTAssertEqual(calendar.component(.day, from: days[6]), 1)
    }

    func testQuestionnaireValidatesRequiredAnswerAndKeepsAnswerWhenGoingBack() {
        let questions = [FabricatorQuestion(id: "role", title: "Your role", options: ["Designer", "Engineer"]), FabricatorQuestion(id: "team", title: "Team size", options: ["1–5", "6–20"])]
        var state = FabricatorQuestionnaireState()
        XCTAssertFalse(state.advance(questions: questions))
        state.answers["role"] = "Engineer"
        XCTAssertTrue(state.advance(questions: questions))
        XCTAssertEqual(state.index, 1)
        state.back()
        XCTAssertEqual(state.answers["role"], "Engineer")
        XCTAssertEqual(state.index, 0)
    }

    func testTreeOnlyReturnsExpandedDescendantsAndSearchIncludesAncestors() {
        let tree = [FabricatorFileNode(id: "src", name: "src", children: [FabricatorFileNode(id: "button", name: "button.swift")])]
        XCTAssertEqual(FabricatorFileNode.flatten(tree, expanded: []).map(\.node.id), ["src"])
        XCTAssertEqual(FabricatorFileNode.flatten(tree, expanded: ["src"]).map(\.depth), [0, 1])
        XCTAssertEqual(FabricatorFileNode.flatten(tree, expanded: [], query: "button").map(\.node.id), ["src", "button"])
    }

    func testSoundSynthMatchesCanonicalWebRecipeSamples() throws {
        let tap = try XCTUnwrap(FabricatorContract.shared.sounds.first { $0.name == "tap" })
        let samples = FabricatorSoundSynthesizer.render(tap.partials)
        XCTAssertEqual(samples.count, 1985)
        XCTAssertEqual(samples[1], 0.000013549134564527776, accuracy: 0.00000001)
        XCTAssertEqual(samples[100], 0.05334467068314552, accuracy: 0.00000001)
        XCTAssertEqual(samples[500], -0.010278521105647087, accuracy: 0.00000001)
        XCTAssertEqual(samples[1000], -0.0009594117873348296, accuracy: 0.00000001)
        let wav = FabricatorSoundSynthesizer.encodeWav(samples)
        XCTAssertEqual(wav.count, 44 + samples.count * 2)
        XCTAssertEqual(String(decoding: wav.prefix(4), as: UTF8.self), "RIFF")
        XCTAssertEqual(String(decoding: wav[8..<12], as: UTF8.self), "WAVE")
    }

    func testCalendarWeekAndDragPreserveLocalTimeAcrossDaylightSaving() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Lisbon"))
        calendar.firstWeekday = 2
        let start = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 3, day: 28, hour: 10)))
        let target = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 3, day: 29)))
        let event = FabricatorEvent(id: "review", title: "Review", start: start, end: start.addingTimeInterval(3600))
        let moved = FabricatorEventCalendarEngine.move(event, toDay: target, minute: 600, calendar: calendar)
        XCTAssertEqual(calendar.component(.hour, from: moved.start), 10)
        XCTAssertEqual(moved.end.timeIntervalSince(moved.start), 3600)
        let week = FabricatorEventCalendarEngine.visibleDays(containing: start, mode: .week, calendar: calendar)
        XCTAssertEqual(week.count, 7)
        XCTAssertEqual(calendar.component(.weekday, from: try XCTUnwrap(week.first)), 2)
    }

    func testOverlappingEventsShareColumnsOnlyWithinTheirCluster() throws {
        let base = Date(timeIntervalSince1970: 0)
        let events = [FabricatorEvent(id: "a", title: "A", start: base.addingTimeInterval(3600), end: base.addingTimeInterval(7200)), FabricatorEvent(id: "b", title: "B", start: base.addingTimeInterval(5400), end: base.addingTimeInterval(9000)), FabricatorEvent(id: "c", title: "C", start: base.addingTimeInterval(10800), end: base.addingTimeInterval(14400))]
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(secondsFromGMT: 0))
        let layout = FabricatorEventCalendarEngine.layout(events, on: base, calendar: calendar)
        XCTAssertEqual(layout.map(\.column), [0, 1, 0])
        XCTAssertEqual(layout.map(\.columnCount), [2, 2, 1])
        let resized = FabricatorEventCalendarEngine.resize(events[0], end: base, minimumMinutes: 15)
        XCTAssertEqual(resized.end.timeIntervalSince(resized.start), 900)
    }

    func testTableEditParsingMatchesCanonicalNumericSemantics() throws {
        XCTAssertEqual(try FabricatorDataTableEngine.parseEdit("$1,234.50", type: .currency), "1234.5")
        XCTAssertEqual(try FabricatorDataTableEngine.parseEdit("12.5%", type: .percent), "0.125")
        XCTAssertEqual(try FabricatorDataTableEngine.parseEdit("120", type: .progress), "100.0")
        XCTAssertEqual(try FabricatorDataTableEngine.parseEdit(" ", type: .number), "")
        XCTAssertThrowsError(try FabricatorDataTableEngine.parseEdit("unknown", type: .number))
    }

    func testTableFiltersAndStatusOrderingUseColumnTypes() {
        let columns = [FabricatorTableColumn("status", title: "Status", type: .status, options: ["Lead", "Active", "Won"]), FabricatorTableColumn("amount", title: "Amount", type: .number)]
        let rows = [FabricatorTableRow(id: "a", cells: ["status": "Won", "amount": "25"]), FabricatorTableRow(id: "b", cells: ["status": "Active", "amount": "100"]), FabricatorTableRow(id: "c", cells: ["status": "Lead", "amount": "5"])]
        var state = FabricatorTableState(sortKey: "status")
        state.filters["amount"] = FabricatorTableFilter(operation: .gte, value: "10")
        XCTAssertEqual(FabricatorDataTableEngine.query(rows, columns: columns, state: state).map(\.id), ["b", "a"])
        state.filters["status"] = FabricatorTableFilter(operation: .anyOf, value: "Won")
        XCTAssertEqual(FabricatorDataTableEngine.query(rows, columns: columns, state: state).map(\.id), ["a"])
    }

    func testTablePinningPreservesVisibleColumnOrderAndRangeSelection() {
        let columns = [FabricatorTableColumn("a", title: "A"), FabricatorTableColumn("b", title: "B"), FabricatorTableColumn("c", title: "C"), FabricatorTableColumn("d", title: "D")]
        var state = FabricatorTableState()
        state.hiddenColumns = ["b"]
        state.columnOrder = ["d", "c", "b", "a"]
        state.leadingPinnedColumns = ["a"]
        XCTAssertEqual(FabricatorDataTableEngine.orderedColumns(columns, state: state).map(\.id), ["a", "d", "c"])
        XCTAssertEqual(FabricatorDataTableEngine.rangeSelection(rowIDs: ["a", "b", "c", "d"], anchor: "d", target: "b"), ["b", "c", "d"])
    }

    func testSpinnerSamplesCanonicalKeyframesAndValidatesSpeed() throws {
        let orbit = try XCTUnwrap(FabricatorContract.shared.spinners.variants.first { $0.value == .orbit })
        XCTAssertEqual(FabricatorContract.shared.spinners.variants.count, 22)
        let frame = FabricatorSpinnerEngine.sample(orbit.motion, phase: 0.05)
        XCTAssertEqual(frame.opacity, 0.56, accuracy: 0.000001)
        XCTAssertEqual(frame.scaleX, 0.99, accuracy: 0.000001)
        XCTAssertEqual(FabricatorSpinnerEngine.duration(baseMilliseconds: 1100, speed: 2), 550)
        XCTAssertEqual(FabricatorSpinnerEngine.duration(baseMilliseconds: 1100, speed: .infinity), 1100)
        XCTAssertEqual(FabricatorSpinnerEngine.duration(baseMilliseconds: 1100, speed: 0), 1100)
    }
}
