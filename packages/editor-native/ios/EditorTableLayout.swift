import UIKit

/// A table paragraph's grid, in the Markdown preview's design: a rounded frame,
/// a tinted semibold header row, hairlines between rows and columns, and each
/// cell on one line in the body font at 0.875 of its size, truncated when it
/// doesn't fit. Columns share the width by their widest text.
struct EditorTableLayout {
  // The website's rules (markdown.css), in em of the table's text.
  static let textScale: CGFloat = 0.875
  static let paddingX: CGFloat = 0.875
  static let paddingY: CGFloat = 0.5
  /// The narrowest a column gets, padding included.
  static let minimumColumnWidth: CGFloat = 4
  static let radius: CGFloat = 12
  static let lineWidth: CGFloat = 1

  let table: EditorTable
  let theme: EditorTheme

  var textSize: CGFloat { theme.fontSize * Self.textScale }
  var cellPaddingX: CGFloat { textSize * Self.paddingX }
  var lineHeight: CGFloat { textSize * theme.lineHeight }
  var rowHeight: CGFloat { (lineHeight + textSize * Self.paddingY * 2).rounded() }
  var rowCount: Int { max(table.rows.count, 1) }
  var columnCount: Int { max(table.align.count, table.rows.map(\.count).max() ?? 0, 1) }
  var height: CGFloat { rowHeight * CGFloat(rowCount) }

  func font(isHeader: Bool) -> UIFont {
    let font = isHeader ? theme.semiboldFont(size: textSize) : theme.regularFont(size: textSize)
    return font.withMonospacedDigits()
  }

  /// Each column's width: its widest cell where they all fit, growing to fill
  /// the width; past that, the room beyond the minimum shared by how much
  /// more each column wants.
  func columnWidths(in width: CGFloat) -> [CGFloat] {
    let count = columnCount
    guard width > 0 else { return Array(repeating: 0, count: count) }
    let minimum = min(textSize * Self.minimumColumnWidth, width / CGFloat(count))
    let natural = (0..<count).map { column in
      table.rows.enumerated().reduce(minimum) { widest, row in
        let text = Self.singleLine(column < row.element.count ? row.element[column] : "")
        let size = NSAttributedString(
          string: text, attributes: [.font: font(isHeader: row.offset == 0)]
        ).size()
        return max(widest, ceil(size.width) + cellPaddingX * 2)
      }
    }
    let total = natural.reduce(0, +)
    let extra = natural.map { $0 - minimum }
    let totalExtra = extra.reduce(0, +)
    let room = max(width - minimum * CGFloat(count), 0)
    var widths = (0..<count).map { column in
      if total <= width { return natural[column] * width / total }
      return totalExtra > 0
        ? minimum + room * extra[column] / totalExtra : minimum + room / CGFloat(count)
    }.map { $0.rounded(.down) }
    // The last column takes what rounding left.
    widths[count - 1] += width - widths.reduce(0, +)
    return widths
  }

  func draw(in rect: CGRect) {
    let frame = rect.insetBy(dx: Self.lineWidth / 2, dy: Self.lineWidth / 2)
    let outline = UIBezierPath(roundedRect: frame, cornerRadius: Self.radius)
    guard let context = UIGraphicsGetCurrentContext() else { return }
    context.saveGState()
    outline.addClip()

    theme.tableHeader.setFill()
    UIRectFill(CGRect(x: rect.minX, y: rect.minY, width: rect.width, height: rowHeight))

    let widths = columnWidths(in: rect.width)
    let rule = UIBezierPath()
    rule.lineWidth = Self.lineWidth
    var x = rect.minX
    for width in widths.dropLast() {
      x += width
      rule.move(to: CGPoint(x: x - Self.lineWidth / 2, y: rect.minY))
      rule.addLine(to: CGPoint(x: x - Self.lineWidth / 2, y: rect.maxY))
    }
    for row in 2..<max(rowCount, 2) {
      let y = rect.minY + rowHeight * CGFloat(row) - Self.lineWidth / 2
      rule.move(to: CGPoint(x: rect.minX, y: y))
      rule.addLine(to: CGPoint(x: rect.maxX, y: y))
    }
    theme.border.editorScalingAlpha(0.5).setStroke()
    rule.stroke()

    if rowCount > 1 {
      let header = UIBezierPath()
      header.lineWidth = Self.lineWidth
      let y = rect.minY + rowHeight - Self.lineWidth / 2
      header.move(to: CGPoint(x: rect.minX, y: y))
      header.addLine(to: CGPoint(x: rect.maxX, y: y))
      theme.border.editorScalingAlpha(0.7).setStroke()
      header.stroke()
    }

    for (rowIndex, row) in table.rows.enumerated() {
      var left = rect.minX
      for (column, width) in widths.enumerated() {
        defer { left += width }
        guard column < row.count, !row[column].isEmpty else { continue }
        let cell = CGRect(
          x: left, y: rect.minY + rowHeight * CGFloat(rowIndex), width: width, height: rowHeight)
        drawText(
          row[column], isHeader: rowIndex == 0,
          alignment: column < table.align.count ? table.align[column] : .left, in: cell)
      }
    }
    context.restoreGState()

    theme.border.editorScalingAlpha(0.7).setStroke()
    outline.lineWidth = Self.lineWidth
    outline.stroke()
  }

  private func drawText(_ text: String, isHeader: Bool, alignment: NSTextAlignment, in cell: CGRect) {
    let font = font(isHeader: isHeader)
    let style = NSMutableParagraphStyle()
    style.alignment = alignment
    style.lineBreakMode = .byTruncatingTail
    let string = NSAttributedString(
      string: Self.singleLine(text),
      attributes: [.font: font, .foregroundColor: theme.foreground, .paragraphStyle: style])
    let box = CGRect(
      x: cell.minX + cellPaddingX, y: cell.midY - font.lineHeight / 2,
      width: max(cell.width - cellPaddingX * 2, 0), height: font.lineHeight)
    string.draw(with: box, options: [.usesLineFragmentOrigin, .truncatesLastVisibleLine], context: nil)
  }

  /// A cell's line breaks as spaces: a cell draws on one line.
  private static func singleLine(_ text: String) -> String {
    text.replacingOccurrences(of: "\n", with: " ").replacingOccurrences(of: "\u{2028}", with: " ")
  }
}

extension UIColor {
  /// The colour with its own alpha multiplied, so a translucent border stays translucent.
  func editorScalingAlpha(_ share: CGFloat) -> UIColor {
    var alpha: CGFloat = 0
    getRed(nil, green: nil, blue: nil, alpha: &alpha)
    return withAlphaComponent(alpha * share)
  }
}
