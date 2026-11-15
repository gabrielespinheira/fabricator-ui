"use client"

// An event as the calendar draws it: a chip in the event's colour. Plain
// markup, memoized on what it shows, because a month can hold hundreds.
// The colour arrives as six inline variables (fill, text and foreground for
// light and dark); the style map picks the mode's.
import * as React from "react"
import { cn } from "cn"

import {
  getEventColorVariables,
  type CalendarEvent,
  type EventCalendarColor,
  type EventColorVariables,
} from "@/registry/bases/__base__/lib/event-calendar-model"

type EventCalendarEventVariant = "block" | "row" | "dot"

type EventCalendarEventProps<TData = unknown> = Omit<
  React.ComponentProps<"div">,
  "color"
> & {
  event: CalendarEvent<TData>
  color: EventCalendarColor
  /** "10:00 – 10:30 AM"; empty for all-day bars. */
  timeText?: string
  /** A time-grid block, an all-day or multi-day bar, or a month's dot row. */
  variant?: EventCalendarEventVariant
  /** A time-grid block too short for two lines. */
  isShort?: boolean
  isPast?: boolean
  isPending?: boolean
  isSelected?: boolean
  isDragging?: boolean
  /** The draft a new event starts as, before it's saved. */
  isDraft?: boolean
  /** Read after the title and time by screen readers: "Work". */
  calendarName?: string
}

const colorCache = new Map<string, EventColorVariables>()

/** The chip's colour variables, computed once per colour. */
function getChipColorStyle(color: EventCalendarColor): React.CSSProperties {
  const key = typeof color === "string" ? color : `${color.hue}/${color.chroma}`
  let variables = colorCache.get(key)
  if (!variables) {
    variables = getEventColorVariables(color)
    colorCache.set(key, variables)
  }
  return variables as React.CSSProperties
}

function EventCalendarEventInner<TData>({
  event,
  color,
  timeText,
  variant = "block",
  isShort = false,
  isPast = false,
  isPending = false,
  isSelected = false,
  isDragging = false,
  isDraft = false,
  calendarName,
  className,
  style,
  children,
  ...props
}: EventCalendarEventProps<TData>) {
  const title = event.title || "(No title)"
  return (
    <div
      data-slot="event-calendar-event"
      data-event-id={event.id}
      data-variant={variant}
      data-short={isShort || undefined}
      data-past={isPast || undefined}
      data-pending={isPending || undefined}
      data-selected={isSelected || undefined}
      data-dragging={isDragging || undefined}
      data-draft={isDraft || undefined}
      data-status={event.status}
      style={{ ...getChipColorStyle(color), ...style }}
      className={cn(
        "cn-event-calendar-event flex min-w-0 overflow-hidden",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {variant === "dot" && (
            <span
              aria-hidden
              data-slot="event-calendar-event-dot"
              className="cn-event-calendar-event-dot shrink-0"
            />
          )}
          {variant === "dot" && timeText && (
            <span
              data-slot="event-calendar-event-time"
              className="cn-event-calendar-event-time shrink-0 truncate"
            >
              {timeText}
            </span>
          )}
          <span
            data-slot="event-calendar-event-title"
            className="cn-event-calendar-event-title min-w-0 truncate"
          >
            {title}
            {variant === "block" && isShort && timeText ? (
              <span
                data-slot="event-calendar-event-time"
                className="cn-event-calendar-event-time"
              >
                {`, ${timeText}`}
              </span>
            ) : null}
          </span>
          {variant === "block" && !isShort && timeText && (
            <span
              data-slot="event-calendar-event-time"
              className="cn-event-calendar-event-time truncate"
            >
              {timeText}
            </span>
          )}
          {variant === "block" && !isShort && event.location && (
            <span
              data-slot="event-calendar-event-location"
              className="cn-event-calendar-event-location truncate"
            >
              {event.location}
            </span>
          )}
          {calendarName || isPending ? (
            <span className="sr-only">
              {[calendarName, isPending ? "saving" : undefined]
                .filter(Boolean)
                .map((part) => `, ${part}`)
                .join("")}
            </span>
          ) : null}
        </>
      )}
    </div>
  )
}

const EventCalendarEvent = React.memo(
  EventCalendarEventInner
) as typeof EventCalendarEventInner

export {
  EventCalendarEvent,
  getChipColorStyle,
  type EventCalendarEventProps,
  type EventCalendarEventVariant,
}
