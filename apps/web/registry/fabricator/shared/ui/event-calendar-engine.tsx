"use client"

// The Event Calendar's adapter to FullCalendar 7, the only file that imports
// it. It hands FullCalendar the events of the visible range, keeps every
// option and callback stable (FullCalendar treats a new array or function as
// a change), styles every element through the style map's placeholders, and
// turns FullCalendar's drops, resizes, selections and clicks into calls on
// the controller. FullCalendar's own state never wins: a drop reverts there
// and lands through the controller's optimistic layer.
import * as React from "react"
import {
  Calendar as FullCalendar,
  joinClassNames,
  type CalendarApi,
  type CalendarOptions,
  type CalendarRef,
  type DateSelectInfo,
  type DayCellInfo,
  type DayHeaderInfo,
  type DayLaneInfo,
  type EventApi,
  type EventClickInfo,
  type EventDisplayInfo,
  type EventDropInfo,
  type EventInput,
  type EventResizeDoneInfo,
  type MoreLinkInfo,
  type MountInfo,
  type SlotHeaderInfo,
  type SlotLaneInfo,
} from "@fullcalendar/react"
import dayGridPlugin from "@fullcalendar/react/daygrid"
import interactionPlugin from "@fullcalendar/react/interaction"
import timeGridPlugin from "@fullcalendar/react/timegrid"
import { cn } from "cn"

import "@fullcalendar/react/skeleton.css"

import { type EventCalendarController } from "@/registry/bases/__base__/hooks/use-event-calendar"
import {
  createEventDraft,
  formatEventTime,
  formatEventTimeRange,
  getContinuityBuffer,
  getContinuousWindow,
  getEventTimes,
  isEventCalendarView,
  isTimeGridView,
  overlapsRange,
  parseEventDate,
  resolveEventColor,
  setEventTimes,
  type CalendarEvent,
  type EventCalendarView,
} from "@/registry/bases/__base__/lib/event-calendar-model"
import { useDensity } from "@/registry/bases/__base__/ui/density"
import {
  EventCalendarEvent,
  type EventCalendarEventVariant,
} from "@/registry/bases/__base__/ui/event-calendar-event"

type EventCalendarRenderEventProps<TData = unknown> = {
  event: CalendarEvent<TData>
  variant: EventCalendarEventVariant
  timeText: string
  isShort: boolean
  isPast: boolean
  isPending: boolean
  isSelected: boolean
  isDragging: boolean
  isDraft: boolean
}

type EventCalendarEngineProps<TData = unknown> = {
  calendar: EventCalendarController<TData>
  /** Replaces the chip; `EventCalendarEvent` is there to reuse. */
  renderEvent?: (props: EventCalendarRenderEventProps<TData>) => React.ReactNode
  /** An event shown while it's created, before it's saved. */
  draft?: CalendarEvent<TData>
  /** An event shown where the keyboard is moving it, before it's dropped. */
  preview?: CalendarEvent<TData>
  /** Where a panel opened from the grid should point. */
  onAnchor?: (element: HTMLElement | null) => void
  /** Right-click or long press on an event. */
  onEventMenu?: (
    event: CalendarEvent<TData>,
    point: { x: number; y: number }
  ) => void
  /** FullCalendar options merged last: plugins, a licence key, any hook. */
  fullCalendar?: CalendarOptions
  /** FullCalendar's API, once it mounts. */
  onEngine?: (api: CalendarApi | undefined) => void
  className?: string
}

const plugins = [dayGridPlugin, timeGridPlugin, interactionPlugin]

// --- Classes -----------------------------------------------------------------
// FullCalendar takes classes as strings or functions, not JSX. The build
// compiles placeholders outside JSX only in a `className: cn(…)` property, so
// each class is read from one; the functions below only pick between them.

const rootClass = { className: cn("cn-event-calendar-grid") }.className
const viewClass = { className: cn("cn-event-calendar-view") }.className
const tableHeaderClass = { className: cn("cn-event-calendar-table-header") }
  .className
const tableBodyClass = { className: cn("cn-event-calendar-table-body") }
  .className
const fillerClass = { className: cn("cn-event-calendar-filler") }.className
const dayHeaderRowClass = { className: cn("cn-event-calendar-day-header-row") }
  .className
const dayRowClass = { className: cn("cn-event-calendar-day-row") }.className

const dayHeaderClass = { className: cn("cn-event-calendar-day-header") }
  .className
const dayHeaderInnerClass = {
  className: cn("cn-event-calendar-day-header-inner"),
}.className
const dayHeaderTodayClass = {
  className: cn("cn-event-calendar-day-header-today"),
}.className
const dayHeaderDividerClass = {
  className: cn("cn-event-calendar-day-header-divider"),
}.className

const dayCellClass = { className: cn("cn-event-calendar-day-cell") }.className
const dayCellTodayClass = { className: cn("cn-event-calendar-day-cell-today") }
  .className
const dayCellOtherClass = { className: cn("cn-event-calendar-day-cell-other") }
  .className
const dayCellDisabledClass = {
  className: cn("cn-event-calendar-day-cell-disabled"),
}.className
const dayCellTopClass = { className: cn("cn-event-calendar-day-cell-top") }
  .className
const dayCellNumberClass = {
  className: cn("cn-event-calendar-day-cell-number"),
}.className
const dayCellNumberTodayClass = {
  className: cn("cn-event-calendar-day-cell-number-today"),
}.className
const dayCellInnerClass = { className: cn("cn-event-calendar-day-cell-inner") }
  .className
const dayCellBottomShortClass = {
  className: cn("cn-event-calendar-day-cell-bottom-short"),
}.className
const dayCellBottomTallClass = {
  className: cn("cn-event-calendar-day-cell-bottom-tall"),
}.className

const dayLaneClass = { className: cn("cn-event-calendar-day-lane") }.className
const dayLaneTodayClass = { className: cn("cn-event-calendar-day-lane-today") }
  .className
const dayLaneInnerClass = { className: cn("cn-event-calendar-day-lane-inner") }
  .className
const slotLaneClass = { className: cn("cn-event-calendar-slot-lane") }.className
const slotLaneMinorClass = {
  className: cn("cn-event-calendar-slot-lane-minor"),
}.className
const slotHeaderClass = { className: cn("cn-event-calendar-slot-header") }
  .className
const slotHeaderInnerClass = {
  className: cn("cn-event-calendar-slot-header-inner"),
}.className
const slotHeaderFirstClass = {
  className: cn("cn-event-calendar-slot-header-first"),
}.className
const slotHeaderDividerClass = {
  className: cn("cn-event-calendar-slot-header-divider"),
}.className
const allDayHeaderClass = { className: cn("cn-event-calendar-all-day-header") }
  .className
const allDayHeaderInnerClass = {
  className: cn("cn-event-calendar-all-day-header-inner"),
}.className
const allDayDividerClass = {
  className: cn("cn-event-calendar-all-day-divider"),
}.className

const eventClass = { className: cn("cn-event-calendar-fc-event") }.className
const eventInnerClass = { className: cn("cn-event-calendar-fc-event-inner") }
  .className
const columnEventClass = { className: cn("cn-event-calendar-fc-column-event") }
  .className
const rowEventClass = { className: cn("cn-event-calendar-fc-row-event") }
  .className
const listItemEventClass = {
  className: cn("cn-event-calendar-fc-list-item-event"),
}.className
const resizerStartClass = {
  className: cn("cn-event-calendar-fc-resizer-start"),
}.className
const resizerEndClass = { className: cn("cn-event-calendar-fc-resizer-end") }
  .className
const columnResizerStartClass = {
  className: cn("cn-event-calendar-fc-column-resizer-start"),
}.className
const columnResizerEndClass = {
  className: cn("cn-event-calendar-fc-column-resizer-end"),
}.className

const moreLinkClass = { className: cn("cn-event-calendar-more-link") }.className
const moreLinkInnerClass = {
  className: cn("cn-event-calendar-more-link-inner"),
}.className
const columnMoreLinkClass = {
  className: cn("cn-event-calendar-column-more-link"),
}.className
const columnMoreLinkInnerClass = {
  className: cn("cn-event-calendar-column-more-link-inner"),
}.className
const popoverClass = { className: cn("cn-event-calendar-popover") }.className
const popoverCloseClass = { className: cn("cn-event-calendar-popover-close") }
  .className
const nowLineClass = { className: cn("cn-event-calendar-now-line") }.className
const nowDotClass = { className: cn("cn-event-calendar-now-dot") }.className
const highlightClass = { className: cn("cn-event-calendar-highlight") }
  .className
const nonBusinessClass = { className: cn("cn-event-calendar-non-business") }
  .className
const navLinkClass = { className: cn("cn-event-calendar-nav-link") }.className
const weekNumberClass = { className: cn("cn-event-calendar-week-number") }
  .className
const weekNumberHeaderClass = {
  className: cn("cn-event-calendar-week-number-header"),
}.className
const weekNumberHeaderInnerClass = {
  className: cn("cn-event-calendar-week-number-header-inner"),
}.className

const pick = (...classes: (string | false | undefined)[]) =>
  joinClassNames(...classes.filter((value): value is string => Boolean(value)))

// --- Views -------------------------------------------------------------------

// Slot heights per density, in pixels per half hour: the --density-36 step,
// mirrored here because FullCalendar takes a number (56, 72 and 88 an hour).
// React Native draws the same hour from the token.
const SLOT_HEIGHTS = { compact: 28, default: 36, spacious: 44 } as const

// A continuous grid is one time grid over every column it draws: those in
// view and the ones either side it scrolls into.
const CONTINUOUS_VIEW = "continuous"

function getViews(
  days: number,
  continuousDays: number
): CalendarOptions["views"] {
  return {
    [CONTINUOUS_VIEW]: {
      type: "timeGrid",
      duration: { days: Math.max(continuousDays, 1) },
    },
    day: { type: "timeGrid", duration: { days: 1 } },
    days: { type: "timeGrid", duration: { days } },
    week: { type: "timeGrid", duration: { weeks: 1 } },
    month: { type: "dayGrid", duration: { months: 1 }, fixedWeekCount: false },
    timeGrid: {
      dayHeaderFormat: { weekday: "short", day: "numeric" },
      dayCellBottomClass: dayCellBottomTallClass,
    },
    dayGrid: {
      dayHeaderFormat: { weekday: "short" },
      dayCellBottomClass: dayCellBottomShortClass,
    },
  }
}

function getDayCellClass(info: DayCellInfo) {
  return pick(
    dayCellClass,
    info.isToday && dayCellTodayClass,
    info.isOther && dayCellOtherClass,
    info.isDisabled && dayCellDisabledClass
  )
}

function getVariant(info: EventDisplayInfo): EventCalendarEventVariant {
  if (info.event.allDay) return "row"
  const type = info.view.type
  if (type === "month") {
    const event = readEvent(info.event)
    const times = event ? getEventTimes(event) : undefined
    const isMultiDay =
      times !== undefined && +times.end - +times.start >= 24 * 60 * 60 * 1000
    return isMultiDay ? "row" : "dot"
  }
  return "block"
}

type EventExtras<TData> = {
  event: CalendarEvent<TData>
  isDraft?: boolean
}

function readEvent<TData>(event: EventApi) {
  // FullCalendar types extendedProps loosely; they hold what toInput put.
  const extras: Partial<EventExtras<TData>> = event.extendedProps
  return extras.event
}

// --- Context for chips -------------------------------------------------------

// Only what a chip shows, so a change elsewhere in the controller doesn't
// redraw every event.
type ChipContextValue<TData> = Pick<
  EventCalendarController<TData>,
  "calendars" | "locale" | "pendingIds" | "timeZone"
> & {
  hourCycle: EventCalendarController<TData>["settings"]["hourCycle"]
  /** The event whose details or form are open: drawn selected. */
  activeId?: string
  renderEvent?: EventCalendarEngineProps<TData>["renderEvent"]
  onEventMenu?: EventCalendarEngineProps<TData>["onEventMenu"]
}

const ChipContext = React.createContext<ChipContextValue<unknown> | null>(null)

// FullCalendar stacks overlapping events by an inline z-index on each one's
// wrapper. A selected event comes to the front while it's selected.
function liftHarness(chip: HTMLDivElement | null) {
  let harness = chip?.parentElement
  while (harness && !harness.style.zIndex) harness = harness.parentElement
  if (!harness) return
  const element = harness
  const previous = element.style.zIndex
  element.style.setProperty("z-index", "30", "important")
  return () => {
    element.style.zIndex = previous
  }
}

function EventContent<TData>({ info }: { info: EventDisplayInfo }) {
  const context = React.useContext(
    ChipContext
  ) as ChipContextValue<TData> | null
  const extras: Partial<EventExtras<TData>> = info.event.extendedProps
  const event = extras.event
  if (!context || !event) return null
  const { renderEvent, onEventMenu } = context
  const variant = getVariant(info)
  const times = getEventTimes(event, context.timeZone)
  const formatOptions = {
    locale: context.locale,
    timeZone: context.timeZone,
    hourCycle: context.hourCycle,
  }
  const timeText =
    variant === "row"
      ? ""
      : variant === "dot"
        ? formatEventTime(times.start, formatOptions)
        : formatEventTimeRange(times, formatOptions)
  const props: EventCalendarRenderEventProps<TData> = {
    event,
    variant,
    timeText,
    isShort: info.isShort,
    // A draft, or an event in hand, reads as current wherever it sits.
    isPast:
      info.isPast &&
      !extras.isDraft &&
      !info.isSelected &&
      !info.isDragging &&
      !info.isMirror,
    isPending: context.pendingIds.has(event.id),
    isSelected:
      info.isSelected || (!extras.isDraft && context.activeId === event.id),
    isDragging: info.isDragging || info.isMirror,
    isDraft: extras.isDraft ?? false,
  }
  if (renderEvent) return <>{renderEvent(props)}</>
  return (
    <EventCalendarEvent
      {...props}
      ref={props.isSelected ? liftHarness : undefined}
      className="size-full"
      color={resolveEventColor(event, context.calendars)}
      calendarName={
        context.calendars.find((item) => item.id === event.calendarId)?.name
      }
      onContextMenu={
        onEventMenu && !props.isDraft
          ? (pointer) =>
              onEventMenu(event, { x: pointer.clientX, y: pointer.clientY })
          : undefined
      }
    />
  )
}

function renderEventContent(info: EventDisplayInfo) {
  return <EventContent info={info} />
}

type WeekdayFormats = {
  short: Intl.DateTimeFormat
  narrow: Intl.DateTimeFormat
}

// The weekday, short and narrow, with the date beside it; a header narrower
// than both (a week on a phone) stacks them, and narrower still shows the
// narrow weekday. Container queries read the header's real width, which a
// continuous grid's FullCalendar can't: it counts every column it draws.
// FullCalendar hands over the day as UTC wall time.
function renderDayHeader(info: DayHeaderInfo, formats: WeekdayFormats) {
  const isTimeGrid = info.view.type !== "month"
  return (
    <span
      data-slot="event-calendar-day-header-content"
      className="cn-event-calendar-day-header-content flex"
    >
      <span
        data-slot="event-calendar-day-header-weekday"
        className="cn-event-calendar-day-header-weekday"
      >
        <span className="@max-[3rem]:hidden">
          {formats.short.format(info.date)}
        </span>
        <span aria-hidden className="hidden @max-[3rem]:inline">
          {formats.narrow.format(info.date)}
        </span>
      </span>
      {isTimeGrid && info.dayNumberText ? (
        <span
          data-slot="event-calendar-day-header-number"
          data-today={info.isToday || undefined}
          className="cn-event-calendar-day-header-number"
        >
          {info.dayNumberText}
        </span>
      ) : null}
    </span>
  )
}

// A time grid has no room for "3 more" beside its events.
function renderMoreLink(info: MoreLinkInfo) {
  const type = info.view.type
  const isTimeGrid =
    type === CONTINUOUS_VIEW ||
    (isEventCalendarView(type) && isTimeGridView(type))
  return isTimeGrid || info.isNarrow ? info.numericText : `${info.num} more`
}

// --- The engine --------------------------------------------------------------

// Events keep their input objects while unchanged, so FullCalendar and the
// memoized chips skip them. Keyed by the event object, so an edit (a new
// object) makes a new input and the old one is collected.
const eventInputs = new WeakMap<object, EventInput>()

const DAY = 24 * 60 * 60 * 1000

// Each frosted chip is its own compositing layer. Past a few dozen in view
// they cost more than they show, and a busy week of a hundred and more can
// run the GPU out of tiles, so a dense time grid draws its chips opaque.
const DENSE_EVENTS = 60

// --- Continuity ----------------------------------------------------------------
//
// FullCalendar's own sideways scrolling (dayMinWidth) needs its paid
// scrollgrid plugin, so a continuous grid slides its columns itself. The
// grid draws a buffer of days either side; the three rows of columns (day
// headers, the all-day row, the lanes) are widened to one column per day and
// moved by CSS variables on the engine, while the time gutter, opaque and
// above them, stays put. FullCalendar finds hits from the elements' real
// rectangles, so dragging and selecting still land on the right day.

// FullCalendar's structure sizes these rows with !important flex rules, so
// the widths here are important too; inline, they win.
const COLUMN_ROW_STYLE = [
  ["flex-grow", "0"],
  ["flex-shrink", "0"],
  [
    "flex-basis",
    "calc(var(--event-calendar-column) * var(--event-calendar-total))",
  ],
  ["width", "calc(var(--event-calendar-column) * var(--event-calendar-total))"],
  [
    "transform",
    "translateX(calc(var(--event-calendar-column) * var(--event-calendar-first) * -1 + var(--event-calendar-offset, 0px)))",
  ],
  ["will-change", "transform"],
  // A moved row is a stacking context of its own: lifted, so the events in
  // it stay above the hour lines and take the pointer.
  ["position", "relative"],
  ["z-index", "1"],
] as const

/** Widens and moves a row of columns; once per row element. */
function holdColumns(
  row: HTMLElement | null,
  kind: "header" | "all-day" | "lanes"
) {
  if (!row || row.dataset.columns) return
  row.dataset.columns = kind
  for (const [property, value] of COLUMN_ROW_STYLE) {
    row.style.setProperty(property, value, "important")
  }
  // The gutter and divider before the columns keep their width beside them,
  // and cover the columns that slide under them.
  for (
    let before = row.previousElementSibling;
    before instanceof HTMLElement;
    before = before.previousElementSibling
  ) {
    before.style.setProperty("flex-shrink", "0", "important")
    before.style.setProperty("position", "relative")
    before.style.setProperty("z-index", "2")
    before.style.setProperty(
      "background-color",
      "var(--event-calendar-surface)"
    )
  }
}

// A scroll that stops for this long settles on the nearest day.
const WHEEL_SETTLE = 120
const SNAP_MS = 260
// A touch drag counts as sideways past this many pixels.
const PAN_SLOP = 8

const easeOut = (t: number) => 1 - (1 - t) ** 3

type ContinuityOptions = {
  engineRef: React.RefObject<HTMLDivElement | null>
  isEnabled: boolean
  columns: number
  buffer: number
  /** Moves the grid's start by a number of columns once a scroll settles. */
  onMove: (columns: number) => void
}

/**
 * Sideways scrolling for a continuous grid: a trackpad, Shift and the wheel,
 * or a touch drag move the columns live, and on release they glide to the
 * nearest day. Every frame writes one CSS variable; the grid re-renders only
 * when it settles on a new start, or when a long scroll nears the buffer's
 * edge.
 */
function useContinuity({
  engineRef,
  isEnabled,
  columns,
  buffer,
  onMove,
}: ContinuityOptions) {
  const state = React.useRef<{
    offset: number
    column: number
    frame: number
    idle: number
    // The offset to show once the grid redraws on its new start.
    pending: number | undefined
  }>({ offset: 0, column: 0, frame: 0, idle: 0, pending: undefined })

  const onMoveRef = React.useRef(onMove)
  React.useLayoutEffect(() => {
    onMoveRef.current = onMove
  })

  const setOffset = React.useCallback(
    (offset: number) => {
      state.current.offset = offset
      engineRef.current?.style.setProperty(
        "--event-calendar-offset",
        `${offset}px`
      )
    },
    [engineRef]
  )

  /** Columns moved by an offset: positive is later days. */
  const toColumns = (offset: number) =>
    state.current.column > 0 ? Math.round(-offset / state.current.column) : 0

  const commit = React.useCallback((moved: number) => {
    if (moved === 0) return
    state.current.pending = state.current.offset + moved * state.current.column
    onMoveRef.current(moved)
  }, [])

  const glide = React.useCallback(
    (target: number) => {
      const current = state.current
      cancelAnimationFrame(current.frame)
      const from = current.offset
      const reduce = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      if (reduce || Math.abs(target - from) < 1) {
        setOffset(target)
        commit(toColumns(target))
        return
      }
      const started = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - started) / SNAP_MS, 1)
        setOffset(from + (target - from) * easeOut(progress))
        if (progress < 1) {
          current.frame = requestAnimationFrame(tick)
          return
        }
        commit(toColumns(target))
      }
      current.frame = requestAnimationFrame(tick)
    },
    [commit, setOffset]
  )

  const settle = React.useCallback(
    (velocity = 0) => {
      const { offset, column } = state.current
      if (column <= 0) return
      // A fling carries on for a moment before it snaps.
      const projected = offset + velocity * 180
      const limit = buffer * column
      const target = Math.max(
        -limit,
        Math.min(limit, Math.round(projected / column) * column)
      )
      glide(target)
    },
    [buffer, glide]
  )

  /** Follows a scroll, and moves the start once it nears the buffer's edge. */
  const scrollBy = React.useCallback(
    (delta: number) => {
      const { column } = state.current
      if (column <= 0 || state.current.pending !== undefined) return
      cancelAnimationFrame(state.current.frame)
      const limit = buffer * column
      const offset = Math.max(
        -limit,
        Math.min(limit, state.current.offset - delta)
      )
      setOffset(offset)
      if (Math.abs(offset) > limit - column) commit(toColumns(offset))
    },
    [buffer, commit, setOffset]
  )

  // The column width follows the grid's.
  const measure = React.useCallback(() => {
    const engine = engineRef.current
    const lanes = engine?.querySelector<HTMLElement>('[data-columns="lanes"]')
    const row = lanes?.parentElement
    if (!engine || !lanes || !row) return
    const column = (row.clientWidth - lanes.offsetLeft) / columns
    state.current.column = column
    engine.style.setProperty("--event-calendar-column", `${column}px`)
  }, [columns, engineRef])

  React.useLayoutEffect(() => {
    const engine = engineRef.current
    if (!engine || !isEnabled) return
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(engine)
    return () => observer.disconnect()
  }, [engineRef, isEnabled, measure])

  // Trackpads and Shift with the wheel.
  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine || !isEnabled) return
    const current = state.current
    const handleWheel = (wheel: WheelEvent) => {
      const isSideways =
        wheel.shiftKey || Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY)
      if (!isSideways) return
      const delta =
        (wheel.deltaX || (wheel.shiftKey ? wheel.deltaY : 0)) *
        (wheel.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1)
      if (delta === 0) return
      // Holds the browser's swipe back and forward through history.
      wheel.preventDefault()
      scrollBy(delta)
      window.clearTimeout(current.idle)
      current.idle = window.setTimeout(() => settle(), WHEEL_SETTLE)
    }
    engine.addEventListener("wheel", handleWheel, { passive: false })
    return () => {
      engine.removeEventListener("wheel", handleWheel)
      window.clearTimeout(current.idle)
      cancelAnimationFrame(current.frame)
    }
  }, [engineRef, isEnabled, scrollBy, settle])

  // Touch: a sideways drag pans; up and down stays the browser's scroll.
  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine || !isEnabled) return
    let pan:
      | {
          id: number
          x: number
          y: number
          isPanning: boolean
          at: number
          velocity: number
        }
      | undefined
    const handleDown = (pointer: PointerEvent) => {
      if (pointer.pointerType === "mouse") return
      pan = {
        id: pointer.pointerId,
        x: pointer.clientX,
        y: pointer.clientY,
        isPanning: false,
        at: pointer.timeStamp,
        velocity: 0,
      }
    }
    const handleMove = (pointer: PointerEvent) => {
      if (!pan || pointer.pointerId !== pan.id) return
      const dx = pointer.clientX - pan.x
      const dy = pointer.clientY - pan.y
      if (!pan.isPanning) {
        if (Math.abs(dx) < PAN_SLOP || Math.abs(dx) < Math.abs(dy)) return
        pan.isPanning = true
      }
      const elapsed = Math.max(pointer.timeStamp - pan.at, 1)
      pan.velocity = dx / elapsed
      pan.x = pointer.clientX
      pan.y = pointer.clientY
      pan.at = pointer.timeStamp
      scrollBy(-dx)
    }
    const handleUp = (pointer: PointerEvent) => {
      if (!pan || pointer.pointerId !== pan.id) return
      if (pan.isPanning) settle(pan.velocity)
      pan = undefined
    }
    engine.addEventListener("pointerdown", handleDown)
    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("pointercancel", handleUp)
    return () => {
      engine.removeEventListener("pointerdown", handleDown)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("pointercancel", handleUp)
    }
  }, [engineRef, isEnabled, scrollBy, settle])

  /**
   * FullCalendar mounts the new start's columns in its commit, before the
   * frame is painted: the moment to swap the scroll offset for the new
   * start, so the days on screen stay where they were.
   */
  const handleColumnsMount = React.useCallback(() => {
    const { pending } = state.current
    if (pending === undefined) return
    state.current.pending = undefined
    setOffset(pending)
    measure()
  }, [measure, setOffset])

  // Leaving continuity, or a new start from elsewhere, drops any offset.
  React.useLayoutEffect(() => {
    if (isEnabled) return
    state.current.pending = undefined
    setOffset(0)
  }, [isEnabled, setOffset])

  return { handleColumnsMount, measure }
}

// --- Drag to create ------------------------------------------------------------
//
// In a time grid the engine draws the event being dragged out itself, on one
// element that stays in the page: a drag only moves it and changes its text.
// FullCalendar's own selection adds and removes its highlight on every move,
// and in a page with many :has() rules each of those restyles the document.
// The all-day row, month cells and touch (a long press) keep FullCalendar's.

const AUTO_SCROLL_EDGE = 32
const AUTO_SCROLL_SPEED = 12
// A press that moves less than this is a click: an event of the default length.
const CLICK_SLOP = 4

type CreatePreviewState = {
  /** Where the event sits in the engine, in pixels. */
  x: number
  y: number
  width: number
  height: number
  /** The part outside the time grid's scroll area, cut off. */
  clipTop: number
  clipBottom: number
  event: CalendarEvent
}

type CreatePreviewHandle = {
  show: (state: CreatePreviewState | undefined) => void
}

const HIDDEN_PREVIEW: CalendarEvent = {
  id: "event-calendar-create-preview",
  title: "",
  start: "2000-01-01T00:00:00",
  end: "2000-01-01T00:30:00",
}

/**
 * The event being dragged out, drawn as its draft will be. Always mounted,
 * hidden between drags, so a drag never adds or removes elements.
 */
function CreatePreview({
  handleRef,
}: {
  handleRef: React.RefObject<CreatePreviewHandle | null>
}) {
  const [state, setState] = React.useState<CreatePreviewState>()
  React.useImperativeHandle(handleRef, () => ({ show: setState }), [])
  const context = React.useContext(ChipContext)
  const event = state?.event ?? HIDDEN_PREVIEW
  const timeText = context
    ? formatEventTimeRange(getEventTimes(event, context.timeZone), {
        locale: context.locale,
        timeZone: context.timeZone,
        hourCycle: context.hourCycle,
      })
    : ""
  return (
    <div
      data-slot="event-calendar-create-preview"
      aria-hidden
      className="cn-event-calendar-create-preview pointer-events-none absolute top-0 left-0"
      style={{
        display: state ? undefined : "none",
        width: state?.width,
        height: state?.height,
        transform: state ? `translate(${state.x}px, ${state.y}px)` : undefined,
        clipPath: state
          ? `inset(${state.clipTop}px 0 ${state.clipBottom}px 0)`
          : undefined,
      }}
    >
      <EventCalendarEvent
        event={event}
        color={context ? resolveEventColor(event, context.calendars) : "blue"}
        variant="block"
        timeText={timeText}
        isShort={(state?.height ?? 0) < 36}
        isDraft
        // Not an event on the grid: nothing that looks for events finds it.
        data-slot={undefined}
        data-event-id={undefined}
        className="size-full"
      />
    </div>
  )
}

type CreateDrag = {
  lane: HTMLElement
  day: string
  scroller: HTMLElement | null
  anchor: number
  current: number
  pointerY: number
  startX: number
  startY: number
  hasMoved: boolean
  frame: number
}

/** The calendar day after a "YYYY-MM-DD". */
function nextDay(day: string) {
  const [year, month, date] = day.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, date + 1))
    .toISOString()
    .slice(0, 10)
}

/** A wall time on a day: "YYYY-MM-DDTHH:mm:ss", midnight after as the next day. */
function wallTimeOn(day: string, minutes: number) {
  return minutes >= 1440
    ? `${nextDay(day)}T00:00:00`
    : `${day}T${toClock(minutes)}`
}

const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`

function findScroller(element: HTMLElement) {
  for (
    let parent = element.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    if (parent.scrollHeight > parent.clientHeight + 1) {
      const overflow = getComputedStyle(parent).overflowY
      if (overflow === "auto" || overflow === "scroll") return parent
    }
  }
  return null
}

type DragCreateOptions = {
  engineRef: React.RefObject<HTMLDivElement | null>
  previewRef: React.RefObject<CreatePreviewHandle | null>
  isEnabled: boolean
  snapMinutes: number
  eventMinutes: number
  timeZone?: string
  calendarId?: string
  onCreate: (start: Date, end: Date) => void
}

function useDragCreate({
  engineRef,
  previewRef,
  isEnabled,
  snapMinutes,
  eventMinutes,
  timeZone,
  calendarId,
  onCreate,
}: DragCreateOptions) {
  const latest = React.useRef({
    snapMinutes,
    eventMinutes,
    timeZone,
    calendarId,
    onCreate,
  })
  React.useLayoutEffect(() => {
    latest.current = {
      snapMinutes,
      eventMinutes,
      timeZone,
      calendarId,
      onCreate,
    }
  })

  React.useEffect(() => {
    const engine = engineRef.current
    if (!engine || !isEnabled) return
    let drag: CreateDrag | undefined

    // Minutes into the day at a point, clamped to the day.
    const minutesAt = (lane: HTMLElement, clientY: number) => {
      const rect = lane.getBoundingClientRect()
      return Math.max(
        0,
        Math.min(1439, ((clientY - rect.top) / rect.height) * 1440)
      )
    }

    const rangeOf = (current: CreateDrag) => {
      const snap = latest.current.snapMinutes
      const from = Math.floor(Math.min(current.anchor, current.current) / snap)
      const to = Math.floor(Math.max(current.anchor, current.current) / snap)
      return { start: from * snap, end: Math.min((to + 1) * snap, 1440) }
    }

    const draw = (current: CreateDrag) => {
      const { start, end } = rangeOf(current)
      const engineRect = engine.getBoundingClientRect()
      const laneRect = current.lane.getBoundingClientRect()
      const top = laneRect.top + (start / 1440) * laneRect.height
      const height = ((end - start) / 1440) * laneRect.height
      const view = current.scroller?.getBoundingClientRect()
      const { calendarId: id } = latest.current
      previewRef.current?.show({
        x: laneRect.left - engineRect.left,
        y: top - engineRect.top,
        width: laneRect.width,
        height,
        clipTop: view ? Math.max(0, view.top - top) : 0,
        clipBottom: view ? Math.max(0, top + height - view.bottom) : 0,
        event: {
          id: HIDDEN_PREVIEW.id,
          title: "",
          start: wallTimeOn(current.day, start),
          end: wallTimeOn(current.day, end),
          calendarId: id,
        },
      })
    }

    // Near the top or bottom of the scroll area, the hours scroll under the
    // pointer, as FullCalendar's selection does.
    const autoScroll = () => {
      if (!drag?.scroller) return
      const view = drag.scroller.getBoundingClientRect()
      const step =
        drag.pointerY < view.top + AUTO_SCROLL_EDGE
          ? -AUTO_SCROLL_SPEED
          : drag.pointerY > view.bottom - AUTO_SCROLL_EDGE
            ? AUTO_SCROLL_SPEED
            : 0
      if (step === 0) {
        drag.frame = 0
        return
      }
      drag.scroller.scrollTop += step
      drag.current = minutesAt(drag.lane, drag.pointerY)
      draw(drag)
      drag.frame = requestAnimationFrame(autoScroll)
    }

    const end = () => {
      if (drag) cancelAnimationFrame(drag.frame)
      drag = undefined
      previewRef.current?.show(undefined)
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("keydown", handleKey, true)
    }

    const handleMove = (pointer: PointerEvent) => {
      if (!drag) return
      drag.pointerY = pointer.clientY
      if (
        !drag.hasMoved &&
        Math.hypot(
          pointer.clientX - drag.startX,
          pointer.clientY - drag.startY
        ) < CLICK_SLOP
      ) {
        return
      }
      drag.hasMoved = true
      const next = minutesAt(drag.lane, pointer.clientY)
      const before = rangeOf(drag)
      drag.current = next
      const after = rangeOf(drag)
      if (before.start !== after.start || before.end !== after.end) draw(drag)
      if (!drag.frame) drag.frame = requestAnimationFrame(autoScroll)
    }

    const handleUp = () => {
      const current = drag
      end()
      if (!current) return
      const { timeZone: zone, eventMinutes: length } = latest.current
      const range = rangeOf(current)
      const start = parseEventDate(wallTimeOn(current.day, range.start), zone)
      // A click gives the default length.
      const finish = current.hasMoved
        ? parseEventDate(wallTimeOn(current.day, range.end), zone)
        : new Date(+start + length * 60000)
      latest.current.onCreate(start, finish)
    }

    const handleKey = (key: KeyboardEvent) => {
      if (key.key !== "Escape") return
      key.stopPropagation()
      end()
    }

    const handleDown = (pointer: PointerEvent) => {
      if (pointer.button !== 0 || pointer.pointerType === "touch") return
      const target = pointer.target
      if (!(target instanceof Element)) return
      // Events, their handles, links and buttons keep their own gestures.
      if (
        target.closest('[data-event-id], a, button, [role="button"], input')
      ) {
        return
      }
      const lane = [
        ...engine.querySelectorAll<HTMLElement>("[data-event-calendar-day]"),
      ].find((candidate) => {
        const rect = candidate.getBoundingClientRect()
        return (
          pointer.clientX >= rect.left &&
          pointer.clientX < rect.right &&
          pointer.clientY >= rect.top &&
          pointer.clientY < rect.bottom
        )
      })
      const day = lane?.dataset.eventCalendarDay
      if (!lane || !day) return
      const scroller = findScroller(lane)
      const view = scroller?.getBoundingClientRect()
      if (
        view &&
        (pointer.clientY < view.top || pointer.clientY >= view.bottom)
      ) {
        return
      }
      // The press is ours: FullCalendar doesn't start its selection.
      pointer.stopPropagation()
      pointer.preventDefault()
      const at = minutesAt(lane, pointer.clientY)
      drag = {
        lane,
        day,
        scroller,
        anchor: at,
        current: at,
        pointerY: pointer.clientY,
        startX: pointer.clientX,
        startY: pointer.clientY,
        hasMoved: false,
        frame: 0,
      }
      draw(drag)
      window.addEventListener("pointermove", handleMove)
      window.addEventListener("pointerup", handleUp)
      window.addEventListener("keydown", handleKey, true)
    }

    engine.addEventListener("pointerdown", handleDown, true)
    return () => {
      engine.removeEventListener("pointerdown", handleDown, true)
      end()
    }
  }, [engineRef, isEnabled, previewRef])
}

function EventCalendarEngine<TData>({
  calendar,
  renderEvent,
  draft,
  preview,
  onAnchor,
  onEventMenu,
  fullCalendar,
  onEngine,
  className,
}: EventCalendarEngineProps<TData>) {
  const ref = React.useRef<CalendarRef>(null)
  const density = useDensity()
  const latest = React.useRef({ calendar, draft, onAnchor })
  React.useLayoutEffect(() => {
    latest.current = { calendar, draft, onAnchor }
  })

  const {
    view,
    date,
    timeZone,
    settings,
    days,
    visibleEvents,
    canEdit,
    calendars,
    locale,
    pendingIds,
  } = calendar
  const engineRef = React.useRef<HTMLDivElement>(null)
  const { isContinuous, columns, range } = calendar
  const buffer = getContinuityBuffer(columns)
  const continuousWindow = React.useMemo(
    () =>
      isContinuous
        ? getContinuousWindow(range.start, columns, {
            buffer,
            showWeekends: settings.showWeekends,
            timeZone,
          })
        : undefined,
    [
      buffer,
      columns,
      isContinuous,
      range.start,
      settings.showWeekends,
      timeZone,
    ]
  )
  const continuousDays = continuousWindow
    ? Math.round((+continuousWindow.end - +continuousWindow.start) / DAY)
    : 0
  const fcView = continuousWindow
    ? CONTINUOUS_VIEW
    : view === "agenda"
      ? "week"
      : view
  const fcDate = continuousWindow ? continuousWindow.start : date
  // FullCalendar reads these at mount only; later changes go through the
  // layout effect below.
  const [initialView] = React.useState(fcView)
  const [initialDate] = React.useState(fcDate)

  // Drive FullCalendar from the controller: it has no controlled date or view.
  React.useLayoutEffect(() => {
    const api = ref.current?.getApi()
    if (!api) return
    if (api.view.type !== fcView) api.changeView(fcView, fcDate)
    else api.gotoDate(fcDate)
  }, [fcDate, fcView])

  const windowRef = React.useRef(continuousWindow)
  React.useLayoutEffect(() => {
    windowRef.current = continuousWindow
    const engine = engineRef.current
    if (!engine || !continuousWindow) return
    engine.style.setProperty(
      "--event-calendar-total",
      String(continuousWindow.dates.length)
    )
    engine.style.setProperty(
      "--event-calendar-first",
      String(continuousWindow.first)
    )
  }, [continuousWindow])

  const continuity = useContinuity({
    engineRef,
    isEnabled: isContinuous,
    columns,
    buffer,
    onMove: (moved) => {
      const current = windowRef.current
      const start = current?.dates[current.first + moved]
      if (start) latest.current.calendar.setStartDate(start)
    },
  })
  const handleColumnsMount = continuity.handleColumnsMount
  const handleDayHeaderMount = React.useCallback(
    (info: MountInfo<DayHeaderInfo>) => {
      if (info.view.type !== CONTINUOUS_VIEW || info.inPopover) return
      holdColumns(info.el.parentElement, "header")
    },
    []
  )
  const handleDayCellMount = React.useCallback(
    (info: MountInfo<DayCellInfo>) => {
      if (info.view.type !== CONTINUOUS_VIEW) return
      holdColumns(info.el.parentElement, "all-day")
    },
    []
  )
  const handleDayLaneMount = React.useCallback(
    (info: MountInfo<DayLaneInfo>) => {
      // FullCalendar hands over the day as UTC wall time.
      info.el.dataset.eventCalendarDay = info.date.toISOString().slice(0, 10)
      if (info.view.type !== CONTINUOUS_VIEW) return
      holdColumns(info.el.parentElement, "lanes")
      handleColumnsMount()
    },
    [handleColumnsMount]
  )

  React.useEffect(() => {
    onEngine?.(ref.current?.getApi())
    return () => onEngine?.(undefined)
  }, [onEngine])

  const events = React.useMemo(() => {
    const toInput = (event: CalendarEvent<TData>, isDraft = false) => {
      const editable = isDraft || canEdit(event)
      const cached = eventInputs.get(event)
      if (cached && cached.editable === editable) return cached
      const input: EventInput = {
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay ?? event.start.length === 10,
        editable,
        extendedProps: { event, isDraft } satisfies EventExtras<TData>,
      }
      eventInputs.set(event, input)
      return input
    }
    const list = visibleEvents.map((event) =>
      preview && event.id === preview.id ? toInput(preview) : toInput(event)
    )
    if (draft) list.push(toInput(draft, true))
    return list
  }, [canEdit, draft, preview, visibleEvents])

  // A new event's draft, from FullCalendar's selection (the all-day row,
  // month cells, touch) or the engine's own drag in a time grid.
  const createAt = React.useCallback(
    (start: Date, selectedEnd: Date, allDay: boolean) => {
      const { calendar: current } = latest.current
      if (!current.isEditable) return
      let end = selectedEnd
      // A click selects one snap; give it the default length instead.
      if (!allDay && +end - +start <= current.settings.slotMinutes * 60000) {
        end = new Date(+start + current.settings.eventMinutes * 60000)
      }
      const calendarId = current.calendars.find(
        (item) => item.visible !== false && item.editable !== false
      )?.id
      current.startCreate(
        createEventDraft<TData>({
          id: current.createId(),
          start,
          end,
          allDay,
          calendarId,
          timeZone: current.timeZone,
        })
      )
    },
    []
  )

  const handleSelect = React.useCallback(
    (info: DateSelectInfo) => {
      const { calendar: current } = latest.current
      ref.current?.getApi().unselect()
      createAt(
        parseEventDate(info.startStr, current.timeZone),
        parseEventDate(info.endStr, current.timeZone),
        info.allDay
      )
    },
    [createAt]
  )

  const previewRef = React.useRef<CreatePreviewHandle>(null)
  useDragCreate({
    engineRef,
    previewRef,
    isEnabled: calendar.isEditable && isTimeGridView(view),
    snapMinutes: settings.slotMinutes,
    eventMinutes: settings.eventMinutes,
    timeZone,
    calendarId: calendars.find(
      (item) => item.visible !== false && item.editable !== false
    )?.id,
    onCreate: (start, end) => createAt(start, end, false),
  })

  const handleChange = React.useCallback(
    (info: EventDropInfo | EventResizeDoneInfo, reason: "move" | "resize") => {
      const { calendar: current } = latest.current
      const extras: Partial<EventExtras<TData>> = info.event.extendedProps
      const original = extras.event
      // FullCalendar already shows the event where it was dropped, and the
      // change lands there optimistically: no revert, so it never jumps back
      // and forth. A failed save rolls the optimistic change back, and the
      // event with it.
      if (!original) {
        info.revert()
        return
      }
      const allDay = info.event.allDay
      const start = parseEventDate(info.event.startStr, current.timeZone)
      const end = info.event.endStr
        ? parseEventDate(info.event.endStr, current.timeZone)
        : new Date(
            +start + (allDay ? DAY : current.settings.eventMinutes * 60000)
          )
      const next = setEventTimes(
        original,
        { start, end, allDay },
        current.timeZone
      )
      if (extras.isDraft) {
        current.startCreate(next)
        return
      }
      // A copy leaves the original where it was. The dropped event stays put
      // until the copy renders in its place and the original returns, so the
      // spot the pointer left never empties.
      if (reason === "move" && "jsEvent" in info && info.jsEvent.altKey) {
        current.duplicateEvent(next)
        return
      }
      current.updateEvent(original, next, { reason, onCancel: info.revert })
    },
    []
  )
  const handleDrop = React.useCallback(
    (info: EventDropInfo) => handleChange(info, "move"),
    [handleChange]
  )
  const handleResize = React.useCallback(
    (info: EventResizeDoneInfo) => handleChange(info, "resize"),
    [handleChange]
  )

  const handleClick = React.useCallback((info: EventClickInfo) => {
    info.jsEvent.preventDefault()
    const { calendar: current, onAnchor: anchor } = latest.current
    const extras: Partial<EventExtras<TData>> = info.event.extendedProps
    if (!extras.event || extras.isDraft) return
    anchor?.(info.el)
    current.openEvent(extras.event)
  }, [])

  const handleNavLink = React.useCallback((navDate: Date) => {
    const { calendar: current } = latest.current
    current.setView("day")
    current.goTo(navDate)
  }, [])

  const isDense = React.useMemo(() => {
    if (!isTimeGridView(view)) return false
    let count = 0
    for (const event of visibleEvents) {
      if (!overlapsRange(event, calendar.range, timeZone)) continue
      count += 1
      if (count > DENSE_EVENTS) return true
    }
    return false
  }, [calendar.range, timeZone, view, visibleEvents])

  const weekdayFormats = React.useMemo(
    () => ({
      short: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        timeZone: "UTC",
      }),
      narrow: new Intl.DateTimeFormat(locale, {
        weekday: "narrow",
        timeZone: "UTC",
      }),
    }),
    [locale]
  )
  const renderHeader = React.useCallback(
    (info: DayHeaderInfo) => renderDayHeader(info, weekdayFormats),
    [weekdayFormats]
  )

  const views = React.useMemo(
    () => getViews(days, continuousDays),
    [continuousDays, days]
  )
  const slotHeight = SLOT_HEIGHTS[density ?? "default"]
  const hourCycle = settings.hourCycle

  const options = React.useMemo<CalendarOptions>(
    () => ({
      plugins,
      views,
      initialView,
      initialDate,
      timeZone: timeZone ?? "local",
      locale,
      firstDay: settings.weekStartsOn,
      weekends: settings.showWeekends,
      weekNumbers: settings.showWeekNumbers,
      headerToolbar: false,
      height: "100%",
      expandRows: false,
      nowIndicator: true,
      navLinks: true,
      navLinkDayClick: handleNavLink,
      editable: calendar.isEditable,
      selectable: calendar.isEditable,
      selectMirror: false,
      eventResizableFromStart: true,
      dayMaxEvents: true,
      eventMaxStack: 4,
      // Events at one time stand side by side, so none covers another's title.
      slotEventOverlap: false,
      eventLongPressDelay: 250,
      selectLongPressDelay: 250,
      longPressDelay: 250,
      slotDuration: "00:30:00",
      snapDuration: { minutes: settings.slotMinutes },
      slotMinHeight: slotHeight,
      // A block shorter than a slot and a quarter has one line: the title and
      // time side by side, centred; taller ones stack them below a top
      // margin as wide as the side's.
      eventShortHeight: Math.round(slotHeight * 1.25),
      scrollTime: "08:00:00",
      scrollTimeReset: false,
      allDayText: "All day",
      dayHeaderAlign: "center",
      slotHeaderFormat:
        hourCycle === "h23"
          ? { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }
          : { hour: "numeric", hourCycle: "h12" },
      // Business hours shade the time grids only; a month keeps its
      // weekends. FullCalendar reads them per calendar, not per view.
      businessHours:
        calendar.businessHours && isTimeGridView(view)
          ? {
              daysOfWeek: calendar.businessHours.days,
              startTime: calendar.businessHours.start,
              endTime: calendar.businessHours.end,
            }
          : false,
      eventInteractive: true,
      eventColor: "transparent",
      select: handleSelect,
      eventDrop: handleDrop,
      eventResize: handleResize,
      eventClick: handleClick,
      eventContent: renderEventContent,
      dayHeaderContent: renderHeader,
      dayHeaderDidMount: handleDayHeaderMount,
      dayCellDidMount: handleDayCellMount,
      dayLaneDidMount: handleDayLaneMount,
      moreLinkContent: renderMoreLink,
      // Classes
      className: rootClass,
      viewClass,
      tableHeaderClass,
      tableBodyClass,
      fillerClass,
      dayHeaderRowClass,
      dayRowClass,
      dayHeaderClass: (info: DayHeaderInfo) =>
        pick(dayHeaderClass, info.isToday && dayHeaderTodayClass),
      dayHeaderInnerClass,
      dayHeaderDividerClass,
      dayCellClass: getDayCellClass,
      dayCellTopClass,
      dayCellTopInnerClass: (info: DayCellInfo) =>
        pick(dayCellNumberClass, info.isToday && dayCellNumberTodayClass),
      dayCellInnerClass,
      dayLaneClass: (info: DayLaneInfo) =>
        pick(dayLaneClass, info.isToday && dayLaneTodayClass),
      dayLaneInnerClass,
      slotLaneClass: (info: SlotLaneInfo) =>
        pick(slotLaneClass, info.isMinor && slotLaneMinorClass),
      slotHeaderClass,
      slotHeaderInnerClass: (info: SlotHeaderInfo) =>
        pick(slotHeaderInnerClass, info.isFirst && slotHeaderFirstClass),
      slotHeaderDividerClass,
      allDayHeaderClass,
      allDayHeaderInnerClass,
      allDayDividerClass,
      eventClass,
      eventInnerClass,
      columnEventClass,
      rowEventClass,
      listItemEventClass,
      rowEventBeforeClass: (info: EventDisplayInfo) =>
        info.isStartResizable ? resizerStartClass : "",
      rowEventAfterClass: (info: EventDisplayInfo) =>
        info.isEndResizable ? resizerEndClass : "",
      columnEventBeforeClass: (info: EventDisplayInfo) =>
        info.isStartResizable ? columnResizerStartClass : "",
      columnEventAfterClass: (info: EventDisplayInfo) =>
        info.isEndResizable ? columnResizerEndClass : "",
      moreLinkClass,
      moreLinkInnerClass,
      columnMoreLinkClass,
      columnMoreLinkInnerClass,
      popoverClass,
      popoverCloseClass,
      popoverCloseContent: () => (
        <span aria-hidden className="cn-event-calendar-popover-close-icon">
          ×
        </span>
      ),
      nowIndicatorLineClass: nowLineClass,
      nowIndicatorDotClass: nowDotClass,
      highlightClass,
      nonBusinessHoursClass: nonBusinessClass,
      navLinkClass,
      inlineWeekNumberClass: weekNumberClass,
      weekNumberHeaderClass,
      weekNumberHeaderInnerClass,
      ...fullCalendar,
    }),
    [
      calendar.businessHours,
      calendar.isEditable,
      fullCalendar,
      handleClick,
      handleDayCellMount,
      handleDayHeaderMount,
      handleDayLaneMount,
      handleDrop,
      handleNavLink,
      handleResize,
      handleSelect,
      hourCycle,
      renderHeader,
      initialDate,
      initialView,
      locale,
      settings.showWeekNumbers,
      settings.showWeekends,
      settings.slotMinutes,
      settings.weekStartsOn,
      slotHeight,
      timeZone,
      view,
      views,
    ]
  )

  const activeId =
    calendar.panel && calendar.panel.kind !== "create"
      ? calendar.panel.event.id
      : undefined
  const chipContext = React.useMemo(
    () =>
      ({
        calendars,
        locale,
        pendingIds,
        timeZone,
        hourCycle,
        activeId,
        renderEvent,
        onEventMenu,
      }) as ChipContextValue<unknown>,
    [
      activeId,
      calendars,
      hourCycle,
      locale,
      onEventMenu,
      pendingIds,
      renderEvent,
      timeZone,
    ]
  )

  return (
    <ChipContext.Provider value={chipContext}>
      <div
        ref={engineRef}
        data-slot="event-calendar-engine"
        data-continuous={isContinuous || undefined}
        data-view={view}
        data-time-grid={isTimeGridView(view) || undefined}
        data-dense={isDense || undefined}
        className={cn(
          "cn-event-calendar-engine relative min-h-0 flex-1",
          className
        )}
      >
        <FullCalendar ref={ref} {...options} events={events} />
        <CreatePreview handleRef={previewRef} />
      </div>
    </ChipContext.Provider>
  )
}

export {
  EventCalendarEngine,
  type EventCalendarEngineProps,
  type EventCalendarRenderEventProps,
}
