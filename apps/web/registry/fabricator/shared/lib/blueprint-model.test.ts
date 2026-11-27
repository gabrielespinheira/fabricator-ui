import { describe, expect, it } from "vitest"

import {
  BLUEPRINT_END,
  BLUEPRINT_HOLD,
  createCubicBezier,
  formatBlueprintClock,
  formatBlueprintPoint,
  formatBlueprintSize,
  getBlueprintDuration,
  getBlueprintFrame,
  getBlueprintLength,
  getDottedDashArray,
  getFieldDotIntensity,
  getFieldDots,
  getHoldReticle,
  getHoldScan,
  getOutlineHalfPaths,
  getOverlayInsets,
  getPartWindows,
  getRoundedRectPath,
  selectBlueprintParts,
  type BlueprintPartInput,
} from "./blueprint-model"

describe("getBlueprintDuration", () => {
  it("is a multiple of the reveal role, scaled by the motion scale", () => {
    expect(getBlueprintDuration("700ms", "")).toBeCloseTo(1610)
    expect(getBlueprintDuration("0.7s", "2")).toBeCloseTo(3220)
  })

  it("is 0 when motion is off or the role is unreadable", () => {
    expect(getBlueprintDuration("0ms", "1")).toBe(0)
    expect(getBlueprintDuration("", "1")).toBe(0)
  })
})

describe("getBlueprintLength", () => {
  it("lasts until the overlay has cleaned up", () => {
    expect(getBlueprintLength(1600)).toBeCloseTo(1600 * BLUEPRINT_END)
  })
})

describe("createCubicBezier", () => {
  it("pins the ends and follows the curve between", () => {
    const ease = createCubicBezier(0.16, 1, 0.3, 1)
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeGreaterThan(0.9)
  })

  it("is linear for a straight curve", () => {
    expect(createCubicBezier(0.25, 0.25, 0.75, 0.75)(0.3)).toBeCloseTo(0.3, 3)
  })
})

describe("getDottedDashArray", () => {
  it("hides the stroke before it starts", () => {
    expect(getDottedDashArray(100, 5, 0)).toBeNull()
  })

  it("shows one dot per gap drawn so far", () => {
    expect(getDottedDashArray(100, 5, 0.1)).toBe("0 5 0 5 0 110")
  })

  it("shows every dot once drawn", () => {
    const dashes = getDottedDashArray(20, 5, 1)
    expect(dashes?.split(" ").filter((value) => value === "0")).toHaveLength(5)
  })
})

describe("getRoundedRectPath", () => {
  it("clamps the radius to half the shorter side", () => {
    const path = getRoundedRectPath({ x: 0, y: 0, width: 20, height: 10 }, 40)
    expect(path).toContain("A5.00 5.00")
  })
})

describe("getOutlineHalfPaths", () => {
  it("draws both halves from the top centre to the bottom centre", () => {
    const [right, left] = getOutlineHalfPaths(
      { x: 0, y: 0, width: 100, height: 60 },
      10
    )
    expect(right.startsWith("M50.00 0.00")).toBe(true)
    expect(left.startsWith("M50.00 0.00")).toBe(true)
    expect(right.endsWith("H50.00")).toBe(true)
    expect(left.endsWith("H50.00")).toBe(true)
    expect(right).toContain("100.00")
    expect(left).not.toContain("100.00")
  })
})

describe("getFieldDots", () => {
  it("covers the element and its margin on the grid", () => {
    const { dots } = getFieldDots(30, 30, { margin: 15, spacing: 15, seed: 1 })
    const xs = new Set(dots.map((dot) => dot.x))
    expect([...xs].sort((a, b) => a - b)).toEqual([-15, 0, 15, 30, 45])
  })

  it("fades dots out towards the margin edge", () => {
    const { dots } = getFieldDots(30, 30, { margin: 30, spacing: 15, seed: 1 })
    const inside = dots.find((dot) => dot.x === 15 && dot.y === 15)
    const outer = dots.find((dot) => dot.x === -30 && dot.y === 15)
    expect(inside?.edge).toBe(1)
    expect(inside?.isInside).toBe(true)
    expect(outer?.edge).toBe(0)
  })

  it("is the same for the same seed", () => {
    const first = getFieldDots(60, 60, { margin: 30, spacing: 15, seed: 4 })
    const second = getFieldDots(60, 60, { margin: 30, spacing: 15, seed: 4 })
    expect(first).toEqual(second)
  })
})

describe("getFieldDotIntensity", () => {
  const dot = {
    x: 0,
    y: 0,
    distance: 10,
    edge: 1,
    isInside: true,
    speed: 0.1,
    phase: 0,
    trail: 60,
  }

  it("lights a dot as the ripple passes it", () => {
    const frame = getBlueprintFrame(0.06, 100, 1600)
    const intensity = getFieldDotIntensity(dot, frame, {
      elapsed: 100,
      span: 200,
      margin: 44,
      maxDistance: 100,
    })
    expect(intensity.opacity).toBeGreaterThan(0)
  })

  it("is dark before the field starts", () => {
    const frame = getBlueprintFrame(0, 0, 1600)
    expect(
      getFieldDotIntensity(dot, frame, {
        elapsed: 0,
        span: 200,
        margin: 44,
        maxDistance: 100,
      }).opacity
    ).toBe(0)
  })
})

describe("selectBlueprintParts", () => {
  const box = (
    name: string,
    width: number,
    extra: Partial<BlueprintPartInput> = {}
  ): BlueprintPartInput => ({
    kind: "box",
    name,
    rect: { x: 0, y: width, width, height: 10 },
    radius: 0,
    ...extra,
  })

  it("drops boxes that repeat an earlier one", () => {
    const parts = selectBlueprintParts(
      [box("FRAME", 40), { ...box("FRAME", 40) }],
      { maxParts: 10, keyCount: 2 }
    )
    expect(parts).toHaveLength(1)
  })

  it("keeps the largest parts, in document order", () => {
    const parts = selectBlueprintParts(
      [box("A", 10), box("B", 80), box("C", 40)],
      { maxParts: 2, keyCount: 0 }
    )
    expect(parts.map((part) => part.name)).toEqual(["B", "C"])
  })

  it("marks controls as keys first, then the largest boxes", () => {
    const parts = selectBlueprintParts(
      [box("A", 80), box("B", 20, { isInteractive: true }), box("C", 40)],
      { maxParts: 10, keyCount: 2 }
    )
    expect(parts.filter((part) => part.isKey).map((part) => part.name)).toEqual(
      ["A", "B"]
    )
  })
})

describe("getPartWindows", () => {
  it("spreads the parts across the parts phase", () => {
    const windows = getPartWindows(3)
    expect(windows[0].start).toBeCloseTo(0.28)
    expect(windows[2].end).toBeCloseTo(0.74)
    expect(windows[1].start).toBeGreaterThan(windows[0].start)
  })

  it("starts a single part at the phase start", () => {
    expect(getPartWindows(1)[0].start).toBeCloseTo(0.28)
  })
})

describe("getBlueprintFrame", () => {
  it("hides the content until the reveal, then fades it in", () => {
    expect(getBlueprintFrame(0.7, 1120, 1600).contentOpacity).toBe(0)
    expect(getBlueprintFrame(0.8, 1280, 1600).contentOpacity).toBeGreaterThan(0)
    expect(getBlueprintFrame(1.04, 1664, 1600).contentOpacity).toBe(1)
  })

  it("draws the outline across its phase", () => {
    expect(getBlueprintFrame(0.1, 160, 1600).outline).toBe(0)
    expect(getBlueprintFrame(0.42, 672, 1600).outline).toBe(1)
  })

  it("clears the overlay at the end", () => {
    const frame = getBlueprintFrame(BLUEPRINT_END, 1744, 1600)
    expect(frame.overlayOpacity).toBe(0)
    expect(frame.handleScales.every((scale) => scale === 0)).toBe(true)
  })

  it("sweeps the probe left to right", () => {
    const early = getBlueprintFrame(0.05, 80, 1600).probe
    const late = getBlueprintFrame(0.2, 320, 1600).probe
    expect(late).toBeGreaterThan(early)
  })
})

describe("labels", () => {
  it("formats the size, the clock and a point", () => {
    expect(formatBlueprintSize(130, 129.6)).toBe("130 × 130")
    expect(formatBlueprintClock(576)).toBe("t+0.58s")
    expect(formatBlueprintClock(4210)).toBe("t+4.21s")
    expect(formatBlueprintPoint(61.2, 130)).toBe("061·130")
  })
})

describe("BLUEPRINT_HOLD", () => {
  it("waits with the parts drawn and the content still hidden", () => {
    const frame = getBlueprintFrame(BLUEPRINT_HOLD, 1120, 1600)
    expect(frame.contentOpacity).toBe(0)
    expect(frame.outline).toBe(1)
    expect(frame.keyFade).toBe(1)
  })
})

describe("getHoldScan", () => {
  it("sweeps across again and again while it waits", () => {
    const first = getHoldScan(200, 1600)
    const later = getHoldScan(600, 1600)
    expect(later.probe).toBeGreaterThan(first.probe)
    expect(getHoldScan(200 + 1600 * 0.6, 1600).probe).toBeCloseTo(first.probe)
    expect(first.probeOpacity).toBeGreaterThan(0)
  })
})

describe("getHoldReticle", () => {
  const parts = [
    { rect: { x: 0, y: 0, width: 10, height: 10 } },
    { rect: { x: 50, y: 0, width: 20, height: 10 } },
  ]

  it("hops from part to part while it waits", () => {
    const start = getHoldReticle(parts, 0, 1600)
    const next = getHoldReticle(parts, 1600 * 0.4, 1600)
    expect(start?.index).toBe(0)
    expect(next?.index).toBe(1)
    expect(next?.opacity).toBe(1)
  })

  it("has nothing to point at without parts", () => {
    expect(getHoldReticle([], 100, 1600)).toBeNull()
  })
})

describe("getOverlayInsets", () => {
  it("keeps the full margin where there is room", () => {
    expect(
      getOverlayInsets(
        { x: 100, y: 100, width: 50, height: 50 },
        { x: 0, y: 0, width: 400, height: 400 },
        44
      )
    ).toEqual({ left: 44, top: 44, right: 44, bottom: 44 })
  })

  it("never reaches past the bounds, so it adds no scrolling", () => {
    expect(
      getOverlayInsets(
        { x: 10, y: 0, width: 370, height: 50 },
        { x: 0, y: 0, width: 400, height: 400 },
        44
      )
    ).toEqual({ left: 10, top: 0, right: 20, bottom: 44 })
  })
})
