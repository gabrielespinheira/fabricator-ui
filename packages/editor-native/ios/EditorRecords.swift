import ExpoModulesCore

// The props as JS sends them. Converted once into the plain types in
// EditorDocument.swift and EditorTheme.swift, which the view works with.

enum EditorParagraphKind: String, Enumerable {
  case paragraph
  case heading
  case bulleted
  case numbered
  case task
  case quote
  case code
  case divider
  case image
  case table
  case raw
}

struct EditorSpanRecord: Record {
  @Field var start: Int = 0
  @Field var end: Int = 0
  @Field var bold: Bool = false
  @Field var italic: Bool = false
  @Field var strike: Bool = false
  @Field var code: Bool = false
  @Field var link: String?
  @Field var raw: Bool = false
  /// A code block's syntax colour: one of Syntax Highlight's token kinds.
  @Field var token: String?
}

struct EditorTableRecord: Record {
  /// Each cell's plain text, row 0 the header.
  @Field var rows: [[String]] = []
  /// "left", "center", "right" or null, per column.
  @Field var align: [String?] = []
}

struct EditorParagraphRecord: Record {
  @Field var start: Int = 0
  @Field var end: Int = 0
  @Field var kind: EditorParagraphKind = .paragraph
  @Field var level: Int = 1
  @Field var indent: Int = 0
  @Field var marker: String?
  @Field var checked: Bool = false
  @Field var table: EditorTableRecord?
  /// What a code block shows in its top-end corner: its language's name.
  @Field var label: String?
}

struct EditorContentRecord: Record {
  @Field var version: Int = 0
  @Field var text: String = ""
  @Field var spans: [EditorSpanRecord] = []
  @Field var paragraphs: [EditorParagraphRecord] = []
}

struct EditorColorsRecord: Record {
  @Field var foreground: String = "#000000"
  @Field var muted: String = "#737373"
  @Field var link: String = "#2563EB"
  @Field var codeBackground: String = "#F4F4F5"
  @Field var quoteBar: String = "#E4E4E7"
  @Field var border: String = "#E4E4E7"
  @Field var caret: String = "#2563EB"
  @Field var selection: String = "#2563EB33"
  @Field var placeholder: String = "#A1A1AA"
  @Field var checkbox: String = "#2563EB"
  /// The table's header row; the code background when missing.
  @Field var tableHeader: String?
  /// Inline code's chip; the code background when missing.
  @Field var inlineCode: String?
  /// The check in a done task's box; white or black on the box when missing.
  @Field var checkboxForeground: String?
  /// An open task's outline; the foreground at 25% when missing.
  @Field var checkboxBorder: String?
}

struct EditorThemeRecord: Record {
  @Field var fontFamily: String = ""
  @Field var fontFamilyMedium: String = ""
  @Field var fontFamilySemibold: String = ""
  @Field var fontFamilyMono: String = ""
  @Field var fontSize: Double = 16
  @Field var lineHeight: Double = 1.65
  @Field var headingSizes: [Double] = []
  @Field var paragraphSpacing: Double = 12
  @Field var indentWidth: Double = 24
  @Field var colors: EditorColorsRecord = EditorColorsRecord()
  /// Each syntax token kind's colour, "#RRGGBB" or "#RRGGBBAA".
  @Field var syntax: [String: String] = [:]
}

struct EditorSelectionRecord: Record {
  @Field var start: Int = 0
  @Field var end: Int = 0
  @Field var version: Int = 0
}

struct EditorKeyCommandRecord: Record {
  @Field var id: String = ""
  @Field var input: String = ""
  @Field var modifiers: [String] = []
}
