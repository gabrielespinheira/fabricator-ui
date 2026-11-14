// The Event Calendar's agenda (Google Calendar's "Schedule"): the days that
// have events, each with its events in order. A plain scroller, as on the
// website, so it also stands alone in a dashboard card inside a page that
// scrolls (a virtual list can't sit in a scroller of the same direction).
import * as React from "react"
import { cn } from "cn"
import { Pressable, ScrollView, View } from "react-native"

import { type EventCalendarController } from "@/registry/fabricator/shared/hooks/use-event-calendar"
import {
  formatEventDate,
  formatEventTimeRange,
  getEventTimes,
  groupEventsByDay,
  resolveEventColor,
  toZoned,
  type CalendarEvent,
  type EventCalendarDayGroup,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import { getEventAccessibilityLabel } from "@/registry/native/lib/event-calendar-native-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { usePressScale } from "@/registry/native/lib/motion"
import { PressWash } from "@/registry/native/lib/press-wash"
import {
  ChipPaletteContext,
  ChipPaletteProvider,
} from "@/registry/native/ui/event-calendar-event"
import { Text } from "@/registry/native/ui/text"

type EventCalendarAgendaProps<TData> = Omit<
  React.ComponentProps<typeof View>,
  "children"
> & {
  calendar: EventCalendarController<TData>
  /** Called with the row's place on screen, to anchor the details. */
  onEventSelect?: (
    event: CalendarEvent<TData>,
    anchor: { x: number; y: number; width: number; height: number }
  ) => void
  /** Shown when the range has no events. */
  empty?: React.ReactNode
}

function AgendaEvent<TData>({
  calendar,
  event,
  onEventSelect,
}: {
  calendar: EventCalendarController<TData>
  event: CalendarEvent<TData>
  onEventSelect?: EventCalendarAgendaProps<TData>["onEventSelect"]
}) {
  const { timeZone, locale, settings, calendars } = calendar
  const ref = React.useRef<React.ComponentRef<typeof View>>(null)
  const press = usePressScale()
  const feedback = useFeedback()
  const resolve = React.use(ChipPaletteContext)
  const fill = resolve?.(resolveEventColor(event, calendars)).fill
  const format = { locale, timeZone, hourCycle: settings.hourCycle }
  const isPending = calendar.pendingIds.has(event.id)
  return (
    <Pressable
      ref={ref}
      data-slot="event-calendar-agenda-event"
      data-pending={isPending}
      role="button"
      accessibilityLabel={getEventAccessibilityLabel(event, {
        ...format,
        calendarName: calendars.find((item) => item.id === event.calendarId)
          ?.name,
      })}
      accessibilityState={{ busy: isPending }}
      className="cn-event-calendar-agenda-event min-w-0 flex-1 flex-row items-center"
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      onPress={() => {
        feedback("tap")
        ref.current?.measureInWindow((x, y, width, height) =>
          onEventSelect?.(event, { x, y, width, height })
        )
      }}
    >
      <PressWash
        press={press}
        className="cn-event-calendar-agenda-event-wash"
      />
      <View
        aria-hidden
        className="cn-event-calendar-agenda-event-dot shrink-0"
        style={fill ? { backgroundColor: fill } : undefined}
      />
      <Text
        numberOfLines={1}
        className="cn-event-calendar-agenda-event-time shrink-0"
      >
        {formatEventTimeRange(getEventTimes(event, timeZone), format)}
      </Text>
      <Text
        numberOfLines={1}
        className="cn-event-calendar-agenda-event-title min-w-0 flex-1"
      >
        {event.title || "(No title)"}
      </Text>
    </Pressable>
  )
}

function EventCalendarAgenda<TData>({
  calendar,
  onEventSelect,
  empty,
  className,
  ...props
}: EventCalendarAgendaProps<TData>) {
  const { visibleEvents, range, timeZone, locale } = calendar
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

  const renderDay = (day: EventCalendarDayGroup<TData>) => {
    const isToday = day.key === today
    return (
      <View
        key={day.key}
        data-slot="event-calendar-agenda-day"
        data-today={isToday}
        accessibilityLabel={formats.full.format(day.date)}
        className="cn-event-calendar-agenda-day flex-row"
      >
        <View
          data-slot="event-calendar-agenda-date"
          className="cn-event-calendar-agenda-date shrink-0 flex-col"
        >
          <Text
            data-today={isToday}
            className="cn-event-calendar-agenda-date-number"
          >
            {String(toZoned(day.date, timeZone).getDate())}
          </Text>
          <Text
            numberOfLines={1}
            className="cn-event-calendar-agenda-date-label"
          >
            {`${formats.weekday.format(day.date)}, ${formats.monthDay.format(day.date)}`}
          </Text>
        </View>
        <View className="cn-event-calendar-agenda-events min-w-0 flex-1 flex-col">
          {day.events.map((event) => (
            <AgendaEvent
              key={event.id}
              calendar={calendar}
              event={event}
              onEventSelect={onEventSelect}
            />
          ))}
        </View>
      </View>
    )
  }

  return (
    <View
      data-slot="event-calendar-agenda"
      className={cn("cn-event-calendar-agenda min-h-0 flex-col", className)}
      {...props}
    >
      <ChipPaletteProvider>
        {days.length === 0 && !calendar.isLoading ? (
          empty
        ) : (
          <ScrollView nestedScrollEnabled className="min-h-0 flex-1">
            {days.map(renderDay)}
          </ScrollView>
        )}
      </ChipPaletteProvider>
    </View>
  )
}

export { EventCalendarAgenda, type EventCalendarAgendaProps }
