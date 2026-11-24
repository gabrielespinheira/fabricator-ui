import SwiftUI
import FabricatorUI

struct EditorDemo: View {
    @State private var state: FabricatorEditorState?
    @State private var shortState: FabricatorEditorState?
    @State private var codeState: FabricatorEditorState?
    var body: some View {
        VStack(alignment: .leading, spacing: 32) {
            Group {
                if let state { FabricatorEditor(state, maximumHeight: 512).accessibilityIdentifier("fabricator-editor-primary") }
                else { FabricatorSpinner().frame(height: 380) }
            }
            if let shortState {
                VStack(alignment: .leading, spacing: 16) {
                    FabricatorText("Short document", role: .heading)
                    FabricatorEditor(shortState).accessibilityIdentifier("fabricator-editor-short")
                }
            }
            EditorSizeDemo()
            if let codeState {
                VStack(alignment: .leading, spacing: 16) {
                    FabricatorText("Code token formatting", role: .heading)
                    FabricatorEditor(codeState, maximumHeight: 360, isReadOnly: true).accessibilityIdentifier("fabricator-editor-code-tokens")
                }
            }
        }.frame(maxWidth: 672, alignment: .leading)
            .task {
                if state == nil {
                    state = FabricatorEditorState(DocumentDemoData.editor); shortState = FabricatorEditorState()
                    codeState = FabricatorEditorState("```md\n# Highlighted Markdown\n**Strong text** and *real italic*\n[Fabricator UI](https://fabricator-ui.vercel.app)\n```")
                }
            }
    }
}

private struct EditorSizeDemo: View {
    @Environment(\.fabricatorTheme) private var theme
    @State private var state: FabricatorEditorState?
    @State private var size = FabricatorDocumentSize.sm
    private var compactTheme: FabricatorTheme { var compact = theme; compact.density = .compact; return compact }
    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            FabricatorText("Read-only document sizes", role: .heading)
            FabricatorSelect("Document size", options: FabricatorDocumentSize.allCases.map(\.rawValue), selection: Binding(get: { size.rawValue }, set: { value in
                guard let next = FabricatorDocumentSize(rawValue: value) else { preconditionFailure("Unknown document size: \(value)") }
                size = next
            })).frame(maxWidth: 240)
            if let state {
                FabricatorEditor(state, minimumHeight: 160, maximumHeight: 300, size: size, isReadOnly: true)
                    .environment(\.fabricatorTheme, compactTheme).accessibilityIdentifier("fabricator-editor-readonly")
            }
        }.task {
            if state == nil { state = FabricatorEditorState("### Readable at every density\n\nDocument text keeps its size in a compact interface, with **strong**, *italic* and `inline code`.\n\n- [x] Shared design tokens\n- [ ] Review on device\n\n```ts\n// Code keeps its own type role\nconst isReady = true\n```") }
        }
    }
}
