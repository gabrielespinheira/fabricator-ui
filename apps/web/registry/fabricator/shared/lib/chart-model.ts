// What every chart shares, on the web and React Native alike: series and
// their colours, number formatting, value scales and ticks, snapping to the
// nearest mark, keyboard steps, tooltip placement and easing. Pure: no React,
// no DOM, no React Native, so both platforms lay a chart out identically.

import { scaleLinear } from "d3-scale"

/** A token name (`chart-series-3`, `primary`), `var(--name)` or any CSS colour. */
export type ChartColor = string

export type ChartSeriesConfig = {
  label: string
  color?: ChartColor
  /** Draws the series' line dashed: a target, a forecast. */
  dashed?: boolean
}

/** One entry per series, keyed by the data field it reads. */
export type ChartConfig = Record<string, ChartSeriesConfig>

export type ChartDatum = Record<string, unknown>

/** A colour as a theme token, or a literal the renderer paints as given. */
export type ChartPaint = { token: string } | { value: string }

export type ChartSeries = {
  key: string
  label: string
  paint: ChartPaint
  dashed: boolean
}

/** The mark under the pointer, the finger or the keyboard. */
export type ChartActive<TDatum = ChartDatum> = {
  index: number
  datum: TDatum
  /** The series, when the mark belongs to one. */
  key?: string
}

export type ChartTableData = {
  columns: string[]
  rows: { header: string; cells: string[] }[]
}

export type ChartTooltipRow = {
  key: string
  label: string
  paint: ChartPaint
  dashed: boolean
  value: string
}

/**
 * What the tooltip shows: a title (the index or the mark), its rows, and a
 * note under them for a mark that carries one (an incident's summary).
 */
export type ChartTooltipContent = {
  title: string
  rows: ChartTooltipRow[]
  note?: string
}

/** Written where a value is missing. */
export const MISSING_VALUE = "–"

export type ChartPoint = { x: number; y: number }
export type ChartSize = { width: number; height: number }

export const CHART_SERIES_SLOTS = 8

const ROLE_TOKENS = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "destructive",
  "foreground",
  "muted-foreground",
]

const TOKEN_PATTERN = /^(chart-series-[1-8]|chart-[1-5])$/
const VARIABLE_PATTERN = /^var\(--([\w-]+)\)$/

/**
 * A series' paint: its own colour, or the palette slot for its place in the
 * config. Slots never cycle: a ninth series is grey, so fold extra series
 * into "Other" before it gets there.
 */
export function getChartPaint(
  color: ChartColor | undefined,
  index: number
): ChartPaint {
  if (color === undefined) {
    if (index >= CHART_SERIES_SLOTS) return { token: "muted-foreground" }
    return { token: `chart-series-${index + 1}` }
  }
  const variable = VARIABLE_PATTERN.exec(color)
  if (variable) return { token: variable[1] }
  if (TOKEN_PATTERN.test(color) || ROLE_TOKENS.includes(color)) {
    return { token: color }
  }
  return { value: color }
}

/**
 * The config's series in order, minus the hidden ones. Colours come from the
 * full config, so hiding a series never repaints the rest.
 */
export function getChartSeries(
  config: ChartConfig,
  hidden: ReadonlySet<string> = new Set()
): ChartSeries[] {
  return Object.entries(config)
    .map(([key, series], index) => ({
      key,
      label: series.label,
      paint: getChartPaint(series.color, index),
      dashed: series.dashed ?? false,
    }))
    .filter((series) => !hidden.has(series.key))
}

/** A finite number from a datum's field, or null for a gap. */
export function readChartNumber(datum: ChartDatum, key: string) {
  const value = datum[key]
  const number =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN
  return Number.isFinite(number) ? number : null
}

/** A datum's field as text, for index labels and names. */
export function readChartText(datum: ChartDatum, key: string) {
  const value = datum[key]
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return value === undefined || value === null ? "" : String(value)
}

// --- Formatting ---------------------------------------------------------------
// Ours rather than Intl's compact notation, which Hermes lacks on some builds,
// so a value reads the same on every platform.

const COMPACT_UNITS = [
  { size: 1e12, suffix: "T" },
  { size: 1e9, suffix: "B" },
  { size: 1e6, suffix: "M" },
  { size: 1e3, suffix: "K" },
]

function groupThousands(digits: string) {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
}

function trimZeros(text: string) {
  return text.includes(".") ? text.replace(/\.?0+$/, "") : text
}

function formatPlain(value: number, decimals: number) {
  const [whole, fraction] = trimZeros(Math.abs(value).toFixed(decimals)).split(
    "."
  )
  const sign = value < 0 && Number(whole + (fraction ?? "")) !== 0 ? "-" : ""
  return `${sign}${groupThousands(whole)}${fraction ? `.${fraction}` : ""}`
}

function formatCompact(value: number) {
  const absolute = Math.abs(value)
  const unitIndex = COMPACT_UNITS.findIndex((unit) => absolute >= unit.size)
  if (unitIndex === -1) return formatPlain(value, absolute < 10 ? 1 : 0)
  const unit = COMPACT_UNITS[unitIndex]
  const scaled = absolute / unit.size
  const rounded = Number(scaled.toFixed(scaled < 10 ? 1 : 0))
  // 999,950 rounds to 1000K: write it as the next unit up.
  if (rounded >= 1000 && unitIndex > 0) {
    return formatCompact(Math.sign(value) * COMPACT_UNITS[unitIndex - 1].size)
  }
  const sign = value < 0 ? "-" : ""
  return `${sign}${trimZeros(rounded.toFixed(scaled < 10 ? 1 : 0))}${unit.suffix}`
}

/** `1,234` in full, `1.2K` compact. Up to two decimals in full. */
export function formatChartNumber(
  value: number,
  { compact = false }: { compact?: boolean } = {}
) {
  return compact ? formatCompact(value) : formatPlain(value, 2)
}

/** A share of a whole (0 to 1) as `37.3%`. */
export function formatChartPercent(share: number) {
  return `${trimZeros((share * 100).toFixed(1))}%`
}

/**
 * Tick labels in full under 10,000 and compact on an axis that reaches it,
 * one style for the whole axis.
 */
export function getAxisFormatter(largest: number) {
  const compact = Math.abs(largest) >= 10_000
  return (value: number) => formatChartNumber(value, { compact })
}

// --- Scales -------------------------------------------------------------------

export type ValueScale = {
  domain: [number, number]
  ticks: number[]
  toPixel: (value: number) => number
}

/** One tick for roughly every 56px of axis, never fewer than two. */
export function getTickCount(length: number, spacing = 56) {
  return Math.max(2, Math.floor(length / spacing))
}

/**
 * A linear scale with a domain rounded to clean ticks. Bars and areas grow
 * from zero, so it is included unless the values are prices or ranks.
 */
export function getValueScale({
  min,
  max,
  range,
  tickCount,
  includeZero = true,
}: {
  min: number
  max: number
  range: [number, number]
  tickCount: number
  includeZero?: boolean
}): ValueScale {
  let low = includeZero ? Math.min(0, min) : min
  let high = includeZero ? Math.max(0, max) : max
  if (low === high) {
    if (includeZero || low === 0) high = low + 1
    else {
      low -= Math.abs(low) * 0.05
      high += Math.abs(high) * 0.05
    }
  }
  const scale = scaleLinear().domain([low, high]).range(range).nice(tickCount)
  const [start, end] = scale.domain()
  return {
    domain: [start, end],
    ticks: scale.ticks(tickCount),
    toPixel: (value: number) => scale(value),
  }
}

/** The index of the position closest to `value`, or -1 when there are none. */
export function getNearestIndex(positions: readonly number[], value: number) {
  if (positions.length === 0) return -1
  let low = 0
  let high = positions.length - 1
  while (high - low > 1) {
    const middle = (low + high) >> 1
    if (positions[middle] < value) low = middle
    else high = middle
  }
  return Math.abs(positions[low] - value) <= Math.abs(positions[high] - value)
    ? low
    : high
}

/**
 * Where a key moves the inspected mark: arrows step, Home and End jump.
 * Starting from nothing, forward keys land on the first mark and backward
 * keys on the last. Null for keys that don't move it.
 */
export function getSteppedIndex(current: number, key: string, count: number) {
  if (count === 0) return null
  const last = count - 1
  const isStart = current < 0
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return isStart ? 0 : Math.min(last, current + 1)
    case "ArrowLeft":
    case "ArrowDown":
      return isStart ? last : Math.max(0, current - 1)
    case "Home":
      return 0
    case "End":
      return last
    default:
      return null
  }
}

/**
 * Which index labels to draw so none collide: every one that fits, else an
 * even step counted back from the last, which is usually the latest.
 */
export function getIndexLabelIndices(
  count: number,
  length: number,
  labelWidth: number
) {
  const step = Math.max(
    1,
    Math.ceil((count * labelWidth) / Math.max(1, length))
  )
  const indices: number[] = []
  for (let index = 0; index < count; index++) {
    if ((count - 1 - index) % step === 0) indices.push(index)
  }
  return indices
}

/**
 * Inter's width at a size, estimated from an average advance, so a label's
 * fit is decided the same way on every platform. Generous on purpose: a
 * label that might not fit is dropped, never clipped.
 */
export function estimateTextWidth(text: string, fontSize: number) {
  return text.length * fontSize * 0.6
}

// --- Tooltip ------------------------------------------------------------------

const TOOLTIP_GAP = 12

/**
 * Where the tooltip's top-left corner goes. Beside the anchor (after it, or
 * before it near the end edge) for a pointer; above it, for a finger, which
 * would cover anything below, and beside it when there's no room above.
 * Always inside the frame.
 */
export function getTooltipPosition({
  anchor,
  frame,
  tooltip,
  side = "end",
}: {
  anchor: ChartPoint
  frame: ChartSize
  tooltip: ChartSize
  side?: "end" | "top"
}): ChartPoint {
  const clamp = (value: number, max: number) =>
    Math.max(0, Math.min(value, Math.max(0, max)))
  const above = anchor.y - TOOLTIP_GAP - tooltip.height
  if (side === "top" && above >= 0) {
    return {
      x: clamp(anchor.x - tooltip.width / 2, frame.width - tooltip.width),
      y: above,
    }
  }
  const after = anchor.x + TOOLTIP_GAP
  const fitsAfter = after + tooltip.width <= frame.width
  return {
    x: fitsAfter
      ? after
      : clamp(anchor.x - TOOLTIP_GAP - tooltip.width, frame.width),
    y: clamp(anchor.y - tooltip.height / 2, frame.height - tooltip.height),
  }
}

// --- Motion -------------------------------------------------------------------

export type CubicBezier = readonly [number, number, number, number]

/**
 * A CSS time in milliseconds: `250ms`, or `.25s` as a minifier writes it.
 * 0 for anything else.
 */
export function parseCssDuration(css: string) {
  const match = /^\s*(-?[\d.]+(?:e-?\d+)?)\s*(ms|s)?\s*$/i.exec(css)
  if (!match) return 0
  const value = Number(match[1])
  if (!Number.isFinite(value)) return 0
  return match[2]?.toLowerCase() === "s" ? value * 1000 : value
}

/** The four numbers of a CSS `cubic-bezier()`, or null for anything else. */
export function parseCubicBezier(css: string): CubicBezier | null {
  const match = /cubic-bezier\(([^)]+)\)/.exec(css)
  if (!match) return null
  const values = match[1].split(",").map((part) => Number(part.trim()))
  if (values.length !== 4 || values.some((value) => !Number.isFinite(value))) {
    return null
  }
  return [values[0], values[1], values[2], values[3]]
}

/**
 * A CSS cubic-bezier as a function of progress, solved for x the way
 * browsers do (Newton's method, then bisection).
 */
export function getCubicBezier([x1, y1, x2, y2]: CubicBezier) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx

  const solveX = (x: number) => {
    let t = x
    for (let step = 0; step < 8; step++) {
      const error = sampleX(t) - x
      if (Math.abs(error) < 1e-6) return t
      const slope = slopeX(t)
      if (Math.abs(slope) < 1e-6) break
      t -= error / slope
    }
    let low = 0
    let high = 1
    t = x
    while (low < high) {
      const value = sampleX(t)
      if (Math.abs(value - x) < 1e-6) return t
      if (x > value) low = t
      else high = t
      t = (low + high) / 2
      if (high - low < 1e-7) break
    }
    return t
  }

  return (progress: number) => {
    if (progress <= 0) return 0
    if (progress >= 1) return 1
    return sampleY(solveX(progress))
  }
}

export function interpolateNumber(from: number, to: number, progress: number) {
  return from + (to - from) * progress
}

/**
 * One mark's progress inside a staggered reveal: mark `order` of `count`
 * starts after its share of `spread` and finishes with the rest, so a row
 * of bars grows in a quick wave rather than all at once.
 */
export function getStaggeredProgress(
  progress: number,
  order: number,
  count: number,
  spread = 0.35
) {
  if (count <= 1) return Math.max(0, Math.min(1, progress))
  const delay = (order / (count - 1)) * spread
  return Math.max(0, Math.min(1, (progress - delay) / (1 - spread)))
}
