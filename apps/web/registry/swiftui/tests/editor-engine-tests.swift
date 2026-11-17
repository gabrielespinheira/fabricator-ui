import XCTest
@testable import FabricatorUI

final class EditorEngineTests: XCTestCase {
    @MainActor
    func testEditorStartsUnselectedAndActivatesHeadingOnlyAfterNativeSelection() throws {
        let markdown = FabricatorEditorState("# Native heading")
        let document = try FabricatorEditorState(document: markdown.document)
        for state in [markdown, document] {
            XCTAssertNil(state.snapshot.selection)
            XCTAssertNil(state.snapshot.headingLevel)
            XCTAssertFalse(try XCTUnwrap(state.snapshot.commands.first { $0.id == "heading-1" }).isActive)
            state.select(NSRange(location: 0, length: 0))
            XCTAssertEqual(state.snapshot.headingLevel, 1)
            XCTAssertTrue(try XCTUnwrap(state.snapshot.commands.first { $0.id == "heading-1" }).isActive)
        }
    }

    @MainActor
    func testEditorDefaultMinimumIsAutomaticAndExplicitMinimumIsPreserved() {
        let state = FabricatorEditorState("Short note")
        XCTAssertNil(FabricatorEditor(state).minimumHeight)
        XCTAssertEqual(FabricatorEditor(state, minimumHeight: 80).minimumHeight, 80)
    }

    func testEditorMinimumTracksSixDocumentLinesAndDynamicTypeAcrossDensities() {
        for (size, height) in [(FabricatorDocumentSize.sm, 134.4), (.default, 158.4), (.lg, 183.6)] {
            for density in [FabricatorDensity.compact, .regular, .spacious] {
                var theme = FabricatorTheme(density: density)
                XCTAssertEqual(getEditorMinimumContentHeight(size, theme: theme, override: nil), height, accuracy: 0.001)
                theme.fontScale = 2
                let minimum = getEditorMinimumContentHeight(size, theme: theme, override: nil)
                XCTAssertEqual(minimum, height * 2, accuracy: 0.001)
                XCTAssertEqual(getEditorMinimumContentHeight(size, theme: theme, override: 80), 80)
                XCTAssertEqual(getEditorContentHeight(30, minimum: minimum, maximum: 200), minimum)
            }
        }
        XCTAssertEqual(getEditorContentHeight(400, minimum: 80, maximum: 200), 200)
        XCTAssertEqual(getEditorContentHeight(120, minimum: 80, maximum: nil), 120)
    }

    @MainActor
    func testCodeCopyReportsClipboardFailureAndKeepsSelectionAndHistory() throws {
        let state = FabricatorEditorState("Keep this selection\n\n```swift\nlet value = \"👩🏽‍💻\"\nprint(value)\n```")
        state.select(NSRange(location: 0, length: 4))
        let original = state.document
        let code = try XCTUnwrap(state.snapshot.nativeContent.paragraphs.first { $0.kind == "code" })
        var copied: String?
        state.copyText = { copied = $0; return false }
        XCTAssertFalse(state.copyCode(at: code.start))
        XCTAssertEqual(copied, "let value = \"👩🏽‍💻\"\nprint(value)")
        state.copyText = { copied = $0; return true }
        XCTAssertTrue(state.copyCode(at: code.start))
        XCTAssertFalse(state.copyCode(at: 0))
        XCTAssertEqual(state.selectedRange, NSRange(location: 0, length: 4))
        XCTAssertEqual(state.document, original)
        XCTAssertFalse(state.canUndo)
        XCTAssertNil(state.editedBlock)
    }

    @MainActor
    func testReadOnlyBlocksKeepTasksAndSheetsUnchangedWhileCopyStillWorks() throws {
        let state = FabricatorEditorState("- [ ] Review\n\n```ts\nconst value = 1\n```")
        let original = state.document
        state.openBlock(at: 0, kind: "task", isReadOnly: true)
        XCTAssertEqual(state.document, original)
        XCTAssertNil(state.editedBlock)
        let code = try XCTUnwrap(state.snapshot.nativeContent.paragraphs.first { $0.kind == "code" })
        state.openBlock(at: code.start, kind: "code-language", isReadOnly: true)
        XCTAssertNil(state.editedBlock)
        var copied: String?
        state.copyText = { copied = $0; return true }
        state.openBlock(at: code.start, kind: "code-copy", isReadOnly: true)
        XCTAssertEqual(copied, "const value = 1")
        XCTAssertEqual(state.document, original)
        state.openBlock(at: 0, kind: "task", isReadOnly: false)
        XCTAssertEqual(state.document.blocks[0].attrs["checked"], .boolean(true))
    }
    func testEditorControlsHaveCanonicalCommandsAndDrawableIcons() async throws {
        let commands = try await MainActor.run { try FabricatorEditorEngineAdapter().snapshot.commands.map(\.id) }
        for id in Set(FabricatorEditorCommandLayout.groups.flatMap { $0 } + FabricatorEditorCommandLayout.caretCommands + FabricatorEditorCommandLayout.selectionCommands) {
            XCTAssertTrue(commands.contains(id), "Missing editor command: \(id)")
            let icon = FabricatorEditorCommandLayout.getIcon(id)
            XCTAssertTrue(FabricatorContract.shared.icons.contains { $0.name == icon && !$0.node.isEmpty }, "Missing editor artwork: \(id) → \(icon)")
        }
    }
    func testWordCountMatchesReactForUnicodePunctuationAndObjectParagraphs() {
        XCTAssertEqual(getEditorWordCount("Olá 👋 42 世界\u{2028}again\u{FFFC}next --- +"), 5)
        XCTAssertEqual(getEditorWordCount("\u{FFFC}\n👩🏽‍💻 — ..."), 0)
        XCTAssertEqual(getEditorWordCount("one"), 1)
    }
    func testCanonicalMarkdownRoundTripsFrontmatterTablesAndRawSource() async throws {
        let markdown = "---\ntitle: Native editor\n---\n\n# Fabricator\n\n- [x] **Ship native UI**\n  - Keep nesting\n\n| Name | Status |\n| :--- | ---: |\n| SwiftUI | Ready |\n\n<custom data-mode=\"native\">Keep this verbatim</custom>\n"
        let result = try await MainActor.run { let engine = try FabricatorEditorEngineAdapter(markdown: markdown); return try engine.serializeMarkdown() }
        XCTAssertEqual(result, markdown)
    }

    func testNativeSelectionCommandsAndHistoryUseCanonicalTransactions() async throws {
        let values = try await MainActor.run {
            let engine = try FabricatorEditorEngineAdapter(markdown: "Hello world")
            let originalID = engine.snapshot.document.blocks[0].id
            try engine.select(from: 0, to: 5)
            try engine.runCommand("bold")
            let bold = try engine.serializeMarkdown()
            let hasUndo = engine.snapshot.canUndo
            try engine.runCommand("undo")
            let undone = try engine.serializeMarkdown()
            try engine.runCommand("redo")
            return (bold, undone, try engine.serializeMarkdown(), hasUndo, originalID == engine.snapshot.document.blocks[0].id)
        }
        XCTAssertEqual(values.0, "**Hello** world")
        XCTAssertEqual(values.1, "Hello world")
        XCTAssertEqual(values.2, "**Hello** world")
        XCTAssertTrue(values.3)
        XCTAssertTrue(values.4)
    }

    func testPasteKeepsGfmTableAsStructuredBlockAndNativeProjection() async throws {
        let result = try await MainActor.run {
            let engine = try FabricatorEditorEngineAdapter(markdown: "")
            try engine.select(from: 0, to: 0)
            try engine.paste("| Language | UI |\n| --- | --- |\n| Swift | Native |")
            return engine.snapshot
        }
        XCTAssertTrue(result.document.blocks.contains { $0.type == "table" })
        XCTAssertTrue(result.nativeContent.paragraphs.contains { $0.kind == "table" && $0.table?.rows.count == 2 })
        XCTAssertTrue(result.flatText.contains("\u{FFFC}"))
    }

    func testCanonicalInputRulesCreateHeadingAndKeepUnicodeOffsetsSafe() async throws {
        let result = try await MainActor.run {
            let engine = try FabricatorEditorEngineAdapter(markdown: "")
            try engine.select(from: 0, to: 0)
            try engine.replace(from: 0, to: 0, text: "# ")
            try engine.replace(from: 0, to: 0, text: "Native 👩🏽‍💻")
            return (engine.snapshot.document.blocks[0].type, try engine.serializeMarkdown())
        }
        XCTAssertEqual(result.0, "heading")
        XCTAssertEqual(result.1, "# Native 👩🏽‍💻")
    }

    func testLargeDocumentKeepsBlocksAndUnicodeSafeProjectionDuringRepeatedEdits() async throws {
        let result = try await MainActor.run {
            let markdown = (1...100).map { "Paragraph \($0): Fabricator native editor." }.joined(separator: "\n\n")
            let clock = ContinuousClock(), start = clock.now
            let engine = try FabricatorEditorEngineAdapter(markdown: markdown)
            let initialization = start.duration(to: clock.now)
            let originalIDs = engine.snapshot.document.blocks.map(\.id)
            var durations: [Double] = []
            for _ in 0..<20 {
                let offset = engine.snapshot.flatText.utf16.count
                try engine.replace(from: offset, to: offset, text: " 👩🏽‍💻")
                let duration = engine.lastCallDuration.components
                durations.append(Double(duration.seconds) * 1000 + Double(duration.attoseconds) / 1e15)
            }
            let sorted = durations.sorted()
            let cold = initialization.components
            let profile = "DEBUG macOS/Apple Silicon, 100 paragraphs; engine+document initialization \(Double(cold.seconds) * 1000 + Double(cold.attoseconds) / 1e15) ms; 20 JSON bridge/transaction/projection calls median \(sorted[sorted.count / 2]) ms, maximum \(sorted.last ?? 0) ms; script \(engine.scriptByteCount) bytes. Excludes native view layout and rendering."
            return (originalIDs == engine.snapshot.document.blocks.map(\.id), try engine.serializeMarkdown(), profile)
        }
        XCTAssertTrue(result.0)
        XCTAssertTrue(result.1.hasSuffix(String(repeating: " 👩🏽‍💻", count: 20)))
        print("FABRICATOR_EDITOR_PROFILE: \(result.2)")
    }
}
