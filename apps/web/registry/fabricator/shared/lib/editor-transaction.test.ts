import { describe, expect, it } from "vitest"

import {
  createBlock,
  getBlockFingerprint,
  getBlockText,
  type EditorDocument,
  type EditorPosition,
} from "./editor-model"
import {
  applyOperation,
  applyOperations,
  applyTransaction,
  canRedo,
  canUndo,
  createEditorState,
  createSelection,
  EditorOperationError,
  HISTORY_DEPTH,
  insertBlocks,
  invertOperation,
  joinBlocks,
  redo,
  removeBlocks,
  replaceRange,
  setBlock,
  setFrontmatter,
  setMarks,
  splitBlock,
  undo,
  type EditorOperation,
  type EditorState,
  type EditorTransaction,
} from "./editor-transaction"

const source = { text: "Hello **world**", before: "", fingerprint: "f" }

function createDocument(): EditorDocument {
  return {
    frontmatter: "title: Notes",
    blocks: [
      {
        ...createBlock({ id: "a", type: "heading", attrs: { level: 1 } }),
        content: [{ text: "Title" }],
      },
      {
        ...createBlock({ id: "b", type: "paragraph", source }),
        content: [
          { text: "Hello " },
          { text: "world", marks: [{ type: "bold" }] },
        ],
      },
      createBlock({ id: "c", type: "divider" }),
      createBlock({ id: "d", type: "bulleted", indent: 1 }, "Item"),
    ],
  }
}

function at(blockId: string, offset: number): EditorPosition {
  return { blockId, offset }
}

function expectInvertible(
  document: EditorDocument,
  operation: EditorOperation
) {
  const inverse = invertOperation(document, operation)
  const applied = applyOperation(document, operation)
  expect(applyOperations(applied, inverse)).toEqual(document)
  return applied
}

describe("operations", () => {
  it("replace text inside a block, keeping its source and the other blocks", () => {
    const document = createDocument()
    const next = expectInvertible(
      document,
      replaceRange(at("b", 6), at("b", 11), [{ text: "there" }])
    )
    expect(next.blocks[1].content).toEqual([{ text: "Hello there" }])
    expect(next.blocks[1].source).toBe(source)
    expect(next.blocks[0]).toBe(document.blocks[0])
    expect(next.blocks[3]).toBe(document.blocks[3])
  })

  it("replace across blocks, joining them under the first block's type", () => {
    const document = createDocument()
    const next = expectInvertible(
      document,
      replaceRange(at("a", 2), at("d", 2), [{ text: "-" }])
    )
    expect(next.blocks).toHaveLength(1)
    expect(next.blocks[0]).toMatchObject({
      id: "a",
      type: "heading",
      content: [{ text: "Ti-em" }],
    })
  })

  it("refuse a range that ends in a void block", () => {
    expect(() =>
      applyOperation(createDocument(), replaceRange(at("b", 0), at("c", 0)))
    ).toThrow(EditorOperationError)
  })

  it("add and remove marks across blocks, skipping void blocks", () => {
    const document = createDocument()
    const bold = expectInvertible(
      document,
      setMarks(at("a", 3), at("d", 2), { type: "italic" }, true)
    )
    expect(bold.blocks[0].content).toEqual([
      { text: "Tit" },
      { text: "le", marks: [{ type: "italic" }] },
    ])
    expect(bold.blocks[1].content).toEqual([
      { text: "Hello ", marks: [{ type: "italic" }] },
      { text: "world", marks: [{ type: "bold" }, { type: "italic" }] },
    ])
    expect(bold.blocks[2]).toBe(document.blocks[2])
    const plain = expectInvertible(
      document,
      setMarks(at("b", 0), at("b", 11), { type: "bold" }, false)
    )
    expect(plain.blocks[1].content).toEqual([{ text: "Hello world" }])
  })

  it("replace a link's target when the same mark type is set again", () => {
    const document: EditorDocument = {
      frontmatter: null,
      blocks: [
        {
          ...createBlock({ id: "x", type: "paragraph" }),
          content: [
            { text: "go", marks: [{ type: "link", attrs: { href: "/a" } }] },
          ],
        },
      ],
    }
    const next = expectInvertible(
      document,
      setMarks(
        at("x", 0),
        at("x", 2),
        { type: "link", attrs: { href: "/b" } },
        true
      )
    )
    expect(next.blocks[0].content).toEqual([
      { text: "go", marks: [{ type: "link", attrs: { href: "/b" } }] },
    ])
  })

  it("keep a block when marking changes nothing", () => {
    const document = createDocument()
    const next = applyOperation(
      document,
      setMarks(at("b", 6), at("b", 11), { type: "bold" }, true)
    )
    expect(next).toBe(document)
  })

  it("split a block, giving the new part a type and attrs", () => {
    const document = createDocument()
    const next = expectInvertible(
      document,
      splitBlock(at("a", 3), "e", "paragraph", {})
    )
    expect(next.blocks[0]).toMatchObject({
      id: "a",
      content: [{ text: "Tit" }],
    })
    expect(next.blocks[1]).toEqual({
      id: "e",
      type: "paragraph",
      indent: 0,
      content: [{ text: "le" }],
      attrs: {},
    })
  })

  it("split with the same type and attrs by default, and refuse a used id", () => {
    const document = createDocument()
    const next = applyOperation(document, splitBlock(at("d", 2), "e"))
    expect(next.blocks[4]).toMatchObject({ type: "bulleted", indent: 1 })
    expect(() => applyOperation(document, splitBlock(at("d", 2), "a"))).toThrow(
      EditorOperationError
    )
  })

  it("join neighbouring blocks under the first one", () => {
    const document = createDocument()
    const next = expectInvertible(document, joinBlocks("a", "b"))
    expect(next.blocks[0]).toMatchObject({
      id: "a",
      type: "heading",
      content: [
        { text: "TitleHello " },
        { text: "world", marks: [{ type: "bold" }] },
      ],
    })
    expect(() => applyOperation(document, joinBlocks("a", "d"))).toThrow(
      EditorOperationError
    )
  })

  it("set a block's type, attrs and indent, keeping its source", () => {
    const document = createDocument()
    const next = expectInvertible(
      document,
      setBlock("b", { type: "heading", attrs: { level: 2 }, indent: 0 })
    )
    expect(next.blocks[1]).toMatchObject({
      type: "heading",
      attrs: { level: 2 },
      source,
    })
    expect(() =>
      applyOperation(document, setBlock("b", { type: "divider" }))
    ).toThrow(EditorOperationError)
  })

  it("insert and remove blocks", () => {
    const document = createDocument()
    const inserted = expectInvertible(
      document,
      insertBlocks(1, [createBlock({ id: "n", type: "quote" }, "Quote")])
    )
    expect(inserted.blocks.map((block) => block.id)).toEqual([
      "a",
      "n",
      "b",
      "c",
      "d",
    ])
    const removed = expectInvertible(document, removeBlocks(1, 2))
    expect(removed.blocks.map((block) => block.id)).toEqual(["a", "d"])
    expect(removed.blocks[1]).toBe(document.blocks[3])
  })

  it("normalise the runs of inserted blocks", () => {
    const next = applyOperation(
      createDocument(),
      insertBlocks(0, [
        {
          ...createBlock({ id: "n", type: "paragraph" }),
          content: [{ text: "a" }, { text: "b" }],
        },
      ])
    )
    expect(next.blocks[0].content).toEqual([{ text: "ab" }])
  })

  it("set the frontmatter", () => {
    const document = createDocument()
    const next = expectInvertible(document, setFrontmatter(null))
    expect(next.frontmatter).toBeNull()
  })

  it("leave fingerprints of untouched blocks unchanged", () => {
    const document = createDocument()
    const next = applyOperation(
      document,
      replaceRange(at("a", 0), at("a", 0), [{ text: "A " }])
    )
    expect(getBlockFingerprint(next.blocks[1])).toBe(
      getBlockFingerprint(document.blocks[1])
    )
  })
})

describe("state", () => {
  it("always holds a block", () => {
    const state = createEditorState({ frontmatter: null, blocks: [] })
    expect(state.document.blocks).toHaveLength(1)
    expect(state.document.blocks[0].type).toBe("paragraph")
  })

  it("keeps a normalised document as it is", () => {
    const document = createDocument()
    expect(createEditorState(document).document).toBe(document)
  })

  it("adds an empty paragraph when a transaction removes every block", () => {
    const state = createEditorState(createDocument())
    const next = applyTransaction(state, {
      operations: [removeBlocks(0, 4)],
      selectionBefore: null,
      selectionAfter: null,
      origin: "command",
      time: 0,
    })
    expect(next.document.blocks).toHaveLength(1)
    expect(undo(next).document).toEqual(state.document)
  })
})

describe("nesting", () => {
  function nestedState() {
    return createEditorState({
      frontmatter: null,
      blocks: [
        createBlock({ id: "a", type: "bulleted" }, "Item"),
        createBlock({ id: "p", type: "paragraph", indent: 1 }, "More"),
        createBlock({ id: "b", type: "bulleted", indent: 1 }, "Child"),
        createBlock({ id: "q", type: "paragraph", indent: 2 }, "Deeper"),
      ],
    })
  }

  function commit(state: EditorState, operations: EditorOperation[]) {
    return applyTransaction(state, {
      operations,
      selectionBefore: null,
      selectionAfter: null,
      origin: "command",
      time: 0,
    })
  }

  function getIndents(state: EditorState) {
    return state.document.blocks.map((block) => `${block.id}${block.indent}`)
  }

  it("clamps paragraphs whose list item was removed, and undoes it in one step", () => {
    const state = nestedState()
    const next = commit(state, [removeBlocks(0, 1)])
    expect(getIndents(next)).toEqual(["p0", "b0", "q1"])
    expect(undo(next).document).toEqual(state.document)
  })

  it("clamps paragraphs whose list item became something else", () => {
    const next = commit(nestedState(), [
      setBlock("a", { type: "heading", attrs: { level: 1 } }),
    ])
    expect(getIndents(next)).toEqual(["a0", "p0", "b0", "q1"])
  })

  it("leaves a valid document's indents alone", () => {
    const state = nestedState()
    const next = commit(state, [
      replaceRange(at("p", 0), at("p", 0), [{ text: "x" }]),
    ])
    expect(next.history.undo[0].transaction.operations).toHaveLength(1)
  })
})

describe("history", () => {
  function type(
    state: EditorState,
    text: string,
    time: number,
    options: Partial<EditorTransaction> = {}
  ): EditorState {
    const caret = state.selection?.focus ?? at("b", 0)
    const after = at(caret.blockId, caret.offset + text.length)
    return applyTransaction(state, {
      operations: [replaceRange(caret, caret, [{ text }])],
      selectionBefore: state.selection,
      selectionAfter: createSelection(after),
      origin: "input",
      time,
      ...options,
    })
  }

  function start() {
    return createEditorState(createDocument(), createSelection(at("b", 11)))
  }

  it("merges typing in one block until a pause", () => {
    let state = start()
    state = type(state, "a", 0)
    state = type(state, "b", 100)
    state = type(state, "c", 200)
    expect(state.history.undo).toHaveLength(1)
    state = type(state, "d", 900)
    expect(state.history.undo).toHaveLength(2)
    state = undo(state)
    expect(getBlockText(state.document.blocks[1])).toBe("Hello worldabc")
    expect(state.selection).toEqual(createSelection(at("b", 14)))
    state = undo(state)
    expect(state.document).toEqual(start().document)
    expect(state.selection).toEqual(createSelection(at("b", 11)))
  })

  it("keeps a word and the space after it together after a pause", () => {
    let state = start()
    state = type(state, "w", 0)
    state = type(state, " ", 2000)
    expect(state.history.undo).toHaveLength(1)
  })

  it("starts a new step after a selection jump", () => {
    let state = start()
    state = type(state, "a", 0)
    state = applyTransaction(state, {
      operations: [],
      selectionBefore: state.selection,
      selectionAfter: createSelection(at("b", 0)),
      origin: "input",
      time: 10,
    })
    state = type(state, "b", 20)
    expect(state.history.undo).toHaveLength(2)
  })

  it("starts a new step in another block and after other origins", () => {
    let state = start()
    state = type(state, "a", 0)
    state = applyTransaction(state, {
      operations: [replaceRange(at("a", 5), at("a", 5), [{ text: "!" }])],
      selectionBefore: state.selection,
      selectionAfter: createSelection(at("a", 6)),
      origin: "input",
      time: 10,
    })
    expect(state.history.undo).toHaveLength(2)
    state = type(state, "?", 20, { origin: "command" })
    state = type(state, "?", 30)
    expect(state.history.undo).toHaveLength(4)
  })

  it("keeps rule transactions as their own step", () => {
    let state = start()
    state = type(state, "a", 0)
    state = type(state, "b", 10, { origin: "rule" })
    state = type(state, "c", 20)
    expect(state.history.undo.map((step) => step.transaction.origin)).toEqual([
      "input",
      "rule",
      "input",
    ])
  })

  it("redoes what was undone and clears redo on a new change", () => {
    let state = start()
    state = type(state, "a", 0)
    const typed = state
    state = undo(state)
    expect(canRedo(state)).toBe(true)
    state = redo(state)
    expect(state.document).toEqual(typed.document)
    expect(state.selection).toEqual(typed.selection)
    state = undo(state)
    state = type(state, "z", 5000)
    expect(canRedo(state)).toBe(false)
  })

  it("leaves the state alone with nothing to undo or redo", () => {
    const state = start()
    expect(canUndo(state)).toBe(false)
    expect(undo(state)).toBe(state)
    expect(redo(state)).toBe(state)
  })

  it(`keeps at most ${HISTORY_DEPTH} steps`, () => {
    let state = start()
    for (let index = 0; index < HISTORY_DEPTH + 5; index += 1) {
      state = type(state, "x", index * 1000)
    }
    expect(state.history.undo).toHaveLength(HISTORY_DEPTH)
  })

  it("records nothing for selection changes", () => {
    const state = start()
    const next = applyTransaction(state, {
      operations: [],
      selectionBefore: state.selection,
      selectionAfter: createSelection(at("a", 0)),
      origin: "input",
      time: 0,
    })
    expect(next.history).toBe(state.history)
    expect(next.document).toBe(state.document)
  })
})
