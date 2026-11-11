import { beforeEach, describe, expect, it } from "vitest"

import {
  getTextEdit,
  handleInput,
  type EditorInput,
  type EditorModifiers,
} from "./editor-input"
import { resolveKits, starterKit } from "./editor-kit"
import {
  createBlock,
  getBlockText,
  getFlatText,
  toFlatOffset,
  type EditorBlock,
  type EditorInline,
  type EditorPosition,
} from "./editor-model"
import { createEditorState, undo, type EditorState } from "./editor-transaction"

const kit = resolveKits([starterKit])

let counter = 0
let time = 0

function createId() {
  counter += 1
  return `n${counter}`
}

beforeEach(() => {
  counter = 0
  time = 0
})

function block(
  id: string,
  type: string,
  content: string | EditorInline[] = "",
  extra: Partial<EditorBlock> = {}
): EditorBlock {
  const base = createBlock({ id, type, ...extra })
  return {
    ...base,
    content:
      typeof content === "string"
        ? content
          ? [{ text: content }]
          : []
        : content,
  }
}

function at(blockId: string, offset: number): EditorPosition {
  return { blockId, offset }
}

function create(
  blocks: EditorBlock[],
  anchor: EditorPosition,
  focus: EditorPosition = anchor
) {
  return createEditorState({ frontmatter: null, blocks }, { anchor, focus })
}

function send(state: EditorState, ...inputs: EditorInput[]) {
  return inputs.reduce((current, input) => {
    time += 10
    return handleInput(current, input, { kit, now: time, createId })
  }, state)
}

function getCaret(state: EditorState) {
  const focus = state.selection?.focus
  return focus ? toFlatOffset(state.document, focus) : -1
}

function type(state: EditorState, text: string) {
  let current = state
  for (const character of text) {
    const caret = getCaret(current)
    current = send(current, {
      kind: "replace",
      from: caret,
      to: caret,
      text: character,
    })
  }
  return current
}

/** Blocks as "type:text", with indent and attrs when set. */
function describeBlocks(state: EditorState) {
  return state.document.blocks.map((item) => {
    const indent = item.indent > 0 ? `>${item.indent}` : ""
    const attrs =
      Object.keys(item.attrs).length > 0 ? JSON.stringify(item.attrs) : ""
    return `${item.type}${indent}${attrs}:${getBlockText(item)}`
  })
}

const noModifiers: EditorModifiers = {
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
}

const bold = { type: "bold" }
const link = { type: "link", attrs: { href: "/a" } }

describe("typing", () => {
  it("inserts text at the caret and moves it", () => {
    const state = type(
      create([block("a", "paragraph", "Hi")], at("a", 2)),
      " you"
    )
    expect(describeBlocks(state)).toEqual(["paragraph:Hi you"])
    expect(state.selection?.focus).toEqual(at("a", 6))
  })

  it("continues the previous character's marks", () => {
    const state = type(
      create(
        [block("a", "paragraph", [{ text: "Hi", marks: [bold] }])],
        at("a", 2)
      ),
      "!"
    )
    expect(state.document.blocks[0].content).toEqual([
      { text: "Hi!", marks: [bold] },
    ])
  })

  it("ends links and inline code at their edge, but not inside them", () => {
    const content = [{ text: "go", marks: [link] }, { text: " x" }]
    const atEnd = type(
      create([block("a", "paragraph", content)], at("a", 2)),
      "!"
    )
    expect(atEnd.document.blocks[0].content[0]).toEqual({
      text: "go",
      marks: [link],
    })
    const inside = type(
      create([block("a", "paragraph", content)], at("a", 1)),
      "o"
    )
    expect(inside.document.blocks[0].content[0]).toEqual({
      text: "goo",
      marks: [link],
    })
  })

  it("uses stored marks for the next typed text", () => {
    const state = create([block("a", "paragraph", "Hi")], at("a", 2))
    const typed = type({ ...state, storedMarks: [bold] }, "!")
    expect(typed.document.blocks[0].content).toEqual([
      { text: "Hi" },
      { text: "!", marks: [bold] },
    ])
    expect(typed.storedMarks).toBeNull()
  })

  it("keeps the marks of a word an autocorrection replaces", () => {
    const state = create(
      [block("a", "paragraph", [{ text: "teh", marks: [bold] }])],
      at("a", 3)
    )
    const next = send(state, { kind: "replace", from: 0, to: 3, text: "the" })
    expect(next.document.blocks[0].content).toEqual([
      { text: "the", marks: [bold] },
    ])
  })

  it("never splits a character", () => {
    const state = create([block("a", "paragraph", "a👍b")], at("a", 4))
    const next = send(state, { kind: "replace", from: 2, to: 3, text: "" })
    expect(describeBlocks(next)).toEqual(["paragraph:ab"])
    const replaced = send(state, { kind: "replace", from: 2, to: 2, text: "x" })
    expect(describeBlocks(replaced)).toEqual(["paragraph:ax👍b"])
  })

  it("joins blocks when a replace removes the newline between them", () => {
    const state = create(
      [
        block("a", "heading", "One", { attrs: { level: 1 } }),
        block("b", "paragraph", "Two"),
      ],
      at("b", 0)
    )
    const next = send(state, { kind: "replace", from: 3, to: 4, text: "" })
    expect(describeBlocks(next)).toEqual(['heading{"level":1}:OneTwo'])
  })

  it("splits blocks on newlines and reads U+2028 as a line break", () => {
    const state = create([block("a", "paragraph", "ab")], at("a", 1))
    const next = send(state, {
      kind: "replace",
      from: 1,
      to: 1,
      text: "x\ny\u2028z",
    })
    expect(describeBlocks(next)).toEqual(["paragraph:ax", "paragraph:y\nzb"])
    expect(next.selection?.focus).toEqual(at("n1", 3))
  })

  it("removes a void block a range covers", () => {
    const state = create(
      [
        block("a", "paragraph", "ab"),
        block("b", "divider"),
        block("c", "paragraph", "cd"),
      ],
      at("a", 1)
    )
    const next = send(state, { kind: "replace", from: 1, to: 6, text: "" })
    expect(describeBlocks(next)).toEqual(["paragraph:ad"])
  })

  it("groups a typed sentence into one undo step", () => {
    const state = type(
      create([block("a", "paragraph")], at("a", 0)),
      "hello world"
    )
    expect(state.history.undo).toHaveLength(1)
    expect(describeBlocks(undo(state))).toEqual(["paragraph:"])
  })

  it("inserts a line break on Shift+Enter", () => {
    const state = send(create([block("a", "paragraph", "ab")], at("a", 1)), {
      kind: "softBreak",
    })
    expect(describeBlocks(state)).toEqual(["paragraph:a\nb"])
    expect(getFlatText(state.document)).toBe("a\u2028b")
  })

  it("ignores composition, focus and blur", () => {
    const state = create([block("a", "paragraph")], at("a", 0))
    for (const kind of [
      "compositionStart",
      "compositionEnd",
      "focus",
      "blur",
    ] as const) {
      expect(send(state, { kind })).toBe(state)
    }
  })
})

describe("select", () => {
  it("maps flat offsets to positions, snapped to characters", () => {
    const state = create(
      [block("a", "paragraph", "Hi"), block("b", "paragraph", "👍")],
      at("a", 0)
    )
    const next = send(state, { kind: "select", anchor: 1, focus: 4 })
    expect(next.selection).toEqual({ anchor: at("a", 1), focus: at("b", 0) })
  })

  it("keeps the state when the selection is unchanged", () => {
    const state = create([block("a", "paragraph", "Hi")], at("a", 1))
    expect(send(state, { kind: "select", anchor: 1, focus: 1 })).toBe(state)
  })

  it("clears stored marks when the caret moves", () => {
    const state = {
      ...create([block("a", "paragraph", "Hi")], at("a", 1)),
      storedMarks: [bold],
    }
    expect(
      send(state, { kind: "select", anchor: 0, focus: 0 }).storedMarks
    ).toBeNull()
  })
})

describe("Enter", () => {
  it("splits a paragraph", () => {
    const state = send(create([block("a", "paragraph", "Hello")], at("a", 2)), {
      kind: "split",
    })
    expect(describeBlocks(state)).toEqual(["paragraph:He", "paragraph:llo"])
    expect(state.selection?.focus).toEqual(at("n1", 0))
  })

  it("replaces a selection first", () => {
    const state = send(
      create([block("a", "paragraph", "Hello")], at("a", 1), at("a", 4)),
      {
        kind: "split",
      }
    )
    expect(describeBlocks(state)).toEqual(["paragraph:H", "paragraph:o"])
  })

  it("makes a paragraph after a heading's end and keeps heading text together", () => {
    const heading = block("a", "heading", "Title", { attrs: { level: 2 } })
    expect(
      describeBlocks(send(create([heading], at("a", 5)), { kind: "split" }))
    ).toEqual(['heading{"level":2}:Title', "paragraph:"])
    expect(
      describeBlocks(send(create([heading], at("a", 2)), { kind: "split" }))
    ).toEqual(['heading{"level":2}:Ti', 'heading{"level":2}:tle'])
  })

  it("leaves a paragraph above when Enter is pressed at a heading's start", () => {
    const heading = block("a", "heading", "Title", { attrs: { level: 1 } })
    const state = send(create([heading], at("a", 0)), { kind: "split" })
    expect(describeBlocks(state)).toEqual([
      "paragraph:",
      'heading{"level":1}:Title',
    ])
    expect(state.selection?.focus).toEqual(at("a", 0))
  })

  it("continues lists with an unchecked task and an uncounted number", () => {
    const task = block("a", "task", "Do", { attrs: { checked: true } })
    expect(
      describeBlocks(send(create([task], at("a", 2)), { kind: "split" }))
    ).toEqual(['task{"checked":true}:Do', 'task{"checked":false}:'])
    const numbered = block("a", "numbered", "One", { attrs: { number: 3 } })
    expect(
      describeBlocks(send(create([numbered], at("a", 3)), { kind: "split" }))
    ).toEqual(['numbered{"number":3}:One', "numbered:"])
  })

  it("outdents an empty list item, then turns it into a paragraph", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "bulleted", "", { indent: 1 }),
    ]
    const outdented = send(create(blocks, at("b", 0)), { kind: "split" })
    expect(describeBlocks(outdented)).toEqual(["bulleted:One", "bulleted:"])
    expect(describeBlocks(send(outdented, { kind: "split" }))).toEqual([
      "bulleted:One",
      "paragraph:",
    ])
  })

  it("adds a line in a code block and leaves it on an empty last line", () => {
    const code = block("a", "code", "x", { attrs: { language: "ts" } })
    const once = send(create([code], at("a", 1)), { kind: "split" })
    expect(describeBlocks(once)).toEqual(['code{"language":"ts"}:x\n'])
    const twice = send(once, { kind: "split" })
    expect(describeBlocks(twice)).toEqual([
      'code{"language":"ts"}:x',
      "paragraph:",
    ])
    expect(twice.selection?.focus).toEqual(at("n1", 0))
  })

  it("leaves a code block on Mod+Enter", () => {
    const state = send(create([block("a", "code", "x")], at("a", 0)), {
      kind: "key",
      key: "Enter",
      modifiers: { ...noModifiers, metaKey: true },
    })
    expect(describeBlocks(state)).toEqual(["code:x", "paragraph:"])
  })

  it("adds a paragraph after a void block, keeping it", () => {
    const state = send(
      create([block("a", "divider")], at("a", 0), at("a", 1)),
      { kind: "split" }
    )
    expect(describeBlocks(state)).toEqual(["divider:", "paragraph:"])
    expect(state.selection?.focus).toEqual(at("n1", 0))
    const after = send(create([block("a", "divider")], at("a", 1)), {
      kind: "split",
    })
    expect(describeBlocks(after)).toEqual(["divider:", "paragraph:"])
  })

  it("carries formatting into the new empty block", () => {
    const state = send(
      create(
        [block("a", "paragraph", [{ text: "Hi", marks: [bold] }])],
        at("a", 2)
      ),
      { kind: "split" }
    )
    expect(state.storedMarks).toEqual([bold])
  })
  it("keeps an indented paragraph's indent, then outdents an empty one", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("p", "paragraph", "More", { indent: 1 }),
    ]
    const split = send(create(blocks, at("p", 4)), { kind: "split" })
    expect(describeBlocks(split)).toEqual([
      "bulleted:One",
      "paragraph>1:More",
      "paragraph>1:",
    ])
    const outdented = send(split, { kind: "split" })
    expect(describeBlocks(outdented)).toEqual([
      "bulleted:One",
      "paragraph>1:More",
      "paragraph:",
    ])
    expect(outdented.selection?.focus).toEqual(at("n1", 0))
  })
})

describe("Backspace", () => {
  it("deletes a whole emoji, a word or a line", () => {
    const emoji = send(create([block("a", "paragraph", "a👩‍💻")], at("a", 6)), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(emoji)).toEqual(["paragraph:a"])
    const word = send(
      create([block("a", "paragraph", "one two  ")], at("a", 9)),
      {
        kind: "deleteBackward",
        unit: "word",
      }
    )
    expect(describeBlocks(word)).toEqual(["paragraph:one "])
    const line = send(
      create([block("a", "paragraph", "one\ntwo three")], at("a", 13)),
      {
        kind: "deleteBackward",
        unit: "line",
      }
    )
    expect(describeBlocks(line)).toEqual(["paragraph:one\n"])
  })

  it("turns a heading into a paragraph, then joins it with the block before", () => {
    const blocks = [
      block("a", "paragraph", "One"),
      block("b", "heading", "Two", { attrs: { level: 1 } }),
    ]
    const converted = send(create(blocks, at("b", 0)), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(converted)).toEqual([
      "paragraph:One",
      "paragraph:Two",
    ])
    const joined = send(converted, {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(joined)).toEqual(["paragraph:OneTwo"])
    expect(joined.selection?.focus).toEqual(at("a", 3))
  })

  it("outdents a nested list item before anything else", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "bulleted", "Two", { indent: 1 }),
      block("c", "bulleted", "Three", { indent: 2 }),
    ]
    const state = send(create(blocks, at("b", 0)), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(state)).toEqual([
      "bulleted:One",
      "bulleted:Two",
      "bulleted>1:Three",
    ])
  })

  it("selects a void block before the caret, then removes it", () => {
    const blocks = [block("a", "divider"), block("b", "paragraph", "Text")]
    const selected = send(create(blocks, at("b", 0)), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(selected.selection).toEqual({
      anchor: at("a", 0),
      focus: at("a", 1),
    })
    expect(describeBlocks(selected)).toEqual(["divider:", "paragraph:Text"])
    const removed = send(selected, {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(removed)).toEqual(["paragraph:Text"])
  })

  it("removes an empty block before the caret, keeping the current one", () => {
    const blocks = [block("a", "paragraph"), block("b", "paragraph", "Text")]
    const state = send(create(blocks, at("b", 0)), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(state.document.blocks.map((item) => item.id)).toEqual(["b"])
  })

  it("does nothing at the document's start", () => {
    const state = create([block("a", "paragraph", "x")], at("a", 0))
    expect(send(state, { kind: "deleteBackward", unit: "character" })).toBe(
      state
    )
  })
  it("outdents an indented paragraph a level at a time, then joins it", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "bulleted", "Two", { indent: 1 }),
      block("p", "paragraph", "More", { indent: 2 }),
    ]
    const backspace: EditorInput = { kind: "deleteBackward", unit: "character" }
    const once = send(create(blocks, at("p", 0)), backspace)
    expect(describeBlocks(once)).toEqual([
      "bulleted:One",
      "bulleted>1:Two",
      "paragraph>1:More",
    ])
    const twice = send(once, backspace)
    expect(describeBlocks(twice).at(-1)).toBe("paragraph:More")
    expect(describeBlocks(send(twice, backspace))).toEqual([
      "bulleted:One",
      "bulleted>1:TwoMore",
    ])
  })
})

describe("Delete", () => {
  it("deletes forward by character and word", () => {
    const character = send(
      create([block("a", "paragraph", "é👍x")], at("a", 0)),
      {
        kind: "deleteForward",
        unit: "character",
      }
    )
    expect(describeBlocks(character)).toEqual(["paragraph:👍x"])
    const word = send(
      create([block("a", "paragraph", "one two")], at("a", 0)),
      {
        kind: "deleteForward",
        unit: "word",
      }
    )
    expect(describeBlocks(word)).toEqual(["paragraph: two"])
  })

  it("joins the next block at a block's end and selects a void one", () => {
    const blocks = [block("a", "paragraph", "One"), block("b", "quote", "Two")]
    const joined = send(create(blocks, at("a", 3)), {
      kind: "deleteForward",
      unit: "character",
    })
    expect(describeBlocks(joined)).toEqual(["paragraph:OneTwo"])
    const withVoid = [block("a", "paragraph", "One"), block("b", "divider")]
    const selected = send(create(withVoid, at("a", 3)), {
      kind: "deleteForward",
      unit: "character",
    })
    expect(selected.selection).toEqual({
      anchor: at("b", 0),
      focus: at("b", 1),
    })
  })

  it("removes an empty current block instead of joining into it", () => {
    const blocks = [
      block("a", "paragraph"),
      block("b", "heading", "T", { attrs: { level: 1 } }),
    ]
    const state = send(create(blocks, at("a", 0)), {
      kind: "deleteForward",
      unit: "character",
    })
    expect(describeBlocks(state)).toEqual(['heading{"level":1}:T'])
  })
})

describe("Tab", () => {
  const tab: EditorInput = { kind: "key", key: "Tab", modifiers: noModifiers }
  const shiftTab: EditorInput = {
    kind: "key",
    key: "Tab",
    modifiers: { ...noModifiers, shiftKey: true },
  }

  it("indents a list item at most one level deeper than the one before", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "bulleted", "Two"),
    ]
    const once = send(create(blocks, at("b", 0)), tab)
    expect(describeBlocks(once)).toEqual(["bulleted:One", "bulleted>1:Two"])
    expect(send(once, tab)).toBe(once)
  })

  it("doesn't indent the first item, and leaves Tab elsewhere to the platform", () => {
    const first = create([block("a", "bulleted", "One")], at("a", 0))
    expect(send(first, tab)).toBe(first)
    const paragraph = create([block("a", "paragraph", "One")], at("a", 0))
    expect(send(paragraph, tab)).toBe(paragraph)
  })

  it("outdents an item with the items nested under it", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "bulleted", "Two", { indent: 1 }),
      block("c", "bulleted", "Three", { indent: 2 }),
      block("d", "bulleted", "Four", { indent: 1 }),
    ]
    const state = send(create(blocks, at("b", 0)), shiftTab)
    expect(describeBlocks(state)).toEqual([
      "bulleted:One",
      "bulleted:Two",
      "bulleted>1:Three",
      "bulleted>1:Four",
    ])
  })

  it("indents every selected item", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "bulleted", "Two"),
      block("c", "task", "Three"),
    ]
    const state = send(create(blocks, at("b", 0), at("c", 2)), tab)
    expect(describeBlocks(state)).toEqual([
      "bulleted:One",
      "bulleted>1:Two",
      "task>1:Three",
    ])
  })

  it("inserts and removes two spaces in a code block", () => {
    const indented = send(create([block("a", "code", "x")], at("a", 0)), tab)
    expect(describeBlocks(indented)).toEqual(["code:  x"])
    const outdented = send(indented, shiftTab)
    expect(describeBlocks(outdented)).toEqual(["code:x"])
  })
  it("indents a paragraph under the list item above, a level at a time", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "numbered", "Two", { indent: 1 }),
      block("p", "paragraph", "More"),
    ]
    const once = send(create(blocks, at("p", 0)), tab)
    expect(describeBlocks(once).at(-1)).toBe("paragraph>1:More")
    const twice = send(once, tab)
    expect(describeBlocks(twice).at(-1)).toBe("paragraph>2:More")
    expect(send(twice, tab)).toBe(twice)
    const back = send(twice, shiftTab, shiftTab)
    expect(describeBlocks(back).at(-1)).toBe("paragraph:More")
    expect(send(back, shiftTab)).toBe(back)
  })

  it("indents a paragraph only as deep as the paragraph above it", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("p", "paragraph", "More", { indent: 1 }),
      block("q", "paragraph", "Again"),
    ]
    const once = send(create(blocks, at("q", 0)), tab)
    expect(describeBlocks(once).at(-1)).toBe("paragraph>1:Again")
    expect(send(once, tab)).toBe(once)
    const alone = create(
      [block("h", "heading", "T"), block("q", "paragraph", "x")],
      at("q", 0)
    )
    expect(send(alone, tab)).toBe(alone)
  })

  it("nests a list item under an indented paragraph's item", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("p", "paragraph", "More", { indent: 1 }),
      block("b", "bulleted", "Two"),
    ]
    const once = send(create(blocks, at("b", 0)), tab)
    expect(describeBlocks(once).at(-1)).toBe("bulleted>1:Two")
    expect(send(once, tab)).toBe(once)
  })

  it("carries an item's paragraphs when it moves", () => {
    const blocks = [
      block("a", "bulleted", "One"),
      block("b", "bulleted", "Two", { indent: 1 }),
      block("p", "paragraph", "More", { indent: 2 }),
      block("c", "bulleted", "Three", { indent: 1 }),
    ]
    const state = send(create(blocks, at("b", 0)), shiftTab)
    expect(describeBlocks(state)).toEqual([
      "bulleted:One",
      "bulleted:Two",
      "paragraph>1:More",
      "bulleted>1:Three",
    ])
  })
})

describe("paste", () => {
  it("pastes plain text with paragraphs and line breaks", () => {
    const state = send(create([block("a", "paragraph", "ab")], at("a", 1)), {
      kind: "paste",
      text: "one\ntwo\r\n\r\nthree",
    })
    expect(describeBlocks(state)).toEqual([
      "paragraph:aone\ntwo",
      "paragraph:threeb",
    ])
    expect(state.history.undo.at(-1)?.transaction.origin).toBe("paste")
  })

  it("pastes plain text into a code block as lines", () => {
    const state = send(create([block("a", "code", "")], at("a", 0)), {
      kind: "paste",
      text: "a\n\nb",
      blocks: [block("x", "paragraph", "a"), block("y", "paragraph", "b")],
    })
    expect(describeBlocks(state)).toEqual(["code:a\n\nb"])
  })

  it("merges the first and last pasted blocks into the text around the caret", () => {
    const state = send(create([block("a", "paragraph", "xy")], at("a", 1)), {
      kind: "paste",
      text: "",
      blocks: [
        block("p", "paragraph", "one"),
        block("q", "divider"),
        block("r", "heading", "two", { attrs: { level: 2 } }),
      ],
    })
    expect(describeBlocks(state)).toEqual([
      "paragraph:xone",
      "divider:",
      'heading{"level":2}:twoy',
    ])
    expect(state.selection?.focus).toEqual(at("n4", 3))
    expect(state.document.blocks.map((item) => item.id)).not.toContain("q")
  })

  it("inserts one text block's runs at the caret", () => {
    const state = send(
      create(
        [block("a", "heading", "AB", { attrs: { level: 1 } })],
        at("a", 1)
      ),
      {
        kind: "paste",
        text: "",
        blocks: [block("p", "paragraph", [{ text: "x", marks: [bold] }])],
      }
    )
    expect(state.document.blocks[0].content).toEqual([
      { text: "A" },
      { text: "x", marks: [bold] },
      { text: "B" },
    ])
  })

  it("replaces an empty paragraph with the pasted blocks", () => {
    const state = send(create([block("a", "paragraph")], at("a", 0)), {
      kind: "paste",
      text: "",
      blocks: [
        block("p", "heading", "T", {
          attrs: { level: 1 },
          source: { text: "# T", before: "", fingerprint: "" },
        }),
      ],
    })
    expect(describeBlocks(state)).toEqual(['heading{"level":1}:T'])
    expect(state.document.blocks[0].source).toBeUndefined()
  })
})

describe("Markdown shortcuts", () => {
  function typeInParagraph(text: string) {
    return type(create([block("a", "paragraph")], at("a", 0)), text)
  }

  it.each([
    ["# ", 'heading{"level":1}:'],
    ["## ", 'heading{"level":2}:'],
    ["### ", 'heading{"level":3}:'],
    ["#### ", 'heading{"level":4}:'],
    ["##### ", 'heading{"level":5}:'],
    ["###### ", 'heading{"level":6}:'],
    ["- ", "bulleted:"],
    ["* ", "bulleted:"],
    ["+ ", "bulleted:"],
    ["1. ", 'numbered{"number":1}:'],
    ["12. ", 'numbered{"number":12}:'],
    ["[] ", 'task{"checked":false}:'],
    ["[ ] ", 'task{"checked":false}:'],
    ["[x] ", 'task{"checked":true}:'],
    ["> ", "quote:"],
  ])("turns %j into a block", (text, expected) => {
    const state = typeInParagraph(text)
    expect(describeBlocks(state)).toEqual([expected])
    expect(state.history.undo.at(-1)?.transaction.origin).toBe("rule")
  })

  it("turns a bulleted item into a task", () => {
    const state = typeInParagraph("- [ ] ")
    expect(describeBlocks(state)).toEqual(['task{"checked":false}:'])
  })

  it("keeps text after the caret when a prefix is typed at the start", () => {
    const state = type(
      create([block("a", "paragraph", "Title")], at("a", 0)),
      "# "
    )
    expect(describeBlocks(state)).toEqual(['heading{"level":1}:Title'])
  })

  it("only fires at a paragraph's start", () => {
    expect(describeBlocks(typeInParagraph("a # "))).toEqual(["paragraph:a # "])
    const heading = type(
      create([block("a", "heading", "", { attrs: { level: 1 } })], at("a", 0)),
      "- "
    )
    expect(describeBlocks(heading)).toEqual(['heading{"level":1}:- '])
  })

  it("opens a code block from a fence and a language on Enter", () => {
    const state = send(typeInParagraph("```ts"), { kind: "split" })
    expect(describeBlocks(state)).toEqual(['code{"language":"ts"}:'])
    const bare = send(typeInParagraph("```"), { kind: "split" })
    expect(describeBlocks(bare)).toEqual(["code:"])
  })

  it("makes a divider from --- on Enter", () => {
    const state = send(typeInParagraph("---"), { kind: "split" })
    expect(describeBlocks(state)).toEqual(["divider:", "paragraph:"])
    expect(state.selection?.focus).toEqual(at("n1", 0))
  })

  it.each([
    ["**bold**", "bold"],
    ["__bold__", "bold"],
    ["*it*", "italic"],
    ["_it_", "italic"],
    ["~~gone~~", "strike"],
    ["`code`", "code"],
  ])("wraps %j in a mark when the second delimiter is typed", (text, mark) => {
    const state = type(
      create([block("a", "paragraph", "x ")], at("a", 2)),
      text
    )
    const inner = text.replace(/[*_~`]/g, "")
    expect(state.document.blocks[0].content).toEqual([
      { text: "x " },
      { text: inner, marks: [{ type: mark }] },
    ])
    expect(state.selection?.focus).toEqual(at("a", 2 + inner.length))
  })

  it("types plain text after a wrap", () => {
    const state = type(typeInParagraph("**b**"), "c")
    expect(state.document.blocks[0].content).toEqual([
      { text: "b", marks: [bold] },
      { text: "c" },
    ])
  })

  it("doesn't wrap inside words, around spaces or half a strong delimiter", () => {
    expect(describeBlocks(typeInParagraph("snake_case_"))).toEqual([
      "paragraph:snake_case_",
    ])
    expect(describeBlocks(typeInParagraph("a * b *"))).toEqual([
      "paragraph:a * b *",
    ])
    expect(describeBlocks(typeInParagraph("**bold*"))).toEqual([
      "paragraph:**bold*",
    ])
  })

  it("never fires inside inline code or code blocks", () => {
    const code = type(
      create(
        [block("a", "paragraph", [{ text: "*a", marks: [{ type: "code" }] }])],
        at("a", 2)
      ),
      "*"
    )
    expect(code.document.blocks[0].content).toEqual([
      { text: "*a", marks: [{ type: "code" }] },
      { text: "*" },
    ])
    const block_ = type(create([block("a", "code")], at("a", 0)), "# **x**")
    expect(describeBlocks(block_)).toEqual(["code:# **x**"])
  })

  it("gives back the typed text on Backspace right after a shortcut", () => {
    const heading = send(typeInParagraph("# "), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(heading)).toEqual(["paragraph:# "])
    expect(heading.selection?.focus).toEqual(at("a", 2))
    const strong = send(typeInParagraph("**b**"), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(strong)).toEqual(["paragraph:**b**"])
    const fence = send(send(typeInParagraph("```"), { kind: "split" }), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(fence)).toEqual(["paragraph:```"])
  })

  it("undoes the shortcut and then the typing as separate steps", () => {
    const state = typeInParagraph("> ")
    expect(describeBlocks(undo(state))).toEqual(["paragraph:> "])
    expect(describeBlocks(undo(undo(state)))).toEqual(["paragraph:"])
  })

  it("deletes normally once something else was typed", () => {
    const state = send(type(typeInParagraph("# "), "a"), {
      kind: "deleteBackward",
      unit: "character",
    })
    expect(describeBlocks(state)).toEqual(['heading{"level":1}:'])
  })
})

describe("getTextEdit", () => {
  const caret = (offset: number) => ({ from: offset, to: offset })

  it("finds typed text where the caret was", () => {
    expect(getTextEdit("hello", "helllo", caret(3), caret(4))).toEqual({
      from: 3,
      to: 3,
      text: "l",
    })
    expect(getTextEdit("hello", "helllo", null, null)).toEqual({
      from: 4,
      to: 4,
      text: "l",
    })
  })

  it("finds deletes of every size", () => {
    expect(getTextEdit("hello", "helo", caret(3), caret(2))).toEqual({
      from: 2,
      to: 3,
      text: "",
    })
    expect(getTextEdit("hello", "helo", caret(3), null)).toEqual({
      from: 2,
      to: 3,
      text: "",
    })
    expect(
      getTextEdit("one two three", "one three", caret(8), caret(4))
    ).toEqual({
      from: 4,
      to: 8,
      text: "",
    })
    expect(getTextEdit("abc", "", { from: 0, to: 3 }, caret(0))).toEqual({
      from: 0,
      to: 3,
      text: "",
    })
  })

  it("finds autocorrect, predictive, swipe and dictation replacements", () => {
    expect(
      getTextEdit("I saw teh ", "I saw the ", caret(10), caret(10))
    ).toEqual({
      from: 7,
      to: 9,
      text: "he",
    })
    expect(getTextEdit("I am hap", "I am happy ", caret(8), caret(11))).toEqual(
      {
        from: 8,
        to: 8,
        text: "py ",
      }
    )
    expect(getTextEdit("say hello", "say help", caret(9), caret(8))).toEqual({
      from: 7,
      to: 9,
      text: "p",
    })
    expect(getTextEdit("I scream", "ice cream", caret(8), caret(9))).toEqual({
      from: 0,
      to: 3,
      text: "ice ",
    })
  })

  it("keeps accents and emoji whole", () => {
    expect(getTextEdit("cafe", "café", caret(4), caret(5))).toEqual({
      from: 3,
      to: 4,
      text: "é",
    })
    expect(getTextEdit("cafe", "café", caret(4), caret(4))).toEqual({
      from: 3,
      to: 4,
      text: "é",
    })
    expect(getTextEdit("👍", "👎", caret(2), caret(2))).toEqual({
      from: 0,
      to: 2,
      text: "👎",
    })
    expect(getTextEdit("a👍", "a👍🏽", caret(3), caret(5))).toEqual({
      from: 1,
      to: 3,
      text: "👍🏽",
    })
    expect(getTextEdit("ab", "a😀b", caret(1), caret(3))).toEqual({
      from: 1,
      to: 1,
      text: "😀",
    })
  })

  it("finds a paste and a merge across blocks", () => {
    expect(getTextEdit("ab", "a pasted text b", caret(1), caret(14))).toEqual({
      from: 1,
      to: 1,
      text: " pasted text ",
    })
    expect(getTextEdit("one\ntwo", "onetwo", caret(4), caret(3))).toEqual({
      from: 3,
      to: 4,
      text: "",
    })
  })

  it("returns null when nothing changed", () => {
    expect(getTextEdit("same", "same", null, null)).toBeNull()
  })
})
