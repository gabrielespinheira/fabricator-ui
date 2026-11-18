import { describe, expect, it } from "vitest"

import {
  getAreaPath,
  getLineChartModel,
  getLinePath,
  getLineTable,
  getLineTooltip,
  interpolateLineSeries,
} from "./chart-line-model"

const data = [
  { month: "Jan", revenue: 40, costs: 20 },
  { month: "Feb", revenue: 60, costs: null },
  { month: "Mar", revenue: 50, costs: 30 },
]
const config = {
  revenue: { label: "Revenue" },
  costs: { label: "Costs" },
}
const size = { width: 400, height: 200 }

function model(options: Partial<Parameters<typeof getLineChartModel>[0]> = {}) {
  return getLineChartModel({
    data,
    config,
    index: "month",
    size,
    fontSize: 12,
    ...options,
  })
}

describe("getLineChartModel", () => {
  it("places one point per datum across the plot", () => {
    const { positions, layout } = model()
    expect(positions).toHaveLength(3)
    expect(positions[0]).toBeCloseTo(layout.plot.x)
    expect(positions[2]).toBeCloseTo(layout.plot.x + layout.plot.width)
  })

  it("keeps gaps for missing values", () => {
    const costs = model().series.find((series) => series.key === "costs")
    expect(costs?.values).toEqual([20, null, 30])
    expect(costs?.top[1]).toBeNull()
  })

  it("draws every series from the zero line unstacked", () => {
    const { series, baseline, layout } = model()
    expect(baseline).toBeCloseTo(layout.scale.toPixel(0))
    for (const line of series)
      expect(line.bottom.every((y) => y === baseline)).toBe(true)
  })

  it("stacks series on each other in config order", () => {
    const { series, layout } = model({ stack: "stacked" })
    const [revenue, costs] = series
    expect(costs.bottom[0]).toBeCloseTo(revenue.top[0] ?? Number.NaN)
    expect(costs.top[0]).toBeCloseTo(layout.scale.toPixel(60))
    // A gap stacks as zero, so the area stays closed.
    expect(costs.top[1]).toBeCloseTo(revenue.top[1] ?? Number.NaN)
  })

  it("stretches each index to the whole when expanded", () => {
    const { series, layout } = model({ stack: "expand" })
    expect(layout.scale.domain).toEqual([0, 1])
    expect(series[1].top[0]).toBeCloseTo(layout.scale.toPixel(1))
    expect(series[0].top[0]).toBeCloseTo(layout.scale.toPixel(40 / 60))
  })

  it("leaves hidden series out and keeps the others' colours", () => {
    const { series } = model({ hidden: new Set(["revenue"]) })
    expect(series.map((line) => line.key)).toEqual(["costs"])
    expect(series[0].paint).toEqual({ token: "chart-series-2" })
  })

  it("thins index labels that would collide", () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      month: `Day ${index + 1}`,
      revenue: index,
    }))
    const { labelIndices } = getLineChartModel({
      data: many,
      config: { revenue: { label: "Revenue" } },
      index: "month",
      size,
      fontSize: 12,
    })
    expect(labelIndices.length).toBeLessThan(30)
    expect(labelIndices.at(-1)).toBe(29)
  })

  it("formats index labels", () => {
    const { labels } = model({ formatIndex: (value) => value.toUpperCase() })
    expect(labels).toEqual(["JAN", "FEB", "MAR"])
  })
})

describe("paths", () => {
  const positions = [0, 50, 100]

  it("breaks a line at gaps", () => {
    expect(getLinePath(positions, [10, null, 30], "linear")).toBe(
      "M0,10ZM100,30Z"
    )
  })

  it("draws straight, smooth or stepped lines", () => {
    const top = [10, 20, 30]
    expect(getLinePath(positions, top, "linear")).toBe("M0,10L50,20L100,30")
    expect(getLinePath(positions, top, "smooth")).toContain("C")
    expect(getLinePath(positions, top, "step")).toBe(
      "M0,10L25,10L25,20L75,20L75,30L100,30"
    )
  })

  it("closes an area down to its bottom edge", () => {
    expect(getAreaPath(positions, [10, 20, 30], [90, 90, 90], "linear")).toBe(
      "M0,10L50,20L100,30L100,90L50,90L0,90Z"
    )
  })
})

describe("interpolateLineSeries", () => {
  it("moves points between two datasets of the same length", () => {
    const from = model().series
    const to = getLineChartModel({
      data: data.map((datum) => ({ ...datum, revenue: datum.revenue * 2 })),
      config,
      index: "month",
      size,
      fontSize: 12,
    }).series
    const halfway = interpolateLineSeries(from, to, 0.5)
    const revenue = halfway?.find((series) => series.key === "revenue")
    expect(revenue?.top[0]).toBeCloseTo(
      ((from[0].top[0] ?? 0) + (to[0].top[0] ?? 0)) / 2
    )
  })

  it("grows an entering series from its bottom edge", () => {
    const from = model({ hidden: new Set(["costs"]) }).series
    const to = model().series
    const start = interpolateLineSeries(from, to, 0)
    const costs = start?.find((series) => series.key === "costs")
    expect(costs?.top[0]).toBeCloseTo(costs?.bottom[0] ?? Number.NaN)
  })

  it("shrinks a leaving series into its bottom edge and marks it", () => {
    const from = model().series
    const to = model({ hidden: new Set(["costs"]) }).series
    const end = interpolateLineSeries(from, to, 1)
    const costs = end?.find((series) => series.key === "costs")
    expect(costs?.isLeaving).toBe(true)
    expect(costs?.top[0]).toBeCloseTo(costs?.bottom[0] ?? Number.NaN)
  })

  it("can't morph between different numbers of points", () => {
    const shorter = getLineChartModel({
      data: data.slice(0, 2),
      config,
      index: "month",
      size,
      fontSize: 12,
    }).series
    expect(interpolateLineSeries(model().series, shorter, 0.5)).toBeNull()
  })
})

describe("getLineTooltip", () => {
  it("lists every visible series at the index, values formatted", () => {
    const tooltip = getLineTooltip(model(), 1, (value) => `$${value}`)
    expect(tooltip.title).toBe("Feb")
    expect(tooltip.rows).toEqual([
      expect.objectContaining({
        key: "revenue",
        label: "Revenue",
        value: "$60",
      }),
      expect.objectContaining({ key: "costs", label: "Costs", value: "–" }),
    ])
  })

  it("shows shares when expanded", () => {
    const tooltip = getLineTooltip(model({ stack: "expand" }), 0)
    expect(tooltip.rows[0].value).toBe("40 · 66.7%")
  })
})

describe("getLineTable", () => {
  it("has a row per index and a column per series", () => {
    expect(getLineTable(model())).toEqual({
      columns: ["Revenue", "Costs"],
      rows: [
        { header: "Jan", cells: ["40", "20"] },
        { header: "Feb", cells: ["60", "–"] },
        { header: "Mar", cells: ["50", "30"] },
      ],
    })
  })
})
