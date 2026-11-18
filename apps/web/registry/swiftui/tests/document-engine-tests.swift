import XCTest
import CoreText
@testable import FabricatorUI

final class DocumentEngineTests: XCTestCase {
    func testCodeUsesTheWebMonospaceFamilyAndVariableWeight() {
        let font = FabricatorFontAdapter.makeMonospaceFont(size: 14, weight: 550)
        XCTAssertEqual(CTFontCopyFamilyName(font) as String, "Geist Mono")
        XCTAssertEqual(FabricatorFontAdapter.measureTextWidth("iiii", font: font), FabricatorFontAdapter.measureTextWidth("WWWW", font: font))
        let variation = CTFontCopyVariation(font) as? [NSNumber: NSNumber]
        XCTAssertEqual(variation?[NSNumber(value: 0x77676874)]?.doubleValue, 550)
    }
    @MainActor
    func testCanonicalMarkdownKeepsNestedListsTasksAndRichTableCells() throws {
        let engine = try FabricatorDocumentEngineAdapter()
        let document = try engine.markdown("## Getting started\n\n4. First\n   - Nested\n5. Second\n\n- [x] Shipped\n- [ ] Review\n\n| Syntax | Result |\n| :--- | ---: |\n| `code` | **Bold** |")
        guard case .heading(let level, let runs) = document.nodes[0].content else { return XCTFail("Expected a heading") }
        XCTAssertEqual(level, 2)
        XCTAssertEqual(runs.map(\.text).joined(), "Getting started")
        guard case .list(let list) = document.nodes[1].content else { return XCTFail("Expected a numbered list") }
        XCTAssertTrue(list.isOrdered)
        XCTAssertEqual(list.start, 4)
        XCTAssertEqual(list.items[0].children.count, 1)
        guard case .list(let tasks) = document.nodes[2].content else { return XCTFail("Expected tasks") }
        XCTAssertEqual(tasks.items.map(\.isChecked), [true, false])
        guard case .table(let table) = document.nodes[3].content else { return XCTFail("Expected a GFM table") }
        XCTAssertEqual(table.align, [.left, .right])
        XCTAssertEqual(table.rows[1][0][0].marks.first?.type, "code")
        XCTAssertEqual(table.rows[1][1][0].marks.first?.type, "bold")
    }

    @MainActor
    func testCanonicalInlineMarksKeepUnicodeAndLinks() throws {
        let document = try FabricatorDocumentEngineAdapter().markdown("**Olá 👋** and [Fabricator](https://example.com) with ~~old~~ text.")
        guard case .paragraph(let runs) = document.nodes[0].content else { return XCTFail("Expected a paragraph") }
        XCTAssertEqual(runs.map(\.text).joined(), "Olá 👋 and Fabricator with old text.")
        XCTAssertTrue(runs.contains { $0.text == "Olá 👋" && $0.marks.contains { $0.type == "bold" } })
        XCTAssertEqual(runs.first { $0.text == "Fabricator" }?.marks.first?.attributes["href"], "https://example.com")
        XCTAssertTrue(runs.contains { $0.text == "old" && $0.marks.contains { $0.type == "strike" } })
    }

    @MainActor
    func testCodeFencesKeepMetadataAndUnsupportedSourceStaysVisible() throws {
        let document = try FabricatorDocumentEngineAdapter().markdown("```tsx title=\"app.tsx\"\nexport const title = \"Hello\"\n```\n\n<div>Raw HTML</div>")
        guard case .code(let code) = document.nodes[0].content else { return XCTFail("Expected fenced code") }
        XCTAssertEqual(code.language, "tsx")
        XCTAssertEqual(code.filename, "app.tsx")
        XCTAssertEqual(code.source, "export const title = \"Hello\"")
        guard case .raw(let source) = document.nodes[1].content else { return XCTFail("Unsupported HTML must stay visible") }
        XCTAssertTrue(source.contains("<div>Raw HTML</div>"))
    }

    @MainActor
    func testCanonicalSyntaxDoesNotRecolorKeywordsInsideStringsAndComments() throws {
        let source = "const label = \"// let 42\"\n// return 17\nexport const App = () => <Button active />"
        let document = try FabricatorDocumentEngineAdapter().syntax(source, filename: "app.tsx")
        XCTAssertEqual(document.language, "tsx")
        XCTAssertEqual(document.label, "TSX")
        XCTAssertEqual(document.lines.map { $0.tokens.map(\.content).joined() }.joined(separator: "\n"), source)
        XCTAssertTrue(document.lines[0].tokens.contains { $0.kind == .string && $0.content.contains("// let 42") })
        XCTAssertTrue(document.lines[1].tokens.allSatisfy { $0.kind == .comment })
        XCTAssertTrue(document.lines[2].tokens.contains { $0.kind == .type && $0.content.contains("Button") })
    }

    @MainActor
    func testDiffsKeepLineMeaningAndUnknownLanguagesKeepTheirSource() throws {
        let engine = try FabricatorDocumentEngineAdapter()
        let diff = try engine.syntax("-const value = 1\n+const value = 2", language: "diff", filename: "app.ts")
        XCTAssertEqual(diff.lines.map(\.diff), [.deleted, .inserted])
        let source = "let value = 1\n"
        let plain = try engine.syntax(source, language: "unknown-grammar")
        XCTAssertEqual(plain.lines.map { $0.tokens.map(\.content).joined() }.joined(separator: "\n"), String(source.dropLast()))
        XCTAssertTrue(plain.lines.flatMap(\.tokens).allSatisfy { $0.kind == .plain })
    }
}
