// What the native Event Calendar adds to the shared model: how the views map
// onto the native engine's modes, the plain events it draws, what a drop or a
// sweep becomes, the VoiceOver actions that stand in for dragging, and the
// chip's colours as React Native draws them (no OKLCH, no CSS variables).
// The rules themselves stay in the shared model, so a move lands the same on
// the website and on a phone.

import {
  createEventDraft,
  formatEventDay,
  formatEventTime,
  formatEventTimeRange,
  getEventColorVariables,
  getEventTimes,
  nudgeEvent,
  setEventTimes,
  type CalendarEvent,
  type EventCalendarColor,
  type EventCalendarHourCycle,
  type EventCalendarRange,
  type EventCalendarSettings,
  type EventCalendarView,
  type EventCalendarWeekday,
  type EventTimes,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import { oklchToHex } from "@/registry/fabricator/surface-tint"

// --- Views -------------------------------------------------------------------

type EngineMode = "day" | "custom" | "week" | "month" | "year" | "schedule"

const ENGINE_MODES: Record<EventCalendarView, EngineMode> = {
  day: "day",
  days: "custom",
  week: "week",
  month: "month",
  year: "year",
  agenda: "schedule",
}

function getEngineMode(view: EventCalendarView): EngineMode {
  return ENGINE_MODES[view]
}

const WEEKEND = [0, 6]

/** The weekdays a view leaves out when weekends are off. */
function getHiddenDays(view: EventCalendarView, showWeekends: boolean) {
  if (showWeekends) return undefined
  return view === "week" || view === "days" || view === "month"
    ? WEEKEND
    : undefined
}

// --- Events ------------------------------------------------------------------

/**
 * An event as the engine reads it: instants, the all-day flag and whether it
 * can be picked up. The calendar's own event rides along as `source`; its
 * RRULE string never reaches the engine, so occurrences come only from the
 * shared model.
 */
type EngineEvent<TData = unknown> = {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  draggable: boolean
  source: CalendarEvent<TData>
}

type EngineEventOptions = { timeZone?: string; isDraggable: boolean }

/** The engine's copy of an event, the same object while nothing changed. */
function getEngineEvent<TData>(
  event: CalendarEvent<TData>,
  { timeZone, isDraggable }: EngineEventOptions,
  cache: WeakMap<CalendarEvent<TData>, EngineEvent<TData>>
): EngineEvent<TData> {
  const cached = cache.get(event)
  if (cached && cached.draggable === isDraggable) return cached
  const times = getEventTimes(event, timeZone)
  const engine: EngineEvent<TData> = {
    id: event.id,
    title: event.title,
    start: times.start,
    end: times.end,
    allDay: times.allDay,
    draggable: isDraggable,
    source: event,
  }
  cache.set(event, engine)
  return engine
}

/** The event at a dropped or resized place, and which of the two it was. */
function getChangedEvent<TData>(
  event: CalendarEvent<TData>,
  start: Date,
  end: Date,
  timeZone?: string
): { next: CalendarEvent<TData>; reason: "move" | "resize" } {
  const times = getEventTimes(event, timeZone)
  const isSameLength = +end - +start === +times.end - +times.start
  const next = setEventTimes(
    event,
    { start, end, allDay: times.allDay },
    timeZone
  )
  return { next, reason: isSameLength ? "move" : "resize" }
}

/** A new event from a sweep: timed in a time grid, all-day across days. */
function getCreateDraft<TData>(options: {
  id: string
  start: Date
  end: Date
  allDay: boolean
  calendarId?: string
  timeZone?: string
}): CalendarEvent<TData> {
  return createEventDraft<TData>(options)
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE

/**
 * Where Create puts a new event: the next slot from now when now is on
 * screen, nine in the morning of the range's first day otherwise.
 */
function getNextSlotRange(
  now: Date,
  range: EventCalendarRange,
  {
    slotMinutes,
    eventMinutes,
  }: Pick<EventCalendarSettings, "slotMinutes" | "eventMinutes">
): EventCalendarRange {
  const slot = slotMinutes * MINUTE
  const isInRange = +now >= +range.start && +now < +range.end
  const base = isInRange ? +now : +range.start + 9 * HOUR
  const start = new Date(Math.ceil(base / slot) * slot)
  return { start, end: new Date(+start + eventMinutes * MINUTE) }
}

// --- Actions -----------------------------------------------------------------

// VoiceOver and TalkBack can't drag, so every drag has an action.
const EVENT_ACTIONS = {
  "move-earlier": "Move earlier",
  "move-later": "Move later",
  "next-day": "Next day",
  "previous-day": "Previous day",
  lengthen: "Lengthen",
  shorten: "Shorten",
  delete: "Delete",
} as const

type EventActionName = keyof typeof EVENT_ACTIONS

type EventAction = { name: EventActionName; label: string }

const TIMED_ACTIONS: EventActionName[] = [
  "move-earlier",
  "move-later",
  "next-day",
  "previous-day",
  "lengthen",
  "shorten",
  "delete",
]

const ALL_DAY_ACTIONS: EventActionName[] = [
  "next-day",
  "previous-day",
  "lengthen",
  "shorten",
  "delete",
]

function getEventActions({
  isAllDay,
  canEdit,
}: {
  isAllDay: boolean
  canEdit: boolean
}): EventAction[] {
  if (!canEdit) return []
  return (isAllDay ? ALL_DAY_ACTIONS : TIMED_ACTIONS).map((name) => ({
    name,
    label: EVENT_ACTIONS[name],
  }))
}

function isEventActionName(value: string): value is EventActionName {
  return Object.hasOwn(EVENT_ACTIONS, value)
}

type EventActionResult<TData> =
  | { kind: "update"; event: CalendarEvent<TData>; reason: "move" | "resize" }
  | { kind: "delete" }

/** What an action does to the event, through the keyboard's nudges. */
function applyEventAction<TData>(
  name: EventActionName,
  event: CalendarEvent<TData>,
  { slotMinutes, timeZone }: { slotMinutes: number; timeZone?: string }
): EventActionResult<TData> {
  const isAllDay = getEventTimes(event, timeZone).allDay
  // An all-day event grows by days; a timed one by the slot.
  const step = isAllDay
    ? { minutes: 0, days: 1 }
    : { minutes: slotMinutes, days: 0 }
  const nudge = (
    minutes: number,
    days: number,
    resize: boolean
  ): EventActionResult<TData> => ({
    kind: "update",
    reason: resize ? "resize" : "move",
    event: nudgeEvent(event, { minutes, days, resize }, timeZone, slotMinutes),
  })
  switch (name) {
    case "move-earlier":
      return nudge(-slotMinutes, 0, false)
    case "move-later":
      return nudge(slotMinutes, 0, false)
    case "next-day":
      return nudge(0, 1, false)
    case "previous-day":
      return nudge(0, -1, false)
    case "lengthen":
      return nudge(step.minutes, step.days, true)
    case "shorten":
      return nudge(-step.minutes, -step.days, true)
    case "delete":
      return { kind: "delete" }
  }
}

// --- Colour ------------------------------------------------------------------

type ColorScheme = "light" | "dark"

/** The chip's three colours, as React Native draws them. */
type ChipPalette = { fill: string; text: string; foreground: string }

const OKLCH = /^oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)$/
const VARIABLE = /^var\((--[\w-]+)\)$/
// The neutral the role recipe falls back to: a mid grey that reads on both.
const FALLBACK_COLOR = oklchToHex(0.55, 0, 0)

function resolveColorLiteral(
  value: string,
  readVariable: (name: string) => string | undefined
) {
  const oklch = OKLCH.exec(value)
  if (oklch) {
    return oklchToHex(Number(oklch[1]), Number(oklch[2]), Number(oklch[3]))
  }
  const variable = VARIABLE.exec(value)
  if (variable) return readVariable(variable[1]) ?? FALLBACK_COLOR
  return value
}

/**
 * The fill, text and foreground of an event's colour in the scheme: the
 * shared model's literals for a hue, the theme's colours for a role.
 */
function getChipPalette(
  color: EventCalendarColor,
  scheme: ColorScheme,
  readVariable: (name: string) => string | undefined
): ChipPalette {
  const variables = getEventColorVariables(color)
  const read = (slot: "fill" | "text" | "foreground") =>
    resolveColorLiteral(
      variables[`--event-calendar-${slot}-${scheme}`] ?? "",
      readVariable
    )
  return {
    fill: read("fill"),
    text: read("text"),
    foreground: read("foreground"),
  }
}

const HEX = /^#([\da-f]{6})$/i

/** A hex colour at an opacity, as the website's `bg-(--fill)/14`. */
function withAlpha(color: string, alpha: number) {
  const hex = HEX.exec(color)?.[1]
  if (!hex) return color
  const channels = [0, 2, 4].map((at) =>
    Number.parseInt(hex.slice(at, at + 2), 16)
  )
  return `rgba(${channels.join(", ")}, ${alpha})`
}

// --- Chips -------------------------------------------------------------------

type ChipVariant = "block" | "row" | "dot"

/** A block in a time grid, a bar for all-day and multi-day, a dot in a month. */
function getChipVariant({
  mode,
  isAllDay,
  isMultiDay,
}: {
  mode: string
  isAllDay: boolean
  isMultiDay: boolean
}): ChipVariant {
  if (isAllDay) return "row"
  if (mode === "month" || mode === "year" || mode === "multiweek") {
    return isMultiDay ? "row" : "dot"
  }
  return "block"
}

type FormatOptions = {
  locale?: string
  timeZone?: string
  hourCycle: EventCalendarHourCycle
}

function getChipTimeText(
  variant: ChipVariant,
  times: EventTimes,
  options: FormatOptions
) {
  if (variant === "row") return ""
  if (variant === "dot") return formatEventTime(times.start, options)
  return formatEventTimeRange(times, options)
}

/** "Standup, Wednesday, November 18, 9:30 – 9:45 AM, Team" */
function getEventAccessibilityLabel(
  event: CalendarEvent,
  options: FormatOptions & { calendarName?: string }
) {
  const times = getEventTimes(event, options.timeZone)
  return [
    event.title || "(No title)",
    formatEventDay(times.start, options),
    formatEventTimeRange(times, options),
    options.calendarName,
  ]
    .filter(Boolean)
    .join(", ")
}

// --- Engine theme ------------------------------------------------------------

/** The tokens the engine's own drawing reads, in order. */
const ENGINE_THEME_VARIABLES = [
  "--card",
  "--border",
  "--hover",
  "--active",
  "--primary",
  "--primary-foreground",
  "--destructive",
  "--foreground",
  "--muted-foreground",
  "--font-sans",
] as const

type EngineThemeColor =
  | "surface"
  | "gridLine"
  | "weekendBackground"
  | "outsideHoursBackground"
  | "todayBackground"
  | "todayText"
  | "selectedBackground"
  | "selectedText"
  | "rangeBackground"
  | "nowIndicator"
  | "text"
  | "textMuted"
  | "textDisabled"

type EngineTextStyle = { fontFamily?: string; fontWeight?: "500" | "600" }

/** A partial theme for the engine, shaped as its `theme` prop takes it. */
type EngineTheme = {
  colors: Partial<Record<EngineThemeColor, string>>
  text?: {
    dayNumber?: EngineTextStyle
    dateCell?: EngineTextStyle
    monthTitle?: EngineTextStyle
  }
}

const ENGINE_COLORS: Record<
  EngineThemeColor,
  (typeof ENGINE_THEME_VARIABLES)[number]
> = {
  surface: "--card",
  gridLine: "--border",
  weekendBackground: "--hover",
  outsideHoursBackground: "--hover",
  todayBackground: "--primary",
  todayText: "--primary-foreground",
  selectedBackground: "--primary",
  selectedText: "--primary-foreground",
  rangeBackground: "--active",
  nowIndicator: "--destructive",
  text: "--foreground",
  textMuted: "--muted-foreground",
  textDisabled: "--muted-foreground",
}

/**
 * What the engine paints itself (the today disc, the now line, grid lines),
 * from the theme's tokens: `values` is `ENGINE_THEME_VARIABLES` read in order.
 * The date numbers take the body font; the parts with a slot take classes.
 */
function getEngineTheme(values: readonly (string | undefined)[]): EngineTheme {
  const read = (name: (typeof ENGINE_THEME_VARIABLES)[number]) => {
    const value = values[ENGINE_THEME_VARIABLES.indexOf(name)]
    return value ? value : undefined
  }
  const colors: EngineTheme["colors"] = {}
  for (const [key, name] of Object.entries(ENGINE_COLORS)) {
    const value = read(name)
    if (value) Object.assign(colors, { [key]: value })
  }
  const fontFamily = read("--font-sans")
  return {
    colors,
    text: {
      dayNumber: { fontFamily, fontWeight: "500" },
      dateCell: { fontFamily, fontWeight: "500" },
      monthTitle: { fontFamily, fontWeight: "600" },
    },
  }
}

// --- Business hours ----------------------------------------------------------

type BusinessHours = {
  days: EventCalendarWeekday[]
  start: string
  end: string
}

const toHours = (time: string) => {
  const [hours = 0, minutes = 0] = time.split(":").map(Number)
  return hours + minutes / 60
}

/** The engine's open hours per day; closed days shade whole. */
function getEngineBusinessHours(hours: BusinessHours | false) {
  if (!hours) return undefined
  const open = { start: toHours(hours.start), end: toHours(hours.end) }
  const days = new Set<number>(hours.days)
  return (date: Date) => (days.has(date.getDay()) ? open : null)
}

export {
  applyEventAction,
  getChangedEvent,
  getChipPalette,
  getChipTimeText,
  getChipVariant,
  getCreateDraft,
  getEngineBusinessHours,
  getEngineEvent,
  getEngineMode,
  getEngineTheme,
  ENGINE_THEME_VARIABLES,
  getEventAccessibilityLabel,
  getEventActions,
  getHiddenDays,
  getNextSlotRange,
  isEventActionName,
  withAlpha,
  type ChipPalette,
  type ChipVariant,
  type ColorScheme,
  type EngineEvent,
  type EngineMode,
  type EngineTheme,
  type EventAction,
  type EventActionName,
  type EventActionResult,
}
