import { describe, expect, it } from "vitest"

import { createBlock, type EditorBlock } from "./editor-model"
import {
  getHeadingLevel,
  getMarkdownTree,
  getTableAlign,
  getTableRows,
  isTaskChecked,
} from "./markdown-tree"

function item(id: string, type: string, indent = 0, attrs = {}) {
  return createBlock({ id, type, indent, attrs }, id)
}

function shape(nodes: ReturnType<typeof getMarkdownTree>): unknown {
  return nodes.map((node) =>
    node.kind === "block"
      ? node.block.id
      : {
          [node.ordered ? "ol" : "ul"]: node.items.map((entry) =>
            entry.children.length
              ? [entry.block.id, shape(entry.children)]
              : entry.block.id
          ),
        }
  )
}

describe("markdown tree", () => {
  it("groups consecutive list items into lists and leaves other blocks alone", () => {
    const blocks: EditorBlock[] = [
      item("p", "paragraph"),
      item("a", "bulleted"),
      item("b", "bulleted"),
      item("q", "quote"),
    ]
    expect(shape(getMarkdownTree(blocks))).toEqual([
      "p",
      { ul: ["a", "b"] },
      "q",
    ])
  })

  it("nests deeper items inside the item before them", () => {
    const blocks = [
      item("a", "bulleted"),
      item("a1", "numbered", 1),
      item("a2", "numbered", 1),
      item("a2x", "task", 2),
      item("b", "bulleted"),
    ]
    expect(shape(getMarkdownTree(blocks))).toEqual([
      { ul: [["a", [{ ol: ["a1", ["a2", [{ ul: ["a2x"] }]]] }]], "b"] },
    ])
  })

  it("starts a new list when the kind changes at the same depth", () => {
    const blocks = [
      item("a", "bulleted"),
      item("t", "task"),
      item("n", "numbered"),
    ]
    expect(shape(getMarkdownTree(blocks))).toEqual([
      { ul: ["a", "t"] },
      { ol: ["n"] },
    ])
  })

  it("starts an ordered list at its first item's number", () => {
    const [list] = getMarkdownTree([
      item("a", "numbered", 0, { number: 4 }),
      item("b", "numbered", 0, { number: 5 }),
    ])
    expect(list.kind === "list" && list.start).toBe(4)
  })

  it("puts an indented paragraph inside its item, in order with nested lists", () => {
    const blocks: EditorBlock[] = [
      item("a", "bulleted"),
      item("p", "paragraph", 1),
      item("b", "numbered", 1),
      item("q", "paragraph", 2),
      item("c", "numbered", 1),
      item("r", "paragraph", 1),
      item("d", "bulleted"),
      item("s", "paragraph"),
    ]
    expect(shape(getMarkdownTree(blocks))).toEqual([
      {
        ul: [["a", ["p", { ol: [["b", ["q"]], "c"] }, "r"]], "d"],
      },
      "s",
    ])
  })

  it("nests paragraphs as deep as their items go", () => {
    const blocks: EditorBlock[] = [
      item("a", "bulleted"),
      item("b", "bulleted", 1),
      item("c", "bulleted", 2),
      item("p", "paragraph", 3),
      item("q", "paragraph", 1),
    ]
    expect(shape(getMarkdownTree(blocks))).toEqual([
      { ul: [["a", [{ ul: [["b", [{ ul: [["c", ["p"]]] }]]] }, "q"]]] },
    ])
  })

  it("treats an item deeper than its list allows as part of that list", () => {
    expect(shape(getMarkdownTree([item("a", "bulleted", 2)]))).toEqual([
      { ul: ["a"] },
    ])
  })
})

describe("block attributes", () => {
  it("reads heading levels, clamped to 1 to 6", () => {
    expect(getHeadingLevel(item("h", "heading", 0, { level: 2 }))).toBe(2)
    expect(getHeadingLevel(item("h", "heading", 0, { level: 9 }))).toBe(6)
    expect(getHeadingLevel(item("h", "heading"))).toBe(1)
  })

  it("reads whether a task is done", () => {
    expect(isTaskChecked(item("t", "task", 0, { checked: true }))).toBe(true)
    expect(isTaskChecked(item("t", "task"))).toBe(false)
  })

  it("reads table rows and alignment, dropping malformed cells", () => {
    const table = createBlock({
      type: "table",
      attrs: {
        align: ["left", null, "center", "sideways"],
        rows: [
          [[{ text: "A" }], [{ text: "B", marks: [{ type: "bold" }] }]],
          [[{ text: "1" }], "oops"],
        ],
      },
    })
    expect(getTableRows(table)).toEqual([
      [[{ text: "A" }], [{ text: "B", marks: [{ type: "bold" }] }]],
      [[{ text: "1" }], []],
    ])
    expect(getTableAlign(table)).toEqual(["left", null, "center", null])
  })
})
