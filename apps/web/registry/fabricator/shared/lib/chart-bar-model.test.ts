import { describe, expect, it } from "vitest"

import {
  getBarChartModel,
  getBarPath,
  getBarTooltip,
  interpolateBars,
  MAX_BAR_THICKNESS,
} from "./chart-bar-model"

const data = [
  { region: "North", online: 60, retail: 30 },
  { region: "South", online: 40, retail: -10 },
  { region: "East", online: 20, retail: 50 },
]
const config = { online: { label: "Online" }, retail: { label: "Retail" } }
const size = { width: 600, height: 300 }

function model(options: Partial<Parameters<typeof getBarChartModel>[0]> = {}) {
  return getBarChartModel({
    data,
    config,
    index: "region",
    size,
    fontSize: 12,
    ...options,
  })
}

describe("getBarChartModel", () => {
  it("draws one bar per series per category, side by side", () => {
    const { bars } = model()
    expect(bars).toHaveLength(6)
    const [online, retail] = bars.filter((bar) => bar.index === 0)
    expect(retail.x - (online.x + online.width)).toBeCloseTo(2)
  })

  it("caps bars at 24px, leaving the rest of the band as air", () => {
    const { bars } = model({ size: { width: 2000, height: 300 } })
    for (const bar of bars)
      expect(bar.width).toBeLessThanOrEqual(MAX_BAR_THICKNESS)
  })

  it("grows bars from zero, down for negative values", () => {
    const { bars, baseline } = model()
    const positive = bars.find((bar) => bar.key === "online" && bar.index === 0)
    const negative = bars.find((bar) => bar.key === "retail" && bar.index === 1)
    expect((positive?.y ?? 0) + (positive?.height ?? 0)).toBeCloseTo(baseline)
    expect(negative?.y).toBeCloseTo(baseline)
    expect(positive?.rounded).toBe("top")
    expect(negative?.rounded).toBe("bottom")
  })

  it("stacks series with a 2px gap and rounds only the outer end", () => {
    const { bars } = model({ stack: "stacked" })
    const [online, retail] = bars.filter((bar) => bar.index === 0)
    expect(online.x).toBeCloseTo(retail.x)
    expect(online.y - (retail.y + retail.height)).toBeCloseTo(2)
    expect(online.rounded).toBe("none")
    expect(retail.rounded).toBe("top")
  })

  it("fills the plot height when expanded", () => {
    const { bars, layout } = model({ stack: "expand" })
    const column = bars.filter((bar) => bar.index === 2)
    const top = Math.min(...column.map((bar) => bar.y))
    expect(top).toBeCloseTo(layout.plot.y)
  })

  it("lays bars along x when horizontal", () => {
    const { bars, baseline } = model({ layout: "horizontal" })
    const bar = bars.find((item) => item.key === "online" && item.index === 0)
    expect(bar?.x).toBeCloseTo(baseline)
    expect(bar?.rounded).toBe("end")
    expect(bar?.height).toBeLessThanOrEqual(MAX_BAR_THICKNESS)
  })

  it("gives each category a highlight band and a centre to snap to", () => {
    const { bands, centers, layout } = model()
    expect(bands).toHaveLength(3)
    expect(centers).toHaveLength(3)
    expect(bands[0].y).toBeCloseTo(layout.plot.y)
    expect(bands[0].height).toBeCloseTo(layout.plot.height)
  })

  it("skips missing values", () => {
    const { bars } = getBarChartModel({
      data: [{ region: "North", online: null, retail: 5 }],
      config,
      index: "region",
      size,
      fontSize: 12,
    })
    expect(bars.map((bar) => bar.key)).toEqual(["retail"])
  })
})

describe("getBarPath", () => {
  it("rounds the data end and keeps the baseline square", () => {
    expect(
      getBarPath({ x: 0, y: 0, width: 20, height: 40, rounded: "top" })
    ).toBe("M0,40L0,4Q0,0 4,0L16,0Q20,0 20,4L20,40Z")
  })

  it("draws a plain rectangle without rounding", () => {
    expect(
      getBarPath({ x: 0, y: 0, width: 20, height: 40, rounded: "none" })
    ).toBe("M0,0L20,0L20,40L0,40Z")
  })

  it("shrinks the radius for tiny bars", () => {
    expect(
      getBarPath({ x: 0, y: 0, width: 20, height: 2, rounded: "top" })
    ).toBe("M0,2L0,2Q0,0 2,0L18,0Q20,0 20,2L20,2Z")
  })
})

describe("interpolateBars", () => {
  it("grows a new bar from the baseline", () => {
    const from = model({ hidden: new Set(["retail"]) })
    const to = model()
    const start = interpolateBars(from, to, 0)
    const retail = start.find((bar) => bar.key === "retail" && bar.index === 0)
    expect(retail?.height).toBeCloseTo(0)
    expect(retail?.y).toBeCloseTo(to.baseline)
  })

  it("moves a bar that stays", () => {
    const from = model()
    const to = model({ stack: "stacked" })
    const halfway = interpolateBars(from, to, 0.5)
    const retail = halfway.find(
      (bar) => bar.key === "retail" && bar.index === 0
    )
    const start = from.bars.find(
      (bar) => bar.key === "retail" && bar.index === 0
    )
    const end = to.bars.find((bar) => bar.key === "retail" && bar.index === 0)
    expect(retail?.x).toBeCloseTo(((start?.x ?? 0) + (end?.x ?? 0)) / 2)
  })

  it("shrinks a leaving bar into the baseline and marks it", () => {
    const end = interpolateBars(
      model(),
      model({ hidden: new Set(["retail"]) }),
      1
    )
    const retail = end.find((bar) => bar.key === "retail" && bar.index === 0)
    expect(retail?.isLeaving).toBe(true)
    expect(retail?.height).toBeCloseTo(0)
  })
})

describe("getBarTooltip", () => {
  it("lists the category's series", () => {
    expect(getBarTooltip(model(), 1)).toEqual({
      title: "South",
      rows: [
        expect.objectContaining({ key: "online", value: "40" }),
        expect.objectContaining({ key: "retail", value: "-10" }),
      ],
    })
  })
})
