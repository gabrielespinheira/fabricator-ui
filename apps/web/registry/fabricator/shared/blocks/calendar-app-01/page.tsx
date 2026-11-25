"use client"

import * as React from "react"

import { CalendarAppAgenda } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-agenda"
import {
  CalendarAppChipProvider,
  renderCalendarAppEvent,
} from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-event-chip"
import {
  CALENDAR_APP_EVENT_PANEL,
  CalendarAppConflictAlert,
  CalendarAppEventPanel,
  type CalendarAppConflict,
} from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-event-panel"
import { CalendarAppHeader } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-header"
import { CalendarAppSidebar } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-sidebar"
import { CalendarAppWeekStrip } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-week-strip"
import { useCalendarAppNow } from "@/registry/bases/__base__/blocks/calendar-app-01/hooks/use-calendar-app-now"
import {
  CALENDAR_APP_CALENDARS,
  CALENDAR_APP_COLLEAGUES,
  createCalendarAppEvents,
  type CalendarAppEvent,
  type CalendarAppEventData,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  describeStartsIn,
  findConflicts,
  getCreateRange,
  getNextFreeStart,
  getNextSelection,
  getResponseKey,
  getShownView,
  getUpNext,
  getYourResponse,
  isEventOver,
  type CalendarAppResponses,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import {
  createEventDraft,
  formatEventTime,
  formatEventTimeRange,
  getContinuityBuffer,
  getEventTimes,
  resolveEventColor,
  setEventTimes,
  type EventCalendarView,
} from "@/registry/bases/__base__/lib/event-calendar-model"
import {
  expandEvents,
  isOccurrence,
} from "@/registry/bases/__base__/lib/event-calendar-recurrence"
import {
  AppShell,
  AppShellContent,
  AppShellMain,
  useAppShell,
  useShellPanel,
} from "@/registry/bases/__base__/ui/app-shell"
import {
  EventCalendar,
  EventCalendarContent,
  useEventCalendar,
  type EventCalendarProps,
} from "@/registry/bases/__base__/ui/event-calendar"
import { useSidebar } from "@/registry/bases/__base__/ui/sidebar"

// For someone who looks at their week and prepares for what is next: the week
// fills the page, and the next event waits beside it with who is going, where
// it is and the way in. Creating, moving, resizing, editing and deleting are
// the Event Calendar's own, and each change reports itself in a toast with
// Undo: mount your Toaster once in the app's layout.

const DAY = 24 * 60 * 60 * 1000

const DESKTOP_VIEWS: EventCalendarView[] = ["day", "week", "month", "agenda"]
const PHONE_VIEWS: EventCalendarView[] = ["day", "days", "month", "agenda"]
const SETTINGS = { weekStartsOn: 1 } as const

type GridOptions = NonNullable<EventCalendarProps["fullCalendar"]>

// Weekends and the hours outside work share one light wash, and the grid
// opens a little before 8:00 so that label isn't cut.
const GRID: GridOptions = {
  nonBusinessHoursClass: "bg-hover/50",
  scrollTime: "07:45:00",
}

export default function CalendarPage() {
  return (
    <AppShell storageKey="calendar-app-01">
      <CalendarApp />
    </AppShell>
  )
}

/** A docked sidebar leaves a tablet a phone's column, so it starts closed. */
function useTabletSidebar() {
  const { size } = useAppShell()
  const { setOpen } = useSidebar()
  React.useEffect(() => {
    if (size === "tablet") setOpen(false)
  }, [size, setOpen])
}

function CalendarApp() {
  const { size } = useAppShell()
  const isPhone = size === "phone"
  const now = useCalendarAppNow()
  useTabletSidebar()

  // Replace with your events, or pass `load` to fetch them by month.
  const [events, setEvents] = React.useState(() =>
    createCalendarAppEvents(new Date())
  )
  const [addedIds, setAddedIds] = React.useState<string[]>([])
  const [chosenView, setChosenView] = React.useState<EventCalendarView>()
  const [selected, setSelected] = React.useState<CalendarAppEvent>()
  const [responses, setResponses] = React.useState<CalendarAppResponses>({})
  const [reminders, setReminders] = React.useState<Record<string, number>>({})
  const panel = useShellPanel(CALENDAR_APP_EVENT_PANEL)

  const calendars = React.useMemo(
    () => [
      ...CALENDAR_APP_CALENDARS,
      ...CALENDAR_APP_COLLEAGUES.filter(({ id }) => addedIds.includes(id)),
    ],
    [addedIds]
  )
  const shownEvents = React.useMemo(() => {
    const ids = new Set(calendars.map(({ id }) => id))
    return events.filter(
      ({ calendarId }) => calendarId === undefined || ids.has(calendarId)
    )
  }, [calendars, events])

  const calendar = useEventCalendar<CalendarAppEventData>({
    events: shownEvents,
    calendars,
    view: getShownView(chosenView, isPhone),
    views: isPhone ? PHONE_VIEWS : DESKTOP_VIEWS,
    onViewChange: setChosenView,
    defaultSettings: SETTINGS,
    businessHours: true,
    onEventChange: (change) => {
      setEvents(change.apply)
      setSelected((current) => getNextSelection(current, change))
      const [created] = change.created
      // A new event opens beside the week; over it only when it overlaps.
      if (change.reason !== "create" || !created) return
      if (!panel.isFloating || getConflicts(created).length > 0) {
        panel.setOpen(true)
      }
    },
    // Events open in the panel beside the calendar instead of its popover.
    onEventOpen: (event) => {
      setSelected(event)
      panel.setOpen(true)
      return false
    },
  })
  const { timeZone, locale } = calendar
  const formats = { locale, timeZone, hourCycle: calendar.settings.hourCycle }

  const schedule = {
    responses,
    calendarIds: new Set(
      calendar.calendars
        .filter(({ id, visible }) =>
          calendars.some(
            (item) =>
              item.id === id && item.group === "mine" && visible !== false
          )
        )
        .map(({ id }) => id)
    ),
    timeZone,
  }

  function getDayEvents(event: CalendarAppEvent) {
    const { start } = getEventTimes(event, timeZone)
    return expandEvents(
      shownEvents,
      { start: new Date(+start - DAY), end: new Date(+start + 2 * DAY) },
      timeZone
    )
  }

  function getConflicts(event: CalendarAppEvent) {
    return findConflicts({ event, events: getDayEvents(event), ...schedule })
  }

  const upNext = now
    ? getUpNext({
        events: expandEvents(
          shownEvents,
          { start: new Date(+now - DAY), end: new Date(+now + 14 * DAY) },
          timeZone
        ),
        now,
        ...schedule,
      })
    : undefined
  const draft =
    calendar.panel?.kind === "create" ? calendar.panel.event : undefined
  // What is being created says what it overlaps before it is saved.
  const shown = draft ?? selected ?? upNext
  const isUpNext = shown !== undefined && shown.id === upNext?.id
  const startsIn =
    upNext && now ? describeStartsIn(upNext, now, formats) : undefined

  function getConflict(
    event: CalendarAppEvent
  ): CalendarAppConflict | undefined {
    if (now && isEventOver(event, now, timeZone)) return undefined
    const [first, ...others] = getConflicts(event)
    if (!first) return undefined
    const canMove = !draft && calendar.canEdit(event)
    const free = canMove
      ? getNextFreeStart({
          event,
          events: getDayEvents(event),
          slotMinutes: calendar.settings.slotMinutes,
          ...schedule,
        })
      : undefined
    const { start, end } = getEventTimes(event, timeZone)
    const asksScope = isOccurrence(event)
    return {
      title:
        others.length > 0
          ? `${first.title} and ${others.length} more`
          : first.title,
      time: formatEventTimeRange(getEventTimes(first, timeZone), formats),
      move: free && {
        label: `Move to ${formatEventTime(free, formats)}${asksScope ? "…" : ""}`,
        asksScope,
        onMove: () =>
          calendar.updateEvent(
            event,
            setEventTimes(
              event,
              {
                start: free,
                end: new Date(+free + (+end - +start)),
                allDay: false,
              },
              timeZone
            ),
            { reason: "move" }
          ),
      },
    }
  }

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
        timeZone,
      })
    )
  }

  const selectedId = panel.open ? selected?.id : undefined
  const isBars = isPhone && calendar.view === "month"
  const isStrip = isPhone && calendar.view === "day"
  const calendarRef = React.useRef(calendar)
  React.useLayoutEffect(() => {
    calendarRef.current = calendar
  })
  const grid = React.useMemo<GridOptions>(() => {
    // The strip above already names the days.
    if (isStrip) return { ...GRID, dayHeaders: false }
    if (!isBars) return GRID
    // A phone's month is for finding a day: tapping one opens it, through
    // the bars that stand for its events.
    const openDay = (day: Date) => {
      calendarRef.current.setView("day")
      calendarRef.current.goTo(day)
    }
    return {
      ...GRID,
      editable: false,
      selectable: false,
      eventInteractive: false,
      eventClass: "pointer-events-none",
      dateClick: ({ date }) => openDay(date),
      // Without a view to go to, the link would open its own popover.
      moreLinkClick: ({ date }) => {
        openDay(date)
        return "day"
      },
    }
  }, [isBars, isStrip])

  const shownKey = shown ? getResponseKey(shown) : undefined

  return (
    <>
      <CalendarAppSidebar
        calendar={calendar}
        calendars={calendars}
        colleagues={CALENDAR_APP_COLLEAGUES.filter(
          ({ id }) => !addedIds.includes(id)
        )}
        onAddCalendar={(id) => setAddedIds((current) => [...current, id])}
        upNext={
          upNext && startsIn && !(panel.open && isUpNext)
            ? {
                title: upNext.title,
                startsIn,
                color: resolveEventColor(upNext, calendars),
                onOpen: () => {
                  setSelected(undefined)
                  panel.setOpen(true)
                },
              }
            : undefined
        }
      />
      <AppShellMain>
        <CalendarAppHeader
          calendar={calendar}
          now={now}
          onCreate={createEvent}
        />
        <AppShellContent className="flex flex-col overflow-hidden">
          {isStrip && now ? (
            <CalendarAppWeekStrip
              date={calendar.date}
              now={now}
              weekStartsOn={calendar.settings.weekStartsOn}
              locale={locale}
              onDateChange={calendar.goTo}
            />
          ) : null}
          <CalendarAppChipProvider
            selectedId={selectedId}
            responses={responses}
            isBars={isBars}
            firstDay={calendar.isContinuous ? calendar.range.start : undefined}
            buffer={getContinuityBuffer(calendar.columns)}
            showWeekends={calendar.settings.showWeekends}
            {...formats}
          >
            <EventCalendar
              calendar={calendar}
              variant="flat"
              renderEvent={renderCalendarAppEvent}
              renderDraftNotice={(event) => {
                const conflict = getConflict(event)
                return (
                  conflict && <CalendarAppConflictAlert conflict={conflict} />
                )
              }}
              fullCalendar={grid}
              className="h-full min-h-0 flex-1"
            >
              {calendar.view === "agenda" && now ? (
                <CalendarAppAgenda
                  calendar={calendar}
                  calendars={calendars}
                  responses={responses}
                  now={now}
                  selectedId={selectedId}
                />
              ) : (
                <EventCalendarContent />
              )}
            </EventCalendar>
          </CalendarAppChipProvider>
        </AppShellContent>
      </AppShellMain>
      <CalendarAppEventPanel
        calendar={calendar}
        calendars={calendars}
        event={shown}
        isDraft={draft !== undefined}
        startsIn={isUpNext ? startsIn : undefined}
        isOver={
          shown !== undefined &&
          now !== undefined &&
          isEventOver(shown, now, timeZone)
        }
        conflict={!draft && shown ? getConflict(shown) : undefined}
        response={shown && getYourResponse(shown, responses)}
        onResponseChange={(response) => {
          if (!shownKey) return
          setResponses((current) => ({ ...current, [shownKey]: response }))
        }}
        reminderMinutes={
          shownKey
            ? (reminders[shownKey] ?? shown?.data?.reminderMinutes)
            : undefined
        }
        onReminderChange={(minutes) => {
          if (!shownKey) return
          setReminders((current) => ({ ...current, [shownKey]: minutes }))
        }}
      />
    </>
  )
}
