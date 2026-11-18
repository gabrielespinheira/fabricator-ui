// Heat calendars: a value per day as a grid of weeks (columns) by weekdays
// (rows), each day in one of five levels. Level 0 is a day with no data or
// nothing in it; levels 1 to 4 split the other days at their quartiles and
// paint one hue in opacity steps over the empty cell, so the steps read the
// same on every surface and on React Native, without colour mixing.
//
// Days are UTC calendar days: "2026-11-03" is the 3rd for every reader, and
// a page rendered on a server reads the same in the browser.

import { tz } from "@date-fns/tz"
import {
  addDays,
  differenceInCalendarDays,
  isValid,
  parseISO,
  startOfDay,
  startOfWeek,
} from "date-fns"

import { CHART_LABEL_GAP } from "./chart-cartesian-model"
import {
  estimateTextWidth,
  formatChartNumber,
  getChartPaint,
  interpolateNumber,
  MISSING_VALUE,
  readChartNumber,
  type ChartColor,
  type ChartDatum,
  type ChartPaint,
  type ChartPoint,
  type ChartSize,
  type ChartTableData,
  type ChartTooltipContent,
} from "./chart-model"

export type HeatLevel = 0 | 1 | 2 | 3 | 4

export type HeatCalendarDate = Date | string

export type HeatCalendarRange = {
  start: HeatCalendarDate
  end: HeatCalendarDate
}

export type HeatCell = {
  /** The day as `yyyy-MM-dd`, stable across data changes. */
  id: string
  /** The day's place in the range, in reading order. */
  index: number
  /** Its column: weeks since the first. */
  week: number
  /** Its row: days since the start of its week. */
  day: number
  x: number
  y: number
  size: number
  value: number | null
  /** The first datum on the day, or null for a day with none. */
  datumIndex: number | null
  level: HeatLevel
  /** How strongly the hue covers the empty cell: 0 at level 0. */
  opacity: number
  /** 1 in place; less while a day fades in or out of the range. */
  presence: number
  /** Set while a day that left the range fades out. */
  isLeaving?: boolean
}

export type HeatCalendarModel = {
  cells: HeatCell[]
  /** The hue every level is painted in. */
  paint: ChartPaint
  /** The five levels, for the key under the grid. */
  levels: { level: HeatLevel; opacity: number }[]
  /** The most levels 1, 2 and 3 hold; above the last is level 4. */
  thresholds: number[]
  columns: number
  cellSize: number
  gap: number
  radius: number
  /** The weekday labels' column, before the grid. */
  gutter: number
  /** Where the first row starts, under the month labels. */
  top: number
  /** The grid's width and height, with room for a lifted cell. */
  width: number
  height: number
  /** The grid is wider than its room and scrolls. */
  overflows: boolean
  monthLabels: { label: string; x: number }[]
  weekdayLabels: { label: string; y: number }[]
  rangeLabel: string
  /** Tooltips name the year when the range is longer than one. */
  showsYear: boolean
  weekStartsOn: 0 | 1
}

/** The hue's opacity per level: the lowest clears 2:1 on the surface. */
export const HEAT_LEVEL_OPACITY = [0, 0.45, 0.62, 0.8, 1] as const

const HEAT_LEVELS = [0, 1, 2, 3, 4] as const satisfies readonly HeatLevel[]

/** Every level with its opacity, lowest first, for the key. */
function getLevelSteps() {
  return HEAT_LEVELS.map((level) => ({
    level,
    opacity: HEAT_LEVEL_OPACITY[level],
  }))
}

export const HEAT_CELL_GAP = 3
export const HEAT_CELL_MIN = 8
export const HEAT_CELL_MAX = 16
/** Room around the grid for a lifted cell, inside a scrolling frame. */
const INSET = 4

const UTC = tz("UTC")

// Hermes has Intl.DateTimeFormat, so labels read the same on both platforms.
function getDateFormat(options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" })
}

const MONTH = getDateFormat({ month: "short" })
const WEEKDAY = getDateFormat({ weekday: "short" })
const DAY = getDateFormat({ month: "short", day: "numeric" })
const DAY_YEAR = getDateFormat({
  month: "short",
  day: "numeric",
  year: "numeric",
})
const WEEKDAY_DAY = getDateFormat({
  weekday: "short",
  month: "short",
  day: "numeric",
})
const WEEKDAY_DAY_YEAR = getDateFormat({
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
})

/**
 * A UTC calendar day from a Date, an ISO string or a timestamp. A string
 * with only a date is that day; an instant is the day it falls on in UTC.
 */
export function readHeatCalendarDate(value: unknown): Date | null {
  const date =
    value instanceof Date
      ? value
      : typeof value === "string"
        ? parseISO(value, { in: UTC })
        : typeof value === "number"
          ? new Date(value)
          : null
  return date && isValid(date) ? startOfDay(date, { in: UTC }) : null
}

/** A day as `yyyy-MM-dd`. */
export function getDayKey(date: Date) {
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  const day = String(date.getUTCDate()).padStart(2, "0")
  return `${date.getUTCFullYear()}-${month}-${day}`
}

function getQuantile(sorted: readonly number[], share: number) {
  const position = (sorted.length - 1) * share
  const lower = Math.floor(position)
  const upper = Math.min(sorted.length - 1, lower + 1)
  return interpolateNumber(sorted[lower], sorted[upper], position - lower)
}

/**
 * The quartiles of the days with something in them, as the most levels 1, 2
 * and 3 hold. Zeros and gaps stay level 0, so they don't drag the levels down.
 */
export function getHeatCalendarThresholds(
  values: readonly (number | null)[]
): number[] {
  const sorted = values
    .filter((value): value is number => value !== null && value > 0)
    .sort((a, b) => a - b)
  if (sorted.length === 0) return [0, 0, 0]
  return [0.25, 0.5, 0.75].map((share) => getQuantile(sorted, share))
}

/** A value's level: 0 for nothing, else one more for each threshold passed. */
export function getHeatLevel(
  value: number | null,
  thresholds: readonly number[]
): HeatLevel {
  if (value === null || value <= 0) return 0
  const passed = thresholds
    .slice(0, 3)
    .filter((threshold) => value > threshold).length
  return HEAT_LEVELS[1 + passed]
}

/**
 * Where each label of the month goes: the first column whose week starts in
 * it, kept only if it ends before the next label.
 */
function getMonthLabels({
  firstWeek,
  start,
  columns,
  step,
  width,
  fontSize,
}: {
  firstWeek: Date
  start: Date
  columns: number
  step: number
  width: number
  fontSize: number
}) {
  const candidates: { label: string; x: number }[] = []
  for (let week = 0; week < columns; week++) {
    const weekStart = addDays(firstWeek, week * 7, { in: UTC })
    const isFirst = week === 0
    const startsMonth = isFirst
      ? start.getUTCDate() <= 7
      : weekStart.getUTCMonth() !== addDays(weekStart, -7).getUTCMonth()
    if (!startsMonth) continue
    candidates.push({
      label: MONTH.format(isFirst ? start : weekStart),
      x: INSET + week * step,
    })
  }
  const kept: { label: string; x: number }[] = []
  let limit = width
  for (let index = candidates.length - 1; index >= 0; index--) {
    const candidate = candidates[index]
    const end = candidate.x + estimateTextWidth(candidate.label, fontSize)
    if (end > limit) continue
    kept.unshift(candidate)
    limit = candidate.x - 4
  }
  return kept
}

// 2024-01-01 was a Monday: the day `weekday` (0 Sunday … 6 Saturday) after it.
function getWeekdayName(weekday: number) {
  return WEEKDAY.format(
    new Date(Date.UTC(2024, 0, weekday === 0 ? 7 : weekday))
  )
}

const LABELLED_WEEKDAYS = new Set([1, 3, 5])

function getEmptyModel(
  paint: ChartPaint,
  weekStartsOn: 0 | 1
): HeatCalendarModel {
  return {
    cells: [],
    paint,
    levels: getLevelSteps(),
    thresholds: [0, 0, 0],
    columns: 0,
    cellSize: HEAT_CELL_MIN,
    gap: HEAT_CELL_GAP,
    radius: 2,
    gutter: 0,
    top: 0,
    width: 0,
    height: 0,
    overflows: false,
    monthLabels: [],
    weekdayLabels: [],
    rangeLabel: "",
    showsYear: false,
    weekStartsOn,
  }
}

export function getHeatCalendarModel<TDatum extends ChartDatum>({
  data,
  dateKey = "date",
  valueKey = "value",
  range,
  weekStartsOn = 1,
  thresholds: fixedThresholds,
  color,
  size,
  fontSize,
  minCell = HEAT_CELL_MIN,
  maxCell = HEAT_CELL_MAX,
}: {
  data: readonly TDatum[]
  dateKey?: string
  valueKey?: string
  range?: HeatCalendarRange
  weekStartsOn?: 0 | 1
  thresholds?: readonly number[]
  color?: ChartColor
  size: ChartSize
  fontSize: number
  minCell?: number
  maxCell?: number
}): HeatCalendarModel {
  const paint = getChartPaint(color, 0)
  const totals = new Map<string, number>()
  const firstDatum = new Map<string, number>()
  let latest: Date | null = null
  data.forEach((datum, position) => {
    const date = readHeatCalendarDate(datum[dateKey])
    if (!date) return
    if (!latest || date > latest) latest = date
    const key = getDayKey(date)
    if (!firstDatum.has(key)) firstDatum.set(key, position)
    const value = readChartNumber(datum, valueKey)
    if (value !== null) totals.set(key, (totals.get(key) ?? 0) + value)
  })

  const end = range ? readHeatCalendarDate(range.end) : latest
  const start = range
    ? readHeatCalendarDate(range.start)
    : end && addDays(end, -(52 * 7 - 1), { in: UTC })
  if (!start || !end || end < start) return getEmptyModel(paint, weekStartsOn)

  const firstWeek = startOfWeek(start, { weekStartsOn, in: UTC })
  const dayCount = differenceInCalendarDays(end, start, { in: UTC }) + 1
  const leadingDays = differenceInCalendarDays(start, firstWeek, { in: UTC })
  const columns = Math.floor((leadingDays + dayCount - 1) / 7) + 1

  const weekdayRows = Array.from(
    { length: 7 },
    (_, row) => (weekStartsOn + row) % 7
  )
  const weekdayNames = weekdayRows.map((weekday) =>
    LABELLED_WEEKDAYS.has(weekday) ? getWeekdayName(weekday) : null
  )
  // Wide letters (M, W) outrun the average advance the estimate uses, more
  // so at a phone's larger text: slack keeps the names inside their column.
  const labelSlack = Math.max(4, Math.ceil(fontSize * 0.5))
  const gutter =
    Math.ceil(
      Math.max(
        0,
        ...weekdayNames.map((name) =>
          name ? estimateTextWidth(name, fontSize) : 0
        )
      )
    ) +
    labelSlack +
    CHART_LABEL_GAP
  const gap = HEAT_CELL_GAP
  const room = size.width - gutter - INSET * 2
  const cellSize = Math.max(
    minCell,
    Math.min(maxCell, Math.floor((room - gap * (columns - 1)) / columns))
  )
  const step = cellSize + gap
  const top = Math.ceil(fontSize * 1.25) + 4
  const gridWidth = columns * step - gap
  const width = gridWidth + INSET * 2
  const height = top + 7 * step - gap + INSET

  const days = Array.from({ length: dayCount }, (_, index) =>
    addDays(start, index, { in: UTC })
  )
  const values = days.map((date) => totals.get(getDayKey(date)) ?? null)
  const thresholds = fixedThresholds
    ? [...fixedThresholds].sort((a, b) => a - b).slice(0, 3)
    : getHeatCalendarThresholds(values)

  const cells = days.map((date, index): HeatCell => {
    const offset = leadingDays + index
    const week = Math.floor(offset / 7)
    const day = offset % 7
    const value = values[index]
    const level = getHeatLevel(value, thresholds)
    const id = getDayKey(date)
    return {
      id,
      index,
      week,
      day,
      x: INSET + week * step,
      y: top + day * step,
      size: cellSize,
      value,
      datumIndex: firstDatum.get(id) ?? null,
      level,
      opacity: HEAT_LEVEL_OPACITY[level],
      presence: 1,
    }
  })

  const rangeFormat =
    start.getUTCFullYear() === end.getUTCFullYear() ? DAY : DAY_YEAR

  return {
    cells,
    paint,
    levels: getLevelSteps(),
    thresholds,
    columns,
    cellSize,
    gap,
    radius: cellSize >= 14 ? 3 : 2,
    gutter,
    top,
    width,
    height,
    overflows: gutter + width > size.width,
    monthLabels: getMonthLabels({
      firstWeek,
      start,
      columns,
      step,
      width: INSET + gridWidth,
      fontSize,
    }),
    weekdayLabels: weekdayNames.flatMap((label, row) =>
      label ? [{ label, y: top + row * step + cellSize / 2 }] : []
    ),
    rangeLabel: `${rangeFormat.format(start)} – ${rangeFormat.format(end)}`,
    showsYear: dayCount > 366,
    weekStartsOn,
  }
}

function readCellDate(cell: HeatCell) {
  return parseISO(cell.id, { in: UTC })
}

function formatDefault(value: number) {
  return formatChartNumber(value)
}

/** "12 on Mon, Nov 3": the value first, then its day. */
export function getHeatCalendarTooltip(
  model: HeatCalendarModel,
  index: number,
  formatValue: (value: number, key: string) => string = formatDefault,
  valueKey = "value"
): ChartTooltipContent {
  const cell = model.cells[index]
  if (!cell) return { title: "", rows: [] }
  const value =
    cell.value === null ? "No data" : formatValue(cell.value, valueKey)
  const day = (model.showsYear ? WEEKDAY_DAY_YEAR : WEEKDAY_DAY).format(
    readCellDate(cell)
  )
  return { title: `${value} on ${day}`, rows: [] }
}

/** Every day in the range, with its year, and its value. */
export function getHeatCalendarTable(
  model: HeatCalendarModel,
  formatValue: (value: number, key: string) => string = formatDefault,
  valueKey = "value"
): ChartTableData {
  return {
    columns: ["Value"],
    rows: model.cells.map((cell) => ({
      header: WEEKDAY_DAY_YEAR.format(readCellDate(cell)),
      cells: [
        cell.value === null ? MISSING_VALUE : formatValue(cell.value, valueKey),
      ],
    })),
  }
}

/**
 * Where a key moves the inspected day: Up and Down a day, Left and Right a
 * week, Home and End the first and last day. A week past either end stays
 * put, as a grid does. From nothing, Down and Right land on the first day,
 * Up and Left on the last. Null for keys that don't move it.
 */
export function getHeatCalendarStep(
  current: number,
  key: string,
  count: number
) {
  if (count === 0) return null
  const last = count - 1
  const isStart = current < 0
  switch (key) {
    case "ArrowDown":
      return isStart ? 0 : Math.min(last, current + 1)
    case "ArrowUp":
      return isStart ? last : Math.max(0, current - 1)
    case "ArrowRight":
      return isStart ? 0 : current + 7 <= last ? current + 7 : current
    case "ArrowLeft":
      return isStart ? last : current - 7 >= 0 ? current - 7 : current
    case "Home":
      return 0
    case "End":
      return last
    default:
      return null
  }
}

/**
 * The day under a point in the grid's coordinates. Outside the cells, or on
 * a weekday before the range starts or after it ends, the nearest day in
 * the range.
 */
export function getHeatCalendarIndexAt(
  model: HeatCalendarModel,
  point: ChartPoint
) {
  const first = model.cells[0]
  if (!first) return -1
  const step = model.cellSize + model.gap
  const clamp = (value: number, max: number) =>
    Math.max(0, Math.min(max, value))
  const week = clamp(
    Math.floor((point.x - INSET + model.gap / 2) / step),
    model.columns - 1
  )
  const day = clamp(Math.floor((point.y - model.top + model.gap / 2) / step), 6)
  const offset = week * 7 + day - (first.week * 7 + first.day)
  return clamp(offset, model.cells.length - 1)
}

/**
 * The cells between two models, keyed by day. A day in both moves and takes
 * its new level's opacity; a day entering the range fades in, one leaving
 * fades out, marked `isLeaving`. Null when the two share no day.
 */
export function interpolateHeatCells(
  from: readonly HeatCell[],
  to: readonly HeatCell[],
  progress: number
): HeatCell[] | null {
  const previous = new Map(from.map((cell) => [cell.id, cell]))
  if (!to.some((cell) => previous.has(cell.id))) return null
  const next = new Set(to.map((cell) => cell.id))
  const moving = to.map((cell) => {
    const start = previous.get(cell.id)
    if (!start) {
      return {
        ...cell,
        presence: interpolateNumber(0, cell.presence, progress),
      }
    }
    return {
      ...cell,
      x: interpolateNumber(start.x, cell.x, progress),
      y: interpolateNumber(start.y, cell.y, progress),
      size: interpolateNumber(start.size, cell.size, progress),
      opacity: interpolateNumber(start.opacity, cell.opacity, progress),
      presence: interpolateNumber(start.presence, cell.presence, progress),
    }
  })
  const leaving = from
    .filter((cell) => !next.has(cell.id))
    .map((cell) => ({
      ...cell,
      presence: interpolateNumber(cell.presence, 0, progress),
      isLeaving: true,
    }))
  return [...moving, ...leaving]
}
