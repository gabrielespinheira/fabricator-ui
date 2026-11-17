import XCTest
import CoreGraphics
@testable import FabricatorUI

final class ChartEngineTests: XCTestCase {
    func testStatusPillsShowLatestPeriodsAndExcludeMissingDataFromUptime() {
        let periods = (0..<20).map { FabricatorStatusPeriod(id: "\($0)", label: "Day \($0)", status: $0 == 18 ? nil : $0 == 19 ? "outage" : "operational") }
        let model = FabricatorStatusBarEngine.layout(periods, width: 28)
        XCTAssertEqual(model.pills.map(\.index), [15, 16, 17, 18, 19])
        XCTAssertEqual(model.pills.map(\.width), [4, 4, 4, 4, 4])
        XCTAssertEqual(model.uptime ?? -1, 0.75, accuracy: 0.000001)
        XCTAssertEqual(model.pills[3].status.color, "muted-foreground")
        XCTAssertEqual(model.pills[3].status.opacity, 0.3)
        XCTAssertEqual(model.pills[4].status.color, "destructive")
    }

    func testStatusBarHandlesNoDataAndPreservesCustomStatusNames() {
        let model = FabricatorStatusBarEngine.layout([FabricatorStatusPeriod(id: "a", label: "A"), FabricatorStatusPeriod(id: "b", label: "B")], width: 40)
        XCTAssertNil(model.uptime)
        XCTAssertEqual(model.pills.map(\.width), [19, 18])
        let custom = FabricatorStatusBarEngine.layout([FabricatorStatusPeriod(id: "a", label: "A", status: "paused")], width: 40, statuses: ["paused": FabricatorStatusStyle(title: "Paused", color: "secondary")])
        XCTAssertEqual(custom.pills.first?.status.title, "Paused")
        XCTAssertEqual(custom.pills.first?.status.color, "secondary")
    }

    func testSeriesColorsKeepTheirSlotWhenAnotherSeriesIsHidden() {
        let series = (0..<10).map { FabricatorChartSeries(id: "s\($0)", title: "Series \($0)") }
        let visible = FabricatorChartEngine.series(series, hidden: ["s0", "s2"])
        XCTAssertEqual(visible.first?.series.id, "s1")
        XCTAssertEqual(visible.first?.color, "chart-series-2")
        XCTAssertEqual(visible.last?.color, "muted-foreground")
        XCTAssertEqual(FabricatorChartEngine.series([FabricatorChartSeries(id: "a", title: "A", color: "var(--success)")]).first?.color, "success")
    }

    func testPieFoldsSmallestPartsAndIgnoresNonpositiveValues() {
        let rows = (1...10).map { FabricatorChartRow(id: "\($0)", label: "Part \($0)", values: ["value": Double($0)]) } + [FabricatorChartRow(id: "negative", label: "Negative", values: ["value": -20])]
        let parts = FabricatorChartEngine.parts(rows, valueKey: "value")
        XCTAssertEqual(parts.count, 8)
        XCTAssertEqual(parts.map(\.id), ["4", "5", "6", "7", "8", "9", "10", "__other"])
        XCTAssertEqual(parts.last?.value, 6)
        XCTAssertEqual(parts.last?.rowIDs, ["3", "2", "1"])
        XCTAssertEqual(parts.reduce(0) { $0 + $1.value }, 55)
    }

    func testKeyboardInspectionUsesCanonicalStartingAndBoundaryBehavior() {
        XCTAssertEqual(FabricatorChartEngine.step(nil, key: .backward, count: 4), 3)
        XCTAssertEqual(FabricatorChartEngine.step(nil, key: .forward, count: 4), 0)
        XCTAssertEqual(FabricatorChartEngine.step(3, key: .forward, count: 4), 3)
        XCTAssertEqual(FabricatorChartEngine.step(2, key: .start, count: 4), 0)
        XCTAssertEqual(FabricatorChartEngine.step(0, key: .end, count: 4), 3)
        XCTAssertNil(FabricatorChartEngine.step(0, key: .forward, count: 0))
    }

    func testFormattingMatchesWebNumbersAndMissingValues() {
        XCTAssertEqual(FabricatorChartEngine.format(1234.567), "1,234.57")
        XCTAssertEqual(FabricatorChartEngine.format(-0.001), "0")
        XCTAssertEqual(FabricatorChartEngine.format(999_950, compact: true), "1M")
        XCTAssertEqual(FabricatorChartEngine.format(1250, compact: true), "1.3K")
        XCTAssertEqual(FabricatorChartEngine.format(.infinity), "–")
        XCTAssertEqual(FabricatorChartEngine.percent(0.3734), "37.3%")
    }

    func testTreemapContainsCellsAndPreservesAreaWithoutGaps() {
        let bounds = CGRect(x: 5, y: 10, width: 400, height: 200)
        let values = [6.0, 4, 3, 2, 1, 0]
        let cells = FabricatorTreemapLayout.layout(values, in: bounds)
        XCTAssertEqual(cells.count, values.count)
        XCTAssertEqual(cells.reduce(0) { $0 + $1.width * $1.height }, bounds.width * bounds.height, accuracy: 0.01)
        for cell in cells where !cell.isEmpty { XCTAssertTrue(bounds.contains(cell)) }
        XCTAssertEqual(cells.last, .zero)
        XCTAssertEqual(cells[0].width * cells[0].height / (bounds.width * bounds.height), 6.0 / 16, accuracy: 0.0001)
    }
}
