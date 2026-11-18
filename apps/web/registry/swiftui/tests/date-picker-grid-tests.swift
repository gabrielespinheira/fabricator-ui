import XCTest
@testable import FabricatorUI

final class DatePickerGridTests: XCTestCase {
    private var calendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .gmt
        calendar.locale = Locale(identifier: "en_US")
        return calendar
    }
    private func date(_ year: Int, _ month: Int = 1, _ day: Int = 1) throws -> Date {
        try XCTUnwrap(calendar.date(from: DateComponents(year: year, month: month, day: day)))
    }
    func testMonthGridHasTwelveWholeMonthsAndInclusiveMonthBounds() throws {
        let bounds = try date(2026, 3, 21)...date(2026, 8, 4)
        let values = FabricatorDateGrid.values(containing: try date(2026, 11, 16), granularity: .month, calendar: calendar)
        XCTAssertEqual(values.count, 12)
        XCTAssertEqual(values.first, try date(2026))
        XCTAssertEqual(values.last, try date(2026, 12))
        XCTAssertTrue(FabricatorDateGrid.isSelectable(try date(2026, 3), granularity: .month, allowedRange: bounds, calendar: calendar))
        XCTAssertTrue(FabricatorDateGrid.isSelectable(try date(2026, 8, 31), granularity: .month, allowedRange: bounds, calendar: calendar))
        XCTAssertFalse(FabricatorDateGrid.isSelectable(try date(2026, 2), granularity: .month, allowedRange: bounds, calendar: calendar))
        XCTAssertFalse(FabricatorDateGrid.isSelectable(try date(2026, 9), granularity: .month, allowedRange: bounds, calendar: calendar))
    }
    func testYearPagesUseCanonicalTwelveYearBoundaries() throws {
        let values = FabricatorDateGrid.values(containing: try date(2026, 11, 16), granularity: .year, calendar: calendar)
        XCTAssertEqual(values.count, 12)
        XCTAssertEqual(values.first, try date(2016))
        XCTAssertEqual(values.last, try date(2027))
        XCTAssertEqual(FabricatorDateGrid.page(containing: try date(2028), granularity: .year, calendar: calendar), try date(2028))
        let bounds = try date(2024, 12, 31)...date(2026, 1, 1)
        XCTAssertTrue(FabricatorDateGrid.isSelectable(try date(2024), granularity: .year, allowedRange: bounds, calendar: calendar))
        XCTAssertTrue(FabricatorDateGrid.isSelectable(try date(2026, 12, 31), granularity: .year, allowedRange: bounds, calendar: calendar))
        XCTAssertFalse(FabricatorDateGrid.isSelectable(try date(2023), granularity: .year, allowedRange: bounds, calendar: calendar))
    }
    func testMovingCellsAndPagesNormalizesTheSelectedPeriod() throws {
        let reference = try date(2026, 11, 16)
        XCTAssertEqual(FabricatorDateGrid.move(reference, amount: 3, granularity: .month, calendar: calendar), try date(2027, 2))
        XCTAssertEqual(FabricatorDateGrid.move(reference, amount: -12, granularity: .month, calendar: calendar), try date(2025, 11))
        XCTAssertEqual(FabricatorDateGrid.move(reference, amount: 12, granularity: .year, calendar: calendar), try date(2038))
        XCTAssertEqual(FabricatorDateGrid.start(reference, granularity: .year, calendar: calendar), try date(2026))
    }
}
