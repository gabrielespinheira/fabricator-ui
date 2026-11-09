import { describe, expect, it } from "vitest"

import {
  getEffortHueShift,
  getEffortIndexAtPoint,
  getEffortKeyIndex,
} from "@/registry/fabricator/shared/ui/model-picker"

describe("getEffortHueShift", () => {
  it("warms from the first level's hue to the top level's", () => {
    expect(getEffortHueShift(0, 5)).toBe(0)
    expect(getEffortHueShift(4, 5)).toBe(60)
    expect(getEffortHueShift(2, 5)).toBe(30)
  })

  it("keeps a single level at the start", () => {
    expect(getEffortHueShift(0, 1)).toBe(0)
  })
})

describe("getEffortKeyIndex", () => {
  it("steps with the arrows and stops at the ends", () => {
    expect(getEffortKeyIndex("ArrowRight", 1, 4)).toBe(2)
    expect(getEffortKeyIndex("ArrowUp", 3, 4)).toBe(3)
    expect(getEffortKeyIndex("ArrowLeft", 0, 4)).toBe(0)
    expect(getEffortKeyIndex("ArrowDown", 2, 4)).toBe(1)
  })

  it("jumps to the ends with Home and End", () => {
    expect(getEffortKeyIndex("Home", 2, 4)).toBe(0)
    expect(getEffortKeyIndex("End", 0, 4)).toBe(3)
  })

  it("ignores other keys", () => {
    expect(getEffortKeyIndex("a", 2, 4)).toBeNull()
  })
})

describe("getEffortIndexAtPoint", () => {
  // A 124px track with a 24px thumb: level centres at 12, 62 and 112.
  const track = { left: 100, width: 124, thumb: 24, count: 3 }

  it("picks the level whose centre is nearest", () => {
    expect(getEffortIndexAtPoint({ ...track, x: 112 })).toBe(0)
    expect(getEffortIndexAtPoint({ ...track, x: 150 })).toBe(1)
    expect(getEffortIndexAtPoint({ ...track, x: 205 })).toBe(2)
  })

  it("clamps outside the track", () => {
    expect(getEffortIndexAtPoint({ ...track, x: 0 })).toBe(0)
    expect(getEffortIndexAtPoint({ ...track, x: 900 })).toBe(2)
  })
})
