// Bump charts: rank over time, who overtook whom. Each series is a line
// through its rank at every index, rank 1 in the top slot and the slots
// evenly spaced, joined by bump curves so a change of place reads as a
// crossing. A ring at every point holds the rank, and the series' name sits
// past its last point when the plot leaves room for it.

import { curveBumpX, line } from "d3-shape"

import {
  CHART_LABEL_GAP,
  getAxisLabelHeight,
  getPointPositions,
  type ChartRect,
  type ChartTick,
} from "./chart-cartesian-model"
import {
  estimateTextWidth,
  formatChartNumber,
  getChartSeries,
  getIndexLabelIndices,
  interpolateNumber,
  MISSING_VALUE,
  readChartNumber,
  readChartText,
  type ChartConfig,
  type ChartDatum,
  type ChartPaint,
  type ChartPoint,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

/** Ranks as given (1 is the top), or scores ranked per index, highest first. */
export type BumpRanking = "rank" | "score"

export type BumpPoint = ChartPoint & { rank: number }

export type BumpSeriesGeometry = {
  key: string
  label: string
  paint: ChartPaint
  /** The rank at each index, null for a gap. */
  ranks: (number | null)[]
  /** The value read from the data: the rank itself, or the score. */
  scores: (number | null)[]
  points: (BumpPoint | null)[]
  /** Set while a hidden series sinks away. */
  isLeaving?: boolean
}

export type BumpName = { key: string; text: string; x: number; y: number }

export type BumpChartModel = {
  /** Where the points' centres lie: rank 1 along the top edge. */
  plot: ChartRect
  positions: number[]
  labels: string[]
  labelIndices: number[]
  /** The y the index labels hang from. */
  axisOffset: number
  /** One per rank, top to bottom. */
  slots: ChartTick[]
  slotGap: number
  series: BumpSeriesGeometry[]
  ranking: BumpRanking
  /** The rings' radius: 9px, smaller where points would touch. */
  radius: number
  /** Whether the rings are big enough to hold their rank. */
  showRanks: boolean
  /** Series names past their last point; empty when they don't fit. */
  names: BumpName[]
}

const DOT_RADIUS = 9
const MIN_RADIUS = 3
const RANK_RADIUS = 7
const RING = 2
const NAME_GAP = 6
/** The share of the width the plot keeps before the names give way. */
const NAMED_PLOT_SHARE = 0.6

function readRanks<TDatum extends ChartDatum>(
  data: readonly TDatum[],
  keys: readonly string[],
  ranking: BumpRanking
) {
  const scores = keys.map((key) =>
    data.map((datum) => readChartNumber(datum, key))
  )
  if (ranking === "rank") {
    return {
      scores,
      ranks: scores.map((list) =>
        list.map((value) => (value !== null && value >= 1 ? value : null))
      ),
    }
  }
  const ranks = keys.map(() => data.map((): number | null => null))
  data.forEach((_, position) => {
    keys
      .map((_, seriesIndex) => ({
        seriesIndex,
        score: scores[seriesIndex][position],
      }))
      .filter(
        (entry): entry is { seriesIndex: number; score: number } =>
          entry.score !== null
      )
      // Stable: equal scores keep config order.
      .sort((a, b) => b.score - a.score)
      .forEach((entry, place) => {
        ranks[entry.seriesIndex][position] = place + 1
      })
  })
  return { scores, ranks }
}

export function getBumpChartModel<TDatum extends ChartDatum>({
  data,
  config,
  index,
  size,
  fontSize,
  ranking = "rank",
  hidden,
  formatIndex,
}: {
  data: readonly TDatum[]
  config: ChartConfig
  index: string
  size: ChartSize
  fontSize: number
  ranking?: BumpRanking
  hidden?: ReadonlySet<string>
  formatIndex?: (value: string, datum: TDatum) => string
}): BumpChartModel {
  const series = getChartSeries(config, hidden)
  const labels = data.map((datum) => {
    const text = readChartText(datum, index)
    return formatIndex ? formatIndex(text, datum) : text
  })
  const { scores, ranks } = readRanks(
    data,
    series.map((item) => item.key),
    ranking
  )
  const slotCount = Math.max(
    1,
    ...ranks.flat().filter((rank): rank is number => rank !== null)
  )

  const width = (text: string) => estimateTextWidth(text, fontSize)
  // A ring and its stroke stay inside the frame at the top and both edges.
  const edge = DOT_RADIUS + RING / 2 + 1
  const plotHeight = Math.max(
    1,
    size.height - edge - DOT_RADIUS - getAxisLabelHeight(fontSize)
  )
  const slotGap = slotCount > 1 ? plotHeight / (slotCount - 1) : plotHeight
  const firstHalf = width(labels[0] ?? "") / 2 + 4
  const lastHalf = width(labels.at(-1) ?? "") / 2 + 4
  const start = Math.ceil(Math.max(edge, firstHalf))
  const plainEnd = Math.ceil(Math.max(edge, lastHalf))

  const last = data.length - 1
  const named = series.filter(
    (_, seriesIndex) => ranks[seriesIndex][last] != null
  )
  const nameWidth = Math.max(0, ...named.map((item) => width(item.label)))
  const namedEnd = Math.ceil(
    Math.max(lastHalf, DOT_RADIUS + NAME_GAP + nameWidth + 2)
  )
  // Names need the width to stay mostly plot, and slots tall enough that
  // two names on neighbouring ranks don't touch.
  const hasNames =
    named.length > 0 &&
    size.width - start - namedEnd >= size.width * NAMED_PLOT_SHARE &&
    (slotCount === 1 || slotGap >= fontSize * 1.25)
  const end = hasNames ? namedEnd : plainEnd

  const plot = {
    x: start,
    y: edge,
    width: Math.max(1, size.width - start - end),
    height: plotHeight,
  }
  const positions = getPointPositions(data.length, plot.x, plot.width)
  const step =
    data.length > 1 ? plot.width / (data.length - 1) : Number.POSITIVE_INFINITY
  const radius = Math.max(
    MIN_RADIUS,
    Math.min(
      DOT_RADIUS,
      Math.floor(Math.min(step, slotCount > 1 ? slotGap : DOT_RADIUS * 4) / 2) -
        1
    )
  )
  const toY = (rank: number) =>
    slotCount > 1 ? plot.y + (rank - 1) * slotGap : plot.y + plot.height / 2

  const geometry = series.map((item, seriesIndex) => ({
    ...item,
    ranks: ranks[seriesIndex],
    scores: scores[seriesIndex],
    points: ranks[seriesIndex].map((rank, position) =>
      rank === null ? null : { x: positions[position], y: toY(rank), rank }
    ),
  }))
  const labelWidth = Math.max(0, ...labels.map(width))

  return {
    plot,
    positions,
    labels,
    labelIndices: getIndexLabelIndices(
      data.length,
      plot.width + labelWidth,
      labelWidth + 12
    ),
    axisOffset: plot.y + plot.height + DOT_RADIUS + CHART_LABEL_GAP,
    slots: Array.from({ length: slotCount }, (_, slot) => ({
      value: slot + 1,
      position: toY(slot + 1),
      label: String(slot + 1),
    })),
    slotGap,
    series: geometry,
    ranking,
    radius,
    showRanks: radius >= RANK_RADIUS,
    names: hasNames
      ? geometry.flatMap((item) => {
          const point = item.points[last]
          return point
            ? [
                {
                  key: item.key,
                  text: item.label,
                  x: point.x + radius + NAME_GAP,
                  y: point.y,
                },
              ]
            : []
        })
      : [],
  }
}

/** The line through a series' points, as bump curves, broken at gaps. */
export function getBumpPath(points: readonly (BumpPoint | null)[]) {
  return (
    line<number>()
      .defined((position) => points[position] !== null)
      .x((position) => points[position]?.x ?? 0)
      .y((position) => points[position]?.y ?? 0)
      .curve(curveBumpX)(points.map((_, position) => position)) ?? ""
  )
}

/** How far a series moved since the previous index: `↑2`, `↓1` or `–`. */
export function getBumpMovement(
  ranks: readonly (number | null)[],
  position: number
) {
  const current = ranks[position]
  const previous = position > 0 ? ranks[position - 1] : null
  if (current === null || current === undefined) return null
  if (previous === null || previous === undefined) return null
  const change = previous - current
  return {
    change,
    text:
      change > 0
        ? `↑${formatChartNumber(change)}`
        : change < 0
          ? `↓${formatChartNumber(-change)}`
          : MISSING_VALUE,
  }
}

function formatRank(series: BumpSeriesGeometry, position: number) {
  const rank = series.ranks[position]
  if (rank === null || rank === undefined) return MISSING_VALUE
  const movement = getBumpMovement(series.ranks, position)
  return movement
    ? `#${formatChartNumber(rank)} ${movement.text}`
    : `#${formatChartNumber(rank)}`
}

/** A series' latest rank and how it moved there, for its legend row. */
export function getBumpLegendValue(series: BumpSeriesGeometry) {
  const position = series.ranks.findLastIndex((rank) => rank !== null)
  return position < 0 ? MISSING_VALUE : formatRank(series, position)
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/** Every series at one index, top rank first, with how it moved. */
export function getBumpTooltip(
  model: BumpChartModel,
  position: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const ranked = model.series
    .filter((series) => series.ranks[position] != null)
    .sort((a, b) => (a.ranks[position] ?? 0) - (b.ranks[position] ?? 0))
  return {
    title: model.labels[position] ?? "",
    rows: ranked.map((series) => {
      const score = series.scores[position]
      const rank = formatRank(series, position)
      return {
        key: series.key,
        label: series.label,
        paint: series.paint,
        dashed: false,
        value:
          model.ranking === "score" && score !== null && score !== undefined
            ? `${formatValue(score, series.key)} · ${rank}`
            : rank,
      }
    }),
  }
}

/** The data as a table: a row per index, a column per series. */
export function getBumpTable(
  model: BumpChartModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  return {
    columns: model.series.map((series) => series.label),
    rows: model.labels.map((label, position) => ({
      header: label,
      cells: model.series.map((series) => {
        const rank = series.ranks[position]
        const score = series.scores[position]
        if (rank === null || rank === undefined) return MISSING_VALUE
        return model.ranking === "score" &&
          score !== null &&
          score !== undefined
          ? `${formatValue(score, series.key)} (#${formatChartNumber(rank)})`
          : `#${formatChartNumber(rank)}`
      }),
    })),
  }
}

/**
 * Where along a bump curve's x a fraction `u` of the way across falls, as
 * the curve's own parameter: its x runs 1.5t − 1.5t² + t³, solved by
 * Newton's method (the curve is monotone in x).
 */
function solveBumpParameter(u: number) {
  let t = u
  for (let step = 0; step < 6; step++) {
    const error = 1.5 * t - 1.5 * t * t + t * t * t - u
    const slope = 1.5 - 3 * t + 3 * t * t
    t = Math.max(0, Math.min(1, t - error / slope))
  }
  return t
}

function getCurveY(from: BumpPoint, to: BumpPoint, x: number) {
  const span = to.x - from.x
  if (span <= 0) return from.y
  const t = solveBumpParameter(Math.max(0, Math.min(1, (x - from.x) / span)))
  return from.y + (to.y - from.y) * (3 * t * t - 2 * t * t * t)
}

/**
 * The series whose line passes closest to a point, within half a slot (and
 * no more than 16px), or null. Lines are followed along their curves, so
 * pointing between two indices still finds the right one.
 */
export function getBumpSeriesAt(model: BumpChartModel, point: ChartPoint) {
  const { positions } = model
  if (positions.length === 0) return null
  const threshold = Math.min(16, Math.max(model.radius, model.slotGap / 2))
  let after = positions.findIndex((position) => position >= point.x)
  if (after === -1) after = positions.length - 1
  const before = Math.max(0, after === 0 ? 0 : after - 1)

  let found: string | null = null
  let closest = threshold
  for (const series of model.series) {
    const from = series.points[before]
    const to = series.points[after]
    let y: number | null = null
    if (from && to) y = getCurveY(from, to, point.x)
    else {
      const only = from ?? to
      if (only && Math.abs(only.x - point.x) <= model.radius) y = only.y
    }
    if (y === null) continue
    const distance = Math.abs(y - point.y)
    if (distance <= closest) {
      closest = distance
      found = series.key
    }
  }
  return found
}

/** How much of a dot the draw-in shows, as the sweep passes over it. */
export function getBumpRevealAmount(sweep: number, x: number, radius: number) {
  return Math.max(0, Math.min(1, (sweep - (x - radius)) / (2 * radius)))
}

function blendPoints(
  from: readonly (BumpPoint | null)[],
  to: readonly (BumpPoint | null)[],
  progress: number,
  floor: number
) {
  return to.map((point, position) => {
    if (!point) return null
    const start = from[position] ?? { ...point, y: floor }
    return {
      x: interpolateNumber(start.x, point.x, progress),
      y: interpolateNumber(start.y, point.y, progress),
      rank: point.rank,
    }
  })
}

/**
 * The series between two layouts of the same indices. Points move to their
 * new slots; a series being shown rises from `floor` and one being hidden
 * sinks to it, marked `isLeaving`. Null when the index counts differ: there
 * is nothing to morph, so the chart redraws.
 */
export function interpolateBumpSeries(
  from: readonly BumpSeriesGeometry[],
  to: readonly BumpSeriesGeometry[],
  progress: number,
  floor: number
): BumpSeriesGeometry[] | null {
  const length = to[0]?.points.length ?? from[0]?.points.length ?? 0
  if ([...from, ...to].some((series) => series.points.length !== length)) {
    return null
  }
  const previous = new Map(from.map((series) => [series.key, series]))
  const next = new Set(to.map((series) => series.key))
  const moving = to.map((series) => ({
    ...series,
    points: blendPoints(
      previous.get(series.key)?.points ?? [],
      series.points,
      progress,
      floor
    ),
  }))
  const leaving = from
    .filter((series) => !next.has(series.key))
    .map((series) => ({
      ...series,
      isLeaving: true,
      points: blendPoints(
        series.points,
        series.points.map((point) => (point ? { ...point, y: floor } : null)),
        progress,
        floor
      ),
    }))
  return [...leaving, ...moving]
}
