import {
  type CalendarAppEvent,
  type CalendarAppGuest,
  type CalendarAppResponse,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  formatEventDay,
  formatEventTimeRange,
  getEventTimes,
  type EventCalendarChange,
  type EventCalendarHourCycle,
  type EventCalendarRange,
} from "@/registry/bases/__base__/lib/event-calendar-model"

export type CalendarAppResponseSummary = Record<
  CalendarAppResponse | "awaiting",
  number
>

export const CALENDAR_APP_RESPONSE_LABELS = {
  yes: "Going",
  maybe: "Maybe",
  no: "Declined",
  awaiting: "Awaiting reply",
} satisfies Record<keyof CalendarAppResponseSummary, string>

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

/** "3 going, 1 declined, 2 awaiting": the answers someone gave, in order. */
export function describeResponses(summary: CalendarAppResponseSummary) {
  const parts = [
    [summary.yes, "going"],
    [summary.maybe, "maybe"],
    [summary.no, "declined"],
    [summary.awaiting, "awaiting"],
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
  const slot = slotMinutes * 60_000
  const isInView = +now >= +range.start && +now < +range.end
  const base = isInView
    ? now
    : new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9)
  const start = new Date(Math.ceil(+base / slot) * slot)
  return { start, end: new Date(+start + eventMinutes * 60_000) }
}

/**
 * The event the details panel shows after a change: the edited version, the
 * occurrence stored on its own after a "this event" edit, or nothing once it
 * (or its whole series) is deleted.
 */
export function getNextSelection(
  selected: CalendarAppEvent | undefined,
  change: EventCalendarChange<CalendarAppEvent["data"]>
): CalendarAppEvent | undefined {
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

/**
 * "Tuesday, November 17 · 2:00 – 3:30 PM", "Friday, November 20 · All day",
 * or the first and last day of an all-day event over several days.
 */
export function describeEventWhen(
  event: CalendarAppEvent,
  options: {
    locale: string
    /** The device's zone when left out, as in the calendar. */
    timeZone?: string
    hourCycle: EventCalendarHourCycle
  }
) {
  const times = getEventTimes(event, options.timeZone)
  const formatDay = (date: Date) => formatEventDay(date, options)
  const firstDay = formatDay(times.start)
  if (!times.allDay) {
    return `${firstDay} · ${formatEventTimeRange(times, options)}`
  }
  // The end is exclusive: an event on the 18th and 19th ends on the 20th.
  const lastDay = formatDay(new Date(+times.end - 1))
  return firstDay === lastDay
    ? `${firstDay} · All day`
    : `${firstDay} – ${lastDay}`
}
