// The native Event Calendar's adapter to @super-calendar/native, the only file
// that imports it. It hands the engine the visible range's events as plain
// instants (occurrences already expanded by the shared model), draws every
// event with our chip, styles the engine's own parts through its class slots
// and the theme's tokens, and turns its drops, resizes, sweeps and presses
// into calls on the controller. The engine's state never wins: a drop lands
// through the controller's optimistic layer, and a recurring event snaps back
// until its scope is picked.
import * as React from "react"
import {
  Calendar as Engine,
  type CalendarEvent as EngineCalendarEvent,
  type CalendarProps as EngineProps,
  type RenderEventArgs,
} from "@super-calendar/native"
import { cn } from "cn"
import { Pressable, View, type AccessibilityActionEvent } from "react-native"
import { useCSSVariable } from "uniwind"

import { type EventCalendarController } from "@/registry/fabricator/shared/hooks/use-event-calendar"
import {
  getEventTimes,
  isTimeGridView,
  resolveEventColor,
  type CalendarEvent,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import { isOccurrence } from "@/registry/fabricator/shared/lib/event-calendar-recurrence"
import {
  applyEventAction,
  ENGINE_THEME_VARIABLES,
  getChangedEvent,
  getChipTimeText,
  getChipVariant,
  getCreateDraft,
  getEngineBusinessHours,
  getEngineEvent,
  getEngineMode,
  getEngineTheme,
  getEventAccessibilityLabel,
  getEventActions,
  getHiddenDays,
  isEventActionName,
  type EngineEvent,
} from "@/registry/native/lib/event-calendar-native-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import {
  ChipPaletteProvider,
  EventCalendarEvent,
  type EventCalendarEventVariant,
} from "@/registry/native/ui/event-calendar-event"

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

/** Where a panel opened from the grid should point, in window points. */
type EventCalendarAnchor = {
  x: number
  y: number
  width: number
  height: number
}

type EventCalendarEngineProps<TData = unknown> = {
  calendar: EventCalendarController<TData>
  /** Replaces the chip; `EventCalendarEvent` is there to reuse. */
  renderEvent?: (props: EventCalendarRenderEventProps<TData>) => React.ReactNode
  /** An event shown while it's created, before it's saved. */
  draft?: CalendarEvent<TData>
  /** Where a panel opened from the grid should point. */
  onAnchor?: (anchor: EventCalendarAnchor | null) => void
  /** A long press on an event that can't be picked up. */
  onEventMenu?: (event: CalendarEvent<TData>) => void
  className?: string
}

/** What the engine carries beside its own fields. */
type EngineExtra<TData> = Omit<
  EngineEvent<TData>,
  "start" | "end" | "title"
> & {
  isDraft?: boolean
}

// --- Classes -----------------------------------------------------------------
// The engine takes classes per slot, not JSX. The build compiles placeholders
// outside JSX only in a `className: cn(…)` property, so each is read from one.

const engineClass = { className: cn("cn-event-calendar-engine") }.className
const gridClass = { className: cn("cn-event-calendar-grid") }.className
const dayHeaderRowClass = { className: cn("cn-event-calendar-day-header-row") }
  .className
const dayHeaderClass = { className: cn("cn-event-calendar-day-header") }
  .className
const dayHeaderWeekdayClass = {
  className: cn("cn-event-calendar-day-header-weekday"),
}.className
const weekNumberHeaderClass = {
  className: cn("cn-event-calendar-week-number-header"),
}.className
const allDayDividerClass = {
  className: cn("cn-event-calendar-all-day-divider"),
}.className
const allDayHeaderInnerClass = {
  className: cn("cn-event-calendar-all-day-header-inner"),
}.className
const rowEventClass = { className: cn("cn-event-calendar-fc-row-event") }
  .className
const columnEventClass = { className: cn("cn-event-calendar-fc-column-event") }
  .className
const slotHeaderDividerClass = {
  className: cn("cn-event-calendar-slot-header-divider"),
}.className
const slotHeaderInnerClass = {
  className: cn("cn-event-calendar-slot-header-inner"),
}.className
const slotLaneClass = { className: cn("cn-event-calendar-slot-lane") }.className
const nonBusinessClass = { className: cn("cn-event-calendar-non-business") }
  .className
const dayLaneClass = { className: cn("cn-event-calendar-day-lane") }.className
const nowLineClass = { className: cn("cn-event-calendar-now-line") }.className
const highlightClass = { className: cn("cn-event-calendar-highlight") }
  .className
const tableHeaderClass = { className: cn("cn-event-calendar-table-header") }
  .className
const viewClass = { className: cn("cn-event-calendar-view") }.className
const moreLinkInnerClass = {
  className: cn("cn-event-calendar-more-link-inner"),
}.className
const popoverClass = { className: cn("cn-event-calendar-popover") }.className
const singleMonthClass = { className: cn("cn-event-calendar-single-month") }
  .className
const singleMonthHeaderInnerClass = {
  className: cn("cn-event-calendar-single-month-header-inner"),
}.className
const dayCellMarkedClass = {
  className: cn("cn-event-calendar-day-cell-marked"),
}.className

const SLOT_CLASSES: EngineProps<unknown>["classNames"] = {
  header: dayHeaderRowClass,
  columnHeader: dayHeaderClass,
  columnHeaderWeekday: dayHeaderWeekdayClass,
  weekNumber: weekNumberHeaderClass,
  allDayLane: allDayDividerClass,
  allDayLabel: allDayHeaderInnerClass,
  allDayEvent: rowEventClass,
  hourGutter: slotHeaderDividerClass,
  hourLabel: slotHeaderInnerClass,
  gridLines: slotLaneClass,
  businessHours: nonBusinessClass,
  daySeparator: dayLaneClass,
  event: columnEventClass,
  nowIndicator: nowLineClass,
  createGhost: highlightClass,
  weekdays: tableHeaderClass,
  weekday: dayHeaderWeekdayClass,
  grid: viewClass,
  more: moreLinkInnerClass,
  morePopover: popoverClass,
  month: singleMonthClass,
  monthTitle: singleMonthHeaderInnerClass,
  eventDot: dayCellMarkedClass,
}

// --- Chips -------------------------------------------------------------------

const DAY = 24 * 60 * 60 * 1000
// The hour Day, N days and Week open at, as the website's scrollTime.
const SCROLL_MINUTES = 8 * 60
// A block shorter than this draws its time beside the title.
const SHORT_MINUTES = 45
// A block narrower than this, in points, draws its title on one line.
const NARROW_WIDTH = 64

type ChipContextValue<TData> = {
  calendar: EventCalendarController<TData>
  renderEvent?: EventCalendarEngineProps<TData>["renderEvent"]
  onAnchor?: EventCalendarEngineProps<TData>["onAnchor"]
  onEventMenu?: EventCalendarEngineProps<TData>["onEventMenu"]
}

/**
 * The chip the engine renders for each event, and the context it reads. Made
 * once per engine: the engine renders it as a component, so its identity
 * has to hold, and the context carries the calendar's type through.
 */
function createChip<TData>() {
  const ChipContext = React.createContext<ChipContextValue<TData> | null>(null)

  function EngineChip({
    event: engineEvent,
    mode,
    isAllDay: isInAllDayLane,
    onPress,
    onLongPress,
  }: RenderEventArgs<EngineExtra<TData>>) {
    const context = React.use(ChipContext)
    const ref = React.useRef<React.ComponentRef<typeof View>>(null)
    const feedback = useFeedback()
    // Side by side events can be too narrow for a word a line: those draw
    // the title on one line, as a short event does.
    const [isNarrow, setIsNarrow] = React.useState(false)
    if (!context) return null
    const { calendar, renderEvent, onAnchor, onEventMenu } = context
    const { timeZone, locale, settings } = calendar
    const event = engineEvent.source
    const isDraft = engineEvent.isDraft ?? false
    const times = getEventTimes(event, timeZone)
    const variant = getChipVariant({
      mode,
      isAllDay: isInAllDayLane ?? times.allDay,
      isMultiDay: +times.end - +times.start >= DAY,
    })
    const format = { locale, timeZone, hourCycle: settings.hourCycle }
    const timeText = getChipTimeText(variant, times, format)
    const isPending = calendar.pendingIds.has(event.id)
    const props: EventCalendarRenderEventProps<TData> = {
      event,
      variant,
      timeText,
      isShort:
        variant === "block" &&
        (isNarrow || +times.end - +times.start < SHORT_MINUTES * 60000),
      isPast: !isDraft && +times.end < Date.now(),
      isPending,
      isSelected:
        calendar.panel?.kind === "details" &&
        calendar.panel.event.id === event.id,
      isDragging: false,
      isDraft,
    }
    const canEdit = !isDraft && !isPending && calendar.canEdit(event)
    const actions = isDraft
      ? []
      : getEventActions({ isAllDay: times.allDay, canEdit })
    const calendarName = calendar.calendars.find(
      (source) => source.id === event.calendarId
    )?.name
    const label = getEventAccessibilityLabel(event, { ...format, calendarName })

    const press = () => {
      const view = ref.current
      if (view && onAnchor) {
        view.measureInWindow((x, y, width, height) =>
          onAnchor({ x, y, width, height })
        )
      }
      onPress()
    }
    const handleAction = ({ nativeEvent }: AccessibilityActionEvent) => {
      const name = nativeEvent.actionName
      if (!isEventActionName(name)) return
      const result = applyEventAction(name, event, {
        slotMinutes: settings.slotMinutes,
        timeZone,
      })
      if (result.kind === "delete") {
        feedback("thud")
        calendar.deleteEvent(event)
        return
      }
      feedback("drop")
      calendar.updateEvent(event, result.event, { reason: result.reason })
    }
    const shared = {
      accessible: true,
      accessibilityRole: "button" as const,
      accessibilityLabel: label,
      accessibilityHint: canEdit ? "Hold to move." : undefined,
      accessibilityActions: actions,
      onAccessibilityAction: handleAction,
      onPress: press,
      onLongPress:
        onLongPress ??
        (onEventMenu && !isDraft ? () => onEventMenu(event) : undefined),
    }

    return (
      <View
        ref={ref}
        collapsable={false}
        className="flex-1"
        onLayout={(layout) =>
          setIsNarrow(layout.nativeEvent.layout.width < NARROW_WIDTH)
        }
      >
        {renderEvent ? (
          <Pressable {...shared} className="flex-1">
            {renderEvent(props)}
          </Pressable>
        ) : (
          <EventCalendarEvent
            {...props}
            {...shared}
            color={resolveEventColor(event, calendar.calendars)}
            className="flex-1"
          />
        )}
      </View>
    )
  }

  return { ChipContext, EngineChip }
}

// --- The engine --------------------------------------------------------------

function EventCalendarEngine<TData>({
  calendar,
  renderEvent,
  draft,
  onAnchor,
  onEventMenu,
  className,
}: EventCalendarEngineProps<TData>) {
  const [{ ChipContext, EngineChip }] = React.useState(() =>
    createChip<TData>()
  )
  const feedback = useFeedback()
  const latest = React.useRef({ calendar, onAnchor })
  React.useLayoutEffect(() => {
    latest.current = { calendar, onAnchor }
  })

  const {
    view,
    date,
    timeZone,
    settings,
    days,
    visibleEvents,
    pendingIds,
    canEdit,
    businessHours,
  } = calendar
  const mode = getEngineMode(view)
  // Two half-hour slots of the --density-30 step, as on the website.
  const hourHeight = 2 * parseNumber(useCSSVariable("--density-30"), 30)
  const themeValues = useCSSVariable([...ENGINE_THEME_VARIABLES])
    .map((value) => (typeof value === "string" ? value : ""))
    .join("|")
  const theme = React.useMemo(
    () => getEngineTheme(themeValues.split("|")),
    [themeValues]
  )
  const engineBusinessHours = React.useMemo(
    () => getEngineBusinessHours(businessHours),
    [businessHours]
  )

  // Unchanged events keep their object, so the engine redraws only what moved.
  const [cache] = React.useState(
    () => new WeakMap<CalendarEvent<TData>, EngineEvent<TData>>()
  )
  const events = React.useMemo(() => {
    const list: (EngineEvent<TData> & { isDraft?: boolean })[] =
      visibleEvents.map((event) =>
        getEngineEvent(
          event,
          {
            timeZone,
            isDraggable: canEdit(event) && !pendingIds.has(event.id),
          },
          cache
        )
      )
    if (draft) {
      const times = getEventTimes(draft, timeZone)
      list.push({
        id: draft.id,
        title: draft.title,
        start: times.start,
        end: times.end,
        allDay: times.allDay,
        draggable: false,
        source: draft,
        isDraft: true,
      })
    }
    return list
  }, [cache, canEdit, draft, pendingIds, timeZone, visibleEvents])

  const chip = React.useMemo<ChipContextValue<TData>>(
    () => ({ calendar, renderEvent, onAnchor, onEventMenu }),
    [calendar, onAnchor, onEventMenu, renderEvent]
  )

  // Every handler reads the latest controller, so none of them changes.
  const handlers = React.useMemo(() => {
    const createAt = (start: Date, end: Date, allDay: boolean) => {
      const { calendar } = latest.current
      if (!calendar.isEditable) return
      latest.current.onAnchor?.(null)
      calendar.startCreate(
        getCreateDraft<TData>({
          id: calendar.createId(),
          start,
          end,
          allDay,
          calendarId: calendar.calendars.find((item) => item.editable !== false)
            ?.id,
          timeZone: calendar.timeZone,
        })
      )
    }
    const showDay = (day: Date) => {
      const { calendar } = latest.current
      calendar.goTo(day)
      calendar.setView("day")
    }
    return {
      onChangeDate: (next: Date) => {
        const { calendar } = latest.current
        // The engine reports the page it settled on, also after the header
        // moved it there.
        if (+next === +calendar.date) return
        feedback("page")
        calendar.goTo(next)
      },
      onPressEvent: (event: EngineCalendarEvent<EngineExtra<TData>>) => {
        if (event.isDraft) return
        latest.current.calendar.openEvent(event.source)
      },
      onDragStart: () => feedback("grab"),
      onDragEvent: (
        event: EngineCalendarEvent<EngineExtra<TData>>,
        start: Date,
        end: Date
      ) => {
        const { calendar } = latest.current
        const { next, reason } = getChangedEvent(
          event.source,
          start,
          end,
          calendar.timeZone
        )
        feedback("drop")
        calendar.updateEvent(event.source, next, { reason })
        // A recurring event asks which events change first; it waits where
        // it was, and the answer moves it.
        if (isOccurrence(event.source)) return false
        return true
      },
      onCreateEvent: (start: Date, end: Date) => {
        const view = latest.current.calendar.view
        createAt(start, end, !isTimeGridView(view))
      },
      onPressCell: (pressed: Date) => {
        const { calendar } = latest.current
        if (!isTimeGridView(calendar.view)) return
        const slot = calendar.settings.slotMinutes * 60000
        const start = new Date(Math.floor(+pressed / slot) * slot)
        createAt(
          start,
          new Date(+start + calendar.settings.eventMinutes * 60000),
          false
        )
      },
      onPressDay: showDay,
      onPressDateHeader: showDay,
      onPressMonth: (month: Date) => {
        const { calendar } = latest.current
        calendar.goTo(month)
        calendar.setView("month")
      },
    }
  }, [feedback])

  return (
    <View
      data-slot="event-calendar-engine"
      className={cn(
        "cn-event-calendar-engine min-h-0 flex-1",
        engineClass,
        className
      )}
    >
      <ChipPaletteProvider>
        <ChipContext value={chip}>
          <View className={cn("min-h-0 flex-1", gridClass)}>
            <Engine<EngineExtra<TData>>
              mode={mode}
              date={date}
              events={events}
              keyExtractor={(event) => event.id}
              renderEvent={EngineChip}
              classNames={SLOT_CLASSES}
              theme={theme}
              weekStartsOn={settings.weekStartsOn}
              hiddenDays={getHiddenDays(view, settings.showWeekends)}
              numberOfDays={days}
              timeZone={timeZone}
              ampm={settings.hourCycle === "h12"}
              showWeekNumber={settings.showWeekNumbers}
              dragStepMinutes={settings.slotMinutes}
              timeslots={2}
              hourHeight={hourHeight}
              businessHours={engineBusinessHours}
              scrollOffsetMinutes={SCROLL_MINUTES}
              showTitle={false}
              // The grips sit over the title of a short event; the edges still
              // resize, as the website's invisible handles do, and VoiceOver
              // has Lengthen and Shorten.
              showDragHandle={false}
              moreLabel="{moreCount} more"
              onChangeDate={handlers.onChangeDate}
              onPressEvent={handlers.onPressEvent}
              onDragStart={handlers.onDragStart}
              onDragEvent={
                calendar.isEditable ? handlers.onDragEvent : undefined
              }
              onCreateEvent={
                calendar.isEditable ? handlers.onCreateEvent : undefined
              }
              onPressCell={
                calendar.isEditable ? handlers.onPressCell : undefined
              }
              onPressDay={handlers.onPressDay}
              onPressDateHeader={handlers.onPressDateHeader}
              onPressMonth={handlers.onPressMonth}
            />
          </View>
        </ChipContext>
      </ChipPaletteProvider>
    </View>
  )
}

export {
  EventCalendarEngine,
  type EventCalendarAnchor,
  type EventCalendarEngineProps,
  type EventCalendarRenderEventProps,
}
