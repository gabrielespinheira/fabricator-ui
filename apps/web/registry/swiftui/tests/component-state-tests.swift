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

    func testTableStatusSortUsesTheEditedOptionOrder() {
        let columns = [FabricatorTableColumn("stage", title: "Stage", type: .status, options: ["Lead", "Won", "Lost"])]
        let rows = ["Lead", "Won", "Lost"].map { FabricatorTableRow(id: $0, cells: ["stage": $0]) }
        var state = FabricatorTableState(sortKey: "stage")
        state.columnOptions["stage"] = ["Lost", "Lead", "Won"]
        XCTAssertEqual(FabricatorDataTableEngine.query(rows, columns: columns, state: state).map(\.id), ["Lost", "Lead", "Won"])
    }

    func testTableTypeDefaultsUseTheGeneratedWebContract() {
        XCTAssertEqual(FabricatorTableColumnType.text.defaultWidth, 220)
        XCTAssertEqual(FabricatorTableColumnType.person.defaultWidth, 190)
        XCTAssertEqual(FabricatorTableColumnType.currency.defaultWidth, 160)
        XCTAssertEqual(FabricatorTableColumnType.currency.minimumWidth, 110)
        XCTAssertEqual(FabricatorTableColumnType.email.defaultWidth, 240)
        XCTAssertEqual(FabricatorTableColumnType.progress.cellAlignment, .start)
        XCTAssertEqual(FabricatorTableColumnType.number.cellAlignment, .end)
        XCTAssertEqual(FabricatorTableColumnType.boolean.cellAlignment, .center)
    }

    func testTableTypedHeaderSortCyclesFromItsTypeDefaultThroughRemoval() {
        var state = FabricatorTableState(page: 6)
        state.sort(by: "value", type: .currency)
        XCTAssertEqual(state.sortKey, "value")
        XCTAssertFalse(state.ascending)
        XCTAssertEqual(state.page, 0)
        state.sort(by: "value", type: .currency)
        XCTAssertTrue(state.ascending)
        state.sort(by: "value", type: .currency)
        XCTAssertNil(state.sortKey)
        state.sort(by: "contact", type: .date)
        XCTAssertFalse(state.ascending)
        state.sort(by: "stage", type: .status)
        XCTAssertTrue(state.ascending)
    }

    func testTableUnsortedHeadersDoNotInheritAnotherColumnsDirection() {
        var state = FabricatorTableState(sortKey: "value", ascending: false)
        XCTAssertNil(state.sortDescriptor(for: "company"))
        XCTAssertEqual(state.sortDescriptor(for: "value")?.ascending, false)
        state.sort(by: "company")
        XCTAssertEqual(state.sortDescriptor(for: "company")?.ascending, true)
        state.sort(by: "company")
        XCTAssertEqual(state.sortDescriptor(for: "company")?.ascending, false)
        state.sortDescriptors = [FabricatorTableSort("stage")]
        XCTAssertNil(state.sortDescriptor(for: "company"))
        XCTAssertEqual(state.sortDescriptor(for: "stage")?.ascending, true)
    }

    func testTablePercentProgressAndBooleanFormattingMatchesWeb() {
        XCTAssertEqual(FabricatorDataTableEngine.format("0.126", column: FabricatorTableColumn("rate", title: "Rate", type: .percent)), "13%")
        XCTAssertEqual(FabricatorDataTableEngine.format("64.7", column: FabricatorTableColumn("health", title: "Health", type: .progress)), "65%")
        XCTAssertEqual(FabricatorDataTableEngine.format("true", column: FabricatorTableColumn("active", title: "Active", type: .boolean)), "Yes")
        XCTAssertEqual(FabricatorDataTableEngine.format("false", column: FabricatorTableColumn("active", title: "Active", type: .boolean)), "No")
    }

    func testTableFooterFormatsCountsAndTypedValuesSeparately() {
        let currency = FabricatorTableColumn("value", title: "Pipeline", type: .currency, fractionDigits: 0)
        XCTAssertEqual(FabricatorDataTableEngine.formatAggregate(["100.5", "200.5"], operation: .sum, column: currency), "$301")
        XCTAssertEqual(FabricatorDataTableEngine.formatAggregate(["100.5", "200.5"], operation: .count, column: currency), "2")
        let date = FabricatorTableColumn("date", title: "Date", type: .date)
        XCTAssertEqual(FabricatorDataTableEngine.formatAggregate(["2026-01-01", "2026-11-12"], operation: .max, column: date), "Nov 12, 2026")
    }

    func testTableRelativeDatesUseTheSameCalendarThresholdsAsWeb() throws {
        let column = FabricatorTableColumn("date", title: "Last contact", type: .date, isDateRelative: true)
        let reference = try XCTUnwrap(FabricatorDataTableEngine.parseDate("2026-11-12T12:00:00Z"))
        XCTAssertEqual(FabricatorDataTableEngine.format("2026-11-11T12:00:00Z", column: column, referenceDate: reference), "yesterday")
        XCTAssertEqual(FabricatorDataTableEngine.format("2026-11-12T12:00:00Z", column: column, referenceDate: reference), "now")
        XCTAssertEqual(FabricatorDataTableEngine.format("2026-03-19T12:00:00Z", column: column, referenceDate: reference), "7 months ago")
        XCTAssertEqual(FabricatorDataTableEngine.format("2026-11-14T12:00:00Z", column: column, referenceDate: reference), "in 2 days")
        XCTAssertEqual(FabricatorDataTableEngine.formatAggregate(["2026-03-19", "2026-11-12"], operation: .max, column: column), "Nov 12, 2026")
    }

    func testTableAcceptsJavaScriptISODateFractions() throws {
        let plain = try XCTUnwrap(FabricatorDataTableEngine.parseDate("2026-11-12T12:00:00Z"))
        XCTAssertEqual(FabricatorDataTableEngine.parseDate("2026-11-12T12:00:00.000Z"), plain)
    }

    func testPaginationOnlyBuildsVisiblePagesForLargeDataSets() {
        XCTAssertEqual(FabricatorPaginationEngine.items(page: 0, pageCount: 1000), [.page(0), .page(1), .gap(after: 1), .page(999)])
        XCTAssertEqual(FabricatorPaginationEngine.items(page: 500, pageCount: 1000), [.page(0), .gap(after: 0), .page(499), .page(500), .page(501), .gap(after: 501), .page(999)])
        XCTAssertEqual(FabricatorPaginationEngine.items(page: 10, pageCount: 2), [.page(0), .page(1)])
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
