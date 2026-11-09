import { describe, expect, it } from "vitest"

import {
  getKeyboardBarLayout,
  getSegmentAtOffset,
  getSegmentStart,
  getShortcutPlatform,
} from "./editor-surface-model"

const segments = [{ length: 3 }, { length: 1 }, { length: 0 }, { length: 2 }]

describe("segments", () => {
  it("adds up the lengths before a segment", () => {
    expect(getSegmentStart(segments, 0)).toBe(0)
    expect(getSegmentStart(segments, 3)).toBe(4)
  })

  it("finds the segment holding an offset, preferring the end of a text segment", () => {
    expect(getSegmentAtOffset(segments, 0)).toEqual({ index: 0, offset: 0 })
    expect(getSegmentAtOffset(segments, 3)).toEqual({ index: 0, offset: 3 })
    expect(getSegmentAtOffset(segments, 4)).toEqual({ index: 1, offset: 1 })
    expect(getSegmentAtOffset(segments, 5)).toEqual({ index: 3, offset: 1 })
  })

  it("clamps past the end and reports nothing for no segments", () => {
    expect(getSegmentAtOffset(segments, 99)).toEqual({ index: 3, offset: 2 })
    expect(getSegmentAtOffset([], 2)).toBeNull()
  })
})

describe("keyboard bar", () => {
  it("hides without focus, whatever the viewport says", () => {
    expect(
      getKeyboardBarLayout({
        isFocused: false,
        layoutHeight: 800,
        viewportHeight: 500,
        viewportOffsetTop: 40,
      })
    ).toEqual({ isVisible: false, bottom: 0 })
  })

  it("sits on the keyboard: the space between the visual viewport and the layout bottom", () => {
    expect(
      getKeyboardBarLayout({
        isFocused: true,
        layoutHeight: 800,
        viewportHeight: 460,
        viewportOffsetTop: 40,
      })
    ).toEqual({ isVisible: true, bottom: 300 })
  })

  it("hides when no virtual keyboard is open", () => {
    expect(
      getKeyboardBarLayout({
        isFocused: true,
        layoutHeight: 800,
        viewportHeight: 790,
        viewportOffsetTop: 0,
      })
    ).toEqual({ isVisible: false, bottom: 0 })
  })
})

describe("platform", () => {
  it("reads Apple platforms from the user agent data or platform string", () => {
    expect(getShortcutPlatform("MacIntel")).toBe("apple")
    expect(getShortcutPlatform("iPhone")).toBe("apple")
    expect(getShortcutPlatform("Win32")).toBe("other")
  })
})
