import { describe, expect, it } from "vitest"

import {
  getRadialAnchor,
  getRadialArcPath,
  getRadialCenterText,
  getRadialChartModel,
  getRadialRingAt,
  getRadialTable,
  getRadialTooltip,
  interpolateRadialRings,
} from "./chart-radial-model"

const data = [
  { goal: "Revenue", value: 72, target: 100 },
  { goal: "Signups", value: 45, target: 60 },
  { goal: "Retention", value: 90, target: 90 },
]
const size = { width: 240, height: 240 }

function model(
  options: Partial<Parameters<typeof getRadialChartModel>[0]> = {}
) {
  return getRadialChartModel({
    data,
    nameKey: "goal",
    valueKey: "value",
    max: 100,
    size,
    ...options,
  })
}

describe("getRadialChartModel", () => {
  it("draws a ring per row, the first outermost", () => {
    const { rings } = model()
    expect(rings.map((ring) => ring.id)).toEqual([
      "Revenue",
      "Signups",
      "Retention",
    ])
    expect(rings[0].outerRadius).toBeGreaterThan(rings[1].outerRadius)
    expect(rings[1].outerRadius).toBeGreaterThan(rings[2].outerRadius)
  })

  it("keeps a gap between rings of one thickness", () => {
    const { rings } = model()
    const thickness = rings[0].outerRadius - rings[0].innerRadius
    expect(rings[1].outerRadius - rings[1].innerRadius).toBeCloseTo(thickness)
    expect(rings[0].innerRadius - rings[1].outerRadius).toBeGreaterThanOrEqual(
      3
    )
  })

  it("measures each value against one max", () => {
    const { rings } = model()
    expect(rings.map((ring) => ring.share)).toEqual([0.72, 0.45, 0.9])
  })

  it("measures each value against its row's max", () => {
    const { rings } = model({ max: undefined, maxKey: "target" })
    expect(rings.map((ring) => ring.share)).toEqual([0.72, 0.75, 1])
  })

  it("measures against the largest value without a max", () => {
    const { rings } = model({ max: undefined })
    expect(rings[2].share).toBe(1)
    expect(rings[0].share).toBeCloseTo(0.8)
  })

  it("sweeps a full circle from 12 o'clock or a half from 9 to 3", () => {
    const full = model()
    expect(full.startAngle).toBe(0)
    expect(full.sweep).toBeCloseTo(Math.PI * 2)
    const half = model({ shape: "half", size: { width: 240, height: 140 } })
    expect(half.startAngle).toBeCloseTo(-Math.PI / 2)
    expect(half.sweep).toBeCloseTo(Math.PI)
    // The half gauge's centre sits low, so its arcs fill the frame.
    expect(half.center.y).toBeGreaterThan(half.center.x / 2)
    expect(half.center.y + half.thickness / 2).toBeLessThanOrEqual(140)
  })

  it("takes labels and colours from config, else the name and palette", () => {
    const { parts } = model({ config: { Signups: { label: "New signups" } } })
    expect(parts.map((part) => part.label)).toEqual([
      "Revenue",
      "New signups",
      "Retention",
    ])
    expect(parts[2].paint).toEqual({ token: "chart-series-3" })
  })

  it("drops hidden rings and lays the rest out again", () => {
    const { rings } = model({ hidden: new Set(["Revenue"]) })
    expect(rings.map((ring) => ring.id)).toEqual(["Signups", "Retention"])
    expect(rings[0].outerRadius).toBeCloseTo(model().rings[0].outerRadius)
  })

  it("skips rows without a value", () => {
    const { rings } = model({
      data: [...data, { goal: "NPS", value: null, target: 10 }],
    })
    expect(rings).toHaveLength(3)
  })
})

describe("paths and hits", () => {
  it("draws the value arc only as far as its share, the track all the way", () => {
    const radial = model()
    expect(getRadialArcPath(radial, radial.rings[0], 0)).toBe("")
    expect(getRadialArcPath(radial, radial.rings[0], 0.5)).toMatch(/^M/)
    expect(getRadialArcPath(radial, radial.rings[0], 1)).toMatch(/^M/)
  })

  it("finds the ring under a point", () => {
    const radial = model()
    const ring = radial.rings[1]
    const middle = (ring.innerRadius + ring.outerRadius) / 2
    expect(
      getRadialRingAt(radial, {
        x: radial.center.x,
        y: radial.center.y - middle,
      })
    ).toBe(1)
    expect(getRadialRingAt(radial, radial.center)).toBe(-1)
    expect(getRadialRingAt(radial, { x: 0, y: 0 })).toBe(-1)
  })

  it("anchors the tooltip at the end of the ring's value", () => {
    const radial = model()
    const anchor = getRadialAnchor(radial, 0)
    // 72% of the way round: just below 9 o'clock.
    expect(anchor.x).toBeLessThan(radial.center.x)
    expect(anchor.y).toBeGreaterThan(radial.center.y)
  })
})

describe("interpolateRadialRings", () => {
  it("turns a staying ring to its new share", () => {
    const from = model()
    const to = model({ max: 200 })
    const halfway = interpolateRadialRings(from.rings, to.rings, 0.5)
    expect(halfway?.[0].share).toBeCloseTo((0.72 + 0.36) / 2)
  })

  it("grows a new ring from nothing and shrinks a leaving one", () => {
    const from = model({ hidden: new Set(["Signups"]) })
    const to = model()
    const start = interpolateRadialRings(from.rings, to.rings, 0)
    const signups = start?.find((ring) => ring.id === "Signups")
    expect(signups?.share).toBe(0)
    expect(signups?.outerRadius).toBeCloseTo(signups?.innerRadius ?? -1)

    const end = interpolateRadialRings(to.rings, from.rings, 1)
    const leaving = end?.find((ring) => ring.id === "Signups")
    expect(leaving?.isLeaving).toBe(true)
    expect(leaving?.share).toBe(0)
  })

  it("has nothing to morph between two empty charts", () => {
    expect(interpolateRadialRings([], [], 0.5)).toBeNull()
  })
})

describe("text", () => {
  it("reads a ring's share, value and max", () => {
    expect(getRadialTooltip(model({ maxKey: "target" }), 1)).toEqual({
      title: "Signups",
      rows: [
        expect.objectContaining({
          key: "Signups",
          label: "75%",
          value: "45 / 60",
        }),
      ],
    })
  })

  it("centres the first ring's share by default", () => {
    expect(getRadialCenterText(model())).toBe("72%")
    expect(getRadialCenterText(model({ data: [] }))).toBe("")
  })

  it("tables every row's value, max and share", () => {
    const table = getRadialTable(
      model({ data: [...data, { goal: "NPS", value: null, target: 10 }] })
    )
    expect(table.columns).toEqual(["Value", "Max", "Share"])
    expect(table.rows[0]).toEqual({
      header: "Revenue",
      cells: ["72", "100", "72%"],
    })
    expect(table.rows[3]).toEqual({ header: "NPS", cells: ["–", "100", "–"] })
  })
})
