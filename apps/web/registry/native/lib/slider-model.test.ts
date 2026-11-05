import { describe, expect, it } from "vitest"

import {
  getClosestThumb,
  getNotchPitch,
  getThumbCenter,
  getThumbOffset,
  getValueAtPosition,
  resolveThumbCollision,
  roundValueToStep,
  sameValues,
  stepThumb,
  toSliderValues,
} from "@/registry/native/lib/slider-model"

const geometry = { min: 0, max: 100, length: 216, thumbSize: 16 }
const range = { min: 0, max: 100, step: 1, minStepsBetweenValues: 0 }

describe("roundValueToStep", () => {
  it("rounds to the nearest step counted from min", () => {
    expect(roundValueToStep(12, 5, 0)).toBe(10)
    expect(roundValueToStep(13, 5, 0)).toBe(15)
    expect(roundValueToStep(12, 5, 2)).toBe(12)
  })

  it("keeps fractional steps free of float noise", () => {
    expect(roundValueToStep(0.30000000000000004, 0.1, 0)).toBe(0.3)
    expect(roundValueToStep(0.7000000000000001, 0.1, 0)).toBe(0.7)
  })
})

describe("toSliderValues", () => {
  it("makes one thumb from a number", () => {
    expect(toSliderValues(40)).toEqual([40])
  })

  it("sorts a range without touching the input", () => {
    const input = [70, 10]
    expect(toSliderValues(input)).toEqual([10, 70])
    expect(input).toEqual([70, 10])
  })
})

describe("thumb geometry", () => {
  it("insets the thumb so its edge meets the control's edge", () => {
    expect(getThumbOffset(0, geometry)).toBe(0)
    expect(getThumbOffset(100, geometry)).toBe(200)
    expect(getThumbOffset(50, geometry)).toBe(100)
    expect(getThumbCenter(50, geometry)).toBe(108)
  })

  it("stays at the start before the control is measured", () => {
    expect(getThumbOffset(50, { ...geometry, length: 0 })).toBe(0)
  })

  it("handles an empty scale", () => {
    expect(getThumbOffset(5, { ...geometry, min: 5, max: 5 })).toBe(0)
  })
})

describe("getValueAtPosition", () => {
  const options = { ...geometry, step: 1 }

  it("reads the value under the thumb's centre", () => {
    expect(getValueAtPosition(8, options)).toBe(0)
    expect(getValueAtPosition(108, options)).toBe(50)
    expect(getValueAtPosition(208, options)).toBe(100)
  })

  it("clamps past either end", () => {
    expect(getValueAtPosition(-40, options)).toBe(0)
    expect(getValueAtPosition(900, options)).toBe(100)
  })

  it("lands on steps", () => {
    expect(getValueAtPosition(112, { ...options, step: 10 })).toBe(50)
    expect(getValueAtPosition(130, { ...options, step: 10 })).toBe(60)
  })

  it("never rounds past max", () => {
    expect(getValueAtPosition(208, { ...options, max: 95, step: 10 })).toBe(95)
  })

  it("gives min before the control is measured", () => {
    expect(getValueAtPosition(50, { ...options, length: 0 })).toBe(0)
  })
})

describe("getClosestThumb", () => {
  it("picks the nearest thumb", () => {
    expect(getClosestThumb([10, 50, 90], 40)).toBe(1)
    expect(getClosestThumb([10, 50, 90], 12)).toBe(0)
  })

  it("picks the thumb that can move when two share a value", () => {
    expect(getClosestThumb([50, 50], 80)).toBe(1)
    expect(getClosestThumb([50, 50], 20)).toBe(0)
  })
})

describe("resolveThumbCollision", () => {
  it("moves a single thumb", () => {
    expect(resolveThumbCollision("push", [10], [10], 0, 40, range)).toEqual({
      values: [40],
      thumbIndex: 0,
    })
  })

  it("pushes neighbours by default, without restoring them on the way back", () => {
    const pushed = resolveThumbCollision(
      "push",
      [20, 40],
      [20, 40],
      0,
      60,
      range
    )
    expect(pushed).toEqual({ values: [60, 60], thumbIndex: 0 })
  })

  it("restores a pushed neighbour towards where the drag began", () => {
    const back = resolveThumbCollision("push", [60, 60], [20, 40], 0, 30, range)
    expect(back.values).toEqual([30, 40])
  })

  it("keeps the minimum distance when pushing", () => {
    const pushed = resolveThumbCollision("push", [20, 40], [20, 40], 0, 100, {
      ...range,
      minStepsBetweenValues: 10,
    })
    expect(pushed.values).toEqual([90, 100])
  })

  it("stops at a neighbour with none", () => {
    expect(
      resolveThumbCollision("none", [20, 40], [20, 40], 0, 70, range)
    ).toEqual({ values: [40, 40], thumbIndex: 0 })
  })

  it("hands the drag to the neighbour with swap", () => {
    const swapped = resolveThumbCollision(
      "swap",
      [20, 40],
      [20, 40],
      0,
      70,
      range
    )
    expect(swapped).toEqual({ values: [40, 70], thumbIndex: 1 })
  })

  it("moves freely with swap before reaching a neighbour", () => {
    expect(
      resolveThumbCollision("swap", [20, 40], [20, 40], 0, 30, range)
    ).toEqual({ values: [30, 40], thumbIndex: 0 })
  })
})

describe("stepThumb", () => {
  it("steps and clamps a thumb", () => {
    expect(stepThumb([50], 0, 1, "push", range)).toEqual([51])
    expect(stepThumb([100], 0, 1, "push", range)).toEqual([100])
    expect(stepThumb([0], 0, -1, "push", range)).toEqual([0])
  })

  it("adds fractional steps cleanly", () => {
    const fractional = { ...range, max: 1, step: 0.1 }
    expect(stepThumb([0.2], 0, 0.1, "push", fractional)).toEqual([0.3])
  })

  it("respects collisions", () => {
    expect(stepThumb([40, 41], 0, 5, "none", range)).toEqual([41, 41])
    expect(stepThumb([40, 41], 0, 5, "push", range)).toEqual([45, 45])
  })
})

describe("sameValues", () => {
  it("compares element by element", () => {
    expect(sameValues([1, 2], [1, 2])).toBe(true)
    expect(sameValues([1, 2], [1, 3])).toBe(false)
    expect(sameValues([1], [1, 2])).toBe(false)
  })
})

describe("getNotchPitch", () => {
  it("rises from 0.8 to 1.4 along the scale, as the website's does", () => {
    expect(getNotchPitch(0, { min: 0, max: 100 })).toBeCloseTo(0.8)
    expect(getNotchPitch(50, { min: 0, max: 100 })).toBeCloseTo(1.1)
    expect(getNotchPitch(100, { min: 0, max: 100 })).toBeCloseTo(1.4)
  })

  it("measures from min", () => {
    expect(getNotchPitch(15, { min: 10, max: 20 })).toBeCloseTo(1.1)
  })

  it("stays in range for a value outside the scale", () => {
    expect(getNotchPitch(-5, { min: 0, max: 100 })).toBeCloseTo(0.8)
    expect(getNotchPitch(200, { min: 0, max: 100 })).toBeCloseTo(1.4)
  })

  it("takes the middle of an empty scale", () => {
    expect(getNotchPitch(5, { min: 5, max: 5 })).toBeCloseTo(1.1)
  })
})
