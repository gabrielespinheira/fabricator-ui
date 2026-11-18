import { describe, expect, it } from "vitest"

import {
  collectChunkEvents,
  getChunkKeys,
  getChunkRange,
  getKeysToEvict,
  getKeysToLoad,
  patchChunks,
  type EventCalendarChunks,
} from "@/registry/fabricator/shared/lib/event-calendar-loader"
import {
  createEventChange,
  formatEventDate,
  parseEventDate,
  type CalendarEvent,
} from "@/registry/fabricator/shared/lib/event-calendar-model"

const LISBON = "Europe/Lisbon"

function event(
  id: string,
  start: string,
  end: string,
  patch: Partial<CalendarEvent> = {}
): CalendarEvent {
  return { id, title: id, start, end, ...patch }
}

const range = (from: string, to: string) => ({
  start: parseEventDate(from, LISBON),
  end: parseEventDate(to, LISBON),
})

describe("chunks", () => {
  it("splits a range into the months it touches", () => {
    expect(getChunkKeys(range("2026-10-25", "2026-12-06"), LISBON)).toEqual([
      "2026-10",
      "2026-11",
      "2026-12",
    ])
    expect(getChunkKeys(range("2026-11-01", "2026-12-01"), LISBON)).toEqual([
      "2026-11",
    ])
  })

  it("adds the neighbouring months to prefetch", () => {
    expect(
      getChunkKeys(range("2026-11-01", "2026-12-01"), LISBON, {
        prefetch: true,
      })
    ).toEqual(["2026-11", "2026-10", "2026-12"])
  })

  it("gives a month's range", () => {
    const { start, end } = getChunkRange("2026-12", LISBON)
    expect(formatEventDate(start, "date", LISBON)).toBe("2026-12-01")
    expect(formatEventDate(end, "date", LISBON)).toBe("2027-01-01")
  })

  it("loads only what was never asked for", () => {
    const chunks: EventCalendarChunks = new Map([
      ["2026-10", { status: "loaded", events: [] }],
      ["2026-11", { status: "loading", events: [] }],
      ["2026-12", { status: "error", events: [] }],
    ])
    expect(
      getKeysToLoad(chunks, ["2026-10", "2026-11", "2026-12", "2027-01"])
    ).toEqual(["2027-01"])
  })

  it("collects events once across months", () => {
    const long = event("trip", "2026-10-30", "2026-11-03")
    const chunks: EventCalendarChunks = new Map([
      ["2026-10", { status: "loaded", events: [long] }],
      [
        "2026-11",
        {
          status: "loaded",
          events: [
            long,
            event("a", "2026-11-05T10:00:00", "2026-11-05T11:00:00"),
          ],
        },
      ],
    ])
    expect(
      collectChunkEvents(chunks, ["2026-10", "2026-11"]).map((item) => item.id)
    ).toEqual(["trip", "a"])
  })
})

describe("patchChunks", () => {
  const a = event("a", "2026-11-05T10:00:00", "2026-11-05T11:00:00")
  const chunks: EventCalendarChunks = new Map([
    ["2026-11", { status: "loaded", events: [a] }],
    ["2026-12", { status: "loaded", events: [] }],
  ])

  it("moves an event to the month it now falls in", () => {
    const moved = {
      ...a,
      start: "2026-12-02T10:00:00",
      end: "2026-12-02T11:00:00",
    }
    const next = patchChunks(
      chunks,
      createEventChange({
        reason: "move",
        event: moved,
        updated: [moved],
        replaced: [a],
      }),
      LISBON
    )
    expect(next.get("2026-11")?.events).toEqual([])
    expect(next.get("2026-12")?.events).toEqual([moved])
    expect(chunks.get("2026-11")?.events).toEqual([a])
  })

  it("adds created events to loaded months and removes deleted ones", () => {
    const created = event("b", "2026-11-20T10:00:00", "2026-11-20T11:00:00")
    const added = patchChunks(
      chunks,
      createEventChange({
        reason: "create",
        event: created,
        created: [created],
      }),
      LISBON
    )
    expect(added.get("2026-11")?.events.map((item) => item.id)).toEqual([
      "a",
      "b",
    ])
    const removed = patchChunks(
      added,
      createEventChange({ reason: "delete", event: a, deleted: [a] }),
      LISBON
    )
    expect(removed.get("2026-11")?.events.map((item) => item.id)).toEqual(["b"])
  })

  it("keeps a series in every month from its start", () => {
    const series = event("s", "2026-11-02T10:00:00", "2026-11-02T10:15:00", {
      recurrence: "RRULE:FREQ=WEEKLY",
    })
    const next = patchChunks(
      chunks,
      createEventChange({ reason: "create", event: series, created: [series] }),
      LISBON
    )
    expect(next.get("2026-12")?.events).toEqual([series])
  })
})

describe("getKeysToEvict", () => {
  const chunk = { status: "loaded" as const, events: [] }
  const months = [
    "2026-01",
    "2026-02",
    "2026-03",
    "2026-10",
    "2026-11",
    "2026-12",
    "2027-01",
  ]
  const chunks: EventCalendarChunks = new Map(months.map((key) => [key, chunk]))

  it("keeps everything while the cache is within its size", () => {
    expect(getKeysToEvict(chunks, ["2026-11"], 10)).toEqual([])
  })

  it("drops the months farthest from the view first, never the ones in view", () => {
    expect(getKeysToEvict(chunks, ["2026-11", "2026-12"], 4)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
    ])
  })

  it("leaves months that are still loading", () => {
    const loading: EventCalendarChunks = new Map([
      ...chunks,
      ["2025-01", { status: "loading" as const, events: [] }],
    ])
    expect(getKeysToEvict(loading, ["2026-11"], 7)).not.toContain("2025-01")
  })
})
