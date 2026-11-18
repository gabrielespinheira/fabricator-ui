import XCTest
@testable import FabricatorUI

final class TimeInputTests: XCTestCase {
    func testTypedClockFormsFollowTheCanonicalParser() {
        for (text, hours, minutes, seconds) in [("9", 9, 0, 0), ("930", 9, 30, 0), ("2130", 21, 30, 0), ("9.30", 9, 30, 0), ("9h30", 9, 30, 0), ("9:30 p.m.", 21, 30, 0), ("12am", 0, 0, 0), ("noon", 12, 0, 0), (" Midnight ", 0, 0, 0), ("21:30:15", 21, 30, 15)] {
            XCTAssertEqual(FabricatorTimeInputModel.parse(text)?.value, FabricatorTimeOfDay(hours: hours, minutes: minutes, seconds: seconds), text)
        }
        for text in ["", "25:00", "9:60", "13pm", "0pm", "later", "9:3", "12345", "9:30:60"] { XCTAssertNil(FabricatorTimeInputModel.parse(text), text) }
    }
    func testTimeCommitPreservesInvalidDraftsAndUsesMinuteBounds() {
        let bounds = FabricatorTimeOfDay(hours: 9, minutes: 0, seconds: 30)...FabricatorTimeOfDay(hours: 17, minutes: 0)
        XCTAssertEqual(FabricatorTimeInputModel.commit("930pm", hourCycle: .twelve), FabricatorTimeTextCommit(value: FabricatorTimeOfDay(hours: 21, minutes: 30), text: "9:30 PM", isInvalid: false))
        XCTAssertEqual(FabricatorTimeInputModel.commit("later", hourCycle: .twelve), FabricatorTimeTextCommit(value: nil, text: "later", isInvalid: true))
        XCTAssertEqual(FabricatorTimeInputModel.commit("8", hourCycle: .twentyFour, allowedRange: bounds), FabricatorTimeTextCommit(value: nil, text: "08:00", isInvalid: true))
        XCTAssertFalse(FabricatorTimeInputModel.commit("9", hourCycle: .twentyFour, allowedRange: bounds).isInvalid)
        XCTAssertEqual(FabricatorTimeInputModel.commit("  ", hourCycle: .twelve), FabricatorTimeTextCommit(value: nil, text: "", isInvalid: false))
    }
    func testClockFormattingNormalizesOptionalSeconds() {
        let time = FabricatorTimeOfDay(hours: 0, minutes: 5, seconds: 4)
        XCTAssertEqual(FabricatorTimeInputModel.format(time, hourCycle: .twelve, hasSeconds: true), "12:05:04 AM")
        XCTAssertEqual(FabricatorTimeInputModel.format(time, hourCycle: .twentyFour, hasSeconds: false), "00:05")
        XCTAssertEqual(FabricatorTimeInputModel.format(nil, hourCycle: .twelve, hasSeconds: false), "")
    }
    func testOptionalAndRequiredValuesKeepInvalidTextUntilExternalSync() {
        let time = FabricatorTimeOfDay(hours: 9, minutes: 5)
        var input = FabricatorTimeInputState(value: time, text: "9:05 AM")
        XCTAssertNil(input.commit(FabricatorTimeInputModel.commit("later", hourCycle: .twelve), allowsEmptyValue: true, hasSeconds: false))
        input.synchronize(nil, text: ""); XCTAssertEqual(input.text, "later"); XCTAssertTrue(input.isInvalid)
        input.synchronize(time, text: "9:05 AM"); XCTAssertEqual(input.text, "9:05 AM"); XCTAssertFalse(input.isInvalid)
        XCTAssertEqual(input.commit(FabricatorTimeInputModel.commit("", hourCycle: .twelve), allowsEmptyValue: false, hasSeconds: false), time)
        XCTAssertEqual(input.text, ""); XCTAssertTrue(input.isInvalid)
    }
    func testDateTimeSplitKeepsDateCommasAndFindsTheTrailingClock() {
        XCTAssertEqual(FabricatorTimeInputModel.splitDateTime("Nov 12, 2026, 10:30 AM").dateText, "Nov 12, 2026")
        XCTAssertEqual(FabricatorTimeInputModel.splitDateTime("tomorrow at 9pm").timeText, "9pm")
        XCTAssertEqual(FabricatorTimeInputModel.splitDateTime("Nov 12, 2026").dateText, "Nov 12, 2026")
        XCTAssertNil(FabricatorTimeInputModel.splitDateTime("Nov 12, 2026").timeText)
        XCTAssertEqual(FabricatorTimeInputModel.splitDateTime("tomorrow at 9:99").timeText, "9:99")
    }
}
