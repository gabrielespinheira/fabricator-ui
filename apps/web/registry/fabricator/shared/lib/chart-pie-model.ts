// Pie and donut charts: parts of one whole as slices, clockwise from 12
// o'clock in data order. Slices keep a 2px gap of surface between them at any
// radius, and more than eight parts fold the smallest into a grey "Other", so
// the palette never runs out. Slices carry only angles: the radii belong to
// the model, so two datasets morph angle by angle.

import { arc, pie } from "d3-shape"

import {
  estimateTextWidth,
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

export type PieVariant = "pie" | "donut"

/** A slice's config: its label and colour, keyed by the slice's name. */
export type PieConfig = Record<string, { label?: string; color?: string }>

/** One part of the whole: a row, or the rows folded into "Other". */
export type PiePart = {
  id: string
  label: string
  value: number
  paint: ChartPaint
  /** The data rows behind it, the largest first. */
  rows: number[]
}

/** The share printed inside a slice, on a pill, relative to the centre. */
export type PieLabelBox = {
  text: string
  x: number
  y: number
  width: number
  height: number
}

export type PieSlice = {
  id: string
  label: string
  value: number
  /** The slice's part of the visible whole, 0 to 1. */
  share: number
  paint: ChartPaint
  /** Radians from 12 o'clock, clockwise. */
  startAngle: number
  endAngle: number
  padAngle: number
  /** The share label, when asked for and it fits. */
  labelBox: PieLabelBox | null
  /** Set while a hidden slice shrinks away. */
  isLeaving?: boolean
}

export type PieChartModel = {
  variant: PieVariant
  center: ChartPoint
  outerRadius: number
  innerRadius: number
  cornerRadius: number
  /** Every part, hidden ones too, in data order with "Other" last. */
  parts: PiePart[]
  /** The visible parts, clockwise: the order the inspector steps through. */
  slices: PieSlice[]
  /** The visible whole. */
  total: number
  /** Every row's name and value, for the table. */
  rows: { name: string; value: number | null }[]
  /** The field the values come from, passed to `formatValue`. */
  valueKey: string
}

export const OTHER_SLICE_ID = "__other"
/** How far a lifted slice moves out along its bisector. */
export const PIE_LIFT = 6
/** Parts beyond this many fold into "Other". */
const MAX_PARTS = 8
const SLICE_GAP = 2
const DONUT_HOLE = 0.62
const LABEL_PADDING_X = 6
const LABEL_PADDING_Y = 3
const LABEL_MARGIN = 2

function getUniqueIds(names: readonly string[]) {
  const seen = new Set<string>()
  return names.map((name, index) => {
    const id = seen.has(name) ? `${name}#${index}` : name
    seen.add(id)
    return id
  })
}

/**
 * The parts of the whole: one per row with a positive value, and past eight
 * the seven largest in data order, then the rest as "Other". Colours come
 * from config, else the palette in the kept parts' order.
 */
export function getPieParts<TDatum extends ChartDatum>({
  data,
  nameKey = "name",
  valueKey = "value",
  config = {},
}: {
  data: readonly TDatum[]
  nameKey?: string
  valueKey?: string
  config?: PieConfig
}): PiePart[] {
  const names = data.map((datum) => readChartText(datum, nameKey))
  const ids = getUniqueIds(names)
  const entries = data
    .map((datum, row) => ({ row, value: readChartNumber(datum, valueKey) }))
    .filter(
      (entry): entry is { row: number; value: number } =>
        entry.value !== null && entry.value > 0
    )
  const isFolding = entries.length > MAX_PARTS
  const ranked = [...entries].sort(
    (first, second) => second.value - first.value || first.row - second.row
  )
  const keptRows = new Set(
    (isFolding ? ranked.slice(0, MAX_PARTS - 1) : ranked).map(
      (entry) => entry.row
    )
  )
  const kept = entries
    .filter((entry) => keptRows.has(entry.row))
    .map((entry, position) => {
      const name = names[entry.row]
      const own = config[name]
      return {
        id: ids[entry.row],
        label: own?.label ?? name,
        value: entry.value,
        paint: getChartPaint(own?.color, position),
        rows: [entry.row],
      }
    })
  if (!isFolding) return kept
  const folded = ranked.filter((entry) => !keptRows.has(entry.row))
  return [
    ...kept,
    {
      id: OTHER_SLICE_ID,
      label: "Other",
      value: folded.reduce((sum, entry) => sum + entry.value, 0),
      paint: { token: "muted-foreground" },
      rows: folded.map((entry) => entry.row),
    },
  ]
}

function normalizeAngle(angle: number) {
  const turn = Math.PI * 2
  return ((angle % turn) + turn) % turn
}

/** How far a slice's label sits from the centre. */
function getLabelRadius(innerRadius: number, outerRadius: number) {
  return innerRadius > 0 ? (innerRadius + outerRadius) / 2 : outerRadius * 0.62
}

/**
 * The share on a pill at the slice's middle, or null when the pill would
 * cross the slice's edges: a label that might not fit is dropped.
 */
function getLabelBox(
  slice: {
    startAngle: number
    endAngle: number
    padAngle: number
    share: number
  },
  innerRadius: number,
  outerRadius: number,
  fontSize: number
): PieLabelBox | null {
  const text = formatChartPercent(slice.share)
  const width = estimateTextWidth(text, fontSize) + LABEL_PADDING_X * 2
  const height = Math.ceil(fontSize * 1.2) + LABEL_PADDING_Y * 2
  const middle = (slice.startAngle + slice.endAngle) / 2
  const half = (slice.endAngle - slice.startAngle - slice.padAngle) / 2
  const radius = getLabelRadius(innerRadius, outerRadius)
  const x = Math.sin(middle) * radius
  const y = -Math.cos(middle) * radius
  const left = x - width / 2
  const top = y - height / 2
  const corners: [number, number][] = [
    [left, top],
    [left + width, top],
    [left, top + height],
    [left + width, top + height],
  ]
  const fitsCorner = ([cornerX, cornerY]: [number, number]) => {
    const distance = Math.hypot(cornerX, cornerY)
    if (distance > outerRadius - LABEL_MARGIN) return false
    if (distance < 1) return true
    const angle = Math.atan2(cornerX, -cornerY)
    const delta = Math.abs(
      ((normalizeAngle(angle - middle) + Math.PI) % (Math.PI * 2)) - Math.PI
    )
    return delta * distance <= half * distance - LABEL_MARGIN
  }
  // The point of the box nearest the centre must clear a donut's hole.
  const nearest = Math.hypot(
    Math.max(left, 0, -(left + width)),
    Math.max(top, 0, -(top + height))
  )
  if (innerRadius > 0 && nearest < innerRadius + LABEL_MARGIN) return null
  if (!corners.every(fitsCorner)) return null
  return { text, x, y, width, height }
}

export function getPieChartModel<TDatum extends ChartDatum>({
  data,
  nameKey = "name",
  valueKey = "value",
  config = {},
  size,
  fontSize,
  variant = "pie",
  hidden = new Set(),
  labels = false,
}: {
  data: readonly TDatum[]
  nameKey?: string
  valueKey?: string
  config?: PieConfig
  size: ChartSize
  fontSize: number
  variant?: PieVariant
  hidden?: ReadonlySet<string>
  labels?: boolean
}): PieChartModel {
  const parts = getPieParts({ data, nameKey, valueKey, config })
  const visible = parts.filter((part) => !hidden.has(part.id))
  const total = visible.reduce((sum, part) => sum + part.value, 0)
  const outerRadius = Math.max(
    1,
    Math.min(size.width, size.height) / 2 - PIE_LIFT - 1
  )
  const innerRadius = variant === "donut" ? outerRadius * DONUT_HOLE : 0
  const cornerRadius = variant === "donut" ? 6 : 4
  const padAngle =
    visible.length > 1 ? SLICE_GAP / Math.hypot(innerRadius, outerRadius) : 0
  const arcs = pie<PiePart>()
    .value((part) => part.value)
    .sort(null)
    .startAngle(0)
    .endAngle(Math.PI * 2)
    .padAngle(padAngle)(visible)

  const slices = arcs.map((item) => {
    const share = total ? item.data.value / total : 0
    const geometry = {
      startAngle: item.startAngle,
      endAngle: item.endAngle,
      padAngle: item.padAngle,
      share,
    }
    return {
      id: item.data.id,
      label: item.data.label,
      value: item.data.value,
      paint: item.data.paint,
      ...geometry,
      labelBox: labels
        ? getLabelBox(geometry, innerRadius, outerRadius, fontSize)
        : null,
    }
  })

  return {
    variant,
    center: { x: size.width / 2, y: size.height / 2 },
    outerRadius,
    innerRadius,
    cornerRadius,
    parts,
    slices,
    total,
    rows: data.map((datum) => ({
      name: readChartText(datum, nameKey),
      value: readChartNumber(datum, valueKey),
    })),
    valueKey,
  }
}

/** The parts as series, for the legend: one toggle per slice. */
export function getPieSeries(model: PieChartModel): ChartSeries[] {
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
  padAngle: number
  cornerRadius: number
}

const drawArc = arc<ArcInput>()
  .innerRadius((input) => input.innerRadius)
  .outerRadius((input) => input.outerRadius)
  .startAngle((input) => input.startAngle)
  .endAngle((input) => input.endAngle)
  .padAngle((input) => input.padAngle)
  .cornerRadius((input) => input.cornerRadius)

/** A slice as a path around the model's centre (0, 0). */
export function getPieSlicePath(
  model: Pick<PieChartModel, "innerRadius" | "outerRadius" | "cornerRadius">,
  slice: Pick<PieSlice, "startAngle" | "endAngle" | "padAngle">
) {
  return (
    drawArc({
      innerRadius: model.innerRadius,
      outerRadius: model.outerRadius,
      startAngle: slice.startAngle,
      endAngle: slice.endAngle,
      padAngle: slice.padAngle,
      cornerRadius: model.cornerRadius,
    }) ?? ""
  )
}

/** Where a slice moves when lifted: `distance` out along its bisector. */
export function getSliceOffset(
  slice: Pick<PieSlice, "startAngle" | "endAngle">,
  distance: number
): ChartPoint {
  const middle = (slice.startAngle + slice.endAngle) / 2
  return { x: Math.sin(middle) * distance, y: -Math.cos(middle) * distance }
}

/**
 * The slice under a point, as an index into `slices`, or -1 outside the pie
 * or inside a donut's hole.
 */
export function getPieSliceAt(model: PieChartModel, point: ChartPoint) {
  const x = point.x - model.center.x
  const y = point.y - model.center.y
  const distance = Math.hypot(x, y)
  if (distance > model.outerRadius + PIE_LIFT) return -1
  if (model.innerRadius > 0 && distance < model.innerRadius - PIE_LIFT) {
    return -1
  }
  const angle = normalizeAngle(Math.atan2(x, -y))
  return model.slices.findIndex(
    (slice) => angle >= slice.startAngle && angle < slice.endAngle
  )
}

/** Where a slice's tooltip points: just past its lifted rim. */
export function getPieAnchor(model: PieChartModel, index: number): ChartPoint {
  const slice = model.slices[index]
  if (!slice) return model.center
  const offset = getSliceOffset(slice, model.outerRadius + PIE_LIFT)
  return { x: model.center.x + offset.x, y: model.center.y + offset.y }
}

/**
 * The draw-in: every slice swept round from 12 o'clock, `progress` of the
 * way. The slices themselves at 1.
 */
export function sweepPieSlices(slices: PieSlice[], progress: number) {
  if (progress >= 1) return slices
  return slices.map((slice) => ({
    ...slice,
    startAngle: slice.startAngle * progress,
    endAngle: slice.endAngle * progress,
  }))
}

/**
 * The size of a donut's centre value, so the widest of `texts` fits its
 * hole and the size holds still as the centre swaps between them.
 */
export function getDonutCenterFontSize(
  innerRadius: number,
  texts: readonly string[],
  maxFontSize = 30
) {
  const longest = Math.max(1, ...texts.map((text) => text.length))
  const fitting = (innerRadius * 1.5) / (longest * 0.6)
  return Math.max(10, Math.min(maxFontSize, innerRadius * 0.42, fitting))
}

function collapseAt(slice: PieSlice, angle: number): PieSlice {
  return { ...slice, startAngle: angle, endAngle: angle, padAngle: 0 }
}

function blendSlice(from: PieSlice, to: PieSlice, progress: number): PieSlice {
  return {
    ...to,
    startAngle: interpolateNumber(from.startAngle, to.startAngle, progress),
    endAngle: interpolateNumber(from.endAngle, to.endAngle, progress),
    padAngle: interpolateNumber(from.padAngle, to.padAngle, progress),
    share: interpolateNumber(from.share, to.share, progress),
  }
}

/**
 * The slices between two pies, keyed by id. A slice that stays turns to its
 * new angles; a new one grows from zero width where its neighbour ended; a
 * leaving one shrinks to zero width where its neighbour now ends, marked
 * `isLeaving`. Null when both are empty.
 */
export function interpolatePieSlices(
  from: readonly PieSlice[],
  to: readonly PieSlice[],
  progress: number
): PieSlice[] | null {
  if (from.length === 0 && to.length === 0) return null
  const previous = new Map(from.map((slice) => [slice.id, slice]))
  const next = new Map(to.map((slice) => [slice.id, slice]))

  // Where a new slice starts: the end of the nearest slice before it that
  // was already there.
  const enteringAngle = (position: number) => {
    for (let index = position - 1; index >= 0; index--) {
      const before = previous.get(to[index].id)
      if (before) return before.endAngle
    }
    return 0
  }
  // Where a leaving slice ends: the end of the nearest slice before it that
  // stays.
  const leavingAngle = (position: number) => {
    for (let index = position - 1; index >= 0; index--) {
      const after = next.get(from[index].id)
      if (after) return after.endAngle
    }
    return 0
  }

  const moving = to.map((slice, position) => {
    const start =
      previous.get(slice.id) ?? collapseAt(slice, enteringAngle(position))
    return blendSlice(start, slice, progress)
  })
  const leaving = from.flatMap((slice, position) =>
    next.has(slice.id)
      ? []
      : [
          {
            ...blendSlice(
              slice,
              collapseAt(slice, leavingAngle(position)),
              progress
            ),
            isLeaving: true,
          },
        ]
  )
  return [...moving, ...leaving]
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/** A slice's name, then its share beside its value. */
export function getPieTooltip(
  model: PieChartModel,
  index: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  const slice = model.slices[index]
  if (!slice) return { title: "", rows: [] }
  return {
    title: slice.label,
    rows: [
      {
        key: slice.id,
        label: formatChartPercent(slice.share),
        paint: slice.paint,
        dashed: false,
        value: formatValue(slice.value, model.valueKey),
      },
    ],
  }
}

/** Every row as a table: its value and its share of the whole. */
export function getPieTable(
  model: PieChartModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  const whole = model.rows.reduce(
    (sum, row) => sum + Math.max(0, row.value ?? 0),
    0
  )
  return {
    columns: ["Value", "Share"],
    rows: model.rows.map((row) => ({
      header: row.name,
      cells:
        row.value === null
          ? [MISSING_VALUE, MISSING_VALUE]
          : [
              formatValue(row.value, model.valueKey),
              formatChartPercent(whole ? Math.max(0, row.value) / whole : 0),
            ],
    })),
  }
}

export type PieListRow = {
  id: string
  label: string
  paint: ChartPaint
  value: string
  share: number
  shareText: string
}

/** A row per part, for a donut's value list: its share of every part. */
export function getPieListRows(
  model: PieChartModel,
  formatValue: (value: number, key: string) => string = formatDefault
): PieListRow[] {
  const whole = model.parts.reduce((sum, part) => sum + part.value, 0)
  return model.parts.map((part) => {
    const share = whole ? part.value / whole : 0
    return {
      id: part.id,
      label: part.label,
      paint: part.paint,
      value: formatValue(part.value, model.valueKey),
      share,
      shareText: formatChartPercent(share),
    }
  })
}
