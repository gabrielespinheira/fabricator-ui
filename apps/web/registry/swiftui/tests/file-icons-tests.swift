import XCTest
@testable import FabricatorUI

final class FileIconsTests: XCTestCase {
    func testCanonicalNamesPreferExactMatchesAndLongestExtension() {
        let catalog = FabricatorFileIconAssets.catalog
        XCTAssertEqual(catalog.resolve("app.tsx", isDirectory: false), "file-react-typescript")
        XCTAssertEqual(catalog.resolve("C:\\src\\INDEX.D.TS", isDirectory: false), "file-typescript-def")
        XCTAssertEqual(catalog.resolve("package.json", isDirectory: false), "file-node")
        XCTAssertEqual(catalog.resolve("file.test.ts", isDirectory: false), "file-test-blue")
        XCTAssertEqual(catalog.resolve(".env.local", isDirectory: false), "file-config")
        XCTAssertEqual(catalog.resolve("image.unknown", isDirectory: false), "default-file")
    }

    func testEmptyAndNamedFoldersHaveExpandedArtwork() {
        let catalog = FabricatorFileIconAssets.catalog
        XCTAssertEqual(catalog.resolve("src", isDirectory: true, isExpanded: true), "folder-source-open")
        XCTAssertEqual(catalog.resolve("empty", isDirectory: true), "default-folder")
        XCTAssertEqual(catalog.resolve("empty", isDirectory: true, isExpanded: true), "default-folder-open")
    }

    func testEveryCanonicalArtworkHasBothRetinaModes() throws {
        for name in FabricatorFileIconAssets.catalog.names {
            for scheme in ["light", "dark"] {
                let url = try XCTUnwrap(FabricatorFileIconAssets.bundle.url(forResource: "fabricator-files-\(scheme)-\(name)@3x", withExtension: "png"))
                let data = try Data(contentsOf: url)
                XCTAssertEqual(Array(data.prefix(8)), [137, 80, 78, 71, 13, 10, 26, 10])
                XCTAssertEqual(Array(data[16..<24]), [0, 0, 0, 48, 0, 0, 0, 48])
            }
        }
    }

    @MainActor
    func testArtworkDecodesForDirectSwiftUIRendering() {
        let image = FabricatorFileIconAssets.image("file-react-typescript", scheme: "light")
        XCTAssertEqual(image.width, 48)
        XCTAssertEqual(image.height, 48)
    }
}
