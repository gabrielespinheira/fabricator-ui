// Status bars: uptime as one tall pill per day (or period), coloured by its
// status. Pills fill the width with a 2 or 3px gap and narrow as days are
// added, down to a minimum; past it only the latest days that fit are shown.
// Statuses use the status roles, never a series hue, and are always named in
// the legend and the tooltip, so colour never carries a status alone.
//
// Dates are UTC calendar days, so a server and a browser label them alike.

import { tz } from "@date-fns/tz"
import { isValid, parseISO, startOfDay } from "date-fns"

import {
  formatChartPercent,
  getChartPaint,
  interpolateNumber,
  readChartText,
  type ChartColor,
  type ChartDatum,
  type ChartPaint,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

export type StatusConfig = Record<string, { label: string; color?: ChartColor }>

export type StatusBarStatus = {
  key: string
  label: string
  paint: ChartPaint
  /** How strongly the paint covers the surface: "No data" is faint. */
  opacity: number
}

export type StatusPill = {
  /** The day as `yyyy-MM-dd`, or the period's label, stable across changes. */
  id: string
  /** The datum's place in the data. */
  index: number
  x: number
  y: number
  width: number
  height: number
  radius: number
  status: string
  paint: ChartPaint
  opacity: number
  /** While a pill changes status: the old colour, fading out over the new. */
  previous?: { paint: ChartPaint; opacity: number }
  /** 1 in place; less while a day fades in or out. */
  presence: number
  /** Set while a day that left fades out. */
  isLeaving?: boolean
}

export type StatusBarModel = {
  /** The pills shown, oldest first. */
  pills: StatusPill[]
  /** The index of the first datum shown. */
  first: number
  /** Each pill's centre, for snapping to the nearest. */
  centers: number[]
  /** Every datum's title, status and note, shown or not. */
  days: { title: string; status: StatusBarStatus; note: string | null }[]
  /** The statuses among the pills shown, in the config's order. */
  statuses: StatusBarStatus[]
  startLabel: string
  endLabel: string
  /** Operational days over the days with data, or null with none. */
  uptime: number | null
  uptimeLabel: string
  hasNotes: boolean
}

/** The key a day with no status takes; rename it through `statuses`. */
export const NO_DATA_STATUS = "none"

export const DEFAULT_STATUSES: StatusConfig = {
  operational: { label: "Operational", color: "success" },
  degraded: { label: "Degraded", color: "warning" },
  outage: { label: "Outage", color: "destructive" },
  maintenance: { label: "Maintenance", color: "info" },
}

const OPERATIONAL = "operational"
const NO_DATA_PAINT: ChartPaint = { token: "muted-foreground" }
const NO_DATA_OPACITY = 0.3
const NO_DATA: StatusBarStatus = {
  key: NO_DATA_STATUS,
  label: "No data",
  paint: NO_DATA_PAINT,
  opacity: NO_DATA_OPACITY,
}

export const STATUS_PILL_MIN = 4
const WIDE_GAP = 3
const NARROW_GAP = 2
/** Pills narrower than this take the narrow gap. */
const WIDE_GAP_FROM = 6
const PILL_RADIUS = 4

const UTC = tz("UTC")

function getDateFormat(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" })
}

const SHORT_DAY = getDateFormat({ month: "short", day: "numeric" })
const LONG_DAY = getDateFormat({
  weekday: "short",
  month: "short",
  day: "numeric",
})

const ISO_DATE = /^\d{4}-\d{2}-\d{2}/

/** A datum's index as a UTC day, when it is a date. */
function readDay(value: unknown) {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string" && ISO_DATE.test(value)
        ? parseISO(value, { in: UTC })
        : null
  return date && isValid(date) ? startOfDay(date, { in: UTC }) : null
}

function getDayKey(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${date.getUTCFullYear()}-${month}-${day}`
}

/**
 * Every status a bar can show, in order: the defaults with their overrides,
 * statuses added by the config, ones only the data names, then "No data".
 * Added statuses without a colour take palette slots in order.
 */
function getStatuses(
  config: StatusConfig | undefined,
  dataKeys: readonly string[]
): Map<string, StatusBarStatus> {
  const merged: StatusConfig = { ...DEFAULT_STATUSES }
  for (const [key, entry] of Object.entries(config ?? {})) {
    merged[key] = { ...merged[key], ...entry }
  }
  for (const key of dataKeys) {
    if (!(key in merged) && key !== NO_DATA_STATUS) merged[key] = { label: key }
  }
  const statuses = new Map<string, StatusBarStatus>()
  let added = 0
  for (const [key, entry] of Object.entries(merged)) {
    if (key === NO_DATA_STATUS) continue
    const paint =
      entry.color === undefined
        ? getChartPaint(undefined, added++)
        : getChartPaint(entry.color, 0)
    statuses.set(key, { key, label: entry.label, paint, opacity: 1 })
  }
  const noData = merged[NO_DATA_STATUS]
  statuses.set(
    NO_DATA_STATUS,
    noData
      ? {
          ...NO_DATA,
          label: noData.label,
          ...(noData.color
            ? { paint: getChartPaint(noData.color, 0), opacity: 1 }
            : {}),
        }
      : NO_DATA
  )
  return statuses
}

/**
 * How many pills fit and how they are spaced: every day when each can be
 * at least the minimum wide, else as many of the latest as can.
 */
function fitPills(count: number, width: number) {
  const pillWidth = (gap: number, shown: number) =>
    (width - gap * (shown - 1)) / shown
  const gap =
    pillWidth(WIDE_GAP, count) >= WIDE_GAP_FROM ? WIDE_GAP : NARROW_GAP
  if (pillWidth(gap, count) >= STATUS_PILL_MIN) return { gap, shown: count }
  const shown = Math.max(
    1,
    Math.floor((width + NARROW_GAP) / (STATUS_PILL_MIN + NARROW_GAP))
  )
  return { gap: NARROW_GAP, shown: Math.min(count, shown) }
}

export function getStatusBarModel<TDatum extends ChartDatum>({
  data,
  index,
  statusKey = "status",
  noteKey,
  statuses: config,
  size,
  formatIndex,
}: {
  data: readonly TDatum[]
  index: string
  statusKey?: string
  noteKey?: string
  statuses?: StatusConfig
  size: ChartSize
  formatIndex?: (value: string, datum: TDatum) => string
}): StatusBarModel {
  const rawStatuses = data.map((datum) => {
    const text = readChartText(datum, statusKey)
    return text === "" ? NO_DATA_STATUS : text
  })
  const statusMap = getStatuses(config, rawStatuses)

  const seen = new Set<string>()
  const days = data.map((datum, position) => {
    const value = datum[index]
    const date = readDay(value)
    const text = date ? getDayKey(date) : readChartText(datum, index)
    const id = seen.has(text) ? `${text}#${position}` : text
    seen.add(id)
    const note = noteKey ? readChartText(datum, noteKey) : ""
    const status = statusMap.get(rawStatuses[position]) ?? NO_DATA
    return {
      id,
      title: formatIndex
        ? formatIndex(text, datum)
        : date
          ? LONG_DAY.format(date)
          : text,
      label: formatIndex
        ? formatIndex(text, datum)
        : date
          ? SHORT_DAY.format(date)
          : text,
      status,
      note: note === "" ? null : note,
    }
  })

  const { gap, shown } = fitPills(data.length, size.width)
  const first = data.length - shown
  const step = (size.width + gap) / Math.max(1, shown)
  const pills = days.slice(first).map((day, position): StatusPill => {
    const x = Math.round(position * step)
    const width = Math.max(1, Math.round((position + 1) * step) - gap - x)
    return {
      id: day.id,
      index: first + position,
      x,
      y: 0,
      width,
      height: size.height,
      radius: Math.min(PILL_RADIUS, width / 2),
      status: day.status.key,
      paint: day.status.paint,
      opacity: day.status.opacity,
      presence: 1,
    }
  })

  const shownDays = days.slice(first)
  const present = new Set(shownDays.map((day) => day.status.key))
  const withData = shownDays.filter(
    (day) => day.status.key !== NO_DATA_STATUS
  ).length
  const operational = shownDays.filter(
    (day) => day.status.key === OPERATIONAL
  ).length
  const uptime = withData === 0 ? null : operational / withData

  return {
    pills,
    first,
    centers: pills.map((pill) => pill.x + pill.width / 2),
    days: days.map(({ title, status, note }) => ({ title, status, note })),
    statuses: [...statusMap.values()].filter((status) =>
      present.has(status.key)
    ),
    startLabel: shownDays[0]?.label ?? "",
    endLabel: shownDays.at(-1)?.label ?? "",
    uptime,
    uptimeLabel:
      uptime === null ? "No data" : `${formatChartPercent(uptime)} uptime`,
    hasNotes: noteKey !== undefined,
  }
}

/** The pill's day, its status by name, and its note. */
export function getStatusBarTooltip(
  model: StatusBarModel,
  position: number
): ChartTooltipContent {
  const day = model.days[model.first + position]
  if (!day) return { title: "", rows: [] }
  return {
    title: day.title,
    rows: [
      {
        // One row whatever the status, keyed so it stays mounted as the
        // pointer moves: on a page with ancestor `:has()` rules every DOM
        // insertion restyles the whole page.
        key: "status",
        label: "Status",
        paint: day.status.paint,
        dashed: false,
        value: day.status.label,
      },
    ],
    ...(day.note === null ? {} : { note: day.note }),
  }
}

/** Every day, shown or not, with its status and its note. */
export function getStatusBarTable(model: StatusBarModel): ChartTableData {
  return {
    columns: model.hasNotes ? ["Status", "Note"] : ["Status"],
    rows: model.days.map((day) => ({
      header: day.title,
      cells: model.hasNotes
        ? [day.status.label, day.note ?? ""]
        : [day.status.label],
    })),
  }
}

/**
 * The pills between two models, keyed by day. A pill that stays moves to
 * its new place, and crossfades from its old colour when its status
 * changed; a new day fades in, a leaving one fades out, marked
 * `isLeaving`. Null when the two share no day.
 */
export function interpolateStatusPills(
  from: readonly StatusPill[],
  to: readonly StatusPill[],
  progress: number
): StatusPill[] | null {
  const previous = new Map(from.map((pill) => [pill.id, pill]))
  if (!to.some((pill) => previous.has(pill.id))) return null
  const next = new Set(to.map((pill) => pill.id))
  const moving = to.map((pill): StatusPill => {
    const start = previous.get(pill.id)
    if (!start) {
      return {
        ...pill,
        presence: interpolateNumber(0, pill.presence, progress),
      }
    }
    const moved = {
      ...pill,
      x: interpolateNumber(start.x, pill.x, progress),
      width: interpolateNumber(start.width, pill.width, progress),
      radius: interpolateNumber(start.radius, pill.radius, progress),
      presence: interpolateNumber(start.presence, pill.presence, progress),
    }
    if (start.status === pill.status) return moved
    return {
      ...moved,
      previous: {
        paint: start.paint,
        opacity: start.opacity * (1 - progress),
      },
    }
  })
  const leaving = from
    .filter((pill) => !next.has(pill.id))
    .map((pill) => ({
      ...pill,
      presence: interpolateNumber(pill.presence, 0, progress),
      isLeaving: true,
    }))
  return [...moving, ...leaving]
}
