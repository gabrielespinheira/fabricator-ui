import Foundation

enum FabricatorEditorCommandLayout {
    static let groups = [
        ["heading-1", "heading-2", "heading-3", "heading-4", "heading-5", "heading-6"],
        ["bold", "italic", "strike", "code", "link"], ["bulleted", "numbered", "task"],
        ["indent", "outdent"], ["quote", "code-block", "divider", "table"], ["undo", "redo"]
    ]
    static let caretCommands = ["heading-1", "heading-2", "bulleted", "numbered", "task", "quote", "code-block", "table", "indent", "outdent", "undo", "redo"]
    static let selectionCommands = ["bold", "italic", "strike", "code", "link"]
    static func getIcon(_ id: String) -> String {
        switch id {
        case "bold": "letter-b"
        case "strike": "strikethrough"
        case "bulleted": "list"
        case "numbered": "list-ordered"
        case "task": "list-todo"
        case "indent": "list-indent-increase"
        case "outdent": "list-indent-decrease"
        case "code-block": "square-code"
        case "divider": "minus"
        case "table": "table-2"
        case "undo": "undo-2"
        case "redo": "redo-2"
        default: id
        }
    }
}

func getEditorWordCount(_ text: String) -> Int {
    text.split { $0.isWhitespace || $0 == "\u{FFFC}" }.filter { word in
        word.unicodeScalars.contains { scalar in
            switch scalar.properties.generalCategory {
            case .uppercaseLetter, .lowercaseLetter, .titlecaseLetter, .modifierLetter, .otherLetter, .decimalNumber, .letterNumber, .otherNumber: true
            default: false
            }
        }
    }.count
}

struct FabricatorEditorTypography: Decodable, Sendable {
    var fontSize: CGFloat
    var lineHeight: CGFloat
    var headingSizes: [CGFloat]
    var paragraphSpacing: CGFloat
    var indentWidth: CGFloat
    static let values: [String: [String: Self]] = readEditorThemes()
}

func getEditorTypography(_ size: FabricatorDocumentSize, theme: FabricatorTheme) -> FabricatorEditorTypography {
    guard let type = FabricatorEditorTypography.values[theme.colorScheme == .dark ? "dark" : "light"]?[size.rawValue] else { preconditionFailure("Canonical editor typography is missing: \(size.rawValue)") }
    return type
}

func getEditorMinimumContentHeight(_ size: FabricatorDocumentSize, theme: FabricatorTheme, override: CGFloat?) -> CGFloat {
    if let override { return override }
    let type = getEditorTypography(size, theme: theme)
    return type.fontSize * type.lineHeight * 6 * theme.fontScale
}

func getEditorContentHeight(_ height: CGFloat, minimum: CGFloat, maximum: CGFloat?) -> CGFloat {
    // As in CSS, a minimum that grows past the maximum still wins.
    max(minimum, min(maximum ?? .infinity, height))
}

func readEditorThemes<Record: Decodable>() -> [String: [String: Record]] {
    #if SWIFT_PACKAGE
    let bundle = Bundle.module
    #else
    let bundle = Bundle.main
    #endif
    guard let url = bundle.url(forResource: "editor-themes", withExtension: "json") else { preconditionFailure("Canonical editor themes are missing") }
    do { return try JSONDecoder().decode([String: [String: Record]].self, from: Data(contentsOf: url)) }
    catch { preconditionFailure("Invalid canonical editor themes: \(error)") }
}
