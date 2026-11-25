import { describe, expect, it } from "vitest"

import { type CalendarAppEvent } from "@/registry/fabricator/shared/blocks/calendar-app-01/lib/calendar-app-events"
import {
  describeEventWhen,
  describeResponses,
  describeStartsIn,
  findConflicts,
  getChipLines,
  getChipResponse,
  getCreateRange,
  getLabelColumn,
  getNextFreeStart,
  getNextSelection,
  getPeriodTitle,
  getShownView,
  getStripDays,
  getUpNext,
  getYourResponse,
  isEventOver,
  orderGuests,
  summarizeResponses,
  withYourResponse,
} from "@/registry/fabricator/shared/blocks/calendar-app-01/lib/calendar-app-model"

const guests = [
  { id: "ada", name: "Ada Lovelace", initials: "AL", isYou: true },
  { id: "maya", name: "Maya Chen", initials: "MC", response: "yes" as const },
  { id: "sam", name: "Sam Ortiz", initials: "SO", response: "maybe" as const },
  { id: "noor", name: "Noor Ali", initials: "NA", response: "no" as const },
  { id: "leo", name: "Leo Silva", initials: "LS" },
]

describe("summarizeResponses", () => {
  it("counts each answer and who hasn't answered", () => {
    expect(summarizeResponses(guests)).toEqual({
      yes: 1,
      maybe: 1,
      no: 1,
      awaiting: 2,
    })
  })
})

describe("describeResponses", () => {
  it("names each answer that has someone, in order", () => {
    expect(describeResponses({ yes: 3, maybe: 0, no: 1, awaiting: 2 })).toBe(
      "3 going, 1 declined, 2 no reply"
    )
  })

  it("says when nobody has answered yet", () => {
    expect(describeResponses({ yes: 0, maybe: 0, no: 0, awaiting: 4 })).toBe(
      "4 no reply"
    )
  })
})

describe("withYourResponse", () => {
  it("sets only your own answer", () => {
    const next = withYourResponse(guests, "maybe")
    expect(next[0].response).toBe("maybe")
    expect(next.slice(1)).toEqual(guests.slice(1))
  })

  it("leaves the list as it is without an answer", () => {
    expect(withYourResponse(guests, undefined)).toBe(guests)
  })
})

describe("getCreateRange", () => {
  const range = {
    start: new Date(2026, 10, 15),
    end: new Date(2026, 10, 22),
  }

  it("starts at the next slot when now is in view", () => {
    expect(
      getCreateRange({
        now: new Date(2026, 10, 18, 10, 24),
        range,
        day: new Date(2026, 10, 19),
        slotMinutes: 15,
        eventMinutes: 30,
      })
    ).toEqual({
      start: new Date(2026, 10, 18, 10, 30),
      end: new Date(2026, 10, 18, 11, 0),
    })
  })

  it("starts at 9:00 on the day in focus otherwise", () => {
    expect(
      getCreateRange({
        now: new Date(2026, 11, 2, 16, 5),
        range,
        day: new Date(2026, 10, 19, 13, 40),
        slotMinutes: 30,
        eventMinutes: 60,
      })
    ).toEqual({
      start: new Date(2026, 10, 19, 9, 0),
      end: new Date(2026, 10, 19, 10, 0),
    })
  })
})

describe("getNextSelection", () => {
  const selected: CalendarAppEvent = {
    id: "review",
    title: "Design review",
    start: "2026-11-17T14:00:00",
    end: "2026-11-17T15:30:00",
  }
  const change = {
    reason: "edit" as const,
    event: selected,
    created: [],
    updated: [],
    deleted: [],
    replaced: [],
  }

  it("follows an edit of the open event", () => {
    const edited = { ...selected, title: "Design crit" }
    expect(getNextSelection(selected, { ...change, updated: [edited] })).toBe(
      edited
    )
  })

  it("closes when the open event is deleted", () => {
    expect(
      getNextSelection(selected, {
        ...change,
        reason: "delete",
        deleted: [selected],
      })
    ).toBeUndefined()
  })

  it("closes when its whole series is deleted", () => {
    const occurrence: CalendarAppEvent = {
      ...selected,
      id: "standup::2026-11-17T09:30:00",
      recurringEventId: "standup",
      originalStart: "2026-11-17T09:30:00",
    }
    expect(
      getNextSelection(occurrence, {
        ...change,
        reason: "delete",
        event: { ...selected, id: "standup" },
        deleted: [{ ...selected, id: "standup" }],
      })
    ).toBeUndefined()
  })

  it("follows an occurrence that was edited on its own", () => {
    const occurrence: CalendarAppEvent = {
      ...selected,
      id: "standup::2026-11-17T09:30:00",
      recurringEventId: "standup",
      originalStart: "2026-11-17T09:30:00",
    }
    const stored = { ...occurrence, id: "standup-1", title: "Late standup" }
    expect(
      getNextSelection(occurrence, {
        ...change,
        event: occurrence,
        created: [stored],
      })
    ).toBe(stored)
  })

  it("opens the event just created, and the copy of one", () => {
    for (const reason of ["create", "duplicate"] as const) {
      const created = { ...selected, id: `new-${reason}` }
      expect(
        getNextSelection(undefined, {
          ...change,
          reason,
          event: created,
          created: [created],
        })
      ).toBe(created)
    }
  })

  it("keeps the open event when another one changes", () => {
    expect(
      getNextSelection(selected, {
        ...change,
        event: { ...selected, id: "other" },
        updated: [{ ...selected, id: "other" }],
      })
    ).toBe(selected)
  })
})

describe("describeEventWhen", () => {
  const options = {
    locale: "en-US",
    timeZone: "Europe/Lisbon",
    hourCycle: "h12" as const,
  }

  it("gives the day and the time range of a timed event", () => {
    const { day, time } = describeEventWhen(
      {
        id: "a",
        title: "Review",
        start: "2026-11-17T14:00:00",
        end: "2026-11-17T15:30:00",
      },
      options
    )
    expect(day).toBe("Tuesday, November 17")
    expect(time).toMatch(/^2:00\s?–\s?3:30\sPM$/)
  })

  it("marks a one-day all-day event", () => {
    expect(
      describeEventWhen(
        { id: "b", title: "Holiday", start: "2026-11-20", end: "2026-11-21" },
        options
      )
    ).toEqual({ day: "Friday, November 20", time: "All day" })
  })

  it("gives the first and last day of a multi-day event", () => {
    expect(
      describeEventWhen(
        { id: "c", title: "Offsite", start: "2026-11-18", end: "2026-11-20" },
        options
      )
    ).toEqual({
      day: "Wednesday, November 18 – Thursday, November 19",
      time: "All day",
    })
  })
})

const zone = "UTC"
const you = { id: "ada", name: "Ada Lovelace", initials: "AL", isYou: true }
const maya = { id: "maya", name: "Maya Chen", initials: "MC" }

function meeting(
  id: string,
  start: string,
  end: string,
  extra: Partial<CalendarAppEvent> = {}
): CalendarAppEvent {
  return { id, title: id, start, end, calendarId: "ada", ...extra }
}

describe("getYourResponse", () => {
  const event = meeting("a", "2026-11-24T10:00:00", "2026-11-24T11:00:00", {
    data: { guests: [maya, { ...you, response: "maybe" }] },
  })

  it("reads your answer from the guests", () => {
    expect(getYourResponse(event, {})).toBe("maybe")
  })

  it("prefers the answer given here", () => {
    expect(getYourResponse(event, { a: "no" })).toBe("no")
  })

  it("answers a whole series at once", () => {
    const occurrence = { ...event, id: "a::1", recurringEventId: "a" }
    expect(getYourResponse(occurrence, { a: "yes" })).toBe("yes")
  })

  it("has none when you aren't invited", () => {
    expect(
      getYourResponse({ ...event, data: { guests: [maya] } }, { a: "no" })
    ).toBeUndefined()
  })
})

describe("getChipResponse", () => {
  const base = meeting("a", "2026-11-24T10:00:00", "2026-11-24T11:00:00")

  it("is solid for what you accepted", () => {
    const event = {
      ...base,
      data: { guests: [{ ...you, response: "yes" as const }] },
    }
    expect(getChipResponse(event, {})).toBe("yes")
  })

  it("waits for an answer you haven't given", () => {
    expect(getChipResponse({ ...base, data: { guests: [you] } }, {})).toBe(
      "awaiting"
    )
  })

  it("is solid for your own event and for one without you", () => {
    expect(getChipResponse(base, {})).toBe("yes")
    expect(getChipResponse({ ...base, data: { guests: [maya] } }, {})).toBe(
      "yes"
    )
    expect(
      getChipResponse(
        { ...base, data: { guests: [{ ...you, isOrganizer: true }] } },
        {}
      )
    ).toBe("yes")
  })

  it("follows a decline and a maybe", () => {
    const event = { ...base, data: { guests: [you] } }
    expect(getChipResponse(event, { a: "no" })).toBe("no")
    expect(getChipResponse(event, { a: "maybe" })).toBe("maybe")
  })
})

describe("orderGuests", () => {
  it("puts the organizer first, then by answer", () => {
    const list = [
      { ...maya, response: "no" as const },
      { id: "leo", name: "Leo", initials: "LE" },
      { ...you, response: "yes" as const },
      { id: "tom", name: "Tom", initials: "TB", isOrganizer: true },
      { id: "emma", name: "Emma", initials: "EL", response: "maybe" as const },
    ]
    expect(orderGuests(list).map(({ id }) => id)).toEqual([
      "tom",
      "ada",
      "emma",
      "leo",
      "maya",
    ])
  })
})

describe("getUpNext", () => {
  const now = new Date("2026-11-24T10:48:00Z")
  const mine = new Set(["ada", "team"])
  const standup = meeting(
    "standup",
    "2026-11-24T11:00:00",
    "2026-11-24T11:15:00"
  )
  const review = meeting("review", "2026-11-24T14:00:00", "2026-11-24T15:00:00")

  function next(events: CalendarAppEvent[], responses = {}) {
    return getUpNext({
      events,
      now,
      responses,
      calendarIds: mine,
      timeZone: zone,
    })?.id
  }

  it("is the earliest one that hasn't started", () => {
    expect(next([review, standup])).toBe("standup")
  })

  it("keeps one that started less than ten minutes ago", () => {
    const started = meeting("now", "2026-11-24T10:40:00", "2026-11-24T11:40:00")
    const older = meeting("older", "2026-11-24T10:30:00", "2026-11-24T11:40:00")
    expect(next([started, standup])).toBe("now")
    expect(next([older, standup])).toBe("standup")
  })

  it("leaves one that is already over, even if it just started", () => {
    const short = meeting("short", "2026-11-24T10:40:00", "2026-11-24T10:45:00")
    expect(next([short, standup])).toBe("standup")
  })

  it("skips all-day events, other people's calendars and what you declined", () => {
    expect(
      next([
        meeting("holiday", "2026-11-24", "2026-11-25"),
        meeting("theirs", "2026-11-24T10:55:00", "2026-11-24T11:00:00", {
          calendarId: "maya",
        }),
        meeting("declined", "2026-11-24T10:50:00", "2026-11-24T11:00:00", {
          data: { guests: [{ ...you, response: "no" }] },
        }),
        review,
      ])
    ).toBe("review")
  })

  it("has none when nothing is ahead", () => {
    expect(next([])).toBeUndefined()
  })
})

describe("describeStartsIn", () => {
  const options = { locale: "en-US", timeZone: zone, hourCycle: "h23" as const }
  const now = new Date("2026-11-24T10:48:00Z")
  const says = (start: string, end = "2026-12-24T10:00:00") =>
    describeStartsIn(meeting("a", start, end), now, options)

  it("counts minutes within the hour", () => {
    expect(says("2026-11-24T11:00:00")).toBe("in 12 min")
  })

  it("counts hours and minutes within four hours", () => {
    expect(says("2026-11-24T12:00:00")).toBe("in 1 hr 12 min")
    expect(says("2026-11-24T12:48:00")).toBe("in 2 hr")
  })

  it("rounds a started minute up, so it never says 0", () => {
    expect(
      describeStartsIn(
        meeting("a", "2026-11-24T10:49:00", "2026-11-24T11:00:00"),
        new Date("2026-11-24T10:48:40Z"),
        options
      )
    ).toBe("in 1 min")
  })

  it("says now, then how long ago it started", () => {
    expect(says("2026-11-24T10:48:00")).toBe("now")
    expect(says("2026-11-24T10:44:00")).toBe("started 4 min ago")
  })

  it("gives the time later today, then tomorrow, then the weekday", () => {
    expect(says("2026-11-24T17:30:00")).toBe("at 17:30")
    expect(says("2026-11-25T09:30:00")).toBe("tomorrow at 09:30")
    expect(says("2026-11-27T09:30:00")).toBe("Friday at 09:30")
  })

  it("gives the date from a week on", () => {
    expect(says("2026-12-03T09:30:00")).toBe("December 3 at 09:30")
  })
})

describe("isEventOver", () => {
  it("is over once it ends", () => {
    const event = meeting("a", "2026-11-24T10:00:00", "2026-11-24T11:00:00")
    expect(isEventOver(event, new Date("2026-11-24T10:59:00Z"), zone)).toBe(
      false
    )
    expect(isEventOver(event, new Date("2026-11-24T11:00:00Z"), zone)).toBe(
      true
    )
  })
})

describe("findConflicts", () => {
  const mine = new Set(["ada", "team"])
  const event = meeting("a", "2026-11-24T10:00:00", "2026-11-24T11:00:00")

  function conflicts(events: CalendarAppEvent[], responses = {}) {
    return findConflicts({
      event,
      events,
      responses,
      calendarIds: mine,
      timeZone: zone,
    }).map(({ id }) => id)
  }

  it("finds what overlaps, not what touches", () => {
    expect(
      conflicts([
        event,
        meeting("before", "2026-11-24T09:00:00", "2026-11-24T10:00:00"),
        meeting("inside", "2026-11-24T10:30:00", "2026-11-24T10:45:00"),
        meeting("after", "2026-11-24T11:00:00", "2026-11-24T12:00:00"),
      ])
    ).toEqual(["inside"])
  })

  it("ignores all-day events, other calendars and what you declined", () => {
    expect(
      conflicts(
        [
          meeting("holiday", "2026-11-24", "2026-11-25"),
          meeting("theirs", "2026-11-24T10:00:00", "2026-11-24T11:00:00", {
            calendarId: "maya",
          }),
          meeting("declined", "2026-11-24T10:00:00", "2026-11-24T11:00:00", {
            data: { guests: [you] },
          }),
        ],
        { declined: "no" }
      )
    ).toEqual([])
  })

  it("has none for an event you declined or an all-day one", () => {
    const other = meeting("b", "2026-11-24T10:00:00", "2026-11-24T11:00:00")
    const declined = {
      ...event,
      data: { guests: [{ ...you, response: "no" as const }] },
    }
    const allDay = meeting("c", "2026-11-24", "2026-11-25")
    for (const candidate of [declined, allDay]) {
      expect(
        findConflicts({
          event: candidate,
          events: [other],
          responses: {},
          calendarIds: mine,
          timeZone: zone,
        })
      ).toEqual([])
    }
  })
})

describe("getNextFreeStart", () => {
  const mine = new Set(["ada"])
  const event = meeting("a", "2026-11-24T10:00:00", "2026-11-24T11:00:00")
  const busy = [
    event,
    meeting("b", "2026-11-24T10:30:00", "2026-11-24T11:15:00"),
    meeting("c", "2026-11-24T11:45:00", "2026-11-24T12:30:00"),
  ]
  const input = {
    event,
    events: busy,
    responses: {},
    calendarIds: mine,
    slotMinutes: 15,
    timeZone: zone,
  }

  it("is the first gap that fits the whole event", () => {
    expect(getNextFreeStart(input)).toEqual(new Date("2026-11-24T12:30:00Z"))
  })

  it("stays on the event's day", () => {
    const wall = meeting("d", "2026-11-24T10:00:00", "2026-11-25T00:00:00")
    expect(getNextFreeStart({ ...input, events: [wall] })).toBeUndefined()
  })
})

describe("getChipLines", () => {
  it("gives a longer event more lines of title", () => {
    expect(getChipLines(15)).toBe(1)
    expect(getChipLines(30)).toBe(2)
    expect(getChipLines(45)).toBe(2)
    expect(getChipLines(60)).toBe(3)
    expect(getChipLines(120)).toBe(8)
  })
})

describe("getShownView", () => {
  it("opens on the week, and on the day on a phone", () => {
    expect(getShownView(undefined, false)).toBe("week")
    expect(getShownView(undefined, true)).toBe("day")
  })

  it("swaps the views the other size doesn't have", () => {
    expect(getShownView("week", true)).toBe("days")
    expect(getShownView("days", false)).toBe("week")
    expect(getShownView("month", true)).toBe("month")
  })
})

describe("getPeriodTitle", () => {
  const options = {
    title: "November 24, 2026",
    locale: "en-US",
    timeZone: zone,
    now: new Date("2026-11-24T10:48:00Z"),
  }
  const day = {
    start: new Date("2026-11-24T00:00:00Z"),
    end: new Date("2026-11-25T00:00:00Z"),
  }

  it("is the calendar's own title on a desktop", () => {
    expect(
      getPeriodTitle({ ...options, view: "day", range: day, isPhone: false })
    ).toBe("November 24, 2026")
  })

  it("is the month on a phone, with the year when it isn't this one", () => {
    expect(
      getPeriodTitle({ ...options, view: "day", range: day, isPhone: true })
    ).toBe("November")
    expect(
      getPeriodTitle({
        ...options,
        view: "day",
        range: {
          start: new Date("2027-01-05T00:00:00Z"),
          end: new Date("2027-01-06T00:00:00Z"),
        },
        isPhone: true,
      })
    ).toBe("January 2027")
  })

  it("names the month in the middle of a month grid", () => {
    expect(
      getPeriodTitle({
        ...options,
        view: "month",
        range: {
          start: new Date("2026-11-30T00:00:00Z"),
          end: new Date("2027-01-04T00:00:00Z"),
        },
        isPhone: true,
      })
    ).toBe("December")
  })

  it("names the month an agenda starts in", () => {
    expect(
      getPeriodTitle({
        ...options,
        view: "agenda",
        range: {
          start: new Date("2026-11-24T00:00:00Z"),
          end: new Date("2026-12-24T00:00:00Z"),
        },
        isPhone: true,
      })
    ).toBe("November")
  })
})

describe("getLabelColumn", () => {
  const input = {
    start: new Date(2026, 10, 23),
    rangeStart: new Date(2026, 10, 26),
    buffer: 7,
    showWeekends: true,
  }

  it("is the first day on screen of a bar that started before it", () => {
    expect(getLabelColumn(input)).toBe(3)
  })

  it("is the bar's own start when it starts on screen", () => {
    expect(getLabelColumn({ ...input, start: new Date(2026, 10, 27) })).toBe(0)
  })

  it("counts from where the grid starts drawing", () => {
    expect(getLabelColumn({ ...input, buffer: 1 })).toBe(1)
  })

  it("skips the weekends the grid hides", () => {
    expect(
      getLabelColumn({
        ...input,
        start: new Date(2026, 10, 19),
        showWeekends: false,
      })
    ).toBe(5)
  })
})

describe("getStripDays", () => {
  it("is the week around a day, from its first weekday", () => {
    const days = getStripDays(new Date(2026, 10, 24, 15), 1)
    expect(days).toHaveLength(7)
    expect(days[0]).toEqual(new Date(2026, 10, 23))
    expect(days[6]).toEqual(new Date(2026, 10, 29))
  })

  it("starts on Sunday when the week does", () => {
    expect(getStripDays(new Date(2026, 10, 24), 0)[0]).toEqual(
      new Date(2026, 10, 22)
    )
  })
})
