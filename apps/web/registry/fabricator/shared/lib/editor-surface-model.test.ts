import { describe, expect, it } from "vitest"

import {
  getFloatingLayout,
  getKeyboardBarLayout,
  getSegmentAtOffset,
  getSegmentStart,
  getShortcutPlatform,
  getToolbarFit,
  intersectRects,
  type ToolbarItem,
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

describe("intersectRects", () => {
  it("keeps the part two rects share", () => {
    expect(
      intersectRects(
        { left: 0, top: 0, right: 100, bottom: 100 },
        { left: 40, top: -20, right: 200, bottom: 60 }
      )
    ).toEqual({ left: 40, top: 0, right: 100, bottom: 60 })
  })

  it("keeps a caret, which has no width", () => {
    expect(
      intersectRects(
        { left: 10, top: 10, right: 10, bottom: 30 },
        { left: 0, top: 0, right: 100, bottom: 100 }
      )
    ).toEqual({ left: 10, top: 10, right: 10, bottom: 30 })
  })

  it("is null when they don't meet", () => {
    expect(
      intersectRects(
        { left: 0, top: 0, right: 100, bottom: 20 },
        { left: 0, top: 40, right: 100, bottom: 60 }
      )
    ).toBeNull()
  })
})

describe("floating layout", () => {
  const viewport = { left: 8, top: 8, right: 992, bottom: 592 }
  const bar = { width: 300, height: 40 }
  const place = (options: Partial<Parameters<typeof getFloatingLayout>[0]>) =>
    getFloatingLayout({
      anchor: { left: 400, top: 300, right: 500, bottom: 320 },
      size: bar,
      limits: [],
      screen: viewport,
      side: "top",
      align: "center",
      gap: 8,
      ...options,
    })

  it("centres over its anchor when there's room", () => {
    expect(place({})).toMatchObject({ left: 300, top: 252, side: "top" })
  })

  it("aligns with the anchor's start or end", () => {
    expect(place({ align: "start" }).left).toBe(400)
    expect(place({ align: "end" }).left).toBe(200)
  })

  it("slides inside the limit instead of crossing its edges", () => {
    const atStart = { left: 12, top: 300, right: 60, bottom: 320 }
    const atEnd = { left: 940, top: 300, right: 990, bottom: 320 }
    expect(place({ anchor: atStart }).left).toBe(8)
    expect(place({ anchor: atEnd }).left).toBe(692)
  })

  it("stays inside the first limit that fits it, then falls back", () => {
    const editor = { left: 200, top: 8, right: 620, bottom: 592 }
    const anchor = { left: 210, top: 300, right: 250, bottom: 320 }
    expect(place({ anchor, limits: [editor] }).left).toBe(200)
    const narrow = { ...editor, right: 400 }
    expect(place({ anchor, limits: [narrow] }).left).toBe(80)
  })

  it("flips to the other side when its own has no room", () => {
    const anchor = { left: 400, top: 30, right: 500, bottom: 50 }
    expect(place({ anchor })).toMatchObject({ top: 58, side: "bottom" })
  })

  it("prefers a side inside the first limit over its own side outside it", () => {
    const belowToolbar = { ...viewport, top: 100 }
    const anchor = { left: 400, top: 110, right: 500, bottom: 130 }
    expect(place({ anchor, limits: [belowToolbar] })).toMatchObject({
      top: 138,
      side: "bottom",
    })
  })

  it("leaves the first limit when neither of its sides fits", () => {
    const card = { left: 8, top: 100, right: 992, bottom: 180 }
    const anchor = { left: 400, top: 120, right: 500, bottom: 160 }
    expect(place({ anchor, limits: [card] })).toMatchObject({
      top: 72,
      side: "top",
    })
  })

  it("covers its anchor rather than leave the screen", () => {
    const all = { left: 8, top: 8, right: 992, bottom: 592 }
    expect(place({ anchor: all })).toMatchObject({ top: 8 })
  })

  it("shrinks a menu to the side with more room", () => {
    const anchor = { left: 400, top: 200, right: 500, bottom: 236 }
    expect(
      place({
        anchor,
        size: { width: 208, height: 500 },
        side: "bottom",
        align: "start",
        canShrink: true,
      })
    ).toMatchObject({ top: 244, side: "bottom", maxHeight: 348 })
  })

  it("shrinks upwards when that side has more room", () => {
    const anchor = { left: 400, top: 500, right: 500, bottom: 536 }
    expect(
      place({
        anchor,
        size: { width: 208, height: 500 },
        side: "bottom",
        canShrink: true,
      })
    ).toMatchObject({ top: 8, side: "top", maxHeight: 484 })
  })

  it("never grows past the screen", () => {
    expect(place({ size: { width: 1200, height: 40 } })).toMatchObject({
      left: 8,
      maxWidth: 984,
    })
  })
})

describe("toolbar fit", () => {
  // Two groups of three 36px commands, 2px apart, a 1px separator between.
  const group = (start: number): ToolbarItem[] =>
    [0, 38, 76].map((offset) => ({
      kind: "command",
      start: start + offset,
      end: start + offset + 36,
    }))
  const items: ToolbarItem[] = [
    ...group(0),
    { kind: "separator", start: 116, end: 117 },
    ...group(121),
  ]

  it("hides nothing when everything fits", () => {
    const fit = getToolbarFit({
      items,
      available: 233,
      availableWithMore: 190,
    })
    expect(fit).toEqual(items.map(() => false))
  })

  it("hides the commands that don't fit beside More, from the end", () => {
    const fit = getToolbarFit({
      items,
      available: 232,
      availableWithMore: 195,
    })
    expect(fit).toEqual([false, false, false, false, false, false, true])
  })

  it("hides a separator with nothing after it", () => {
    const fit = getToolbarFit({
      items,
      available: 150,
      availableWithMore: 120,
    })
    expect(fit).toEqual([false, false, false, true, true, true, true])
  })

  it("keeps other controls and hides the commands before them", () => {
    const withControl: ToolbarItem[] = [
      ...group(0),
      { kind: "separator", start: 116, end: 117 },
      { kind: "control", start: 121, end: 221 },
    ]
    const fit = getToolbarFit({
      items: withControl,
      available: 220,
      availableWithMore: 180,
    })
    expect(fit).toEqual([false, true, true, false, false])
  })

  it("has nothing to hide in an empty toolbar", () => {
    expect(
      getToolbarFit({ items: [], available: 0, availableWithMore: 0 })
    ).toEqual([])
  })
})
