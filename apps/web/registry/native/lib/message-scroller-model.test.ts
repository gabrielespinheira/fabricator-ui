import { describe, expect, it, vi } from "vitest"

import {
  createScrollerStore,
  getMessageIndex,
  getScrollableEdges,
  getVisibility,
} from "@/registry/native/lib/message-scroller-model"

describe("getScrollableEdges", () => {
  // The list is inverted: offset 0 is the newest message, at the bottom.
  const metrics = { contentSize: 1000, viewportSize: 400, threshold: 8 }

  it("has only older messages at the bottom", () => {
    expect(getScrollableEdges({ ...metrics, offset: 0 })).toEqual({
      start: true,
      end: false,
    })
  })

  it("has only newer messages at the top", () => {
    expect(getScrollableEdges({ ...metrics, offset: 600 })).toEqual({
      start: false,
      end: true,
    })
  })

  it("has both in the middle", () => {
    expect(getScrollableEdges({ ...metrics, offset: 300 })).toEqual({
      start: true,
      end: true,
    })
  })

  it("counts the threshold as the edge", () => {
    expect(getScrollableEdges({ ...metrics, offset: 8 }).end).toBe(false)
    expect(getScrollableEdges({ ...metrics, offset: 9 }).end).toBe(true)
  })

  it("has neither when everything fits", () => {
    expect(
      getScrollableEdges({
        offset: 0,
        contentSize: 100,
        viewportSize: 400,
        threshold: 8,
      })
    ).toEqual({ start: false, end: false })
  })
})

describe("getVisibility", () => {
  const items = [
    { messageId: "a", scrollAnchor: true },
    { messageId: "b", scrollAnchor: false },
    { messageId: "c", scrollAnchor: true },
    { messageId: "d", scrollAnchor: false },
  ]

  it("lists visible ids in reading order", () => {
    expect(getVisibility(items, new Set(["d", "b"])).visibleMessageIds).toEqual(
      ["b", "d"]
    )
  })

  it("takes the last anchor at or above what's visible", () => {
    expect(getVisibility(items, new Set(["c", "d"])).currentAnchorId).toBe("c")
    expect(getVisibility(items, new Set(["d"])).currentAnchorId).toBe("c")
    expect(getVisibility(items, new Set(["b"])).currentAnchorId).toBe("a")
  })

  it("has no anchor when nothing is visible", () => {
    expect(getVisibility(items, new Set())).toEqual({
      currentAnchorId: null,
      visibleMessageIds: [],
    })
  })
})

describe("getMessageIndex", () => {
  it("finds a message in the reversed list", () => {
    const items = [{ messageId: "a" }, { messageId: "b" }, {}]
    expect(getMessageIndex(items, "a")).toBe(2)
    expect(getMessageIndex(items, "b")).toBe(1)
    expect(getMessageIndex(items, "z")).toBe(-1)
  })
})

describe("createScrollerStore", () => {
  it("notifies only when the value changes", () => {
    const store = createScrollerStore(
      { start: false, end: false },
      (a, b) => a.start === b.start && a.end === b.end
    )
    const listener = vi.fn()
    store.subscribe(listener)
    store.set({ start: false, end: false })
    expect(listener).not.toHaveBeenCalled()
    store.set({ start: true, end: false })
    expect(listener).toHaveBeenCalledTimes(1)
    expect(store.get()).toEqual({ start: true, end: false })
  })
})
