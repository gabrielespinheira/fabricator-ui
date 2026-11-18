// Candlestick charts: open, high, low and close per period, with an optional
// volume band along the bottom and a dashed line at the latest close. Up
// candles take the success role and down ones destructive, and the tooltip
// signs every change, so colour never carries the direction alone. Candles
// are keyed by their index, so a window that gains a period and drops the
// oldest slides along.

import {
  getBandPositions,
  getCartesianLayout,
  type CartesianLayout,
  type ChartRect,
} from "./chart-cartesian-model"
import {
  estimateTextWidth,
  formatChartNumber,
  getChartPaint,
  getIndexLabelIndices,
  interpolateNumber,
  MISSING_VALUE,
  readChartNumber,
  readChartText,
  type ChartDatum,
  type ChartPaint,
  type ChartSeriesConfig,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
  type ChartTooltipRow,
} from "./chart-model"

export type CandlestickField = "open" | "high" | "low" | "close" | "volume"

export type CandlestickDirection = "up" | "down"

/** Names and colours for rising and falling periods. */
export type CandlestickConfig = Partial<
  Record<CandlestickDirection, Pick<ChartSeriesConfig, "label" | "color">>
>

export type CandlestickValues = {
  open: number
  high: number
  low: number
  close: number
  volume: number | null
}

export type Candle = {
  id: string
  index: number
  direction: CandlestickDirection
  paint: ChartPaint
  /** The centre along the index axis and the body's width, in pixels. */
  x: number
  width: number
  /** Prices as y positions, in pixels. */
  open: number
  high: number
  low: number
  close: number
  /** The volume bar's top and bottom, null without volume. */
  volume: { top: number; bottom: number } | null
  /** Set while a candle that left the data slides out. */
  isLeaving?: boolean
}

export type CandlestickLastClose = {
  value: number
  label: string
  y: number
  pill: ChartRect
  /** The frame's height, which the pill stays inside. */
  frameHeight: number
}

export type CandlestickChartModel = {
  /** The whole plot (prices and volume) and the price scale. */
  layout: CartesianLayout
  /** The part of the plot prices are drawn in, above the volume band. */
  price: ChartRect
  volumeArea: ChartRect | null
  candles: Candle[]
  /** Each period's centre along the index axis, for snapping. */
  centers: number[]
  labels: string[]
  labelIndices: number[]
  values: (CandlestickValues | null)[]
  directions: Record<CandlestickDirection, { label: string; paint: ChartPaint }>
  lastClose: CandlestickLastClose | null
}

export const MAX_CANDLE_WIDTH = 12
const VOLUME_SHARE = 0.2
const VOLUME_GAP = 8
const PILL_GAP = 6
const PILL_PADDING = 6

const DEFAULT_DIRECTIONS = {
  up: { label: "Up", color: "success" },
  down: { label: "Down", color: "destructive" },
} as const

const FIELD_LABELS: Record<CandlestickField, string> = {
  open: "Open",
  high: "High",
  low: "Low",
  close: "Close",
  volume: "Volume",
}

/** Prices with two decimals; volume compact. */
export function formatCandlestickValue(value: number, key: string) {
  if (key === "volume") return formatChartNumber(value, { compact: true })
  const [whole, fraction = ""] = formatChartNumber(value).split(".")
  return `${whole}.${fraction.padEnd(2, "0")}`
}

/** A change as a signed percentage with two decimals: `+1.24%`, `-0.85%`. */
export function formatSignedPercent(change: number) {
  const percent = Math.abs(change * 100).toFixed(2)
  if (Number(percent) === 0) return `${percent}%`
  return `${change > 0 ? "+" : "-"}${percent}%`
}

function readCandle(datum: ChartDatum): CandlestickValues | null {
  const open = readChartNumber(datum, "open")
  const high = readChartNumber(datum, "high")
  const low = readChartNumber(datum, "low")
  const close = readChartNumber(datum, "close")
  if (open === null || high === null || low === null || close === null) {
    return null
  }
  return { open, high, low, close, volume: readChartNumber(datum, "volume") }
}

function getIds(keys: readonly string[]) {
  const seen = new Set<string>()
  return keys.map((key, index) => {
    const id = seen.has(key) ? `${key}#${index}` : key
    seen.add(id)
    return id
  })
}

export function getCandlestickChartModel<TDatum extends ChartDatum>({
  data,
  index,
  size,
  fontSize,
  config = {},
  volume,
  formatValue = formatCandlestickValue,
  formatIndex,
}: {
  data: readonly TDatum[]
  index: string
  size: ChartSize
  fontSize: number
  config?: CandlestickConfig
  /** Draws the volume band; on by default when the data has volume. */
  volume?: boolean
  formatValue?: (value: number, key: string) => string
  formatIndex?: (value: string, datum: TDatum) => string
}): CandlestickChartModel {
  const labels = data.map((datum) => {
    const text = readChartText(datum, index)
    return formatIndex ? formatIndex(text, datum) : text
  })
  const values = data.map(readCandle)
  const directions = {
    up: {
      label: config.up?.label ?? DEFAULT_DIRECTIONS.up.label,
      paint: getChartPaint(config.up?.color ?? DEFAULT_DIRECTIONS.up.color, 0),
    },
    down: {
      label: config.down?.label ?? DEFAULT_DIRECTIONS.down.label,
      paint: getChartPaint(
        config.down?.color ?? DEFAULT_DIRECTIONS.down.color,
        0
      ),
    },
  }
  const candlesIn = values.filter(
    (value): value is CandlestickValues => value !== null
  )
  const volumes = candlesIn.flatMap((value) =>
    value.volume === null ? [] : [Math.max(0, value.volume)]
  )
  const showVolume = (volume ?? volumes.length > 0) && volumes.length > 0
  const min = candlesIn.length
    ? Math.min(...candlesIn.map((value) => value.low))
    : 0
  const max = candlesIn.length
    ? Math.max(...candlesIn.map((value) => value.high))
    : 1

  const lastIndex = values.findLastIndex((value) => value !== null)
  const last = lastIndex >= 0 ? values[lastIndex] : null
  const pillLabel = last ? formatValue(last.close, "close") : ""
  const pillWidth = last
    ? Math.ceil(estimateTextWidth(pillLabel, fontSize) + PILL_PADDING * 2)
    : 0
  const pillHeight = Math.ceil(fontSize * 1.25) + 4
  // The pill sits past the plot's end edge, so the plot gives it room.
  const width = Math.max(1, size.width - (last ? pillWidth + PILL_GAP : 0))
  const layoutFor = (height: number) =>
    getCartesianLayout({
      size: { width, height },
      labels,
      min,
      max,
      fontSize,
      includeZero: false,
    })
  const full = layoutFor(size.height)
  const volumeHeight = showVolume
    ? Math.round(full.plot.height * VOLUME_SHARE)
    : 0
  // Prices get the plot above the volume band and its gap; the index labels
  // stay under the band.
  const priceLayout = showVolume
    ? layoutFor(size.height - volumeHeight - VOLUME_GAP)
    : full
  const price = priceLayout.plot
  const plot = showVolume
    ? { ...price, height: price.height + VOLUME_GAP + volumeHeight }
    : price
  const layout = { ...priceLayout, plot }
  const volumeArea = showVolume
    ? {
        x: plot.x,
        y: price.y + price.height + VOLUME_GAP,
        width: plot.width,
        height: volumeHeight,
      }
    : null

  const bands = getBandPositions(data.length, plot.x, plot.width, 0.3)
  const bodyWidth = Math.max(
    1,
    Math.min(MAX_CANDLE_WIDTH, Math.floor(bands.bandwidth))
  )
  // An odd width puts the 1px wick on the body's middle column.
  const candleWidth = bodyWidth % 2 === 0 ? bodyWidth - 1 : bodyWidth
  const toPixel = priceLayout.scale.toPixel
  const loudest = Math.max(1, ...volumes)
  const ids = getIds(data.map((datum) => readChartText(datum, index)))

  const candles: Candle[] = []
  values.forEach((value, position) => {
    if (!value) return
    const direction = value.close >= value.open ? "up" : "down"
    const volumeBar =
      volumeArea && value.volume !== null
        ? {
            top:
              volumeArea.y +
              volumeArea.height * (1 - Math.max(0, value.volume) / loudest),
            bottom: volumeArea.y + volumeArea.height,
          }
        : null
    candles.push({
      id: ids[position],
      index: position,
      direction,
      paint: directions[direction].paint,
      x: bands.centers[position],
      width: candleWidth,
      open: toPixel(value.open),
      high: toPixel(value.high),
      low: toPixel(value.low),
      close: toPixel(value.close),
      volume: volumeBar,
    })
  })

  const lastY = last ? toPixel(last.close) : 0
  const labelWidth = Math.max(
    0,
    ...labels.map((label) => estimateTextWidth(label, fontSize))
  )

  return {
    layout,
    price,
    volumeArea,
    candles,
    centers: bands.centers,
    labels,
    labelIndices: getIndexLabelIndices(
      data.length,
      plot.width,
      labelWidth + 12
    ),
    values,
    directions,
    lastClose: last
      ? {
          value: last.close,
          label: pillLabel,
          y: lastY,
          frameHeight: size.height,
          pill: placePill(
            {
              x: plot.x + plot.width + PILL_GAP,
              width: pillWidth,
              height: pillHeight,
            },
            lastY,
            size.height
          ),
        }
      : null,
  }
}

function placePill(
  pill: { x: number; width: number; height: number },
  y: number,
  frameHeight: number
): ChartRect {
  return {
    ...pill,
    y: Math.max(0, Math.min(y - pill.height / 2, frameHeight - pill.height)),
  }
}

/**
 * The last-close line and pill for the candles on screen: they follow the
 * latest candle as it grows in or slides, and stay inside the frame.
 */
export function getLastCloseMark(
  model: CandlestickChartModel,
  candles: readonly Candle[]
) {
  const { lastClose } = model
  if (!lastClose) return null
  const latest = candles
    .filter((candle) => !candle.isLeaving)
    .reduce<Candle | null>(
      (found, candle) =>
        found === null || candle.index > found.index ? candle : found,
      null
    )
  const y = latest?.close ?? lastClose.y
  return {
    y,
    label: lastClose.label,
    pill: placePill(lastClose.pill, y, lastClose.frameHeight),
  }
}

/** The body between the open and the close, on whole pixels, at least 1px tall. */
export function getCandleBody(candle: Candle): ChartRect {
  const top = Math.min(candle.open, candle.close)
  return {
    x: Math.round(candle.x - candle.width / 2),
    y: top,
    width: candle.width,
    height: Math.max(1, Math.abs(candle.open - candle.close)),
  }
}

/** The wick's x: the middle of the body's middle pixel column. */
export function getCandleWickX(candle: Candle) {
  return Math.round(candle.x - candle.width / 2) + candle.width / 2
}

/** The volume bar under a candle, as wide as its body. */
export function getCandleVolume(candle: Candle): ChartRect | null {
  if (!candle.volume) return null
  return {
    x: Math.round(candle.x - candle.width / 2),
    y: candle.volume.top,
    width: candle.width,
    height: Math.max(0, candle.volume.bottom - candle.volume.top),
  }
}

/** A candle folded onto its open, where it grows from and shrinks to. */
export function collapseCandle(candle: Candle): Candle {
  return {
    ...candle,
    high: candle.open,
    low: candle.open,
    close: candle.open,
    volume: candle.volume
      ? { top: candle.volume.bottom, bottom: candle.volume.bottom }
      : null,
  }
}

function blendCandle(from: Candle, to: Candle, progress: number): Candle {
  const volume =
    to.volume && from.volume
      ? {
          top: interpolateNumber(from.volume.top, to.volume.top, progress),
          bottom: interpolateNumber(
            from.volume.bottom,
            to.volume.bottom,
            progress
          ),
        }
      : to.volume
  return {
    ...to,
    x: interpolateNumber(from.x, to.x, progress),
    width: interpolateNumber(from.width, to.width, progress),
    open: interpolateNumber(from.open, to.open, progress),
    high: interpolateNumber(from.high, to.high, progress),
    low: interpolateNumber(from.low, to.low, progress),
    close: interpolateNumber(from.close, to.close, progress),
    volume,
  }
}

/**
 * The draw-in of one candle: its body grows from the open toward the close,
 * the wick with it, and its volume from the bottom of the band.
 */
export function revealCandle(candle: Candle, amount: number): Candle {
  if (amount >= 1) return candle
  return blendCandle(collapseCandle(candle), candle, amount)
}

/**
 * The candles between two models, matched by index. Candles that stay move
 * and resize; a new one grows from its open while sliding in from the end
 * edge; one that left the data collapses as it slides out the other way,
 * marked `isLeaving`. Both slide by the step the staying candles take.
 */
export function interpolateCandles(
  from: readonly Candle[],
  to: readonly Candle[],
  progress: number
): Candle[] {
  const previous = new Map(from.map((candle) => [candle.id, candle]))
  const next = new Set(to.map((candle) => candle.id))
  const shifts = to.flatMap((candle) => {
    const start = previous.get(candle.id)
    return start ? [candle.x - start.x] : []
  })
  const shift = shifts.length
    ? shifts.reduce((sum, value) => sum + value, 0) / shifts.length
    : 0

  const moving = to.map((candle) => {
    const start = previous.get(candle.id) ?? {
      ...collapseCandle(candle),
      x: candle.x - shift,
    }
    return blendCandle(start, candle, progress)
  })
  const leaving = from
    .filter((candle) => !next.has(candle.id))
    .map((candle) => ({
      ...blendCandle(
        candle,
        { ...collapseCandle(candle), x: candle.x + shift },
        progress
      ),
      isLeaving: true,
    }))
  return [...leaving, ...moving]
}

function getChange(model: CandlestickChartModel, position: number) {
  const current = model.values[position]
  const previous = position > 0 ? model.values[position - 1] : null
  if (!current || !previous || previous.close === 0) return null
  return (current.close - previous.close) / previous.close
}

function getFields(model: CandlestickChartModel): CandlestickField[] {
  const hasVolume = model.values.some(
    (value) => value !== null && value.volume !== null
  )
  return hasVolume
    ? ["open", "high", "low", "close", "volume"]
    : ["open", "high", "low", "close"]
}

/**
 * The period's prices, its volume when there is one, and the change from the
 * previous close, signed, so the direction is in the text as well as the
 * colour.
 */
export function getCandlestickTooltip(
  model: CandlestickChartModel,
  position: number,
  formatValue: (value: number, key: string) => string = formatCandlestickValue
): ChartTooltipContent {
  const value = model.values[position]
  const direction =
    value && value.close < value.open
      ? model.directions.down
      : model.directions.up
  const change = getChange(model, position)
  const rows: ChartTooltipRow[] = getFields(model)
    .filter((field) => field !== "volume" || value?.volume !== null)
    .map((field) => {
      const number = value ? value[field] : null
      return {
        key: field,
        label: FIELD_LABELS[field],
        paint: direction.paint,
        dashed: false,
        value: number === null ? MISSING_VALUE : formatValue(number, field),
      }
    })
  rows.push({
    key: "change",
    label: "Change",
    paint:
      change !== null && change < 0
        ? model.directions.down.paint
        : model.directions.up.paint,
    dashed: false,
    value: change === null ? MISSING_VALUE : formatSignedPercent(change),
  })
  return { title: model.labels[position] ?? "", rows }
}

/** The data as a table: a row per period, a column per field and the change. */
export function getCandlestickTable(
  model: CandlestickChartModel,
  formatValue: (value: number, key: string) => string = formatCandlestickValue
): ChartTableData {
  const fields = getFields(model)
  return {
    columns: [...fields.map((field) => FIELD_LABELS[field]), "Change"],
    rows: model.labels.map((label, position) => {
      const value = model.values[position]
      const change = getChange(model, position)
      return {
        header: label,
        cells: [
          ...fields.map((field) => {
            const number = value ? value[field] : null
            return number === null ? MISSING_VALUE : formatValue(number, field)
          }),
          change === null ? MISSING_VALUE : formatSignedPercent(change),
        ],
      }
    }),
  }
}
