// How Markdown and the Editor draw a flat document: consecutive list items
// grouped into nested lists, and typed reads of the attributes blocks keep as
// JSON. Pure, so the website and the native tree render from the same rules.
import {
  normalizeRuns,
  type EditorBlock,
  type EditorInline,
  type EditorJson,
  type EditorMark,
} from "./editor-model"

type MarkdownListItem = {
  block: EditorBlock
  /** Paragraphs that continue this item and lists nested under it, in order. */
  children: MarkdownTreeNode[]
}

type MarkdownTreeNode =
  | { kind: "block"; block: EditorBlock }
  | {
      kind: "list"
      ordered: boolean
      /** The first item's number, for an ordered list. */
      start: number
      items: MarkdownListItem[]
    }

type MarkdownTableAlign = "left" | "center" | "right" | null

const LIST_TYPES: ReadonlySet<string> = new Set([
  "bulleted",
  "numbered",
  "task",
])

function isListBlock(block: EditorBlock) {
  return LIST_TYPES.has(block.type)
}

function isOrderedList(block: EditorBlock) {
  return block.type === "numbered"
}

function getNumber(value: EditorJson | undefined, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

/**
 * Collects one list starting at `start`: items at the first item's depth,
 * with deeper items and indented paragraphs nested under the item before
 * them. Stops at a block no deeper than the list that isn't one of its items,
 * a shallower item, or an item of the other kind (ordered or not) at the
 * same depth.
 */
function collectList(
  blocks: readonly EditorBlock[],
  start: number,
  minimumIndent: number
): { node: MarkdownTreeNode; end: number } {
  const first = blocks[start]
  const ordered = isOrderedList(first)
  const items: MarkdownListItem[] = []
  let index = start
  while (index < blocks.length) {
    const block = blocks[index]
    if (!isListBlock(block)) {
      // A deeper paragraph continues the item before it, inside its <li>.
      if (block.indent <= minimumIndent || items.length === 0) break
      items[items.length - 1].children.push({ kind: "block", block })
      index += 1
      continue
    }
    const isDeeper = block.indent > minimumIndent && items.length > 0
    if (isDeeper) {
      const nested = collectList(blocks, index, block.indent)
      items[items.length - 1].children.push(nested.node)
      index = nested.end
      continue
    }
    if (block.indent < minimumIndent && items.length > 0) break
    if (items.length > 0 && isOrderedList(block) !== ordered) break
    items.push({ block, children: [] })
    index += 1
  }
  return {
    node: {
      kind: "list",
      ordered,
      start: getNumber(first.attrs.number, 1),
      items,
    },
    end: index,
  }
}

function getMarkdownTree(blocks: readonly EditorBlock[]): MarkdownTreeNode[] {
  const nodes: MarkdownTreeNode[] = []
  let index = 0
  while (index < blocks.length) {
    const block = blocks[index]
    if (!isListBlock(block)) {
      nodes.push({ kind: "block", block })
      index += 1
      continue
    }
    const list = collectList(blocks, index, block.indent)
    nodes.push(list.node)
    index = list.end
  }
  return nodes
}

function getHeadingLevel(block: EditorBlock) {
  return Math.min(Math.max(Math.round(getNumber(block.attrs.level, 1)), 1), 6)
}

function isTaskChecked(block: EditorBlock) {
  return block.attrs.checked === true
}

function getStringAttribute(block: EditorBlock, name: string) {
  const value = block.attrs[name]
  return typeof value === "string" ? value : null
}

function isJsonObject(
  value: EditorJson | undefined
): value is { readonly [key: string]: EditorJson } {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function readMark(value: EditorJson): EditorMark | null {
  if (!isJsonObject(value) || typeof value.type !== "string") return null
  const attrs = value.attrs
  if (!isJsonObject(attrs)) return { type: value.type }
  const entries = Object.entries(attrs).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  )
  return { type: value.type, attrs: Object.fromEntries(entries) }
}

function readRun(value: EditorJson): EditorInline | null {
  if (!isJsonObject(value) || typeof value.text !== "string") return null
  const marks = Array.isArray(value.marks)
    ? value.marks.flatMap((mark: EditorJson) => readMark(mark) ?? [])
    : []
  return {
    text: value.text,
    ...(marks.length ? { marks } : {}),
    ...(value.raw === true ? { raw: true as const } : {}),
  }
}

function readCell(value: EditorJson): EditorInline[] {
  if (!Array.isArray(value)) return []
  return normalizeRuns(value.flatMap((run: EditorJson) => readRun(run) ?? []))
}

/** A table's cells as runs, row 0 the header. Malformed cells read as empty. */
function getTableRows(block: EditorBlock): EditorInline[][][] {
  const rows = block.attrs.rows
  if (!Array.isArray(rows)) return []
  return rows.map((row: EditorJson) =>
    Array.isArray(row) ? row.map(readCell) : []
  )
}

function getTableAlign(block: EditorBlock): MarkdownTableAlign[] {
  const align = block.attrs.align
  if (!Array.isArray(align)) return []
  return align.map((value: EditorJson) =>
    value === "left" || value === "center" || value === "right" ? value : null
  )
}

export {
  getHeadingLevel,
  getMarkdownTree,
  getStringAttribute,
  getTableAlign,
  getTableRows,
  isListBlock,
  isTaskChecked,
}
export type { MarkdownListItem, MarkdownTableAlign, MarkdownTreeNode }
