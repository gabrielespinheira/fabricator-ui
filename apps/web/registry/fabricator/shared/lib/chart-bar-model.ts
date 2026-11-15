// Bar charts, and the composition chart's 100% columns: one bar per series per
// category, side by side or stacked, vertical or horizontal. Bars are at most
// 24px thick, grow from zero with a rounded data end and a square baseline,
// and touching bars keep a 2px gap of surface between them.

import {
  getBandPositions,
  getCartesianLayout,
  type CartesianLayout,
  type ChartOrientation,
  type ChartRect,
} from "./chart-cartesian-model"
import {
  estimateTextWidth,
  formatChartNumber,
  formatChartPercent,
  getChartSeries,
  getIndexLabelIndices,
  interpolateNumber,
  MISSING_VALUE,
  readChartNumber,
  readChartText,
  type ChartConfig,
  type ChartDatum,
  type ChartPaint,
  type ChartSeries,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

export type BarStack = "none" | "stacked" | "expand"

/** Which end of a bar is rounded: its data end, or none inside a stack. */
export type BarRounding = "top" | "bottom" | "start" | "end" | "none"

export type BarRect = ChartRect & {
  id: string
  key: string
  index: number
  paint: ChartPaint
  value: number
  rounded: BarRounding
  /** Set while a hidden series' bar shrinks away. */
  isLeaving?: boolean
}

export type BarChartModel = {
  layout: CartesianLayout
  orientation: ChartOrientation
  stack: BarStack
  series: ChartSeries[]
  bars: BarRect[]
  /** Each category's whole band, for the highlight under the pointer. */
  bands: ChartRect[]
  /** Each category's centre along the index axis, for snapping. */
  centers: number[]
  labels: string[]
  labelIndices: number[]
  /** The zero line along the value axis, in pixels. */
  baseline: number
  values: (number | null)[][]
}

export const MAX_BAR_THICKNESS = 24
const BAR_GAP = 2
const BAR_RADIUS = 4

function getBarIds(keys: readonly string[], labels: readonly string[]) {
  const seen = new Set<string>()
  return keys.map((key) =>
    labels.map((label, index) => {
      const base = `${key}:${label}`
      const id = seen.has(base) ? `${base}#${index}` : base
      seen.add(id)
      return id
    })
  )
}

export function getBarChartModel<TDatum extends ChartDatum>({
  data,
  config,
  index,
  size,
  fontSize,
  layout: orientation = "vertical",
  stack = "none",
  hidden,
  maxThickness = MAX_BAR_THICKNESS,
  bandPadding = 0.3,
  formatIndex,
}: {
  data: readonly TDatum[]
  config: ChartConfig
  index: string
  size: ChartSize
  fontSize: number
  layout?: ChartOrientation
  stack?: BarStack
  hidden?: ReadonlySet<string>
  maxThickness?: number
  bandPadding?: number
  formatIndex?: (value: string, datum: TDatum) => string
}): BarChartModel {
  const series = getChartSeries(config, hidden)
  const labels = data.map((datum) => {
    const text = readChartText(datum, index)
    return formatIndex ? formatIndex(text, datum) : text
  })
  const values = series.map((item) =>
    data.map((datum) => readChartNumber(datum, item.key))
  )
  const positiveTotals = data.map((_, position) =>
    values.reduce((sum, list) => sum + Math.max(0, list[position] ?? 0), 0)
  )
  const negativeTotals = data.map((_, position) =>
    values.reduce((sum, list) => sum + Math.min(0, list[position] ?? 0), 0)
  )
  const flat = values.flat().filter((value): value is number => value !== null)
  const [min, max] =
    stack === "expand"
      ? [0, 1]
      : stack === "stacked"
        ? [Math.min(0, ...negativeTotals), Math.max(0, ...positiveTotals)]
        : [Math.min(0, ...flat), Math.max(0, ...flat)]

  const layout = getCartesianLayout({
    size,
    labels,
    min,
    max,
    fontSize,
    orientation,
    valueFormat: stack === "expand" ? "percent" : "number",
    bandLabels: true,
  })
  const { plot, scale } = layout
  const isVertical = orientation === "vertical"
  const bandsAxis = isVertical
    ? getBandPositions(data.length, plot.x, plot.width, bandPadding)
    : getBandPositions(data.length, plot.y, plot.height, bandPadding)
  const baseline = scale.toPixel(0)
  const ids = getBarIds(
    series.map((item) => item.key),
    labels
  )

  const thickness = (count: number) =>
    Math.max(
      1,
      Math.min(
        maxThickness,
        (bandsAxis.bandwidth - BAR_GAP * (count - 1)) / Math.max(1, count)
      )
    )

  const bars: BarRect[] = []
  data.forEach((_, position) => {
    const center = bandsAxis.centers[position]
    const isStacked = stack !== "none"
    const width = thickness(isStacked ? 1 : series.length)
    const groupWidth = isStacked
      ? width
      : series.length * width + BAR_GAP * (series.length - 1)
    const total = positiveTotals[position] || 1
    let positiveRunning = 0
    let negativeRunning = 0
    const lastPositive = series.findLastIndex(
      (_, seriesIndex) => (values[seriesIndex][position] ?? 0) > 0
    )
    const lastNegative = series.findLastIndex(
      (_, seriesIndex) => (values[seriesIndex][position] ?? 0) < 0
    )

    series.forEach((item, seriesIndex) => {
      const value = values[seriesIndex][position]
      if (value === null) return
      const isNegative = value < 0
      let low = 0
      let high = value
      if (isStacked) {
        const amount = stack === "expand" ? Math.max(0, value) / total : value
        if (isNegative && stack === "stacked") {
          low = negativeRunning
          negativeRunning += amount
          high = negativeRunning
        } else {
          low = positiveRunning
          positiveRunning += Math.max(0, amount)
          high = positiveRunning
        }
      }
      const isOuter = isNegative
        ? !isStacked || seriesIndex === lastNegative
        : !isStacked || seriesIndex === lastPositive
      // Inside a stack, the segment further out gives up 2px to the gap.
      const hasBelow = isStacked && low !== 0
      const from = scale.toPixel(low)
      const to = scale.toPixel(high)
      const cross = isStacked
        ? center - width / 2
        : center - groupWidth / 2 + seriesIndex * (width + BAR_GAP)

      let rect: ChartRect
      if (isVertical) {
        const top = Math.min(from, to)
        const bottom = Math.max(from, to)
        rect = {
          x: cross,
          y: top + (hasBelow && isNegative ? BAR_GAP : 0),
          width,
          height: Math.max(0, bottom - top - (hasBelow ? BAR_GAP : 0)),
        }
      } else {
        const start = Math.min(from, to)
        const end = Math.max(from, to)
        rect = {
          x: start + (hasBelow && !isNegative ? BAR_GAP : 0),
          y: cross,
          width: Math.max(0, end - start - (hasBelow ? BAR_GAP : 0)),
          height: width,
        }
      }
      const rounded: BarRounding =
        !isOuter || value === 0
          ? "none"
          : isVertical
            ? isNegative
              ? "bottom"
              : "top"
            : isNegative
              ? "start"
              : "end"
      bars.push({
        ...rect,
        id: ids[seriesIndex][position],
        key: item.key,
        index: position,
        paint: item.paint,
        value,
        rounded,
      })
    })
  })

  const bands = bandsAxis.centers.map((center) =>
    isVertical
      ? {
          x: center - bandsAxis.step / 2,
          y: plot.y,
          width: bandsAxis.step,
          height: plot.height,
        }
      : {
          x: plot.x,
          y: center - bandsAxis.step / 2,
          width: plot.width,
          height: bandsAxis.step,
        }
  )
  const labelWidth = Math.max(
    0,
    ...labels.map((label) => estimateTextWidth(label, fontSize))
  )
  const labelIndices = isVertical
    ? getIndexLabelIndices(data.length, plot.width, labelWidth + 12)
    : getIndexLabelIndices(data.length, plot.height, fontSize * 1.4)

  return {
    layout,
    orientation,
    stack,
    series,
    bars,
    bands,
    centers: bandsAxis.centers,
    labels,
    labelIndices,
    baseline,
    values,
  }
}

const round = (value: number) => Math.round(value * 100) / 100

/** A bar as a path: square, with its data end's two corners rounded. */
export function getBarPath({
  x,
  y,
  width,
  height,
  rounded,
}: ChartRect & { rounded: BarRounding }) {
  const isAlongY = rounded === "top" || rounded === "bottom"
  const radius = round(
    Math.max(
      0,
      Math.min(
        BAR_RADIUS,
        isAlongY ? width / 2 : height / 2,
        isAlongY ? height : width
      )
    )
  )
  const [left, top, right, bottom] = [x, y, x + width, y + height].map(round)
  const r = radius
  switch (rounded) {
    case "top":
      return `M${left},${bottom}L${left},${round(top + r)}Q${left},${top} ${round(left + r)},${top}L${round(right - r)},${top}Q${right},${top} ${right},${round(top + r)}L${right},${bottom}Z`
    case "bottom":
      return `M${left},${top}L${right},${top}L${right},${round(bottom - r)}Q${right},${bottom} ${round(right - r)},${bottom}L${round(left + r)},${bottom}Q${left},${bottom} ${left},${round(bottom - r)}Z`
    case "end":
      return `M${left},${top}L${round(right - r)},${top}Q${right},${top} ${right},${round(top + r)}L${right},${round(bottom - r)}Q${right},${bottom} ${round(right - r)},${bottom}L${left},${bottom}Z`
    case "start":
      return `M${right},${top}L${right},${bottom}L${round(left + r)},${bottom}Q${left},${bottom} ${left},${round(bottom - r)}L${left},${round(top + r)}Q${left},${top} ${round(left + r)},${top}Z`
    case "none":
      return `M${left},${top}L${right},${top}L${right},${bottom}L${left},${bottom}Z`
  }
}

/** A bar folded into the zero line, where it grows from and shrinks to. */
export function collapseBar(
  bar: BarRect,
  baseline: number,
  orientation: ChartOrientation
): BarRect {
  return orientation === "vertical"
    ? { ...bar, y: baseline, height: 0 }
    : { ...bar, x: baseline, width: 0 }
}

function blendRect(from: BarRect, to: BarRect, progress: number): BarRect {
  return {
    ...to,
    x: interpolateNumber(from.x, to.x, progress),
    y: interpolateNumber(from.y, to.y, progress),
    width: interpolateNumber(from.width, to.width, progress),
    height: interpolateNumber(from.height, to.height, progress),
  }
}

/**
 * The bars between two models. A bar that stays moves and resizes; a new
 * one grows from the zero line; a leaving one shrinks into it, marked
 * `isLeaving`.
 */
export function interpolateBars(
  from: BarChartModel,
  to: BarChartModel,
  progress: number
): BarRect[] {
  const previous = new Map(from.bars.map((bar) => [bar.id, bar]))
  const next = new Set(to.bars.map((bar) => bar.id))
  const moving = to.bars.map((bar) => {
    const start =
      previous.get(bar.id) ?? collapseBar(bar, to.baseline, to.orientation)
    return blendRect(start, bar, progress)
  })
  const leaving = from.bars
    .filter((bar) => !next.has(bar.id))
    .map((bar) => ({
      ...blendRect(
        bar,
        collapseBar(bar, to.baseline, to.orientation),
        progress
      ),
      isLeaving: true,
    }))
  return [...moving, ...leaving]
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/** Every visible series in one category, in config order. */
export function getBarTooltip(
  model: BarChartModel,
  position: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const total = model.values.reduce(
    (sum, list) => sum + Math.max(0, list[position] ?? 0),
    0
  )
  return {
    title: model.labels[position] ?? "",
    rows: model.series.map((series, seriesIndex) => {
      const value = model.values[seriesIndex][position]
      return {
        key: series.key,
        label: series.label,
        paint: series.paint,
        dashed: false,
        value:
          value === null || value === undefined
            ? MISSING_VALUE
            : model.stack === "expand"
              ? `${formatValue(value, series.key)} · ${formatChartPercent(total ? Math.max(0, value) / total : 0)}`
              : formatValue(value, series.key),
      }
    }),
  }
}

/** The data as a table: a row per category, a column per series. */
export function getBarTable(
  model: BarChartModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  return {
    columns: model.series.map((series) => series.label),
    rows: model.labels.map((label, position) => ({
      header: label,
      cells: model.series.map((series, seriesIndex) => {
        const value = model.values[seriesIndex][position]
        return value === null ? MISSING_VALUE : formatValue(value, series.key)
      }),
    })),
  }
}
