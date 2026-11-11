import UIKit

/// A code block's strip above its lines, as the website's: the language with
/// a chevron at its start and a Copy icon at its end, over a hairline. The
/// language and Copy are tap targets; the view reports them.
struct EditorCodeChrome {
  // In em of the body size: the strip is 36pt at a 16pt body, its controls
  // 0.75em in from the block's edges.
  static let stripHeight: CGFloat = 2.25
  static let inset: CGFloat = 0.75
  static let copySize: CGFloat = 0.875
  static let chevronGap: CGFloat = 0.25

  let decoration: EditorDecoration
  /// The block's rectangle, background included, in drawing coordinates.
  let block: CGRect

  private var theme: EditorTheme { decoration.theme }
  private var strip: CGRect {
    CGRect(x: block.minX, y: block.minY, width: block.width, height: decoration.metrics.headerHeight)
  }
  private var inset: CGFloat { theme.fontSize * Self.inset }
  private var labelFont: UIFont { theme.codeLabelFont }

  /// The language and its chevron.
  var languageRect: CGRect? {
    guard let label = decoration.paragraph.label, !label.isEmpty else { return nil }
    let width = ceil(NSAttributedString(string: label, attributes: [.font: labelFont]).size().width)
    let chevron = labelFont.pointSize
    return CGRect(
      x: strip.minX + inset, y: strip.midY - labelFont.lineHeight / 2,
      width: width + theme.fontSize * Self.chevronGap + chevron, height: labelFont.lineHeight)
  }

  var copyRect: CGRect {
    let size = (theme.fontSize * Self.copySize).rounded()
    return CGRect(x: strip.maxX - inset - size, y: strip.midY - size / 2, width: size, height: size)
  }

  func draw() {
    let rule = UIBezierPath()
    rule.move(to: CGPoint(x: strip.minX, y: strip.maxY - 0.5))
    rule.addLine(to: CGPoint(x: strip.maxX, y: strip.maxY - 0.5))
    rule.lineWidth = 1
    theme.border.editorScalingAlpha(0.6).setStroke()
    rule.stroke()

    theme.muted.setStroke()
    if let rect = languageRect, let label = decoration.paragraph.label {
      NSAttributedString(
        string: label, attributes: [.font: labelFont, .foregroundColor: theme.muted]
      ).draw(at: rect.origin)
      let size = labelFont.pointSize
      drawLucide(
        in: CGRect(x: rect.maxX - size, y: strip.midY - size / 2, width: size, height: size)
      ) { path in
        path.move(to: CGPoint(x: 6, y: 9))
        path.addLine(to: CGPoint(x: 12, y: 15))
        path.addLine(to: CGPoint(x: 18, y: 9))
      }
    }
    // Lucide's copy: a square over the corner of another.
    drawLucide(in: copyRect) { path in
      path.append(UIBezierPath(roundedRect: CGRect(x: 8, y: 8, width: 14, height: 14), cornerRadius: 2))
      path.move(to: CGPoint(x: 4, y: 16))
      path.addCurve(
        to: CGPoint(x: 2, y: 14), controlPoint1: CGPoint(x: 2.9, y: 16), controlPoint2: CGPoint(x: 2, y: 15.1))
      path.addLine(to: CGPoint(x: 2, y: 4))
      path.addCurve(
        to: CGPoint(x: 4, y: 2), controlPoint1: CGPoint(x: 2, y: 2.9), controlPoint2: CGPoint(x: 2.9, y: 2))
      path.addLine(to: CGPoint(x: 14, y: 2))
      path.addCurve(
        to: CGPoint(x: 16, y: 4), controlPoint1: CGPoint(x: 15.1, y: 2), controlPoint2: CGPoint(x: 16, y: 2.9))
    }
  }

  /// A Lucide icon's path, drawn in its 24-unit box scaled into `rect` with its 2-unit stroke.
  private func drawLucide(in rect: CGRect, build: (UIBezierPath) -> Void) {
    let path = UIBezierPath()
    build(path)
    let scale = rect.width / 24
    path.apply(CGAffineTransform(a: scale, b: 0, c: 0, d: scale, tx: rect.minX, ty: rect.minY))
    path.lineWidth = 2 * scale
    path.lineCapStyle = .round
    path.lineJoinStyle = .round
    path.stroke()
  }
}
