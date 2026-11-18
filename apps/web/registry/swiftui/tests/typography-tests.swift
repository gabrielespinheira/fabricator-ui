import CoreText
import SwiftUI
import XCTest
@testable import FabricatorUI

final class TypographyTests: XCTestCase {
    func testTabularDigitMeasurementKeepsYearLabelsAtOneWidth() {
        let font = FabricatorFontAdapter.withMonospacedDigits(FabricatorTheme().resolveFont(32, weight: .semibold))
        XCTAssertEqual(FabricatorFontAdapter.measureTextWidth("1111", font: font), FabricatorFontAdapter.measureTextWidth("8888", font: font))
        XCTAssertGreaterThan(FabricatorFontAdapter.measureTextWidth("1111", font: font), FabricatorFontAdapter.measureTextWidth("1111", font: FabricatorTheme().resolveFont(32, weight: .semibold)))
    }

    func testInterRetainsCanonicalWeightAxesAndOpticalSizing() throws {
        let theme = FabricatorTheme()
        for (weight, expected) in [(Font.Weight.regular, 400.0), (.medium, 450.0), (.semibold, 550.0), (.bold, 700.0)] {
            let font = theme.resolveFont(24, weight: weight)
            XCTAssertEqual(CTFontCopyFamilyName(font) as String, "Inter Variable")
            XCTAssertEqual(try readAxis(0x77676874, from: font), expected, accuracy: 0.001)
            XCTAssertEqual(try readAxis(0x6f70737a, from: font), 24, accuracy: 0.001)
            XCTAssertEqual(CTFontGetSize(font), 24)
        }
    }

    func testAccessibilityScalingEnlargesTypeAndControlsWithoutChangingWeight() throws {
        var theme = FabricatorTheme()
        theme.fontScale = 2
        let font = theme.resolveFont(13, weight: .medium)
        XCTAssertEqual(CTFontGetSize(font), 26)
        let axes = try XCTUnwrap(CTFontCopyVariation(font) as? [NSNumber: NSNumber])
        XCTAssertEqual(try XCTUnwrap(axes[NSNumber(value: 0x77676874)]).doubleValue, 450, accuracy: 0.001)
        XCTAssertGreaterThan(theme.controlHeight, CTFontGetAscent(font) + CTFontGetDescent(font))
        XCTAssertGreaterThan(theme.controlHeight, FabricatorTheme().controlHeight)
    }

    func testDefaultTypeKeepsAllThreeDensityGeometries() {
        XCTAssertEqual(FabricatorTheme(density: .compact).controlHeight, 28)
        XCTAssertEqual(FabricatorTheme(density: .regular).controlHeight, 36)
        XCTAssertEqual(FabricatorTheme(density: .spacious).controlHeight, 44)
    }

    private func readAxis(_ identifier: Int, from font: CTFont) throws -> Double {
        let definitions = try XCTUnwrap(CTFontCopyVariationAxes(font) as? [[String: Any]])
        let definition = try XCTUnwrap(definitions.first { ($0[kCTFontVariationAxisIdentifierKey as String] as? NSNumber)?.intValue == identifier })
        let defaultValue = try XCTUnwrap(definition[kCTFontVariationAxisDefaultValueKey as String] as? NSNumber)
        // Core Text omits axes at their default value from the variation dictionary.
        let values = CTFontCopyVariation(font) as? [NSNumber: NSNumber]
        return (values?[NSNumber(value: identifier)] ?? defaultValue).doubleValue
    }
}
