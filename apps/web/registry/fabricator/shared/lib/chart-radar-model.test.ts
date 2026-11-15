import { describe, expect, it } from "vitest"

import {
  getRadarAnchor,
  getRadarAxisAt,
  getRadarChartModel,
  getRadarGridPath,
  getRadarPoint,
  getRadarPolygonPath,
  getRadarTable,
  getRadarTooltip,
  interpolateRadarSeries,
  RADAR_LEVELS,
} from "./chart-radar-model"

const data = [
  { skill: "Speed", acme: 80, rival: 60 },
  { skill: "Price", acme: 50, rival: 90 },
  { skill: "Support", acme: 70, rival: 40 },
  { skill: "Design", acme: 90, rival: 55 },
]
const config = { acme: { label: "Acme" }, rival: { label: "Rival" } }
const size = { width: 400, height: 300 }

function model(
  options: Partial<Parameters<typeof getRadarChartModel>[0]> = {}
) {
  return getRadarChartModel({
    data,
    config,
    index: "skill",
    size,
    fontSize: 11,
    ...options,
  })
}

describe("getRadarChartModel", () => {
  it("spaces an axis per row clockwise from 12 o'clock", () => {
    const { axes, center, radius } = model()
    expect(axes.map((axis) => axis.label)).toEqual([
      "Speed",
      "Price",
      "Support",
      "Design",
    ])
    expect(axes[0].angle).toBe(0)
    expect(axes[1].angle).toBeCloseTo(Math.PI / 2)
    expect(axes[0].end.x).toBeCloseTo(center.x)
    expect(axes[0].end.y).toBeCloseTo(center.y - radius)
  })

  it("rounds the scale up to a clean max", () => {
    expect(model().max).toBe(100)
  })

  it("draws four grid levels evenly out to the radius", () => {
    const { levels, radius } = model()
    expect(RADAR_LEVELS).toBe(4)
    expect(levels).toHaveLength(4)
    expect(levels.at(-1)).toBeCloseTo(radius)
    expect(levels[0]).toBeCloseTo(radius / 4)
  })

  it("leaves room for the axis labels inside the frame", () => {
    const { axes, radius } = model()
    expect(radius).toBeLessThan(150)
    for (const axis of axes) {
      expect(axis.labelX).toBeGreaterThanOrEqual(0)
      expect(axis.labelX).toBeLessThanOrEqual(400)
    }
  })

  it("keeps a usable radius in a narrow frame, shortening long labels", () => {
    const narrow = model({
      size: { width: 240, height: 280 },
      data: data.map((row) => ({
        ...row,
        skill: `${row.skill} and reporting`,
      })),
    })
    expect(narrow.radius).toBeGreaterThanOrEqual(240 / 2 / 2)
    const side = narrow.axes[1]
    expect(side.text.endsWith("…")).toBe(true)
    expect(side.label).toBe("Price and reporting")
    expect(side.labelX + side.text.length * 11 * 0.6).toBeLessThanOrEqual(240)
  })

  it("keeps short labels whole", () => {
    expect(model().axes.map((axis) => axis.text)).toEqual([
      "Speed",
      "Price",
      "Support",
      "Design",
    ])
  })

  it("anchors labels by angle so they sit outside the grid", () => {
    const { axes, center } = model()
    expect(axes[0].anchor).toBe("middle")
    expect(axes[0].labelY).toBeLessThan(axes[0].end.y)
    expect(axes[1].anchor).toBe("start")
    expect(axes[1].labelX).toBeGreaterThan(axes[1].end.x)
    expect(axes[2].labelY).toBeGreaterThan(axes[2].end.y)
    expect(axes[3].anchor).toBe("end")
    expect(axes[3].labelX).toBeLessThan(center.x)
  })

  it("places each series' vertices by value", () => {
    const { series, radius } = model()
    expect(series.map((item) => item.key)).toEqual(["acme", "rival"])
    expect(series[0].radii[0]).toBeCloseTo(radius * 0.8)
    expect(series[1].radii[1]).toBeCloseTo(radius * 0.9)
  })

  it("draws a missing value at the centre", () => {
    const { series } = model({
      data: [...data, { skill: "Docs", acme: null, rival: 10 }],
    })
    expect(series[0].radii[4]).toBe(0)
    expect(series[0].values[4]).toBeNull()
  })

  it("leaves hidden series out", () => {
    expect(
      model({ hidden: new Set(["acme"]) }).series.map((item) => item.key)
    ).toEqual(["rival"])
  })
})

describe("paths and hits", () => {
  it("closes polygons through every axis", () => {
    const radar = model()
    const path = getRadarPolygonPath(radar, radar.series[0].radii)
    expect(path.startsWith("M")).toBe(true)
    expect(path.endsWith("Z")).toBe(true)
    expect(path.split("L")).toHaveLength(4)
    expect(getRadarGridPath(radar, radar.radius)).toMatch(/^M.*Z$/)
  })

  it("finds the axis nearest a point's angle", () => {
    const radar = model()
    const { center } = radar
    expect(getRadarAxisAt(radar, { x: center.x + 5, y: center.y - 80 })).toBe(0)
    expect(getRadarAxisAt(radar, { x: center.x + 80, y: center.y + 5 })).toBe(1)
    expect(getRadarAxisAt(radar, { x: center.x - 5, y: center.y - 80 })).toBe(0)
    expect(getRadarAxisAt(radar, { x: center.x - 80, y: center.y })).toBe(3)
  })

  it("anchors the tooltip at the outermost vertex on the axis", () => {
    const radar = model()
    const anchor = getRadarAnchor(radar, 1)
    expect(anchor).toEqual(getRadarPoint(radar, 1, radar.series[1].radii[1]))
  })
})

describe("interpolateRadarSeries", () => {
  it("moves each vertex by series and axis", () => {
    const from = model()
    const to = model({
      data: data.map((row) => ({ ...row, acme: row.acme / 2 })),
    })
    const halfway = interpolateRadarSeries(from.series, to.series, 0.5)
    expect(halfway?.[0].radii[0]).toBeCloseTo(
      (from.series[0].radii[0] + to.series[0].radii[0]) / 2
    )
  })

  it("grows a new series from the centre and shrinks a leaving one", () => {
    const from = model({ hidden: new Set(["rival"]) })
    const to = model()
    const start = interpolateRadarSeries(from.series, to.series, 0)
    expect(start?.find((item) => item.key === "rival")?.radii).toEqual([
      0, 0, 0, 0,
    ])
    const end = interpolateRadarSeries(to.series, from.series, 1)
    const rival = end?.find((item) => item.key === "rival")
    expect(rival?.isLeaving).toBe(true)
    expect(rival?.radii).toEqual([0, 0, 0, 0])
  })

  it("grows a new axis' vertex from the centre", () => {
    const from = model({ data: data.slice(0, 3) })
    const to = model()
    const start = interpolateRadarSeries(from.series, to.series, 0)
    expect(start?.[0].radii[3]).toBe(0)
    expect(start?.[0].radii[0]).toBeCloseTo(from.series[0].radii[0])
  })

  it("has nothing to morph between two empty charts", () => {
    expect(interpolateRadarSeries([], [], 0.5)).toBeNull()
  })
})

describe("text", () => {
  it("lists every series' value on an axis", () => {
    expect(getRadarTooltip(model(), 2)).toEqual({
      title: "Support",
      rows: [
        expect.objectContaining({ key: "acme", label: "Acme", value: "70" }),
        expect.objectContaining({ key: "rival", label: "Rival", value: "40" }),
      ],
    })
  })

  it("tables a row per axis and a column per series", () => {
    expect(getRadarTable(model())).toEqual({
      columns: ["Acme", "Rival"],
      rows: [
        { header: "Speed", cells: ["80", "60"] },
        { header: "Price", cells: ["50", "90"] },
        { header: "Support", cells: ["70", "40"] },
        { header: "Design", cells: ["90", "55"] },
      ],
    })
  })
})
