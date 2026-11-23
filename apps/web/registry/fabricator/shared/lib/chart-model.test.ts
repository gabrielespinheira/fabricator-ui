import { describe, expect, it } from "vitest"

import {
  areChartMarksPropsEqual,
  CHART_TICK_GAP,
  estimateTextWidth,
  formatChartNumber,
  formatChartPercent,
  getAxisFormatter,
  getChartPaint,
  getChartSeries,
  getCubicBezier,
  getIndexLabelIndices,
  getNearestIndex,
  getScaledDuration,
  getScrubTick,
  getStaggeredProgress,
  getSteadyDrawOrder,
  getSteppedIndex,
  getTickCount,
  getTooltipPosition,
  getValueScale,
  interpolateNumber,
  parseCssDuration,
  parseCubicBezier,
  readChartNumber,
} from "./chart-model"

describe("getChartPaint", () => {
  it("takes a palette slot in order when no colour is set", () => {
    expect(getChartPaint(undefined, 0)).toEqual({ token: "chart-series-1" })
    expect(getChartPaint(undefined, 7)).toEqual({ token: "chart-series-8" })
  })

  it("never cycles: a ninth series is grey", () => {
    expect(getChartPaint(undefined, 8)).toEqual({ token: "muted-foreground" })
  })

  it("reads palette slots, upstream chart tokens and roles as tokens", () => {
    expect(getChartPaint("chart-series-3", 0)).toEqual({
      token: "chart-series-3",
    })
    expect(getChartPaint("chart-2", 0)).toEqual({ token: "chart-2" })
    expect(getChartPaint("primary", 0)).toEqual({ token: "primary" })
    expect(getChartPaint("success", 0)).toEqual({ token: "success" })
  })

  it("reads var() as the variable's token", () => {
    expect(getChartPaint("var(--brand)", 0)).toEqual({ token: "brand" })
  })

  it("passes any other colour through", () => {
    expect(getChartPaint("#ff5500", 0)).toEqual({ value: "#ff5500" })
    expect(getChartPaint("oklch(0.6 0.1 200)", 0)).toEqual({
      value: "oklch(0.6 0.1 200)",
    })
  })
})

describe("getChartSeries", () => {
  const config = {
    revenue: { label: "Revenue" },
    costs: { label: "Costs", color: "destructive" },
    target: { label: "Target", dashed: true },
  }

  it("lists series in config order with their slots", () => {
    expect(getChartSeries(config)).toEqual([
      {
        key: "revenue",
        label: "Revenue",
        paint: { token: "chart-series-1" },
        dashed: false,
      },
      {
        key: "costs",
        label: "Costs",
        paint: { token: "destructive" },
        dashed: false,
      },
      {
        key: "target",
        label: "Target",
        paint: { token: "chart-series-3" },
        dashed: true,
      },
    ])
  })

  it("keeps a series' colour when another is hidden", () => {
    const visible = getChartSeries(config, new Set(["revenue"]))
    expect(visible.map((series) => series.key)).toEqual(["costs", "target"])
    expect(visible[1].paint).toEqual({ token: "chart-series-3" })
  })
})

describe("readChartNumber", () => {
  it("reads finite numbers and numeric strings", () => {
    expect(readChartNumber({ a: 4 }, "a")).toBe(4)
    expect(readChartNumber({ a: "4.5" }, "a")).toBe(4.5)
  })

  it("treats anything else as a gap", () => {
    expect(readChartNumber({ a: null }, "a")).toBeNull()
    expect(readChartNumber({}, "a")).toBeNull()
    expect(readChartNumber({ a: Number.NaN }, "a")).toBeNull()
    expect(readChartNumber({ a: "n/a" }, "a")).toBeNull()
  })
})

describe("formatChartNumber", () => {
  it("writes small numbers in full with grouping", () => {
    expect(formatChartNumber(0)).toBe("0")
    expect(formatChartNumber(999)).toBe("999")
    expect(formatChartNumber(1234)).toBe("1,234")
    expect(formatChartNumber(12.345)).toBe("12.35")
    expect(formatChartNumber(-4200)).toBe("-4,200")
  })

  it("compacts on request, one decimal under ten units", () => {
    expect(formatChartNumber(1234, { compact: true })).toBe("1.2K")
    expect(formatChartNumber(12_345, { compact: true })).toBe("12K")
    expect(formatChartNumber(2_000, { compact: true })).toBe("2K")
    expect(formatChartNumber(3_450_000, { compact: true })).toBe("3.5M")
    expect(formatChartNumber(7_100_000_000, { compact: true })).toBe("7.1B")
    expect(formatChartNumber(-12_000, { compact: true })).toBe("-12K")
    expect(formatChartNumber(640, { compact: true })).toBe("640")
  })
})

describe("formatChartPercent", () => {
  it("writes a share with one decimal", () => {
    expect(formatChartPercent(0.373)).toBe("37.3%")
    expect(formatChartPercent(1)).toBe("100%")
    expect(formatChartPercent(0)).toBe("0%")
  })
})

describe("getAxisFormatter", () => {
  it("writes ticks in full under 10,000", () => {
    expect(getAxisFormatter(8_000)(2_000)).toBe("2,000")
  })

  it("compacts every tick once the axis reaches 10,000", () => {
    const format = getAxisFormatter(80_000)
    expect(format(0)).toBe("0")
    expect(format(20_000)).toBe("20K")
    expect(format(2_500)).toBe("2.5K")
  })
})

describe("getValueScale", () => {
  it("rounds the domain to clean ticks that include zero", () => {
    const scale = getValueScale({
      min: 12,
      max: 76,
      range: [200, 0],
      tickCount: 4,
    })
    expect(scale.domain).toEqual([0, 80])
    expect(scale.ticks).toEqual([0, 20, 40, 60, 80])
    expect(scale.toPixel(0)).toBe(200)
    expect(scale.toPixel(80)).toBe(0)
    expect(scale.toPixel(40)).toBe(100)
  })

  it("can leave zero out, for prices", () => {
    const scale = getValueScale({
      min: 2352,
      max: 2440,
      range: [100, 0],
      tickCount: 4,
      includeZero: false,
    })
    expect(scale.domain[0]).toBeGreaterThan(2000)
    expect(scale.domain[0]).toBeLessThanOrEqual(2352)
    expect(scale.domain[1]).toBeGreaterThanOrEqual(2440)
  })

  it("gives an empty or flat series a usable domain", () => {
    expect(
      getValueScale({ min: 0, max: 0, range: [100, 0], tickCount: 4 }).domain
    ).toEqual([0, 1])
  })
})

describe("getTickCount", () => {
  it("fits a tick roughly every 56px, at least two", () => {
    expect(getTickCount(280)).toBe(5)
    expect(getTickCount(60)).toBe(2)
  })
})

describe("getNearestIndex", () => {
  const positions = [0, 10, 20, 30]

  it("snaps to the closest position", () => {
    expect(getNearestIndex(positions, 14)).toBe(1)
    expect(getNearestIndex(positions, 16)).toBe(2)
  })

  it("clamps outside the range", () => {
    expect(getNearestIndex(positions, -40)).toBe(0)
    expect(getNearestIndex(positions, 400)).toBe(3)
  })

  it("has nothing to snap to when empty", () => {
    expect(getNearestIndex([], 5)).toBe(-1)
  })
})

describe("getSteppedIndex", () => {
  it("steps with the arrows and jumps with Home and End", () => {
    expect(getSteppedIndex(2, "ArrowRight", 5)).toBe(3)
    expect(getSteppedIndex(2, "ArrowUp", 5)).toBe(3)
    expect(getSteppedIndex(2, "ArrowLeft", 5)).toBe(1)
    expect(getSteppedIndex(2, "ArrowDown", 5)).toBe(1)
    expect(getSteppedIndex(2, "Home", 5)).toBe(0)
    expect(getSteppedIndex(2, "End", 5)).toBe(4)
  })

  it("stops at the ends", () => {
    expect(getSteppedIndex(4, "ArrowRight", 5)).toBe(4)
    expect(getSteppedIndex(0, "ArrowLeft", 5)).toBe(0)
  })

  it("starts from the first mark, or the last going back", () => {
    expect(getSteppedIndex(-1, "ArrowRight", 5)).toBe(0)
    expect(getSteppedIndex(-1, "ArrowLeft", 5)).toBe(4)
  })

  it("ignores other keys", () => {
    expect(getSteppedIndex(2, "Enter", 5)).toBeNull()
  })
})

describe("getIndexLabelIndices", () => {
  it("keeps every label that fits", () => {
    expect(getIndexLabelIndices(4, 400, 30)).toEqual([0, 1, 2, 3])
  })

  it("thins labels evenly, always keeping the last", () => {
    expect(getIndexLabelIndices(12, 300, 40)).toEqual([1, 3, 5, 7, 9, 11])
  })

  it("keeps the last label alone when only one fits", () => {
    expect(getIndexLabelIndices(12, 40, 40)).toEqual([11])
  })
})

describe("estimateTextWidth", () => {
  it("scales with length and size", () => {
    expect(estimateTextWidth("Jan", 12)).toBeCloseTo(3 * 12 * 0.6)
    expect(estimateTextWidth("", 12)).toBe(0)
  })
})

describe("getTooltipPosition", () => {
  const frame = { width: 400, height: 200 }
  const tooltip = { width: 120, height: 60 }

  it("sits after the anchor, centred on it", () => {
    expect(
      getTooltipPosition({ anchor: { x: 100, y: 100 }, frame, tooltip })
    ).toEqual({ x: 112, y: 70, placement: "after" })
  })

  it("flips before the anchor near the end edge", () => {
    expect(
      getTooltipPosition({ anchor: { x: 350, y: 100 }, frame, tooltip })
    ).toEqual({ x: 218, y: 70, placement: "before" })
  })

  it("stays inside the frame vertically", () => {
    expect(
      getTooltipPosition({ anchor: { x: 100, y: 5 }, frame, tooltip }).y
    ).toBe(0)
    expect(
      getTooltipPosition({ anchor: { x: 100, y: 199 }, frame, tooltip }).y
    ).toBe(140)
  })

  it("can sit above the anchor, for a finger", () => {
    expect(
      getTooltipPosition({
        anchor: { x: 200, y: 150 },
        frame,
        tooltip,
        side: "top",
      })
    ).toEqual({ x: 140, y: 78, placement: "above" })
  })

  it("moves beside the anchor when there's no room above it", () => {
    expect(
      getTooltipPosition({
        anchor: { x: 100, y: 40 },
        frame,
        tooltip,
        side: "top",
      })
    ).toEqual({ x: 112, y: 10, placement: "after" })
  })

  it("clamps a top tooltip to the frame's sides", () => {
    expect(
      getTooltipPosition({
        anchor: { x: 10, y: 150 },
        frame,
        tooltip,
        side: "top",
      }).x
    ).toBe(0)
  })
})

describe("parseCssDuration", () => {
  it("reads milliseconds and the seconds a minifier writes", () => {
    expect(parseCssDuration("250ms")).toBe(250)
    expect(parseCssDuration(" .25s")).toBe(250)
    expect(parseCssDuration("0.6s")).toBe(600)
    expect(parseCssDuration("0")).toBe(0)
    expect(parseCssDuration("")).toBe(0)
    expect(parseCssDuration("fast")).toBe(0)
  })
})

describe("getScaledDuration", () => {
  it("multiplies a role's duration by the motion scale", () => {
    expect(getScaledDuration("90ms", "1")).toBe(90)
    expect(getScaledDuration(".09s", "1.5")).toBe(135)
    expect(getScaledDuration("90ms", "0")).toBe(0)
  })

  it("reads a missing scale as 1 and a missing duration as 0", () => {
    expect(getScaledDuration("90ms", "")).toBe(90)
    expect(getScaledDuration("", "2")).toBe(0)
  })
})

describe("cubic bezier", () => {
  it("parses a CSS curve", () => {
    expect(parseCubicBezier("cubic-bezier(0.23, 1, 0.32, 1)")).toEqual([
      0.23, 1, 0.32, 1,
    ])
    expect(parseCubicBezier("linear(0, 1)")).toBeNull()
  })

  it("starts at 0, ends at 1 and eases", () => {
    const ease = getCubicBezier([0.23, 1, 0.32, 1])
    expect(ease(0)).toBe(0)
    expect(ease(1)).toBe(1)
    expect(ease(0.5)).toBeGreaterThan(0.8)
  })

  it("is the identity for a linear curve", () => {
    const ease = getCubicBezier([0, 0, 1, 1])
    expect(ease(0.3)).toBeCloseTo(0.3, 4)
  })
})

describe("interpolateNumber", () => {
  it("blends two numbers", () => {
    expect(interpolateNumber(0, 10, 0.25)).toBe(2.5)
  })
})

describe("getSteadyDrawOrder", () => {
  it("keeps a leaving key where it was drawn", () => {
    // The tweens list leaving marks last: "a" is leaving.
    expect(getSteadyDrawOrder(["a", "b", "c"], ["b", "c", "a"])).toEqual([
      "a",
      "b",
      "c",
    ])
  })

  it("returns the previous order itself when no key is new", () => {
    const previous = ["a", "b", "c"]
    expect(getSteadyDrawOrder(previous, ["c", "a", "b"])).toBe(previous)
  })

  it("remembers a key that left, so it keeps its place if it comes back", () => {
    // The tween's first render after a change lists only the new target,
    // without the marks about to leave.
    const target = getSteadyDrawOrder(["a", "b", "c"], ["b", "c"])
    expect(getSteadyDrawOrder(target, ["b", "c", "a"])).toEqual(["a", "b", "c"])
  })

  it("puts a new key after the one it follows in the next order", () => {
    expect(getSteadyDrawOrder(["b", "c"], ["a", "b", "c"])).toEqual([
      "a",
      "b",
      "c",
    ])
    expect(getSteadyDrawOrder(["a", "c"], ["a", "b", "c"])).toEqual([
      "a",
      "b",
      "c",
    ])
    expect(getSteadyDrawOrder(["a"], ["a", "b", "c"])).toEqual(["a", "b", "c"])
  })

  it("starts from the next order when nothing was drawn", () => {
    expect(getSteadyDrawOrder([], ["a", "b"])).toEqual(["a", "b"])
  })

  it("forgets the keys that left once they outnumber the ones drawn", () => {
    // Live data: every tick adds a key and retires the oldest.
    let order: readonly string[] = ["0", "1"]
    for (let tick = 2; tick < 200; tick += 1) {
      order = getSteadyDrawOrder(order, [String(tick - 1), String(tick)])
    }
    expect(order.length).toBeLessThanOrEqual(2 + 32 + 1)
    expect(order.slice(-2)).toEqual(["198", "199"])
  })
})

describe("getStaggeredProgress", () => {
  it("starts later marks later and ends them all together", () => {
    expect(getStaggeredProgress(0.2, 0, 5)).toBeGreaterThan(0)
    expect(getStaggeredProgress(0.2, 4, 5)).toBe(0)
    for (let order = 0; order < 5; order++) {
      expect(getStaggeredProgress(1, order, 5)).toBe(1)
    }
  })

  it("is the plain progress for a single mark", () => {
    expect(getStaggeredProgress(0.4, 0, 1)).toBe(0.4)
  })
})

describe("areChartMarksPropsEqual", () => {
  const colors = { "--chart-series-1": "#f00", "--chart-series-2": "#0f0" }

  it("sees through a new colours object with the same colours", () => {
    expect(
      areChartMarksPropsEqual(
        { colors, spotlight: null, opacity: 0.4 },
        { colors: { ...colors }, spotlight: null, opacity: 0.4 }
      )
    ).toBe(true)
  })

  it("tells a changed colour apart", () => {
    expect(
      areChartMarksPropsEqual(
        { colors, spotlight: null },
        { colors: { ...colors, "--chart-series-2": "#00f" }, spotlight: null }
      )
    ).toBe(false)
  })

  it("tells an added or removed colour apart", () => {
    expect(
      areChartMarksPropsEqual(
        { colors, spotlight: null },
        { colors: { "--chart-series-1": "#f00" }, spotlight: null }
      )
    ).toBe(false)
  })

  it("compares every other prop by identity", () => {
    type MarksProps = {
      colors: Record<string, string>
      series: { key: string }[]
      spotlight: string | null
    }
    const series = [{ key: "a" }]
    const settled: MarksProps = { colors, series, spotlight: null }
    const spotlit: MarksProps = { colors, series, spotlight: "a" }
    const rebuilt: MarksProps = {
      colors,
      series: [{ key: "a" }],
      spotlight: null,
    }
    expect(areChartMarksPropsEqual(settled, spotlit)).toBe(false)
    expect(areChartMarksPropsEqual(settled, rebuilt)).toBe(false)
    expect(areChartMarksPropsEqual(settled, { ...settled })).toBe(true)
  })
})

describe("getScrubTick", () => {
  it("plays the first snap at once", () => {
    expect(getScrubTick(1000, null)).toEqual({ isPlayed: true })
  })

  it("plays a snap a full gap after the last tick", () => {
    expect(getScrubTick(1040, 1000)).toEqual({ isPlayed: true })
    expect(getScrubTick(1100, 1000)).toEqual({ isPlayed: true })
  })

  it("holds a snap inside the gap until the gap has passed", () => {
    expect(getScrubTick(1010, 1000)).toEqual({ isPlayed: false, wait: 30 })
    expect(getScrubTick(1039, 1000)).toEqual({ isPlayed: false, wait: 1 })
  })

  it("spaces ticks by CHART_TICK_GAP by default", () => {
    expect(CHART_TICK_GAP).toBe(40)
    expect(getScrubTick(1000 + CHART_TICK_GAP - 1, 1000).isPlayed).toBe(false)
  })

  it("takes another gap", () => {
    expect(getScrubTick(1050, 1000, 80)).toEqual({ isPlayed: false, wait: 30 })
  })
})
