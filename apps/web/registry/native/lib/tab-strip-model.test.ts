import { describe, expect, it } from "vitest"

import {
  getTabScrollOffset,
  orderTabs,
} from "@/registry/native/lib/tab-strip-model"

describe("getTabScrollOffset", () => {
  const view = { scrollOffset: 100, viewportWidth: 300 }

  it("leaves a tab already in view", () => {
    expect(getTabScrollOffset({ start: 120, end: 260, ...view })).toBeNull()
    expect(getTabScrollOffset({ start: 100, end: 400, ...view })).toBeNull()
  })

  it("scrolls back to a tab before the view", () => {
    expect(getTabScrollOffset({ start: 40, end: 180, ...view })).toBe(40)
  })

  it("scrolls on to a tab past the view", () => {
    expect(getTabScrollOffset({ start: 350, end: 490, ...view })).toBe(190)
  })

  it("waits until the strip is measured", () => {
    expect(
      getTabScrollOffset({
        start: 350,
        end: 490,
        scrollOffset: 0,
        viewportWidth: 0,
      })
    ).toBeNull()
  })
})

describe("orderTabs", () => {
  it("lists tabs by their position in the strip", () => {
    const tabs = new Map([
      ["b", { index: 1 }],
      ["c", { index: 2 }],
      ["a", { index: 0 }],
    ])
    expect(orderTabs(tabs).map((tab) => tab.value)).toEqual(["a", "b", "c"])
  })
})
