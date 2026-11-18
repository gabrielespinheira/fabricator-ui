import { describe, expect, it } from "vitest"

import {
  collapseCandle,
  formatCandlestickValue,
  getCandleBody,
  getCandlestickChartModel,
  getCandlestickTable,
  getCandlestickTooltip,
  getCandleWickX,
  getLastCloseMark,
  interpolateCandles,
  MAX_CANDLE_WIDTH,
  revealCandle,
} from "./chart-candlestick-model"

const data = [
  { day: "Nov 3", open: 100, high: 108, low: 98, close: 106, volume: 1_200 },
  { day: "Nov 4", open: 106, high: 107, low: 99, close: 101, volume: 2_400 },
  { day: "Nov 5", open: 101, high: 104, low: 100, close: 101, volume: 600 },
  { day: "Nov 6", open: 101, high: 112, low: 101, close: 110, volume: 3_000 },
]
const size = { width: 480, height: 300 }

function model(
  options: Partial<Parameters<typeof getCandlestickChartModel>[0]> = {}
) {
  return getCandlestickChartModel({
    data,
    index: "day",
    size,
    fontSize: 12,
    ...options,
  })
}

describe("getCandlestickChartModel", () => {
  it("draws one candle per period, up in success and down in destructive", () => {
    const { candles } = model()
    expect(candles.map((candle) => candle.direction)).toEqual([
      "up",
      "down",
      "up",
      "up",
    ])
    expect(candles[0].paint).toEqual({ token: "success" })
    expect(candles[1].paint).toEqual({ token: "destructive" })
  })

  it("takes the up and down colours and names from config", () => {
    const { candles, directions } = model({
      config: { up: { label: "Gain", color: "chart-series-1" } },
    })
    expect(candles[0].paint).toEqual({ token: "chart-series-1" })
    expect(directions.up.label).toBe("Gain")
    expect(directions.down.label).toBe("Down")
  })

  it("scales prices without zero", () => {
    const { layout } = model()
    expect(layout.scale.domain[0]).toBeGreaterThan(50)
  })

  it("puts the high above the open and the close, and the low below", () => {
    const [candle] = model().candles
    expect(candle.high).toBeLessThan(candle.close)
    expect(candle.close).toBeLessThan(candle.open)
    expect(candle.low).toBeGreaterThan(candle.open)
  })

  it("keeps bodies between 1px and 12px wide, odd so the wick centres", () => {
    const wide = model({ size: { width: 2000, height: 300 } })
    for (const candle of wide.candles) {
      expect(candle.width).toBeLessThanOrEqual(MAX_CANDLE_WIDTH)
      expect(candle.width % 2).toBe(1)
    }
    const many = Array.from({ length: 400 }, (_, index) => ({
      ...data[index % 4],
      day: `D${index}`,
    }))
    const narrow = model({ data: many })
    expect(narrow.candles[0].width).toBeGreaterThanOrEqual(1)
  })

  it("draws volume in a band about a fifth of the plot along the bottom", () => {
    const { volumeArea, layout, price } = model()
    expect(volumeArea).not.toBeNull()
    const band = volumeArea?.height ?? 0
    expect(band / layout.plot.height).toBeGreaterThan(0.15)
    expect(band / layout.plot.height).toBeLessThan(0.25)
    expect(price.y + price.height).toBeLessThan(volumeArea?.y ?? 0)
    const loudest = model().candles[3].volume
    expect(loudest?.top).toBeCloseTo(volumeArea?.y ?? 0)
  })

  it("leaves volume out on request, or when the data has none", () => {
    expect(model({ volume: false }).volumeArea).toBeNull()
    const bare = data.map(({ volume: _volume, ...rest }) => rest)
    const withoutVolume = model({ data: bare })
    expect(withoutVolume.volumeArea).toBeNull()
    expect(withoutVolume.candles[0].volume).toBeNull()
  })

  it("leaves room at the end for the last-close pill", () => {
    const { lastClose, layout } = model()
    expect(lastClose?.label).toBe("110.00")
    expect(lastClose?.pill.x).toBeGreaterThan(layout.plot.x + layout.plot.width)
    expect(
      (lastClose?.pill.x ?? 0) + (lastClose?.pill.width ?? 0)
    ).toBeLessThanOrEqual(size.width)
  })

  it("skips a period missing a price, keeping its place", () => {
    const gappy = model({
      data: [data[0], { day: "Nov 4", open: 1, high: null, low: 1, close: 1 }],
    })
    expect(gappy.candles).toHaveLength(1)
    expect(gappy.centers).toHaveLength(2)
  })

  it("keys candles by their index, so a shifted window keeps them", () => {
    const shifted = model({
      data: [...data.slice(1), { ...data[0], day: "Nov 7" }],
    })
    expect(shifted.candles.map((candle) => candle.id)).toEqual([
      "Nov 4",
      "Nov 5",
      "Nov 6",
      "Nov 7",
    ])
  })
})

describe("getCandleBody", () => {
  it("spans the open and the close, at least 1px tall", () => {
    const [up, , doji] = model().candles
    const body = getCandleBody(up)
    expect(body.y).toBeCloseTo(up.close)
    expect(body.height).toBeCloseTo(up.open - up.close)
    expect(getCandleBody(doji).height).toBe(1)
  })

  it("sits on whole pixels, with the wick down its middle", () => {
    const [candle] = model().candles
    const body = getCandleBody(candle)
    expect(Number.isInteger(body.x)).toBe(true)
    expect(getCandleWickX(candle)).toBeCloseTo(body.x + body.width / 2)
  })
})

describe("revealCandle", () => {
  it("grows the body from its open toward its close", () => {
    const [candle] = model().candles
    const start = revealCandle(candle, 0)
    expect(start.close).toBeCloseTo(candle.open)
    expect(start.high).toBeCloseTo(candle.open)
    expect(start.volume?.top).toBeCloseTo(candle.volume?.bottom ?? 0)
    const halfway = revealCandle(candle, 0.5)
    expect(halfway.close).toBeCloseTo((candle.open + candle.close) / 2)
    expect(revealCandle(candle, 1)).toBe(candle)
  })
})

describe("interpolateCandles", () => {
  it("slides candles that stay and the one that leaves by the same step", () => {
    const from = model()
    const to = model({ data: [...data.slice(1), { ...data[0], day: "Nov 7" }] })
    const end = interpolateCandles(from.candles, to.candles, 1)
    const staying = end.find((candle) => candle.id === "Nov 4")
    expect(staying?.x).toBeCloseTo(to.candles[0].x)
    const leaving = end.find((candle) => candle.id === "Nov 3")
    expect(leaving?.isLeaving).toBe(true)
    expect(leaving?.x).toBeCloseTo(
      from.candles[0].x - (from.centers[1] - from.centers[0])
    )
  })

  it("grows an entering candle from its open, sliding in from the end", () => {
    const from = model()
    const to = model({ data: [...data.slice(1), { ...data[0], day: "Nov 7" }] })
    const start = interpolateCandles(from.candles, to.candles, 0)
    const entering = start.find((candle) => candle.id === "Nov 7")
    const target = to.candles.find((candle) => candle.id === "Nov 7")
    expect(entering?.close).toBeCloseTo(target?.open ?? 0)
    expect(entering?.x).toBeGreaterThan(target?.x ?? 0)
  })

  it("collapses a candle onto its open", () => {
    const [candle] = model().candles
    const collapsed = collapseCandle(candle)
    expect(collapsed.low).toBe(candle.open)
    expect(collapsed.volume?.top).toBe(candle.volume?.bottom)
  })
})

describe("getLastCloseMark", () => {
  it("follows the latest candle that isn't leaving", () => {
    const current = model()
    const mark = getLastCloseMark(current, current.candles)
    expect(mark?.y).toBeCloseTo(current.candles[3].close)
    expect(mark?.pill.y).toBeCloseTo(
      (mark?.y ?? 0) - (mark?.pill.height ?? 0) / 2
    )
  })

  it("stays inside the frame", () => {
    const current = model()
    const mark = getLastCloseMark(current, [
      { ...current.candles[3], close: -40 },
    ])
    expect(mark?.pill.y).toBe(0)
  })
})

describe("getCandlestickTooltip", () => {
  it("lists the prices, the volume and the change from the previous close", () => {
    const tooltip = getCandlestickTooltip(model(), 1)
    expect(tooltip.title).toBe("Nov 4")
    expect(tooltip.rows.map((row) => [row.label, row.value])).toEqual([
      ["Open", "106.00"],
      ["High", "107.00"],
      ["Low", "99.00"],
      ["Close", "101.00"],
      ["Volume", "2.4K"],
      ["Change", "-4.72%"],
    ])
    expect(tooltip.rows.at(-1)?.paint).toEqual({ token: "destructive" })
  })

  it("signs a rise and dashes the first period's change", () => {
    expect(getCandlestickTooltip(model(), 3).rows.at(-1)?.value).toBe("+8.91%")
    expect(getCandlestickTooltip(model(), 0).rows.at(-1)?.value).toBe("–")
  })
})

describe("getCandlestickTable", () => {
  it("has a row per period and a column per field", () => {
    const table = getCandlestickTable(model())
    expect(table.columns).toEqual([
      "Open",
      "High",
      "Low",
      "Close",
      "Volume",
      "Change",
    ])
    expect(table.rows[2]).toEqual({
      header: "Nov 5",
      cells: ["101.00", "104.00", "100.00", "101.00", "600", "0.00%"],
    })
  })
})

describe("formatCandlestickValue", () => {
  it("writes prices with two decimals and volume compact", () => {
    expect(formatCandlestickValue(1234.5, "close")).toBe("1,234.50")
    expect(formatCandlestickValue(1_250_000, "volume")).toBe("1.3M")
  })
})
