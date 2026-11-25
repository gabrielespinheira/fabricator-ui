"use client"

import * as React from "react"
import { cn } from "cn"

import {
  CALENDAR_APP_CALENDARS,
  CALENDAR_APP_COLLEAGUES,
  type CalendarAppEventData,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  CALENDAR_APP_RESPONSE_LABELS,
  getChipLines,
  getChipResponse,
  getLabelColumn,
  type CalendarAppResponses,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import {
  formatEventTime,
  getEventTimes,
  resolveEventColor,
  type EventCalendarHourCycle,
} from "@/registry/bases/__base__/lib/event-calendar-model"
import {
  EventCalendarEvent,
  type EventCalendarRenderEventProps,
} from "@/registry/bases/__base__/ui/event-calendar"

type CalendarAppChipState = {
  /** The event open in the panel: drawn as the calendar draws its own. */
  selectedId: string | undefined
  responses: CalendarAppResponses
  /** A phone's month has no room for words: each event is a bar. */
  isBars: boolean
  /**
   * The first day on screen of a grid that scrolls by day, and the columns it
   * draws before it: where a long bar's label goes. Undefined in a month.
   */
  firstDay: Date | undefined
  buffer: number
  showWeekends: boolean
  locale: string
  timeZone: string | undefined
  hourCycle: EventCalendarHourCycle
}

const CalendarAppChipContext = React.createContext<CalendarAppChipState>({
  selectedId: undefined,
  responses: {},
  isBars: false,
  firstDay: undefined,
  buffer: 0,
  showWeekends: true,
  locale: "en-US",
  timeZone: undefined,
  hourCycle: "h12",
})

export function CalendarAppChipProvider({
  children,
  ...state
}: CalendarAppChipState & { children: React.ReactNode }) {
  const {
    selectedId,
    responses,
    isBars,
    firstDay,
    buffer,
    showWeekends,
    locale,
    timeZone,
    hourCycle,
  } = state
  // A new value redraws every chip.
  const value = React.useMemo(
    () => ({
      selectedId,
      responses,
      isBars,
      firstDay,
      buffer,
      showWeekends,
      locale,
      timeZone,
      hourCycle,
    }),
    [
      buffer,
      firstDay,
      hourCycle,
      isBars,
      locale,
      responses,
      selectedId,
      showWeekends,
      timeZone,
    ]
  )
  return (
    <CalendarAppChipContext value={value}>{children}</CalendarAppChipContext>
  )
}

const CALENDARS = [...CALENDAR_APP_CALENDARS, ...CALENDAR_APP_COLLEAGUES]

const MINUTE = 60_000

// Your answer is the chip's fill: solid when you go, hatched for a maybe,
// outlined until you answer, and struck with no fill when you decline. The
// selected chip keeps its own solid fill in all four.
const OUTLINE = {
  block:
    "not-data-selected:border-y not-data-selected:border-e not-data-selected:border-y-(--event-calendar-fill)/50! not-data-selected:border-e-(--event-calendar-fill)/50!",
  row: "not-data-selected:ring-1 not-data-selected:ring-(--event-calendar-fill)/50 not-data-selected:ring-inset",
  dot: "",
} as const

const FILLS = {
  // Opaque, as the calendar's own chips are past 60 in view: a week here
  // draws a full one either side of it too, and that many blurred layers can
  // run a GPU out of tiles.
  yes: "bg-[color-mix(in_srgb,var(--event-calendar-fill)_var(--event-calendar-wash),var(--event-calendar-surface))]",
  maybe:
    "not-data-selected:bg-(--event-calendar-surface) not-data-selected:bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--event-calendar-fill)_12%,transparent)_0_4px,transparent_4px_8px)]",
  awaiting:
    "not-data-selected:bg-(--event-calendar-surface) not-data-selected:hover:bg-(--event-calendar-fill)/10",
  no: "not-data-selected:border-(--event-calendar-fill)/40 not-data-selected:bg-(--event-calendar-fill)/6 not-data-selected:text-foreground/70",
} as const

function getResponseClasses(
  response: keyof typeof FILLS,
  variant: EventCalendarRenderEventProps["variant"]
) {
  const hasOutline = response === "maybe" || response === "awaiting"
  return cn(
    "backdrop-blur-none",
    FILLS[response],
    hasOutline && OUTLINE[variant]
  )
}

function CalendarAppEventChip(
  props: EventCalendarRenderEventProps<CalendarAppEventData>
) {
  const {
    selectedId,
    responses,
    isBars,
    firstDay,
    buffer,
    showWeekends,
    ...formats
  } = React.use(CalendarAppChipContext)
  const { event, variant, timeText, isShort, isDraft } = props
  const response = isDraft ? "yes" : getChipResponse(event, responses)
  const calendar = CALENDARS.find(({ id }) => id === event.calendarId)
  const title = event.title || "(No title)"
  const times = getEventTimes(event, formats.timeZone)
  const startText = formatEventTime(times.start, formats)
  const lines = getChipLines((+times.end - +times.start) / MINUTE)
  const labelColumn =
    variant === "row" && firstDay
      ? getLabelColumn({
          start: times.start,
          rangeStart: firstDay,
          buffer,
          showWeekends,
        })
      : 0
  const spoken = [
    timeText,
    calendar?.name,
    response === "yes" ? undefined : CALENDAR_APP_RESPONSE_LABELS[response],
    props.isPending ? "saving" : undefined,
  ].filter(Boolean)

  const chip = {
    ...props,
    isSelected: props.isSelected || (!isDraft && event.id === selectedId),
    color: resolveEventColor(event, CALENDARS),
  }

  if (isBars) {
    return (
      <EventCalendarEvent
        {...chip}
        className="h-1.5 w-full rounded-full bg-(--event-calendar-fill)! p-0! data-past:opacity-40"
      >
        <span className="sr-only">{title}</span>
      </EventCalendarEvent>
    )
  }

  if (variant !== "block") {
    const isDot = variant === "dot"
    return (
      <EventCalendarEvent
        {...chip}
        className={cn(
          "@container size-full",
          !isDot && getResponseClasses(response, variant),
          isDot && response === "no" && "text-muted-foreground"
        )}
      >
        {isDot ? (
          <span
            aria-hidden
            className={cn(
              "size-2 shrink-0 rounded-full",
              response === "yes"
                ? "bg-(--event-calendar-fill)"
                : "ring-[1.5px] ring-(--event-calendar-fill) ring-inset"
            )}
          />
        ) : null}
        <span
          style={
            labelColumn > 0
              ? {
                  marginInlineStart: `calc(${labelColumn} * var(--event-calendar-column))`,
                }
              : undefined
          }
          className={cn(
            "min-w-0 flex-1 truncate font-medium",
            response === "no" && "line-through"
          )}
        >
          {title}
        </span>
        {isDot ? (
          <span
            aria-hidden
            className="hidden shrink-0 text-muted-foreground tabular-nums @min-[9rem]:inline"
          >
            {timeText}
          </span>
        ) : null}
        <span className="sr-only">{`, ${spoken.join(", ")}`}</span>
      </EventCalendarEvent>
    )
  }

  return (
    <EventCalendarEvent
      {...chip}
      // Whole lines only: the title wraps to as many as the block holds, and
      // what doesn't fit under it flows into a second column, out of sight.
      className={cn(
        "@container size-full flex-wrap content-start data-[variant=block]:pe-(--density-4)",
        isShort && "leading-[1.2]! data-short:data-[variant=block]:flex-nowrap",
        getResponseClasses(response, variant)
      )}
    >
      <span
        style={{ WebkitLineClamp: lines }}
        className={cn(
          "line-clamp-1 w-full min-w-0 shrink-0 font-medium wrap-break-word @max-[3.75rem]:hyphens-auto",
          isShort && "shrink",
          response === "no" && "line-through"
        )}
      >
        {title}
      </span>
      {isShort ? null : (
        <>
          {/* A narrow column has room for the start alone; its place in the
              grid says the rest. */}
          <span aria-hidden className="w-full font-normal tabular-nums">
            <span className="hidden truncate @min-[3.5rem]:block @min-[8rem]:hidden">
              {startText}
            </span>
            <span className="hidden truncate @min-[8rem]:block">
              {timeText}
            </span>
          </span>
          {!isDraft && event.location ? (
            <span className="hidden w-full truncate font-normal @min-[8rem]:block">
              {event.location}
            </span>
          ) : null}
        </>
      )}
      <span className="sr-only">{`, ${spoken.join(", ")}`}</span>
    </EventCalendarEvent>
  )
}

/** Stable, as the calendar asks: FullCalendar redraws events when it changes. */
export function renderCalendarAppEvent(
  props: EventCalendarRenderEventProps<CalendarAppEventData>
) {
  return <CalendarAppEventChip {...props} />
}
