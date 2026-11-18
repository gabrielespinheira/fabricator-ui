import XCTest
@testable import FabricatorUI

final class TimeWheelTests: XCTestCase {
    func testClockColumnsKeepCanonicalValuesAndNearestRows() {
        XCTAssertEqual(FabricatorTimeWheelModel.getHourValues(.twelve), Array(1...12))
        XCTAssertEqual(FabricatorTimeWheelModel.getHourValues(.twentyFour), Array(0...23))
        XCTAssertEqual(FabricatorTimeWheelModel.getMinuteValues(step: 15), [0, 15, 30, 45])
        XCTAssertEqual(FabricatorTimeWheelModel.getMinuteValues(step: 7), [0, 7, 14, 21, 28, 35, 42, 49, 56])
        XCTAssertEqual(FabricatorTimeWheelModel.getMinuteValues(step: 0), Array(0...59))
        XCTAssertEqual(FabricatorTimeWheelModel.getMinuteValues(step: 90), [0])
        XCTAssertEqual(FabricatorTimeWheelModel.findNearestIndex(in: [0, 5, 10], to: 7), 1)
        XCTAssertEqual(FabricatorTimeWheelModel.findNearestIndex(in: [0, 10], to: 5), 0)
        XCTAssertEqual(FabricatorTimeWheelModel.move(in: [0, 5, 10], from: 7, by: 1), 10)
        XCTAssertEqual(FabricatorTimeWheelModel.move(in: [0, 5, 10], from: 10, by: 5), 10)
        XCTAssertEqual(FabricatorTimeWheelModel.move(in: [0, 5, 10], from: 0, by: -5), 0)
    }
    func testTwelveHourColumnsPreserveMeridiemAndSeconds() {
        let time = FabricatorTimeOfDay(hours: 21, minutes: 5, seconds: 9)
        XCTAssertEqual(time.hour12, 9); XCTAssertEqual(time.meridiem, 1)
        XCTAssertEqual(time.changing(.hours, to: 12, hourCycle: .twelve, hasSeconds: true), FabricatorTimeOfDay(hours: 12, minutes: 5, seconds: 9))
        XCTAssertEqual(time.changing(.meridiem, to: 0, hourCycle: .twelve, hasSeconds: true), FabricatorTimeOfDay(hours: 9, minutes: 5, seconds: 9))
        XCTAssertEqual(time.changing(.minutes, to: 30, hourCycle: .twentyFour, hasSeconds: false), FabricatorTimeOfDay(hours: 21, minutes: 30))
        XCTAssertEqual(FabricatorTimeOfDay(hours: 0, minutes: 0).hour12, 12)
    }
    func testWheelClampsAgainstSecondsAndKeepsItsConfiguredForm() {
        let bounds = FabricatorTimeOfDay(hours: 9, minutes: 0, seconds: 30)...FabricatorTimeOfDay(hours: 17, minutes: 0)
        XCTAssertEqual(FabricatorTimeOfDay(hours: 8, minutes: 15).clamped(to: bounds, hasSeconds: true), bounds.lowerBound)
        XCTAssertEqual(FabricatorTimeOfDay(hours: 18, minutes: 30, seconds: 20).clamped(to: bounds, hasSeconds: true), bounds.upperBound)
        XCTAssertEqual(FabricatorTimeOfDay(hours: 8, minutes: 15).clamped(to: bounds, hasSeconds: false), FabricatorTimeOfDay(hours: 9, minutes: 0))
    }
    func testChangingClockTimePreservesTheDateAndUsesCalendarDSTResolution() throws {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = try XCTUnwrap(TimeZone(identifier: "Europe/Lisbon"))
        let date = try XCTUnwrap(calendar.date(from: DateComponents(year: 2026, month: 3, day: 29)))
        let changed = FabricatorTimeOfDay(hours: 9, minutes: 5, seconds: 7).makeDate(on: date, calendar: calendar)
        XCTAssertEqual(calendar.component(.day, from: changed), 29)
        XCTAssertEqual(FabricatorTimeOfDay(changed, calendar: calendar), FabricatorTimeOfDay(hours: 9, minutes: 5, seconds: 7))
        let skipped = FabricatorTimeOfDay(hours: 1, minutes: 30).makeDate(on: date, calendar: calendar)
        XCTAssertEqual(FabricatorTimeOfDay(skipped, calendar: calendar), FabricatorTimeOfDay(hours: 2, minutes: 30))
    }
    func testDrumTiltUsesReactGeometryAndStopsUnderReducedMotion() {
        XCTAssertEqual(FabricatorTimeWheelModel.getTiltAngle(offset: 0, height: 224, hasMotion: true), 0)
        XCTAssertEqual(FabricatorTimeWheelModel.getTiltAngle(offset: 112, height: 224, hasMotion: true), -81, accuracy: 0.0001)
        XCTAssertEqual(FabricatorTimeWheelModel.getTiltAngle(offset: -224, height: 224, hasMotion: true), 81, accuracy: 0.0001)
        XCTAssertEqual(FabricatorTimeWheelModel.getTiltAngle(offset: 80, height: 224, hasMotion: false), 0)
    }
    func testScrollSnapsTheNearestRowToTheBandIncludingBothEnds() {
        XCTAssertEqual(FabricatorTimeWheelModel.getSnapIndex(offset: -40, rowHeight: 32, count: 60), 0)
        XCTAssertEqual(FabricatorTimeWheelModel.getSnapIndex(offset: 7 * 32 + 14, rowHeight: 32, count: 60), 7)
        XCTAssertEqual(FabricatorTimeWheelModel.getSnapIndex(offset: 7 * 32 + 17, rowHeight: 32, count: 60), 8)
        XCTAssertEqual(FabricatorTimeWheelModel.getSnapIndex(offset: 80 * 32, rowHeight: 32, count: 60), 59)
    }
}
