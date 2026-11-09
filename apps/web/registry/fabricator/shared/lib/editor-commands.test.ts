import { beforeEach, describe, expect, it } from "vitest"

import {
  findShortcutCommand,
  getEditorSnapshot,
  matchShortcut,
  type EditorCommandContext,
  type EditorKeyEvent,
} from "./editor-commands"
import { handleInput } from "./editor-input"
import { resolveKits, starterKit } from "./editor-kit"
import {
  createBlock,
  getBlockText,
  type EditorBlock,
  type EditorInline,
  type EditorPosition,
} from "./editor-model"
import { createEditorState, type EditorState } from "./editor-transaction"

const kit = resolveKits([starterKit])

let counter = 0

function createId() {
  counter += 1
  return `n${counter}`
}

beforeEach(() => {
  counter = 0
})

function block(
  id: string,
  type: string,
  content: string | EditorInline[] = "",
  extra: Partial<EditorBlock> = {}
): EditorBlock {
  return {
    ...createBlock({ id, type, ...extra }),
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

function create(blocks: EditorBlock[], anchor: EditorPosition, focus = anchor) {
  return createEditorState({ frontmatter: null, blocks }, { anchor, focus })
}

function run(
  state: EditorState,
  id: string,
  context: EditorCommandContext = {}
) {
  const command = kit.getCommand(id)
  if (!command) throw new Error(`No command ${id}`)
  return command.run(state, { kit, createId, now: 0, ...context })
}

function runOrFail(
  state: EditorState,
  id: string,
  context: EditorCommandContext = {}
) {
  const next = run(state, id, context)
  if (!next) throw new Error(`Command ${id} didn't run`)
  return next
}

function describeBlocks(state: EditorState) {
  return state.document.blocks.map((item) => {
    const indent = item.indent > 0 ? `>${item.indent}` : ""
    const attrs =
      Object.keys(item.attrs).length > 0 ? JSON.stringify(item.attrs) : ""
    return `${item.type}${indent}${attrs}:${getBlockText(item)}`
  })
}

const bold = { type: "bold" }
const link = { type: "link", attrs: { href: "/a" } }

describe("snapshot", () => {
  const blocks = [
    block("a", "heading", [{ text: "Bold", marks: [bold] }], {
      attrs: { level: 2 },
    }),
    block("b", "paragraph", [
      { text: "go", marks: [bold, link] },
      { text: " on", marks: [bold] },
    ]),
    block("c", "divider"),
  ]

  it("reads marks and the link at a caret", () => {
    const snapshot = getEditorSnapshot(create(blocks, at("b", 1)), kit)
    expect(snapshot.activeMarks).toEqual(["link", "bold"])
    expect(snapshot.link).toEqual({ href: "/a" })
    expect(snapshot.isCollapsed).toBe(true)
  })

  it("leaves non-inclusive marks out at their end, keeping the link to edit", () => {
    const snapshot = getEditorSnapshot(create(blocks, at("b", 2)), kit)
    expect(snapshot.activeMarks).toEqual(["bold"])
    expect(snapshot.link).toEqual({ href: "/a" })
  })

  it("reads the marks every selected character shares", () => {
    const snapshot = getEditorSnapshot(
      create(blocks, at("a", 0), at("b", 5)),
      kit
    )
    expect(snapshot.activeMarks).toEqual(["bold"])
    expect(snapshot.blockType).toBeNull()
    expect(snapshot.selectionText).toBe("Bold\ngo on")
  })

  it("reads the block type and heading level", () => {
    const snapshot = getEditorSnapshot(create(blocks, at("a", 1)), kit)
    expect(snapshot).toMatchObject({ blockType: "heading", headingLevel: 2 })
  })

  it("reads stored marks before the text's", () => {
    const state = { ...create(blocks, at("b", 1)), storedMarks: [] }
    expect(getEditorSnapshot(state, kit).activeMarks).toEqual([])
  })

  it("is empty without a selection and stable for equal states", () => {
    const state = createEditorState({ frontmatter: null, blocks })
    expect(getEditorSnapshot(state)).toMatchObject({
      hasSelection: false,
      blockType: null,
      canUndo: false,
    })
    const selected = create(blocks, at("a", 0), at("b", 2))
    expect(getEditorSnapshot(selected, kit)).toEqual(
      getEditorSnapshot(selected, kit)
    )
  })
})

describe("mark commands", () => {
  it("toggle a mark over a selection", () => {
    const state = create(
      [block("a", "paragraph", "Hello")],
      at("a", 0),
      at("a", 5)
    )
    const bolded = runOrFail(state, "bold")
    expect(bolded.document.blocks[0].content).toEqual([
      { text: "Hello", marks: [bold] },
    ])
    expect(bolded.history.undo.at(-1)?.transaction.origin).toBe("command")
    const plain = runOrFail(bolded, "bold")
    expect(plain.document.blocks[0].content).toEqual([{ text: "Hello" }])
  })

  it("add the mark when only part of the selection has it", () => {
    const state = create(
      [
        block("a", "paragraph", [
          { text: "He", marks: [bold] },
          { text: "llo" },
        ]),
      ],
      at("a", 0),
      at("a", 5)
    )
    expect(runOrFail(state, "bold").document.blocks[0].content).toEqual([
      { text: "Hello", marks: [bold] },
    ])
  })

  it("store marks at a caret for the next typed text", () => {
    const state = runOrFail(
      create([block("a", "paragraph", "Hi")], at("a", 2)),
      "italic"
    )
    expect(state.storedMarks).toEqual([{ type: "italic" }])
    expect(state.document).toEqual(
      create([block("a", "paragraph", "Hi")], at("a", 2)).document
    )
    const typed = handleInput(
      state,
      { kind: "replace", from: 2, to: 2, text: "!" },
      { kit, now: 0 }
    )
    expect(typed.document.blocks[0].content).toEqual([
      { text: "Hi" },
      { text: "!", marks: [{ type: "italic" }] },
    ])
    const off = runOrFail(
      create(
        [block("a", "paragraph", [{ text: "Hi", marks: [bold] }])],
        at("a", 2)
      ),
      "bold"
    )
    expect(off.storedMarks).toEqual([])
  })

  it("skip code blocks", () => {
    expect(
      run(create([block("a", "code", "x")], at("a", 0), at("a", 1)), "bold")
    ).toBeNull()
    expect(
      run(create([block("a", "code", "x")], at("a", 0)), "bold")
    ).toBeNull()
  })

  it("set, change and remove links", () => {
    const text = create(
      [block("a", "paragraph", "Hello")],
      at("a", 0),
      at("a", 5)
    )
    const linked = runOrFail(text, "link", { args: { href: "/x" } })
    expect(linked.document.blocks[0].content).toEqual([
      { text: "Hello", marks: [{ type: "link", attrs: { href: "/x" } }] },
    ])
    const caret = {
      ...linked,
      selection: { anchor: at("a", 2), focus: at("a", 2) },
    }
    const changed = runOrFail(caret, "link", { args: { href: "/y" } })
    expect(changed.document.blocks[0].content).toEqual([
      { text: "Hello", marks: [{ type: "link", attrs: { href: "/y" } }] },
    ])
    const removed = runOrFail(caret, "link")
    expect(removed.document.blocks[0].content).toEqual([{ text: "Hello" }])
    expect(run(text, "link")).toBeNull()
  })

  it("insert the address as a link at a caret outside one", () => {
    const state = runOrFail(
      create([block("a", "paragraph", "See ")], at("a", 4)),
      "link",
      {
        args: { href: "https://x.dev" },
      }
    )
    expect(state.document.blocks[0].content).toEqual([
      { text: "See " },
      {
        text: "https://x.dev",
        marks: [{ type: "link", attrs: { href: "https://x.dev" } }],
      },
    ])
    expect(state.selection?.focus).toEqual(at("a", 17))
  })
})

describe("block commands", () => {
  it("turn every selected block into a heading, and back", () => {
    const state = create(
      [
        block("a", "paragraph", "One"),
        block("b", "quote", "Two"),
        block("c", "divider"),
      ],
      at("a", 1),
      at("c", 1)
    )
    const headings = runOrFail(state, "heading-2")
    expect(describeBlocks(headings)).toEqual([
      'heading{"level":2}:One',
      'heading{"level":2}:Two',
      "divider:",
    ])
    expect(runOrFail(headings, "heading-1").document.blocks[0].attrs).toEqual({
      level: 1,
    })
    expect(describeBlocks(runOrFail(headings, "heading-2"))).toEqual([
      "paragraph:One",
      "paragraph:Two",
      "divider:",
    ])
  })

  it("leave out a block the selection ends at the start of", () => {
    const state = create(
      [block("a", "paragraph", "One"), block("b", "paragraph", "Two")],
      at("a", 0),
      at("b", 0)
    )
    expect(describeBlocks(runOrFail(state, "quote"))).toEqual([
      "quote:One",
      "paragraph:Two",
    ])
  })

  it("make lists, keeping valid nesting and dropping it for other types", () => {
    const state = create(
      [
        block("a", "paragraph", "One", { indent: 2 }),
        block("b", "paragraph", "Two", { indent: 1 }),
      ],
      at("a", 0),
      at("b", 3)
    )
    const list = runOrFail(state, "bulleted")
    expect(describeBlocks(list)).toEqual(["bulleted:One", "bulleted>1:Two"])
    expect(describeBlocks(runOrFail(list, "bulleted"))).toEqual([
      "paragraph:One",
      "paragraph:Two",
    ])
  })

  it("make unchecked tasks and toggle them", () => {
    const state = runOrFail(
      create([block("a", "paragraph", "Do")], at("a", 0)),
      "task"
    )
    expect(describeBlocks(state)).toEqual(['task{"checked":false}:Do'])
    const done = runOrFail(state, "toggle-task")
    expect(describeBlocks(done)).toEqual(['task{"checked":true}:Do'])
    expect(getEditorSnapshot(done).isChecked).toBe(true)
    expect(describeBlocks(runOrFail(done, "task"))).toEqual(["paragraph:Do"])
  })

  it("merge selected blocks into one plain code block, keeping the selection", () => {
    const state = create(
      [
        block("a", "paragraph", [{ text: "one", marks: [bold] }]),
        block("b", "heading", "two", { attrs: { level: 1 } }),
      ],
      at("a", 1),
      at("b", 2)
    )
    const code = runOrFail(state, "code-block")
    expect(code.document.blocks).toHaveLength(1)
    expect(code.document.blocks[0]).toMatchObject({
      id: "a",
      type: "code",
      content: [{ text: "one\ntwo" }],
    })
    expect(code.selection).toEqual({ anchor: at("a", 1), focus: at("a", 6) })
    expect(describeBlocks(runOrFail(code, "code-block"))).toEqual([
      "paragraph:one\ntwo",
    ])
  })

  it("insert a divider", () => {
    const middle = runOrFail(
      create([block("a", "paragraph", "ab")], at("a", 1)),
      "divider"
    )
    expect(describeBlocks(middle)).toEqual([
      "paragraph:a",
      "divider:",
      "paragraph:b",
    ])
    const end = runOrFail(
      create([block("a", "paragraph", "ab")], at("a", 2)),
      "divider"
    )
    expect(describeBlocks(end)).toEqual([
      "paragraph:ab",
      "divider:",
      "paragraph:",
    ])
    expect(end.selection?.focus).toEqual(at("n4", 0))
    const empty = runOrFail(
      create([block("a", "paragraph")], at("a", 0)),
      "divider"
    )
    expect(describeBlocks(empty)).toEqual(["divider:", "paragraph:"])
    expect(empty.selection?.focus).toEqual(at("a", 0))
  })

  it("indent and outdent list items", () => {
    const state = create(
      [block("a", "bulleted", "One"), block("b", "bulleted", "Two")],
      at("b", 0)
    )
    const indented = runOrFail(state, "indent")
    expect(describeBlocks(indented)).toEqual(["bulleted:One", "bulleted>1:Two"])
    expect(describeBlocks(runOrFail(indented, "outdent"))).toEqual([
      "bulleted:One",
      "bulleted:Two",
    ])
    expect(run(state, "outdent")).toBeNull()
  })

  it("indent and outdent paragraphs under list items, and say when they can", () => {
    const state = create(
      [block("a", "bulleted", "One"), block("p", "paragraph", "More")],
      at("p", 0)
    )
    const canRun = (current: EditorState, id: string) =>
      kit.getCommand(id)?.canRun?.(getEditorSnapshot(current, kit))
    expect(canRun(state, "indent")).toBe(true)
    expect(canRun(state, "outdent")).toBe(false)
    const indented = runOrFail(state, "indent")
    expect(describeBlocks(indented)).toEqual([
      "bulleted:One",
      "paragraph>1:More",
    ])
    expect(canRun(indented, "indent")).toBe(false)
    expect(run(indented, "indent")).toBeNull()
    expect(canRun(indented, "outdent")).toBe(true)
    expect(describeBlocks(runOrFail(indented, "outdent"))).toEqual([
      "bulleted:One",
      "paragraph:More",
    ])
    const alone = create([block("p", "paragraph", "x")], at("p", 0))
    expect(canRun(alone, "indent")).toBe(false)
    expect(run(alone, "indent")).toBeNull()
  })

  it("keep a list item's nesting when it becomes a paragraph", () => {
    const state = create(
      [
        block("a", "bulleted", "One"),
        block("b", "bulleted", "Two", { indent: 1 }),
        block("c", "bulleted", "Three", { indent: 2 }),
      ],
      at("b", 0)
    )
    expect(describeBlocks(runOrFail(state, "paragraph"))).toEqual([
      "bulleted:One",
      "paragraph>1:Two",
      "bulleted>1:Three",
    ])
  })

  it("undo and redo", () => {
    const state = runOrFail(
      create([block("a", "paragraph", "x")], at("a", 0)),
      "quote"
    )
    const undone = runOrFail(state, "undo")
    expect(describeBlocks(undone)).toEqual(["paragraph:x"])
    expect(describeBlocks(runOrFail(undone, "redo"))).toEqual(["quote:x"])
    expect(run(undone, "undo")).toBeNull()
  })
})

describe("command metadata", () => {
  it("place commands on surfaces and report their state", () => {
    expect(kit.getCommandsFor("bubble").map((command) => command.id)).toEqual([
      "bold",
      "italic",
      "strike",
      "code",
      "link",
    ])
    const snapshot = getEditorSnapshot(
      create([block("a", "heading", "T", { attrs: { level: 3 } })], at("a", 0)),
      kit
    )
    expect(kit.getCommand("heading-3")?.isActive?.(snapshot)).toBe(true)
    expect(kit.getCommand("heading-2")?.isActive?.(snapshot)).toBe(false)
    expect(kit.getCommand("undo")?.canRun?.(snapshot)).toBe(false)
    expect(kit.getCommand("indent")?.canRun?.(snapshot)).toBe(false)
    expect(kit.getCommand("outdent")?.canRun?.(snapshot)).toBe(false)
    const toolbar = kit.getCommandsFor("toolbar").map((command) => command.id)
    expect(toolbar).toContain("indent")
    expect(toolbar).toContain("outdent")
  })
})

describe("shortcuts", () => {
  function key(
    code: string,
    modifiers: Partial<EditorKeyEvent> = {},
    keyValue = ""
  ): EditorKeyEvent {
    return {
      key: keyValue,
      code,
      metaKey: false,
      ctrlKey: false,
      altKey: false,
      shiftKey: false,
      ...modifiers,
    }
  }

  it("read mod as Cmd on Apple platforms and Ctrl elsewhere", () => {
    expect(
      matchShortcut(key("KeyB", { metaKey: true }), "mod+b", "apple")
    ).toBe(true)
    expect(
      matchShortcut(key("KeyB", { ctrlKey: true }), "mod+b", "apple")
    ).toBe(false)
    expect(
      matchShortcut(key("KeyB", { ctrlKey: true }), "mod+b", "other")
    ).toBe(true)
    expect(
      matchShortcut(key("KeyB", { metaKey: true }), "mod+b", "other")
    ).toBe(false)
  })

  it("need exactly the modifiers named", () => {
    expect(
      matchShortcut(
        key("KeyB", { metaKey: true, shiftKey: true }),
        "mod+b",
        "apple"
      )
    ).toBe(false)
    expect(
      matchShortcut(key("KeyB", { metaKey: true }), "Mod+Shift+B", "apple")
    ).toBe(false)
    expect(
      matchShortcut(key("KeyB", { metaKey: true }), "hyper+b", "apple")
    ).toBe(false)
  })

  it("match letters and digits by code whatever the key produced", () => {
    const optionOne = key("Digit1", { metaKey: true, altKey: true }, "¡")
    expect(matchShortcut(optionOne, "mod+alt+1", "apple")).toBe(true)
    const shiftEight = key("Digit8", { ctrlKey: true, shiftKey: true }, "*")
    expect(matchShortcut(shiftEight, "mod+shift+8", "other")).toBe(true)
    const period = key("Period", { metaKey: true, shiftKey: true }, ">")
    expect(matchShortcut(period, "mod+shift+period", "apple")).toBe(true)
    expect(
      matchShortcut(key("", { metaKey: true }, "b"), "mod+b", "apple")
    ).toBe(true)
  })

  it("match named keys by key", () => {
    for (const name of [
      "Enter",
      "Tab",
      "Escape",
      "Backspace",
      "ArrowUp",
      "ArrowLeft",
    ]) {
      expect(
        matchShortcut(key("", {}, name), name.toLowerCase(), "apple")
      ).toBe(true)
    }
    expect(
      matchShortcut(key("", { metaKey: true }, "Enter"), "mod+enter", "apple")
    ).toBe(true)
  })

  it.each([
    ["bold", "KeyB", {}],
    ["italic", "KeyI", {}],
    ["strike", "KeyS", { shiftKey: true }],
    ["code", "KeyE", {}],
    ["link", "KeyK", {}],
    ["heading-1", "Digit1", { altKey: true }],
    ["heading-3", "Digit3", { altKey: true }],
    ["heading-4", "Digit4", { altKey: true }],
    ["heading-6", "Digit6", { altKey: true }],
    ["paragraph", "Digit0", { altKey: true }],
    ["bulleted", "Digit8", { shiftKey: true }],
    ["numbered", "Digit7", { shiftKey: true }],
    ["task", "Digit9", { shiftKey: true }],
    ["quote", "Period", { shiftKey: true }],
    ["code-block", "KeyC", { altKey: true }],
    ["undo", "KeyZ", {}],
    ["redo", "KeyZ", { shiftKey: true }],
  ])("bind %s by default", (id, code, modifiers) => {
    const event = key(code, { metaKey: true, ...modifiers })
    expect(findShortcutCommand(kit, event, "apple")?.id).toBe(id)
  })

  it("bind Mod+Y to redo outside Apple platforms only", () => {
    expect(
      findShortcutCommand(kit, key("KeyY", { ctrlKey: true }), "other")?.id
    ).toBe("redo")
    expect(
      findShortcutCommand(kit, key("KeyY", { metaKey: true }), "apple")
    ).toBeUndefined()
  })
})
