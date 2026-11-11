import { describe, expect, it } from "vitest"

import { isMarkActive, toggleMark } from "./editor-commands"
import { handleInput } from "./editor-input"
import {
  blockPrefixRule,
  defineEditorKit,
  defineMark,
  inlineWrapRule,
  resolveKits,
  starterKit,
} from "./editor-kit"
import { createBlock } from "./editor-model"
import { createEditorState } from "./editor-transaction"

const highlight = defineEditorKit({
  name: "highlight",
  marks: [defineMark({ type: "highlight", markdown: { delimiter: "==" } })],
  inputRules: [inlineWrapRule("==", "highlight")],
  commands: [
    {
      id: "highlight",
      label: "Highlight",
      shortcut: "mod+shift+h",
      surfaces: ["toolbar", "bubble"],
      isActive: isMarkActive("highlight"),
      run: toggleMark("highlight"),
    },
    { id: "bold", label: "Strong", run: () => null },
  ],
})

describe("kits", () => {
  it("fill in what a definition leaves out", () => {
    expect(defineEditorKit({ name: "empty" })).toEqual({
      name: "empty",
      marks: [],
      blocks: [],
      commands: [],
      inputRules: [],
      shortcuts: [],
    })
    expect(defineMark({ type: "x" }).inclusive).toBe(true)
    expect(defineMark({ type: "x", inclusive: false }).inclusive).toBe(false)
  })

  it("merge commands by id with later kits winning, in first-seen order", () => {
    const runtime = resolveKits([starterKit, highlight])
    const ids = runtime.commands.map((command) => command.id)
    expect(ids.indexOf("bold")).toBe(0)
    expect(ids.at(-1)).toBe("highlight")
    expect(runtime.getCommand("bold")?.label).toBe("Strong")
    expect(
      runtime.getCommandsFor("toolbar").map((command) => command.id)
    ).toContain("highlight")
    expect(runtime.marks.get("highlight")?.inclusive).toBe(true)
    expect(runtime.marks.get("link")?.inclusive).toBe(false)
    expect(runtime.shortcuts).toContainEqual({
      shortcut: "mod+shift+h",
      command: "highlight",
    })
  })

  it("run a kit's own input rule", () => {
    const runtime = resolveKits([starterKit, highlight])
    let state = createEditorState(
      {
        frontmatter: null,
        blocks: [createBlock({ id: "a", type: "paragraph" })],
      },
      {
        anchor: { blockId: "a", offset: 0 },
        focus: { blockId: "a", offset: 0 },
      }
    )
    for (const [index, character] of [..."==hi=="].entries()) {
      state = handleInput(
        state,
        { kind: "replace", from: index, to: index, text: character },
        { kit: runtime, now: index }
      )
    }
    expect(state.document.blocks[0].content).toEqual([
      { text: "hi", marks: [{ type: "highlight" }] },
    ])
  })
})

describe("rules", () => {
  it("anchor block prefixes to the whole text before the caret", () => {
    const rule = blockPrefixRule("1. ", "numbered")
    expect(rule.pattern.test("1. ")).toBe(true)
    expect(rule.pattern.test("1x ")).toBe(false)
    expect(rule.pattern.test("a1. ")).toBe(false)
    expect(rule).toMatchObject({ trigger: "text", from: ["paragraph"] })
  })

  it("read attrs from a pattern's groups", () => {
    const rule = blockPrefixRule(/(\d+)\) /g, "numbered", {
      attrs: (match) => ({ number: Number(match[1]) }),
    })
    const match = rule.pattern.exec("7) ")
    expect(match && rule.getAttrs(match)).toEqual({ number: 7 })
    expect(rule.pattern.flags).not.toContain("g")
  })
})
