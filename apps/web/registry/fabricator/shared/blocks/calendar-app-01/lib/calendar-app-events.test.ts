import { describe, expect, it } from "vitest"

import {
  CALENDAR_APP_CALENDARS,
  createCalendarAppEvents,
  getWeekStart,
  toWallTime,
} from "@/registry/fabricator/shared/blocks/calendar-app-01/lib/calendar-app-events"

// Wednesday 18 November 2026, 10:24 local time.
const NOW = new Date(2026, 10, 18, 10, 24)

describe("getWeekStart", () => {
  it("goes back to Monday at midnight", () => {
    expect(getWeekStart(NOW)).toEqual(new Date(2026, 10, 16))
  })

  it("keeps a Monday", () => {
    expect(getWeekStart(new Date(2026, 10, 16, 23, 59))).toEqual(
      new Date(2026, 10, 16)
    )
  })

  it("puts a Sunday in the week that started the Monday before", () => {
    expect(getWeekStart(new Date(2026, 10, 22, 8))).toEqual(
      new Date(2026, 10, 16)
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
  const weekStart = toWallTime(new Date(2026, 10, 16))
  const weekEnd = toWallTime(new Date(2026, 10, 23))

  it("gives every event a unique id and a known calendar", () => {
    const ids = new Set(events.map((event) => event.id))
    const calendars = new Set(CALENDAR_APP_CALENDARS.map(({ id }) => id))
    expect(ids.size).toBe(events.length)
    for (const event of events) {
      expect(calendars.has(event.calendarId ?? "")).toBe(true)
    }
  })

  it("places one-off events in the week of now", () => {
    for (const event of events.filter(({ recurrence }) => !recurrence)) {
      expect(event.start >= weekStart && event.start < weekEnd).toBe(true)
    }
  })

  it("has a multi-day all-day event and an all-day holiday", () => {
    const allDay = events.filter((event) => !event.start.includes("T"))
    expect(allDay.some((event) => event.calendarId === "holidays")).toBe(true)
    expect(
      allDay.some(
        (event) =>
          new Date(event.end).getTime() - new Date(event.start).getTime() >
          86_400_000
      )
    ).toBe(true)
  })

  it("has meetings that overlap on the same day", () => {
    const timed = events.filter(
      (event) => event.start.includes("T") && !event.recurrence
    )
    const overlaps = timed.some((a) =>
      timed.some(
        (b) =>
          a.id !== b.id &&
          a.start.slice(0, 10) === b.start.slice(0, 10) &&
          a.start < b.end &&
          b.start < a.end
      )
    )
    expect(overlaps).toBe(true)
  })

  it("is the same for the same moment", () => {
    expect(createCalendarAppEvents(NOW)).toEqual(events)
  })
})
