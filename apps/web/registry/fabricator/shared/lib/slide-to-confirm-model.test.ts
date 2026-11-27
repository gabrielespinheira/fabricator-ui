import { describe, expect, it } from "vitest"

import { getSlideProgress, shouldConfirmSlide } from "./slide-to-confirm-model"

describe("getSlideProgress", () => {
  it("follows the drag along the track", () => {
    expect(getSlideProgress(0, 200)).toBe(0)
    expect(getSlideProgress(100, 200)).toBe(0.5)
    expect(getSlideProgress(200, 200)).toBe(1)
  })

  it("gives like rubber past either end, up to a limit", () => {
    expect(getSlideProgress(240, 200)).toBeCloseTo(1.04)
    expect(getSlideProgress(220, 200)).toBeCloseTo(1.025)
    expect(getSlideProgress(-20, 200)).toBeCloseTo(-0.025)
    expect(getSlideProgress(-400, 200)).toBeCloseTo(-0.04)
  })

  it("stays put on a track with no room", () => {
    expect(getSlideProgress(50, 0)).toBe(0)
  })
})

describe("shouldConfirmSlide", () => {
  it("confirms once the thumb has travelled most of the way", () => {
    expect(shouldConfirmSlide(0.89)).toBe(false)
    expect(shouldConfirmSlide(0.9)).toBe(true)
  })
})
