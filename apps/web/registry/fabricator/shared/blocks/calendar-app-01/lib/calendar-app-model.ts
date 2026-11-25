import {
  type CalendarAppEvent,
  type CalendarAppGuest,
  type CalendarAppResponse,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  formatEventDay,
  formatEventTime,
  formatEventTimeRange,
  getEventTimes,
  isAllDayEvent,
  setEventTimes,
  toZoned,
  type EventCalendarChange,
  type EventCalendarHourCycle,
  type EventCalendarRange,
  type EventCalendarView,
  type EventCalendarWeekday,
} from "@/registry/bases/__base__/lib/event-calendar-model"

// The calendar app's rules, free of React and of the clock: what is next,
// what overlaps, what your answer is and how much of a title a chip shows.

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** You can still join a meeting this long after it starts. */
const LATE_JOIN = 10 * MINUTE

/** Past this, a start is a time of day instead of a countdown. */
const COUNTDOWN = 4 * HOUR

type FormatOptions = {
  locale: string
  /** The device's zone when left out, as in the calendar. */
  timeZone?: string
  hourCycle: EventCalendarHourCycle
}

// --- Answers -------------------------------------------------------------------

/** Answers given here, by event (a whole series for a repeating one). */
export type CalendarAppResponses = Record<string, CalendarAppResponse>

export type CalendarAppResponseSummary = Record<
  CalendarAppResponse | "awaiting",
  number
>

export const CALENDAR_APP_RESPONSE_LABELS = {
  yes: "Going",
  maybe: "Maybe",
  no: "Declined",
  awaiting: "No reply",
} satisfies Record<keyof CalendarAppResponseSummary, string>

/** What an answer is stored under: the series of a repeating event. */
export function getResponseKey(
  event: Pick<CalendarAppEvent, "id" | "recurringEventId">
) {
  return event.recurringEventId ?? event.id
}

function getYou(event: CalendarAppEvent) {
  return event.data?.guests?.find((guest) => guest.isYou)
}

/** Your answer to an event: the one given here, or the one it came with. */
export function getYourResponse(
  event: CalendarAppEvent,
  responses: CalendarAppResponses
): CalendarAppResponse | undefined {
  const you = getYou(event)
  if (!you) return undefined
  return responses[getResponseKey(event)] ?? you.response
}

/**
 * The answer an event's chip shows. Your own events and those you aren't
 * invited to are solid, like the ones you accepted.
 */
export function getChipResponse(
  event: CalendarAppEvent,
  responses: CalendarAppResponses
): CalendarAppResponse | "awaiting" {
  const you = getYou(event)
  if (!you || you.isOrganizer) return "yes"
  return getYourResponse(event, responses) ?? "awaiting"
}

export function summarizeResponses(guests: CalendarAppGuest[]) {
  const summary: CalendarAppResponseSummary = {
    yes: 0,
    maybe: 0,
    no: 0,
    awaiting: 0,
  }
  for (const guest of guests) summary[guest.response ?? "awaiting"] += 1
  return summary
}

/** "3 going, 1 declined, 2 no reply": the answers someone gave, in order. */
export function describeResponses(summary: CalendarAppResponseSummary) {
  const parts = [
    [summary.yes, "going"],
    [summary.maybe, "maybe"],
    [summary.no, "declined"],
    [summary.awaiting, "no reply"],
  ] as const
  return parts
    .filter(([count]) => count > 0)
    .map(([count, label]) => `${count} ${label}`)
    .join(", ")
}

/** The guest list with your own answer in it. */
export function withYourResponse(
  guests: CalendarAppGuest[],
  response: CalendarAppResponse | undefined
) {
  if (!response) return guests
  return guests.map((guest) => (guest.isYou ? { ...guest, response } : guest))
}

const RESPONSE_ORDER = ["yes", "maybe", "awaiting", "no"] as const

/** The organizer first, then who is going, might go, hasn't said and isn't. */
export function orderGuests(guests: CalendarAppGuest[]) {
  const rank = (guest: CalendarAppGuest) =>
    guest.isOrganizer
      ? -1
      : RESPONSE_ORDER.indexOf(guest.response ?? "awaiting")
  return guests.toSorted((a, b) => rank(a) - rank(b))
}

// --- Up next -------------------------------------------------------------------

type ScheduleInput = {
  events: CalendarAppEvent[]
  responses: CalendarAppResponses
  /** The calendars that hold your own time. */
  calendarIds: ReadonlySet<string>
  timeZone?: string
}

/** Whether an event takes your time: timed, on a calendar of yours, not declined. */
function isOnYourTime(
  event: CalendarAppEvent,
  { responses, calendarIds }: Pick<ScheduleInput, "responses" | "calendarIds">
) {
  if (isAllDayEvent(event)) return false
  const isYours =
    (event.calendarId !== undefined && calendarIds.has(event.calendarId)) ||
    getYou(event) !== undefined
  return isYours && getYourResponse(event, responses) !== "no"
}

/** The next thing to be at, or the one that just started. */
export function getUpNext({
  events,
  now,
  timeZone,
  ...rules
}: ScheduleInput & { now: Date }): CalendarAppEvent | undefined {
  let next: { event: CalendarAppEvent; start: number } | undefined
  for (const event of events) {
    if (!isOnYourTime(event, rules)) continue
    const times = getEventTimes(event, timeZone)
    const start = +times.start
    if (start < +now - LATE_JOIN || +times.end <= +now) continue
    if (!next || start < next.start) next = { event, start }
  }
  return next?.event
}

function getDayNumber(date: Date, timeZone: string | undefined) {
  const zoned = toZoned(date, timeZone)
  return Math.round(
    Date.UTC(zoned.getFullYear(), zoned.getMonth(), zoned.getDate()) / DAY
  )
}

/** "in 12 min", "started 4 min ago", "at 5:30 PM", "tomorrow at 9:30 AM". */
export function describeStartsIn(
  event: CalendarAppEvent,
  now: Date,
  { locale, timeZone, hourCycle }: FormatOptions
) {
  const { start } = getEventTimes(event, timeZone)
  const wait = +start - +now
  if (wait <= -MINUTE) return `started ${Math.floor(-wait / MINUTE)} min ago`
  if (wait <= 0) return "now"

  const minutes = Math.ceil(wait / MINUTE)
  if (minutes < 60) return `in ${minutes} min`
  if (wait < COUNTDOWN) {
    const hours = Math.floor(minutes / 60)
    const rest = minutes % 60
    return rest === 0 ? `in ${hours} hr` : `in ${hours} hr ${rest} min`
  }

  const time = formatEventTime(start, { locale, timeZone, hourCycle })
  const days = getDayNumber(start, timeZone) - getDayNumber(now, timeZone)
  if (days === 0) return `at ${time}`
  if (days === 1) return `tomorrow at ${time}`
  const day = new Intl.DateTimeFormat(locale, {
    timeZone,
    ...(days < 7 ? { weekday: "long" } : { month: "long", day: "numeric" }),
  }).format(start)
  return `${day} at ${time}`
}

export function isEventOver(
  event: CalendarAppEvent,
  now: Date,
  timeZone?: string
) {
  return +getEventTimes(event, timeZone).end <= +now
}

/** When a reminder comes, in minutes before the event. */
export const CALENDAR_APP_REMINDERS = [
  { value: "0", label: "At the start" },
  { value: "5", label: "5 min before" },
  { value: "10", label: "10 min before" },
  { value: "15", label: "15 min before" },
  { value: "30", label: "30 min before" },
  { value: "60", label: "1 hr before" },
  { value: "1440", label: "1 day before" },
] as const

// --- Conflicts -----------------------------------------------------------------

/** The events of yours that overlap one, in order. */
export function findConflicts({
  event,
  events,
  timeZone,
  ...rules
}: ScheduleInput & { event: CalendarAppEvent }) {
  if (!isOnYourTime(event, rules)) return []
  const times = getEventTimes(event, timeZone)
  return events.filter((other) => {
    if (other.id === event.id || !isOnYourTime(other, rules)) return false
    const otherTimes = getEventTimes(other, timeZone)
    return otherTimes.start < times.end && otherTimes.end > times.start
  })
}

/** Where the whole event fits later the same day, or nothing if it doesn't. */
export function getNextFreeStart({
  event,
  events,
  slotMinutes,
  timeZone,
  ...rules
}: ScheduleInput & {
  event: CalendarAppEvent
  slotMinutes: number
}): Date | undefined {
  const times = getEventTimes(event, timeZone)
  const length = +times.end - +times.start
  const day = getDayNumber(times.start, timeZone)
  for (
    let start = +times.start + slotMinutes * MINUTE;
    getDayNumber(new Date(start + length - 1), timeZone) === day;
    start += slotMinutes * MINUTE
  ) {
    const moved = setEventTimes(
      event,
      {
        start: new Date(start),
        end: new Date(start + length),
        allDay: false,
      },
      timeZone
    )
    const conflicts = findConflicts({
      event: moved,
      events,
      timeZone,
      ...rules,
    })
    if (conflicts.length === 0) return new Date(start)
  }
  return undefined
}

// --- Changes -------------------------------------------------------------------

/**
 * Where "Create event" puts its draft: the next slot from now when now is in
 * view, otherwise 9:00 on the day in focus (the one picked in the month).
 */
export function getCreateRange({
  now,
  range,
  day,
  slotMinutes,
  eventMinutes,
}: {
  now: Date
  range: EventCalendarRange
  day: Date
  slotMinutes: number
  eventMinutes: number
}) {
  const slot = slotMinutes * MINUTE
  const isInView = +now >= +range.start && +now < +range.end
  const base = isInView
    ? now
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9)
  const start = new Date(Math.ceil(+base / slot) * slot)
  return { start, end: new Date(+start + eventMinutes * MINUTE) }
}

/**
 * The event the details panel shows after a change: the one just created, the
 * edited version, the occurrence stored on its own after a "this event" edit,
 * or nothing once it (or its whole series) is deleted.
 */
export function getNextSelection(
  selected: CalendarAppEvent | undefined,
  change: EventCalendarChange<CalendarAppEvent["data"]>
): CalendarAppEvent | undefined {
  if (change.reason === "create" || change.reason === "duplicate") {
    return change.created[0] ?? selected
  }
  if (!selected) return undefined
  const ids = new Set([selected.id, selected.recurringEventId])
  const isDeleted =
    change.deleted.some((event) => ids.has(event.id)) ||
    (change.reason === "delete" && change.event.id === selected.id)
  if (isDeleted) return undefined

  const updated = change.updated.find((event) => event.id === selected.id)
  if (updated) return updated

  const detached = change.created.find(
    (event) =>
      selected.recurringEventId !== undefined &&
      event.recurringEventId === selected.recurringEventId &&
      event.originalStart === selected.originalStart
  )
  return detached ?? selected
}

// --- Words and shapes ----------------------------------------------------------

/**
 * "Tuesday, November 17" and "2:00 – 3:30 PM"; an all-day event over several
 * days has its first and last in `day`.
 */
export function describeEventWhen(
  event: CalendarAppEvent,
  options: FormatOptions
) {
  const times = getEventTimes(event, options.timeZone)
  const formatDay = (date: Date) => formatEventDay(date, options)
  const firstDay = formatDay(times.start)
  // Says "All day" without a range to give.
  const time = formatEventTimeRange(times, options)
  if (!times.allDay) return { day: firstDay, time }
  // The end is exclusive: an event on the 18th and 19th ends on the 20th.
  const lastDay = formatDay(new Date(+times.end - 1))
  const day = firstDay === lastDay ? firstDay : `${firstDay} – ${lastDay}`
  return { day, time }
}

// A time-grid block as the calendar draws it at the default density: 72px an
// hour, 12px of padding and gap, 16.5px a line.
const PIXELS_PER_MINUTE = 1.2
const CHIP_INSET = 12
const CHIP_LINE = 16.5

/** How many lines of title fit in a block this long. */
export function getChipLines(minutes: number) {
  if (minutes < 30) return 1
  // Half an hour centres its lines, so two fit without the top margin.
  if (minutes < 45) return 2
  return Math.floor((minutes * PIXELS_PER_MINUTE - CHIP_INSET) / CHIP_LINE)
}

/** The view on screen: a phone opens on the day and has no seven columns. */
export function getShownView(
  chosen: EventCalendarView | undefined,
  isPhone: boolean
): EventCalendarView {
  if (!chosen) return isPhone ? "day" : "week"
  if (isPhone && chosen === "week") return "days"
  if (!isPhone && chosen === "days") return "week"
  return chosen
}

/**
 * The period in the page's title. A phone has its days in the week strip, so
 * it names the month alone, with the year once it isn't this one.
 */
export function getPeriodTitle({
  title,
  view,
  range,
  now,
  isPhone,
  locale,
  timeZone,
}: {
  title: string
  view: EventCalendarView
  range: EventCalendarRange
  now: Date
  isPhone: boolean
  locale: string
  timeZone?: string
}) {
  if (!isPhone) return title
  // A month's grid starts in the month before.
  const day =
    view === "month" ? new Date((+range.start + +range.end) / 2) : range.start
  const isThisYear =
    toZoned(day, timeZone).getFullYear() ===
    toZoned(now, timeZone).getFullYear()
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    month: "long",
    ...(isThisYear ? {} : { year: "numeric" }),
  }).format(day)
}

/**
 * How many columns into a bar its label goes. A grid that scrolls by day draws
 * `buffer` columns before the first one on screen, and a bar that started
 * earlier would keep its label out of sight there.
 */
export function getLabelColumn({
  start,
  rangeStart,
  buffer,
  showWeekends,
}: {
  start: Date
  rangeStart: Date
  buffer: number
  showWeekends: boolean
}) {
  let columns = 0
  const day = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  while (day < rangeStart && columns < buffer) {
    const isWeekend = day.getDay() === 0 || day.getDay() === 6
    if (showWeekends || !isWeekend) columns += 1
    day.setDate(day.getDate() + 1)
  }
  return columns
}

/** The seven days of the week around a day, at midnight. */
export function getStripDays(day: Date, weekStartsOn: EventCalendarWeekday) {
  const back = (day.getDay() - weekStartsOn + 7) % 7
  return Array.from(
    { length: 7 },
    (_, index) =>
      new Date(day.getFullYear(), day.getMonth(), day.getDate() - back + index)
  )
}
