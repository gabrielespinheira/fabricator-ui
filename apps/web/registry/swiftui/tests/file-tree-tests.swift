import XCTest
@testable import FabricatorUI

final class FileTreeTests: XCTestCase {
    func testEmptyDirectoriesStayDirectoriesAfterTheirLastChildIsRemoved() {
        XCTAssertFalse(FabricatorFileNode(id: "file", name: "README.md").isDirectory)
        XCTAssertTrue(FabricatorFileNode(id: "empty", name: "empty", children: []).isDirectory)
        var folder = FabricatorFileNode(id: "folder", name: "folder", children: [FabricatorFileNode(id: "child", name: "child.swift")])
        folder.children = []
        XCTAssertTrue(folder.isDirectory)
    }

    func testVisibleRowsKeepParentIdentityAndInheritDisabledState() throws {
        let tree = [FabricatorFileNode(id: "src", name: "src", children: [FabricatorFileNode(id: "child", name: "child.swift")], isDisabled: true)]
        let rows = FabricatorFileNode.flatten(tree, expanded: ["src"])
        let child = try XCTUnwrap(rows.last)
        XCTAssertEqual(child.parentID, "src")
        XCTAssertTrue(child.isDisabled)
        XCTAssertEqual(child.depth, 1)
    }

    func testKeyboardNavigationSkipsDisabledRowsAndUsesTreeRelationships() {
        let rows = FabricatorFileNode.flatten([
            FabricatorFileNode(id: "folder", name: "folder", children: [FabricatorFileNode(id: "child", name: "child.swift")]),
            FabricatorFileNode(id: "disabled", name: "disabled", isDisabled: true),
            FabricatorFileNode(id: "last", name: "last.swift")
        ], expanded: ["folder"])
        XCTAssertEqual(FabricatorFileNode.navigationTarget(rows, from: "folder", direction: .child)?.id, "child")
        XCTAssertEqual(FabricatorFileNode.navigationTarget(rows, from: "child", direction: .parent)?.id, "folder")
        XCTAssertEqual(FabricatorFileNode.navigationTarget(rows, from: "child", direction: .next)?.id, "last")
        XCTAssertEqual(FabricatorFileNode.navigationTarget(rows, from: "folder", direction: .previous)?.id, "folder")
        XCTAssertEqual(FabricatorFileNode.navigationTarget(rows, from: "folder", direction: .last)?.id, "last")
    }

    func testTypeaheadWrapsAndRepeatedCharactersCycleMatchingNames() {
        let rows = FabricatorFileNode.flatten([
            FabricatorFileNode(id: "alpha", name: "alpha.swift"),
            FabricatorFileNode(id: "beta", name: "beta.swift"),
            FabricatorFileNode(id: "atom", name: "atom.swift")
        ], expanded: [])
        XCTAssertEqual(FabricatorFileNode.typeaheadTarget(rows, from: "atom", text: "a")?.id, "alpha")
        XCTAssertEqual(FabricatorFileNode.typeaheadTarget(rows, from: "alpha", text: "aa")?.id, "atom")
        XCTAssertEqual(FabricatorFileNode.typeaheadTarget(rows, from: "alpha", text: "be")?.id, "beta")
        XCTAssertNil(FabricatorFileNode.typeaheadTarget(rows, from: "alpha", text: "missing"))
    }

    func testCollapsingAnAncestorRestoresFocusToThatFolder() {
        let tree = [FabricatorFileNode(id: "src", name: "src", children: [FabricatorFileNode(id: "child", name: "child.swift")])]
        let previous = FabricatorFileNode.flatten(tree, expanded: ["src"])
        let current = FabricatorFileNode.flatten(tree, expanded: [])
        XCTAssertEqual(FabricatorFileNode.restoredFocus(previous, current: current, from: "child", selected: "child"), "src")
        XCTAssertNil(FabricatorFileNode.restoredFocus(previous, current: [], from: "child", selected: "child"))
    }
}
