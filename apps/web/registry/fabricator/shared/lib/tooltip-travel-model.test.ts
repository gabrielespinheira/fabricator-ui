import { describe, expect, it } from "vitest"

import { getTooltipTravel, shouldTooltipTravel } from "./tooltip-travel-model"

const box = (left: number, top: number, width: number, height: number) => ({
  left,
  top,
  width,
  height,
})

describe("shouldTooltipTravel", () => {
  it("travels from a tooltip that is showing or just closed", () => {
    expect(shouldTooltipTravel({ hiddenAt: null }, 1000)).toBe(true)
    expect(shouldTooltipTravel({ hiddenAt: 900 }, 1000)).toBe(true)
  })

  it("appears in place after a pause, or when there was none", () => {
    expect(shouldTooltipTravel({ hiddenAt: 500 }, 1000)).toBe(false)
    expect(shouldTooltipTravel(null, 1000)).toBe(false)
  })
})

describe("getTooltipTravel", () => {
  it("starts at the old tooltip's centre and size", () => {
    const travel = getTooltipTravel(box(0, 0, 60, 24), box(100, 0, 80, 24))
    expect(travel).toEqual({ x: -100, y: 0, width: 60, height: 24 })
    // Drawn at its new left edge with the old width, then shifted by x, its
    // centre sits on the old one's.
    expect(100 + travel.x + travel.width / 2).toBe(30)
  })

  it("follows a change of height too", () => {
    const travel = getTooltipTravel(box(0, 40, 60, 40), box(0, 0, 60, 24))
    expect(0 + travel.y + travel.height / 2).toBe(60)
  })
})
