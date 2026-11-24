import { describe, expect, it } from "vitest"

import {
  CALENDAR_APP_CALENDARS,
  CALENDAR_APP_COLLEAGUES,
  createCalendarAppEvents,
  getWeekStart,
  toWallTime,
} from "@/registry/fabricator/shared/blocks/calendar-app-01/lib/calendar-app-events"
import { expandEvents } from "@/registry/fabricator/shared/lib/event-calendar-recurrence"

// Tuesday 24 November 2026, 10:48 local time.
const NOW = new Date(2026, 10, 24, 10, 48)

describe("getWeekStart", () => {
  it("goes back to Monday at midnight", () => {
    expect(getWeekStart(NOW)).toEqual(new Date(2026, 10, 23))
  })

  it("keeps a Monday", () => {
    expect(getWeekStart(new Date(2026, 10, 23, 23, 59))).toEqual(
      new Date(2026, 10, 23)
    )
  })

  it("puts a Sunday in the week that started the Monday before", () => {
    expect(getWeekStart(new Date(2026, 10, 29, 8))).toEqual(
      new Date(2026, 10, 23)
    )
  })
})

describe("toWallTime", () => {
  it("writes a wall time without an offset", () => {
    expect(toWallTime(new Date(2026, 10, 16), "09:30")).toBe(
      "2026-11-16T09:30:00"
    )
  })

  it("writes a date alone for an all-day event", () => {
    expect(toWallTime(new Date(2026, 0, 5))).toBe("2026-01-05")
  })
})

describe("createCalendarAppEvents", () => {
  const events = createCalendarAppEvents(NOW)
  const weekStart = toWallTime(new Date(2026, 10, 23))
  const weekEnd = toWallTime(new Date(2026, 10, 30))
  const thisWeek = events.filter(
    ({ start, recurrence }) =>
      !recurrence && start >= weekStart && start < weekEnd
  )

  it("gives every event a unique id and a known calendar", () => {
    const ids = new Set(events.map((event) => event.id))
    const calendars = new Set(
      [...CALENDAR_APP_CALENDARS, ...CALENDAR_APP_COLLEAGUES].map(
        ({ id }) => id
      )
    )
    expect(ids.size).toBe(events.length)
    for (const event of events) {
      expect(calendars.has(event.calendarId ?? "")).toBe(true)
    }
  })

  it("gives every event a place, notes, a reminder and guests", () => {
    for (const event of events) {
      expect(event.location, event.id).toBeTruthy()
      expect(event.description, event.id).toBeTruthy()
      expect(event.data?.reminderMinutes, event.id).toBeGreaterThanOrEqual(0)
      expect(event.data?.guests?.length, event.id).toBeGreaterThan(0)
    }
  })

  it("gives every timed work event a video link", () => {
    const work = events.filter(
      ({ calendarId, start }) =>
        calendarId !== "personal" && start.includes("T")
    )
    for (const event of work) {
      expect(event.data?.conference?.url, event.id).toMatch(/^https:/)
    }
  })

  it("fills every day of the week of now", () => {
    const days = new Set(thisWeek.map(({ start }) => start.slice(0, 10)))
    expect(days.size).toBe(7)
  })

  it("has an invitation in every state of an answer", () => {
    const answers = new Set(
      thisWeek.flatMap(({ data }) =>
        (data?.guests ?? [])
          .filter((guest) => guest.isYou)
          .map((guest) => guest.response ?? "awaiting")
      )
    )
    expect(answers).toEqual(new Set(["yes", "maybe", "no", "awaiting"]))
  })

  it("overlaps once in the week, series included", () => {
    const shown = new Set(CALENDAR_APP_CALENDARS.map(({ id }) => id))
    const week = expandEvents(events, {
      start: new Date(2026, 10, 23),
      end: new Date(2026, 10, 30),
    }).filter(
      ({ start, calendarId }) =>
        start.includes("T") && shown.has(calendarId ?? "")
    )
    const overlaps = week.flatMap((a) =>
      week
        .filter((b) => a.start < b.start && b.start < a.end)
        .map((b) => [a.title, b.title])
    )
    expect(overlaps).toEqual([["All hands", "Yoga"]])
  })

  it("is the same for the same moment", () => {
    expect(createCalendarAppEvents(NOW)).toEqual(events)
  })
})
