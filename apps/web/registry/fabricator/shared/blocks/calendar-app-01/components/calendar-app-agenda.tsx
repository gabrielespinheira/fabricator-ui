"use client"

import * as React from "react"
import { cn } from "cn"

import { CalendarAppDot } from "@/registry/bases/__base__/blocks/calendar-app-01/components/calendar-app-sidebar"
import {
  type CalendarAppCalendar,
  type CalendarAppEvent,
  type CalendarAppEventData,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-events"
import {
  CALENDAR_APP_RESPONSE_LABELS,
  getChipResponse,
  isEventOver,
  orderGuests,
  type CalendarAppResponses,
} from "@/registry/bases/__base__/blocks/calendar-app-01/lib/calendar-app-model"
import {
  formatEventTimeRange,
  getEventTimes,
  groupEventsByDay,
  resolveEventColor,
} from "@/registry/bases/__base__/lib/event-calendar-model"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/registry/bases/__base__/ui/avatar"
import {
  EventCalendarEmpty,
  type EventCalendarController,
} from "@/registry/bases/__base__/ui/event-calendar"

const MAX_AVATARS = 3

/**
 * The calendar's agenda with this app's answers, places and guests in its
 * rows. On a phone the title takes the row and the rest goes under it.
 */
export function CalendarAppAgenda({
  calendar,
  calendars,
  responses,
  now,
  selectedId,
}: {
  calendar: EventCalendarController<CalendarAppEventData>
  calendars: CalendarAppCalendar[]
  responses: CalendarAppResponses
  now: Date
  selectedId: string | undefined
}) {
  const { visibleEvents, range, timeZone, locale, settings } = calendar
  const days = React.useMemo(
    () => groupEventsByDay(visibleEvents, range, timeZone),
    [range, timeZone, visibleEvents]
  )
  const formats = React.useMemo(
    () => ({
      day: new Intl.DateTimeFormat(locale, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone,
      }),
      full: new Intl.DateTimeFormat(locale, { dateStyle: "full", timeZone }),
    }),
    [locale, timeZone]
  )
  const today = formats.full.format(now)

  if (days.length === 0) return <EventCalendarEmpty />
  return (
    <div
      role="region"
      aria-label="Agenda"
      className="@container min-h-0 flex-1 overflow-y-auto px-(--density-12) py-(--density-8) in-data-[size=phone]:pb-20"
    >
      <div className="flex flex-col gap-(--density-24)">
        {days.map((day) => {
          const label = formats.full.format(day.date)
          const isToday = label === today
          return (
            <section
              key={day.key}
              aria-label={label}
              className="flex flex-col gap-(--density-4) @2xl:flex-row @2xl:gap-(--density-16)"
            >
              <h2 className="flex shrink-0 items-baseline gap-(--density-8) text-(length:--density-text-13) tabular-nums weight-semibold @2xl:w-24 @2xl:flex-col @2xl:gap-0 @2xl:pt-(--density-8)">
                {formats.day.format(day.date)}
                {isToday ? (
                  <span className="text-(length:--density-text-12) font-normal text-muted-foreground">
                    Today
                  </span>
                ) : null}
              </h2>
              <ul className="flex min-w-0 flex-1 flex-col">
                {day.events.map((event) => (
                  <li key={event.id}>
                    <AgendaRow
                      event={event}
                      color={resolveEventColor(event, calendars)}
                      time={formatEventTimeRange(
                        getEventTimes(event, timeZone),
                        { locale, timeZone, hourCycle: settings.hourCycle }
                      )}
                      response={getChipResponse(event, responses)}
                      isOver={isEventOver(event, now, timeZone)}
                      isSelected={event.id === selectedId}
                      onOpen={() => calendar.openEvent(event)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function AgendaRow({
  event,
  color,
  time,
  response,
  isOver,
  isSelected,
  onOpen,
}: {
  event: CalendarAppEvent
  color: CalendarAppCalendar["color"]
  time: string
  response: ReturnType<typeof getChipResponse>
  isOver: boolean
  isSelected: boolean
  onOpen: () => void
}) {
  const guests = orderGuests(event.data?.guests ?? [])
  const more = guests.length - MAX_AVATARS
  return (
    <button
      type="button"
      aria-current={isSelected || undefined}
      onClick={onOpen}
      className={cn(
        "flex min-h-(--density-40) w-full min-w-0 cursor-pointer items-center gap-(--density-12) rounded-lg px-(--density-8) py-(--density-8) text-start text-(length:--density-text-13) transition-colors duration-feedback ease-feedback outline-none hover:bg-hover focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset @max-2xl:-mx-(--density-8) @max-2xl:w-[calc(100%+2*var(--density-8))]",
        isSelected && "bg-active"
      )}
    >
      <CalendarAppDot color={color} />
      <span className="flex min-w-0 flex-1 flex-col @2xl:flex-row @2xl:items-center @2xl:gap-(--density-12)">
        <span
          className={cn(
            "min-w-0 font-medium wrap-break-word @2xl:order-2 @2xl:shrink-0",
            isOver && "font-normal text-muted-foreground",
            response === "no" && "text-muted-foreground line-through"
          )}
        >
          {event.title || "(No title)"}
        </span>
        <span className="flex min-w-0 gap-(--density-4) text-muted-foreground tabular-nums @2xl:contents">
          <span className="shrink-0 @2xl:order-1 @2xl:w-40">{time}</span>
          {event.location ? (
            <>
              <span aria-hidden className="@2xl:hidden">
                ·
              </span>
              <span className="min-w-0 truncate @2xl:order-3 @2xl:flex-1">
                {event.location}
              </span>
            </>
          ) : null}
        </span>
      </span>
      {response === "yes" ? null : (
        <span
          className={cn(
            "shrink-0 text-(length:--density-text-12) text-muted-foreground",
            response === "awaiting" && !isOver && "text-warning-text"
          )}
        >
          {CALENDAR_APP_RESPONSE_LABELS[response]}
        </span>
      )}
      {guests.length > 1 ? (
        <span
          aria-hidden
          className="hidden w-24 shrink-0 justify-end @3xl:flex"
        >
          <AvatarGroup>
            {guests.slice(0, MAX_AVATARS).map((guest) => (
              <Avatar key={guest.id} size="sm">
                {guest.avatar ? (
                  <AvatarImage src={guest.avatar} alt="" />
                ) : null}
                <AvatarFallback>{guest.initials}</AvatarFallback>
              </Avatar>
            ))}
            {more > 0 ? <AvatarGroupCount>+{more}</AvatarGroupCount> : null}
          </AvatarGroup>
        </span>
      ) : (
        <span aria-hidden className="hidden w-24 shrink-0 @3xl:block" />
      )}
    </button>
  )
}
