"use client"

// The Event Calendar's agenda (Google Calendar's "Schedule"): the days that
// have events, each with its events in order. Plain markup, so it also
// stands alone in a dashboard card. Days are virtualized: a busy month draws
// the days in view, not thousands of rows.
import * as React from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { cn } from "cn"

import { type EventCalendarController } from "@/registry/bases/__base__/hooks/use-event-calendar"
import {
  formatEventDate,
  formatEventTimeRange,
  getEventTimes,
  groupEventsByDay,
  resolveEventColor,
  toZoned,
  type CalendarEvent,
} from "@/registry/bases/__base__/lib/event-calendar-model"
import { getChipColorStyle } from "@/registry/bases/__base__/ui/event-calendar-event"

// A first guess at a day's height before it's measured: a row per event,
// and the date's two lines at least.
const ROW_ESTIMATE = 34
const DAY_ESTIMATE = 16

type EventCalendarAgendaProps<TData> = Omit<
  React.ComponentProps<"div">,
  "children"
> & {
  calendar: EventCalendarController<TData>
  /** Called with the row's element, to anchor the details. */
  onEventSelect?: (event: CalendarEvent<TData>, element: HTMLElement) => void
  /** Shown when the range has no events. */
  empty?: React.ReactNode
}

function EventCalendarAgenda<TData>({
  calendar,
  onEventSelect,
  empty,
  className,
  ...props
}: EventCalendarAgendaProps<TData>) {
  const { visibleEvents, range, timeZone, locale, settings, calendars } =
    calendar
  const days = React.useMemo(
    () => groupEventsByDay(visibleEvents, range, timeZone),
    [range, timeZone, visibleEvents]
  )
  const today = formatEventDate(new Date(), "date", timeZone)
  const formats = React.useMemo(
    () => ({
      weekday: new Intl.DateTimeFormat(locale, { weekday: "short", timeZone }),
      monthDay: new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        timeZone,
      }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone }),
    }),
    [locale, timeZone]
  )

  // Stable callbacks: a new one makes the virtualizer measure every day again.
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const getItemKey = React.useCallback(
    (index: number) => days[index]?.key ?? index,
    [days]
  )
  const estimateSize = React.useCallback(
    (index: number) =>
      DAY_ESTIMATE +
      Math.max(days[index]?.events.length ?? 1, 2) * ROW_ESTIMATE,
    [days]
  )
  const virtualizer = useVirtualizer({
    count: days.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    getItemKey,
    overscan: 2,
  })
  // A new period starts at its first day.
  React.useEffect(() => {
    if (!virtualizer.scrollOffset) return
    virtualizer.scrollToOffset(0)
  }, [virtualizer, range])

  const items = virtualizer.getVirtualItems()
  const paddingTop = items[0]?.start ?? 0
  const paddingBottom =
    items.length > 0 ? virtualizer.getTotalSize() - (items.at(-1)?.end ?? 0) : 0

  return (
    <div
      data-slot="event-calendar-agenda"
      className={cn(
        "cn-event-calendar-agenda flex min-h-0 flex-col",
        className
      )}
      {...props}
    >
      {days.length === 0 && !calendar.isLoading ? empty : null}
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        {/* The spacing for days not drawn sits inside the scroller: on the
            scroller itself it would set its height. */}
        <div style={{ paddingTop, paddingBottom }}>
          {items.map(({ index }) => {
            const day = days[index]
            return (
              <section
                key={day.key}
                ref={virtualizer.measureElement}
                data-index={index}
                aria-label={formats.full.format(day.date)}
                data-slot="event-calendar-agenda-day"
                data-today={day.key === today || undefined}
                className="cn-event-calendar-agenda-day flex"
              >
                <div
                  data-slot="event-calendar-agenda-date"
                  className="cn-event-calendar-agenda-date flex shrink-0 flex-col"
                >
                  <span className="cn-event-calendar-agenda-date-number">
                    {toZoned(day.date, timeZone).getDate()}
                  </span>
                  <span className="cn-event-calendar-agenda-date-label">
                    {`${formats.weekday.format(day.date)}, ${formats.monthDay.format(day.date)}`}
                  </span>
                </div>
                <ul className="cn-event-calendar-agenda-events flex min-w-0 flex-1 flex-col">
                  {day.events.map((event) => {
                    const times = getEventTimes(event, timeZone)
                    return (
                      <li key={event.id} className="flex">
                        <button
                          type="button"
                          data-slot="event-calendar-agenda-event"
                          data-event-id={event.id}
                          data-pending={
                            calendar.pendingIds.has(event.id) || undefined
                          }
                          style={getChipColorStyle(
                            resolveEventColor(event, calendars)
                          )}
                          className="cn-event-calendar-agenda-event flex min-w-0 flex-1 items-center text-start"
                          onClick={(pointer) =>
                            onEventSelect?.(event, pointer.currentTarget)
                          }
                        >
                          <span
                            aria-hidden
                            className="cn-event-calendar-agenda-event-dot shrink-0"
                          />
                          <span className="cn-event-calendar-agenda-event-time shrink-0">
                            {formatEventTimeRange(times, {
                              locale,
                              timeZone,
                              hourCycle: settings.hourCycle,
                            })}
                          </span>
                          <span className="cn-event-calendar-agenda-event-title min-w-0 truncate">
                            {event.title || "(No title)"}
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export { EventCalendarAgenda, type EventCalendarAgendaProps }
