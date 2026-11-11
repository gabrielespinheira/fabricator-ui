import { describe, expect, it } from "vitest"

import { createBlock, type EditorDocument } from "./editor-model"
import {
  createTableBlock,
  getCellRuns,
  getCellText,
  getTableDraft,
  getTableDraftAttrs,
  insertTable,
  insertTableColumn,
  insertTableRow,
  moveTableCell,
  removeTableColumn,
  removeTableRow,
  setTableAlign,
  setTableCell,
  updateTableBlock,
} from "./editor-table"
import { createEditorState, undo } from "./editor-transaction"
import { parseMarkdown } from "./markdown-parse"
import { serializeMarkdown } from "./markdown-serialize"

const table = createBlock({
  id: "t",
  type: "table",
  attrs: {
    align: ["left", null],
    rows: [
      [[{ text: "Name" }], [{ text: "Status" }]],
      [[{ text: "Web", marks: [{ type: "bold" }] }], [{ text: "Done" }]],
    ],
  },
})

describe("table drafts", () => {
  it("reads cells as Markdown text and back", () => {
    const draft = getTableDraft(table)
    expect(draft).toEqual({
      cells: [
        ["Name", "Status"],
        ["**Web**", "Done"],
      ],
      align: ["left", null],
    })
    expect(getTableDraftAttrs(draft)).toEqual(table.attrs)
  })

  it("keeps text that isn't a single paragraph literal", () => {
    expect(getCellRuns("# not a heading")).toEqual([
      { text: "# not a heading" },
    ])
    expect(getCellRuns("")).toEqual([])
    expect(getCellText([{ text: "a|b" }])).toBe("a|b")
  })

  it("adds and removes rows and columns, keeping a header and one column", () => {
    const draft = getTableDraft(table)
    const wider = insertTableColumn(draft, 1)
    expect(wider.cells.map((row) => row.length)).toEqual([3, 3])
    expect(wider.align).toEqual(["left", null, null])
    const taller = insertTableRow(wider, 2)
    expect(taller.cells).toHaveLength(3)
    expect(taller.cells[2]).toEqual(["", "", ""])
    expect(removeTableRow(taller, 0).cells).toHaveLength(2)
    expect(
      removeTableRow({ ...draft, cells: [draft.cells[0]] }, 0).cells
    ).toHaveLength(1)
    expect(removeTableColumn(draft, 0).cells).toEqual([["Status"], ["Done"]])
    expect(removeTableColumn(removeTableColumn(draft, 0), 0).cells).toEqual([
      ["Status"],
      ["Done"],
    ])
  })

  it("sets a cell and a column's alignment", () => {
    const draft = setTableAlign(
      setTableCell(getTableDraft(table), 1, 1, "Later"),
      1,
      "right"
    )
    expect(draft.cells[1][1]).toBe("Later")
    expect(draft.align).toEqual(["left", "right"])
  })

  it("moves between cells with Tab, wrapping rows and adding one at the end", () => {
    const draft = getTableDraft(table)
    expect(moveTableCell(draft, { row: 0, column: 1 }, "next")).toEqual({
      position: { row: 1, column: 0 },
      draft,
    })
    expect(
      moveTableCell(draft, { row: 1, column: 0 }, "previous").position
    ).toEqual({
      row: 0,
      column: 1,
    })
    const end = moveTableCell(draft, { row: 1, column: 1 }, "next")
    expect(end.position).toEqual({ row: 2, column: 0 })
    expect(end.draft.cells).toHaveLength(3)
    expect(
      moveTableCell(draft, { row: 0, column: 0 }, "previous").position
    ).toEqual({
      row: 0,
      column: 0,
    })
  })
})

describe("table blocks", () => {
  it("creates an empty table with a header", () => {
    const block = createTableBlock(3, 2, "new")
    expect(getTableDraft(block)).toEqual({
      cells: [
        ["Column 1", "Column 2", "Column 3"],
        ["", "", ""],
        ["", "", ""],
      ],
      align: [null, null, null],
    })
  })

  it("updates a table as one undo step and writes GFM", () => {
    const document: EditorDocument = { frontmatter: null, blocks: [table] }
    const state = createEditorState(document)
    const draft = setTableCell(getTableDraft(table), 1, 1, "Shipped")
    const next = updateTableBlock(state, "t", draft, 1000)
    expect(next).not.toBeNull()
    if (!next) return
    const markdown = serializeMarkdown(next.document)
    expect(markdown).toContain("| **Web** | Shipped |")
    expect(getTableDraft(parseMarkdown(markdown).blocks[0])).toEqual(draft)
    expect(undo(next).document.blocks[0].attrs).toEqual(table.attrs)
  })

  it("does nothing for a block that isn't a table", () => {
    const state = createEditorState({
      frontmatter: null,
      blocks: [createBlock({ id: "p", type: "paragraph" }, "Hi")],
    })
    expect(updateTableBlock(state, "p", getTableDraft(table), 0)).toBeNull()
  })
})

describe("inserting a table", () => {
  const ids = () => {
    let count = 0
    return () => `id-${(count += 1)}`
  }

  it("adds a table after the caret's block and a paragraph to keep writing in", () => {
    const state = createEditorState(
      {
        frontmatter: null,
        blocks: [createBlock({ id: "p", type: "paragraph" }, "Hi")],
      },
      {
        anchor: { blockId: "p", offset: 2 },
        focus: { blockId: "p", offset: 2 },
      }
    )
    const next = insertTable(state, 0, ids())
    expect(next?.document.blocks.map((block) => block.type)).toEqual([
      "paragraph",
      "table",
      "paragraph",
    ])
    expect(next?.selection?.focus.blockId).toBe(next?.document.blocks[2].id)
  })

  it("replaces an empty paragraph and keeps a following block", () => {
    const state = createEditorState(
      {
        frontmatter: null,
        blocks: [
          createBlock({ id: "e", type: "paragraph" }),
          createBlock({ id: "n", type: "paragraph" }, "Next"),
        ],
      },
      {
        anchor: { blockId: "e", offset: 0 },
        focus: { blockId: "e", offset: 0 },
      }
    )
    const next = insertTable(state, 0, ids())
    expect(next?.document.blocks.map((block) => block.id)).toEqual([
      "id-1",
      "n",
    ])
    expect(next && undo(next).document.blocks.map((block) => block.id)).toEqual(
      ["e", "n"]
    )
  })
})
