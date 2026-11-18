"use client"

import * as React from "react"

import {
  CalendarAppSelectedEventContext,
  renderCalendarAppEvent,
} from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-event-chip"
import {
  CALENDAR_APP_EVENT_PANEL,
  CalendarAppEventPanel,
} from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-event-panel"
import { CalendarAppSidebar } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-sidebar"
import {
  CALENDAR_APP_CALENDARS,
  createCalendarAppEvents,
  type CalendarAppEvent,
  type CalendarAppEventData,
  type CalendarAppResponse,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  getCreateRange,
  getNextSelection,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import { createEventDraft } from "@/registry/bases/__base__/lib/event-calendar-model"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPanelTrigger,
  useShellPanel,
} from "@/registry/bases/__base__/ui/app-shell"
import {
  EventCalendar,
  EventCalendarContent,
  EventCalendarHeader,
  EventCalendarNavigation,
  EventCalendarSettings,
  EventCalendarTitle,
  EventCalendarToday,
  EventCalendarViewSelect,
  useEventCalendar,
} from "@/registry/bases/__base__/ui/event-calendar"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A calendar app: a month to jump from and the calendars to show in the
// sidebar, the week in the Event Calendar, and the open event's details,
// guests and your answer in a panel beside it (a drawer on phones).
// Creating, moving, resizing, editing and deleting are the calendar's own,
// and each change reports itself in a toast with Undo: mount your Toaster
// once in the app's layout.

export default function CalendarPage() {
  return (
    <AppShell storageKey="calendar-app-01">
      <CalendarApp />
    </AppShell>
  )
}

function CalendarApp() {
  // Replace with your events, or pass `load` to fetch them by month.
  const [events, setEvents] = React.useState(() =>
    createCalendarAppEvents(new Date())
  )
  const [selected, setSelected] = React.useState<CalendarAppEvent>()
  // Your answers, by event (a whole series for a repeating one).
  const [responses, setResponses] = React.useState<
    Record<string, CalendarAppResponse>
  >({})
  const panel = useShellPanel(CALENDAR_APP_EVENT_PANEL)

  const calendar = useEventCalendar<CalendarAppEventData>({
    events,
    calendars: CALENDAR_APP_CALENDARS,
    businessHours: true,
    onEventChange: (change) => {
      setEvents(change.apply)
      setSelected((current) => getNextSelection(current, change))
    },
    // Events open in the panel beside the calendar instead of its popover.
    onEventOpen: (event) => {
      setSelected(event)
      panel.setOpen(true)
      return false
    },
  })

  const createEvent = () => {
    const { start, end } = getCreateRange({
      now: new Date(),
      range: calendar.range,
      day: calendar.date,
      slotMinutes: calendar.settings.slotMinutes,
      eventMinutes: calendar.settings.eventMinutes,
    })
    calendar.startCreate(
      createEventDraft({
        id: calendar.createId(),
        start,
        end,
        allDay: false,
        calendarId: CALENDAR_APP_CALENDARS[0].id,
        timeZone: calendar.timeZone,
      })
    )
  }

  const responseKey = selected
    ? (selected.recurringEventId ?? selected.id)
    : undefined

  return (
    <>
      <CalendarAppSidebar calendar={calendar} />
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb items={[{ label: "Calendar" }]} />
          <AppShellHeaderActions
            primaryAction={{
              id: "create",
              label: "Create event",
              onSelect: createEvent,
              icon: (
                <IconPlaceholder
                  lucide="PlusIcon"
                  tabler="IconPlus"
                  hugeicons="PlusSignIcon"
                  phosphor="PlusIcon"
                  remixicon="RiAddLine"
                />
              ),
            }}
          />
          <AppShellPanelTrigger panel={CALENDAR_APP_EVENT_PANEL} />
        </AppShellHeader>
        <AppShellContent className="flex flex-col">
          {/* The grid's own title names the week; the page still needs its
              one main heading for screen readers. */}
          <h1 className="sr-only">Calendar</h1>
          <CalendarAppSelectedEventContext
            value={panel.open ? selected?.id : undefined}
          >
            <EventCalendar
              calendar={calendar}
              variant="flat"
              renderEvent={renderCalendarAppEvent}
              className="h-full min-h-0 flex-1"
            >
              <EventCalendarHeader className="ps-(--density-12) pe-(--app-shell-control-inset)">
                <div className="flex min-w-0 items-center gap-(--density-8)">
                  <EventCalendarToday />
                  <EventCalendarNavigation />
                  <EventCalendarTitle />
                </div>
                <div className="flex items-center gap-(--density-8)">
                  <EventCalendarViewSelect />
                  <EventCalendarSettings />
                </div>
              </EventCalendarHeader>
              <EventCalendarContent />
            </EventCalendar>
          </CalendarAppSelectedEventContext>
        </AppShellContent>
      </AppShellMain>
      <CalendarAppEventPanel
        calendar={calendar}
        event={selected}
        response={responseKey ? responses[responseKey] : undefined}
        onResponseChange={(response) => {
          if (!responseKey) return
          setResponses((current) => ({ ...current, [responseKey]: response }))
        }}
      />
    </>
  )
}
