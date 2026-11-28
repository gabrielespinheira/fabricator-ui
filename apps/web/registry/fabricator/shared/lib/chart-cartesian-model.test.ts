import { describe, expect, it } from "vitest"

import {
  getBandPositions,
  getCartesianLayout,
  getPointPositions,
} from "./chart-cartesian-model"

const labels = ["Jan", "Feb", "Mar", "Apr"]

describe("getCartesianLayout", () => {
  const layout = getCartesianLayout({
    size: { width: 400, height: 240 },
    labels,
    min: 0,
    max: 76,
    fontSize: 12,
  })

  it("leaves room for the value labels before the plot", () => {
    // "80" at 12px is about 14px wide, plus the gap to the plot.
    expect(layout.plot.x).toBeGreaterThan(14)
    expect(layout.plot.x).toBeLessThan(40)
  })

  it("leaves room for the index labels under the plot", () => {
    expect(layout.plot.y + layout.plot.height).toBeLessThan(240 - 12)
  })

  it("puts a gridline on every value tick, the largest at the top", () => {
    expect(layout.valueTicks.map((tick) => tick.label)).toEqual([
      "0",
      "20",
      "40",
      "60",
      "80",
    ])
    expect(layout.valueTicks[0].position).toBeCloseTo(
      layout.plot.y + layout.plot.height
    )
    expect(layout.valueTicks.at(-1)?.position).toBeCloseTo(layout.plot.y)
  })

  it("formats the value axis as percentages for shares", () => {
    const shares = getCartesianLayout({
      size: { width: 400, height: 240 },
      labels,
      min: 0,
      max: 1,
      fontSize: 12,
      valueFormat: "percent",
    })
    expect(shares.valueTicks.map((tick) => tick.label)).toContain("100%")
  })

  it("lays values along x and labels down y when horizontal", () => {
    const horizontal = getCartesianLayout({
      size: { width: 400, height: 240 },
      labels: ["North America", "Europe"],
      min: 0,
      max: 100,
      fontSize: 12,
      orientation: "horizontal",
    })
    // The longest label sets the gutter.
    expect(horizontal.plot.x).toBeGreaterThan(70)
    const first = horizontal.valueTicks[0]
    const last = horizontal.valueTicks.at(-1)
    expect(first.position).toBeCloseTo(horizontal.plot.x)
    expect(last?.position).toBeCloseTo(
      horizontal.plot.x + horizontal.plot.width
    )
  })
})

describe("minimal layout", () => {
  const minimal = getCartesianLayout({
    size: { width: 300, height: 140 },
    labels,
    min: 0,
    max: 76,
    fontSize: 12,
    minimal: true,
  })

  it("fills the frame edge to edge with no value gutter", () => {
    expect(minimal.plot.x).toBe(0)
    expect(minimal.plot.width).toBe(300)
  })

  it("reaches the bottom, since the end labels sit outside the plot", () => {
    expect(minimal.plot.y + minimal.plot.height).toBe(140)
  })

  it("lets the tallest value nearly reach the top, with no axis to round to", () => {
    const tall = getCartesianLayout({
      size: { width: 300, height: 140 },
      labels,
      min: 0,
      max: 2060,
      fontSize: 12,
      minimal: true,
    })
    expect(tall.scale.domain[1]).toBeGreaterThanOrEqual(2060)
    expect(tall.scale.domain[1]).toBeLessThan(2060 * 1.1)
  })

  it("keeps the scale so tooltips and bars still read the values", () => {
    expect(minimal.scale.toPixel(0)).toBe(140)
  })
})

describe("label room", () => {
  it("leaves wide value labels a little slack before the plot", () => {
    const layout = getCartesianLayout({
      size: { width: 300, height: 200 },
      labels: ["A", "B"],
      min: 0,
      max: 1,
      fontSize: 11,
      valueFormat: "percent",
    })
    // "100%" at 11px is estimated at 26.4px; Inter draws it a little wider.
    expect(layout.plot.x).toBeGreaterThanOrEqual(26.4 + 8 + 4)
  })

  it("keeps the last band label inside the frame when bands are narrow", () => {
    const labels = Array.from({ length: 30 }, (_, index) => `Nov ${index + 1}`)
    const layout = getCartesianLayout({
      size: { width: 360, height: 200 },
      labels,
      min: 0,
      max: 1,
      fontSize: 11,
      bandLabels: true,
    })
    const step = layout.plot.width / labels.length
    const lastCenter = layout.plot.x + layout.plot.width - step / 2
    const halfLabel = (6 * 11 * 0.6) / 2
    expect(lastCenter + halfLabel).toBeLessThanOrEqual(360)
  })
})

describe("getPointPositions", () => {
  it("spreads points from edge to edge", () => {
    expect(getPointPositions(3, 10, 100)).toEqual([10, 60, 110])
  })

  it("centres a single point", () => {
    expect(getPointPositions(1, 10, 100)).toEqual([60])
  })
})

describe("getBandPositions", () => {
  it("gives each category an equal band and centres", () => {
    const bands = getBandPositions(4, 0, 400)
    expect(bands.step).toBe(100)
    expect(bands.centers).toEqual([50, 150, 250, 350])
    expect(bands.bandwidth).toBeLessThan(100)
    expect(bands.bandwidth).toBeGreaterThan(50)
  })
})
