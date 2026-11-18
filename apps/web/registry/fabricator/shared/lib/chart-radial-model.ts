// Radial charts: progress of a few values against their target as concentric
// rings, the first row outermost. Each ring is a faint track with the value
// as an arc over it, round-capped, swept from 12 o'clock round a full circle
// or from 9 to 3 o'clock as a half gauge. Rings carry their radii and share,
// so two datasets morph ring by ring.

import { arc } from "d3-shape"

import {
  formatChartNumber,
  formatChartPercent,
  getChartPaint,
  interpolateNumber,
  MISSING_VALUE,
  readChartNumber,
  readChartText,
  type ChartDatum,
  type ChartPaint,
  type ChartPoint,
  type ChartSeries,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

export type RadialShape = "full" | "half"

/** A ring's config: its label and colour, keyed by the ring's name. */
export type RadialConfig = Record<string, { label?: string; color?: string }>

export type RadialPart = {
  id: string
  label: string
  paint: ChartPaint
  /** The data row it reads. */
  row: number
}

export type RadialRing = {
  id: string
  label: string
  paint: ChartPaint
  value: number
  max: number
  /** The value's part of its max; past 1 when over target. */
  share: number
  innerRadius: number
  outerRadius: number
  /** Set while a hidden ring shrinks away. */
  isLeaving?: boolean
}

export type RadialChartModel = {
  shape: RadialShape
  center: ChartPoint
  /** Radians from 12 o'clock, clockwise, where every ring starts. */
  startAngle: number
  /** How far a full ring turns: a circle, or half of one. */
  sweep: number
  outerRadius: number
  thickness: number
  /** The room inside the innermost ring, for the centre label. */
  holeRadius: number
  /** Every row with a value, hidden ones too, in data order. */
  parts: RadialPart[]
  /** The visible rings, outermost first: the inspector's order. */
  rings: RadialRing[]
  /** Every row's name, value and max, for the table. */
  rows: { name: string; value: number | null; max: number }[]
  /** The field the values come from, passed to `formatValue`. */
  valueKey: string
}

const MIN_THICKNESS = 6
const MAX_THICKNESS = 24
/** Rings fill at most this much of the radius, so the centre keeps room. */
const RING_SPAN = 0.62

function getUniqueIds(names: readonly string[]) {
  const seen = new Set<string>()
  return names.map((name, index) => {
    const id = seen.has(name) ? `${name}#${index}` : name
    seen.add(id)
    return id
  })
}

/** Ring thickness and the gap between rings, for `count` rings. */
function getRingSizes(radius: number, count: number) {
  const preferred = Math.min(
    MAX_THICKNESS,
    Math.max(MIN_THICKNESS, radius * 0.14)
  )
  const gap = Math.max(3, Math.round(preferred * 0.3))
  const fitting =
    (radius * RING_SPAN - gap * Math.max(0, count - 1)) / Math.max(1, count)
  return { thickness: Math.max(2, Math.min(preferred, fitting)), gap }
}

/** Every row with a value, in data order, with its label and colour. */
export function getRadialParts<TDatum extends ChartDatum>({
  data,
  nameKey = "name",
  valueKey = "value",
  config = {},
}: {
  data: readonly TDatum[]
  nameKey?: string
  valueKey?: string
  config?: RadialConfig
}): RadialPart[] {
  const names = data.map((datum) => readChartText(datum, nameKey))
  const ids = getUniqueIds(names)
  const parts: RadialPart[] = []
  data.forEach((datum, row) => {
    if (readChartNumber(datum, valueKey) === null) return
    const own = config[names[row]]
    parts.push({
      id: ids[row],
      label: own?.label ?? names[row],
      paint: getChartPaint(own?.color, parts.length),
      row,
    })
  })
  return parts
}

export function getRadialChartModel<TDatum extends ChartDatum>({
  data,
  nameKey = "name",
  valueKey = "value",
  max,
  maxKey,
  config = {},
  size,
  shape = "full",
  hidden = new Set(),
}: {
  data: readonly TDatum[]
  nameKey?: string
  valueKey?: string
  /** One max for every ring. */
  max?: number
  /** The field holding each row's own max. */
  maxKey?: string
  config?: RadialConfig
  size: ChartSize
  shape?: RadialShape
  hidden?: ReadonlySet<string>
}): RadialChartModel {
  const names = data.map((datum) => readChartText(datum, nameKey))
  const values = data.map((datum) => readChartNumber(datum, valueKey))
  const largest = Math.max(0, ...values.map((value) => value ?? 0))
  const maxes = data.map((datum) => {
    const own = maxKey ? readChartNumber(datum, maxKey) : null
    return own ?? max ?? largest
  })
  const parts = getRadialParts({ data, nameKey, valueKey, config })
  const visible = parts.filter((part) => !hidden.has(part.id))

  const isHalf = shape === "half"
  // A half gauge's round caps hang below its centre by half a ring.
  const outerRadius = Math.max(
    1,
    isHalf
      ? Math.min(size.width / 2 - 1, (size.height - 1) / 1.07)
      : Math.min(size.width, size.height) / 2 - 1
  )
  const { thickness, gap } = getRingSizes(outerRadius, visible.length)
  const center = isHalf
    ? {
        x: size.width / 2,
        y: (size.height - outerRadius - thickness / 2) / 2 + outerRadius,
      }
    : { x: size.width / 2, y: size.height / 2 }

  const rings = visible.map((part, position) => {
    const ringOuter = outerRadius - position * (thickness + gap)
    const value = values[part.row] ?? 0
    const ringMax = maxes[part.row]
    return {
      id: part.id,
      label: part.label,
      paint: part.paint,
      value,
      max: ringMax,
      share: ringMax > 0 ? value / ringMax : 0,
      innerRadius: Math.max(0, ringOuter - thickness),
      outerRadius: Math.max(0, ringOuter),
    }
  })

  return {
    shape,
    center,
    startAngle: isHalf ? -Math.PI / 2 : 0,
    sweep: isHalf ? Math.PI : Math.PI * 2,
    outerRadius,
    thickness,
    holeRadius: rings.at(-1)?.innerRadius ?? outerRadius,
    parts,
    rings,
    rows: data.map((_, row) => ({
      name: names[row],
      value: values[row],
      max: maxes[row],
    })),
    valueKey,
  }
}

/** The rows as series, for the legend: one toggle per ring. */
export function getRadialSeries(model: RadialChartModel): ChartSeries[] {
  return model.parts.map((part) => ({
    key: part.id,
    label: part.label,
    paint: part.paint,
    dashed: false,
  }))
}

type ArcInput = {
  innerRadius: number
  outerRadius: number
  startAngle: number
  endAngle: number
  cornerRadius: number
}

const drawArc = arc<ArcInput>()
  .innerRadius((input) => input.innerRadius)
  .outerRadius((input) => input.outerRadius)
  .startAngle((input) => input.startAngle)
  .endAngle((input) => input.endAngle)
  .cornerRadius((input) => input.cornerRadius)

/**
 * A ring's arc around the model's centre (0, 0), `share` of the way round
 * (1 for its track), with round caps. Empty for nothing.
 */
export function getRadialArcPath(
  model: Pick<RadialChartModel, "startAngle" | "sweep">,
  ring: Pick<RadialRing, "innerRadius" | "outerRadius">,
  share: number
) {
  const amount = Math.min(1, share)
  if (amount <= 0 || ring.outerRadius <= ring.innerRadius) return ""
  return (
    drawArc({
      innerRadius: ring.innerRadius,
      outerRadius: ring.outerRadius,
      startAngle: model.startAngle,
      endAngle: model.startAngle + amount * model.sweep,
      cornerRadius: (ring.outerRadius - ring.innerRadius) / 2,
    }) ?? ""
  )
}

/**
 * The ring under a point, as an index into `rings`: its band and half the
 * gap either side. -1 in the centre, outside, or below a half gauge.
 */
export function getRadialRingAt(model: RadialChartModel, point: ChartPoint) {
  const x = point.x - model.center.x
  const y = point.y - model.center.y
  if (model.shape === "half" && y > model.thickness) return -1
  const distance = Math.hypot(x, y)
  const slack = model.thickness * 0.25 + 2
  return model.rings.findIndex(
    (ring) =>
      distance >= ring.innerRadius - slack &&
      distance <= ring.outerRadius + slack
  )
}

/** Where a ring's tooltip points: the end of its value, mid-ring. */
export function getRadialAnchor(
  model: RadialChartModel,
  index: number
): ChartPoint {
  const ring = model.rings[index]
  if (!ring) return model.center
  const angle =
    model.startAngle + Math.max(0, Math.min(1, ring.share)) * model.sweep
  const radius = (ring.innerRadius + ring.outerRadius) / 2
  return {
    x: model.center.x + Math.sin(angle) * radius,
    y: model.center.y - Math.cos(angle) * radius,
  }
}

/** What the centre shows by default: the first ring's share. */
export function getRadialCenterText(model: RadialChartModel) {
  const first = model.rings[0]
  return first ? formatChartPercent(first.share) : ""
}

/** The centre label's size, so `text` fits inside the innermost ring. */
export function getRadialCenterFontSize(
  model: RadialChartModel,
  text: string,
  maxFontSize = 30
) {
  const room =
    model.shape === "half" ? model.holeRadius * 1.4 : model.holeRadius * 1.5
  const fitting = room / (Math.max(1, text.length) * 0.6)
  return Math.max(10, Math.min(maxFontSize, model.holeRadius * 0.42, fitting))
}

function collapseRing(ring: RadialRing): RadialRing {
  const middle = (ring.innerRadius + ring.outerRadius) / 2
  return { ...ring, share: 0, innerRadius: middle, outerRadius: middle }
}

function blendRing(from: RadialRing, to: RadialRing, progress: number) {
  return {
    ...to,
    share: interpolateNumber(from.share, to.share, progress),
    innerRadius: interpolateNumber(from.innerRadius, to.innerRadius, progress),
    outerRadius: interpolateNumber(from.outerRadius, to.outerRadius, progress),
  }
}

/**
 * The rings between two charts, keyed by id. A ring that stays turns to its
 * new share and moves to its new radius; a new one grows from nothing; a
 * leaving one shrinks away, marked `isLeaving`. Null when both are empty.
 */
export function interpolateRadialRings(
  from: readonly RadialRing[],
  to: readonly RadialRing[],
  progress: number
): RadialRing[] | null {
  if (from.length === 0 && to.length === 0) return null
  const previous = new Map(from.map((ring) => [ring.id, ring]))
  const next = new Set(to.map((ring) => ring.id))
  const moving = to.map((ring) =>
    blendRing(previous.get(ring.id) ?? collapseRing(ring), ring, progress)
  )
  const leaving = from
    .filter((ring) => !next.has(ring.id))
    .map((ring) => ({
      ...blendRing(ring, collapseRing(ring), progress),
      isLeaving: true,
    }))
  return [...moving, ...leaving]
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/** A ring's name, then its share beside its value and max. */
export function getRadialTooltip(
  model: RadialChartModel,
  index: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const ring = model.rings[index]
  if (!ring) return { title: "", rows: [] }
  return {
    title: ring.label,
    rows: [
      {
        key: ring.id,
        label: formatChartPercent(ring.share),
        paint: ring.paint,
        dashed: false,
        value: `${formatValue(ring.value, model.valueKey)} / ${formatValue(ring.max, model.valueKey)}`,
      },
    ],
  }
}

/** Every row as a table: its value, its max and its share. */
export function getRadialTable(
  model: RadialChartModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  return {
    columns: ["Value", "Max", "Share"],
    rows: model.rows.map((row) => ({
      header: row.name,
      cells: [
        row.value === null
          ? MISSING_VALUE
          : formatValue(row.value, model.valueKey),
        formatValue(row.max, model.valueKey),
        row.value === null || row.max <= 0
          ? MISSING_VALUE
          : formatChartPercent(row.value / row.max),
      ],
    })),
  }
}
