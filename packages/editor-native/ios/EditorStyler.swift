import UIKit

/// The marks covering one run of text.
struct EditorMarks {
  var isBold = false
  var isItalic = false
  var isStrike = false
  var isCode = false
  var isRaw = false
  var link: String?
  var token: String?

  mutating func add(_ span: EditorSpan) {
    isBold = isBold || span.isBold
    isItalic = isItalic || span.isItalic
    isStrike = isStrike || span.isStrike
    isCode = isCode || span.isCode
    isRaw = isRaw || span.isRaw
    link = link ?? span.link
    token = token ?? span.token
  }
}

/// The sizes one paragraph is laid out with, shared by the attributes and the
/// layout fragment that draws its decorations.
struct EditorParagraphMetrics {
  /// The paragraph's own font: body, heading or mono.
  let font: UIFont
  /// Every line's height, in points.
  let lineHeight: CGFloat
  /// The room above the glyphs in each line: a fixed line height puts it all
  /// there. (A baseline offset to centre them breaks TextKit 2's wrapped
  /// lines, which then come out shorter than the line height.) Decorations
  /// centre on the glyphs, `leading / 2` below the line's middle.
  let leading: CGFloat
  /// Where the text starts: list levels, the quote's bar and padding, the code block's padding.
  let leadingIndent: CGFloat
  /// The code block's padding below and above its lines.
  let blockPaddingY: CGFloat
  /// The strip above a code block's lines holding its language label.
  let headerHeight: CGFloat
  /// Where a block nested under a list item starts: its parent item's text.
  /// Backgrounds, rules and grids start here.
  let nestedIndent: CGFloat
}

/// Builds the text attributes for a document from the theme.
struct EditorStyler {
  let theme: EditorTheme

  static let objectReplacement = "\u{FFFC}"
  static let imageHeight: CGFloat = 160
  /// The slant for a family with no italic cut, close to Inter Italic's angle.
  static let syntheticObliqueness: CGFloat = 0.18

  // MARK: Metrics

  func metrics(for paragraph: EditorParagraph) -> EditorParagraphMetrics {
    let size = theme.fontSize
    // A block at indent k > 0 that isn't a list item continues the item at
    // k - 1, whose text starts k indent widths in. Quotes count their own.
    let nested =
      paragraph.isListItem || paragraph.kind == .quote
      ? 0 : theme.indentWidth * CGFloat(max(paragraph.indent, 0))
    switch paragraph.kind {
    case .heading:
      let headingSize = theme.headingSize(level: paragraph.level)
      return makeMetrics(
        font: theme.semiboldFont(size: headingSize),
        lineHeight: headingSize * EditorTheme.headingLineHeight, nestedIndent: nested)
    case .code, .raw:
      let codeSize = size * EditorTheme.codeScale
      // A code block is Syntax Highlight's panel, padded in the body's em
      // under a strip with its language and Copy; raw Markdown is a quieter
      // box padded in its own.
      let isCode = paragraph.kind == .code
      let padding = isCode ? size : codeSize
      return makeMetrics(
        font: theme.monoFont(size: codeSize, isBold: false),
        lineHeight: codeSize * EditorTheme.codeBlockLineHeight,
        leadingIndent: padding * EditorTheme.codeBlockPaddingX,
        blockPaddingY: padding * EditorTheme.codeBlockPaddingY,
        headerHeight: isCode ? (size * EditorCodeChrome.stripHeight).rounded() : 0,
        nestedIndent: nested)
    case .bulleted, .numbered, .task:
      return makeMetrics(
        font: theme.regularFont(size: size), lineHeight: size * theme.lineHeight,
        leadingIndent: theme.indentWidth * CGFloat(paragraph.indent + 1))
    case .quote:
      return makeMetrics(
        font: theme.regularFont(size: size), lineHeight: size * theme.lineHeight,
        leadingIndent: theme.indentWidth * CGFloat(paragraph.indent)
          + EditorLayoutFragment.quoteBarWidth + size * EditorTheme.quotePadding)
    case .image:
      return makeMetrics(
        font: theme.regularFont(size: size), lineHeight: Self.imageHeight, nestedIndent: nested)
    case .table:
      // One line as tall as the grid the layout fragment draws over it.
      let grid = EditorTableLayout(table: paragraph.table ?? .empty, theme: theme)
      return makeMetrics(
        font: theme.regularFont(size: size), lineHeight: grid.height, nestedIndent: nested)
    case .divider:
      // The rule with 0.5em of room above and below it.
      return makeMetrics(
        font: theme.regularFont(size: size), lineHeight: size + 1, nestedIndent: nested)
    case .paragraph:
      return makeMetrics(
        font: theme.regularFont(size: size), lineHeight: size * theme.lineHeight,
        nestedIndent: nested)
    }
  }

  private func makeMetrics(
    font: UIFont, lineHeight: CGFloat, leadingIndent: CGFloat = 0, blockPaddingY: CGFloat = 0,
    headerHeight: CGFloat = 0, nestedIndent: CGFloat = 0
  ) -> EditorParagraphMetrics {
    EditorParagraphMetrics(
      font: font,
      lineHeight: lineHeight,
      leading: max(0, lineHeight - font.lineHeight),
      leadingIndent: nestedIndent + leadingIndent,
      blockPaddingY: blockPaddingY,
      headerHeight: headerHeight,
      nestedIndent: nestedIndent)
  }

  func paragraphStyle(
    for paragraph: EditorParagraph, metrics: EditorParagraphMetrics, next: EditorParagraph?,
    isFirst: Bool
  ) -> NSParagraphStyle {
    let style = NSMutableParagraphStyle()
    style.minimumLineHeight = metrics.lineHeight
    style.maximumLineHeight = metrics.lineHeight
    style.firstLineHeadIndent = metrics.leadingIndent
    style.headIndent = metrics.leadingIndent
    if paragraph.kind == .code || paragraph.kind == .raw {
      style.tailIndent = -(metrics.leadingIndent - metrics.nestedIndent)
    }
    // A list's items, and the blocks nested under them, sit 0.25em apart; a
    // list of another kind after it is a block of its own.
    let isTightList = paragraph.isInList && next.map { paragraph.isSameList(as: $0) } == true
    style.paragraphSpacing =
      (isTightList ? theme.fontSize * EditorTheme.listGap : theme.paragraphSpacing)
      + metrics.blockPaddingY
    var spacingBefore = metrics.blockPaddingY + metrics.headerHeight
    if paragraph.kind == .heading && !isFirst {
      // 0.75em of the heading's own size, as the website's margin.
      spacingBefore += theme.headingSize(level: paragraph.level) * EditorTheme.headingGapAbove
    }
    style.paragraphSpacingBefore = spacingBefore
    style.lineBreakMode = .byWordWrapping
    return style
  }

  // MARK: Attributes

  func attributes(
    for paragraph: EditorParagraph, marks: EditorMarks, metrics: EditorParagraphMetrics,
    paragraphStyle: NSParagraphStyle
  ) -> [NSAttributedString.Key: Any] {
    let upright = runFont(for: paragraph, marks: marks, metrics: metrics)
    let font = marks.isItalic ? Self.italic(of: upright) : upright
    var attributes: [NSAttributedString.Key: Any] = [
      .paragraphStyle: paragraphStyle,
      .font: font,
    ]

    let color = runColor(for: paragraph, marks: marks)
    attributes[.foregroundColor] = color
    if paragraph.kind == .heading {
      attributes[.kern] = -0.025 * font.pointSize
    }
    if marks.isStrike || (paragraph.kind == .task && paragraph.isChecked) {
      attributes[.strikethroughStyle] = NSUnderlineStyle.single.rawValue
      attributes[.strikethroughColor] = color.withAlphaComponent(0.5)
    }
    if marks.link != nil {
      attributes[.underlineStyle] = NSUnderlineStyle.single.rawValue
      attributes[.underlineColor] = theme.link.withAlphaComponent(0.35)
    }
    return attributes
  }

  /// The family's italic cut, or the same font slanted when the family has
  /// none (the example ships Inter's upright cuts only). The slant lives in the
  /// font's matrix, so it travels with the font into typing attributes.
  static func italic(of font: UIFont) -> UIFont {
    let descriptor = font.fontDescriptor
    if let italic = descriptor.withSymbolicTraits(descriptor.symbolicTraits.union(.traitItalic)) {
      let candidate = UIFont(descriptor: italic, size: font.pointSize)
      if candidate.fontName != font.fontName && candidate.familyName == font.familyName {
        return candidate
      }
    }
    let slant = CGAffineTransform(a: 1, b: 0, c: syntheticObliqueness, d: 1, tx: 0, ty: 0)
    return UIFont(descriptor: descriptor.withMatrix(slant), size: font.pointSize)
  }

  private func runFont(
    for paragraph: EditorParagraph, marks: EditorMarks, metrics: EditorParagraphMetrics
  ) -> UIFont {
    if paragraph.kind == .code || paragraph.kind == .raw {
      return theme.monoFont(size: metrics.font.pointSize, isBold: marks.isBold)
    }
    if marks.isCode || marks.isRaw {
      return theme.monoFont(
        size: metrics.font.pointSize * EditorTheme.codeScale,
        isBold: marks.isBold || paragraph.kind == .heading)
    }
    if paragraph.kind == .heading || marks.isBold {
      return theme.semiboldFont(size: metrics.font.pointSize)
    }
    return metrics.font
  }

  private func runColor(for paragraph: EditorParagraph, marks: EditorMarks) -> UIColor {
    if paragraph.isBlockObject { return .clear }
    if paragraph.kind == .code, let token = marks.token, let color = theme.syntax[token] {
      return color
    }
    if paragraph.kind == .task && paragraph.isChecked { return theme.muted }
    if marks.link != nil { return theme.link }
    switch paragraph.kind {
    case .quote, .raw: return theme.muted
    default: return marks.isRaw ? theme.muted : theme.foreground
    }
  }

  /// Rewrites every attribute of the storage from the document, leaving its characters alone.
  func apply(_ document: EditorDocument, to storage: NSMutableAttributedString) {
    let length = storage.length
    let spans = document.spans.sorted { $0.start < $1.start }
    storage.beginEditing()
    for (index, paragraph) in document.paragraphs.enumerated() {
      let next = document.paragraph(after: index)
      let start = index == 0 ? 0 : min(paragraph.start, length)
      // The paragraph's "\n" takes its style, so its caret and empty line look right.
      let end = min(next?.start ?? length, length)
      guard end > start || (length == 0 && index == 0) else { continue }
      let metrics = metrics(for: paragraph)
      let style = paragraphStyle(
        for: paragraph, metrics: metrics, next: next, isFirst: index == 0)

      var boundaries: Set<Int> = [start, end]
      for span in spans where span.end > start && span.start < end {
        boundaries.insert(max(span.start, start))
        boundaries.insert(min(span.end, end))
      }
      let points = boundaries.sorted()
      for (from, to) in zip(points, points.dropFirst()) where to > from {
        var marks = EditorMarks()
        for span in spans where span.start <= from && span.end >= to {
          marks.add(span)
        }
        storage.setAttributes(
          attributes(for: paragraph, marks: marks, metrics: metrics, paragraphStyle: style),
          range: NSRange(location: from, length: to - from))
      }
      if paragraph.kind != .code && paragraph.kind != .raw {
        padInlineCode(in: storage, spans: spans, from: start, to: end, metrics: metrics)
      }
    }
    storage.endEditing()
  }

  /// Room for inline code's chip: kerning after the character before the code
  /// and after its last character, the website's 0.3em of padding.
  private func padInlineCode(
    in storage: NSMutableAttributedString, spans: [EditorSpan], from start: Int, to end: Int,
    metrics: EditorParagraphMetrics
  ) {
    let padding = metrics.font.pointSize * EditorTheme.codeScale * EditorTheme.inlineCodePaddingX
    for span in spans where span.isCode && span.start >= start && span.end <= end && span.end > span.start {
      if span.start > start {
        storage.addAttribute(.kern, value: padding, range: NSRange(location: span.start - 1, length: 1))
      }
      storage.addAttribute(.kern, value: padding, range: NSRange(location: span.end - 1, length: 1))
    }
  }

  /// What a character typed at `offset` looks like before JS answers.
  func typingAttributes(in document: EditorDocument, at offset: Int) -> [NSAttributedString.Key: Any] {
    let index = document.paragraphIndex(containing: offset)
    let paragraph = document.paragraphs[index]
    var marks = EditorMarks()
    for span in document.spans where span.start < offset && offset <= span.end {
      // Bold, italic and strike carry on past their end; code and links don't.
      let isInside = offset < span.end
      marks.isBold = marks.isBold || span.isBold
      marks.isItalic = marks.isItalic || span.isItalic
      marks.isStrike = marks.isStrike || span.isStrike
      if isInside {
        marks.token = marks.token ?? span.token
        marks.isCode = marks.isCode || span.isCode
        marks.isRaw = marks.isRaw || span.isRaw
        marks.link = marks.link ?? span.link
      }
    }
    let metrics = metrics(for: paragraph)
    let style = paragraphStyle(
      for: paragraph, metrics: metrics, next: document.paragraph(after: index), isFirst: index == 0)
    return attributes(for: paragraph, marks: marks, metrics: metrics, paragraphStyle: style)
  }
}
