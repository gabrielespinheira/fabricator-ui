"use client"

import * as React from "react"

import {
  CALENDAR_APP_CALENDARS,
  type CalendarAppEventData,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import { resolveEventColor } from "@/registry/bases/__base__/lib/event-calendar-model"
import {
  EventCalendarEvent,
  type EventCalendarRenderEventProps,
} from "@/registry/bases/__base__/ui/event-calendar"

// The event open in the details panel. The calendar draws the events whose
// own details it opens as selected; this does the same for the panel.
export const CalendarAppSelectedEventContext = React.createContext<
  string | undefined
>(undefined)

function CalendarAppEventChip(
  props: EventCalendarRenderEventProps<CalendarAppEventData>
) {
  const selectedId = React.use(CalendarAppSelectedEventContext)
  const { event } = props
  return (
    <EventCalendarEvent
      {...props}
      isSelected={
        props.isSelected || (!props.isDraft && event.id === selectedId)
      }
      color={resolveEventColor(event, CALENDAR_APP_CALENDARS)}
      calendarName={
        CALENDAR_APP_CALENDARS.find(({ id }) => id === event.calendarId)?.name
      }
      className="size-full"
    />
  )
}

/** Stable, as the calendar asks: FullCalendar redraws events when it changes. */
export function renderCalendarAppEvent(
  props: EventCalendarRenderEventProps<CalendarAppEventData>
) {
  return <CalendarAppEventChip {...props} />
}
