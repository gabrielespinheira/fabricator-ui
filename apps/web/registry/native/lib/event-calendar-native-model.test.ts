import { describe, expect, it } from "vitest"

import { type CalendarEvent } from "@/registry/fabricator/shared/lib/event-calendar-model"

import {
  applyEventAction,
  ENGINE_THEME_VARIABLES,
  getChangedEvent,
  getChipPalette,
  getChipTimeText,
  getChipVariant,
  getCreateDraft,
  getEngineBusinessHours,
  getEngineEvent,
  getEngineMode,
  getEngineTheme,
  getEventAccessibilityLabel,
  getEventActions,
  getHiddenDays,
  getNextSlotRange,
  withAlpha,
  type EngineEvent,
} from "./event-calendar-native-model"

const ZONE = "Europe/Lisbon"

const standup: CalendarEvent = {
  id: "standup",
  title: "Standup",
  start: "2026-11-18T09:30:00",
  end: "2026-11-18T09:45:00",
  calendarId: "team",
}

const offsite: CalendarEvent = {
  id: "offsite",
  title: "Team offsite",
  start: "2026-11-19",
  end: "2026-11-21",
}

describe("getEngineMode", () => {
  it("maps each view to the engine's mode", () => {
    expect(getEngineMode("day")).toBe("day")
    expect(getEngineMode("days")).toBe("custom")
    expect(getEngineMode("week")).toBe("week")
    expect(getEngineMode("month")).toBe("month")
    expect(getEngineMode("year")).toBe("year")
    expect(getEngineMode("agenda")).toBe("schedule")
  })
})

describe("getHiddenDays", () => {
  it("hides Saturday and Sunday from multi-day views without weekends", () => {
    expect(getHiddenDays("week", false)).toEqual([0, 6])
    expect(getHiddenDays("days", false)).toEqual([0, 6])
    expect(getHiddenDays("month", false)).toEqual([0, 6])
  })

  it("keeps every day otherwise", () => {
    expect(getHiddenDays("week", true)).toBeUndefined()
    expect(getHiddenDays("day", false)).toBeUndefined()
    expect(getHiddenDays("year", false)).toBeUndefined()
  })
})

describe("getEngineEvent", () => {
  it("hands the engine plain instants and keeps the event beside them", () => {
    const cache = new WeakMap<CalendarEvent, EngineEvent>()
    const engine = getEngineEvent(
      standup,
      { timeZone: ZONE, isDraggable: true },
      cache
    )
    expect(engine.id).toBe("standup")
    expect(engine.title).toBe("Standup")
    expect(engine.start.toISOString()).toBe("2026-11-18T09:30:00.000Z")
    expect(engine.end.toISOString()).toBe("2026-11-18T09:45:00.000Z")
    expect(engine.allDay).toBe(false)
    expect(engine.draggable).toBe(true)
    expect(engine.source).toBe(standup)
  })

  it("never passes a recurrence rule on, so the engine expands nothing", () => {
    const cache = new WeakMap<CalendarEvent, EngineEvent>()
    const engine = getEngineEvent(
      { ...standup, recurrence: "RRULE:FREQ=DAILY" },
      { timeZone: ZONE, isDraggable: true },
      cache
    )
    expect("recurrence" in engine).toBe(false)
  })

  it("marks all-day events", () => {
    const cache = new WeakMap<CalendarEvent, EngineEvent>()
    expect(
      getEngineEvent(offsite, { timeZone: ZONE, isDraggable: false }, cache)
        .allDay
    ).toBe(true)
  })

  it("keeps an unchanged event's identity, so the engine skips it", () => {
    const cache = new WeakMap<CalendarEvent, EngineEvent>()
    const options = { timeZone: ZONE, isDraggable: true }
    const first = getEngineEvent(standup, options, cache)
    expect(getEngineEvent(standup, options, cache)).toBe(first)
    expect(
      getEngineEvent(standup, { ...options, isDraggable: false }, cache)
    ).not.toBe(first)
  })
})

describe("getChangedEvent", () => {
  it("calls a drop that keeps the length a move", () => {
    const { next, reason } = getChangedEvent(
      standup,
      new Date("2026-11-19T10:00:00Z"),
      new Date("2026-11-19T10:15:00Z"),
      ZONE
    )
    expect(reason).toBe("move")
    expect(next.start).toBe("2026-11-19T10:00:00")
    expect(next.end).toBe("2026-11-19T10:15:00")
  })

  it("calls a new length a resize", () => {
    const { next, reason } = getChangedEvent(
      standup,
      new Date("2026-11-18T09:30:00Z"),
      new Date("2026-11-18T10:30:00Z"),
      ZONE
    )
    expect(reason).toBe("resize")
    expect(next.end).toBe("2026-11-18T10:30:00")
  })

  it("keeps an all-day event all-day", () => {
    const { next } = getChangedEvent(
      offsite,
      new Date("2026-11-24T00:00:00Z"),
      new Date("2026-11-26T00:00:00Z"),
      ZONE
    )
    expect(next.start).toBe("2026-11-24")
    expect(next.end).toBe("2026-11-26")
    expect(next.allDay).toBe(true)
  })
})

describe("getCreateDraft", () => {
  it("drafts a timed event with an offset", () => {
    const draft = getCreateDraft({
      id: "new",
      start: new Date("2026-11-18T14:00:00Z"),
      end: new Date("2026-11-18T15:00:00Z"),
      allDay: false,
      calendarId: "work",
      timeZone: ZONE,
    })
    expect(draft).toEqual({
      id: "new",
      title: "",
      start: "2026-11-18T14:00:00+00:00",
      end: "2026-11-18T15:00:00+00:00",
      calendarId: "work",
    })
  })

  it("drafts an all-day span from a month sweep", () => {
    const draft = getCreateDraft({
      id: "new",
      start: new Date("2026-11-18T00:00:00Z"),
      end: new Date("2026-11-20T00:00:00Z"),
      allDay: true,
      timeZone: ZONE,
    })
    expect(draft.start).toBe("2026-11-18")
    expect(draft.end).toBe("2026-11-20")
    expect(draft.allDay).toBe(true)
  })
})

describe("getNextSlotRange", () => {
  const range = {
    start: new Date("2026-11-15T00:00:00Z"),
    end: new Date("2026-11-22T00:00:00Z"),
  }

  it("starts at the next slot when now is in the range", () => {
    const { start, end } = getNextSlotRange(
      new Date("2026-11-18T10:07:00Z"),
      range,
      { slotMinutes: 15, eventMinutes: 60 }
    )
    expect(start.toISOString()).toBe("2026-11-18T10:15:00.000Z")
    expect(end.toISOString()).toBe("2026-11-18T11:15:00.000Z")
  })

  it("starts at nine on the range's first day otherwise", () => {
    const { start } = getNextSlotRange(
      new Date("2026-12-01T10:07:00Z"),
      range,
      { slotMinutes: 30, eventMinutes: 30 }
    )
    expect(start.toISOString()).toBe("2026-11-15T09:00:00.000Z")
  })
})

describe("getEventActions", () => {
  it("offers a timed event every move, the resizes and delete", () => {
    expect(
      getEventActions({ isAllDay: false, canEdit: true }).map(
        (action) => action.name
      )
    ).toEqual([
      "move-earlier",
      "move-later",
      "next-day",
      "previous-day",
      "lengthen",
      "shorten",
      "delete",
    ])
  })

  it("moves an all-day event by days only", () => {
    expect(
      getEventActions({ isAllDay: true, canEdit: true }).map(
        (action) => action.name
      )
    ).toEqual(["next-day", "previous-day", "lengthen", "shorten", "delete"])
  })

  it("offers nothing on an event that can't change", () => {
    expect(getEventActions({ isAllDay: false, canEdit: false })).toEqual([])
  })

  it("labels every action for VoiceOver", () => {
    const labels = getEventActions({ isAllDay: false, canEdit: true }).map(
      (action) => action.label
    )
    expect(labels).toEqual([
      "Move earlier",
      "Move later",
      "Next day",
      "Previous day",
      "Lengthen",
      "Shorten",
      "Delete",
    ])
  })
})

describe("applyEventAction", () => {
  const options = { slotMinutes: 15, timeZone: ZONE }

  it("moves by one slot", () => {
    const result = applyEventAction("move-later", standup, options)
    expect(result).toEqual({
      kind: "update",
      reason: "move",
      event: {
        ...standup,
        start: "2026-11-18T09:45:00",
        end: "2026-11-18T10:00:00",
      },
    })
  })

  it("moves by a day, keeping the time", () => {
    const result = applyEventAction("previous-day", standup, options)
    expect(result.kind === "update" && result.event.start).toBe(
      "2026-11-17T09:30:00"
    )
  })

  it("resizes from the end and never below one slot", () => {
    const longer = applyEventAction("lengthen", standup, options)
    expect(longer.kind === "update" && longer.event.end).toBe(
      "2026-11-18T10:00:00"
    )
    expect(longer.kind === "update" && longer.reason).toBe("resize")
    const shorter = applyEventAction("shorten", standup, options)
    expect(shorter.kind === "update" && shorter.event.end).toBe(
      "2026-11-18T09:45:00"
    )
  })

  it("lengthens an all-day event by a day", () => {
    const result = applyEventAction("lengthen", offsite, options)
    expect(result.kind === "update" && result.event.end).toBe("2026-11-22")
  })

  it("asks for a delete", () => {
    expect(applyEventAction("delete", standup, options)).toEqual({
      kind: "delete",
    })
  })
})

describe("getChipPalette", () => {
  const read = (name: string) =>
    ({
      "--info": "#1d4ed8",
      "--info-text": "#1e40af",
      "--info-foreground": "#ffffff",
    })[name]

  it("turns a hue's OKLCH literals into hex for the scheme", () => {
    const light = getChipPalette("blue", "light", read)
    const dark = getChipPalette("blue", "dark", read)
    for (const value of [...Object.values(light), ...Object.values(dark)]) {
      expect(value).toMatch(/^#[\da-f]{6}$/)
    }
    expect(light.fill).not.toBe(dark.fill)
  })

  it("reads a role's colours from the theme", () => {
    expect(getChipPalette("info", "light", read)).toEqual({
      fill: "#1d4ed8",
      text: "#1e40af",
      foreground: "#ffffff",
    })
  })

  it("draws grey for a role the theme doesn't know", () => {
    expect(getChipPalette("warning", "dark", () => undefined).fill).toMatch(
      /^#[\da-f]{6}$/
    )
  })
})

describe("withAlpha", () => {
  it("writes a hex colour as rgba", () => {
    expect(withAlpha("#ff8000", 0.14)).toBe("rgba(255, 128, 0, 0.14)")
  })

  it("leaves what it can't read alone", () => {
    expect(withAlpha("red", 0.5)).toBe("red")
  })
})

describe("getChipVariant", () => {
  it("draws blocks in time grids and bars for all-day events", () => {
    expect(
      getChipVariant({ mode: "week", isAllDay: false, isMultiDay: false })
    ).toBe("block")
    expect(
      getChipVariant({ mode: "week", isAllDay: true, isMultiDay: false })
    ).toBe("row")
  })

  it("draws timed events in a month as a dot and multi-day ones as bars", () => {
    expect(
      getChipVariant({ mode: "month", isAllDay: false, isMultiDay: false })
    ).toBe("dot")
    expect(
      getChipVariant({ mode: "month", isAllDay: false, isMultiDay: true })
    ).toBe("row")
  })
})

describe("getChipTimeText", () => {
  const format = { locale: "en-US", timeZone: ZONE, hourCycle: "h23" as const }
  const times = {
    start: new Date("2026-11-18T09:30:00Z"),
    end: new Date("2026-11-18T09:45:00Z"),
    allDay: false,
  }

  it("shows the range on a block, the start on a dot, nothing on a bar", () => {
    expect(getChipTimeText("block", times, format)).toMatch(
      /09:30\s*[–-]\s*09:45/
    )
    expect(getChipTimeText("dot", times, format)).toBe("09:30")
    expect(getChipTimeText("row", times, format)).toBe("")
  })
})

describe("getEventAccessibilityLabel", () => {
  it("reads the title, day, time and calendar", () => {
    expect(
      getEventAccessibilityLabel(standup, {
        calendarName: "Team",
        locale: "en-US",
        timeZone: ZONE,
        hourCycle: "h12",
      })
    ).toMatch(/^Standup, Wednesday, November 18, 9:30\s*[–-]\s*9:45\sAM, Team$/)
  })

  it("names an untitled event", () => {
    expect(
      getEventAccessibilityLabel(
        { ...offsite, title: "" },
        { locale: "en-US", timeZone: ZONE, hourCycle: "h12" }
      )
    ).toBe("(No title), Thursday, November 19, All day")
  })
})

describe("getEngineBusinessHours", () => {
  it("opens the listed days between the hours", () => {
    const hours = getEngineBusinessHours({
      days: [1, 2, 3, 4, 5],
      start: "09:00",
      end: "17:30",
    })
    expect(hours?.(new Date(2026, 10, 18))).toEqual({ start: 9, end: 17.5 })
    expect(hours?.(new Date(2026, 10, 15))).toBeNull()
  })

  it("shades nothing when turned off", () => {
    expect(getEngineBusinessHours(false)).toBeUndefined()
  })
})

describe("getEngineTheme", () => {
  const tokens: Record<string, string> = {
    "--card": "#ffffff",
    "--border": "rgba(23, 23, 23, 0.12)",
    "--hover": "rgba(0, 0, 0, 0.04)",
    "--active": "rgba(0, 0, 0, 0.08)",
    "--primary": "#171717",
    "--primary-foreground": "#fafafa",
    "--destructive": "#b00a1d",
    "--foreground": "#0a0a0a",
    "--muted-foreground": "#737373",
    "--font-sans": "Inter",
  }

  it("reads the theme's tokens", () => {
    expect(ENGINE_THEME_VARIABLES).toEqual(Object.keys(tokens))
    const theme = getEngineTheme(
      ENGINE_THEME_VARIABLES.map((name) => tokens[name])
    )
    expect(theme.colors).toMatchObject({
      surface: "#ffffff",
      gridLine: "rgba(23, 23, 23, 0.12)",
      weekendBackground: "rgba(0, 0, 0, 0.04)",
      outsideHoursBackground: "rgba(0, 0, 0, 0.04)",
      todayBackground: "#171717",
      todayText: "#fafafa",
      nowIndicator: "#b00a1d",
      text: "#0a0a0a",
      textMuted: "#737373",
    })
    expect(theme.text?.dayNumber?.fontFamily).toBe("Inter")
  })

  it("keeps the engine's defaults for tokens it can't read", () => {
    const theme = getEngineTheme([])
    expect(theme.colors).toEqual({})
    expect(theme.text?.dayNumber?.fontFamily).toBeUndefined()
  })
})
