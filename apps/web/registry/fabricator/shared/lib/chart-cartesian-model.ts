// The frame of every chart with a value axis (area, line, bar, composition,
// candlestick): where the plot sits once the axis labels have their room,
// the value scale, its gridlines and labels, and where each index lands.

import {
  estimateTextWidth,
  formatChartPercent,
  getAxisFormatter,
  getTickCount,
  getValueScale,
  type ChartSize,
  type ValueScale,
} from "./chart-model"

export type ChartRect = { x: number; y: number; width: number; height: number }

export type ChartOrientation = "vertical" | "horizontal"

export type ChartTick = { value: number; position: number; label: string }

export type CartesianLayout = {
  orientation: ChartOrientation
  /** The area marks are drawn in, inside the axis labels. */
  plot: ChartRect
  scale: ValueScale
  /** Gridlines and their labels along the value axis, smallest first. */
  valueTicks: ChartTick[]
}

/** The gap between an axis label and the plot. */
export const CHART_LABEL_GAP = 8
const LABEL_GAP = CHART_LABEL_GAP
// Wide glyphs (W, M, %) outrun the average advance the width estimate uses;
// a little slack keeps every label inside the frame.
const LABEL_SLACK = 4
const MINIMAL_TICK_COUNT = 20

export function getAxisLabelHeight(fontSize: number) {
  return Math.ceil(fontSize * 1.25) + LABEL_GAP
}

/**
 * Lays out the plot. Vertical charts put values up the start edge and the
 * index along the bottom; horizontal ones put the index labels down the start
 * edge and values along the bottom. `edgeLabels` is for point positions,
 * whose first and last labels are centred on the plot's edges and need half
 * their width outside it.
 */
export function getCartesianLayout({
  size,
  labels,
  min,
  max,
  fontSize,
  orientation = "vertical",
  includeZero = true,
  valueFormat = "number",
  formatTick,
  edgeLabels = false,
  bandLabels = false,
  minimal = false,
}: {
  size: ChartSize
  labels: readonly string[]
  min: number
  max: number
  fontSize: number
  orientation?: ChartOrientation
  includeZero?: boolean
  valueFormat?: "number" | "percent"
  formatTick?: (value: number) => string
  edgeLabels?: boolean
  /** Labels centred on bands: the last may reach past a narrow band's edge. */
  bandLabels?: boolean
  /**
   * No axes or gridlines: the plot fills the frame and the chart writes its
   * first and last labels under it. Vertical charts only.
   */
  minimal?: boolean
}): CartesianLayout {
  const top = Math.ceil(fontSize / 2) + 2
  const bottom = getAxisLabelHeight(fontSize)
  const width = (text: string) => estimateTextWidth(text, fontSize)

  const formatFor = (domainEnd: number) =>
    formatTick ??
    (valueFormat === "percent"
      ? formatChartPercent
      : getAxisFormatter(domainEnd))

  if (orientation === "horizontal") {
    const start =
      Math.ceil(Math.max(0, ...labels.map(width))) + LABEL_GAP + LABEL_SLACK
    const roughEnd = Math.ceil(width(formatFor(max)(max)) / 2) + 2
    const plotWidth = Math.max(1, size.width - start - roughEnd)
    const plot = {
      x: start,
      y: 4,
      width: plotWidth,
      height: Math.max(1, size.height - 4 - bottom),
    }
    const scale = getValueScale({
      min,
      max,
      range: [plot.x, plot.x + plot.width],
      tickCount: getTickCount(plot.width, 80),
      includeZero,
    })
    const format = formatFor(Math.max(...scale.domain.map(Math.abs)))
    return {
      orientation,
      plot,
      scale,
      valueTicks: scale.ticks.map((value) => ({
        value,
        position: scale.toPixel(value),
        label: format(value),
      })),
    }
  }

  if (minimal) {
    const minimalTop = 2
    const plot = {
      x: 0,
      y: minimalTop,
      width: Math.max(1, size.width),
      height: Math.max(1, size.height - minimalTop),
    }
    const scale = getValueScale({
      min,
      max,
      range: [plot.y + plot.height, plot.y],
      // No axis to label, so round the top only a little.
      tickCount: MINIMAL_TICK_COUNT,
      includeZero,
    })
    return { orientation, plot, scale, valueTicks: [] }
  }

  const plotHeight = Math.max(1, size.height - top - bottom)
  const scale = getValueScale({
    min,
    max,
    range: [top + plotHeight, top],
    tickCount: getTickCount(plotHeight),
    includeZero,
  })
  const format = formatFor(Math.max(...scale.domain.map(Math.abs)))
  const tickLabels = scale.ticks.map(format)
  const gutter =
    Math.ceil(Math.max(0, ...tickLabels.map(width))) + LABEL_GAP + LABEL_SLACK
  const firstHalf = edgeLabels ? width(labels[0] ?? "") / 2 + LABEL_SLACK : 0
  const start = Math.ceil(Math.max(gutter, firstHalf))
  const lastHalf = width(labels.at(-1) ?? "") / 2 + LABEL_SLACK
  // A band label sits half a band in from the edge; estimate the band from
  // the room left, since the end padding is what decides it.
  const bandHalf = (size.width - start) / Math.max(1, labels.length) / 2
  const end = Math.ceil(
    Math.max(2, edgeLabels ? lastHalf : 0, bandLabels ? lastHalf - bandHalf : 0)
  )
  const plot = {
    x: start,
    y: top,
    width: Math.max(1, size.width - start - end),
    height: plotHeight,
  }
  return {
    orientation,
    plot,
    scale,
    valueTicks: scale.ticks.map((value, index) => ({
      value,
      position: scale.toPixel(value),
      label: tickLabels[index],
    })),
  }
}

/** Points spread from one edge of the plot to the other; one sits centred. */
export function getPointPositions(
  count: number,
  start: number,
  length: number
) {
  if (count === 1) return [start + length / 2]
  return Array.from(
    { length: count },
    (_, index) => start + (index * length) / Math.max(1, count - 1)
  )
}

/**
 * Equal bands for categories, each with a centre and the width marks may
 * use. The padding between bands is air, not part of a hit area.
 */
export function getBandPositions(
  count: number,
  start: number,
  length: number,
  padding = 0.3
) {
  const step = length / Math.max(1, count)
  return {
    step,
    bandwidth: step * (1 - padding),
    centers: Array.from(
      { length: count },
      (_, index) => start + step * index + step / 2
    ),
  }
}
