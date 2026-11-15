import { describe, expect, it } from "vitest"

import { getBarChartModel } from "./chart-bar-model"
import {
  COMPOSITION_BAND_PADDING,
  COMPOSITION_MAX_THICKNESS,
  formatCompositionShare,
  getCompositionShares,
} from "./chart-composition-model"

const data = [
  { day: "Mon", search: 60, direct: 30, social: 10 },
  { day: "Tue", search: 50, direct: 25, social: 25 },
  { day: "Wed", search: 20, direct: null, social: 60 },
]
const config = {
  search: { label: "Search" },
  direct: { label: "Direct" },
  social: { label: "Social" },
}

describe("getCompositionShares", () => {
  it("gives each part's share of the inspected column", () => {
    const shares = getCompositionShares({ data, config, position: 0 })
    expect(shares.map((item) => item.share)).toEqual([0.6, 0.3, 0.1])
    expect(shares.map((item) => item.text)).toEqual(["60.0%", "30.0%", "10.0%"])
  })

  it("reads the latest column when nothing is inspected", () => {
    const shares = getCompositionShares({ data, config, position: null })
    expect(shares[0].share).toBeCloseTo(0.25)
    expect(shares[2].share).toBeCloseTo(0.75)
  })

  it("writes a missing part as a dash", () => {
    const shares = getCompositionShares({ data, config, position: 2 })
    expect(shares[1]).toEqual(
      expect.objectContaining({ key: "direct", share: null, text: "–" })
    )
  })

  it("shares the column among the visible parts only", () => {
    const shares = getCompositionShares({
      data,
      config,
      hidden: new Set(["social"]),
      position: 0,
    })
    expect(shares[0].share).toBeCloseTo(60 / 90)
    expect(shares[2]).toEqual(
      expect.objectContaining({ isHidden: true, share: null, text: "–" })
    )
  })

  it("keeps every part's colour when one is hidden", () => {
    const shares = getCompositionShares({
      data,
      config,
      hidden: new Set(["search"]),
      position: 0,
    })
    expect(shares[2].paint).toEqual({ token: "chart-series-3" })
  })

  it("counts negative values as nothing, as the columns do", () => {
    const shares = getCompositionShares({
      data: [{ day: "Mon", search: -20, direct: 50, social: 50 }],
      config,
      position: 0,
    })
    expect(shares.map((item) => item.share)).toEqual([0, 0.5, 0.5])
  })

  it("has nothing to share without data", () => {
    const shares = getCompositionShares({ data: [], config, position: null })
    expect(shares.every((item) => item.text === "–")).toBe(true)
  })
})

describe("formatCompositionShare", () => {
  it("keeps one decimal so the legend doesn't shift while scrubbing", () => {
    expect(formatCompositionShare(0.4)).toBe("40.0%")
    expect(formatCompositionShare(1)).toBe("100.0%")
  })
})

describe("composition columns", () => {
  it("are wider than bars and fill the plot", () => {
    const model = getBarChartModel({
      data: data.slice(0, 2),
      config,
      index: "day",
      size: { width: 600, height: 300 },
      fontSize: 12,
      stack: "expand",
      maxThickness: COMPOSITION_MAX_THICKNESS,
      bandPadding: COMPOSITION_BAND_PADDING,
    })
    const column = model.bars.filter((bar) => bar.index === 0)
    expect(column[0].width).toBe(COMPOSITION_MAX_THICKNESS)
    expect(Math.min(...column.map((bar) => bar.y))).toBeCloseTo(
      model.layout.plot.y
    )
  })
})
