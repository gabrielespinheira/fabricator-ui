import { describe, expect, it } from "vitest"

import {
  getDonutCenterFontSize,
  getPieAnchor,
  getPieChartModel,
  getPieListRows,
  getPieSliceAt,
  getPieSlicePath,
  getPieTable,
  getPieTooltip,
  getSliceOffset,
  interpolatePieSlices,
  OTHER_SLICE_ID,
  sweepPieSlices,
} from "./chart-pie-model"

const data = [
  { plan: "Starter", revenue: 20 },
  { plan: "Pro", revenue: 50 },
  { plan: "Team", revenue: 30 },
]
const size = { width: 200, height: 200 }

function model(options: Partial<Parameters<typeof getPieChartModel>[0]> = {}) {
  return getPieChartModel({
    data,
    nameKey: "plan",
    valueKey: "revenue",
    size,
    fontSize: 11,
    ...options,
  })
}

describe("getPieChartModel", () => {
  it("lays slices clockwise from 12 o'clock in data order", () => {
    const { slices } = model()
    expect(slices.map((slice) => slice.id)).toEqual(["Starter", "Pro", "Team"])
    expect(slices[0].startAngle).toBeCloseTo(0)
    expect(slices[2].endAngle).toBeCloseTo(Math.PI * 2)
    expect(slices[0].endAngle).toBeCloseTo(slices[1].startAngle)
  })

  it("sizes slices by share", () => {
    const { slices, total } = model()
    expect(total).toBe(100)
    expect(slices.map((slice) => slice.share)).toEqual([0.2, 0.5, 0.3])
    const span = (index: number) =>
      slices[index].endAngle - slices[index].startAngle
    expect(span(1) / span(0)).toBeCloseTo(2.5, 1)
  })

  it("pads slices so they keep a 2px gap at any radius", () => {
    const { slices, outerRadius, innerRadius } = model({ variant: "donut" })
    const padRadius = Math.hypot(innerRadius, outerRadius)
    expect(slices[0].padAngle * padRadius).toBeCloseTo(2)
  })

  it("leaves a lone slice whole, without a gap", () => {
    const { slices } = model({ data: [{ plan: "Pro", revenue: 5 }] })
    expect(slices[0].padAngle).toBe(0)
  })

  it("keeps room for a lifted slice inside the frame", () => {
    const { outerRadius, center } = model()
    expect(center).toEqual({ x: 100, y: 100 })
    expect(outerRadius).toBeLessThanOrEqual(100 - 6)
  })

  it("cuts a hole about 62% of the radius for a donut", () => {
    const { innerRadius, outerRadius } = model({ variant: "donut" })
    expect(innerRadius / outerRadius).toBeCloseTo(0.62)
    expect(model().innerRadius).toBe(0)
  })

  it("takes labels and colours from config, else the name and palette", () => {
    const { parts } = model({
      config: { Pro: { label: "Pro plan", color: "primary" } },
    })
    expect(parts.map((part) => part.label)).toEqual([
      "Starter",
      "Pro plan",
      "Team",
    ])
    expect(parts.map((part) => part.paint)).toEqual([
      { token: "chart-series-1" },
      { token: "primary" },
      { token: "chart-series-3" },
    ])
  })

  it("folds the smallest slices beyond the seventh into a grey Other", () => {
    const many = Array.from({ length: 10 }, (_, index) => ({
      plan: `P${index}`,
      revenue: [5, 40, 3, 30, 25, 20, 1, 15, 10, 12][index],
    }))
    const { parts, slices } = model({ data: many })
    expect(parts).toHaveLength(8)
    const other = parts.at(-1)
    expect(other?.id).toBe(OTHER_SLICE_ID)
    expect(other?.label).toBe("Other")
    expect(other?.value).toBe(5 + 3 + 1)
    expect(other?.paint).toEqual({ token: "muted-foreground" })
    // The seven kept keep data order and take the first seven slots.
    expect(parts.slice(0, 7).map((part) => part.id)).toEqual([
      "P1",
      "P3",
      "P4",
      "P5",
      "P7",
      "P8",
      "P9",
    ])
    expect(parts[6].paint).toEqual({ token: "chart-series-7" })
    expect(slices).toHaveLength(8)
  })

  it("leaves out missing and non-positive values", () => {
    const { slices } = model({
      data: [
        ...data,
        { plan: "Free", revenue: 0 },
        { plan: "Old", revenue: null },
      ],
    })
    expect(slices.map((slice) => slice.id)).toEqual(["Starter", "Pro", "Team"])
  })

  it("keeps duplicate names apart", () => {
    const { slices } = model({
      data: [
        { plan: "Pro", revenue: 1 },
        { plan: "Pro", revenue: 2 },
      ],
    })
    expect(new Set(slices.map((slice) => slice.id)).size).toBe(2)
  })

  it("drops hidden slices and shares the whole among the rest", () => {
    const { slices, parts, total } = model({ hidden: new Set(["Pro"]) })
    expect(parts).toHaveLength(3)
    expect(slices.map((slice) => slice.id)).toEqual(["Starter", "Team"])
    expect(total).toBe(50)
    expect(slices[0].share).toBeCloseTo(0.4)
  })

  it("labels a slice with its share only where the label fits", () => {
    const { slices } = model({
      labels: true,
      data: [
        { plan: "Big", revenue: 97 },
        { plan: "Tiny", revenue: 3 },
      ],
    })
    expect(slices[0].labelBox?.text).toBe("97%")
    expect(slices[1].labelBox).toBeNull()
  })

  it("draws no labels unless asked", () => {
    expect(model().slices.every((slice) => slice.labelBox === null)).toBe(true)
  })
})

describe("getPieSliceAt", () => {
  it("finds the slice under a point", () => {
    const pie = model()
    // Just right of 12 o'clock: the first slice.
    expect(getPieSliceAt(pie, { x: 105, y: 40 })).toBe(0)
    // At 6 o'clock: the second slice runs from 72° to 252°.
    expect(getPieSliceAt(pie, { x: 100, y: 160 })).toBe(1)
    // Just left of 12 o'clock: the last slice.
    expect(getPieSliceAt(pie, { x: 95, y: 40 })).toBe(2)
  })

  it("finds nothing outside the pie or in a donut's hole", () => {
    expect(getPieSliceAt(model(), { x: 2, y: 2 })).toBe(-1)
    expect(getPieSliceAt(model({ variant: "donut" }), { x: 100, y: 100 })).toBe(
      -1
    )
  })
})

describe("geometry helpers", () => {
  it("draws a slice as an arc path around the centre", () => {
    const pie = model()
    const path = getPieSlicePath(pie, pie.slices[0])
    expect(path.startsWith("M")).toBe(true)
  })

  it("lifts a slice outwards along its bisector", () => {
    const quarter = {
      startAngle: 0,
      endAngle: Math.PI,
    }
    const offset = getSliceOffset(quarter, 6)
    expect(offset.x).toBeCloseTo(6)
    expect(offset.y).toBeCloseTo(0)
  })

  it("anchors the tooltip past the slice's rim", () => {
    const pie = model()
    const anchor = getPieAnchor(pie, 1)
    const distance = Math.hypot(
      anchor.x - pie.center.x,
      anchor.y - pie.center.y
    )
    expect(distance).toBeGreaterThan(pie.outerRadius)
  })

  it("sweeps slices in from 12 o'clock", () => {
    const pie = model()
    const half = sweepPieSlices(pie.slices, 0.5)
    expect(half[0].startAngle).toBe(0)
    expect(half.at(-1)?.endAngle).toBeCloseTo(Math.PI)
    expect(sweepPieSlices(pie.slices, 1)).toBe(pie.slices)
  })

  it("fits the centre value inside a donut's hole", () => {
    expect(getDonutCenterFontSize(60, ["$1,234,567.89"])).toBeLessThan(
      getDonutCenterFontSize(60, ["$12K"])
    )
    const fontSize = getDonutCenterFontSize(60, ["$1,234,567.89"])
    expect(13 * fontSize * 0.6).toBeLessThanOrEqual(60 * 1.5)
  })
})

describe("interpolatePieSlices", () => {
  it("moves the angles of slices that stay", () => {
    const from = model()
    const to = model({
      data: [
        { plan: "Starter", revenue: 50 },
        { plan: "Pro", revenue: 20 },
        { plan: "Team", revenue: 30 },
      ],
    })
    const halfway = interpolatePieSlices(from.slices, to.slices, 0.5)
    const pro = halfway?.find((slice) => slice.id === "Pro")
    const start = from.slices[1].startAngle
    const end = to.slices[1].startAngle
    expect(pro?.startAngle).toBeCloseTo((start + end) / 2)
  })

  it("grows a new slice from zero width where it will sit", () => {
    const from = model({ hidden: new Set(["Pro"]) })
    const to = model()
    const start = interpolatePieSlices(from.slices, to.slices, 0)
    const pro = start?.find((slice) => slice.id === "Pro")
    expect(pro?.endAngle).toBeCloseTo(pro?.startAngle ?? -1)
    expect(pro?.startAngle).toBeCloseTo(from.slices[0].endAngle)
  })

  it("shrinks a leaving slice to zero width and marks it", () => {
    const end = interpolatePieSlices(
      model().slices,
      model({ hidden: new Set(["Pro"]) }).slices,
      1
    )
    const pro = end?.find((slice) => slice.id === "Pro")
    expect(pro?.isLeaving).toBe(true)
    expect(pro?.endAngle).toBeCloseTo(pro?.startAngle ?? -1)
  })

  it("has nothing to morph between two empty pies", () => {
    expect(interpolatePieSlices([], [], 0.5)).toBeNull()
  })
})

describe("tooltip, table and list", () => {
  it("reads a slice's share and value", () => {
    expect(getPieTooltip(model(), 1)).toEqual({
      title: "Pro",
      rows: [
        expect.objectContaining({ key: "Pro", label: "50%", value: "50" }),
      ],
    })
  })

  it("passes the value field to formatValue", () => {
    const tooltip = getPieTooltip(model(), 0, (value, key) => `${key}:${value}`)
    expect(tooltip.rows[0].value).toBe("revenue:20")
  })

  it("tables every row, folded and missing ones included", () => {
    const table = getPieTable(
      model({ data: [...data, { plan: "Old", revenue: null }] })
    )
    expect(table.columns).toEqual(["Value", "Share"])
    expect(table.rows).toEqual([
      { header: "Starter", cells: ["20", "20%"] },
      { header: "Pro", cells: ["50", "50%"] },
      { header: "Team", cells: ["30", "30%"] },
      { header: "Old", cells: ["–", "–"] },
    ])
  })

  it("lists every part with its share of the whole", () => {
    expect(getPieListRows(model())).toEqual([
      expect.objectContaining({
        id: "Starter",
        share: 0.2,
        shareText: "20%",
        value: "20",
      }),
      expect.objectContaining({ id: "Pro", share: 0.5 }),
      expect.objectContaining({ id: "Team", share: 0.3 }),
    ])
  })
})
