#if os(iOS)
import SwiftUI
import UIKit

@MainActor
struct FabricatorEditorUIKitPresentation {
    private static let themes: [String: [String: EditorThemeRecord]] = readEditorThemes()
    var record: EditorThemeRecord
    var codeStyle: EditorCodeStyle
    var insets: UIEdgeInsets
    let resolveFont: EditorFontResolver = { request in
        let weights = FabricatorContract.shared.typography.weights
        let weight = request.weight == .semibold ? weights.semibold : request.weight == .medium ? weights.medium : 400
        let font = request.isMonospace
            ? FabricatorFontAdapter.makeMonospaceFont(size: request.size, weight: weight, isItalic: request.isItalic)
            : FabricatorFontAdapter.makeFont(size: request.size, weight: weight, isItalic: request.isItalic)
        return font as UIFont
    }
    var resolvedTheme: EditorTheme { EditorTheme(record: record, fontResolver: resolveFont, codeStyle: codeStyle) }
    init(theme: FabricatorTheme, size: FabricatorDocumentSize) {
        let mode = theme.colorScheme == .dark ? "dark" : "light"
        guard var record = Self.themes[mode]?[size.rawValue] else { preconditionFailure("Missing editor theme: \(mode)/\(size.rawValue)") }
        record.fontSize *= theme.fontScale
        record.headingSizes = record.headingSizes.map { $0 * theme.fontScale }
        record.paragraphSpacing *= theme.fontScale
        record.indentWidth *= theme.fontScale
        record.syntax = FabricatorSyntaxStyle.colorRoles.mapValues { role in
            var red: CGFloat = 0, green: CGFloat = 0, blue: CGFloat = 0, alpha: CGFloat = 0
            guard UIColor(theme.color(role)).getRed(&red, green: &green, blue: &blue, alpha: &alpha) else { preconditionFailure("Editor color must resolve in sRGB: \(role)") }
            return String(format: "#%02X%02X%02X%02X", Int((red * 255).rounded()), Int((green * 255).rounded()), Int((blue * 255).rounded()), Int((alpha * 255).rounded()))
        }
        self.record = record
        insets = UIEdgeInsets(top: record.fontSize * 0.75, left: record.fontSize, bottom: record.fontSize * 0.75, right: record.fontSize)
        codeStyle = EditorCodeStyle(
            fontSize: theme.text(14) * theme.fontScale, labelSize: theme.text(12) * theme.fontScale,
            headerHeight: theme.minimumControlHeight(36, textStep: 12), paddingX: theme.space(16), paddingY: theme.space(12),
            headerInset: theme.space(12), iconSize: theme.icon(14), chevronGap: theme.space(4), radius: theme.radius("xl"))
    }
}
#endif
