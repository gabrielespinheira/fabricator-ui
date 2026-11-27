import { describe, expect, it } from "vitest"

import {
  getCanvasKeyAction,
  getNearestInDirection,
  getNudge,
  isTypingTarget,
} from "./canvas-keyboard"

function key(
  value: string,
  modifiers: Partial<{
    metaKey: boolean
    ctrlKey: boolean
    shiftKey: boolean
    altKey: boolean
  }> = {}
) {
  return {
    key: value,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...modifiers,
  }
}

const mac = { isMac: true }
const windows = { isMac: false }

describe("getCanvasKeyAction", () => {
  it("moves focus with arrows and the selection with Alt + arrows", () => {
    expect(getCanvasKeyAction(key("ArrowLeft"), mac)).toEqual({
      type: "focus",
      direction: "left",
    })
    expect(
      getCanvasKeyAction(key("ArrowUp", { altKey: true, shiftKey: true }), mac)
    ).toEqual({
      type: "move",
      direction: "up",
      isLarge: true,
    })
  })

  it("uses ⌘ on macOS and Ctrl elsewhere", () => {
    expect(getCanvasKeyAction(key("z", { metaKey: true }), mac)).toEqual({
      type: "undo",
    })
    expect(getCanvasKeyAction(key("z", { ctrlKey: true }), mac)).toBeNull()
    expect(
      getCanvasKeyAction(key("Z", { ctrlKey: true, shiftKey: true }), windows)
    ).toEqual({ type: "redo" })
    expect(getCanvasKeyAction(key("y", { ctrlKey: true }), windows)).toEqual({
      type: "redo",
    })
  })

  it("maps the single keys", () => {
    expect(getCanvasKeyAction(key("Enter"), mac)).toEqual({ type: "open" })
    expect(getCanvasKeyAction(key(" "), mac)).toEqual({ type: "toggle-select" })
    expect(getCanvasKeyAction(key("c"), mac)).toEqual({ type: "connect" })
    expect(getCanvasKeyAction(key("Backspace"), mac)).toEqual({
      type: "delete",
    })
    expect(getCanvasKeyAction(key("!", { shiftKey: true }), mac)).toEqual({
      type: "fit-view",
    })
    expect(getCanvasKeyAction(key("0", { metaKey: true }), mac)).toEqual({
      type: "zoom-reset",
    })
    expect(
      getCanvasKeyAction(key("g", { metaKey: true, shiftKey: true }), mac)
    ).toEqual({ type: "ungroup" })
    expect(getCanvasKeyAction(key("ContextMenu"), mac)).toEqual({
      type: "menu",
    })
    expect(getCanvasKeyAction(key("F10", { shiftKey: true }), mac)).toEqual({
      type: "menu",
    })
  })

  it("leaves other keys alone", () => {
    expect(getCanvasKeyAction(key("q"), mac)).toBeNull()
    expect(getCanvasKeyAction(key("c", { altKey: true }), mac)).toBeNull()
  })
})

describe("getNearestInDirection", () => {
  const from = { x: 0, y: 0, width: 100, height: 40 }
  const candidates = [
    { id: "ahead", rect: { x: 300, y: 0, width: 100, height: 40 } },
    { id: "diagonal", rect: { x: 200, y: 150, width: 100, height: 40 } },
    { id: "behind", rect: { x: -300, y: 0, width: 100, height: 40 } },
    { id: "below", rect: { x: 0, y: 200, width: 100, height: 40 } },
  ]

  it("prefers a node straight ahead", () => {
    expect(getNearestInDirection(from, candidates, "right")).toBe("ahead")
    expect(getNearestInDirection(from, candidates, "left")).toBe("behind")
    expect(getNearestInDirection(from, candidates, "down")).toBe("below")
  })

  it("returns null when nothing is that way", () => {
    expect(getNearestInDirection(from, candidates, "up")).toBeNull()
  })
})

describe("getNudge", () => {
  it("moves a grid step, ten with Shift, eight px without a grid", () => {
    expect(getNudge("left", false, 20)).toEqual({ x: -20, y: 0 })
    expect(getNudge("down", true, 20)).toEqual({ x: 0, y: 200 })
    expect(getNudge("up", false, 0)).toEqual({ x: 0, y: -8 })
  })
})

describe("isTypingTarget", () => {
  it("recognises text fields", () => {
    expect(isTypingTarget({ tagName: "INPUT" })).toBe(true)
    expect(isTypingTarget({ tagName: "DIV", isContentEditable: true })).toBe(
      true
    )
    expect(isTypingTarget({ tagName: "DIV" })).toBe(false)
  })
})
