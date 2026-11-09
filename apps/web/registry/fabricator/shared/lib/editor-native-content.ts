// What the native text view draws for a document: its flat text, the marked
// ranges and each paragraph's kind, with list markers already numbered and
// code already coloured, so Swift and Kotlin never need the model's rules.
import {
  BLOCK_SEPARATOR,
  getBlockLength,
  getBlockText,
  getFlatText,
  getRunsText,
  type EditorBlock,
  type EditorDocument,
} from "./editor-model"
import {
  getHeadingLevel,
  getMarkdownTree,
  getStringAttribute,
  getTableAlign,
  getTableRows,
  isTaskChecked,
  type MarkdownTableAlign,
  type MarkdownTreeNode,
} from "./markdown-tree"
import {
  getCodeLanguage,
  getLanguageLabel,
  highlightCode,
  type SyntaxTokenKind,
} from "./syntax-highlight-model"

type NativeEditorSpan = {
  start: number
  end: number
  bold?: boolean
  italic?: boolean
  strike?: boolean
  code?: boolean
  link?: string
  raw?: boolean
  /** A code block's syntax colour, as Syntax Highlight's token kinds. */
  token?: CodeTokenKind
}

/** The kinds a code token is coloured as; plain text takes no span. */
type CodeTokenKind = Exclude<SyntaxTokenKind, "plain">

type NativeEditorParagraph = {
  start: number
  end: number
  kind: string
  level?: number
  indent?: number
  marker?: string
  checked?: boolean
  /** A table's cells as plain text (row 0 the header) and its column alignment. */
  table?: NativeEditorTable
  /** What a code block shows in its top-end corner: its language's name. */
  label?: string
}

type NativeEditorTable = {
  rows: string[][]
  align: MarkdownTableAlign[]
}

type NativeEditorContent = {
  version: number
  text: string
  spans: NativeEditorSpan[]
  paragraphs: NativeEditorParagraph[]
}

// A disc at every depth, as the website's lists draw them.
const BULLET = "•"

/** Each list item's marker, keyed by block id: its number, or a bullet. */
function getListMarkers(nodes: readonly MarkdownTreeNode[]) {
  const markers = new Map<string, string>()
  const visit = (list: readonly MarkdownTreeNode[]) => {
    for (const node of list) {
      if (node.kind === "block") continue
      for (const [index, item] of node.items.entries()) {
        const { block } = item
        if (node.ordered) markers.set(block.id, `${node.start + index}.`)
        else if (block.type === "bulleted") {
          markers.set(block.id, BULLET)
        }
        visit(item.children)
      }
    }
  }
  visit(nodes)
  return markers
}

function getSpan(
  start: number,
  end: number,
  run: EditorDocument["blocks"][number]["content"][number]
): NativeEditorSpan | null {
  if (run.raw) return { start, end, raw: true }
  const span: NativeEditorSpan = { start, end }
  for (const mark of run.marks ?? []) {
    if (mark.type === "bold") span.bold = true
    if (mark.type === "italic") span.italic = true
    if (mark.type === "strike") span.strike = true
    if (mark.type === "code") span.code = true
    if (mark.type === "link") span.link = mark.attrs?.href ?? ""
  }
  return Object.keys(span).length > 2 ? span : null
}

/** Every row as wide as the widest, each cell's text without its marks. */
function getTable(block: EditorDocument["blocks"][number]): NativeEditorTable {
  const rows = getTableRows(block).map((row) => row.map(getRunsText))
  const align = getTableAlign(block)
  const columns = Math.max(1, align.length, ...rows.map((row) => row.length))
  return {
    rows: rows.map((row) =>
      Array.from({ length: columns }, (_, column) => row[column] ?? "")
    ),
    align: Array.from(
      { length: columns },
      (_, column) => align[column] ?? null
    ),
  }
}

type CodeTokenSpan = { start: number; end: number; token: CodeTokenKind }

// Unchanged blocks keep their object, so typing in one code block colours
// only that one again.
const codeTokenCache = new WeakMap<EditorBlock, CodeTokenSpan[]>()

/**
 * A code block's coloured tokens, as offsets into its text (which is its
 * flat text too: each line break is one U+2028 there). Lines are found in
 * the block's own text, so a CRLF or a trailing newline the highlighter
 * drops can't shift the lines after it.
 */
function getCodeTokenSpans(block: EditorBlock): CodeTokenSpan[] {
  const cached = codeTokenCache.get(block)
  if (cached) return cached
  const code = getBlockText(block)
  const language = getStringAttribute(block, "language") ?? undefined
  const lineStarts = [0]
  const lineEnds: number[] = []
  for (const match of code.matchAll(/\r\n?|\n/g)) {
    lineEnds.push(match.index)
    lineStarts.push(match.index + match[0].length)
  }
  lineEnds.push(code.length)
  const spans: CodeTokenSpan[] = []
  for (const [index, line] of highlightCode(
    code,
    getCodeLanguage(language)
  ).entries()) {
    let at = lineStarts[index]
    const lineEnd = lineEnds[index]
    if (at === undefined || lineEnd === undefined) break
    for (const token of line.tokens) {
      const end = Math.min(at + token.content.length, lineEnd)
      if (token.kind !== "plain" && end > at) {
        spans.push({ start: at, end, token: token.kind })
      }
      at = end
    }
  }
  codeTokenCache.set(block, spans)
  return spans
}

function getNativeEditorContent(
  document: EditorDocument,
  version: number
): NativeEditorContent {
  const markers = getListMarkers(getMarkdownTree(document.blocks))
  const spans: NativeEditorSpan[] = []
  const paragraphs: NativeEditorParagraph[] = []
  let offset = 0
  for (const block of document.blocks) {
    const length = getBlockLength(block)
    const paragraph: NativeEditorParagraph = {
      start: offset,
      end: offset + length,
      kind: block.type,
    }
    if (block.type === "heading") paragraph.level = getHeadingLevel(block)
    // List items always carry their level; any other block only when it's
    // nested under a list item, as a continuation of it.
    if (
      ["bulleted", "numbered", "task"].includes(block.type) ||
      block.indent > 0
    ) {
      paragraph.indent = block.indent
    }
    const marker = markers.get(block.id)
    if (marker) paragraph.marker = marker
    if (block.type === "task") paragraph.checked = isTaskChecked(block)
    if (block.type === "table") paragraph.table = getTable(block)
    if (block.type === "code") {
      paragraph.label = getLanguageLabel(getStringAttribute(block, "language"))
      for (const token of getCodeTokenSpans(block)) {
        spans.push({
          ...token,
          start: offset + token.start,
          end: offset + token.end,
        })
      }
    }
    paragraphs.push(paragraph)

    let runStart = offset
    for (const run of block.content) {
      const span = getSpan(runStart, runStart + run.text.length, run)
      if (span) spans.push(span)
      runStart += run.text.length
    }
    offset += length + BLOCK_SEPARATOR.length
  }
  return { version, text: getFlatText(document), spans, paragraphs }
}

export { getNativeEditorContent }
export type {
  NativeEditorContent,
  NativeEditorParagraph,
  NativeEditorSpan,
  NativeEditorTable,
}
