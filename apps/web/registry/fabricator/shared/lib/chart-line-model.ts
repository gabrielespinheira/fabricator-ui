// Line and area charts: one point per datum along the index, one line per
// series, stacked or stretched to the whole on request. The geometry is
// points in pixels, so a renderer only joins them into paths, and two
// datasets of the same length morph point by point.

import { area, curveLinear, curveMonotoneX, curveStep, line } from "d3-shape"

import {
  getCartesianLayout,
  getPointPositions,
  type CartesianLayout,
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
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

export type ChartCurve = "smooth" | "linear" | "step"
export type ChartStack = "none" | "stacked" | "expand"

export type LineSeriesGeometry = {
  key: string
  label: string
  paint: ChartPaint
  dashed: boolean
  /** The datum's value at each index, null for a gap. */
  values: (number | null)[]
  /** The line, in pixels: the value, or the running total when stacked. */
  top: (number | null)[]
  /** The area's lower edge: the zero line, or the series below. */
  bottom: number[]
  /** Set while a hidden series shrinks away. */
  isLeaving?: boolean
}

export type LineChartModel = {
  layout: CartesianLayout
  positions: number[]
  labels: string[]
  /** The index labels drawn on the axis, thinned so none collide. */
  labelIndices: number[]
  series: LineSeriesGeometry[]
  /** The zero line, in pixels. */
  baseline: number
  stack: ChartStack
}

export function getLineChartModel<TDatum extends ChartDatum>({
  data,
  config,
  index,
  size,
  fontSize,
  stack = "none",
  hidden,
  formatIndex,
}: {
  data: readonly TDatum[]
  config: ChartConfig
  index: string
  size: ChartSize
  fontSize: number
  stack?: ChartStack
  hidden?: ReadonlySet<string>
  formatIndex?: (value: string, datum: TDatum) => string
}): LineChartModel {
  const series = getChartSeries(config, hidden)
  const labels = data.map((datum) => {
    const text = readChartText(datum, index)
    return formatIndex ? formatIndex(text, datum) : text
  })
  const values = series.map((item) =>
    data.map((datum) => readChartNumber(datum, item.key))
  )
  const totals = data.map((_, position) =>
    values.reduce((sum, list) => sum + Math.max(0, list[position] ?? 0), 0)
  )
  // Stacked values per series, as [low, high] in data units.
  const stacked = values.map((list, seriesIndex) =>
    list.map((_, position) => {
      const below = values
        .slice(0, seriesIndex)
        .reduce((sum, other) => sum + (other[position] ?? 0), 0)
      const own = list[position] ?? 0
      if (stack === "expand") {
        const total = totals[position] || 1
        return [below / total, (below + own) / total] as const
      }
      return [below, below + own] as const
    })
  )

  const flat = values.flat().filter((value): value is number => value !== null)
  const tops =
    stack === "none"
      ? flat
      : stacked.flatMap((list) => list.map(([, high]) => high))
  const layout = getCartesianLayout({
    size,
    labels,
    min: stack === "expand" ? 0 : Math.min(0, ...tops),
    max: stack === "expand" ? 1 : Math.max(0, ...tops),
    fontSize,
    valueFormat: stack === "expand" ? "percent" : "number",
    edgeLabels: true,
  })
  const positions = getPointPositions(
    data.length,
    layout.plot.x,
    layout.plot.width
  )
  const baseline = layout.scale.toPixel(0)
  const toPixel = layout.scale.toPixel
  const labelWidth = Math.max(
    0,
    ...labels.map((label) => estimateTextWidth(label, fontSize))
  )

  return {
    layout,
    positions,
    labels,
    labelIndices: getIndexLabelIndices(
      data.length,
      layout.plot.width + labelWidth,
      labelWidth + 12
    ),
    baseline,
    stack,
    series: series.map((item, seriesIndex) => ({
      ...item,
      values: values[seriesIndex],
      top:
        stack === "none"
          ? values[seriesIndex].map((value) =>
              value === null ? null : toPixel(value)
            )
          : stacked[seriesIndex].map(([, high]) => toPixel(high)),
      bottom:
        stack === "none"
          ? positions.map(() => baseline)
          : stacked[seriesIndex].map(([low]) => toPixel(low)),
    })),
  }
}

const CURVES = {
  smooth: curveMonotoneX,
  linear: curveLinear,
  step: curveStep,
} as const

/** The line through a series' points, broken at gaps. */
export function getLinePath(
  positions: readonly number[],
  top: readonly (number | null)[],
  curve: ChartCurve
) {
  return (
    line<number>()
      .defined((position) => top[position] !== null)
      .x((position) => positions[position])
      .y((position) => top[position] ?? 0)
      .curve(CURVES[curve])(positions.map((_, position) => position)) ?? ""
  )
}

/** The area between a series' line and its bottom edge, broken at gaps. */
export function getAreaPath(
  positions: readonly number[],
  top: readonly (number | null)[],
  bottom: readonly number[],
  curve: ChartCurve
) {
  return (
    area<number>()
      .defined((position) => top[position] !== null)
      .x((position) => positions[position])
      .y0((position) => bottom[position])
      .y1((position) => top[position] ?? 0)
      .curve(CURVES[curve])(positions.map((_, position) => position)) ?? ""
  )
}

function blendTop(
  from: readonly (number | null)[],
  to: readonly (number | null)[],
  progress: number
) {
  return to.map((value, position) => {
    const start = from[position]
    if (value === null || start === null || start === undefined) return value
    return interpolateNumber(start, value, progress)
  })
}

function blendBottom(
  from: readonly number[],
  to: readonly number[],
  progress: number
) {
  return to.map((value, position) =>
    interpolateNumber(from[position] ?? value, value, progress)
  )
}

/**
 * The series between two layouts of the same points. A series that appears
 * grows from its bottom edge; one that leaves shrinks into it and is marked
 * `isLeaving` so the renderer can fade it. Null when the point counts differ:
 * there is nothing to morph, so the chart redraws.
 */
export function interpolateLineSeries(
  from: readonly LineSeriesGeometry[],
  to: readonly LineSeriesGeometry[],
  progress: number
): LineSeriesGeometry[] | null {
  const length = to[0]?.top.length ?? from[0]?.top.length ?? 0
  const all = [...from, ...to]
  if (all.some((series) => series.top.length !== length)) return null

  const previous = new Map(from.map((series) => [series.key, series]))
  const next = new Map(to.map((series) => [series.key, series]))

  const staying = to.map((end) => {
    const start = previous.get(end.key)
    if (!start) {
      return { ...end, top: blendTop(end.bottom, end.top, progress) }
    }
    return {
      ...end,
      top: blendTop(start.top, end.top, progress),
      bottom: blendBottom(start.bottom, end.bottom, progress),
    }
  })
  const leaving = from
    .filter((start) => !next.has(start.key))
    .map((start) => ({
      ...start,
      isLeaving: true,
      top: blendTop(start.top, start.bottom, progress),
    }))
  return [...staying, ...leaving]
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/** Every visible series at one index, in config order. */
export function getLineTooltip(
  model: LineChartModel,
  position: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const total = model.series.reduce(
    (sum, series) => sum + Math.max(0, series.values[position] ?? 0),
    0
  )
  return {
    title: model.labels[position] ?? "",
    rows: model.series.map((series) => {
      const value = series.values[position]
      const text =
        value === null || value === undefined
          ? MISSING_VALUE
          : model.stack === "expand"
            ? `${formatValue(value, series.key)} · ${formatChartPercent(total ? value / total : 0)}`
            : formatValue(value, series.key)
      return {
        key: series.key,
        label: series.label,
        paint: series.paint,
        dashed: series.dashed,
        value: text,
      }
    }),
  }
}

/** The data as a table: a row per index, a column per series. */
export function getLineTable(
  model: LineChartModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  return {
    columns: model.series.map((series) => series.label),
    rows: model.labels.map((label, position) => ({
      header: label,
      cells: model.series.map((series) => {
        const value = series.values[position]
        return value === null ? MISSING_VALUE : formatValue(value, series.key)
      }),
    })),
  }
}
