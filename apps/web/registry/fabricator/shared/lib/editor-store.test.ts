import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { resolveKits, starterKit } from "./editor-kit"
import { createBlock, type EditorDocument } from "./editor-model"
import {
  createEditorStore,
  useEditorBlock,
  useEditorSelector,
  useEditorSnapshot,
  type EditorStore,
} from "./editor-store"
import { createEditorState } from "./editor-transaction"

const kit = resolveKits([starterKit])

const document: EditorDocument = {
  frontmatter: null,
  blocks: [
    createBlock({ id: "a", type: "paragraph" }, "Hello"),
    createBlock({ id: "b", type: "paragraph" }, "World"),
  ],
}

function createStore(platform: "apple" | "other" = "apple") {
  let time = 0
  let counter = 0
  return createEditorStore({
    state: createEditorState(document, {
      anchor: { blockId: "a", offset: 5 },
      focus: { blockId: "a", offset: 5 },
    }),
    kit,
    platform,
    now: () => (time += 10),
    createId: () => `n${(counter += 1)}`,
  })
}

const modifiers = {
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
}

describe("store", () => {
  it("applies inputs and tells subscribers", () => {
    const store = createStore()
    let calls = 0
    const unsubscribe = store.subscribe(() => {
      calls += 1
    })
    expect(store.dispatch({ kind: "replace", from: 5, to: 5, text: "!" })).toBe(
      true
    )
    expect(calls).toBe(1)
    expect(store.dispatch({ kind: "focus" })).toBe(false)
    expect(calls).toBe(1)
    unsubscribe()
    store.dispatch({ kind: "replace", from: 6, to: 6, text: "!" })
    expect(calls).toBe(1)
  })

  it("applies an update from outside the input path, such as a table editor", () => {
    const store = createStore()
    let calls = 0
    store.subscribe(() => {
      calls += 1
    })
    expect(store.apply(() => null)).toBe(false)
    expect(
      store.apply((state, now) => {
        expect(now).toBeGreaterThan(0)
        return { ...state, selection: null }
      })
    ).toBe(true)
    expect(store.getState().selection).toBeNull()
    expect(calls).toBe(1)
  })

  it("inserts a table from the starter kit", () => {
    const store = createStore()
    expect(store.runCommand("table")).toBe(true)
    expect(store.getState().document.blocks.map((block) => block.type)).toEqual(
      ["paragraph", "table", "paragraph"]
    )
  })

  it("keeps untouched blocks when one changes", () => {
    const store = createStore()
    const before = store.getState().document.blocks[1]
    store.dispatch({ kind: "replace", from: 5, to: 5, text: "!" })
    expect(store.getState().document.blocks[1]).toBe(before)
  })

  it("runs shortcuts from key inputs, by code or derived from the key", () => {
    const store = createStore()
    store.dispatch({ kind: "select", anchor: 0, focus: 5 })
    expect(
      store.dispatch({
        kind: "key",
        key: "b",
        code: "KeyB",
        modifiers: { ...modifiers, metaKey: true },
      })
    ).toBe(true)
    expect(store.getState().document.blocks[0].content[0].marks).toEqual([
      { type: "bold" },
    ])
    expect(
      store.dispatch({
        kind: "key",
        key: "z",
        modifiers: { ...modifiers, metaKey: true },
      })
    ).toBe(true)
    expect(store.getState().document.blocks[0].content[0].marks).toBeUndefined()
  })

  it("leaves unhandled keys to the platform", () => {
    const store = createStore()
    expect(store.dispatch({ kind: "key", key: "Tab", modifiers })).toBe(false)
  })

  it("runs commands with arguments and refuses ones that can't run", () => {
    const store = createStore()
    store.dispatch({ kind: "select", anchor: 0, focus: 5 })
    expect(store.runCommand("link", { href: "/x" })).toBe(true)
    expect(store.getState().document.blocks[0].content[0].marks).toEqual([
      { type: "link", attrs: { href: "/x" } },
    ])
    expect(store.runCommand("missing")).toBe(false)
    expect(createStore().runCommand("redo")).toBe(false)
  })

  it("replaces the document without history, keeping a selection that still fits", () => {
    const store = createStore()
    store.dispatch({ kind: "replace", from: 5, to: 5, text: "!" })
    store.setDocument({
      frontmatter: null,
      blocks: [createBlock({ id: "a", type: "paragraph" }, "Hi")],
    })
    const state = store.getState()
    expect(state.history.undo).toHaveLength(0)
    expect(state.selection).toEqual({
      anchor: { blockId: "a", offset: 2 },
      focus: { blockId: "a", offset: 2 },
    })
    store.setDocument({ frontmatter: null, blocks: [] })
    expect(store.getState().selection).toBeNull()
    expect(store.getState().document.blocks).toHaveLength(1)
  })
})

describe("hooks", () => {
  function render(store: EditorStore) {
    const selectText = (state: ReturnType<EditorStore["getState"]>) =>
      state.document.blocks.length
    function Probe() {
      const snapshot = useEditorSnapshot(store)
      const block = useEditorBlock(store, "b")
      const count = useEditorSelector(store, selectText)
      return createElement(
        "p",
        null,
        `${snapshot.isCollapsed ? "caret" : "range"} ${block?.content[0].text ?? ""} ${count}`
      )
    }
    return renderToStaticMarkup(createElement(Probe))
  }

  it("read the snapshot, a block and a selected value", () => {
    expect(render(createStore())).toBe("<p>caret World 2</p>")
  })
})
