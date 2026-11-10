import { describe, expect, it } from "vitest"

import { getScrollWheelIndex, getWheelIndex } from "./time-wheel-model"

describe("native wheel positions", () => {
  it("finds the nearest stepped value", () => {
    expect(getWheelIndex([0, 15, 30, 45], 18)).toBe(1)
  })
  it("snaps and clamps bounced scroll offsets", () => {
    expect(getScrollWheelIndex(51, 32, 60)).toBe(2)
    expect(getScrollWheelIndex(-20, 32, 60)).toBe(0)
    expect(getScrollWheelIndex(9999, 32, 60)).toBe(59)
  })
})
