// Editing a table block. A table keeps its cells as runs in `attrs.rows` (row
// 0 is the header, as GFM requires) and its column alignment in
// `attrs.align`. While someone edits it, the cells are Markdown text in a
// draft, so `**bold**` and links work in a cell; saving parses them back.
// Pure, so the website's in-place grid and React Native's sheet share it.
import {
  createBlock,
  createBlockId,
  getBlockIndex,
  getBlockText,
  normalizeRuns,
  type EditorBlock,
  type EditorInline,
  type EditorJson,
} from "./editor-model"
import {
  applyTransaction,
  createSelection,
  insertBlocks,
  removeBlocks,
  setBlock,
  type EditorOperation,
  type EditorState,
} from "./editor-transaction"
import { parseMarkdown } from "./markdown-parse"
import { serializeRuns } from "./markdown-serialize"
import {
  getTableAlign,
  getTableRows,
  type MarkdownTableAlign,
} from "./markdown-tree"

type TableDraft = {
  /** Each cell as Markdown text, row 0 the header. */
  cells: string[][]
  align: MarkdownTableAlign[]
}

type TableCellPosition = { row: number; column: number }

function getCellText(runs: readonly EditorInline[]) {
  return serializeRuns(runs)
}

/** A cell's runs from its Markdown text; anything but one paragraph stays literal. */
function getCellRuns(text: string): EditorInline[] {
  if (text.trim() === "") return []
  const [first, ...rest] = parseMarkdown(text).blocks
  if (first && rest.length === 0 && first.type === "paragraph") {
    return normalizeRuns(first.content)
  }
  return [{ text }]
}

function getColumnCount(draft: TableDraft) {
  return Math.max(1, ...draft.cells.map((row) => row.length))
}

/** Every row the same width, and an alignment per column. */
function normalizeDraft(draft: TableDraft): TableDraft {
  const columns = getColumnCount(draft)
  const cells = draft.cells.map((row) =>
    Array.from({ length: columns }, (_, column) => row[column] ?? "")
  )
  const align = Array.from(
    { length: columns },
    (_, column) => draft.align[column] ?? null
  )
  return { cells: cells.length > 0 ? cells : [align.map(() => "")], align }
}

function getTableDraft(block: EditorBlock): TableDraft {
  return normalizeDraft({
    cells: getTableRows(block).map((row) => row.map(getCellText)),
    align: getTableAlign(block),
  })
}

function toJsonRuns(runs: readonly EditorInline[]): EditorJson {
  return runs.map((run) => ({
    text: run.text,
    ...(run.marks
      ? {
          marks: run.marks.map((mark) => ({
            type: mark.type,
            ...(mark.attrs ? { attrs: { ...mark.attrs } } : {}),
          })),
        }
      : {}),
    ...(run.raw ? { raw: true } : {}),
  }))
}

/** The block attributes a draft saves as. */
function getTableDraftAttrs(draft: TableDraft): Record<string, EditorJson> {
  const normalized = normalizeDraft(draft)
  return {
    align: normalized.align,
    rows: normalized.cells.map((row) =>
      row.map((cell) => toJsonRuns(getCellRuns(cell)))
    ),
  }
}

function setTableCell(
  draft: TableDraft,
  row: number,
  column: number,
  text: string
): TableDraft {
  return {
    ...draft,
    cells: draft.cells.map((cells, index) =>
      index === row
        ? cells.map((cell, position) => (position === column ? text : cell))
        : cells
    ),
  }
}

function setTableAlign(
  draft: TableDraft,
  column: number,
  align: MarkdownTableAlign
): TableDraft {
  return {
    ...draft,
    align: draft.align.map((value, index) =>
      index === column ? align : value
    ),
  }
}

/** A blank row at `index` (never above the header). */
function insertTableRow(draft: TableDraft, index: number): TableDraft {
  const at = Math.min(Math.max(index, 1), draft.cells.length)
  const blank = Array.from({ length: getColumnCount(draft) }, () => "")
  return {
    ...draft,
    cells: [...draft.cells.slice(0, at), blank, ...draft.cells.slice(at)],
  }
}

/** Removes a row; the header row is cleared instead when it's the only one. */
function removeTableRow(draft: TableDraft, index: number): TableDraft {
  if (draft.cells.length <= 1) return draft
  return { ...draft, cells: draft.cells.filter((_, row) => row !== index) }
}

function insertTableColumn(draft: TableDraft, index: number): TableDraft {
  const at = Math.min(Math.max(index, 0), getColumnCount(draft))
  const insert = <T>(values: readonly T[], value: T) => [
    ...values.slice(0, at),
    value,
    ...values.slice(at),
  ]
  return {
    cells: draft.cells.map((row) => insert(row, "")),
    align: insert(draft.align, null),
  }
}

/** Removes a column, keeping at least one. */
function removeTableColumn(draft: TableDraft, index: number): TableDraft {
  if (getColumnCount(draft) <= 1) return draft
  return {
    cells: draft.cells.map((row) =>
      row.filter((_, column) => column !== index)
    ),
    align: draft.align.filter((_, column) => column !== index),
  }
}

/**
 * Where Tab and Shift+Tab go: along the row, wrapping to the next or previous
 * one. Tab from the last cell adds a row, as spreadsheets and Notion do.
 */
function moveTableCell(
  draft: TableDraft,
  position: TableCellPosition,
  direction: "next" | "previous"
): { position: TableCellPosition; draft: TableDraft } {
  const columns = getColumnCount(draft)
  const index = position.row * columns + position.column
  const total = draft.cells.length * columns
  if (direction === "previous") {
    const previous = Math.max(index - 1, 0)
    return {
      position: {
        row: Math.floor(previous / columns),
        column: previous % columns,
      },
      draft,
    }
  }
  const next = index + 1
  const grown =
    next >= total ? insertTableRow(draft, draft.cells.length) : draft
  return {
    position: { row: Math.floor(next / columns), column: next % columns },
    draft: grown,
  }
}

/** A new table: a header of numbered columns over `bodyRows` blank rows. */
function createTableBlock(columns: number, bodyRows: number, id?: string) {
  const header = Array.from(
    { length: columns },
    (_, index) => `Column ${index + 1}`
  )
  const body = Array.from({ length: bodyRows }, () =>
    Array.from({ length: columns }, () => "")
  )
  return createBlock({
    ...(id ? { id } : {}),
    type: "table",
    attrs: getTableDraftAttrs({
      cells: [header, ...body],
      align: header.map(() => null),
    }),
  })
}

/** Saves a draft into a table block as one undo step, or null if it isn't a table. */
function updateTableBlock(
  state: EditorState,
  blockId: string,
  draft: TableDraft,
  now: number
): EditorState | null {
  const index = getBlockIndex(state.document, blockId)
  const block = state.document.blocks[index]
  if (!block || block.type !== "table") return null
  return applyTransaction(state, {
    operations: [setBlock(blockId, { attrs: getTableDraftAttrs(draft) })],
    selectionBefore: state.selection,
    selectionAfter: state.selection,
    origin: "command",
    time: now,
  })
}

/**
 * Adds a three-column table after the caret's block, taking that block's
 * place when it's an empty paragraph, with a paragraph after it to keep
 * writing in when nothing follows. One undo step.
 */
function insertTable(
  state: EditorState,
  now: number,
  createId: () => string = createBlockId
): EditorState | null {
  const { document, selection } = state
  const anchorId = selection?.focus.blockId ?? document.blocks.at(-1)?.id
  if (!anchorId) return null
  const index = getBlockIndex(document, anchorId)
  const current = document.blocks[index]
  if (!current) return null
  const isEmptyParagraph =
    current.type === "paragraph" && getBlockText(current) === ""
  const table = createTableBlock(3, 2, createId())
  const operations: EditorOperation[] = []
  let at = index + 1
  if (isEmptyParagraph) {
    operations.push(removeBlocks(index, 1))
    at = index
  }
  const following = document.blocks[index + 1]
  const after = following ?? createBlock({ id: createId(), type: "paragraph" })
  operations.push(insertBlocks(at, following ? [table] : [table, after]))
  return applyTransaction(state, {
    operations,
    selectionBefore: selection,
    selectionAfter: createSelection({ blockId: after.id, offset: 0 }),
    origin: "command",
    time: now,
  })
}

export {
  createTableBlock,
  insertTable,
  getCellRuns,
  getCellText,
  getTableDraft,
  getTableDraftAttrs,
  insertTableColumn,
  insertTableRow,
  moveTableCell,
  removeTableColumn,
  removeTableRow,
  setTableAlign,
  setTableCell,
  updateTableBlock,
}
export type { TableCellPosition, TableDraft }
