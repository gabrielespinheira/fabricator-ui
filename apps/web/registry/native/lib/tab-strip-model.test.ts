import { describe, expect, it } from "vitest"

import {
  describeTabCount,
  describeTabPosition,
  getTabCountLabel,
  getTabScrollOffset,
  isCompactTabStrip,
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

describe("isCompactTabStrip", () => {
  it("folds the strip into a switcher on a phone", () => {
    expect(isCompactTabStrip(390)).toBe(true)
  })

  it("keeps every tab in view from a tablet up", () => {
    expect(isCompactTabStrip(820)).toBe(false)
    expect(isCompactTabStrip(1366)).toBe(false)
  })
})

describe("the switcher's count", () => {
  it("shows how many tabs are open, up to 99", () => {
    expect(getTabCountLabel(0)).toBe("0")
    expect(getTabCountLabel(7)).toBe("7")
    expect(getTabCountLabel(99)).toBe("99")
    expect(getTabCountLabel(100)).toBe("99+")
  })

  it("says it in words for screen readers", () => {
    expect(describeTabCount(1)).toBe("1 tab")
    expect(describeTabCount(3)).toBe("3 tabs")
  })

  it("names where a tab sits", () => {
    expect(describeTabPosition("Calendar", 1, 3)).toBe("Calendar, tab 2 of 3")
  })
})
