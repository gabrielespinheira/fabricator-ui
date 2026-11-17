import UIKit

struct EditorFontRequest {
  var size: CGFloat
  var weight: UIFont.Weight
  var isMonospace: Bool
  var isItalic: Bool
}

typealias EditorFontResolver = @Sendable (EditorFontRequest) -> UIFont

struct EditorCodeStyle {
  var fontSize: CGFloat
  var labelSize: CGFloat
  var headerHeight: CGFloat
  var paddingX: CGFloat
  var paddingY: CGFloat
  var headerInset: CGFloat
  var iconSize: CGFloat
  var chevronGap: CGFloat
  var radius: CGFloat
}

/// The theme with its fonts and colours resolved, plus the derived sizes the
/// styler and the layout fragments share.
struct EditorTheme {
  let fontSize: CGFloat
  let lineHeight: CGFloat
  let headingSizes: [CGFloat]
  let paragraphSpacing: CGFloat
  let indentWidth: CGFloat

  let regularName: String
  let mediumName: String
  let semiboldName: String
  let monoName: String
  let fontResolver: EditorFontResolver?
  let codeStyle: EditorCodeStyle

  let foreground: UIColor
  let muted: UIColor
  let link: UIColor
  let codeBackground: UIColor
  let quoteBar: UIColor
  let border: UIColor
  let caret: UIColor
  let selection: UIColor
  let placeholder: UIColor
  let checkbox: UIColor
  let tableHeader: UIColor
  /// Inline code's chip.
  let inlineCode: UIColor
  /// The check inside a done task's box.
  let checkboxForeground: UIColor
  /// An open task's outline.
  let checkboxBorder: UIColor
  /// Each syntax token kind's colour; a kind without one draws in the foreground.
  let syntax: [String: UIColor]

  // The website's Markdown rules, in em of the body size (markdown.css).
  static let headingLineHeight: CGFloat = 1.25
  static let codeScale: CGFloat = 0.875
  static let codeBlockLineHeight: CGFloat = 1.625
  static let listGap: CGFloat = 0.25
  static let headingGapAbove: CGFloat = 0.75
  static let quotePadding: CGFloat = 1
  static let codeBlockPaddingX: CGFloat = 1
  static let codeBlockPaddingY: CGFloat = 0.75
  /// Inline code's chip: 0.3em of the code's size at each side.
  static let inlineCodePaddingX: CGFloat = 0.3
  /// The task box, its corner and its check, in em of the body size.
  static let checkboxScale: CGFloat = 1.125
  static let checkboxRadius: CGFloat = 0.375
  static let checkScale: CGFloat = 0.75

  init(record: EditorThemeRecord, fontResolver: EditorFontResolver? = nil, codeStyle: EditorCodeStyle? = nil) {
    self.fontResolver = fontResolver
    fontSize = CGFloat(record.fontSize)
    lineHeight = CGFloat(record.lineHeight)
    let defaults: [CGFloat] = [1.875, 1.5, 1.25, 1.125, 1, 1].map { $0 * CGFloat(record.fontSize) }
    headingSizes = (0..<6).map { index in
      index < record.headingSizes.count ? CGFloat(record.headingSizes[index]) : defaults[index]
    }
    paragraphSpacing = CGFloat(record.paragraphSpacing)
    indentWidth = CGFloat(record.indentWidth)
    regularName = record.fontFamily
    mediumName = record.fontFamilyMedium
    semiboldName = record.fontFamilySemibold
    monoName = record.fontFamilyMono
    let colors = record.colors
    foreground = UIColor(editorHex: colors.foreground) ?? .label
    muted = UIColor(editorHex: colors.muted) ?? .secondaryLabel
    link = UIColor(editorHex: colors.link) ?? .link
    codeBackground = UIColor(editorHex: colors.codeBackground) ?? .secondarySystemBackground
    quoteBar = UIColor(editorHex: colors.quoteBar) ?? .separator
    border = UIColor(editorHex: colors.border) ?? .separator
    caret = UIColor(editorHex: colors.caret) ?? .tintColor
    selection = UIColor(editorHex: colors.selection) ?? .tintColor
    placeholder = UIColor(editorHex: colors.placeholder) ?? .placeholderText
    checkbox = UIColor(editorHex: colors.checkbox) ?? .tintColor
    tableHeader = colors.tableHeader.flatMap { UIColor(editorHex: $0) } ?? codeBackground
    syntax = record.syntax.compactMapValues { UIColor(editorHex: $0) }
    inlineCode = colors.inlineCode.flatMap { UIColor(editorHex: $0) } ?? codeBackground
    checkboxForeground =
      colors.checkboxForeground.flatMap { UIColor(editorHex: $0) }
      ?? checkbox.editorContrastingColor
    checkboxBorder =
      colors.checkboxBorder.flatMap { UIColor(editorHex: $0) }
      ?? foreground.editorScalingAlpha(0.25)
    self.codeStyle = codeStyle ?? EditorCodeStyle(
      fontSize: 14, labelSize: 12, headerHeight: 36, paddingX: 16, paddingY: 12,
      headerInset: 12, iconSize: 14, chevronGap: 4, radius: 12)
  }

  static let fallback = EditorTheme(record: EditorThemeRecord())

  func headingSize(level: Int) -> CGFloat {
    headingSizes[min(max(level, 1), 6) - 1]
  }

  // MARK: Fonts

  /// The code block's language label: small, in the body font.
  var codeLabelFont: UIFont {
    regularFont(size: codeStyle.labelSize)
  }

  func regularFont(size: CGFloat, isItalic: Bool = false) -> UIFont {
    resolveFont(size: size, weight: .regular, isMonospace: false, isItalic: isItalic)
  }

  func semiboldFont(size: CGFloat, isItalic: Bool = false) -> UIFont {
    resolveFont(size: size, weight: .semibold, isMonospace: false, isItalic: isItalic)
  }

  func monoFont(size: CGFloat, isBold: Bool, isItalic: Bool = false) -> UIFont {
    resolveFont(size: size, weight: isBold ? .semibold : .regular, isMonospace: true, isItalic: isItalic)
  }

  private func resolveFont(size: CGFloat, weight: UIFont.Weight, isMonospace: Bool, isItalic: Bool) -> UIFont {
    if let fontResolver {
      return fontResolver(EditorFontRequest(size: size, weight: weight, isMonospace: isMonospace, isItalic: isItalic))
    }
    let name = isMonospace ? monoName : weight == .semibold ? semiboldName : regularName
    var font = Self.font(named: name, size: size, fallbackWeight: isMonospace ? nil : weight)
    if isMonospace && weight == .semibold,
      let bold = font.fontDescriptor.withSymbolicTraits(.traitBold) {
      font = UIFont(descriptor: bold, size: size)
    }
    return isItalic ? EditorStyler.italic(of: font) : font
  }

  private static func font(named name: String, size: CGFloat, fallbackWeight: UIFont.Weight?) -> UIFont {
    if !name.isEmpty, let font = UIFont(name: name, size: size) {
      return font
    }
    if !name.isEmpty {
      // A family name rather than a PostScript name ("Inter").
      let descriptor = UIFontDescriptor(fontAttributes: [.family: name])
      let font = UIFont(descriptor: descriptor, size: size)
      if font.familyName == name { return font }
    }
    guard let weight = fallbackWeight else {
      return .monospacedSystemFont(ofSize: size, weight: .regular)
    }
    return .systemFont(ofSize: size, weight: weight)
  }
}

extension UIColor {
  /// "#RRGGBB" or "#RRGGBBAA".
  convenience init?(editorHex hex: String) {
    var digits = hex.trimmingCharacters(in: .whitespaces)
    if digits.hasPrefix("#") { digits.removeFirst() }
    guard digits.count == 6 || digits.count == 8, let value = UInt64(digits, radix: 16) else {
      return nil
    }
    let hasAlpha = digits.count == 8
    let red = (value >> (hasAlpha ? 24 : 16)) & 0xFF
    let green = (value >> (hasAlpha ? 16 : 8)) & 0xFF
    let blue = (value >> (hasAlpha ? 8 : 0)) & 0xFF
    let alpha = hasAlpha ? value & 0xFF : 0xFF
    self.init(
      red: CGFloat(red) / 255, green: CGFloat(green) / 255, blue: CGFloat(blue) / 255,
      alpha: CGFloat(alpha) / 255)
  }
}
