"use client"

import * as React from "react"

import {
  EventCalendar,
  EventCalendarContent,
  EventCalendarCreateButton,
  EventCalendarHeader,
  EventCalendarMiniMonth,
  EventCalendarNavigation,
  EventCalendarSettings,
  EventCalendarSources,
  EventCalendarTitle,
  EventCalendarToday,
  EventCalendarViewSelect,
  useEventCalendar,
  type CalendarEvent,
  type CalendarSource,
} from "@/styles/radix-fabricator/ui/event-calendar"

const calendars: CalendarSource[] = [
  { id: "me", name: "Gabs", color: "blue" },
  { id: "design", name: "Design", color: "purple" },
  { id: "engineering", name: "Engineering", color: "green" },
  { id: "birthdays", name: "Birthdays", color: "pink", editable: false },
]

const pad = (value: number) => String(value).padStart(2, "0")

/** A local wall time `days` from today. */
function at(days: number, time?: string) {
  const day = new Date()
  day.setDate(day.getDate() + days)
  const date = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`
  return time ? `${date}T${time}:00` : date
}

function createEvents(): CalendarEvent[] {
  return [
    {
      id: "crit",
      title: "Design crit",
      start: at(0, "11:00"),
      end: at(0, "12:00"),
      calendarId: "design",
      recurrence: "RRULE:FREQ=WEEKLY;BYDAY=TU,TH",
    },
    {
      id: "deploy",
      title: "Release 0.9",
      start: at(1, "15:00"),
      end: at(1, "16:00"),
      calendarId: "engineering",
    },
    {
      id: "pairing",
      title: "Pairing with Maya",
      start: at(2, "10:00"),
      end: at(2, "12:00"),
      calendarId: "me",
    },
    {
      id: "birthday",
      title: "Ana's birthday",
      start: at(3),
      end: at(4),
      calendarId: "birthdays",
      recurrence: "RRULE:FREQ=YEARLY",
    },
    {
      id: "review",
      title: "Architecture review",
      start: at(-1, "14:00"),
      end: at(-1, "15:30"),
      calendarId: "engineering",
    },
  ]
}

export function EventCalendarApp() {
  const [events, setEvents] = React.useState(createEvents)
  const calendar = useEventCalendar({
    events,
    calendars,
    onEventChange: (change) => setEvents(change.apply),
  })

  return (
    <div className="flex h-[52rem] w-full gap-6">
      <aside className="hidden w-64 shrink-0 flex-col gap-6 md:flex">
        <EventCalendarCreateButton calendar={calendar} className="self-start" />
        <EventCalendarMiniMonth calendar={calendar} />
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-medium text-muted-foreground">
            My calendars
          </h3>
          <EventCalendarSources calendar={calendar} />
        </div>
      </aside>
      <EventCalendar calendar={calendar} className="h-full min-w-0 flex-1">
        <EventCalendarHeader>
          <div className="flex min-w-0 items-center gap-2">
            <EventCalendarToday />
            <EventCalendarNavigation />
            <EventCalendarTitle />
          </div>
          <div className="flex items-center gap-2">
            <EventCalendarViewSelect />
            <EventCalendarSettings />
          </div>
        </EventCalendarHeader>
        <EventCalendarContent />
      </EventCalendar>
    </div>
  )
}
