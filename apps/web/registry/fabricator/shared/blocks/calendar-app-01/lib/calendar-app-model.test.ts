import { describe, expect, it } from "vitest"

import { type CalendarAppEvent } from "@/registry/fabricator/shared/blocks/calendar-app-01/lib/calendar-app-events"
import {
  describeEventWhen,
  describeResponses,
  getCreateRange,
  getNextSelection,
  summarizeResponses,
  withYourResponse,
} from "@/registry/fabricator/shared/blocks/calendar-app-01/lib/calendar-app-model"

const guests = [
  { id: "ada", name: "Ada Park", initials: "AP", isYou: true },
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
      "3 going, 1 declined, 2 awaiting"
    )
  })

  it("says when nobody has answered yet", () => {
    expect(describeResponses({ yes: 0, maybe: 0, no: 0, awaiting: 4 })).toBe(
      "4 awaiting"
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
    expect(
      describeEventWhen(
        {
          id: "a",
          title: "Review",
          start: "2026-11-17T14:00:00",
          end: "2026-11-17T15:30:00",
        },
        options
      )
    ).toMatch(/^Tuesday, November 17 · 2:00\s?–\s?3:30\sPM$/)
  })

  it("marks a one-day all-day event", () => {
    expect(
      describeEventWhen(
        { id: "b", title: "Holiday", start: "2026-11-20", end: "2026-11-21" },
        options
      )
    ).toBe("Friday, November 20 · All day")
  })

  it("gives the first and last day of a multi-day event", () => {
    expect(
      describeEventWhen(
        { id: "c", title: "Offsite", start: "2026-11-18", end: "2026-11-20" },
        options
      )
    ).toBe("Wednesday, November 18 – Thursday, November 19")
  })
})
