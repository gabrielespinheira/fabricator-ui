// Recurring events for the Event Calendar: the RFC 5545 subset calendar apps
// write (FREQ DAILY to YEARLY, INTERVAL, COUNT, UNTIL, BYDAY with positions,
// BYMONTHDAY, BYMONTH, WKST and EXDATE), expanded in the calendar's time zone
// so web and React Native show the same occurrences, and the scoped edits
// Google Calendar offers: this event, this and following, all events.
//
// Pure: no React, no DOM, no clock. Occurrences are plain events with an id
// of `<series id>::<original start>`, `recurringEventId` and `originalStart`.

import { TZDate } from "@date-fns/tz"
import {
  addDays,
  addMinutes,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  getDaysInMonth,
  set,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns"

import {
  formatEventDate,
  getEventDateStyle,
  getEventTimes,
  isAllDayEvent,
  parseEventDate,
  setEventTimes,
  toEventCalendarWeekday,
  toZoned,
  type CalendarEvent,
  type EventCalendarRange,
  type EventCalendarWeekday,
  type RecurrenceScope,
} from "./event-calendar-model"

// --- Types -------------------------------------------------------------------

type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"

/** A weekday, 0 for Sunday, with an optional position ("3TU", "-1FR"). */
type RecurrenceWeekday = { weekday: EventCalendarWeekday; nth?: number }

type RecurrenceRule = {
  freq: RecurrenceFrequency
  interval?: number
  count?: number
  /** As written: `20261231T235959Z`, `20261231T235959` or `20261231`. */
  until?: string
  byDay?: RecurrenceWeekday[]
  byMonthDay?: number[]
  byMonth?: number[]
  weekStart?: EventCalendarWeekday
}

type Recurrence = {
  rule: RecurrenceRule
  /** As written: `20261118T100000Z`, `20261118` or `TZID=Zone:20261118T100000`. */
  exdates: string[]
}

type RecurrenceChange<TData> = {
  created: CalendarEvent<TData>[]
  updated: CalendarEvent<TData>[]
  deleted: CalendarEvent<TData>[]
  replaced: CalendarEvent<TData>[]
}

class EventCalendarRecurrenceError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "EventCalendarRecurrenceError"
  }
}

const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const
const FREQUENCIES: readonly RecurrenceFrequency[] = [
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]
const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const
const POSITION_NAMES: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  5: "fifth",
  [-1]: "last",
}
const WORKWEEK = [1, 2, 3, 4, 5]

// --- Parsing and writing -----------------------------------------------------

function toWeekday(code: string): EventCalendarWeekday {
  const index = WEEKDAY_CODES.findIndex((item) => item === code)
  if (index < 0) {
    throw new EventCalendarRecurrenceError(
      `Unsupported recurrence day: ${code}`
    )
  }
  return toEventCalendarWeekday(index)
}

function isFrequency(value: string | undefined): value is RecurrenceFrequency {
  return FREQUENCIES.some((frequency) => frequency === value)
}

function toNumbers(value: string) {
  return value.split(",").map((part) => {
    const number = Number(part)
    if (!Number.isInteger(number)) {
      throw new EventCalendarRecurrenceError(
        `Unsupported recurrence value: ${value}`
      )
    }
    return number
  })
}

function parseRule(text: string): RecurrenceRule {
  const parts = new Map(
    text.split(";").map((part) => {
      const [key, value = ""] = part.split("=")
      return [key.toUpperCase(), value] as const
    })
  )
  const freq = parts.get("FREQ")
  if (!isFrequency(freq)) {
    throw new EventCalendarRecurrenceError(`Unsupported recurrence: ${text}`)
  }
  const rule: RecurrenceRule = { freq }
  for (const [key, value] of parts) {
    switch (key) {
      case "FREQ":
        break
      case "INTERVAL":
        rule.interval = toNumbers(value)[0]
        break
      case "COUNT":
        rule.count = toNumbers(value)[0]
        break
      case "UNTIL":
        rule.until = value
        break
      case "BYMONTHDAY":
        rule.byMonthDay = toNumbers(value)
        break
      case "BYMONTH":
        rule.byMonth = toNumbers(value)
        break
      case "WKST":
        rule.weekStart = toWeekday(value)
        break
      case "BYDAY":
        rule.byDay = value.split(",").map((day) => {
          const match = /^([+-]?\d{1,2})?([A-Z]{2})$/.exec(day)
          if (!match) {
            throw new EventCalendarRecurrenceError(
              `Unsupported recurrence day: ${day}`
            )
          }
          const weekday = toWeekday(match[2])
          return match[1] ? { weekday, nth: Number(match[1]) } : { weekday }
        })
        break
      default:
        throw new EventCalendarRecurrenceError(
          `Unsupported recurrence: ${text}`
        )
    }
  }
  return rule
}

/** RRULE and EXDATE lines, or a bare rule ("FREQ=DAILY"). */
function parseRecurrence(text: string): Recurrence {
  let rule: RecurrenceRule | undefined
  const exdates: string[] = []
  for (const line of text.split(/\r?\n/).filter(Boolean)) {
    const [name, ...rest] = line.split(":")
    const value = rest.join(":")
    if (line.startsWith("FREQ=")) {
      rule = parseRule(line)
    } else if (name === "RRULE") {
      rule = parseRule(value)
    } else if (name.startsWith("EXDATE")) {
      const tzid = /TZID=([^;:]+)/.exec(name)?.[1]
      for (const date of value.split(",")) {
        exdates.push(tzid ? `TZID=${tzid}:${date}` : date)
      }
    } else {
      throw new EventCalendarRecurrenceError(`Unsupported recurrence: ${line}`)
    }
  }
  if (!rule) {
    throw new EventCalendarRecurrenceError(`Unsupported recurrence: ${text}`)
  }
  return { rule, exdates }
}

function formatWeekday({ weekday, nth }: RecurrenceWeekday) {
  return `${nth ?? ""}${WEEKDAY_CODES[weekday]}`
}

function formatRule(rule: RecurrenceRule) {
  const parts = [`FREQ=${rule.freq}`]
  if (rule.interval && rule.interval > 1)
    parts.push(`INTERVAL=${rule.interval}`)
  if (rule.byMonth) parts.push(`BYMONTH=${rule.byMonth.join(",")}`)
  if (rule.byMonthDay) parts.push(`BYMONTHDAY=${rule.byMonthDay.join(",")}`)
  if (rule.byDay) parts.push(`BYDAY=${rule.byDay.map(formatWeekday).join(",")}`)
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`)
  if (rule.until) parts.push(`UNTIL=${rule.until}`)
  if (rule.weekStart !== undefined) {
    parts.push(`WKST=${WEEKDAY_CODES[rule.weekStart]}`)
  }
  return `RRULE:${parts.join(";")}`
}

function formatRecurrence({ rule, exdates }: Recurrence): string {
  const lines = [formatRule(rule)]
  const plain = exdates.filter((date) => /^\d{8}T\d{6}Z?$/.test(date))
  const dates = exdates.filter((date) => /^\d{8}$/.test(date))
  if (plain.length > 0) lines.push(`EXDATE:${plain.join(",")}`)
  if (dates.length > 0) lines.push(`EXDATE;VALUE=DATE:${dates.join(",")}`)
  for (const date of exdates.filter((item) => item.startsWith("TZID="))) {
    lines.push(`EXDATE;${date}`)
  }
  return lines.join("\n")
}

// --- Dates in iCalendar's basic format ---------------------------------------

const BASIC = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/

/** An UNTIL or EXDATE value as an instant; dates and floating times are wall time. */
function parseBasicDate(value: string, timeZone?: string): Date {
  const zoned = /^TZID=([^:]+):(.+)$/.exec(value)
  const zone = zoned ? zoned[1] : timeZone
  const match = BASIC.exec(zoned ? zoned[2] : value)
  if (!match) {
    throw new EventCalendarRecurrenceError(
      `Unsupported recurrence date: ${value}`
    )
  }
  const [year, month, day, hours = 0, minutes = 0, seconds = 0] = match
    .slice(1, 7)
    .map((part) => Number(part ?? 0))
  if (match[7]) {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds))
  }
  return new Date(
    +(zone
      ? new TZDate(year, month - 1, day, hours, minutes, seconds, zone)
      : new Date(year, month - 1, day, hours, minutes, seconds))
  )
}

const pad = (value: number) => String(value).padStart(2, "0")

/** `20261104T100000Z`, or `20261104` for an all-day occurrence. */
function toBasicDate(date: Date, allDay: boolean, timeZone?: string) {
  if (allDay) return formatEventDate(date, "date", timeZone).replaceAll("-", "")
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

// --- Expansion ---------------------------------------------------------------

// A guard for rules that never match (BYMONTHDAY=31 with BYMONTH=2).
const MAX_EMPTY_PERIODS = 1000

// Dates here are zoned (TZDate), and date-fns keeps the zone of what it's
// given, so every day is made with date-fns rather than `new Date(...)`.

/** Every day in a month that a rule's BYDAY or BYMONTHDAY picks. */
function daysInMonth(month: Date, rule: RecurrenceRule, anchor: Date): Date[] {
  const first = startOfMonth(month)
  const total = getDaysInMonth(first)
  const at = (day: number) => addDays(first, day - 1)
  const weekdays = (weekday: number) => {
    const all: Date[] = []
    for (let day = 1; day <= total; day++) {
      const date = at(day)
      if (date.getDay() === weekday) all.push(date)
    }
    return all
  }
  if (rule.byMonthDay) {
    return rule.byMonthDay
      .map((day) => (day < 0 ? total + day + 1 : day))
      .filter((day) => day >= 1 && day <= total)
      .map(at)
  }
  if (rule.byDay) {
    return rule.byDay.flatMap(({ weekday, nth }) => {
      const all = weekdays(weekday)
      if (nth === undefined) return all
      const date = nth > 0 ? all[nth - 1] : all[all.length + nth]
      return date ? [date] : []
    })
  }
  return anchor.getDate() <= total ? [at(anchor.getDate())] : []
}

/** The days one period of the rule produces, in order. */
function getPeriodDays(
  rule: RecurrenceRule,
  anchor: Date,
  period: number
): Date[] {
  const interval = rule.interval ?? 1
  const inMonths = (day: Date) =>
    !rule.byMonth || rule.byMonth.includes(day.getMonth() + 1)
  switch (rule.freq) {
    case "DAILY": {
      const day = addDays(anchor, period * interval)
      const weekdays = rule.byDay?.map((item): number => item.weekday)
      const monthDays = rule.byMonthDay
      const keep =
        inMonths(day) &&
        (!weekdays || weekdays.includes(day.getDay())) &&
        (!monthDays || monthDays.includes(day.getDate()))
      return keep ? [day] : []
    }
    case "WEEKLY": {
      const weekStart = startOfWeek(addWeeks(anchor, period * interval), {
        weekStartsOn: rule.weekStart ?? 1,
      })
      const weekdays = rule.byDay?.map((item) => item.weekday) ?? [
        anchor.getDay(),
      ]
      return weekdays
        .map((weekday) =>
          addDays(weekStart, (weekday - weekStart.getDay() + 7) % 7)
        )
        .filter(inMonths)
    }
    case "MONTHLY": {
      const month = addMonths(startOfMonth(anchor), period * interval)
      return daysInMonth(month, rule, anchor).filter(inMonths)
    }
    case "YEARLY": {
      const year = startOfYear(addYears(anchor, period * interval))
      const months = rule.byMonth ?? [anchor.getMonth() + 1]
      return months.flatMap((month) =>
        daysInMonth(addMonths(year, month - 1), rule, anchor)
      )
    }
  }
}

/** How many periods to skip so iteration starts just before `from`. */
function getSkipPeriods(rule: RecurrenceRule, anchor: Date, from: Date) {
  if (rule.count !== undefined || from <= anchor) return 0
  const interval = rule.interval ?? 1
  const span =
    rule.freq === "DAILY"
      ? differenceInCalendarDays(from, anchor)
      : rule.freq === "WEEKLY"
        ? Math.floor(differenceInCalendarDays(from, anchor) / 7)
        : rule.freq === "MONTHLY"
          ? differenceInCalendarMonths(from, anchor)
          : from.getFullYear() - anchor.getFullYear()
  return Math.max(0, Math.floor(span / interval) - 1)
}

type Instance = { start: Date; index: number }

/**
 * The series' starts in order, from its first, as instants, until `before`.
 * `index` counts every occurrence the rule makes, as COUNT does (EXDATE
 * doesn't change it).
 */
function* iterateStarts(
  event: CalendarEvent,
  rule: RecurrenceRule,
  before: Date,
  timeZone?: string,
  from?: Date
): Generator<Instance> {
  const allDay = isAllDayEvent(event)
  const first = parseEventDate(event.start, timeZone)
  const zonedFirst = toZoned(first, timeZone)
  const anchor = startOfDay(zonedFirst)
  const time = allDay
    ? { hours: 0, minutes: 0, seconds: 0 }
    : {
        hours: zonedFirst.getHours(),
        minutes: zonedFirst.getMinutes(),
        seconds: zonedFirst.getSeconds(),
      }
  const until = rule.until ? parseBasicDate(rule.until, timeZone) : undefined
  let index = 0
  let empty = 0
  for (let period = from ? getSkipPeriods(rule, anchor, from) : 0; ; period++) {
    const days = getPeriodDays(rule, anchor, period).sort((a, b) => +a - +b)
    if (days.length === 0) {
      if (++empty > MAX_EMPTY_PERIODS) return
      continue
    }
    empty = 0
    for (const day of days) {
      // Wall time on the day, so 10:00 stays 10:00 across daylight saving.
      const start = new Date(+set(day, { ...time, milliseconds: 0 }))
      if (start < first) continue
      if (until && start > until) return
      if (rule.count !== undefined && index >= rule.count) return
      if (start >= before) return
      yield { start, index }
      index++
    }
  }
}

function getExcludedStarts(
  exdates: string[],
  timeZone: string | undefined,
  allDay: boolean
) {
  return new Set(
    exdates.map((date) =>
      allDay && /^\d{8}$/.test(date)
        ? date
        : String(+parseBasicDate(date, timeZone))
    )
  )
}

function occurrenceKey(start: Date, allDay: boolean, timeZone?: string) {
  return allDay ? toBasicDate(start, true, timeZone) : String(+start)
}

/** The occurrences of one recurring event that overlap the range. */
function expandRecurringEvent<TData>(
  event: CalendarEvent<TData>,
  range: EventCalendarRange,
  timeZone?: string
): CalendarEvent<TData>[] {
  if (!event.recurrence) return []
  const { rule, exdates } = parseRecurrence(event.recurrence)
  const times = getEventTimes(event, timeZone)
  const duration = +times.end - +times.start
  const style = getEventDateStyle(event.start)
  const excluded = getExcludedStarts(exdates, timeZone, times.allDay)
  const from = new Date(+range.start - duration)
  const occurrences: CalendarEvent<TData>[] = []
  for (const { start } of iterateStarts(
    event,
    rule,
    range.end,
    timeZone,
    from
  )) {
    const end = new Date(+start + duration)
    if (end <= range.start) continue
    if (excluded.has(occurrenceKey(start, times.allDay, timeZone))) continue
    const startText = formatEventDate(start, style, timeZone)
    occurrences.push({
      ...event,
      id: `${event.id}::${startText}`,
      start: startText,
      end: formatEventDate(end, style, timeZone),
      recurringEventId: event.id,
      originalStart: startText,
    })
  }
  return occurrences
}

/** Whether the event belongs to a series, as an occurrence or an exception. */
function isOccurrence(event: CalendarEvent) {
  return (
    event.recurringEventId !== undefined && event.originalStart !== undefined
  )
}

/**
 * Every event that overlaps the range, series expanded, sorted by start and
 * then by length (longest first, as calendars stack them). An exception
 * replaces the occurrence it was made from even when the series has no
 * EXDATE for it, as in Google Calendar's data.
 */
// --- Index -------------------------------------------------------------------

type IndexedEvent<TData> = {
  event: CalendarEvent<TData>
  start: number
  end: number
}

/**
 * Events prepared for range queries: one-off events of a week or less sorted
 * by start, so a view finds its events by binary search; longer ones and
 * series are kept apart and checked one by one, as there are few of them.
 */
type EventCalendarIndex<TData = unknown> = {
  timeZone?: string
  short: IndexedEvent<TData>[]
  maxShortDuration: number
  long: IndexedEvent<TData>[]
  series: IndexedEvent<TData>[]
  exceptions: Map<string, Set<string>>
}

const LONG_EVENT = 7 * 24 * 60 * 60 * 1000

// Parsing dates in a time zone is most of the cost of indexing, and an edit
// replaces one event object while keeping the rest, so each object is parsed
// once per time zone. Events are immutable: a changed event is a new object.
const parsedTimes = new WeakMap<
  CalendarEvent<unknown>,
  { timeZone?: string; start: number; end: number }
>()

function getIndexedTimes(event: CalendarEvent<unknown>, timeZone?: string) {
  const cached = parsedTimes.get(event)
  if (cached && cached.timeZone === timeZone) return cached
  const times = getEventTimes(event, timeZone)
  const parsed = { timeZone, start: +times.start, end: +times.end }
  parsedTimes.set(event, parsed)
  return parsed
}

function createEventIndex<TData>(
  events: readonly CalendarEvent<TData>[],
  timeZone?: string
): EventCalendarIndex<TData> {
  const index: EventCalendarIndex<TData> = {
    timeZone,
    short: [],
    maxShortDuration: 0,
    long: [],
    series: [],
    exceptions: new Map(),
  }
  for (const event of events) {
    const { start, end } = getIndexedTimes(event, timeZone)
    const entry = { event, start, end }
    if (event.recurrence && !event.recurringEventId) {
      index.series.push(entry)
      continue
    }
    if (event.recurringEventId && event.originalStart) {
      const key = occurrenceKey(
        parseEventDate(event.originalStart, timeZone),
        isAllDayEvent({ start: event.originalStart }),
        timeZone
      )
      const keys = index.exceptions.get(event.recurringEventId) ?? new Set()
      keys.add(key)
      index.exceptions.set(event.recurringEventId, keys)
    }
    const duration = end - start
    if (duration > LONG_EVENT) {
      index.long.push(entry)
      continue
    }
    index.short.push(entry)
    index.maxShortDuration = Math.max(index.maxShortDuration, duration)
  }
  index.short.sort((a, b) => a.start - b.start)
  return index
}

/** The first position whose start is at or after `time`. */
function findFirstStart<TData>(entries: IndexedEvent<TData>[], time: number) {
  let low = 0
  let high = entries.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (entries[middle].start < time) low = middle + 1
    else high = middle
  }
  return low
}

/**
 * The events and occurrences that overlap a range, ordered by start, longer
 * first on the same start. A series' own exceptions replace its occurrences.
 */
function queryEventIndex<TData>(
  index: EventCalendarIndex<TData>,
  range: EventCalendarRange
): CalendarEvent<TData>[] {
  const from = +range.start
  const to = +range.end
  const { timeZone } = index
  const visible: IndexedEvent<TData>[] = []
  const first = findFirstStart(index.short, from - index.maxShortDuration)
  for (let position = first; position < index.short.length; position++) {
    const entry = index.short[position]
    if (entry.start >= to) break
    if (entry.end > from) visible.push(entry)
  }
  for (const entry of index.long) {
    if (entry.start < to && entry.end > from) visible.push(entry)
  }
  for (const { event, start } of index.series) {
    if (start >= to) continue
    const skipped = index.exceptions.get(event.id)
    for (const occurrence of expandRecurringEvent(event, range, timeZone)) {
      const key = occurrence.originalStart
        ? occurrenceKey(
            parseEventDate(occurrence.originalStart, timeZone),
            isAllDayEvent(occurrence),
            timeZone
          )
        : ""
      if (skipped?.has(key)) continue
      const times = getEventTimes(occurrence, timeZone)
      if (+times.start >= to || +times.end <= from) continue
      visible.push({ event: occurrence, start: +times.start, end: +times.end })
    }
  }
  return visible
    .sort(
      (a, b) =>
        a.start - b.start ||
        b.end - a.end ||
        a.event.id.localeCompare(b.event.id)
    )
    .map((item) => item.event)
}

/** Every event and occurrence in a range. Index once to query many ranges. */
function expandEvents<TData>(
  events: readonly CalendarEvent<TData>[],
  range: EventCalendarRange,
  timeZone?: string
): CalendarEvent<TData>[] {
  return queryEventIndex(createEventIndex(events, timeZone), range)
}

// --- Scoped edits ------------------------------------------------------------

class EventCalendarSeriesError extends Error {
  constructor(id: string) {
    super(`The series "${id}" isn't among the stored events.`)
    this.name = "EventCalendarSeriesError"
  }
}

function findSeries<TData>(
  stored: CalendarEvent<TData>[],
  occurrence: CalendarEvent<TData>
) {
  const id = occurrence.recurringEventId
  const series = stored.find((event) => event.id === id)
  if (!id || !series?.recurrence) throw new EventCalendarSeriesError(id ?? "")
  return series
}

function withExdate<TData>(
  series: CalendarEvent<TData>,
  occurrence: CalendarEvent<TData>,
  timeZone?: string
): CalendarEvent<TData> {
  const recurrence = parseRecurrence(series.recurrence ?? "")
  const original = parseEventDate(
    occurrence.originalStart ?? occurrence.start,
    timeZone
  )
  const exdate = toBasicDate(original, isAllDayEvent(series), timeZone)
  if (!recurrence.exdates.includes(exdate)) recurrence.exdates.push(exdate)
  return { ...series, recurrence: formatRecurrence(recurrence) }
}

function isFirstOccurrence(
  series: CalendarEvent,
  occurrence: CalendarEvent,
  timeZone?: string
) {
  return (
    +parseEventDate(occurrence.originalStart ?? occurrence.start, timeZone) <=
    +parseEventDate(series.start, timeZone)
  )
}

/** The series ended just before the occurrence, by UNTIL or by COUNT. */
function endSeriesBefore<TData>(
  series: CalendarEvent<TData>,
  occurrence: CalendarEvent<TData>,
  timeZone?: string
) {
  const recurrence = parseRecurrence(series.recurrence ?? "")
  const allDay = isAllDayEvent(series)
  const split = parseEventDate(
    occurrence.originalStart ?? occurrence.start,
    timeZone
  )
  const before = [...iterateStarts(series, recurrence.rule, split, timeZone)]
  const ended: Recurrence = {
    rule: { ...recurrence.rule },
    exdates: recurrence.exdates,
  }
  let remaining: number | undefined
  if (recurrence.rule.count !== undefined) {
    ended.rule.count = before.length
    remaining = recurrence.rule.count - before.length
  } else {
    ended.rule.until = allDay
      ? toBasicDate(addDays(toZoned(split, timeZone), -1), true, timeZone)
      : toBasicDate(new Date(+split - 1000), false, timeZone)
  }
  return {
    series: { ...series, recurrence: formatRecurrence(ended) },
    rule: recurrence.rule,
    remaining,
    split,
  }
}

/** The occurrence's fields that a whole series takes on. */
function seriesFields<TData>(next: CalendarEvent<TData>): CalendarEvent<TData> {
  const fields = { ...next }
  delete fields.recurringEventId
  delete fields.originalStart
  return fields
}

/**
 * The series' days shifted by the edit's day change: a weekly series on
 * Monday moved to Tuesday repeats on Tuesday.
 */
function shiftRuleDays(rule: RecurrenceRule, days: number): RecurrenceRule {
  if (days === 0 || rule.freq !== "WEEKLY" || !rule.byDay) return rule
  return {
    ...rule,
    byDay: rule.byDay.map(({ weekday, nth }) => ({
      weekday: toEventCalendarWeekday(weekday + days),
      ...(nth === undefined ? {} : { nth }),
    })),
  }
}

/** Day and minute change between where the occurrence was and where it is now. */
function getWallDelta(
  from: Date,
  to: Date,
  timeZone?: string
): { days: number; minutes: number } {
  const zonedFrom = toZoned(from, timeZone)
  const zonedTo = toZoned(to, timeZone)
  return {
    days: differenceInCalendarDays(zonedTo, zonedFrom),
    minutes:
      zonedTo.getHours() * 60 +
      zonedTo.getMinutes() -
      (zonedFrom.getHours() * 60 + zonedFrom.getMinutes()),
  }
}

/**
 * Stored events to write when an occurrence of a series is edited: on its
 * own (an exception and an EXDATE), with the rest of the series (the series
 * moves by the same day and time change), or from here on (the series ends
 * and a new one starts).
 */
function applyRecurringEdit<TData>({
  stored,
  occurrence,
  next,
  scope,
  timeZone,
  createId,
}: {
  stored: CalendarEvent<TData>[]
  occurrence: CalendarEvent<TData>
  next: CalendarEvent<TData>
  scope: RecurrenceScope
  timeZone?: string
  createId: () => string
}): RecurrenceChange<TData> {
  const isStored = stored.some((event) => event.id === occurrence.id)
  const series = findSeries(stored, occurrence)

  if (scope === "this") {
    if (isStored) {
      return {
        created: [],
        updated: [next],
        deleted: [],
        replaced: [occurrence],
      }
    }
    const exception: CalendarEvent<TData> = {
      ...next,
      id: createId(),
      recurringEventId: series.id,
      originalStart: occurrence.originalStart ?? occurrence.start,
    }
    delete exception.recurrence
    return {
      created: [exception],
      updated: [withExdate(series, occurrence, timeZone)],
      deleted: [],
      replaced: [series],
    }
  }

  const delta = getWallDelta(
    parseEventDate(occurrence.start, timeZone),
    parseEventDate(next.start, timeZone),
    timeZone
  )
  const nextTimes = getEventTimes(next, timeZone)
  const duration = +nextTimes.end - +nextTimes.start
  const ruleChanged = next.recurrence !== occurrence.recurrence

  if (scope === "all" || isFirstOccurrence(series, occurrence, timeZone)) {
    const seriesStart = parseEventDate(series.start, timeZone)
    const start = new Date(
      +addMinutes(
        addDays(toZoned(seriesStart, timeZone), delta.days),
        delta.minutes
      )
    )
    const moved = setEventTimes(
      seriesFields({ ...next, id: series.id }),
      { start, end: new Date(+start + duration), allDay: nextTimes.allDay },
      timeZone
    )
    const recurrence = ruleChanged
      ? (next.recurrence ?? "")
      : formatRecurrence({
          ...parseRecurrence(series.recurrence ?? ""),
          rule: shiftRuleDays(
            parseRecurrence(series.recurrence ?? "").rule,
            delta.days
          ),
        })
    const updated: CalendarEvent<TData> = { ...moved, recurrence }
    if (!next.recurrence && ruleChanged) delete updated.recurrence
    return { created: [], updated: [updated], deleted: [], replaced: [series] }
  }

  const ended = endSeriesBefore(series, occurrence, timeZone)
  const followingRule: RecurrenceRule = shiftRuleDays(
    ended.remaining === undefined
      ? ended.rule
      : { ...ended.rule, count: ended.remaining },
    delta.days
  )
  const following: CalendarEvent<TData> = {
    ...seriesFields(next),
    id: createId(),
    recurrence: ruleChanged
      ? next.recurrence
      : formatRecurrence({ rule: followingRule, exdates: [] }),
  }
  if (!following.recurrence) delete following.recurrence
  return {
    created: [following],
    updated: [ended.series],
    deleted: getExceptionsFrom(stored, series.id, ended.split, timeZone),
    replaced: [series],
  }
}

/** Stored exceptions of a series at or after `split`. */
function getExceptionsFrom<TData>(
  stored: CalendarEvent<TData>[],
  seriesId: string,
  split: Date | undefined,
  timeZone?: string
) {
  return stored.filter(
    (event) =>
      event.recurringEventId === seriesId &&
      event.originalStart !== undefined &&
      (!split || +parseEventDate(event.originalStart, timeZone) >= +split)
  )
}

/** Stored events to write when an occurrence is deleted, by scope. */
function applyRecurringDelete<TData>({
  stored,
  occurrence,
  scope,
  timeZone,
}: {
  stored: CalendarEvent<TData>[]
  occurrence: CalendarEvent<TData>
  scope: RecurrenceScope
  timeZone?: string
}): RecurrenceChange<TData> {
  const series = findSeries(stored, occurrence)
  if (
    scope === "all" ||
    (scope === "following" && isFirstOccurrence(series, occurrence, timeZone))
  ) {
    return {
      created: [],
      updated: [],
      deleted: [
        series,
        ...getExceptionsFrom(stored, series.id, undefined, timeZone),
      ],
      replaced: [],
    }
  }
  if (scope === "this") {
    const isStored = stored.some((event) => event.id === occurrence.id)
    return {
      created: [],
      updated: [withExdate(series, occurrence, timeZone)],
      deleted: isStored ? [occurrence] : [],
      replaced: [series],
    }
  }
  const ended = endSeriesBefore(series, occurrence, timeZone)
  return {
    created: [],
    updated: [ended.series],
    deleted: getExceptionsFrom(stored, series.id, ended.split, timeZone),
    replaced: [series],
  }
}

// --- Words -------------------------------------------------------------------

function listWeekdays(days: RecurrenceWeekday[]) {
  return days.map(({ weekday }) => WEEKDAY_NAMES[weekday]).join(", ")
}

function isWorkweek(days: RecurrenceWeekday[] | undefined) {
  return (
    days !== undefined &&
    days.length === WORKWEEK.length &&
    days.every(
      ({ weekday, nth }) => nth === undefined && WORKWEEK.includes(weekday)
    )
  )
}

/** "Weekly on Tuesday", "Monthly on the third Tuesday", "Daily, 5 times". */
function describeRecurrence(
  rule: RecurrenceRule,
  options: { start?: Date; locale?: string; timeZone?: string } = {}
): string {
  const interval = rule.interval ?? 1
  const every = (unit: string, plural: string) =>
    interval === 1 ? unit : `Every ${interval} ${plural}`
  let text: string
  switch (rule.freq) {
    case "DAILY":
      text = every("Daily", "days")
      break
    case "WEEKLY":
      if (interval === 1 && isWorkweek(rule.byDay)) {
        text = "Every weekday (Monday to Friday)"
      } else {
        text = every("Weekly", "weeks")
        if (rule.byDay) text += ` on ${listWeekdays(rule.byDay)}`
      }
      break
    case "MONTHLY": {
      text = every("Monthly", "months")
      const [first] = rule.byDay ?? []
      if (first?.nth !== undefined) {
        text += ` on the ${POSITION_NAMES[first.nth] ?? first.nth} ${WEEKDAY_NAMES[first.weekday]}`
      } else if (rule.byMonthDay) {
        text += ` on day ${rule.byMonthDay.join(", ")}`
      }
      break
    }
    case "YEARLY":
      text = every("Annually", "years")
      if (options.start) {
        text += ` on ${new Intl.DateTimeFormat(options.locale, {
          month: "long",
          day: "numeric",
          timeZone: options.timeZone,
        }).format(options.start)}`
      }
      break
  }
  if (rule.count !== undefined) text += `, ${rule.count} times`
  if (rule.until) {
    text += `, until ${new Intl.DateTimeFormat(options.locale, {
      dateStyle: "medium",
      timeZone: options.timeZone,
    }).format(parseBasicDate(rule.until, options.timeZone))}`
  }
  return text
}

type RecurrencePreset = { label: string; value: string | undefined }

/** Google Calendar's repeat menu for an event starting at `start`. */
function getRecurrencePresets(
  start: Date,
  options: { locale?: string; timeZone?: string } = {}
): RecurrencePreset[] {
  const zoned = toZoned(start, options.timeZone)
  const weekday = toEventCalendarWeekday(zoned.getDay())
  const position = Math.ceil(zoned.getDate() / 7)
  const nth = position === 5 ? -1 : position
  const presetRules: RecurrenceRule[] = [
    { freq: "DAILY" },
    { freq: "WEEKLY", byDay: [{ weekday }] },
    { freq: "MONTHLY", byDay: [{ weekday, nth }] },
    { freq: "YEARLY" },
    {
      freq: "WEEKLY",
      byDay: WORKWEEK.map((day) => ({ weekday: toEventCalendarWeekday(day) })),
    },
  ]
  return [
    { label: "Does not repeat", value: undefined },
    ...presetRules.map((rule) => ({
      label: describeRecurrence(rule, { ...options, start }),
      value: formatRule(rule),
    })),
  ]
}

export {
  applyRecurringDelete,
  applyRecurringEdit,
  createEventIndex,
  describeRecurrence,
  EventCalendarRecurrenceError,
  EventCalendarSeriesError,
  expandEvents,
  expandRecurringEvent,
  formatRecurrence,
  getRecurrencePresets,
  isOccurrence,
  parseRecurrence,
  queryEventIndex,
  type EventCalendarIndex,
  type Recurrence,
  type RecurrenceChange,
  type RecurrenceFrequency,
  type RecurrencePreset,
  type RecurrenceRule,
  type RecurrenceWeekday,
}
