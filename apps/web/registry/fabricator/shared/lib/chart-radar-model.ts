// Radar charts: several measures of one or more subjects on shared axes. Each
// row is an axis, spaced clockwise from 12 o'clock; each series a closed
// polygon through its value on every axis, on one scale from the centre out.
// Axis labels sit just past the grid, anchored by their angle, and the radius
// shrinks until every label fits inside the frame.

import {
  estimateTextWidth,
  formatChartNumber,
  getChartSeries,
  getValueScale,
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

export type RadarAxis = {
  /** Unique per axis, for morphing. */
  id: string
  label: string
  /** The label as drawn: shortened with an ellipsis where room is short. */
  text: string
  /** Radians from 12 o'clock, clockwise. */
  angle: number
  /** The spoke's outer end. */
  end: ChartPoint
  /** The label's position, its `y` on the text's baseline. */
  labelX: number
  labelY: number
  anchor: "start" | "middle" | "end"
}

export type RadarSeriesGeometry = {
  key: string
  label: string
  paint: ChartPaint
  /** The datum's value on each axis, null for a gap. */
  values: (number | null)[]
  /** The axis ids, in order, the radii are for. */
  axes: string[]
  /** Each vertex's distance from the centre, in pixels. */
  radii: number[]
  /** Set while a hidden series shrinks away. */
  isLeaving?: boolean
}

export type RadarChartModel = {
  center: ChartPoint
  radius: number
  /** The value at the outer polygon. */
  max: number
  /** The grid polygons' radii, innermost first. */
  levels: number[]
  axes: RadarAxis[]
  series: RadarSeriesGeometry[]
}

export const RADAR_LEVELS = 4
/** A series' wash: low enough that overlapping polygons stay readable. */
export const RADAR_WASH_OPACITY = 0.16
const LABEL_GAP = 8
const MIN_RADIUS = 8
/**
 * The radius never drops below this share of the frame's half: past it,
 * long labels are shortened instead.
 */
const MIN_RADIUS_SHARE = 0.5
/** Labels within this of straight up or down centre on their spoke. */
const CENTRED = 0.15

function getUniqueIds(names: readonly string[]) {
  const seen = new Set<string>()
  return names.map((name, index) => {
    const id = seen.has(name) ? `${name}#${index}` : name
    seen.add(id)
    return id
  })
}

function getAnchor(angle: number): RadarAxis["anchor"] {
  const sine = Math.sin(angle)
  if (Math.abs(sine) < CENTRED) return "middle"
  return sine > 0 ? "start" : "end"
}

/**
 * The largest radius at which every label fits inside the frame, beside or
 * above and below its spoke's end.
 */
function getRadius(
  size: ChartSize,
  center: ChartPoint,
  labels: readonly string[],
  angles: readonly number[],
  fontSize: number
) {
  const lineHeight = fontSize * 1.2
  let radius = Math.min(size.width, size.height) / 2 - 1
  angles.forEach((angle, index) => {
    const sine = Math.sin(angle)
    const cosine = Math.cos(angle)
    const width = estimateTextWidth(labels[index], fontSize)
    const anchor = getAnchor(angle)
    if (anchor === "start") {
      radius = Math.min(
        radius,
        (size.width - 1 - center.x - width) / sine - LABEL_GAP
      )
    } else if (anchor === "end") {
      radius = Math.min(radius, (center.x - 1 - width) / -sine - LABEL_GAP)
    }
    // Centred labels stand wholly above or below their spoke; side ones
    // are centred on it.
    const height = anchor === "middle" ? lineHeight : lineHeight / 2
    if (cosine > CENTRED / 2) {
      radius = Math.min(radius, (center.y - 1 - height) / cosine - LABEL_GAP)
    } else if (cosine < -CENTRED / 2) {
      radius = Math.min(
        radius,
        (size.height - 1 - center.y - height) / -cosine - LABEL_GAP
      )
    }
  })
  const floor = (Math.min(size.width, size.height) / 2) * MIN_RADIUS_SHARE
  return Math.max(MIN_RADIUS, floor, radius)
}

/**
 * A label shortened with an ellipsis to the width beside its spoke's end,
 * for when the radius has reached its floor. Centred labels keep the frame's
 * width.
 */
function fitLabel(
  label: string,
  angle: number,
  center: ChartPoint,
  radius: number,
  size: ChartSize,
  fontSize: number
) {
  const anchor = getAnchor(angle)
  const x = center.x + Math.sin(angle) * (radius + LABEL_GAP)
  const room =
    anchor === "start"
      ? size.width - 1 - x
      : anchor === "end"
        ? x - 1
        : size.width - 2
  if (estimateTextWidth(label, fontSize) <= room) return label
  const characters = Math.max(1, Math.floor(room / (fontSize * 0.6)) - 1)
  return `${label.slice(0, characters).trimEnd()}…`
}

function getLabelPosition(
  center: ChartPoint,
  angle: number,
  radius: number,
  fontSize: number
) {
  const anchor = getAnchor(angle)
  const x = center.x + Math.sin(angle) * (radius + LABEL_GAP)
  const y = center.y - Math.cos(angle) * (radius + LABEL_GAP)
  const cosine = Math.cos(angle)
  // Baselines: a top label's descenders clear the gap, a bottom label's
  // capitals hang under it, and side labels centre on the spoke.
  const labelY =
    anchor !== "middle"
      ? y + fontSize * 0.35
      : cosine > 0
        ? y - fontSize * 0.25
        : y + fontSize * 0.8
  return { labelX: x, labelY, anchor }
}

export function getRadarChartModel<TDatum extends ChartDatum>({
  data,
  config,
  index,
  size,
  fontSize,
  hidden,
}: {
  data: readonly TDatum[]
  config: ChartConfig
  /** The field naming each axis. */
  index: string
  size: ChartSize
  fontSize: number
  hidden?: ReadonlySet<string>
}): RadarChartModel {
  const series = getChartSeries(config, hidden)
  const labels = data.map((datum) => readChartText(datum, index))
  const ids = getUniqueIds(labels)
  const angles = data.map(
    (_, position) => (position / Math.max(1, data.length)) * Math.PI * 2
  )
  const center = { x: size.width / 2, y: size.height / 2 }
  const radius = getRadius(size, center, labels, angles, fontSize)
  const values = series.map((item) =>
    data.map((datum) => readChartNumber(datum, item.key))
  )
  const largest = Math.max(0, ...values.flat().map((value) => value ?? 0))
  const scale = getValueScale({
    min: 0,
    max: largest,
    range: [0, radius],
    tickCount: RADAR_LEVELS,
  })
  const max = scale.domain[1]

  const axes = data.map((_, position) => {
    const angle = angles[position]
    return {
      id: ids[position],
      label: labels[position],
      text: fitLabel(labels[position], angle, center, radius, size, fontSize),
      angle,
      end: {
        x: center.x + Math.sin(angle) * radius,
        y: center.y - Math.cos(angle) * radius,
      },
      ...getLabelPosition(center, angle, radius, fontSize),
    }
  })

  return {
    center,
    radius,
    max,
    levels: Array.from(
      { length: RADAR_LEVELS },
      (_, level) => (radius * (level + 1)) / RADAR_LEVELS
    ),
    axes,
    series: series.map((item, seriesIndex) => ({
      key: item.key,
      label: item.label,
      paint: item.paint,
      values: values[seriesIndex],
      axes: ids,
      radii: values[seriesIndex].map((value) =>
        max > 0 ? (Math.max(0, value ?? 0) / max) * radius : 0
      ),
    })),
  }
}

/** A point `radius` out along an axis. */
export function getRadarPoint(
  model: Pick<RadarChartModel, "center" | "axes">,
  axisIndex: number,
  radius: number
): ChartPoint {
  const angle = model.axes[axisIndex]?.angle ?? 0
  return {
    x: model.center.x + Math.sin(angle) * radius,
    y: model.center.y - Math.cos(angle) * radius,
  }
}

const round = (value: number) => Math.round(value * 100) / 100

/** A closed polygon through a radius on every axis. */
export function getRadarPolygonPath(
  model: Pick<RadarChartModel, "center" | "axes">,
  radii: readonly number[]
) {
  if (model.axes.length === 0) return ""
  const points = model.axes.map((_, axisIndex) =>
    getRadarPoint(model, axisIndex, radii[axisIndex] ?? 0)
  )
  return `${points
    .map(
      (point, position) =>
        `${position === 0 ? "M" : "L"}${round(point.x)},${round(point.y)}`
    )
    .join("")}Z`
}

/** A grid polygon at one radius. */
export function getRadarGridPath(
  model: Pick<RadarChartModel, "center" | "axes">,
  radius: number
) {
  return getRadarPolygonPath(
    model,
    model.axes.map(() => radius)
  )
}

/** The axis nearest a point's angle from the centre, or -1 with no axes. */
export function getRadarAxisAt(model: RadarChartModel, point: ChartPoint) {
  if (model.axes.length === 0) return -1
  const turn = Math.PI * 2
  const angle =
    (Math.atan2(point.x - model.center.x, -(point.y - model.center.y)) + turn) %
    turn
  let nearest = 0
  let distance = Number.POSITIVE_INFINITY
  model.axes.forEach((axis, axisIndex) => {
    const gap = Math.abs(angle - axis.angle)
    const around = Math.min(gap, turn - gap)
    if (around < distance) {
      distance = around
      nearest = axisIndex
    }
  })
  return nearest
}

/** Where an axis' tooltip points: its outermost visible vertex. */
export function getRadarAnchor(
  model: RadarChartModel,
  axisIndex: number
): ChartPoint {
  const radii = model.series.map((item) => item.radii[axisIndex] ?? 0)
  if (radii.length === 0) {
    return model.axes[axisIndex]?.end ?? model.center
  }
  return getRadarPoint(model, axisIndex, Math.max(...radii))
}

/**
 * The series between two charts, vertex by vertex, keyed by series and axis
 * and laid on the new chart's axes. A new series or a new axis' vertex
 * grows from the centre; a leaving series shrinks into it, marked
 * `isLeaving`. Null when both are empty.
 */
export function interpolateRadarSeries(
  from: readonly RadarSeriesGeometry[],
  to: readonly RadarSeriesGeometry[],
  progress: number
): RadarSeriesGeometry[] | null {
  if (from.length === 0 && to.length === 0) return null
  const axes = to[0]?.axes ?? []
  const previous = new Map(
    from.map((item) => [
      item.key,
      new Map(item.axes.map((axis, position) => [axis, item.radii[position]])),
    ])
  )
  const next = new Set(to.map((item) => item.key))
  const startOf = (key: string, axis: string) =>
    previous.get(key)?.get(axis) ?? 0

  const moving = to.map((item) => ({
    ...item,
    radii: item.radii.map((radius, position) =>
      interpolateNumber(
        startOf(item.key, item.axes[position]),
        radius,
        progress
      )
    ),
  }))
  const leaving = from
    .filter((item) => !next.has(item.key))
    .map((item) => ({
      ...item,
      axes,
      values: axes.map(() => null),
      radii: axes.map((axis) =>
        interpolateNumber(startOf(item.key, axis), 0, progress)
      ),
      isLeaving: true,
    }))
  return [...moving, ...leaving]
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/** Every visible series' value on one axis, in config order. */
export function getRadarTooltip(
  model: RadarChartModel,
  axisIndex: number,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTooltipContent {
  return {
    title: model.axes[axisIndex]?.label ?? "",
    rows: model.series.map((item) => {
      const value = item.values[axisIndex]
      return {
        key: item.key,
        label: item.label,
        paint: item.paint,
        dashed: false,
        value:
          value === null || value === undefined
            ? MISSING_VALUE
            : formatValue(value, item.key),
      }
    }),
  }
}

/** The data as a table: a row per axis, a column per series. */
export function getRadarTable(
  model: RadarChartModel,
  formatValue: (value: number, key: string) => string = formatDefault
): ChartTableData {
  return {
    columns: model.series.map((item) => item.label),
    rows: model.axes.map((axis, axisIndex) => ({
      header: axis.label,
      cells: model.series.map((item) => {
        const value = item.values[axisIndex]
        return value === null ? MISSING_VALUE : formatValue(value, item.key)
      }),
    })),
  }
}
