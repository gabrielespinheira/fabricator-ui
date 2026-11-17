import SwiftUI
import CoreText
import OSLog

struct FabricatorDocumentFailure: View {
    var message: String
    var body: some View { FabricatorAlert("Unable to render document", message: message, variant: .destructive, icon: "alert-triangle") }
    static func log(_ error: Error, component: String) { Logger(subsystem: "app.fabricator-ui", category: "documents").error("\(component, privacy: .public) engine failed: \(error.localizedDescription)") }
}

@MainActor func getDocumentTypography(_ size: FabricatorDocumentSize) -> FabricatorDocumentTypography {
    guard let type = FabricatorDocumentEngineAdapter.typography[size.rawValue] else { preconditionFailure("Missing document size: \(size)") }
    return type
}

struct FabricatorDocumentText: View {
    @Environment(\.fabricatorTheme) private var theme
    var runs: [FabricatorDocumentRun]
    var size: CGFloat
    var weight: Double = 400
    var lineHeight: CGFloat = 1.65
    var isMuted = false
    var isStruck = false
    private var attributed: AttributedString {
        runs.reduce(into: AttributedString()) { output, run in
            let marks = Set(run.marks.map(\.type))
            let isCode = run.isRaw || marks.contains("code")
            let pointSize = size * theme.fontScale * (isCode ? 0.875 : 1)
            let fontWeight = marks.contains("bold") ? FabricatorContract.shared.typography.weights.semibold : weight
            let isItalic = marks.contains("italic")
            var value = AttributedString(run.text)
            value.font = Font(isCode ? FabricatorFontAdapter.makeMonospaceFont(size: pointSize, weight: fontWeight, isItalic: isItalic) : FabricatorFontAdapter.makeFont(size: pointSize, weight: fontWeight, isItalic: isItalic))
            value.foregroundColor = theme.color(isMuted || run.isRaw ? "muted-foreground" : "foreground")
            if marks.contains("code") { value.backgroundColor = theme.color("hover") }
            if marks.contains("strike") || isStruck { value.strikethroughStyle = Text.LineStyle(pattern: .solid, color: isStruck && !marks.contains("strike") ? theme.color("muted-foreground") : theme.color("foreground").opacity(0.5)) }
            if let link = run.marks.first(where: { $0.type == "link" })?.attributes["href"], let url = URL(string: link) {
                value.link = url
                value.foregroundColor = theme.color("primary-text")
                value.underlineStyle = Text.LineStyle(pattern: .solid, color: theme.color("primary-text").opacity(0.35))
            }
            output.append(value)
        }
    }
    var body: some View { Text(attributed).modifier(FabricatorTextMetrics(size: size, lineHeight: lineHeight)).fixedSize(horizontal: false, vertical: true).textSelection(.enabled).tint(theme.color("primary-text")) }
}

func getSyntaxText(_ tokens: [FabricatorSyntaxToken], theme: FabricatorTheme, size: CGFloat) -> AttributedString {
    tokens.reduce(into: AttributedString()) { output, token in
        let name = FabricatorSyntaxStyle.getColorRole(token.kind.rawValue)
        var value = AttributedString(token.content)
        let weight = token.isStrong || token.kind == .heading ? FabricatorContract.shared.typography.weights.semibold : 400
        value.font = Font(FabricatorFontAdapter.makeMonospaceFont(size: size, weight: weight, isItalic: token.isEmphasis || token.kind == .comment))
        value.foregroundColor = theme.color(name)
        if token.kind == .link { value.underlineStyle = Text.LineStyle(pattern: .solid) }
        output.append(value)
    }
}
