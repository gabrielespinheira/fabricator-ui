import SwiftUI
import FabricatorUI

enum DocumentDemoData {
    private struct Examples: Decodable { var markdown: String; var code: String; var editor: String }
    private static let examples: Examples = {
        guard let url = Bundle.main.url(forResource: "document-examples", withExtension: "json") else { preconditionFailure("Run the SwiftUI launcher to sync React's document fixtures.") }
        do { return try JSONDecoder().decode(Examples.self, from: Data(contentsOf: url)) }
        catch { preconditionFailure("Invalid document fixture: \(error)") }
    }()
    static var markdown: String { examples.markdown }
    static var code: String { examples.code }
    static var editor: String { examples.editor }
}

struct MarkdownDemo: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 32) {
            FabricatorMarkdown(DocumentDemoData.markdown)
            FabricatorText("Document sizes", role: .heading)
            ForEach(FabricatorDocumentSize.allCases, id: \.self) { size in
                VStack(alignment: .leading, spacing: 12) {
                    FabricatorText("\(size.rawValue) · compact interface", role: .caption)
                    FabricatorRoot(density: .compact) {
                        FabricatorMarkdown("### Readable at every density\n\nDocuments keep their own type size.\n\n4. Review the design\n   - Compare the details\n5. Ship the component\n\n- [x] Shared colors\n- [ ] Review on device", size: size)
                    }
                }
            }
        }.frame(maxWidth: 448, alignment: .leading)
    }
}
struct SyntaxHighlightDemo: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 24) {
            FabricatorSyntaxHighlight(DocumentDemoData.code, filename: "components/ui/badge.tsx", showLineNumbers: true, highlightLines: Set(10...13))
            FabricatorText("Diff and wrapping", role: .heading)
            FabricatorSyntaxHighlight("-const density = \"compact\"\n+const density = \"default\"", language: "diff", filename: "theme.ts", showLineNumbers: true)
            FabricatorSyntaxHighlight("const url = \"https://fabricator-ui.vercel.app/docs/components/base/syntax-highlight\"\nconst isReady = true", language: "typescript", showLineNumbers: true, wrap: true, maximumHeight: 160)
                .accessibilityIdentifier("fabricator-wrapped-code")
            FabricatorText("Scrollable code", role: .heading)
            FabricatorSyntaxHighlight((1...40).map { "const member\($0) = \"member\($0)@fabricator.dev\"" }.joined(separator: "\n"), filename: "members.ts", showLineNumbers: true, maximumHeight: 288)
                .accessibilityIdentifier("fabricator-capped-code")
        }.frame(maxWidth: 672, alignment: .leading)
    }
}
