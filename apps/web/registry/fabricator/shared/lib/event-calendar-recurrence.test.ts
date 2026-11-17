import { describe, expect, it } from "vitest"

import {
  getViewRange,
  overlapsRange,
  parseEventDate,
  type CalendarEvent,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import {
  applyRecurringDelete,
  applyRecurringEdit,
  createEventIndex,
  describeRecurrence,
  expandEvents,
  expandRecurringEvent,
  formatRecurrence,
  getRecurrencePresets,
  isOccurrence,
  parseRecurrence,
  queryEventIndex,
} from "@/registry/fabricator/shared/lib/event-calendar-recurrence"

const LISBON = "Europe/Lisbon"
const NEW_YORK = "America/New_York"

function series(patch: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: "standup",
    title: "Standup",
    start: "2026-11-02T10:00:00",
    end: "2026-11-02T10:15:00",
    recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
    ...patch,
  }
}

const starts = (events: CalendarEvent[]) => events.map((event) => event.start)

function range(from: string, to: string, timeZone = LISBON) {
  return {
    start: parseEventDate(from, timeZone),
    end: parseEventDate(to, timeZone),
  }
}

describe("parseRecurrence and formatRecurrence", () => {
  it("reads the rule and its exceptions", () => {
    const parsed = parseRecurrence(
      "RRULE:FREQ=MONTHLY;INTERVAL=2;BYDAY=3TU,-1FR;COUNT=6\nEXDATE:20261118T100000Z,20261125T100000Z"
    )
    expect(parsed.rule).toEqual({
      freq: "MONTHLY",
      interval: 2,
      count: 6,
      byDay: [
        { weekday: 2, nth: 3 },
        { weekday: 5, nth: -1 },
      ],
    })
    expect(parsed.exdates).toEqual(["20261118T100000Z", "20261125T100000Z"])
  })

  it("accepts a bare rule, date exceptions and a time-zoned exception", () => {
    expect(parseRecurrence("FREQ=DAILY").rule.freq).toBe("DAILY")
    expect(
      parseRecurrence(
        "RRULE:FREQ=DAILY\nEXDATE;VALUE=DATE:20261118\nEXDATE;TZID=Europe/Lisbon:20261120T100000"
      ).exdates
    ).toEqual(["20261118", "TZID=Europe/Lisbon:20261120T100000"])
  })

  it("writes it back in a stable order", () => {
    const text =
      "RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE;UNTIL=20261231T235959Z\nEXDATE:20261118T100000Z"
    expect(formatRecurrence(parseRecurrence(text))).toBe(text)
  })

  it("throws on a rule it can't read", () => {
    expect(() => parseRecurrence("RRULE:FREQ=HOURLY")).toThrow(
      /Unsupported recurrence/
    )
  })
})

describe("expandRecurringEvent", () => {
  it("repeats weekly on the given days, keeping wall time over DST", () => {
    const occurrences = expandRecurringEvent(
      series(),
      range("2026-10-19", "2026-11-09"),
      LISBON
    )
    expect(starts(occurrences)).toEqual([
      "2026-11-02T10:00:00",
      "2026-11-04T10:00:00",
      "2026-11-06T10:00:00",
    ])
    const autumn = expandRecurringEvent(
      series({ start: "2026-10-23T10:00:00", end: "2026-10-23T10:15:00" }),
      range("2026-10-23", "2026-10-28"),
      LISBON
    )
    expect(starts(autumn)).toEqual([
      "2026-10-23T10:00:00",
      "2026-10-26T10:00:00",
    ])
  })

  it("gives each occurrence an id and its series", () => {
    const [first] = expandRecurringEvent(
      series(),
      range("2026-11-02", "2026-11-03"),
      LISBON
    )
    expect(first).toMatchObject({
      id: "standup::2026-11-02T10:00:00",
      recurringEventId: "standup",
      originalStart: "2026-11-02T10:00:00",
      end: "2026-11-02T10:15:00",
    })
    expect(isOccurrence(first)).toBe(true)
  })

  it("stops at COUNT and UNTIL, and skips EXDATE", () => {
    const counted = expandRecurringEvent(
      series({ recurrence: "RRULE:FREQ=DAILY;COUNT=3" }),
      range("2026-11-01", "2026-12-01"),
      LISBON
    )
    expect(counted).toHaveLength(3)

    const until = expandRecurringEvent(
      series({ recurrence: "RRULE:FREQ=DAILY;UNTIL=20261104T235959Z" }),
      range("2026-11-01", "2026-12-01"),
      LISBON
    )
    expect(until).toHaveLength(3)

    const skipped = expandRecurringEvent(
      series({
        recurrence: "RRULE:FREQ=DAILY;COUNT=3\nEXDATE:20261103T100000Z",
      }),
      range("2026-11-01", "2026-12-01"),
      LISBON
    )
    expect(starts(skipped)).toEqual([
      "2026-11-02T10:00:00",
      "2026-11-04T10:00:00",
    ])
  })

  it("counts COUNT from the series' start, not the range's", () => {
    const occurrences = expandRecurringEvent(
      series({ recurrence: "RRULE:FREQ=DAILY;COUNT=5" }),
      range("2026-11-05", "2026-12-01"),
      LISBON
    )
    expect(starts(occurrences)).toEqual([
      "2026-11-05T10:00:00",
      "2026-11-06T10:00:00",
    ])
  })

  it("repeats monthly by weekday position and by day of month", () => {
    const thirdTuesday = expandRecurringEvent(
      series({
        start: "2026-11-17T09:00:00",
        end: "2026-11-17T10:00:00",
        recurrence: "RRULE:FREQ=MONTHLY;BYDAY=3TU",
      }),
      range("2026-11-01", "2027-02-01"),
      LISBON
    )
    expect(starts(thirdTuesday)).toEqual([
      "2026-11-17T09:00:00",
      "2026-12-15T09:00:00",
      "2027-01-19T09:00:00",
    ])

    const lastFriday = expandRecurringEvent(
      series({
        start: "2026-11-27T09:00:00",
        end: "2026-11-27T10:00:00",
        recurrence: "RRULE:FREQ=MONTHLY;BYDAY=-1FR",
      }),
      range("2026-11-01", "2027-01-01"),
      LISBON
    )
    expect(starts(lastFriday)).toEqual([
      "2026-11-27T09:00:00",
      "2026-12-25T09:00:00",
    ])

    // The 31st skips months without one, as RFC 5545 says.
    const thirtyFirst = expandRecurringEvent(
      series({
        start: "2026-10-31T09:00:00",
        end: "2026-10-31T10:00:00",
        recurrence: "RRULE:FREQ=MONTHLY",
      }),
      range("2026-10-01", "2027-02-01"),
      LISBON
    )
    expect(starts(thirtyFirst)).toEqual([
      "2026-10-31T09:00:00",
      "2026-12-31T09:00:00",
      "2027-01-31T09:00:00",
    ])
  })

  it("repeats yearly and all-day", () => {
    const birthday = expandRecurringEvent(
      series({
        start: "2024-02-29",
        end: "2024-03-01",
        recurrence: "RRULE:FREQ=YEARLY",
      }),
      range("2024-01-01", "2029-01-01"),
      LISBON
    )
    expect(starts(birthday)).toEqual(["2024-02-29", "2028-02-29"])
  })

  it("repeats every second day and every weekday", () => {
    const everyOther = expandRecurringEvent(
      series({ recurrence: "RRULE:FREQ=DAILY;INTERVAL=2" }),
      range("2026-11-02", "2026-11-08"),
      LISBON
    )
    expect(starts(everyOther)).toEqual([
      "2026-11-02T10:00:00",
      "2026-11-04T10:00:00",
      "2026-11-06T10:00:00",
    ])
    const weekdays = expandRecurringEvent(
      series({ recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR" }),
      range("2026-11-06", "2026-11-10"),
      LISBON
    )
    expect(starts(weekdays)).toEqual([
      "2026-11-06T10:00:00",
      "2026-11-09T10:00:00",
    ])
  })

  it("expands events with an offset in the calendar's zone", () => {
    const occurrences = expandRecurringEvent(
      series({
        start: "2026-11-02T10:00:00-05:00",
        end: "2026-11-02T10:15:00-05:00",
        recurrence: "RRULE:FREQ=DAILY;COUNT=2",
      }),
      range("2026-11-01", "2026-11-10", NEW_YORK),
      NEW_YORK
    )
    expect(starts(occurrences)).toEqual([
      "2026-11-02T10:00:00-05:00",
      "2026-11-03T10:00:00-05:00",
    ])
  })
})

describe("expandEvents", () => {
  it("keeps one-off events in range, expands series and keeps edited occurrences", () => {
    const edited: CalendarEvent = {
      id: "standup-moved",
      title: "Standup (late)",
      start: "2026-11-04T11:00:00",
      end: "2026-11-04T11:15:00",
      recurringEventId: "standup",
      originalStart: "2026-11-04T10:00:00",
    }
    const events = [
      series({
        recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\nEXDATE:20261104T100000Z",
      }),
      edited,
      {
        id: "lunch",
        title: "Lunch",
        start: "2026-11-03T12:00:00",
        end: "2026-11-03T13:00:00",
      },
      {
        id: "old",
        title: "Old",
        start: "2026-10-01T12:00:00",
        end: "2026-10-01T13:00:00",
      },
    ]
    const visible = expandEvents(
      events,
      range("2026-11-02", "2026-11-05"),
      LISBON
    )
    expect(visible.map((event) => event.id)).toEqual([
      "standup::2026-11-02T10:00:00",
      "lunch",
      "standup-moved",
    ])
  })
})

describe("scoped edits", () => {
  const timeZone = LISBON
  const stored = [series()]
  const [, wednesday] = expandRecurringEvent(
    series(),
    range("2026-11-02", "2026-11-05"),
    LISBON
  )
  let id = 0
  const createId = () => `new-${++id}`

  it("edits this occurrence: an exception and an EXDATE", () => {
    const change = applyRecurringEdit({
      stored,
      occurrence: wednesday,
      next: {
        ...wednesday,
        title: "Standup (late)",
        start: "2026-11-04T11:00:00",
        end: "2026-11-04T11:15:00",
      },
      scope: "this",
      timeZone,
      createId,
    })
    expect(change.updated[0].recurrence).toBe(
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\nEXDATE:20261104T100000Z"
    )
    expect(change.created[0]).toMatchObject({
      title: "Standup (late)",
      recurringEventId: "standup",
      originalStart: "2026-11-04T10:00:00",
    })
    expect(change.created[0].recurrence).toBeUndefined()
    expect(change.replaced).toEqual(stored)
  })

  it("edits an exception that already exists in place", () => {
    const exception: CalendarEvent = {
      id: "standup-moved",
      title: "Late",
      start: "2026-11-04T11:00:00",
      end: "2026-11-04T11:15:00",
      recurringEventId: "standup",
      originalStart: "2026-11-04T10:00:00",
    }
    const change = applyRecurringEdit({
      stored: [...stored, exception],
      occurrence: exception,
      next: { ...exception, title: "Later" },
      scope: "this",
      timeZone,
      createId,
    })
    expect(change.updated).toEqual([{ ...exception, title: "Later" }])
    expect(change.created).toEqual([])
  })

  it("edits all: the series moves by the same amount", () => {
    const change = applyRecurringEdit({
      stored,
      occurrence: wednesday,
      next: {
        ...wednesday,
        title: "Sync",
        start: "2026-11-04T10:30:00",
        end: "2026-11-04T11:00:00",
      },
      scope: "all",
      timeZone,
      createId,
    })
    expect(change.updated[0]).toMatchObject({
      id: "standup",
      title: "Sync",
      start: "2026-11-02T10:30:00",
      end: "2026-11-02T11:00:00",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
    })
    expect(change.updated[0].recurringEventId).toBeUndefined()
  })

  it("edits this and following: the series ends and a new one starts", () => {
    const change = applyRecurringEdit({
      stored,
      occurrence: wednesday,
      next: {
        ...wednesday,
        start: "2026-11-04T09:00:00",
        end: "2026-11-04T09:15:00",
      },
      scope: "following",
      timeZone,
      createId,
    })
    expect(change.updated[0].recurrence).toBe(
      "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261104T095959Z"
    )
    expect(change.created[0]).toMatchObject({
      start: "2026-11-04T09:00:00",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR",
    })
    expect(change.created[0].recurringEventId).toBeUndefined()
  })

  it("splits a counted series by what's left", () => {
    const counted = series({ recurrence: "RRULE:FREQ=DAILY;COUNT=5" })
    const [, , third] = expandRecurringEvent(
      counted,
      range("2026-11-01", "2026-12-01"),
      LISBON
    )
    const change = applyRecurringEdit({
      stored: [counted],
      occurrence: third,
      next: { ...third, title: "Later" },
      scope: "following",
      timeZone,
      createId,
    })
    expect(change.updated[0].recurrence).toBe("RRULE:FREQ=DAILY;COUNT=2")
    expect(change.created[0].recurrence).toBe("RRULE:FREQ=DAILY;COUNT=3")
  })

  it("deletes only the first occurrence when the scope is this", () => {
    const counted = series({ recurrence: "RRULE:FREQ=DAILY;COUNT=3" })
    const first = expandRecurringEvent(
      counted,
      range("2026-11-01", "2026-11-10"),
      timeZone
    )[0]
    if (!first) throw new Error("Missing first recurrence fixture")
    const change = applyRecurringDelete({
      stored: [counted],
      occurrence: first,
      scope: "this",
      timeZone,
    })
    expect(change.deleted).toEqual([])
    expect(change.replaced).toEqual([counted])
    expect(
      starts(
        expandEvents(
          change.updated,
          range("2026-11-01", "2026-11-10"),
          timeZone
        )
      )
    ).toEqual(["2026-11-03T10:00:00", "2026-11-04T10:00:00"])
  })

  it("deletes the whole series when following starts at the first occurrence", () => {
    const first = expandRecurringEvent(
      stored[0],
      range("2026-11-01", "2026-11-10"),
      timeZone
    )[0]
    if (!first) throw new Error("Missing first recurrence fixture")
    const change = applyRecurringDelete({
      stored,
      occurrence: first,
      scope: "following",
      timeZone,
    })
    expect(change.deleted).toEqual(stored)
    expect(change.updated).toEqual([])
  })

  it("deletes this, following and all", () => {
    expect(
      applyRecurringDelete({
        stored,
        occurrence: wednesday,
        scope: "this",
        timeZone,
      }).updated[0].recurrence
    ).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR\nEXDATE:20261104T100000Z")
    expect(
      applyRecurringDelete({
        stored,
        occurrence: wednesday,
        scope: "following",
        timeZone,
      }).updated[0].recurrence
    ).toBe("RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20261104T095959Z")
    expect(
      applyRecurringDelete({
        stored,
        occurrence: wednesday,
        scope: "all",
        timeZone,
      }).deleted.map((event) => event.id)
    ).toEqual(["standup"])
  })
})

describe("describeRecurrence and presets", () => {
  it("says what the rule does", () => {
    const describe = (rule: string) =>
      describeRecurrence(parseRecurrence(rule).rule)
    expect(describe("RRULE:FREQ=DAILY")).toBe("Daily")
    expect(describe("RRULE:FREQ=WEEKLY;BYDAY=TU")).toBe("Weekly on Tuesday")
    expect(describe("RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=MO,WE")).toBe(
      "Every 2 weeks on Monday, Wednesday"
    )
    expect(describe("RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR")).toBe(
      "Every weekday (Monday to Friday)"
    )
    expect(describe("RRULE:FREQ=MONTHLY;BYDAY=3TU")).toBe(
      "Monthly on the third Tuesday"
    )
    expect(describe("RRULE:FREQ=MONTHLY;BYDAY=-1FR")).toBe(
      "Monthly on the last Friday"
    )
    expect(describe("RRULE:FREQ=MONTHLY;BYMONTHDAY=18")).toBe(
      "Monthly on day 18"
    )
    expect(describe("RRULE:FREQ=DAILY;COUNT=5")).toBe("Daily, 5 times")
  })

  it("offers Google's presets for a start date", () => {
    const presets = getRecurrencePresets(
      parseEventDate("2026-11-17T09:00:00", LISBON),
      { timeZone: LISBON, locale: "en-US" }
    )
    expect(presets.map((preset) => preset.label)).toEqual([
      "Does not repeat",
      "Daily",
      "Weekly on Tuesday",
      "Monthly on the third Tuesday",
      "Annually on November 17",
      "Every weekday (Monday to Friday)",
    ])
    expect(presets[3].value).toBe("RRULE:FREQ=MONTHLY;BYDAY=3TU")
  })

  it("uses a view range", () => {
    const week = getViewRange("week", parseEventDate("2026-11-04", LISBON), {
      days: 4,
      weekStartsOn: 1,
      timeZone: LISBON,
    })
    expect(expandRecurringEvent(series(), week, LISBON)).toHaveLength(3)
  })
})

describe("the event index", () => {
  const timeZone = LISBON
  const base: CalendarEvent[] = [
    series(),
    {
      id: "standup-moved",
      title: "Standup (late)",
      start: "2026-11-25T11:00:00",
      end: "2026-11-25T11:15:00",
      recurringEventId: "standup",
      originalStart: "2026-11-04T10:00:00",
    },
    {
      id: "lunch",
      title: "Lunch",
      start: "2026-11-03T12:00:00",
      end: "2026-11-03T13:00:00",
    },
    { id: "trip", title: "Trip", start: "2026-10-28", end: "2026-11-04" },
    { id: "quarter", title: "Quarter", start: "2026-10-01", end: "2027-01-01" },
    {
      id: "old",
      title: "Old",
      start: "2026-10-01T12:00:00",
      end: "2026-10-01T13:00:00",
    },
  ]
  const many = Array.from({ length: 2000 }, (_, index): CalendarEvent => {
    const day = String(1 + (index % 28)).padStart(2, "0")
    const hour = String(8 + (index % 9)).padStart(2, "0")
    return {
      id: `e${index}`,
      title: `Event ${index}`,
      start: `2026-11-${day}T${hour}:00:00`,
      end: `2026-11-${day}T${hour}:45:00`,
    }
  })
  const events = [...base, ...many]
  const ranges = [
    range("2026-11-02", "2026-11-09"),
    range("2026-11-01", "2026-12-01"),
    range("2026-11-25", "2026-11-26"),
    range("2026-12-28", "2027-01-04"),
  ]

  it("finds the same one-off events as checking every event", () => {
    const index = createEventIndex(events, timeZone)
    for (const query of ranges) {
      const scanned = events
        .filter((event) => !event.recurrence)
        .filter((event) => overlapsRange(event, query, timeZone))
        .map((event) => event.id)
      const found = queryEventIndex(index, query)
        .filter((event) => !event.originalStart || event.id === "standup-moved")
        .map((event) => event.id)
      expect(found.toSorted()).toEqual(scanned.toSorted())
    }
  })

  it("expands series and replaces their exceptions", () => {
    const index = createEventIndex(events, timeZone)
    const ids = queryEventIndex(index, range("2026-11-02", "2026-11-09"))
      .filter((event) => event.recurringEventId === "standup")
      .map((event) => event.start)
    expect(ids).toEqual(["2026-11-02T10:00:00", "2026-11-06T10:00:00"])
  })

  it("finds events that started long before the range", () => {
    const index = createEventIndex(events, timeZone)
    const ids = queryEventIndex(index, range("2026-12-10", "2026-12-11")).map(
      (event) => event.id
    )
    expect(ids).toContain("quarter")
  })
})
