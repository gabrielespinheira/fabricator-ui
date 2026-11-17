import SwiftUI
import XCTest
@testable import FabricatorUI

final class IconPathTests: XCTestCase {
    func testCanonicalBoldArtworkKeepsItsCurvedBowls() {
        let path = SVGPath("M6 12h9a4 4 0 010 8H7a1 1 0 01-1-1V5a1 1 0 011-1h7a4 4 0 010 8").path
        XCTAssertEqual(path.boundingRect.minX, 6, accuracy: 0.001)
        XCTAssertEqual(path.boundingRect.minY, 4, accuracy: 0.001)
        XCTAssertEqual(path.boundingRect.width, 13, accuracy: 0.001)
        XCTAssertEqual(path.boundingRect.height, 16, accuracy: 0.001)
    }

    func testPackedArcFlagsMatchSeparatedAbsoluteAndRelativePaths() {
        for (packed, spaced) in [
            ("M0 0A10 10 0 0110 10", "M0 0A10 10 0 0 1 10 10"),
            ("M0 0a10 10 0 01.5-.5", "M0 0a10 10 0 0 1 .5 -.5"),
            ("M0 0a8 8 0 0116 0 8 8 0 01-16 0", "M0 0a8 8 0 0 1 16 0 8 8 0 0 1 -16 0")
        ] {
            XCTAssertEqual(SVGPath(packed).path.description, SVGPath(spaced).path.description, packed)
        }
    }
}
