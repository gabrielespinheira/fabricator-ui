// The Event Calendar's rules as pure functions: what an event is, which days a
// view shows, where navigation lands, how a keyboard nudge moves an event, how
// a change applies and undoes, and what colour an event draws in. No React,
// no DOM and no FullCalendar, so the website and React Native share it.
//
// Dates cross the edges as ISO 8601 strings. Inside, they are instants
// (`Date`), and wall-time maths runs in the calendar's time zone through
// `@date-fns/tz`. Nothing here reads the clock.

import { TZDate } from "@date-fns/tz"
import {
  addDays,
  addMinutes,
  addMonths,
  differenceInMinutes,
  endOfMonth,
  endOfWeek,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns"

import {
  getPaletteLiteral,
  PALETTE_COLORS,
  PALETTE_ROLES,
  type PaletteHue,
  type PaletteRole,
} from "./palette-model"

// --- Types -------------------------------------------------------------------

const EVENT_CALENDAR_VIEWS = ["day", "days", "week", "month", "agenda"] as const

type EventCalendarView = (typeof EVENT_CALENDAR_VIEWS)[number]

type EventCalendarWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const

/** Any whole number as a weekday, wrapping round the week (7 is Sunday). */
function toEventCalendarWeekday(value: number): EventCalendarWeekday {
  return WEEKDAYS[((Math.trunc(value) % 7) + 7) % 7]
}

const EVENT_CALENDAR_ROLES = PALETTE_ROLES

type EventCalendarRole = PaletteRole

/** A hue and chroma drawn through the colour role recipe. */
type EventCalendarHue = PaletteHue

/** The shared palette (palette-model.ts) under the calendar's own name. */
const EVENT_CALENDAR_COLORS = PALETTE_COLORS

type EventCalendarColorName = keyof typeof EVENT_CALENDAR_COLORS

type EventCalendarColor =
  | EventCalendarColorName
  | EventCalendarRole
  | EventCalendarHue

type CalendarEventStatus = "confirmed" | "tentative" | "cancelled"

type CalendarEvent<TData = unknown> = {
  id: string
  title: string
  /** ISO 8601. A date only ("2026-11-18") for an all-day event. */
  start: string
  /** Exclusive, as in iCalendar: an all-day event on the 18th ends the 19th. */
  end: string
  allDay?: boolean
  /** The calendar it belongs to; its colour and editability come from there. */
  calendarId?: string
  color?: EventCalendarColor
  /** RRULE, RDATE and EXDATE lines; `start` is the first occurrence. */
  recurrence?: string
  /** On an occurrence, or an occurrence edited on its own: its series. */
  recurringEventId?: string
  /** On an occurrence: where the series put it, before any edit. */
  originalStart?: string
  status?: CalendarEventStatus
  editable?: boolean
  location?: string
  description?: string
  /** The app's own fields. */
  data?: TData
}

type CalendarSource = {
  id: string
  name: string
  color: EventCalendarColor
  visible?: boolean
  editable?: boolean
}

type EventCalendarRange = { start: Date; end: Date }

type EventTimes = { start: Date; end: Date; allDay: boolean }

type EventCalendarHourCycle = "h12" | "h23"

type EventCalendarSettings = {
  showWeekends: boolean
  showWeekNumbers: boolean
  weekStartsOn: EventCalendarWeekday
  hourCycle: EventCalendarHourCycle
  /** The time grid's rows and the drag snap, in minutes. */
  slotMinutes: 15 | 30 | 60
  /** How long a clicked-in event lasts. */
  eventMinutes: number
}

const DEFAULT_EVENT_CALENDAR_SETTINGS: EventCalendarSettings = {
  showWeekends: true,
  showWeekNumbers: false,
  weekStartsOn: 0,
  hourCycle: "h12",
  slotMinutes: 15,
  eventMinutes: 60,
}

type RecurrenceScope = "this" | "following" | "all"

/** Working hours, shaded outside in the time grids. */
type EventCalendarBusinessHours = {
  days: EventCalendarWeekday[]
  /** "09:00" */
  start: string
  /** "17:00" */
  end: string
}

const DEFAULT_BUSINESS_HOURS: EventCalendarBusinessHours = {
  days: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "17:00",
}

/**
 * The working hours to shade: none unless asked for, Monday to Friday 9 to
 * 5 for `true`, or the hours given. The same object comes back for `true`,
 * so the grid isn't redrawn for nothing.
 */
function resolveBusinessHours(
  value: EventCalendarBusinessHours | boolean | undefined
): EventCalendarBusinessHours | false {
  if (value === true) return DEFAULT_BUSINESS_HOURS
  return value ?? false
}

type EventCalendarChangeReason =
  | "create"
  | "duplicate"
  | "move"
  | "resize"
  | "edit"
  | "delete"
  | "undo"
  | "redo"

/**
 * One change, as what the person did (`event`, `previous`, `reason`) and as
 * the stored events to write (`created`, `updated`, `deleted`). `replaced`
 * holds the stored events as they were before `updated`, so a change can be
 * undone.
 */
type EventCalendarChange<TData = unknown> = {
  reason: EventCalendarChangeReason
  event: CalendarEvent<TData>
  previous?: CalendarEvent<TData>
  scope?: RecurrenceScope
  created: CalendarEvent<TData>[]
  updated: CalendarEvent<TData>[]
  deleted: CalendarEvent<TData>[]
  replaced: CalendarEvent<TData>[]
}

class EventCalendarDateError extends Error {
  constructor(value: string) {
    super(`Not an ISO 8601 date: "${value}"`)
    this.name = "EventCalendarDateError"
  }
}

// --- Dates -------------------------------------------------------------------

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/
const WALL_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/
const WITH_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/

type EventDateStyle = "date" | "local" | "offset" | "utc"

/** A date in the zone, so date-fns works on its wall time. */
function toZoned(date: Date | number, timeZone: string | undefined): Date {
  return timeZone ? new TZDate(+date, timeZone) : new Date(+date)
}

/** A plain instant: what the model hands out, whatever it computed with. */
const toInstant = (date: Date) => new Date(+date)

const DAY = 24 * 60 * 60 * 1000
const MAX_CACHED_DAYS = 20_000

// Resolving a wall time in a zone goes through Intl and costs microseconds,
// which adds up to seconds over a hundred thousand events. On a day without a
// clock change every wall time is a fixed distance from midnight, so each day
// is resolved once; days with a change keep going through TZDate.
const zoneMidnights = new Map<string, number | null>()

function getSteadyMidnight(
  year: number,
  month: number,
  day: number,
  timeZone: string
): number | null {
  const key = `${timeZone} ${year}-${month}-${day}`
  const cached = zoneMidnights.get(key)
  if (cached !== undefined) return cached
  if (zoneMidnights.size >= MAX_CACHED_DAYS) zoneMidnights.clear()
  const midnight = +new TZDate(year, month - 1, day, 0, 0, 0, timeZone)
  const next = +new TZDate(year, month - 1, day + 1, 0, 0, 0, timeZone)
  const steady = next - midnight === DAY ? midnight : null
  zoneMidnights.set(key, steady)
  return steady
}

function wallTime(parts: number[], timeZone: string | undefined): Date {
  const [year, month, day, hours = 0, minutes = 0, seconds = 0] = parts
  if (!timeZone) return new Date(year, month - 1, day, hours, minutes, seconds)
  const midnight =
    hours < 24 ? getSteadyMidnight(year, month, day, timeZone) : null
  if (midnight !== null) {
    return new Date(midnight + ((hours * 60 + minutes) * 60 + seconds) * 1000)
  }
  return toInstant(
    new TZDate(year, month - 1, day, hours, minutes, seconds, timeZone)
  )
}

/**
 * An ISO 8601 string as an instant. A date, or a time without an offset, is
 * wall time in the calendar's zone; an offset or `Z` is absolute.
 */
function parseEventDate(value: string, timeZone?: string): Date {
  const dateOnly = DATE_ONLY.exec(value)
  if (dateOnly) return wallTime(dateOnly.slice(1).map(Number), timeZone)
  const wall = WALL_TIME.exec(value)
  if (wall) {
    return wallTime(
      wall.slice(1).map((part) => Number(part ?? 0)),
      timeZone
    )
  }
  const instant = new Date(value)
  if (!WITH_ZONE.test(value) || Number.isNaN(+instant)) {
    throw new EventCalendarDateError(value)
  }
  return instant
}

function getEventDateStyle(value: string): EventDateStyle {
  if (DATE_ONLY.test(value)) return "date"
  if (value.endsWith("Z")) return "utc"
  if (WITH_ZONE.test(value)) return "offset"
  return "local"
}

/** An instant written back in one of the four styles events use. */
function formatEventDate(
  date: Date,
  style: EventDateStyle,
  timeZone?: string
): string {
  if (style === "utc") return date.toISOString().replace(/\.\d{3}Z$/, "Z")
  const zoned = toZoned(date, timeZone)
  if (style === "date") return format(zoned, "yyyy-MM-dd")
  if (style === "local") return format(zoned, "yyyy-MM-dd'T'HH:mm:ss")
  return format(zoned, "yyyy-MM-dd'T'HH:mm:ssxxx")
}

/** A calendar date and a "HH:mm" time, as a form edits them. */
type WallParts = { year: number; month: number; day: number; time: string }

function getWallParts(date: Date, timeZone?: string): WallParts {
  const zoned = toZoned(date, timeZone)
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth() + 1,
    day: zoned.getDate(),
    time: format(zoned, "HH:mm"),
  }
}

function fromWallParts(parts: WallParts, timeZone?: string): Date {
  const [hours = 0, minutes = 0] = parts.time.split(":").map(Number)
  return wallTime(
    [parts.year, parts.month, parts.day, hours, minutes],
    timeZone
  )
}

function isAllDayEvent(event: Pick<CalendarEvent, "allDay" | "start">) {
  return event.allDay ?? DATE_ONLY.test(event.start)
}

function getEventTimes(event: CalendarEvent, timeZone?: string): EventTimes {
  return {
    start: parseEventDate(event.start, timeZone),
    end: parseEventDate(event.end, timeZone),
    allDay: isAllDayEvent(event),
  }
}

/**
 * The event at new times, written in the style its start already used. A
 * timed event that was all-day takes an offset, which reads the same in any
 * zone.
 */
function setEventTimes<TData>(
  event: CalendarEvent<TData>,
  times: EventTimes,
  timeZone?: string
): CalendarEvent<TData> {
  const style: EventDateStyle = times.allDay
    ? "date"
    : DATE_ONLY.test(event.start)
      ? "offset"
      : getEventDateStyle(event.start)
  const next: CalendarEvent<TData> = {
    ...event,
    start: formatEventDate(times.start, style, timeZone),
    end: formatEventDate(times.end, style, timeZone),
  }
  if (times.allDay) next.allDay = true
  else delete next.allDay
  return next
}

// --- Views -------------------------------------------------------------------

function isEventCalendarView(value: unknown): value is EventCalendarView {
  return (EVENT_CALENDAR_VIEWS as readonly unknown[]).includes(value)
}

const VIEW_LABELS: Record<EventCalendarView, string> = {
  day: "Day",
  days: "Days",
  week: "Week",
  month: "Month",
  agenda: "Agenda",
}

/** "Week", or "4 days" for the N-day view. */
function getViewLabel(view: EventCalendarView, days: number) {
  return view === "days" ? `${days} days` : VIEW_LABELS[view]
}

function isTimeGridView(view: EventCalendarView) {
  return view === "day" || view === "days" || view === "week"
}

type ViewRangeOptions = {
  days: number
  weekStartsOn: EventCalendarWeekday
  timeZone?: string
}

/** The days a view shows, end exclusive. */
function getViewRange(
  view: EventCalendarView,
  date: Date,
  { days, weekStartsOn, timeZone }: ViewRangeOptions
): EventCalendarRange {
  const range = getZonedViewRange(view, startOfDay(toZoned(date, timeZone)), {
    days,
    weekStartsOn,
  })
  return { start: toInstant(range.start), end: toInstant(range.end) }
}

/**
 * The first and last day a view shows, for a date picker to mark: the
 * range's days, except a month, which marks its own days and not the weeks
 * around it that fill the grid.
 */
function getVisibleDays(
  view: EventCalendarView,
  date: Date,
  range: EventCalendarRange,
  timeZone?: string
): { first: Date; last: Date } {
  if (view === "month") {
    const month = startOfMonth(toZoned(date, timeZone))
    return {
      first: toInstant(month),
      last: toInstant(startOfDay(endOfMonth(month))),
    }
  }
  return {
    first: range.start,
    last: toInstant(addDays(toZoned(range.end, timeZone), -1)),
  }
}

// --- Continuity ----------------------------------------------------------------
//
// A continuous time grid scrolls by day: its range starts on any day, and it
// draws columns either side of the ones in view to scroll into. With weekends
// hidden, columns are weekdays only.

/** The day columns a time grid shows. */
function getColumnCount(
  view: EventCalendarView,
  days: number,
  showWeekends: boolean
) {
  if (view === "day") return 1
  if (view === "days") return days
  return showWeekends ? 7 : 5
}

type ContinuityOptions = { showWeekends: boolean; timeZone?: string }

const isWeekend = (day: Date) => day.getDay() === 0 || day.getDay() === 6

/** Zoned days from a start, one per column, skipping hidden weekends. */
function stepColumns(
  from: Date,
  count: number,
  direction: 1 | -1,
  showWeekends: boolean
): Date[] {
  const columns: Date[] = []
  let day = from
  while (columns.length < count) {
    if (showWeekends || !isWeekend(day)) columns.push(day)
    day = addDays(day, direction)
  }
  return columns
}

function firstColumn(
  start: Date,
  { showWeekends, timeZone }: ContinuityOptions
) {
  return stepColumns(
    startOfDay(toZoned(start, timeZone)),
    1,
    1,
    showWeekends
  )[0]
}

/** The range of a continuous grid that starts on a day: its columns' days. */
function getContinuousRange(
  start: Date,
  columns: number,
  options: ContinuityOptions
): EventCalendarRange {
  const days = stepColumns(
    firstColumn(start, options),
    columns,
    1,
    options.showWeekends
  )
  return {
    start: toInstant(days[0]),
    end: toInstant(addDays(days[days.length - 1], 1)),
  }
}

type EventCalendarContinuousWindow = {
  /** Every column drawn, in order: `buffer` before, those in view, `buffer` after. */
  dates: Date[]
  /** The position of the first column in view. */
  first: number
  start: Date
  end: Date
}

/** What a continuous grid draws: its columns and as many again either side. */
function getContinuousWindow(
  start: Date,
  columns: number,
  { buffer, ...options }: ContinuityOptions & { buffer: number }
): EventCalendarContinuousWindow {
  const first = firstColumn(start, options)
  const before = stepColumns(
    addDays(first, -1),
    buffer,
    -1,
    options.showWeekends
  ).reverse()
  const after = stepColumns(first, columns + buffer, 1, options.showWeekends)
  const dates = [...before, ...after].map(toInstant)
  return {
    dates,
    first: before.length,
    start: dates[0],
    end: toInstant(addDays(after[after.length - 1], 1)),
  }
}

/**
 * Columns drawn either side of a continuous grid: half a page, three days at
 * least. Every drawn column renders its events, so a wider buffer costs each
 * redraw of a busy calendar; a long scroll moves the start as it nears the
 * edge and carries on.
 */
function getContinuityBuffer(columns: number) {
  return Math.max(Math.ceil(columns / 2), 3)
}

type EventCalendarDayBand = {
  isInView: boolean
  isStart: boolean
  isEnd: boolean
}

/**
 * Where a mini month's day sits in the band of days in view: inside it, and
 * whether the band starts or ends there (the first and last day, and each
 * week's edges, so a long band reads as a pill per week).
 */
function getDayBand(
  day: Date,
  visible: { first: Date; last: Date },
  weekStartsOn: EventCalendarWeekday,
  timeZone?: string
): EventCalendarDayBand {
  const key = formatEventDate(day, "date", timeZone)
  const first = formatEventDate(visible.first, "date", timeZone)
  const last = formatEventDate(visible.last, "date", timeZone)
  if (key < first || key > last) {
    return { isInView: false, isStart: false, isEnd: false }
  }
  const weekday = toZoned(day, timeZone).getDay()
  return {
    isInView: true,
    isStart: key === first || weekday === weekStartsOn,
    isEnd: key === last || weekday === (weekStartsOn + 6) % 7,
  }
}

function getZonedViewRange(
  view: EventCalendarView,
  day: Date,
  { days, weekStartsOn }: Omit<ViewRangeOptions, "timeZone">
): EventCalendarRange {
  switch (view) {
    case "day":
      return { start: day, end: addDays(day, 1) }
    case "days":
      return { start: day, end: addDays(day, days) }
    case "week": {
      const start = startOfWeek(day, { weekStartsOn })
      return { start, end: addDays(start, 7) }
    }
    case "month": {
      const month = startOfMonth(day)
      return {
        start: startOfWeek(month, { weekStartsOn }),
        end: addDays(endOfWeek(endOfMonth(month), { weekStartsOn }), 1),
      }
    }
    case "agenda":
      return { start: day, end: addMonths(day, 1) }
  }
}

/** The date one period before (`-1`) or after (`1`) in the view. */
function shiftViewDate(
  view: EventCalendarView,
  date: Date,
  step: 1 | -1,
  { days, timeZone }: { days: number; timeZone?: string }
): Date {
  const zoned = toZoned(date, timeZone)
  switch (view) {
    case "day":
      return toInstant(addDays(zoned, step))
    case "days":
      return toInstant(addDays(zoned, step * days))
    case "week":
      return toInstant(addDays(zoned, step * 7))
    case "month":
    case "agenda":
      return toInstant(addMonths(zoned, step))
  }
}

type FormatOptions = { locale?: string; timeZone?: string }

// Building an Intl.DateTimeFormat costs far more than using one, and every
// chip formats its times on each render, so formatters are kept by options.
const MAX_FORMATTERS = 100
const formatters = new Map<string, Intl.DateTimeFormat>()

function formatter(
  { locale, timeZone }: FormatOptions,
  options: Intl.DateTimeFormatOptions
) {
  const key = `${locale} ${timeZone} ${JSON.stringify(options)}`
  const cached = formatters.get(key)
  if (cached) return cached
  if (formatters.size >= MAX_FORMATTERS) formatters.clear()
  const format = new Intl.DateTimeFormat(locale, { ...options, timeZone })
  formatters.set(key, format)
  return format
}

/**
 * Two dates as one range. Hermes (React Native) has no `formatRange`, so
 * there the two ends are written in full and joined.
 */
function formatRange(format: Intl.DateTimeFormat, start: Date, end: Date) {
  if (typeof format.formatRange === "function") {
    return format.formatRange(start, end)
  }
  return `${format.format(start)} – ${format.format(end)}`
}

/**
 * The header's title: the day for Day, otherwise the month, or both months
 * when the range spans two (as Google Calendar does).
 */
function formatViewTitle(
  view: EventCalendarView,
  range: EventCalendarRange,
  options: FormatOptions
): string {
  if (view === "day") {
    return formatter(options, { dateStyle: "long" }).format(range.start)
  }
  const last = addDays(toZoned(range.end, options.timeZone), -1)
  // A month view's grid starts and ends in the neighbouring months; the
  // title names the month in the middle of it.
  if (view === "month" || view === "agenda") {
    const middle = new Date((+range.start + +range.end) / 2)
    return formatter(options, { month: "long", year: "numeric" }).format(
      view === "agenda" ? range.start : middle
    )
  }
  const start = toZoned(range.start, options.timeZone)
  if (
    start.getMonth() === last.getMonth() &&
    start.getFullYear() === last.getFullYear()
  ) {
    return formatter(options, { month: "long", year: "numeric" }).format(
      range.start
    )
  }
  return formatRange(
    formatter(options, { month: "short", year: "numeric" }),
    range.start,
    last
  )
}

// formatRange is the slowest call a chip makes; a view going back and forth
// asks for the same ranges again.
const MAX_TIME_RANGES = 5000
const timeRanges = new Map<string, string>()

/** "10:00 – 10:30 AM", or "All day". */
function formatEventTimeRange(
  times: EventTimes,
  options: FormatOptions & { hourCycle: EventCalendarHourCycle }
): string {
  if (times.allDay) return "All day"
  const key = `${options.locale} ${options.timeZone} ${options.hourCycle} ${+times.start} ${+times.end}`
  const cached = timeRanges.get(key)
  if (cached !== undefined) return cached
  if (timeRanges.size >= MAX_TIME_RANGES) timeRanges.clear()
  const text = formatRange(
    formatter(options, {
      hour: "numeric",
      minute: "2-digit",
      hourCycle: options.hourCycle,
    }),
    times.start,
    times.end
  )
  timeRanges.set(key, text)
  return text
}

/** "10:00 AM" or "10:00". */
function formatEventTime(
  date: Date,
  options: FormatOptions & { hourCycle: EventCalendarHourCycle }
): string {
  return formatter(options, {
    hour: "numeric",
    minute: "2-digit",
    hourCycle: options.hourCycle,
  }).format(date)
}

/** "Wednesday, November 18" for labels and announcements. */
function formatEventDay(date: Date, options: FormatOptions): string {
  return formatter(options, {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date)
}

// --- Keyboard ----------------------------------------------------------------

type EventCalendarNudge = { minutes: number; days: number; resize: boolean }

/**
 * What an arrow does to a grabbed event: in a time grid, up and down move by
 * the slot and left and right by a day; in a day grid, up and down move a
 * week. Shift with up or down resizes from the end.
 */
function getKeyboardNudge(
  key: string,
  { shiftKey = false }: { shiftKey?: boolean },
  view: EventCalendarView,
  slotMinutes: number
): EventCalendarNudge | null {
  const timeGrid = isTimeGridView(view)
  switch (key) {
    case "ArrowUp":
    case "ArrowDown": {
      const sign = key === "ArrowUp" ? -1 : 1
      if (timeGrid) {
        return { minutes: sign * slotMinutes, days: 0, resize: shiftKey }
      }
      return { minutes: 0, days: sign * 7, resize: false }
    }
    case "ArrowLeft":
    case "ArrowRight":
      return {
        minutes: 0,
        days: key === "ArrowLeft" ? -1 : 1,
        resize: false,
      }
    default:
      return null
  }
}

/**
 * An event moved or resized by a nudge. Days keep the wall time across a
 * daylight saving change; a resize never leaves less than one slot.
 */
function nudgeEvent<TData>(
  event: CalendarEvent<TData>,
  nudge: EventCalendarNudge,
  timeZone?: string,
  slotMinutes = 15
): CalendarEvent<TData> {
  const times = getEventTimes(event, timeZone)
  const start = toZoned(times.start, timeZone)
  const end = toZoned(times.end, timeZone)
  if (nudge.resize) {
    const floor = addMinutes(start, times.allDay ? 24 * 60 : slotMinutes)
    const next = addMinutes(addDays(end, nudge.days), nudge.minutes)
    return setEventTimes(
      event,
      { ...times, end: next < floor ? floor : next },
      timeZone
    )
  }
  return setEventTimes(
    event,
    {
      allDay: times.allDay,
      start: addMinutes(addDays(start, nudge.days), nudge.minutes),
      end: addMinutes(addDays(end, nudge.days), nudge.minutes),
    },
    timeZone
  )
}

/** Where the focus cursor goes for an arrow key. */
function moveCursor(
  cursor: Date,
  key: string,
  {
    view,
    slotMinutes,
    timeZone,
  }: { view: EventCalendarView; slotMinutes: number; timeZone?: string }
): Date {
  const nudge = getKeyboardNudge(key, {}, view, slotMinutes)
  if (!nudge) return cursor
  return toInstant(
    addMinutes(addDays(toZoned(cursor, timeZone), nudge.days), nudge.minutes)
  )
}

// --- Shortcuts ---------------------------------------------------------------

type EventCalendarShortcut =
  | { kind: "view"; view: EventCalendarView }
  | {
      kind: "today" | "next" | "previous" | "create" | "help" | "undo" | "redo"
    }

type ShortcutModifiers = {
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

const VIEW_KEYS: Record<string, EventCalendarView> = {
  d: "day",
  4: "days",
  w: "week",
  m: "month",
  a: "agenda",
}

/** The key list the shortcut help shows, in Google Calendar's keys. */
const EVENT_CALENDAR_SHORTCUTS = [
  { keys: ["t"], label: "Today" },
  { keys: ["j"], label: "Next period" },
  { keys: ["k"], label: "Previous period" },
  { keys: ["d"], label: "Day view" },
  { keys: ["4"], label: "Days view" },
  { keys: ["w"], label: "Week view" },
  { keys: ["m"], label: "Month view" },
  { keys: ["a"], label: "Agenda" },
  { keys: ["c"], label: "Create event" },
  { keys: ["e"], label: "Edit the focused event" },
  { keys: ["Delete"], label: "Delete the focused event" },
  { keys: ["Space"], label: "Pick up the focused event; arrows move it" },
  { keys: ["Shift", "↑↓"], label: "Change a picked-up event's length" },
  { keys: ["⌘", "Z"], label: "Undo" },
  { keys: ["⌘", "Shift", "Z"], label: "Redo" },
  { keys: ["?"], label: "Keyboard shortcuts" },
] as const

/** What a key does, as Google Calendar maps them, or `null`. */
function getShortcut(
  key: string,
  {
    metaKey = false,
    ctrlKey = false,
    shiftKey = false,
    altKey = false,
  }: ShortcutModifiers
): EventCalendarShortcut | null {
  const lower = key.toLowerCase()
  if (metaKey || ctrlKey) {
    if (lower !== "z" || altKey) return null
    return { kind: shiftKey ? "redo" : "undo" }
  }
  if (altKey) return null
  if (key === "?") return { kind: "help" }
  if (shiftKey) return null
  const view = VIEW_KEYS[lower]
  if (view) return { kind: "view", view }
  switch (lower) {
    case "t":
      return { kind: "today" }
    case "j":
    case "n":
      return { kind: "next" }
    case "k":
    case "p":
      return { kind: "previous" }
    case "c":
      return { kind: "create" }
    default:
      return null
  }
}

// --- Days --------------------------------------------------------------------

type EventCalendarDayGroup<TData = unknown> = {
  /** "YYYY-MM-DD" in the calendar's zone. */
  key: string
  date: Date
  events: CalendarEvent<TData>[]
}

/**
 * The range's days that have events, each with every event that covers part
 * of it, in the events' order. Days are the zone's, so a daylight saving day
 * is still one day.
 */
type ZoneDay = { key: string; start: number; end: number; date: Date }

/**
 * Finds the zone's day for an instant, resolving a day only when the instant
 * leaves the last one, so a list in start order costs a few days, not a zone
 * lookup per event.
 */
function createDayFinder(timeZone?: string) {
  let last: ZoneDay | undefined
  return (time: number): ZoneDay => {
    if (last && time >= last.start && time < last.end) return last
    const day = startOfDay(toZoned(time, timeZone))
    last = {
      key: format(day, "yyyy-MM-dd"),
      start: +day,
      end: +addDays(day, 1),
      date: toInstant(day),
    }
    return last
  }
}

function groupEventsByDay<TData>(
  events: CalendarEvent<TData>[],
  range: EventCalendarRange,
  timeZone?: string
): EventCalendarDayGroup<TData>[] {
  const days = new Map<string, EventCalendarDayGroup<TData>>()
  const findDay = createDayFinder(timeZone)
  for (const event of events) {
    const times = getEventTimes(event, timeZone)
    const from = Math.max(+times.start, +range.start)
    const to = Math.min(+times.end, +range.end)
    // Outside the range, unless a zero-length event inside it.
    if (
      from >= +range.end ||
      to < from ||
      (to === from && +times.end !== +times.start)
    ) {
      continue
    }
    let day = findDay(from)
    do {
      const group = days.get(day.key) ?? {
        key: day.key,
        date: day.date,
        events: [],
      }
      group.events.push(event)
      days.set(day.key, group)
      day = findDay(day.end)
    } while (day.start < to)
  }
  return [...days.values()].sort((a, b) => +a.date - +b.date)
}

// --- Drafts and changes ------------------------------------------------------

function createEventDraft<TData>({
  id,
  start,
  end,
  allDay,
  calendarId,
  timeZone,
}: {
  id: string
  start: Date
  end: Date
  allDay: boolean
  calendarId?: string
  timeZone?: string
}): CalendarEvent<TData> {
  const style: EventDateStyle = allDay ? "date" : "offset"
  const draft: CalendarEvent<TData> = {
    id,
    title: "",
    start: formatEventDate(start, style, timeZone),
    end: formatEventDate(end, style, timeZone),
  }
  if (allDay) draft.allDay = true
  if (calendarId) draft.calendarId = calendarId
  return draft
}

function createEventChange<TData>(
  change: Pick<EventCalendarChange<TData>, "reason" | "event"> &
    Partial<Omit<EventCalendarChange<TData>, "reason" | "event">>
): EventCalendarChange<TData> {
  return {
    created: [],
    updated: [],
    deleted: [],
    replaced: [],
    ...change,
  }
}

/** The stored events after a change. Untouched events keep their identity. */
function applyEventChange<TData>(
  events: CalendarEvent<TData>[],
  change: Pick<EventCalendarChange<TData>, "created" | "updated" | "deleted">
): CalendarEvent<TData>[] {
  const deleted = new Set(change.deleted.map((event) => event.id))
  const updated = new Map(change.updated.map((event) => [event.id, event]))
  const next = events
    .filter((event) => !deleted.has(event.id))
    .map((event) => updated.get(event.id) ?? event)
  const known = new Set(next.map((event) => event.id))
  for (const event of change.created) {
    if (!known.has(event.id)) next.push(event)
  }
  return next
}

/** The change that undoes `change`. */
function invertEventChange<TData>(
  change: EventCalendarChange<TData>,
  reason: "undo" | "redo" = "undo"
): EventCalendarChange<TData> {
  return {
    reason,
    event: change.previous ?? change.event,
    previous: change.event,
    scope: change.scope,
    created: change.deleted,
    deleted: change.created,
    updated: change.replaced,
    replaced: change.updated,
  }
}

// --- Visibility --------------------------------------------------------------

function isEventVisible(event: CalendarEvent, calendars: CalendarSource[]) {
  if (event.status === "cancelled") return false
  if (!event.calendarId) return true
  const calendar = calendars.find((item) => item.id === event.calendarId)
  return calendar?.visible !== false
}

function isEventEditable(event: CalendarEvent, calendars: CalendarSource[]) {
  if (event.editable !== undefined) return event.editable
  const calendar = calendars.find((item) => item.id === event.calendarId)
  return calendar?.editable !== false
}

/** Whether the event overlaps the range at all. */
function overlapsRange(
  event: CalendarEvent,
  range: EventCalendarRange,
  timeZone?: string
) {
  const times = getEventTimes(event, timeZone)
  return times.start < range.end && times.end > range.start
}

// --- Colour ------------------------------------------------------------------

const DEFAULT_EVENT_COLOR: EventCalendarColorName = "blue"

function isRole(color: EventCalendarColor): color is EventCalendarRole {
  return (
    typeof color === "string" &&
    (EVENT_CALENDAR_ROLES as readonly string[]).includes(color)
  )
}

function resolveEventColor(
  event: CalendarEvent,
  calendars: CalendarSource[]
): EventCalendarColor {
  if (event.color) return event.color
  const calendar = calendars.find((item) => item.id === event.calendarId)
  return calendar?.color ?? DEFAULT_EVENT_COLOR
}

/**
 * How much of its fill an event chip shows behind its text, by mode and
 * state: the style map's --event-calendar-wash, and React Native's chip.
 * Each keeps the text at 4.5:1 for every palette colour on the page and on
 * a card (__tests__/event-calendar-colors.test.ts).
 */
const EVENT_CHIP_WASH = {
  light: { rest: 0.22, hover: 0.26, past: 0.12 },
  dark: { rest: 0.32, hover: 0.36, past: 0.18 },
} as const

type EventColorVariables = Record<`--event-calendar-${string}`, string>

/**
 * The CSS variables an event's chip sets: fill, text and foreground for light
 * and dark. The style map picks the mode's pair, so a chip stays one element
 * with two inline variables per mode.
 */
function getEventColorVariables(
  color: EventCalendarColor
): EventColorVariables {
  if (isRole(color)) {
    return {
      "--event-calendar-fill-light": `var(--${color})`,
      "--event-calendar-fill-dark": `var(--${color})`,
      "--event-calendar-text-light": `var(--${color}-text)`,
      "--event-calendar-text-dark": `var(--${color}-text)`,
      "--event-calendar-foreground-light": `var(--${color}-foreground)`,
      "--event-calendar-foreground-dark": `var(--${color}-foreground)`,
    }
  }
  const hue = typeof color === "string" ? EVENT_CALENDAR_COLORS[color] : color
  return {
    "--event-calendar-fill-light": getPaletteLiteral("fill", "light", hue),
    "--event-calendar-fill-dark": getPaletteLiteral("fill", "dark", hue),
    "--event-calendar-text-light": getPaletteLiteral("text", "light", hue),
    "--event-calendar-text-dark": getPaletteLiteral("text", "dark", hue),
    "--event-calendar-foreground-light": getPaletteLiteral(
      "foreground",
      "light",
      hue
    ),
    "--event-calendar-foreground-dark": getPaletteLiteral(
      "foreground",
      "dark",
      hue
    ),
  }
}

export {
  applyEventChange,
  createEventChange,
  createEventDraft,
  DEFAULT_EVENT_CALENDAR_SETTINGS,
  EVENT_CALENDAR_COLORS,
  EVENT_CALENDAR_ROLES,
  EVENT_CALENDAR_SHORTCUTS,
  EVENT_CALENDAR_VIEWS,
  EVENT_CHIP_WASH,
  EventCalendarDateError,
  formatEventDate,
  formatEventDay,
  formatEventTime,
  formatEventTimeRange,
  formatViewTitle,
  fromWallParts,
  getEventColorVariables,
  getEventDateStyle,
  getEventTimes,
  getWallParts,
  getKeyboardNudge,
  getShortcut,
  getViewLabel,
  getColumnCount,
  getContinuityBuffer,
  getContinuousRange,
  getContinuousWindow,
  getDayBand,
  getViewRange,
  getVisibleDays,
  groupEventsByDay,
  invertEventChange,
  isAllDayEvent,
  isEventCalendarView,
  isEventEditable,
  isEventVisible,
  isTimeGridView,
  moveCursor,
  nudgeEvent,
  overlapsRange,
  parseEventDate,
  resolveBusinessHours,
  resolveEventColor,
  setEventTimes,
  shiftViewDate,
  toEventCalendarWeekday,
  toZoned,
  type CalendarEvent,
  type CalendarEventStatus,
  type CalendarSource,
  type EventCalendarBusinessHours,
  type EventCalendarContinuousWindow,
  type EventCalendarDayBand,
  type EventCalendarChange,
  type EventCalendarChangeReason,
  type EventCalendarColor,
  type EventCalendarColorName,
  type EventCalendarDayGroup,
  type EventCalendarHourCycle,
  type EventCalendarHue,
  type EventCalendarNudge,
  type EventCalendarRange,
  type EventCalendarRole,
  type EventCalendarSettings,
  type EventCalendarShortcut,
  type EventCalendarView,
  type EventCalendarWeekday,
  type EventColorVariables,
  type EventDateStyle,
  type EventTimes,
  type RecurrenceScope,
  type WallParts,
}
