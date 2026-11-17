import XCTest
@testable import FabricatorUI

final class MotionTests: XCTestCase {
    func testInstantKeepsBriefFeedbackButRemovesRevealAndPressTravel() throws {
        let theme = FabricatorTheme(motionSpeed: .instant)
        XCTAssertEqual(try XCTUnwrap(theme.motionTiming("feedback")).duration, 0.05)
        XCTAssertEqual(try XCTUnwrap(theme.motionTiming("dialog", isExiting: true)).duration, 0.08)
        XCTAssertNil(theme.motionTiming("reveal"))
        XCTAssertEqual(theme.pressScale, 1)
    }

    func testExitsUseExitTimingWhileSheetsKeepTheDrawerCurve() throws {
        let theme = FabricatorTheme()
        let popup = try XCTUnwrap(theme.motionTiming("popup", isExiting: true))
        XCTAssertEqual(popup.duration, 0.12)
        XCTAssertEqual(popup.curve, .cubicBezier(0.23, 1, 0.32, 1))
        let sheet = try XCTUnwrap(theme.motionTiming("sheet", isExiting: true))
        XCTAssertEqual(sheet.duration, 0.25)
        XCTAssertEqual(sheet.curve, .cubicBezier(0.32, 0.72, 0, 1))
        XCTAssertEqual(try XCTUnwrap(theme.motionTiming("move")).curve, .cubicBezier(0.77, 0, 0.175, 1))
    }

    func testMotionOffDisablesTimingAndSpatialEffectsAtEverySpeed() {
        for speed in FabricatorMotionSpeed.allCases {
            let theme = FabricatorTheme(motionSpeed: speed, isMotionEnabled: false)
            XCTAssertNil(theme.motionTiming("dialog"))
            XCTAssertEqual(theme.pressScale, 1)
            XCTAssertEqual(theme.surfaceScale("popup"), 1)
            XCTAssertEqual(theme.popupBlur, 0)
            XCTAssertEqual(theme.motionProgress("reveal", elapsed: 0), 1)
        }
    }

    func testMotionScaleRetimesCurvesAndPreservesCanonicalSpringSamples() throws {
        let theme = FabricatorTheme(motionSpeed: .smooth, motionScale: 2)
        XCTAssertEqual(try XCTUnwrap(theme.motionTiming("popup")).duration, 0.56)
        XCTAssertEqual(theme.surfaceScale("popup"), 0.94)
        XCTAssertEqual(theme.popupBlur, 2)
        let bounce = try XCTUnwrap(FabricatorTheme().motionTiming("bounce"))
        XCTAssertEqual(bounce.curve, .spring(bounce: 0.35))
        XCTAssertEqual(bounce.progress(at: 0), 0)
        XCTAssertGreaterThan(bounce.progress(at: 0.4), 1)
        XCTAssertEqual(bounce.progress(at: 1), 1)
        XCTAssertEqual(FabricatorTheme(motionScale: 0).pressScale, 1)
    }

    func testBezierProgressSolvesTimeRatherThanTreatingItAsTheCurveParameter() throws {
        let timing = try XCTUnwrap(FabricatorTheme().motionTiming("popup"))
        XCTAssertEqual(timing.progress(at: 0), 0)
        XCTAssertEqual(timing.progress(at: 1), 1)
        XCTAssertEqual(timing.progress(at: 0.5), 0.966, accuracy: 0.002)
        XCTAssertEqual(FabricatorTheme().motionProgress("popup", elapsed: 0.09), timing.progress(at: 0.5), accuracy: 0.00001)
    }

    func testChoiceIndicatorsUseMoveDurationWithTheEntranceCurve() throws {
        let theme = FabricatorTheme()
        let indicator = try XCTUnwrap(theme.motionTiming("move", easing: .enter))
        XCTAssertEqual(indicator.duration, 0.25)
        XCTAssertEqual(indicator.curve, .cubicBezier(0.23, 1, 0.32, 1))
        XCTAssertEqual(try XCTUnwrap(theme.motionTiming("move")).curve, .cubicBezier(0.77, 0, 0.175, 1))
        XCTAssertNil(FabricatorTheme(isMotionEnabled: false).motionTiming("move", easing: .enter))
    }
}
