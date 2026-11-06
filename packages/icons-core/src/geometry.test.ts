import { describe, expect, it } from "vitest"

import { getBounds } from "./geometry"

describe("getBounds", () => {
  it("measures shapes from their own attributes", () => {
    expect(
      getBounds([
        ["rect", { x: "3", y: "4", width: "18", height: "16" }],
        ["circle", { cx: "12", cy: "12", r: "10" }],
      ])
    ).toEqual({ minX: 2, minY: 2, maxX: 22, maxY: 22 })
  })

  it("measures lines and point lists", () => {
    expect(
      getBounds([
        ["line", { x1: "5", y1: "6", x2: "19", y2: "7" }],
        ["polyline", { points: "4 9 12 17 20 9" }],
      ])
    ).toEqual({ minX: 4, minY: 6, maxX: 20, maxY: 17 })
  })

  it("measures the extremes of curves, not their control points", () => {
    // A quarter circle from (2,12) to (12,2) bulges to x=2, y=2 only at its ends;
    // its control point sits at (2,2) but the curve never reaches beyond it.
    const bounds = getBounds([["path", { d: "M2 12a10 10 0 0 1 10-10" }]])
    expect(bounds.minX).toBeCloseTo(2)
    expect(bounds.minY).toBeCloseTo(2)
    expect(bounds.maxX).toBeCloseTo(12)
    expect(bounds.maxY).toBeCloseTo(12)
  })

  it("follows relative path commands", () => {
    expect(getBounds([["path", { d: "m6 9 6 6 6-6" }]])).toEqual({
      minX: 6,
      minY: 9,
      maxX: 18,
      maxY: 15,
    })
  })
})
