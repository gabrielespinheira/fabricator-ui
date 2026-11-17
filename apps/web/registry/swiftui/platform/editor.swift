import SwiftUI
import Observation
import OSLog
#if os(iOS)
import UIKit
#else
import AppKit
#endif

public enum FabricatorEditorCommand: Sendable { case bold, italic, code, heading, bullet, quote, link(URL), undo, redo }

@MainActor @Observable public final class FabricatorEditorState {
    @ObservationIgnored let engine: FabricatorEditorEngineAdapter
    @ObservationIgnored var focusNativeView: (() -> Void)?
    @ObservationIgnored var copyText: @MainActor (String) -> Bool = FabricatorClipboard.copy
    public private(set) var snapshot: FabricatorEditorEngineSnapshot
    public private(set) var revision = 0
    public private(set) var error: String?
    public var editedBlock: FabricatorEditorBlock?
    public var isLinkPresented = false
    public var onDocumentChange: ((FabricatorEditorDocument) -> Void)?
    public var document: FabricatorEditorDocument { snapshot.document }
    public var canUndo: Bool { snapshot.canUndo }
    public var canRedo: Bool { snapshot.canRedo }
    public var selectedRange: NSRange { snapshot.selection.map { NSRange(location: $0.start, length: $0.end - $0.start) } ?? NSRange(location: 0, length: 0) }
    public init(_ markdown: String = "") {
        do { let engine = try FabricatorEditorEngineAdapter(markdown: markdown); self.engine = engine; snapshot = engine.snapshot }
        catch { preconditionFailure("Packaged Fabricator editor could not initialize: \(error)") }
    }
    public init(document: FabricatorEditorDocument) throws { engine = try FabricatorEditorEngineAdapter(document: document); snapshot = engine.snapshot }
    public convenience init(document: NSAttributedString) { self.init(document.string) }
    public func serializeMarkdown() throws -> String { try engine.serializeMarkdown() }
    public func select(_ range: NSRange) { perform { try engine.select(from: range.location, to: NSMaxRange(range)) } }
    public func replace(from: Int, to: Int, text: String) { perform { try engine.replace(from: from, to: to, text: text) } }
    public func replaceNativeText(_ text: String, selection: NSRange) { perform { try engine.replaceNativeText(text, selection: selection) } }
    public func paste(_ markdown: String) { perform { try engine.paste(markdown) } }
    public func runCommand(_ id: String, arguments: [String: FabricatorEditorJSON] = [:]) { if id == "link" && arguments.isEmpty { isLinkPresented = true; return }; perform { try engine.runCommand(id, arguments: arguments) }; focusNativeView?() }
    public func apply(_ command: FabricatorEditorCommand) {
        switch command { case .bold: runCommand("bold"); case .italic: runCommand("italic"); case .code: runCommand("code"); case .heading: runCommand("heading-2"); case .bullet: runCommand("bulleted"); case .quote: runCommand("quote"); case .link(let url): runCommand("link", arguments: ["href": .string(url.absoluteString)]); case .undo: runCommand("undo"); case .redo: runCommand("redo") }
    }
    func structuralInput(_ kind: String, range: NSRange) {
        perform {
            try engine.select(from: range.location, to: NSMaxRange(range))
            switch kind { case "split": try engine.split(); case "softBreak": try engine.softBreak(); case "deleteBackward": try engine.deleteBackward(); case "deleteForward": try engine.deleteForward(); default: throw FabricatorEditorEngineError.invalidReply("Unknown native input: \(kind)") }
        }
    }
    func openBlock(at offset: Int, kind: String, isReadOnly: Bool = false) {
        guard !isReadOnly || kind == "code-copy" else { return }
        if kind == "code-copy" { _ = copyCode(at: offset); return }
        guard let index = snapshot.nativeContent.paragraphs.firstIndex(where: { $0.start == offset }), document.blocks.indices.contains(index) else { return }
        let block = document.blocks[index]
        if block.type == "task" { select(NSRange(location: offset, length: 0)); runCommand("toggle-task"); return }
        editedBlock = block
    }
    @discardableResult func copyCode(at offset: Int) -> Bool {
        guard let index = snapshot.nativeContent.paragraphs.firstIndex(where: { $0.start == offset && $0.kind == "code" }), document.blocks.indices.contains(index) else { return false }
        return copyText(document.blocks[index].text)
    }
    func updateBlock(_ block: FabricatorEditorBlock, attributes: [String: FabricatorEditorJSON]) { perform { try engine.setBlock(block.id, attributes: block.attrs.merging(attributes) { _, next in next }) }; editedBlock = nil; focusNativeView?() }
    func updateTable(_ id: String, draft: FabricatorEditorTableDraft) { perform { try engine.updateTable(id, draft: draft) }; editedBlock = nil; focusNativeView?() }
    func perform(_ operation: () throws -> Void) {
        let previous = snapshot.document
        do { try operation(); snapshot = engine.snapshot; revision += 1; error = nil; if previous != snapshot.document { onDocumentChange?(snapshot.document) } }
        catch { self.error = error.localizedDescription; Logger(subsystem: "app.fabricator-ui", category: "editor").error("Native editor transaction failed: \(error.localizedDescription)") }
    }
}

public struct FabricatorEditor: View {
    @Environment(\.fabricatorTheme) private var theme
    @Bindable public var state: FabricatorEditorState
    public var minimumHeight: CGFloat?
    public var maximumHeight: CGFloat?
    public var size: FabricatorDocumentSize
    public var isReadOnly: Bool
    public var placeholder: String
    @State private var link = ""
    @State private var isFocused = false
    public init(_ state: FabricatorEditorState, minimumHeight: CGFloat? = nil, maximumHeight: CGFloat? = nil, size: FabricatorDocumentSize = .default, isReadOnly: Bool = false, placeholder: String = "Start writing…") {
        precondition(minimumHeight.map { $0.isFinite && $0 >= 0 } ?? true, "Editor height must be finite and nonnegative")
        precondition(maximumHeight.map { $0.isFinite && $0 >= (minimumHeight ?? 0) } ?? true, "Editor maximum height must be finite and at least its explicit minimum")
        self.state = state; self.minimumHeight = minimumHeight; self.maximumHeight = maximumHeight; self.size = size; self.isReadOnly = isReadOnly; self.placeholder = placeholder
    }
    public var body: some View {
        VStack(spacing: 0) {
            if !isReadOnly { FabricatorEditorToolbar(state: state); Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1) }
            FabricatorNativeEditor(state: state, theme: theme, isReadOnly: isReadOnly, placeholder: placeholder, size: size, minimumHeight: getEditorMinimumContentHeight(size, theme: theme, override: minimumHeight), maximumHeight: maximumHeight, isFocused: $isFocused)
            if let error = state.error { FabricatorAlert("Editing failed", message: error, variant: .destructive) }
            Rectangle().fill(theme.color("border").opacity(0.6)).frame(height: 1)
            HStack { Spacer(); let words = getEditorWordCount(state.snapshot.flatText); Text(words == 1 ? "1 word" : "\(words) words").monospacedDigit().accessibilityIdentifier("fabricator-editor-word-count") }
                .font(theme.font(theme.text(12))).foregroundStyle(theme.color("muted-foreground"))
                .padding(.horizontal, theme.space(12)).padding(.vertical, theme.space(6))
        }.background(theme.color("card"), in: RoundedRectangle(cornerRadius: theme.radius("xl"))).overlay { RoundedRectangle(cornerRadius: theme.radius("xl")).strokeBorder(isFocused ? theme.color("foreground").opacity(0.25) : theme.color("border").opacity(0.7), lineWidth: 1).allowsHitTesting(false) }.clipShape(RoundedRectangle(cornerRadius: theme.radius("xl")))
            .animation(theme.animation("feedback"), value: isFocused)
            .accessibilityElement(children: .contain).accessibilityValue(isFocused ? "Editing" : "")
            .popover(isPresented: $state.isLinkPresented) { VStack(alignment: .leading, spacing: 12) { FabricatorField("Link URL") { FabricatorInput("https://example.com", text: $link) }; FabricatorButton("Apply link") { guard let url = URL(string: link), ["https", "http", "mailto"].contains(url.scheme?.lowercased() ?? "") else { return }; state.apply(.link(url)); state.isLinkPresented = false } }.padding(16).frame(width: 300).presentationCompactAdaptation(.popover) }
            .sheet(item: $state.editedBlock) { block in FabricatorEditorBlockSheet(state: state, block: block) }
    }
}

private struct FabricatorEditorBlockSheet: View {
    @Bindable var state: FabricatorEditorState
    var block: FabricatorEditorBlock
    @State private var table: FabricatorEditorTableDraft?
    @State private var language = ""
    @State private var source = ""
    @State private var alt = ""
    var body: some View {
        FabricatorDialogContent("Edit \(block.type)", onDismiss: { state.editedBlock = nil }) {
            if block.type == "table", table != nil {
                ScrollView([.horizontal, .vertical]) { VStack(spacing: 4) { ForEach(0..<(table?.cells.count ?? 0), id: \.self) { row in HStack(spacing: 4) { ForEach(0..<(table?.cells[row].count ?? 0), id: \.self) { column in FabricatorInput(row == 0 ? "Header" : "Cell", text: Binding(get: { table?.cells[row][column] ?? "" }, set: { table?.cells[row][column] = $0 })).frame(width: 140) } } } } }
                HStack { FabricatorButton("Add row", icon: "plus", variant: .outline) { let count = table?.cells.first?.count ?? 1; table?.cells.append(Array(repeating: "", count: count)) }; FabricatorButton("Add column", icon: "plus", variant: .outline) { if var draft = table { for row in draft.cells.indices { draft.cells[row].append("") }; draft.align.append(nil); table = draft } }; Spacer(); FabricatorButton("Save table") { if let table { state.updateTable(block.id, draft: table) } } }
            } else if block.type == "image" {
                FabricatorField("Image URL") { FabricatorInput("https://example.com/image.png", text: $source) }
                FabricatorField("Alternative text") { FabricatorInput("Describe the image", text: $alt) }
                if let url = URL(string: source), ["https", "http", "file"].contains(url.scheme ?? "") { AsyncImage(url: url) { image in image.resizable().scaledToFit() } placeholder: { FabricatorSpinner() }.frame(maxHeight: 240) }
                FabricatorButton("Save image") { state.updateBlock(block, attributes: ["src": .string(source), "alt": .string(alt)]) }
            } else if block.type == "code" {
                FabricatorField("Language") { FabricatorInput("swift", text: $language) }
                FabricatorTextarea("Code", text: $source)
                FabricatorButton("Save code") { state.perform { try state.engine.updateCode(block.id, text: source, language: language) }; state.editedBlock = nil }
            } else {
                FabricatorText(block.type.capitalized, role: .heading)
                FabricatorText(block.text)
                FabricatorButton("Close", variant: .outline) { state.editedBlock = nil }
            }
        }.frame(minWidth: 320, idealWidth: 640).onAppear { source = block.type == "image" ? block.attrs["src"]?.string ?? "" : block.text; alt = block.attrs["alt"]?.string ?? ""; language = block.attrs["language"]?.string ?? ""; if block.type == "table" { state.perform { table = try state.engine.tableDraft(for: block.id) } } }
    }
}
