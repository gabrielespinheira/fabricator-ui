import { describe, expect, it } from "vitest"

import {
  countWords,
  DOCUMENT_TYPE,
  getDeleteInput,
  getEditorFonts,
  getEditorTheme,
  getMinimumContentHeight,
  getNativeKeyCommands,
  getShortcutKey,
  isPastedText,
  isSameRange,
  toNativeHexColor,
  withAlphaShare,
} from "./editor-native-model"

describe("DOCUMENT_TYPE", () => {
  it("matches the website's em steps of the body", () => {
    const { body, headings } = DOCUMENT_TYPE.default
    expect(headings.slice(0, 4)).toEqual([
      body * 1.875,
      body * 1.5,
      body * 1.25,
      body * 1.125,
    ])
    expect(DOCUMENT_TYPE.lg.headings[0]).toBe(18 * 1.875)
    expect(DOCUMENT_TYPE.sm.body).toBe(14)
  })

  it("gives the content six lines of height", () => {
    expect(getMinimumContentHeight("default")).toBe(Math.round(6 * 16 * 1.65))
  })
})

describe("toNativeHexColor", () => {
  it("reads hex in every length", () => {
    expect(toNativeHexColor("#171717")).toBe("#171717FF")
    expect(toNativeHexColor("#fff")).toBe("#FFFFFFFF")
    expect(toNativeHexColor("#0000")).toBe("#00000000")
    expect(toNativeHexColor("#17171780")).toBe("#17171780")
  })

  it("reads rgb() and rgba() with commas or spaces", () => {
    expect(toNativeHexColor("rgba(23, 23, 23, 0.12)")).toBe("#1717171F")
    expect(toNativeHexColor("rgb(255 0 0 / 50%)")).toBe("#FF000080")
    expect(toNativeHexColor("rgb(0, 128, 255)")).toBe("#0080FFFF")
  })

  it("gives null for what it can't read", () => {
    expect(toNativeHexColor("oklch(0.5 0.1 200)")).toBeNull()
    expect(toNativeHexColor(undefined)).toBeNull()
    expect(toNativeHexColor("#12345")).toBeNull()
  })

  it("scales an alpha", () => {
    expect(withAlphaShare("#171717FF", 0.2)).toBe("#17171733")
  })
})

describe("getEditorTheme", () => {
  it("names the cuts of the theme's family", () => {
    expect(getEditorFonts("Inter", "Menlo")).toEqual({
      regular: "Inter-Regular",
      medium: "Inter-Medium",
      semibold: "Inter-SemiBold",
      mono: "Menlo-Regular",
    })
    expect(getEditorFonts('"Geist", sans-serif', undefined).regular).toBe(
      "Geist-Regular"
    )
  })

  it("sizes the text by the Document role", () => {
    const colors = {
      foreground: "#000000FF",
      muted: "#000000FF",
      link: "#000000FF",
      codeBackground: "#000000FF",
      quoteBar: "#000000FF",
      border: "#000000FF",
      caret: "#000000FF",
      selection: "#000000FF",
      placeholder: "#000000FF",
      checkbox: "#000000FF",
      tableHeader: "#000000FF",
      inlineCode: "#000000FF",
      checkboxForeground: "#000000FF",
      checkboxBorder: "#000000FF",
    }
    const theme = getEditorTheme(
      "sm",
      getEditorFonts("Inter", "Menlo"),
      { keyword: "#FF0000FF" },
      colors
    )
    expect(theme.fontSize).toBe(14)
    expect(theme.lineHeight).toBe(1.6)
    expect(theme.headingSizes).toHaveLength(6)
    expect(theme.indentWidth).toBe(24.5)
    expect(theme.syntax).toEqual({ keyword: "#FF0000FF" })
  })
})

describe("getNativeKeyCommands", () => {
  const bindings = [
    { shortcut: "mod+y", command: "redo", platform: "other" as const },
    { shortcut: "mod+b", command: "bold" },
    { shortcut: "mod+shift+period", command: "quote" },
    { shortcut: "mod+alt+1", command: "heading-1" },
    { shortcut: "mod+z", command: "undo" },
    { shortcut: "mod+b", command: "bold" },
  ]

  it("turns shortcuts into the view's key commands", () => {
    expect(
      getNativeKeyCommands(bindings, "apple", {
        skip: ["undo"],
        extra: ["tab", "shift+tab", "escape"],
      })
    ).toEqual([
      { id: "mod+b", input: "b", modifiers: ["command"] },
      { id: "mod+shift+period", input: ".", modifiers: ["command", "shift"] },
      { id: "mod+alt+1", input: "1", modifiers: ["command", "alt"] },
      { id: "tab", input: "tab", modifiers: [] },
      { id: "shift+tab", input: "tab", modifiers: ["shift"] },
      { id: "escape", input: "escape", modifiers: [] },
    ])
  })

  it("keeps another platform's bindings out", () => {
    const ids = getNativeKeyCommands(bindings, "apple").map(
      (command) => command.id
    )
    expect(ids).not.toContain("mod+y")
    expect(getNativeKeyCommands(bindings, "other")[0]).toEqual({
      id: "mod+y",
      input: "y",
      modifiers: ["control"],
    })
  })

  it("reads a key command back as a key event", () => {
    expect(getShortcutKey("mod+shift+period", "apple")).toEqual({
      key: ".",
      modifiers: {
        metaKey: true,
        ctrlKey: false,
        altKey: false,
        shiftKey: true,
      },
    })
    expect(getShortcutKey("shift+tab", "apple")?.key).toBe("Tab")
    expect(getShortcutKey("mod+nothing", "apple")).toBeNull()
  })
})

describe("getDeleteInput", () => {
  it("leaves Backspace at a paragraph's start to the core", () => {
    expect(
      getDeleteInput("deleteBackward", { from: 4, to: 5 }, { start: 5, end: 5 })
    ).toEqual({ kind: "deleteBackward", caret: 5 })
    expect(
      getDeleteInput("deleteBackward", { from: 0, to: 0 }, { start: 0, end: 0 })
    ).toEqual({ kind: "deleteBackward", caret: 0 })
  })

  it("removes a selection as it is", () => {
    expect(
      getDeleteInput("deleteBackward", { from: 2, to: 9 }, { start: 2, end: 9 })
    ).toEqual({ kind: "replace", from: 2, to: 9, text: "" })
  })

  it("removes a longer range from a caret as it is", () => {
    expect(
      getDeleteInput("deleteBackward", { from: 1, to: 6 }, { start: 6, end: 6 })
    ).toEqual({ kind: "replace", from: 1, to: 6, text: "" })
  })

  it("finds the caret without a reported selection", () => {
    expect(getDeleteInput("deleteForward", { from: 3, to: 4 }, null)).toEqual({
      kind: "deleteForward",
      caret: 3,
    })
  })
})

describe("events", () => {
  it("compares ranges either way round", () => {
    expect(isSameRange({ start: 3, end: 1 }, { start: 1, end: 3 })).toBe(true)
    expect(isSameRange(null, null)).toBe(true)
    expect(isSameRange({ start: 0, end: 0 }, null)).toBe(false)
  })

  it("tells a paste from typing", () => {
    expect(isPastedText("a\nb")).toBe(true)
    expect(isPastedText("word")).toBe(false)
  })

  it("counts words as the website does", () => {
    expect(countWords("One two\u2028three \uFFFC - 4")).toBe(4)
  })
})
