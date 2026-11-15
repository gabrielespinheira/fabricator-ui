import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { roleLiterals, roleMaxChroma } from "@/registry/fabricator/color-roles"
import {
  applyEventChange,
  createEventChange,
  createEventDraft,
  EVENT_CALENDAR_COLORS,
  formatEventDate,
  formatEventTimeRange,
  formatViewTitle,
  fromWallParts,
  getColumnCount,
  getContinuityBuffer,
  getContinuousRange,
  getContinuousWindow,
  getDayBand,
  getEventColorVariables,
  getEventTimes,
  getKeyboardNudge,
  getShortcut,
  getViewLabel,
  getViewRange,
  getVisibleDays,
  getWallParts,
  groupEventsByDay,
  invertEventChange,
  isEventCalendarView,
  isTimeGridView,
  moveCursor,
  nudgeEvent,
  parseEventDate,
  resolveBusinessHours,
  resolveEventColor,
  setEventTimes,
  shiftViewDate,
  toEventCalendarWeekday,
  type CalendarEvent,
} from "@/registry/fabricator/shared/lib/event-calendar-model"

const LISBON = "Europe/Lisbon"
const NEW_YORK = "America/New_York"

const iso = (date: Date) => new Date(+date).toISOString()
// Intl spaces its ranges with thin and narrow spaces.
const plain = (text: string) => text.replace(/\s/g, " ")

function event(patch: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "standup",
    title: "Standup",
    start: "2026-11-18T10:00:00",
    end: "2026-11-18T10:30:00",
    ...patch,
  }
}

describe("parseEventDate", () => {
  it("reads a date without a zone as wall time in the calendar's zone", () => {
    expect(iso(parseEventDate("2026-11-18T10:00:00", NEW_YORK))).toBe(
      "2026-11-18T15:00:00.000Z"
    )
    expect(iso(parseEventDate("2026-07-18T10:00", LISBON))).toBe(
      "2026-07-18T09:00:00.000Z"
    )
  })

  it("reads an offset or Z as an instant", () => {
    expect(iso(parseEventDate("2026-11-18T10:00:00+02:00", NEW_YORK))).toBe(
      "2026-11-18T08:00:00.000Z"
    )
    expect(iso(parseEventDate("2026-11-18T10:00:00Z", NEW_YORK))).toBe(
      "2026-11-18T10:00:00.000Z"
    )
  })

  it("reads a date only as midnight in the zone", () => {
    expect(iso(parseEventDate("2026-11-18", NEW_YORK))).toBe(
      "2026-11-18T05:00:00.000Z"
    )
  })

  it("reads wall times around a clock change", () => {
    const times = [
      "2026-03-28T23:30:00",
      "2026-03-29T00:30:00",
      "2026-03-29T02:30:00",
      "2026-03-30T00:30:00",
      "2026-10-25T00:30:00",
      "2026-10-25T03:00:00",
      "2026-10-26T09:15:00",
    ]
    expect(times.map((time) => iso(parseEventDate(time, LISBON)))).toEqual([
      "2026-03-28T23:30:00.000Z",
      "2026-03-29T00:30:00.000Z",
      "2026-03-29T01:30:00.000Z",
      "2026-03-29T23:30:00.000Z",
      "2026-10-24T23:30:00.000Z",
      "2026-10-25T03:00:00.000Z",
      "2026-10-26T09:15:00.000Z",
    ])
  })

  it("throws on what isn't a date", () => {
    expect(() => parseEventDate("tomorrow", LISBON)).toThrow(
      /Not an ISO 8601 date/
    )
  })
})

describe("wall parts", () => {
  it("splits an instant into the zone's date and time and back", () => {
    const instant = new Date("2026-11-18T15:30:00Z")
    const parts = getWallParts(instant, NEW_YORK)
    expect(parts).toEqual({ year: 2026, month: 11, day: 18, time: "10:30" })
    expect(+fromWallParts(parts, NEW_YORK)).toBe(+instant)
    expect(
      iso(
        fromWallParts({ year: 2026, month: 7, day: 1, time: "09:00" }, LISBON)
      )
    ).toBe("2026-07-01T08:00:00.000Z")
  })
})

describe("formatEventDate", () => {
  const instant = new Date("2026-11-18T15:30:00.000Z")

  it("writes each style back", () => {
    expect(formatEventDate(instant, "date", NEW_YORK)).toBe("2026-11-18")
    expect(formatEventDate(instant, "local", NEW_YORK)).toBe(
      "2026-11-18T10:30:00"
    )
    expect(formatEventDate(instant, "offset", NEW_YORK)).toBe(
      "2026-11-18T10:30:00-05:00"
    )
    expect(formatEventDate(instant, "utc", NEW_YORK)).toBe(
      "2026-11-18T15:30:00Z"
    )
  })
})

describe("getEventTimes and setEventTimes", () => {
  it("treats date-only events as all-day", () => {
    const times = getEventTimes(
      event({ start: "2026-11-18", end: "2026-11-19" }),
      LISBON
    )
    expect(times.allDay).toBe(true)
    expect(iso(times.start)).toBe("2026-11-18T00:00:00.000Z")
  })

  it("keeps the event's own date style when it moves", () => {
    const withOffset = event({
      start: "2026-11-18T10:00:00-05:00",
      end: "2026-11-18T10:30:00-05:00",
    })
    const moved = setEventTimes(
      withOffset,
      {
        start: new Date("2026-11-19T16:00:00Z"),
        end: new Date("2026-11-19T16:30:00Z"),
        allDay: false,
      },
      NEW_YORK
    )
    expect(moved.start).toBe("2026-11-19T11:00:00-05:00")
    expect(moved.end).toBe("2026-11-19T11:30:00-05:00")

    const local = setEventTimes(
      event(),
      {
        start: new Date("2026-11-19T16:00:00Z"),
        end: new Date("2026-11-19T16:30:00Z"),
        allDay: false,
      },
      NEW_YORK
    )
    expect(local.start).toBe("2026-11-19T11:00:00")
  })

  it("writes dates only for all-day and drops the flag's guesswork", () => {
    const allDay = setEventTimes(
      event(),
      {
        start: parseEventDate("2026-11-20", LISBON),
        end: parseEventDate("2026-11-21", LISBON),
        allDay: true,
      },
      LISBON
    )
    expect(allDay).toMatchObject({
      start: "2026-11-20",
      end: "2026-11-21",
      allDay: true,
    })
  })
})

describe("getViewRange", () => {
  const date = parseEventDate("2026-11-18T15:00:00", LISBON)
  const options = { days: 4, weekStartsOn: 0 as const, timeZone: LISBON }
  const range = (view: Parameters<typeof getViewRange>[0]) => {
    const { start, end } = getViewRange(view, date, options)
    return [
      formatEventDate(start, "date", LISBON),
      formatEventDate(end, "date", LISBON),
    ]
  }

  it("covers each view", () => {
    expect(range("day")).toEqual(["2026-11-18", "2026-11-19"])
    expect(range("days")).toEqual(["2026-11-18", "2026-11-22"])
    expect(range("week")).toEqual(["2026-11-15", "2026-11-22"])
    expect(range("month")).toEqual(["2026-11-01", "2026-12-06"])
    expect(range("agenda")).toEqual(["2026-11-18", "2026-12-18"])
  })

  it("starts the week on the setting's day", () => {
    const { start } = getViewRange("week", date, {
      ...options,
      weekStartsOn: 1,
    })
    expect(formatEventDate(start, "date", LISBON)).toBe("2026-11-16")
  })
})

describe("continuity", () => {
  const day = (value: string) => parseEventDate(value, LISBON)
  const key = (date: Date) => formatEventDate(date, "date", LISBON)

  it("draws half a page either side, three days at least", () => {
    expect(getContinuityBuffer(1)).toBe(3)
    expect(getContinuityBuffer(4)).toBe(3)
    expect(getContinuityBuffer(7)).toBe(4)
  })

  it("counts the columns a time grid shows", () => {
    expect(getColumnCount("day", 4, true)).toBe(1)
    expect(getColumnCount("days", 4, true)).toBe(4)
    expect(getColumnCount("week", 4, true)).toBe(7)
    expect(getColumnCount("week", 4, false)).toBe(5)
  })

  it("starts a range on any day and spans its columns", () => {
    const range = getContinuousRange(day("2026-11-18T15:00:00"), 7, {
      showWeekends: true,
      timeZone: LISBON,
    })
    expect([key(range.start), key(range.end)]).toEqual([
      "2026-11-18",
      "2026-11-25",
    ])
  })

  it("skips weekends when they're hidden", () => {
    const range = getContinuousRange(day("2026-11-21"), 5, {
      showWeekends: false,
      timeZone: LISBON,
    })
    // Saturday moves to Monday; five weekdays end on Friday.
    expect([key(range.start), key(range.end)]).toEqual([
      "2026-11-23",
      "2026-11-28",
    ])
  })

  it("lays out a window with columns to scroll into either side", () => {
    const window = getContinuousWindow(day("2026-11-18"), 4, {
      buffer: 2,
      showWeekends: true,
      timeZone: LISBON,
    })
    expect(window.dates.map(key)).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
      "2026-11-23",
    ])
    expect(window.first).toBe(2)
    expect([key(window.start), key(window.end)]).toEqual([
      "2026-11-16",
      "2026-11-24",
    ])
  })

  it("keeps a window to weekdays when weekends are hidden", () => {
    const window = getContinuousWindow(day("2026-11-23"), 1, {
      buffer: 2,
      showWeekends: false,
      timeZone: LISBON,
    })
    expect(window.dates.map(key)).toEqual([
      "2026-11-19",
      "2026-11-20",
      "2026-11-23",
      "2026-11-24",
      "2026-11-25",
    ])
    expect(window.first).toBe(2)
  })

  it("steps across a clock change by calendar days", () => {
    const window = getContinuousWindow(day("2026-10-25"), 1, {
      buffer: 1,
      showWeekends: true,
      timeZone: LISBON,
    })
    expect(window.dates.map(key)).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
    ])
  })
})

describe("getVisibleDays", () => {
  const options = { days: 4, weekStartsOn: 0 as const, timeZone: LISBON }
  const days = (view: Parameters<typeof getViewRange>[0], day: string) => {
    const date = parseEventDate(day, LISBON)
    const { first, last } = getVisibleDays(
      view,
      date,
      getViewRange(view, date, options),
      LISBON
    )
    return [
      formatEventDate(first, "date", LISBON),
      formatEventDate(last, "date", LISBON),
    ]
  }

  it("gives the first and last day a view shows", () => {
    expect(days("day", "2026-11-18")).toEqual(["2026-11-18", "2026-11-18"])
    expect(days("days", "2026-11-18")).toEqual(["2026-11-18", "2026-11-21"])
    expect(days("week", "2026-11-18")).toEqual(["2026-11-15", "2026-11-21"])
    expect(days("agenda", "2026-11-18")).toEqual(["2026-11-18", "2026-12-17"])
  })

  it("keeps a month to its own days, not the weeks around it", () => {
    expect(days("month", "2026-11-18")).toEqual(["2026-11-01", "2026-11-30"])
  })

  it("ends on the last day across a clock change", () => {
    expect(days("week", "2026-10-28")).toEqual(["2026-10-25", "2026-10-31"])
  })
})

describe("getDayBand", () => {
  const visible = {
    first: parseEventDate("2026-11-18", LISBON),
    last: parseEventDate("2026-11-24", LISBON),
  }
  const band = (day: string) =>
    getDayBand(parseEventDate(day, LISBON), visible, 0, LISBON)

  it("marks the days in view, with ends on the first and last", () => {
    expect(band("2026-11-17")).toEqual({
      isInView: false,
      isStart: false,
      isEnd: false,
    })
    expect(band("2026-11-18")).toEqual({
      isInView: true,
      isStart: true,
      isEnd: false,
    })
    expect(band("2026-11-20")).toEqual({
      isInView: true,
      isStart: false,
      isEnd: false,
    })
    expect(band("2026-11-24")).toEqual({
      isInView: true,
      isStart: false,
      isEnd: true,
    })
  })

  it("ends and restarts the band at the week's edges", () => {
    expect(band("2026-11-21").isEnd).toBe(true)
    expect(band("2026-11-22").isStart).toBe(true)
    const monday = getDayBand(
      parseEventDate("2026-11-23", LISBON),
      visible,
      1,
      LISBON
    )
    expect(monday.isStart).toBe(true)
  })
})

describe("shiftViewDate", () => {
  const date = parseEventDate("2026-01-31T09:00:00", LISBON)
  const shift = (view: Parameters<typeof shiftViewDate>[0], step: 1 | -1) =>
    formatEventDate(
      shiftViewDate(view, date, step, { days: 4, timeZone: LISBON }),
      "date",
      LISBON
    )

  it("moves by the view's length", () => {
    expect(shift("day", 1)).toBe("2026-02-01")
    expect(shift("days", -1)).toBe("2026-01-27")
    expect(shift("week", 1)).toBe("2026-02-07")
    expect(shift("month", 1)).toBe("2026-02-28")
  })
})

describe("formatViewTitle", () => {
  const title = (view: Parameters<typeof getViewRange>[0], day: string) => {
    const range = getViewRange(view, parseEventDate(day, LISBON), {
      days: 4,
      weekStartsOn: 0,
      timeZone: LISBON,
    })
    return plain(
      formatViewTitle(view, range, { locale: "en-US", timeZone: LISBON })
    )
  }

  it("names the period as a calendar app does", () => {
    expect(title("day", "2026-11-18")).toBe("November 18, 2026")
    expect(title("week", "2026-11-18")).toBe("November 2026")
    expect(title("month", "2026-11-18")).toBe("November 2026")
  })

  it("names both months when a week spans them", () => {
    expect(title("week", "2026-12-01")).toBe("Nov – Dec 2026")
    expect(title("days", "2026-12-30")).toBe("Dec 2026 – Jan 2027")
  })
})

describe("formatEventTimeRange", () => {
  it("formats in the hour cycle asked for", () => {
    const times = getEventTimes(event(), LISBON)
    expect(
      plain(
        formatEventTimeRange(times, {
          locale: "en-US",
          timeZone: LISBON,
          hourCycle: "h23",
        })
      )
    ).toBe("10:00 – 10:30")
    expect(
      formatEventTimeRange(times, {
        locale: "en-US",
        timeZone: LISBON,
        hourCycle: "h12",
      }).replace(/\s/g, " ")
    ).toBe("10:00 – 10:30 AM")
  })

  it("says all day for all-day events", () => {
    const times = getEventTimes(
      event({ start: "2026-11-18", end: "2026-11-19" }),
      LISBON
    )
    expect(
      formatEventTimeRange(times, {
        locale: "en-US",
        timeZone: LISBON,
        hourCycle: "h23",
      })
    ).toBe("All day")
  })
})

describe("keyboard", () => {
  it("nudges by the slot in time grids and by days in month", () => {
    expect(getKeyboardNudge("ArrowDown", {}, "week", 15)).toEqual({
      minutes: 15,
      days: 0,
      resize: false,
    })
    expect(getKeyboardNudge("ArrowLeft", {}, "day", 15)).toEqual({
      minutes: 0,
      days: -1,
      resize: false,
    })
    expect(getKeyboardNudge("ArrowUp", { shiftKey: true }, "week", 30)).toEqual(
      { minutes: -30, days: 0, resize: true }
    )
    expect(getKeyboardNudge("ArrowDown", {}, "month", 15)).toEqual({
      minutes: 0,
      days: 7,
      resize: false,
    })
    expect(getKeyboardNudge("a", {}, "week", 15)).toBeNull()
  })

  it("moves an event and keeps its wall time across a DST change", () => {
    const sunday = event({
      start: "2026-10-24T10:00:00",
      end: "2026-10-24T11:00:00",
    })
    const next = nudgeEvent(
      sunday,
      { minutes: 0, days: 1, resize: false },
      LISBON
    )
    expect(next).toMatchObject({
      start: "2026-10-25T10:00:00",
      end: "2026-10-25T11:00:00",
    })
  })

  it("resizes from the end and never below one slot", () => {
    const next = nudgeEvent(
      event(),
      { minutes: -15, days: 0, resize: true },
      LISBON,
      15
    )
    expect(next.end).toBe("2026-11-18T10:15:00")
    const floor = nudgeEvent(
      next,
      { minutes: -15, days: 0, resize: true },
      LISBON,
      15
    )
    expect(floor.end).toBe("2026-11-18T10:15:00")
  })

  it("moves the cursor by slot and by day", () => {
    const start = parseEventDate("2026-11-18T10:00:00", LISBON)
    const next = moveCursor(start, "ArrowDown", {
      view: "week",
      slotMinutes: 30,
      timeZone: LISBON,
    })
    expect(formatEventDate(next, "local", LISBON)).toBe("2026-11-18T10:30:00")
    const left = moveCursor(start, "ArrowLeft", {
      view: "month",
      slotMinutes: 30,
      timeZone: LISBON,
    })
    expect(formatEventDate(left, "local", LISBON)).toBe("2026-11-17T10:00:00")
    expect(isTimeGridView("week")).toBe(true)
    expect(isTimeGridView("month")).toBe(false)
  })
})

describe("drafts and changes", () => {
  const ids = (events: CalendarEvent[]) => events.map((item) => item.id)

  it("creates a draft in the requested style", () => {
    const draft = createEventDraft({
      id: "draft",
      start: parseEventDate("2026-11-18T09:00:00", NEW_YORK),
      end: parseEventDate("2026-11-18T10:00:00", NEW_YORK),
      allDay: false,
      calendarId: "work",
      timeZone: NEW_YORK,
    })
    expect(draft).toEqual({
      id: "draft",
      title: "",
      start: "2026-11-18T09:00:00-05:00",
      end: "2026-11-18T10:00:00-05:00",
      calendarId: "work",
    })
  })

  it("applies and inverts a change", () => {
    const list = [event(), event({ id: "review", title: "Review" })]
    const moved = event({
      start: "2026-11-18T11:00:00",
      end: "2026-11-18T11:30:00",
    })
    const change = createEventChange({
      reason: "move",
      event: moved,
      previous: list[0],
      updated: [moved],
      replaced: [list[0]],
    })
    const next = applyEventChange(list, change)
    expect(next[0].start).toBe("2026-11-18T11:00:00")
    expect(next[1]).toBe(list[1])

    const undo = invertEventChange(change)
    expect(undo.reason).toBe("undo")
    expect(applyEventChange(next, undo)[0].start).toBe("2026-11-18T10:00:00")
  })

  it("creates and deletes through the same change shape", () => {
    const created = event({ id: "new" })
    const create = createEventChange({
      reason: "create",
      event: created,
      created: [created],
    })
    const list = applyEventChange([event()], create)
    expect(ids(list)).toEqual(["standup", "new"])
    expect(ids(applyEventChange(list, invertEventChange(create)))).toEqual([
      "standup",
    ])
  })
})

describe("colours", () => {
  it("keeps every palette colour inside the role recipe's gamut", () => {
    for (const color of Object.values(EVENT_CALENDAR_COLORS)) {
      expect(color.chroma).toBeLessThanOrEqual(roleMaxChroma(color.hue))
    }
  })

  it("draws a hue with the same literals as a role of that hue", () => {
    const color = EVENT_CALENDAR_COLORS.blue
    const variables = getEventColorVariables(color)
    const light = roleLiterals("primary", "light", color)
    const dark = roleLiterals("primary", "dark", color)
    expect(variables["--event-calendar-fill-light"]).toBe(light.primary)
    expect(variables["--event-calendar-fill-dark"]).toBe(dark.primary)
    expect(variables["--event-calendar-text-light"]).toBe(light["primary-text"])
    expect(variables["--event-calendar-text-dark"]).toBe(dark["primary-text"])
    expect(variables["--event-calendar-foreground-light"]).toBe(
      light["primary-foreground"]
    )
  })

  it("points a role at the role's own tokens", () => {
    expect(getEventColorVariables("success")).toMatchObject({
      "--event-calendar-fill-light": "var(--success)",
      "--event-calendar-text-dark": "var(--success-text)",
    })
  })

  it("takes the event's colour, then its calendar's, then blue", () => {
    const calendars = [{ id: "home", name: "Home", color: "green" as const }]
    expect(resolveEventColor(event({ color: "red" }), calendars)).toBe("red")
    expect(resolveEventColor(event({ calendarId: "home" }), calendars)).toBe(
      "green"
    )
    expect(resolveEventColor(event(), calendars)).toBe("blue")
  })
})

describe("views and shortcuts", () => {
  it("labels views and guards their names", () => {
    expect(getViewLabel("days", 4)).toBe("4 days")
    expect(getViewLabel("agenda", 4)).toBe("Agenda")
    expect(isEventCalendarView("week")).toBe(true)
    expect(isEventCalendarView("fortnight")).toBe(false)
    expect(isEventCalendarView("year")).toBe(false)
  })

  it("maps keys to Google Calendar's shortcuts", () => {
    expect(getShortcut("w", {})).toEqual({ kind: "view", view: "week" })
    expect(getShortcut("4", {})).toEqual({ kind: "view", view: "days" })
    expect(getShortcut("d", {})).toEqual({ kind: "view", view: "day" })
    expect(getShortcut("m", {})).toEqual({ kind: "view", view: "month" })
    expect(getShortcut("x", {})).toBeNull()
    expect(getShortcut("y", {})).toBeNull()
    expect(getShortcut("t", {})).toEqual({ kind: "today" })
    expect(getShortcut("j", {})).toEqual({ kind: "next" })
    expect(getShortcut("p", {})).toEqual({ kind: "previous" })
    expect(getShortcut("c", {})).toEqual({ kind: "create" })
    expect(getShortcut("?", { shiftKey: true })).toEqual({ kind: "help" })
    expect(getShortcut("z", { metaKey: true })).toEqual({ kind: "undo" })
    expect(getShortcut("z", { ctrlKey: true, shiftKey: true })).toEqual({
      kind: "redo",
    })
    expect(getShortcut("w", { metaKey: true })).toBeNull()
    expect(getShortcut("q", {})).toBeNull()
  })
})

describe("groupEventsByDay", () => {
  it("lists each event on every day it covers, in the zone's days", () => {
    const events = [
      event({
        id: "a",
        start: "2026-10-24T22:00:00",
        end: "2026-10-25T09:00:00",
      }),
      event({ id: "b", start: "2026-10-25", end: "2026-10-27" }),
      event({
        id: "c",
        start: "2026-10-26T10:00:00",
        end: "2026-10-26T11:00:00",
      }),
    ]
    const days = groupEventsByDay(
      events,
      {
        start: parseEventDate("2026-10-24", LISBON),
        end: parseEventDate("2026-10-31", LISBON),
      },
      LISBON
    )
    expect(
      days.map((day) => [day.key, day.events.map((item) => item.id)])
    ).toEqual([
      ["2026-10-24", ["a"]],
      ["2026-10-25", ["a", "b"]],
      ["2026-10-26", ["b", "c"]],
    ])
  })

  it("leaves out events outside the range", () => {
    const days = groupEventsByDay(
      [
        event({ id: "before", start: "2026-10-20", end: "2026-10-21" }),
        event({
          id: "inside",
          start: "2026-10-26T10:00:00",
          end: "2026-10-26T11:00:00",
        }),
        event({
          id: "after",
          start: "2026-11-02T10:00:00",
          end: "2026-11-02T11:00:00",
        }),
      ],
      {
        start: parseEventDate("2026-10-24", LISBON),
        end: parseEventDate("2026-10-31", LISBON),
      },
      LISBON
    )
    expect(
      days.map((day) => [day.key, day.events.map((item) => item.id)])
    ).toEqual([["2026-10-26", ["inside"]]])
  })
})

describe("toEventCalendarWeekday", () => {
  it("wraps any whole number round the week", () => {
    expect(toEventCalendarWeekday(3)).toBe(3)
    expect(toEventCalendarWeekday(7)).toBe(0)
    expect(toEventCalendarWeekday(-1)).toBe(6)
  })
})

describe("without Intl's formatRange (Hermes)", () => {
  const descriptor = Object.getOwnPropertyDescriptor(
    Intl.DateTimeFormat.prototype,
    "formatRange"
  )
  beforeEach(() => {
    Reflect.deleteProperty(Intl.DateTimeFormat.prototype, "formatRange")
  })
  afterEach(() => {
    if (descriptor) {
      Object.defineProperty(
        Intl.DateTimeFormat.prototype,
        "formatRange",
        descriptor
      )
    }
  })

  it("joins the two ends itself", () => {
    // Times no other test formats, so no range is cached from Intl's own.
    const times = getEventTimes(
      event({ start: "2026-11-18T11:00:00", end: "2026-11-18T11:45:00" }),
      LISBON
    )
    expect(
      formatEventTimeRange(times, {
        locale: "en-US",
        timeZone: LISBON,
        hourCycle: "h23",
      })
    ).toBe("11:00 – 11:45")
    const range = getViewRange("week", parseEventDate("2026-12-01", LISBON), {
      days: 4,
      weekStartsOn: 0,
      timeZone: LISBON,
    })
    expect(
      formatViewTitle("week", range, { locale: "en-US", timeZone: LISBON })
    ).toBe("Nov 2026 – Dec 2026")
  })
})

describe("resolveBusinessHours", () => {
  it("is off unless asked for", () => {
    expect(resolveBusinessHours(undefined)).toBe(false)
    expect(resolveBusinessHours(false)).toBe(false)
  })

  it("is Monday to Friday, 9 to 5, for true, and the hours given otherwise", () => {
    expect(resolveBusinessHours(true)).toEqual({
      days: [1, 2, 3, 4, 5],
      start: "09:00",
      end: "17:00",
    })
    const custom = { days: [1, 2, 3, 4] as const, start: "08:00", end: "16:00" }
    expect(resolveBusinessHours({ ...custom, days: [...custom.days] })).toEqual(
      {
        days: [1, 2, 3, 4],
        start: "08:00",
        end: "16:00",
      }
    )
  })
})
