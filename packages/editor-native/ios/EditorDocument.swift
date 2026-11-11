import UIKit

/// A formatted range of the flat text, in UTF-16 offsets.
struct EditorSpan {
  var start: Int
  var end: Int
  var isBold: Bool
  var isItalic: Bool
  var isStrike: Bool
  var isCode: Bool
  var isRaw: Bool
  var link: String?
  /// A code block's syntax colour, as a token kind.
  var token: String? = nil
}

/// A table paragraph's cells as plain text (row 0 the header) and each column's alignment.
struct EditorTable: Equatable {
  var rows: [[String]]
  var align: [NSTextAlignment]

  static let empty = EditorTable(rows: [], align: [])

  init(rows: [[String]], align: [NSTextAlignment]) {
    self.rows = rows
    self.align = align
  }

  init(record: EditorTableRecord) {
    rows = record.rows
    align = record.align.map { value in
      switch value {
      case "center": return .center
      case "right": return .right
      default: return .left
      }
    }
  }
}

/// One paragraph of the flat text, without its trailing "\n".
struct EditorParagraph {
  var start: Int
  var end: Int
  var kind: EditorParagraphKind
  var level: Int
  var indent: Int
  var marker: String?
  var isChecked: Bool
  /// What a table paragraph draws; nil for every other kind.
  var table: EditorTable? = nil
  /// A code block's language name, drawn in its top-end corner.
  var label: String? = nil

  /// Paragraphs whose text is one U+FFFC drawn by the view.
  var isBlockObject: Bool {
    kind == .divider || kind == .image || kind == .table
  }

  var isListItem: Bool {
    kind == .bulleted || kind == .numbered || kind == .task
  }

  /// A list item, or a block nested under one.
  var isInList: Bool {
    isListItem || indent > 0
  }

  /// Whether `next` continues this paragraph's list: anything nested, or
  /// another item of the same kind at the top level.
  func isSameList(as next: EditorParagraph) -> Bool {
    guard isInList, next.isInList else { return false }
    return next.indent > 0 || !next.isListItem || next.kind == kind
  }

  static let empty = EditorParagraph(
    start: 0, end: 0, kind: .paragraph, level: 1, indent: 0, marker: nil, isChecked: false)
}

/// What the view shows: the flat text, its marks and its paragraphs. Mirrors
/// the text storage between JS updates; local edits shift it so decorations
/// stay on their paragraphs until JS answers.
struct EditorDocument {
  var text: String
  var spans: [EditorSpan]
  /// Sorted by start.
  var paragraphs: [EditorParagraph]

  static let empty = EditorDocument(text: "", spans: [], paragraphs: [.empty])

  init(text: String, spans: [EditorSpan], paragraphs: [EditorParagraph]) {
    self.text = text
    self.spans = spans
    self.paragraphs = paragraphs.isEmpty ? [.empty] : paragraphs.sorted { $0.start < $1.start }
  }

  init(record: EditorContentRecord) {
    self.init(
      text: record.text,
      spans: record.spans.map {
        EditorSpan(
          start: $0.start, end: $0.end, isBold: $0.bold, isItalic: $0.italic,
          isStrike: $0.strike, isCode: $0.code, isRaw: $0.raw, link: $0.link,
          token: $0.token)
      },
      paragraphs: record.paragraphs.map {
        EditorParagraph(
          start: $0.start, end: $0.end, kind: $0.kind, level: $0.level, indent: $0.indent,
          marker: $0.marker, isChecked: $0.checked,
          table: $0.table.map(EditorTable.init(record:)), label: $0.label)
      })
  }

  /// The paragraph holding an offset; an offset on a "\n" belongs to the paragraph it ends.
  func paragraphIndex(containing offset: Int) -> Int {
    var low = 0
    var high = paragraphs.count - 1
    while low < high {
      let middle = (low + high + 1) / 2
      if paragraphs[middle].start <= offset {
        low = middle
      } else {
        high = middle - 1
      }
    }
    return low
  }

  func paragraph(containing offset: Int) -> EditorParagraph {
    paragraphs[paragraphIndex(containing: offset)]
  }

  func paragraph(after index: Int) -> EditorParagraph? {
    index + 1 < paragraphs.count ? paragraphs[index + 1] : nil
  }

  /// The document after `from..<to` was replaced with `newText`, offsets shifted
  /// the way JS's naive updater shifts them.
  func replacing(from: Int, to: Int, with newText: String, resultingText: String) -> EditorDocument {
    let length = (newText as NSString).length
    let delta = length - (to - from)
    // Text typed at a boundary joins what ends there, not what starts there.
    func mapStart(_ offset: Int) -> Int {
      if offset <= from { return offset }
      return offset >= to ? offset + delta : from
    }
    func mapEnd(_ offset: Int) -> Int {
      if offset < from { return offset }
      return offset >= to ? offset + delta : from + length
    }
    var result = self
    result.text = resultingText
    result.spans = spans.compactMap { span in
      var moved = span
      moved.start = mapStart(span.start)
      moved.end = mapEnd(span.end)
      return moved.end > moved.start ? moved : nil
    }
    result.paragraphs = paragraphs.map { paragraph in
      var moved = paragraph
      moved.start = mapStart(paragraph.start)
      moved.end = max(moved.start, mapEnd(paragraph.end))
      return moved
    }
    return result
  }
}
