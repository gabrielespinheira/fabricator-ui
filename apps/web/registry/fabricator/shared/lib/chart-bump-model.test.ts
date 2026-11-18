import { describe, expect, it } from "vitest"

import {
  getBumpChartModel,
  getBumpLegendValue,
  getBumpMovement,
  getBumpPath,
  getBumpRevealAmount,
  getBumpSeriesAt,
  getBumpTable,
  getBumpTooltip,
  interpolateBumpSeries,
} from "./chart-bump-model"

const data = [
  { month: "Jan", alpha: 1, beta: 2, gamma: 3 },
  { month: "Feb", alpha: 2, beta: 1, gamma: 3 },
  { month: "Mar", alpha: 3, beta: 1, gamma: 2 },
]
const config = {
  alpha: { label: "Alpha" },
  beta: { label: "Beta" },
  gamma: { label: "Gamma" },
}
const scores = [
  { month: "Jan", alpha: 900, beta: 400, gamma: 100 },
  { month: "Feb", alpha: 500, beta: 700, gamma: 500 },
]
const size = { width: 600, height: 300 }

function model(options: Partial<Parameters<typeof getBumpChartModel>[0]> = {}) {
  return getBumpChartModel({
    data,
    config,
    index: "month",
    size,
    fontSize: 12,
    ...options,
  })
}

function find(current: ReturnType<typeof model>, key: string) {
  const series = current.series.find((item) => item.key === key)
  if (!series) throw new Error(`No series ${key}`)
  return series
}

describe("getBumpChartModel", () => {
  it("takes ranks as given, rank 1 in the top slot", () => {
    const current = model()
    expect(find(current, "alpha").ranks).toEqual([1, 2, 3])
    const [top, middle, bottom] = current.slots
    expect(top.position).toBeCloseTo(current.plot.y)
    expect(middle.position - top.position).toBeCloseTo(
      bottom.position - middle.position
    )
    expect(find(current, "alpha").points[0]?.y).toBeCloseTo(top.position)
  })

  it("ranks scores per index, highest first, ties in config order", () => {
    const current = model({ data: scores, ranking: "score" })
    expect(find(current, "alpha").ranks).toEqual([1, 2])
    expect(find(current, "beta").ranks).toEqual([2, 1])
    expect(find(current, "gamma").ranks).toEqual([3, 3])
    expect(find(current, "alpha").scores).toEqual([900, 500])
  })

  it("re-ranks the visible series when one is hidden from scores", () => {
    const current = model({
      data: scores,
      ranking: "score",
      hidden: new Set(["alpha"]),
    })
    expect(find(current, "beta").ranks).toEqual([1, 1])
    expect(current.slots).toHaveLength(2)
  })

  it("keeps given ranks when a series is hidden", () => {
    const current = model({ hidden: new Set(["alpha"]) })
    expect(find(current, "beta").ranks).toEqual([2, 1, 1])
    expect(current.slots).toHaveLength(3)
  })

  it("leaves a gap where a rank is missing", () => {
    const current = model({
      data: [data[0], { month: "Feb", alpha: null, beta: 1, gamma: 2 }],
    })
    expect(find(current, "alpha").points[1]).toBeNull()
  })

  it("draws 9px rings with the rank inside when there is room", () => {
    const current = model()
    expect(current.radius).toBe(9)
    expect(current.showRanks).toBe(true)
  })

  it("shrinks the rings and drops the numbers when crowded", () => {
    const crowded = model({ size: { width: 600, height: 80 } })
    expect(crowded.radius).toBeLessThan(9)
    const many = Array.from({ length: 80 }, (_, index) => ({
      month: `M${index}`,
      alpha: 1,
      beta: 2,
      gamma: 3,
    }))
    const dense = model({ data: many, size: { width: 300, height: 300 } })
    expect(dense.showRanks).toBe(false)
  })

  it("names each series beside its last point when the plot leaves room", () => {
    const current = model()
    expect(current.names.map((name) => name.text)).toEqual([
      "Alpha",
      "Beta",
      "Gamma",
    ])
    const last = find(current, "beta").points[2]
    const beta = current.names.find((name) => name.key === "beta")
    expect(beta?.y).toBeCloseTo(last?.y ?? 0)
    expect(beta?.x).toBeGreaterThan(last?.x ?? 0)
  })

  it("drops the names when they would squeeze the plot", () => {
    const current = model({
      config: {
        alpha: { label: "A very long product name indeed" },
        beta: { label: "Beta" },
        gamma: { label: "Gamma" },
      },
      size: { width: 320, height: 300 },
    })
    expect(current.names).toEqual([])
    expect(current.plot.x + current.plot.width).toBeGreaterThan(280)
  })
})

describe("getBumpPath", () => {
  it("joins the points with bump curves, broken at gaps", () => {
    const path = getBumpPath([
      { x: 0, y: 0, rank: 1 },
      { x: 10, y: 20, rank: 2 },
      null,
      { x: 30, y: 0, rank: 1 },
    ])
    expect(path).toContain("C5,0,5,20,10,20")
    expect(path.match(/M/g)).toHaveLength(2)
  })
})

describe("getBumpMovement", () => {
  it("marks a climb, a fall and no change", () => {
    expect(getBumpMovement([2, 1], 1)).toEqual({ change: 1, text: "↑1" })
    expect(getBumpMovement([1, 3], 1)).toEqual({ change: -2, text: "↓2" })
    expect(getBumpMovement([2, 2], 1)).toEqual({ change: 0, text: "–" })
  })

  it("has nothing to compare at the first index or after a gap", () => {
    expect(getBumpMovement([2, 1], 0)).toBeNull()
    expect(getBumpMovement([null, 1], 1)).toBeNull()
  })
})

describe("getBumpTooltip", () => {
  it("lists the series by rank with their movement", () => {
    const tooltip = getBumpTooltip(model(), 1)
    expect(tooltip.title).toBe("Feb")
    expect(tooltip.rows.map((row) => [row.label, row.value])).toEqual([
      ["Beta", "#1 ↑1"],
      ["Alpha", "#2 ↓1"],
      ["Gamma", "#3 –"],
    ])
  })

  it("leads with the score when ranking scores", () => {
    const tooltip = getBumpTooltip(model({ data: scores, ranking: "score" }), 1)
    expect(tooltip.rows[0]).toEqual(
      expect.objectContaining({ label: "Beta", value: "700 · #1 ↑1" })
    )
  })
})

describe("getBumpLegendValue", () => {
  it("reads the latest rank and its change", () => {
    const current = model()
    expect(getBumpLegendValue(find(current, "alpha"))).toBe("#3 ↓1")
    expect(getBumpLegendValue(find(current, "gamma"))).toBe("#2 ↑1")
  })
})

describe("getBumpSeriesAt", () => {
  it("finds the series under the pointer, on a point or along its curve", () => {
    const current = model()
    const alpha = find(current, "alpha")
    const first = alpha.points[0]
    expect(first && getBumpSeriesAt(current, first)).toBe("alpha")
    const [start, end] = [alpha.points[0], alpha.points[1]]
    if (!start || !end) throw new Error("missing points")
    // A quarter of the way across, a bump curve has moved about a tenth of
    // the way down, so Alpha (leaving rank 1) is still near the top while
    // Beta, climbing to it, is still near the bottom.
    const quarter = {
      x: start.x + (end.x - start.x) * 0.25,
      y: start.y + (end.y - start.y) * 0.106,
    }
    expect(getBumpSeriesAt(current, quarter)).toBe("alpha")
    expect(
      getBumpSeriesAt(current, {
        ...quarter,
        y: end.y - (end.y - start.y) * 0.106,
      })
    ).toBe("beta")
  })

  it("finds nothing away from every line", () => {
    const current = model()
    const top = current.slots[0].position
    expect(
      getBumpSeriesAt(current, { x: current.positions[0], y: top - 40 })
    ).toBeNull()
  })
})

describe("interpolateBumpSeries", () => {
  it("moves points to their new slots", () => {
    const from = model()
    const to = model({ data: [...data].reverse() })
    const halfway = interpolateBumpSeries(from.series, to.series, 0.5, 300)
    const alpha = halfway?.find((item) => item.key === "alpha")
    const start = find(from, "alpha").points[0]?.y ?? 0
    const end = find(to, "alpha").points[0]?.y ?? 0
    expect(alpha?.points[0]?.y).toBeCloseTo((start + end) / 2)
  })

  it("raises a series being shown from the floor and sinks one being hidden", () => {
    const shown = interpolateBumpSeries(
      model({ hidden: new Set(["gamma"]) }).series,
      model().series,
      0,
      300
    )
    expect(shown?.find((item) => item.key === "gamma")?.points[0]?.y).toBe(300)
    const hidden = interpolateBumpSeries(
      model().series,
      model({ hidden: new Set(["gamma"]) }).series,
      1,
      300
    )
    const gamma = hidden?.find((item) => item.key === "gamma")
    expect(gamma?.isLeaving).toBe(true)
    expect(gamma?.points[0]?.y).toBe(300)
  })

  it("can't morph between different numbers of indices", () => {
    expect(
      interpolateBumpSeries(
        model().series,
        model({ data: data.slice(1) }).series,
        0.5,
        300
      )
    ).toBeNull()
  })
})

describe("getBumpTable", () => {
  it("has a row per index and a column per series", () => {
    expect(getBumpTable(model()).rows[0]).toEqual({
      header: "Jan",
      cells: ["#1", "#2", "#3"],
    })
    expect(
      getBumpTable(model({ data: scores, ranking: "score" })).rows[1].cells
    ).toEqual(["500 (#2)", "700 (#1)", "500 (#3)"])
  })
})

describe("getBumpRevealAmount", () => {
  it("shows a dot as the sweep passes over it", () => {
    expect(getBumpRevealAmount(0, 100, 9)).toBe(0)
    expect(getBumpRevealAmount(100, 100, 9)).toBeCloseTo(0.5)
    expect(getBumpRevealAmount(200, 100, 9)).toBe(1)
  })
})
