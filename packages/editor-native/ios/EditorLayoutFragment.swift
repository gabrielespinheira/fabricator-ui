import UIKit

/// What a layout fragment needs to draw its paragraph's decorations.
struct EditorDecoration {
  let paragraph: EditorParagraph
  let metrics: EditorParagraphMetrics
  let theme: EditorTheme
  let containerWidth: CGFloat
  /// Inline code in this paragraph, relative to its start, drawn as chips.
  let inlineCode: [NSRange]
}

protocol EditorDecorationSource: AnyObject {
  func decoration(atParagraphOffset offset: Int) -> EditorDecoration?
}

/// Lays out one paragraph as TextKit does, and draws what text attributes
/// can't: inline code's chips, list markers and checkboxes in the margin, the
/// quote's bar, the code block's panel and strip, dividers, tables, and the
/// box standing in for an image.
final class EditorLayoutFragment: NSTextLayoutFragment {
  static let quoteBarWidth: CGFloat = 2

  weak var decorationSource: EditorDecorationSource?

  /// Looked up on every draw, so the fragment follows the latest document
  /// even when TextKit keeps it across an edit elsewhere.
  var decoration: EditorDecoration? {
    guard let source = decorationSource,
      let contentManager = textLayoutManager?.textContentManager
    else { return nil }
    let offset = contentManager.offset(
      from: contentManager.documentRange.location, to: rangeInElement.location)
    return source.decoration(atParagraphOffset: offset)
  }

  override var renderingSurfaceBounds: CGRect {
    let bounds = super.renderingSurfaceBounds
    guard let decoration else { return bounds }
    let frame = layoutFragmentFrame
    let padding = decoration.metrics.blockPaddingY + decoration.metrics.headerHeight
    // Decorations reach the container's leading edge and its full width.
    let decorated = CGRect(
      x: -frame.minX, y: -padding, width: decoration.containerWidth,
      height: frame.height + padding * 2)
    return bounds.union(decorated)
  }

  override func draw(at point: CGPoint, in context: CGContext) {
    guard let decoration, let lines = lineBounds(decoration) else {
      super.draw(at: point, in: context)
      return
    }
    UIGraphicsPushContext(context)
    defer { UIGraphicsPopContext() }
    let left = point.x - layoutFragmentFrame.minX
    // Blocks nested under a list item start at its text.
    let blockLeft = left + decoration.metrics.nestedIndent
    let blockWidth = max(decoration.containerWidth - decoration.metrics.nestedIndent, 0)
    let first = lines.first.offsetBy(dx: 0, dy: point.y)
    let last = lines.last.offsetBy(dx: 0, dy: point.y)
    let theme = decoration.theme
    let metrics = decoration.metrics

    let codeBlock = Self.codeBlockRect(decoration, first: first, last: last, left: left)
    switch decoration.paragraph.kind {
    case .code, .raw:
      // Syntax Highlight's panel: surface 2, a 1pt edge at 60%, rounded-xl.
      let path = UIBezierPath(
        roundedRect: codeBlock.insetBy(dx: 0.5, dy: 0.5), cornerRadius: EditorTheme.codeBlockRadius)
      theme.codeBackground.setFill()
      path.fill()
      theme.border.editorScalingAlpha(0.6).setStroke()
      path.lineWidth = 1
      path.stroke()
    default:
      drawInlineCode(decoration, at: point)
    }

    super.draw(at: point, in: context)

    switch decoration.paragraph.kind {
    case .code:
      EditorCodeChrome(decoration: decoration, block: codeBlock).draw()
    case .bulleted, .numbered:
      drawMarker(decoration, line: first, left: left)
    case .task:
      drawCheckbox(
        decoration, in: Self.checkboxRect(decoration, firstLine: first, left: left))
    case .quote:
      // The lines' boxes as the website draws them: glyphs centred.
      let x = left + theme.indentWidth * CGFloat(decoration.paragraph.indent)
      let bar = CGRect(
        x: x, y: first.minY + metrics.leading / 2, width: Self.quoteBarWidth,
        height: last.maxY - first.minY)
      theme.quoteBar.setFill()
      UIBezierPath(roundedRect: bar, cornerRadius: Self.quoteBarWidth / 2).fill()
    case .divider:
      let y = first.midY.rounded(.down) + 0.5
      let rule = UIBezierPath()
      rule.move(to: CGPoint(x: blockLeft, y: y))
      rule.addLine(to: CGPoint(x: blockLeft + blockWidth, y: y))
      rule.lineWidth = 1
      theme.border.setStroke()
      rule.stroke()
    case .image:
      drawObjectBox(decoration, label: "Image", line: first, left: blockLeft, width: blockWidth)
    case .table:
      EditorTableLayout(table: decoration.paragraph.table ?? .empty, theme: theme).draw(
        in: CGRect(x: blockLeft, y: first.minY, width: blockWidth, height: first.height))
    default:
      break
    }
  }

  /// The task's box, at the start of its list level where a bullet would be,
  /// centred on the first line: the Checkbox's 1.125em square.
  static func checkboxRect(_ decoration: EditorDecoration, firstLine: CGRect, left: CGFloat) -> CGRect {
    let theme = decoration.theme
    let size = (theme.fontSize * EditorTheme.checkboxScale).rounded()
    let metrics = decoration.metrics
    let x = left + metrics.leadingIndent - theme.indentWidth
    let glyphMid = firstLine.midY + metrics.leading / 2
    return CGRect(x: x, y: (glyphMid - size / 2).rounded(), width: size, height: size)
  }

  /// A code block's panel: its strip, its padding and its lines.
  static func codeBlockRect(
    _ decoration: EditorDecoration, first: CGRect, last: CGRect, left: CGFloat
  ) -> CGRect {
    let metrics = decoration.metrics
    // Padding around the lines' boxes as the website draws them, glyphs centred.
    let half = metrics.leading / 2
    let top = first.minY + half - metrics.blockPaddingY - metrics.headerHeight
    return CGRect(
      x: left + metrics.nestedIndent, y: top,
      width: max(decoration.containerWidth - metrics.nestedIndent, 0),
      height: last.maxY + half + metrics.blockPaddingY - top)
  }

  /// The first and last lines, each one line-height tall, in fragment coordinates.
  func lineBounds(_ decoration: EditorDecoration) -> (first: CGRect, last: CGRect)? {
    guard let firstLine = textLineFragments.first, let lastLine = textLineFragments.last else {
      return nil
    }
    let height = decoration.metrics.lineHeight
    let first = firstLine.typographicBounds
    let last = lastLine.typographicBounds
    return (
      CGRect(x: first.minX, y: first.minY, width: first.width, height: height),
      CGRect(x: last.minX, y: last.minY, width: last.width, height: height)
    )
  }

  // MARK: Drawing

  private var hairline: CGFloat { 1 / max(UIScreen.main.scale, 1) }

  /// The room between a marker and the text: a number's 0.5em, or a bullet's
  /// 1em, where the website's disc sits.
  private static func markerGap(_ decoration: EditorDecoration) -> CGFloat {
    let isNumber = decoration.paragraph.marker?.hasSuffix(".") == true
    return decoration.theme.fontSize * (isNumber ? 0.5 : 1)
  }

  /// Inline code's chips: the hover fill, rounded, behind the code with the
  /// room its kerning leaves on either side.
  private func drawInlineCode(_ decoration: EditorDecoration, at point: CGPoint) {
    guard !decoration.inlineCode.isEmpty else { return }
    let theme = decoration.theme
    let codeSize = decoration.metrics.font.pointSize * EditorTheme.codeScale
    let padding = codeSize * EditorTheme.inlineCodePaddingX
    let height = theme.monoFont(size: codeSize, isBold: false).lineHeight + codeSize * 0.2
    theme.inlineCode.setFill()
    for line in textLineFragments {
      let lineRange = line.characterRange
      let bounds = line.typographicBounds
      for code in decoration.inlineCode {
        let from = max(code.location, lineRange.location)
        let to = min(NSMaxRange(code), NSMaxRange(lineRange))
        guard to > from else { continue }
        let start = line.locationForCharacter(at: from).x
        let end = line.locationForCharacter(at: to).x
        let chip = CGRect(
          x: point.x + bounds.minX + start - padding,
          y: point.y + bounds.minY + decoration.metrics.lineHeight
            - decoration.metrics.font.lineHeight / 2 - height / 2,
          width: end - start + padding, height: height)
        UIBezierPath(roundedRect: chip, cornerRadius: codeSize * 0.3).fill()
      }
    }
  }

  private func drawMarker(_ decoration: EditorDecoration, line: CGRect, left: CGFloat) {
    guard let marker = decoration.paragraph.marker, !marker.isEmpty else { return }
    let metrics = decoration.metrics
    let style = NSMutableParagraphStyle()
    style.alignment = .right
    style.minimumLineHeight = metrics.lineHeight
    style.maximumLineHeight = metrics.lineHeight
    let font = metrics.font.withMonospacedDigits()
    let text = NSAttributedString(
      string: marker,
      attributes: [
        .font: font,
        .foregroundColor: decoration.theme.muted,
        .paragraphStyle: style,
      ])
    let right = left + metrics.leadingIndent - Self.markerGap(decoration)
    let width = max(right - left, 1)
    text.draw(
      with: CGRect(x: right - width, y: line.minY, width: width, height: metrics.lineHeight),
      options: [.usesLineFragmentOrigin], context: nil)
  }

  /// The Checkbox's look: a 1.5pt outline in the foreground at 25%, or the
  /// primary fill with Lucide's check, 0.75em and heavy, in its foreground.
  private func drawCheckbox(_ decoration: EditorDecoration, in rect: CGRect) {
    let theme = decoration.theme
    let radius = theme.fontSize * EditorTheme.checkboxRadius
    guard decoration.paragraph.isChecked else {
      let outline = Self.circularCorners(rect.insetBy(dx: 0.75, dy: 0.75), radius: radius - 0.75)
      outline.lineWidth = 1.5
      theme.checkboxBorder.setStroke()
      outline.stroke()
      return
    }
    theme.checkbox.setFill()
    Self.circularCorners(rect, radius: radius).fill()
    let size = theme.fontSize * EditorTheme.checkScale
    let scale = size / 24
    let origin = CGPoint(x: rect.midX - size / 2, y: rect.midY - size / 2)
    let check = UIBezierPath()
    check.move(to: CGPoint(x: 20, y: 6))
    check.addLine(to: CGPoint(x: 9, y: 17))
    check.addLine(to: CGPoint(x: 4, y: 12))
    check.apply(CGAffineTransform(a: scale, b: 0, c: 0, d: scale, tx: origin.x, ty: origin.y))
    check.lineWidth = 3 * scale
    check.lineCapStyle = .round
    check.lineJoinStyle = .round
    theme.checkboxForeground.setStroke()
    check.stroke()
  }

  /// A rounded rectangle with circular corners, as CSS draws them. UIKit's
  /// own turns into a circle once the radius passes about a third of the side.
  private static func circularCorners(_ rect: CGRect, radius: CGFloat) -> UIBezierPath {
    UIBezierPath(
      cgPath: CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
  }

  private func drawObjectBox(
    _ decoration: EditorDecoration, label: String, line: CGRect, left: CGFloat, width: CGFloat
  ) {
    let theme = decoration.theme
    let rect = CGRect(x: left, y: line.minY + 4, width: width, height: line.height - 8)
    let path = UIBezierPath(roundedRect: rect.insetBy(dx: hairline / 2, dy: hairline / 2), cornerRadius: 8)
    theme.codeBackground.setFill()
    path.fill()
    theme.border.setStroke()
    path.lineWidth = hairline
    path.stroke()
    let text = NSAttributedString(
      string: label,
      attributes: [
        .font: theme.regularFont(size: theme.fontSize * EditorTheme.codeScale),
        .foregroundColor: theme.muted,
      ])
    let size = text.size()
    text.draw(at: CGPoint(x: rect.midX - size.width / 2, y: rect.midY - size.height / 2))
  }
}

extension UIFont {
  func withMonospacedDigits() -> UIFont {
    let descriptor = fontDescriptor.addingAttributes([
      .featureSettings: [
        [
          UIFontDescriptor.FeatureKey.type: kNumberSpacingType,
          UIFontDescriptor.FeatureKey.selector: kMonospacedNumbersSelector,
        ]
      ]
    ])
    return UIFont(descriptor: descriptor, size: pointSize)
  }
}

extension UIColor {
  /// White or black, whichever reads on this colour.
  var editorContrastingColor: UIColor {
    var red: CGFloat = 0
    var green: CGFloat = 0
    var blue: CGFloat = 0
    var alpha: CGFloat = 0
    getRed(&red, green: &green, blue: &blue, alpha: &alpha)
    let luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    return luminance > 0.6 ? .black : .white
  }
}
