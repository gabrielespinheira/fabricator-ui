"use client"

// The Event Calendar: a Google Calendar-class scheduler on FullCalendar 7.
// `<EventCalendar events={events} onEventChange={(change) =>
// setEvents(change.apply)} />` draws the header, the grid and every panel,
// and turns on creating, moving, resizing, editing, deleting, undo and the
// keyboard. Compose the parts with `useEventCalendar` to place them yourself:
// the mini month and the calendar list in a sidebar, a custom header.
import * as React from "react"
import { CalendarDate } from "@internationalized/date"
import { cn } from "cn"
import {
  Dialog as DialogPrimitive,
  PopoverContext,
} from "react-aria-components"
import { toast } from "sonner"

import {
  useEventCalendar,
  type EventCalendarBusinessHours,
  type EventCalendarChangeEvent,
  type EventCalendarController,
  type UseEventCalendarOptions,
} from "@/registry/bases/aria/hooks/use-event-calendar"
import {
  type EventCalendarLoader,
  type EventCalendarLoadRequest,
} from "@/registry/bases/aria/lib/event-calendar-loader"
import {
  createEventDraft,
  EVENT_CALENDAR_SHORTCUTS,
  formatEventDay,
  formatEventTimeRange,
  fromWallParts,
  getDayBand,
  getEventTimes,
  getKeyboardNudge,
  getShortcut,
  getViewLabel,
  getVisibleDays,
  getWallParts,
  isEventCalendarView,
  nudgeEvent,
  resolveEventColor,
  setEventTimes,
  toEventCalendarWeekday,
  type CalendarEvent,
  type CalendarSource,
  type EventCalendarColor,
  type EventCalendarView,
  type EventCalendarWeekday,
  type RecurrenceScope,
} from "@/registry/bases/aria/lib/event-calendar-model"
import {
  describeRecurrence,
  EventCalendarRecurrenceError,
  getRecurrencePresets,
  parseRecurrence,
} from "@/registry/bases/aria/lib/event-calendar-recurrence"
import { Button } from "@/registry/bases/aria/ui/button"
import { Calendar } from "@/registry/bases/aria/ui/calendar"
import { Checkbox } from "@/registry/bases/aria/ui/checkbox"
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/registry/bases/aria/ui/context-menu"
import { DatePicker } from "@/registry/bases/aria/ui/date-picker"
import { DensityProvider, type Density } from "@/registry/bases/aria/ui/density"
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/bases/aria/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/aria/ui/drawer"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/registry/bases/aria/ui/empty"
import { EventCalendarAgenda } from "@/registry/bases/aria/ui/event-calendar-agenda"
import {
  EventCalendarEngine,
  type EventCalendarEngineProps,
  type EventCalendarRenderEventProps,
} from "@/registry/bases/aria/ui/event-calendar-engine"
import {
  EventCalendarEvent,
  getChipColorStyle,
} from "@/registry/bases/aria/ui/event-calendar-event"
import { Field, FieldGroup, FieldLabel } from "@/registry/bases/aria/ui/field"
import { Input } from "@/registry/bases/aria/ui/input"
import { Kbd, KbdGroup } from "@/registry/bases/aria/ui/kbd"
import { Popover, PopoverTrigger } from "@/registry/bases/aria/ui/popover"
import {
  RadioGroup,
  RadioGroupItem,
} from "@/registry/bases/aria/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/bases/aria/ui/select"
import { Switch } from "@/registry/bases/aria/ui/switch"
import { Textarea } from "@/registry/bases/aria/ui/textarea"
import { TimeInput } from "@/registry/bases/aria/ui/time-input"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// --- Context -----------------------------------------------------------------

type EventCalendarUi<TData> = {
  calendar: EventCalendarController<TData>
  rootRef: React.RefObject<HTMLDivElement | null>
  /** The element the open panel points at. */
  anchor: HTMLElement | null
  setAnchor: (element: HTMLElement | null) => void
  /** The full form for the open draft or event. */
  isFormOpen: boolean
  setFormOpen: (open: boolean) => void
  isHelpOpen: boolean
  setHelpOpen: (open: boolean) => void
  /** The event the keyboard picked up, where it is now. */
  grabbed?: { event: CalendarEvent<TData>; preview: CalendarEvent<TData> }
  renderEvent?: EventCalendarEngineProps<TData>["renderEvent"]
  renderDraftNotice?: (event: CalendarEvent<TData>) => React.ReactNode
  fullCalendar?: EventCalendarEngineProps<TData>["fullCalendar"]
  isMounted: boolean
}

const EventCalendarContext =
  React.createContext<EventCalendarUi<unknown> | null>(null)

class EventCalendarContextError extends Error {
  constructor(part: string) {
    super(`${part} needs a \`calendar\` prop or an <EventCalendar> around it.`)
    this.name = "EventCalendarContextError"
  }
}

function useEventCalendarUi<TData>(part: string) {
  const context = React.useContext(EventCalendarContext)
  if (!context) throw new EventCalendarContextError(part)
  return context as EventCalendarUi<TData>
}

/** The controller from a `calendar` prop, or from the nearest calendar. */
function useCalendarPart<TData>(
  part: string,
  calendar: EventCalendarController<TData> | undefined
) {
  const context = React.useContext(EventCalendarContext)
  const resolved =
    calendar ?? (context?.calendar as EventCalendarController<TData>)
  if (!resolved) throw new EventCalendarContextError(part)
  return resolved
}

// --- Root --------------------------------------------------------------------

type EventCalendarOwnProps<TData> = {
  /** A controller from `useEventCalendar`, to share it with parts outside. */
  calendar?: EventCalendarController<TData>
  /** `card` (default) sits on its own surface; `flat` on the page. */
  variant?: "card" | "flat"
  /** `sm` and `lg` set the compact and spacious densities. */
  size?: "sm" | "default" | "lg"
  /** Replaces the event chip; `EventCalendarEvent` is there to reuse. */
  renderEvent?: (props: EventCalendarRenderEventProps<TData>) => React.ReactNode
  /** Optional feedback below the selected slot in quick create. */
  renderDraftNotice?: (event: CalendarEvent<TData>) => React.ReactNode
  /** Web only: FullCalendar options merged last. */
  fullCalendar?: EventCalendarEngineProps<TData>["fullCalendar"]
  /** Keyboard shortcuts in the calendar (default) or off. */
  shortcuts?: boolean
}

type EventCalendarProps<TData = unknown> = UseEventCalendarOptions<TData> &
  EventCalendarOwnProps<TData> &
  Omit<
    React.ComponentProps<"div">,
    keyof UseEventCalendarOptions<TData> | keyof EventCalendarOwnProps<TData>
  >

const SIZE_DENSITY: Record<"sm" | "lg", Density> = {
  sm: "compact",
  lg: "spacious",
}

function EventCalendar<TData = unknown>(props: EventCalendarProps<TData>) {
  if (props.calendar) {
    return <EventCalendarFrame {...props} calendar={props.calendar} />
  }
  return <EventCalendarWithController {...props} />
}

function EventCalendarWithController<TData>({
  events,
  defaultEvents,
  load,
  onEventChange,
  onEventOpen,
  onRangeChange,
  calendars,
  view,
  defaultView,
  onViewChange,
  views,
  days,
  date,
  defaultDate,
  onDateChange,
  settings,
  defaultSettings,
  onSettingsChange,
  timeZone,
  locale,
  businessHours,
  continuous,
  editable,
  createId,
  ...props
}: EventCalendarProps<TData>) {
  const calendar = useEventCalendar<TData>({
    events,
    defaultEvents,
    load,
    onEventChange,
    onEventOpen,
    onRangeChange,
    calendars,
    view,
    defaultView,
    onViewChange,
    views,
    days,
    date,
    defaultDate,
    onDateChange,
    settings,
    defaultSettings,
    onSettingsChange,
    timeZone,
    locale,
    businessHours,
    continuous,
    editable,
    createId,
  })
  return <EventCalendarFrame {...props} calendar={calendar} />
}

const COMPACT_WIDTH = 640

function EventCalendarFrame<TData>({
  calendar,
  variant = "card",
  size = "default",
  renderEvent,
  renderDraftNotice,
  fullCalendar,
  shortcuts = true,
  className,
  children,
  onKeyDown,
  ...props
}: EventCalendarOwnProps<TData> &
  React.ComponentProps<"div"> & { calendar: EventCalendarController<TData> }) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const [isFormOpen, setFormOpen] = React.useState(false)
  const [isHelpOpen, setHelpOpen] = React.useState(false)
  const [grabbed, setGrabbed] =
    React.useState<EventCalendarUi<TData>["grabbed"]>()
  const [announcement, setAnnouncement] = React.useState("")
  // FullCalendar measures the DOM and the grid depends on today and the
  // device's zone, so it draws after hydration; the server sends the frame.
  const isMounted = React.useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false
  )
  const { setCompact, notice } = calendar

  React.useEffect(() => {
    const element = rootRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      setCompact(entry.contentRect.width < COMPACT_WIDTH)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [setCompact])

  // Every change reports itself in a toast, with Undo, or Retry if it failed.
  React.useEffect(() => {
    if (!notice) return
    const options = notice.action
      ? { action: { label: notice.action.label, onClick: notice.action.run } }
      : {}
    if (notice.status === "failed") toast.error(notice.message, options)
    else toast(notice.message, options)
  }, [notice])

  const ui = React.useMemo<EventCalendarUi<TData>>(
    () => ({
      calendar,
      rootRef,
      anchor,
      setAnchor,
      isFormOpen,
      setFormOpen,
      isHelpOpen,
      setHelpOpen,
      grabbed,
      renderEvent,
      renderDraftNotice,
      fullCalendar,
      isMounted,
    }),
    [
      anchor,
      calendar,
      fullCalendar,
      grabbed,
      isFormOpen,
      isHelpOpen,
      isMounted,
      renderEvent,
      renderDraftNotice,
    ]
  )

  // The moved event keeps focus: FullCalendar redraws an event whose times
  // change, which drops the focus it had.
  const [focusId, setFocusId] = React.useState<string>()
  const rangeKey = `${calendar.view}:${+calendar.range.start}`
  const [focusRange, setFocusRange] = React.useState(rangeKey)
  if (focusRange !== rangeKey) {
    setFocusRange(rangeKey)
    setFocusId(undefined)
  }
  React.useLayoutEffect(() => {
    if (!focusId) return
    const active = document.activeElement
    const root = rootRef.current
    if (active && active !== document.body && !root?.contains(active)) return
    const chip = root?.querySelector<HTMLElement>(
      `[data-slot=event-calendar-event][data-event-id="${CSS.escape(focusId)}"]`
    )
    const target = chip?.closest<HTMLElement>("[tabindex]") ?? chip
    if (target && target !== active) target.focus({ preventScroll: true })
  }, [focusId, grabbed, calendar.visibleEvents])

  // Keys on a focused or picked-up event run before FullCalendar's own,
  // which takes Space and Enter to open the event.
  const handleEventKeys = (keyboard: React.KeyboardEvent<HTMLDivElement>) => {
    const target = keyboard.target
    if (!(target instanceof HTMLElement) || target.closest(TEXT_FIELDS)) return
    const { settings, view, timeZone } = calendar
    const handled = () => {
      keyboard.preventDefault()
      keyboard.stopPropagation()
    }

    // A picked-up event: arrows move it, Shift resizes, Enter drops it.
    if (grabbed) {
      if (keyboard.key === "Escape") {
        handled()
        setGrabbed(undefined)
        setAnnouncement("Move cancelled")
        return
      }
      if (keyboard.key === "Enter" || keyboard.key === " ") {
        handled()
        setGrabbed(undefined)
        calendar.updateEvent(grabbed.event, grabbed.preview, { reason: "move" })
        return
      }
      const nudge = getKeyboardNudge(
        keyboard.key,
        keyboard,
        view,
        settings.slotMinutes
      )
      if (!nudge) return
      handled()
      const preview = nudgeEvent(
        grabbed.preview,
        nudge,
        timeZone,
        settings.slotMinutes
      )
      setGrabbed({ event: grabbed.event, preview })
      setAnnouncement(describeEventTime(calendar, preview))
      return
    }

    const focused = findFocusedEvent(calendar, target)
    if (!focused || !calendar.canEdit(focused)) return
    if (keyboard.key === " ") {
      handled()
      setFocusId(focused.id)
      setGrabbed({ event: focused, preview: focused })
      setAnnouncement(
        `Picked up ${focused.title || "event"}. Arrows move it, Shift with up or down changes its length, Enter drops it, Escape cancels.`
      )
      return
    }
    if (keyboard.key === "Delete" || keyboard.key === "Backspace") {
      handled()
      calendar.deleteEvent(focused)
      return
    }
    if (keyboard.key === "e") {
      handled()
      calendar.editEvent(focused)
      setFormOpen(true)
    }
  }

  const handleKeyDown = (keyboard: React.KeyboardEvent<HTMLDivElement>) => {
    onKeyDown?.(keyboard)
    if (keyboard.defaultPrevented || !shortcuts) return
    const target = keyboard.target
    if (!(target instanceof HTMLElement) || target.closest(TEXT_FIELDS)) return

    const shortcut = getShortcut(keyboard.key, keyboard)
    if (!shortcut) return
    keyboard.preventDefault()
    switch (shortcut.kind) {
      case "view":
        if (calendar.views.includes(shortcut.view))
          calendar.setView(shortcut.view)
        break
      case "today":
        calendar.today()
        break
      case "next":
        calendar.next()
        break
      case "previous":
        calendar.previous()
        break
      case "create":
        startCreateAtNextSlot(calendar)
        setFormOpen(true)
        break
      case "help":
        setHelpOpen(true)
        break
      case "undo":
        calendar.undo()
        break
      case "redo":
        calendar.redo()
        break
    }
    // A new view or range redraws the grid, and the element that had focus
    // may go with it; the calendar keeps it, so the next key still lands.
    requestAnimationFrame(() => {
      const root = rootRef.current
      if (root && !root.contains(document.activeElement)) {
        root.focus({ preventScroll: true })
      }
    })
  }

  const frame = (
    <EventCalendarContext.Provider value={ui as EventCalendarUi<unknown>}>
      <div
        ref={rootRef}
        tabIndex={-1}
        data-slot="event-calendar"
        data-variant={variant}
        data-view={calendar.view}
        data-compact={calendar.isCompact || undefined}
        className={cn(
          "cn-event-calendar group/event-calendar flex flex-col",
          className
        )}
        onKeyDownCapture={handleEventKeys}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {children ?? (
          <>
            <EventCalendarHeader />
            <EventCalendarContent />
          </>
        )}
        <EventCalendarPanels />
        <EventCalendarScopeDialog />
        <EventCalendarShortcutsDialog />
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <div aria-live="polite" className="sr-only">
          {notice?.message}
        </div>
      </div>
    </EventCalendarContext.Provider>
  )
  if (size === "default") return frame
  return <DensityProvider density={SIZE_DENSITY[size]}>{frame}</DensityProvider>
}

const subscribeToNothing = () => () => {}

// Typing in these never triggers a shortcut. React Aria's select trigger is
// a button that opens a listbox, and types ahead through its options.
const TEXT_FIELDS =
  "input, textarea, select, [contenteditable=true], [role=combobox], [role=listbox], [aria-haspopup=listbox]"

function findFocusedEvent<TData>(
  calendar: EventCalendarController<TData>,
  target: HTMLElement
) {
  const chip =
    target.closest<HTMLElement>("[data-event-id]") ??
    target.querySelector<HTMLElement>("[data-event-id]")
  const id = chip?.dataset.eventId
  if (!id) return undefined
  return calendar.visibleEvents.find((event) => event.id === id)
}

function describeEventTime<TData>(
  calendar: EventCalendarController<TData>,
  event: CalendarEvent<TData>
) {
  const times = getEventTimes(event, calendar.timeZone)
  const options = {
    locale: calendar.locale,
    timeZone: calendar.timeZone,
    hourCycle: calendar.settings.hourCycle,
  }
  return `${formatEventDay(times.start, options)}, ${formatEventTimeRange(times, options)}`
}

/** A draft at the next slot of the focused day, as `c` does. */
function startCreateAtNextSlot<TData>(
  calendar: EventCalendarController<TData>
) {
  const now = new Date()
  const slot = calendar.settings.slotMinutes * 60000
  const isInRange = +now >= +calendar.range.start && +now < +calendar.range.end
  const base = isInRange ? now : new Date(+calendar.range.start + 9 * 3600000)
  const start = new Date(Math.ceil(+base / slot) * slot)
  calendar.startCreate(
    createEventDraft<TData>({
      id: calendar.createId(),
      start,
      end: new Date(+start + calendar.settings.eventMinutes * 60000),
      allDay: false,
      calendarId: calendar.calendars.find((item) => item.editable !== false)
        ?.id,
      timeZone: calendar.timeZone,
    })
  )
}

// --- Header ------------------------------------------------------------------

function EventCalendarHeader({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="event-calendar-header"
      className={cn("cn-event-calendar-header flex items-center", className)}
      {...props}
    >
      {children ?? (
        <>
          <div className="cn-event-calendar-header-start flex min-w-0 items-center">
            <EventCalendarTitle />
            <EventCalendarToday />
            <EventCalendarNavigation />
          </div>
          <div className="cn-event-calendar-header-end flex items-center">
            <EventCalendarViewSelect />
            <EventCalendarSettings />
            <EventCalendarCreateButton />
          </div>
        </>
      )}
    </div>
  )
}

type PartProps<TData> = { calendar?: EventCalendarController<TData> }

function EventCalendarToday<TData>({
  calendar: calendarProp,
  className,
  ...props
}: PartProps<TData> & React.ComponentProps<typeof Button>) {
  const calendar = useCalendarPart("EventCalendarToday", calendarProp)
  return (
    <Button
      data-slot="event-calendar-today"
      variant="outline"
      className={cn("cn-event-calendar-today", className)}
      onPress={() => calendar.today()}
      {...props}
    >
      Today
    </Button>
  )
}

function EventCalendarNavigation<TData>({
  calendar: calendarProp,
  className,
  ...props
}: PartProps<TData> & React.ComponentProps<"div">) {
  const calendar = useCalendarPart("EventCalendarNavigation", calendarProp)
  const label = getViewLabel(calendar.view, calendar.days).toLowerCase()
  return (
    <div
      data-slot="event-calendar-navigation"
      className={cn(
        "cn-event-calendar-navigation flex items-center",
        className
      )}
      {...props}
    >
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Previous ${label}`}
        onPress={() => calendar.previous()}
      >
        <IconPlaceholder
          lucide="ChevronLeftIcon"
          tabler="IconChevronLeft"
          hugeicons="ArrowLeft01Icon"
          phosphor="CaretLeftIcon"
          remixicon="RiArrowLeftSLine"
        />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Next ${label}`}
        onPress={() => calendar.next()}
      >
        <IconPlaceholder
          lucide="ChevronRightIcon"
          tabler="IconChevronRight"
          hugeicons="ArrowRight01Icon"
          phosphor="CaretRightIcon"
          remixicon="RiArrowRightSLine"
        />
      </Button>
    </div>
  )
}

/**
 * The period in view, and the date picker behind it: a mini month that marks
 * the days the calendar shows and moves it to the day picked.
 */
function EventCalendarTitle<TData>({
  calendar: calendarProp,
  className,
  ...props
}: PartProps<TData> & React.ComponentProps<"h2">) {
  const calendar = useCalendarPart("EventCalendarTitle", calendarProp)
  const context = React.useContext(EventCalendarContext)
  const [open, setOpen] = React.useState(false)
  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <h2
        data-slot="event-calendar-title"
        aria-live="polite"
        className={cn("cn-event-calendar-title flex min-w-0", className)}
        {...props}
      >
        <Button
          variant="outline"
          data-slot="event-calendar-title-trigger"
          className="cn-event-calendar-title-trigger"
        >
          <span className="truncate">
            {context?.isMounted === false ? " " : calendar.title}
          </span>
          <IconPlaceholder
            lucide="ChevronDownIcon"
            tabler="IconChevronDown"
            hugeicons="ArrowDown01Icon"
            phosphor="CaretDownIcon"
            remixicon="RiArrowDownSLine"
            data-slot="event-calendar-title-icon"
            className="cn-event-calendar-title-icon"
          />
        </Button>
      </h2>
      <Popover
        data-slot="event-calendar-date-picker"
        placement="bottom start"
        className="cn-event-calendar-date-picker"
      >
        <DialogPrimitive aria-label="Choose a date" className="outline-none">
          <EventCalendarMiniMonth
            calendar={calendar}
            onDateSelect={() => setOpen(false)}
          />
        </DialogPrimitive>
      </Popover>
    </PopoverTrigger>
  )
}

function EventCalendarViewSelect<TData>({
  calendar: calendarProp,
  className,
}: PartProps<TData> & { className?: string }) {
  const calendar = useCalendarPart("EventCalendarViewSelect", calendarProp)
  const items = calendar.views.map((view) => ({
    value: view,
    label: getViewLabel(view, calendar.days),
  }))
  return (
    <Select
      aria-label="View"
      selectedKey={calendar.view}
      onSelectionChange={(key) => {
        if (isEventCalendarView(key)) calendar.setView(key)
      }}
    >
      <SelectTrigger
        data-slot="event-calendar-view-select"
        className={cn("cn-event-calendar-view-select", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} id={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function EventCalendarCreateButton<TData>({
  calendar: calendarProp,
  className,
  children,
  ...props
}: PartProps<TData> & React.ComponentProps<typeof Button>) {
  const calendar = useCalendarPart("EventCalendarCreateButton", calendarProp)
  const context = React.useContext(EventCalendarContext)
  if (!calendar.isEditable) return null
  return (
    <Button
      data-slot="event-calendar-create"
      className={cn("cn-event-calendar-create", className)}
      onPress={() => {
        startCreateAtNextSlot(calendar)
        context?.setFormOpen(true)
      }}
      {...props}
    >
      {children ?? (
        <>
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
            data-icon="inline-start"
          />
          Create
        </>
      )}
    </Button>
  )
}

const WEEKDAY_ITEMS = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "6", label: "Saturday" },
]

const HOUR_CYCLE_ITEMS = [
  { value: "h12", label: "1:00 PM" },
  { value: "h23", label: "13:00" },
]

const SLOT_ITEMS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
]

function EventCalendarSettings<TData>({
  calendar: calendarProp,
  className,
}: PartProps<TData> & { className?: string }) {
  const calendar = useCalendarPart("EventCalendarSettings", calendarProp)
  const { settings, setSettings } = calendar
  const id = React.useId()
  return (
    <PopoverTrigger>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Calendar settings"
        className={cn("cn-event-calendar-settings-trigger", className)}
      >
        <IconPlaceholder
          lucide="SettingsIcon"
          tabler="IconSettings"
          hugeicons="Settings01Icon"
          phosphor="GearIcon"
          remixicon="RiSettings3Line"
        />
      </Button>
      <Popover
        data-slot="event-calendar-settings"
        placement="bottom end"
        className="cn-event-calendar-settings"
      >
        <DialogPrimitive
          aria-label="Calendar settings"
          className="outline-none"
        >
          <FieldGroup className="cn-event-calendar-settings-group">
            <Field orientation="horizontal">
              <FieldLabel htmlFor={`${id}-weekends`}>Show weekends</FieldLabel>
              <Switch
                id={`${id}-weekends`}
                isSelected={settings.showWeekends}
                onChange={(checked) => setSettings({ showWeekends: checked })}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldLabel htmlFor={`${id}-weeks`}>Show week numbers</FieldLabel>
              <Switch
                id={`${id}-weeks`}
                isSelected={settings.showWeekNumbers}
                onChange={(checked) =>
                  setSettings({ showWeekNumbers: checked })
                }
              />
            </Field>
            <SettingsSelect
              id={`${id}-start`}
              label="Week starts on"
              items={WEEKDAY_ITEMS}
              value={String(settings.weekStartsOn)}
              onValueChange={(value) =>
                setSettings({
                  weekStartsOn: toEventCalendarWeekday(Number(value)),
                })
              }
            />
            <SettingsSelect
              id={`${id}-cycle`}
              label="Time format"
              items={HOUR_CYCLE_ITEMS}
              value={settings.hourCycle}
              onValueChange={(value) =>
                setSettings({ hourCycle: value === "h23" ? "h23" : "h12" })
              }
            />
            <SettingsSelect
              id={`${id}-snap`}
              label="Snap to"
              items={SLOT_ITEMS}
              value={String(settings.slotMinutes)}
              onValueChange={(value) =>
                setSettings({
                  slotMinutes: value === "30" ? 30 : value === "60" ? 60 : 15,
                })
              }
            />
          </FieldGroup>
        </DialogPrimitive>
      </Popover>
    </PopoverTrigger>
  )
}

function SettingsSelect({
  id,
  label,
  items,
  value,
  onValueChange,
}: {
  id: string
  label: string
  items: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        aria-label={label}
        selectedKey={value}
        onSelectionChange={(key) => {
          if (typeof key === "string") onValueChange(key)
        }}
      >
        <SelectTrigger
          id={id}
          size="sm"
          className="cn-event-calendar-settings-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} id={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  )
}

// --- Content -----------------------------------------------------------------

function EventCalendarContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const ui = useEventCalendarUi("EventCalendarContent")
  const { calendar, grabbed, isMounted } = ui
  // The chip under a right-click names itself before the menu opens; a
  // right-click on empty time opens nothing.
  const menuTarget = React.useRef<Omit<EventMenuTarget, "element">>(undefined)
  const [menu, setMenu] = React.useState<EventMenuTarget>()
  const [isMenuOpen, setMenuOpen] = React.useState(false)
  const draft =
    calendar.panel?.kind === "create" ? calendar.panel.event : undefined

  return (
    <div
      data-slot="event-calendar-content"
      data-loading={calendar.isLoading || undefined}
      className={cn(
        "cn-event-calendar-content relative flex min-h-0 flex-1 flex-col",
        className
      )}
      {...props}
    >
      {calendar.isLoading ? (
        <div
          aria-hidden
          className="cn-event-calendar-loading absolute inset-x-0 top-0 z-10"
        />
      ) : null}
      {calendar.hasLoadError ? (
        <div role="alert" className="cn-event-calendar-error flex items-center">
          <span className="min-w-0 flex-1">
            Some events couldn&apos;t load.
          </span>
          <Button variant="outline" size="sm" onPress={() => calendar.retry()}>
            Try again
          </Button>
        </div>
      ) : null}
      {!isMounted ? (
        <div className="cn-event-calendar-placeholder min-h-0 flex-1" />
      ) : calendar.view === "agenda" ? (
        <EventCalendarAgenda
          calendar={calendar}
          className="min-h-0 flex-1"
          onEventSelect={(event, element) => {
            ui.setAnchor(element)
            calendar.openEvent(event)
          }}
          empty={<EventCalendarEmpty />}
        />
      ) : (
        // React Aria's context menu trigger makes its child a button, which
        // the grid can't be, so the grid opens the menu itself.
        <div
          className="flex min-h-0 flex-1 flex-col"
          onContextMenu={(pointer) => {
            const target = menuTarget.current
            menuTarget.current = undefined
            pointer.preventDefault()
            const element =
              pointer.target instanceof Element
                ? pointer.target.closest<HTMLElement>("[data-event-id]")
                : null
            if (!target || !element) return
            setMenu({ ...target, element })
            setMenuOpen(true)
          }}
        >
          <EventCalendarEngine
            calendar={calendar}
            renderEvent={ui.renderEvent}
            fullCalendar={ui.fullCalendar}
            draft={draft}
            preview={grabbed?.preview}
            onAnchor={ui.setAnchor}
            onEventMenu={(event, point) => {
              menuTarget.current = { event, point }
            }}
          />
          {menu ? (
            <EventCalendarEventMenu
              target={menu}
              isOpen={isMenuOpen}
              onOpenChange={setMenuOpen}
            />
          ) : null}
        </div>
      )}
    </div>
  )
}

type EventMenuTarget<TData = unknown> = {
  event: CalendarEvent<TData>
  /** Where the right-click landed, in the viewport. */
  point: { x: number; y: number }
  /** The chip it landed on. */
  element: HTMLElement
}

function EventCalendarEventMenu<TData>({
  target,
  isOpen,
  onOpenChange,
}: {
  target: EventMenuTarget<TData>
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { calendar, setAnchor, setFormOpen } = useEventCalendarUi<TData>(
    "EventCalendarEventMenu"
  )
  const { event, point, element } = target
  const canEdit = calendar.canEdit(event)
  const label = event.title || "Event"
  // The menu's popover takes its trigger from context, as a menu trigger
  // gives it; the chip is the trigger and the pointer the point it opens at.
  const popover = React.useMemo(
    () => ({
      triggerRef: { current: element },
      isOpen,
      onOpenChange,
      getTargetRect: () => new DOMRect(point.x, point.y, 0, 0),
      "aria-label": label,
    }),
    [element, isOpen, label, onOpenChange, point]
  )
  // The page is inert under the open menu, so a right-click outside it lands
  // on the body; it closes the menu, as React Aria's context menus do.
  React.useEffect(() => {
    if (!isOpen) return
    const closeOutside = (pointer: MouseEvent) => {
      const inMenu =
        pointer.target instanceof Element &&
        pointer.target.closest("[role=menu]")
      if (!inMenu) onOpenChange(false)
    }
    document.addEventListener("contextmenu", closeOutside)
    return () => document.removeEventListener("contextmenu", closeOutside)
  }, [isOpen, onOpenChange])
  const close = () => onOpenChange(false)
  return (
    <PopoverContext.Provider value={popover}>
      <ContextMenu
        data-slot="event-calendar-event-menu"
        aria-label={label}
        autoFocus
        onClose={close}
        className="w-auto"
      >
        <ContextMenuItem
          onAction={() => {
            setAnchor(element)
            calendar.openEvent(event)
          }}
        >
          Open
        </ContextMenuItem>
        {canEdit ? (
          <>
            <ContextMenuItem
              onAction={() => {
                calendar.editEvent(event)
                setFormOpen(true)
              }}
            >
              Edit
            </ContextMenuItem>
            <ContextMenuItem onAction={() => calendar.duplicateEvent(event)}>
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem
              variant="destructive"
              onAction={() => calendar.deleteEvent(event)}
            >
              Delete
            </ContextMenuItem>
          </>
        ) : null}
      </ContextMenu>
    </PopoverContext.Provider>
  )
}

function EventCalendarEmpty({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const context = React.useContext(EventCalendarContext)
  const calendar = context?.calendar
  return (
    <Empty
      data-slot="event-calendar-empty"
      className={cn("cn-event-calendar-empty", className)}
      {...props}
    >
      <EmptyHeader>
        <EmptyTitle>No events</EmptyTitle>
        <EmptyDescription>Nothing is planned in this period.</EmptyDescription>
      </EmptyHeader>
      {calendar?.isEditable ? (
        <EmptyContent>
          <Button
            variant="outline"
            onPress={() => calendar && startCreateAtNextSlot(calendar)}
          >
            Create an event
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}

// --- Panels ------------------------------------------------------------------

/**
 * Details and quick create point at their event in a popover; on a narrow
 * calendar they rise from the bottom in a drawer. The full form is a dialog.
 */
function EventCalendarPanels() {
  const ui = useEventCalendarUi("EventCalendarPanels")
  const { calendar, anchor, isFormOpen, setFormOpen, rootRef } = ui
  const panel = calendar.panel
  const isQuickOpen =
    panel !== undefined && panel.kind !== "edit" && !isFormOpen
  // Quick create points at its draft on the grid, once it's drawn there.
  const draftId = panel?.kind === "create" ? panel.event.id : undefined
  const target = usePanelTarget(
    rootRef,
    isQuickOpen && !calendar.isCompact,
    draftId,
    anchor
  )
  const targetRef = React.useMemo(() => ({ current: target }), [target])
  const close = () => {
    calendar.closePanel()
    setFormOpen(false)
  }

  const quick =
    panel?.kind === "details" ? (
      <EventCalendarEventDetails event={panel.event} onClose={close} />
    ) : panel?.kind === "create" ? (
      <EventCalendarEventForm
        key={panel.event.id}
        event={panel.event}
        isNew
        isQuick
        onCancel={close}
        onMoreOptions={(draft) => {
          calendar.startCreate(draft)
          setFormOpen(true)
        }}
      />
    ) : null

  return (
    <>
      {calendar.isCompact ? (
        <Drawer open={isQuickOpen} onOpenChange={(open) => !open && close()}>
          <DrawerContent data-slot="event-calendar-drawer">
            <DrawerHeader className="sr-only">
              <DrawerTitle>
                {panel?.kind === "create" ? "New event" : "Event"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="cn-event-calendar-drawer-body">{quick}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Popover
          data-slot="event-calendar-popover-panel"
          triggerRef={targetRef}
          isOpen={isQuickOpen && target !== null}
          onOpenChange={(open) => !open && close()}
          placement="right top"
          className="cn-event-calendar-panel"
        >
          <DialogPrimitive
            aria-label={panel?.kind === "create" ? "New event" : "Event"}
            className="outline-none"
          >
            {quick}
          </DialogPrimitive>
        </Popover>
      )}
      <Dialog
        data-slot="event-calendar-form-dialog"
        isOpen={(panel !== undefined && isFormOpen) || panel?.kind === "edit"}
        onOpenChange={(open) => !open && close()}
        className="cn-event-calendar-form-dialog"
      >
        <DialogHeader>
          <DialogTitle>
            {panel?.kind === "create" ? "New event" : "Edit event"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            The event&apos;s title, time, repeat, calendar, place and notes.
          </DialogDescription>
        </DialogHeader>
        {panel && panel.kind !== "details" ? (
          <EventCalendarEventForm
            key={panel.event.id}
            event={panel.event}
            isNew={panel.kind === "create"}
            onCancel={close}
          />
        ) : null}
      </Dialog>
    </>
  )
}

/**
 * The element the quick panel points at: the draft once the grid draws it
 * (FullCalendar draws and redraws it on its own), else the event it opened
 * from, else the calendar.
 */
function usePanelTarget(
  rootRef: React.RefObject<HTMLDivElement | null>,
  isOpen: boolean,
  draftId: string | undefined,
  anchor: HTMLElement | null
) {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const root = rootRef.current
      if (!isOpen || !draftId || !root) return () => {}
      const observer = new MutationObserver(onChange)
      observer.observe(root, { childList: true, subtree: true })
      return () => observer.disconnect()
    },
    [draftId, isOpen, rootRef]
  )
  const getTarget = React.useCallback(() => {
    const root = rootRef.current
    if (!isOpen || !root) return null
    const draft = draftId
      ? root.querySelector<HTMLElement>(
          `[data-event-id="${CSS.escape(draftId)}"]`
        )
      : null
    return draft ?? (anchor?.isConnected ? anchor : root)
  }, [anchor, draftId, isOpen, rootRef])
  return React.useSyncExternalStore(subscribe, getTarget, () => null)
}

function EventCalendarEventDetails<TData>({
  event,
  onClose,
  className,
  ...props
}: Omit<React.ComponentProps<"div">, "children"> & {
  event: CalendarEvent<TData>
  onClose?: () => void
}) {
  const { calendar, setFormOpen } = useEventCalendarUi<TData>(
    "EventCalendarEventDetails"
  )
  const times = getEventTimes(event, calendar.timeZone)
  const formatOptions = {
    locale: calendar.locale,
    timeZone: calendar.timeZone,
    hourCycle: calendar.settings.hourCycle,
  }
  const source = calendar.calendars.find((item) => item.id === event.calendarId)
  const recurrence = event.recurrence
    ? describeEventRecurrence(event.recurrence)
    : undefined
  const canEdit = calendar.canEdit(event)

  return (
    <div
      data-slot="event-calendar-event-details"
      style={getChipColorStyle(resolveEventColor(event, calendar.calendars))}
      className={cn("cn-event-calendar-event-details flex flex-col", className)}
      {...props}
    >
      <div className="cn-event-calendar-event-details-actions flex items-center justify-end">
        {canEdit ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Edit event"
              onPress={() => {
                calendar.editEvent(event)
                setFormOpen(true)
              }}
            >
              <IconPlaceholder
                lucide="PencilIcon"
                tabler="IconPencil"
                hugeicons="PencilEdit01Icon"
                phosphor="PencilSimpleIcon"
                remixicon="RiPencilLine"
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Duplicate event"
              onPress={() => {
                calendar.duplicateEvent(event)
                onClose?.()
              }}
            >
              <IconPlaceholder
                lucide="CopyIcon"
                tabler="IconCopy"
                hugeicons="Copy01Icon"
                phosphor="CopyIcon"
                remixicon="RiFileCopyLine"
              />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Delete event"
              onPress={() => {
                onClose?.()
                calendar.deleteEvent(event)
              }}
            >
              <IconPlaceholder
                lucide="Trash2Icon"
                tabler="IconTrash"
                hugeicons="Delete02Icon"
                phosphor="TrashIcon"
                remixicon="RiDeleteBinLine"
              />
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close"
          onPress={onClose}
        >
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
          />
        </Button>
      </div>
      <div className="cn-event-calendar-event-details-heading flex items-start">
        <span
          aria-hidden
          className="cn-event-calendar-event-details-swatch shrink-0"
        />
        <div className="flex min-w-0 flex-col">
          <h3 className="cn-event-calendar-event-details-title">
            {event.title || "(No title)"}
          </h3>
          <p className="cn-event-calendar-event-details-time">
            {`${formatEventDay(times.start, formatOptions)} · ${formatEventTimeRange(times, formatOptions)}`}
          </p>
          {recurrence ? (
            <p className="cn-event-calendar-event-details-time">{recurrence}</p>
          ) : null}
        </div>
      </div>
      {event.location ? (
        <DetailsRow
          icon={
            <IconPlaceholder
              lucide="MapPinIcon"
              tabler="IconMapPin"
              hugeicons="Location01Icon"
              phosphor="MapPinIcon"
              remixicon="RiMapPinLine"
            />
          }
        >
          {event.location}
        </DetailsRow>
      ) : null}
      {event.description ? (
        <DetailsRow
          icon={
            <IconPlaceholder
              lucide="AlignLeftIcon"
              tabler="IconAlignLeft"
              hugeicons="TextAlignLeftIcon"
              phosphor="TextAlignLeftIcon"
              remixicon="RiAlignLeft"
            />
          }
        >
          <span className="whitespace-pre-line">{event.description}</span>
        </DetailsRow>
      ) : null}
      {source ? (
        <DetailsRow
          icon={
            <IconPlaceholder
              lucide="CalendarIcon"
              tabler="IconCalendar"
              hugeicons="CalendarIcon"
              phosphor="CalendarIcon"
              remixicon="RiCalendarLine"
            />
          }
        >
          {source.name}
        </DetailsRow>
      ) : null}
    </div>
  )
}

function DetailsRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="cn-event-calendar-event-details-row flex items-start">
      <span
        aria-hidden
        className="cn-event-calendar-event-details-icon flex shrink-0 items-center justify-center"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  )
}

function describeEventRecurrence(text: string) {
  try {
    return describeRecurrence(parseRecurrence(text).rule)
  } catch (error) {
    // A rule from another app, outside the subset the model reads, still
    // repeats: the details say so instead of failing to open.
    if (error instanceof EventCalendarRecurrenceError) return "Repeats"
    throw error
  }
}

const toPickerDate = (parts: { year: number; month: number; day: number }) =>
  new Date(parts.year, parts.month - 1, parts.day)

const fromPickerDate = (date: Date) => ({
  year: date.getFullYear(),
  month: date.getMonth() + 1,
  day: date.getDate(),
})

function EventCalendarEventForm<TData>({
  event,
  isNew = false,
  isQuick = false,
  onCancel,
  onMoreOptions,
  className,
}: {
  event: CalendarEvent<TData>
  isNew?: boolean
  /** The short form a new event starts in: title, time and calendar. */
  isQuick?: boolean
  onCancel?: () => void
  /** Opens the full form with what the short one holds so far. */
  onMoreOptions?: (draft: CalendarEvent<TData>) => void
  className?: string
}) {
  const { calendar, renderDraftNotice } = useEventCalendarUi<TData>(
    "EventCalendarEventForm"
  )
  const { timeZone, locale, settings } = calendar
  const id = React.useId()
  const times = getEventTimes(event, timeZone)
  const [title, setTitle] = React.useState(event.title)
  const [allDay, setAllDay] = React.useState(times.allDay)
  const [start, setStart] = React.useState(() =>
    getWallParts(times.start, timeZone)
  )
  const [end, setEnd] = React.useState(() =>
    getWallParts(times.allDay ? new Date(+times.end - 1) : times.end, timeZone)
  )
  const [recurrence, setRecurrence] = React.useState(event.recurrence ?? "none")
  const [calendarId, setCalendarId] = React.useState(event.calendarId ?? "")
  const [location, setLocation] = React.useState(event.location ?? "")
  const [description, setDescription] = React.useState(event.description ?? "")

  const startDate = fromWallParts(
    allDay ? { ...start, time: "00:00" } : start,
    timeZone
  )
  const endDate = allDay
    ? fromWallParts(
        { ...fromPickerDate(addPickerDay(toPickerDate(end))), time: "00:00" },
        timeZone
      )
    : fromWallParts(end, timeZone)
  const isValid = +endDate > +startDate
  const repeatItems = React.useMemo(() => {
    const presets = getRecurrencePresets(startDate, { locale, timeZone })
    const items = presets.map((preset) => ({
      value: preset.value ?? "none",
      label: preset.label,
    }))
    if (
      recurrence !== "none" &&
      !items.some((item) => item.value === recurrence)
    ) {
      items.push({
        value: recurrence,
        label: describeEventRecurrence(recurrence),
      })
    }
    return items
  }, [locale, recurrence, startDate, timeZone])
  const calendarItems = calendar.calendars
    .filter((item) => item.editable !== false)
    .map((item) => ({ value: item.id, label: item.name }))

  const save = (submit: React.FormEvent) => {
    submit.preventDefault()
    if (!isValid) return
    const timed = setEventTimes(
      event,
      { start: startDate, end: endDate, allDay },
      timeZone
    )
    const {
      recurrence: _recurrence,
      calendarId: _calendarId,
      location: _location,
      description: _description,
      ...rest
    } = timed
    const next: CalendarEvent<TData> = {
      ...rest,
      title: title.trim(),
      ...(recurrence === "none" ? {} : { recurrence }),
      ...(calendarId ? { calendarId } : {}),
      ...(location.trim() ? { location: location.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    }
    calendar.closePanel()
    onCancel?.()
    if (isNew) calendar.createEvent(next)
    else calendar.updateEvent(event, next, { reason: "edit" })
  }

  const formatOptions = { locale, timeZone, hourCycle: settings.hourCycle }

  return (
    <form
      data-slot="event-calendar-event-form"
      data-quick={isQuick || undefined}
      className={cn("cn-event-calendar-event-form flex flex-col", className)}
      onSubmit={save}
    >
      <FieldGroup className="cn-event-calendar-event-form-fields">
        <Field>
          <FieldLabel
            htmlFor={`${id}-title`}
            className={cn(isQuick && "sr-only")}
          >
            Title
          </FieldLabel>
          <Input
            id={`${id}-title`}
            autoFocus
            placeholder="Add title"
            value={title}
            onChange={(input) => setTitle(input.target.value)}
            className="cn-event-calendar-event-form-title"
          />
        </Field>
        {isQuick ? (
          <>
            <p className="cn-event-calendar-event-form-summary">
              {`${formatEventDay(startDate, formatOptions)} · ${formatEventTimeRange(
                { start: startDate, end: endDate, allDay },
                formatOptions
              )}`}
            </p>
            {renderDraftNotice?.(event)}
          </>
        ) : (
          <>
            <Field orientation="horizontal">
              <FieldLabel htmlFor={`${id}-all-day`}>All day</FieldLabel>
              <Switch
                id={`${id}-all-day`}
                isSelected={allDay}
                onChange={setAllDay}
              />
            </Field>
            <div className="cn-event-calendar-event-form-times grid">
              <Field>
                <FieldLabel htmlFor={`${id}-start-date`}>Starts</FieldLabel>
                <DatePicker
                  id={`${id}-start-date`}
                  value={toPickerDate(start)}
                  onValueChange={(value) =>
                    value && setStart({ ...start, ...fromPickerDate(value) })
                  }
                />
              </Field>
              {allDay ? null : (
                <Field>
                  <FieldLabel htmlFor={`${id}-start-time`}>
                    Start time
                  </FieldLabel>
                  <TimeInput
                    id={`${id}-start-time`}
                    hourCycle={settings.hourCycle === "h23" ? 24 : 12}
                    step={settings.slotMinutes}
                    value={start.time}
                    onValueChange={(value) =>
                      value && setStart({ ...start, time: value })
                    }
                  />
                </Field>
              )}
              <Field>
                <FieldLabel htmlFor={`${id}-end-date`}>Ends</FieldLabel>
                <DatePicker
                  id={`${id}-end-date`}
                  value={toPickerDate(end)}
                  aria-invalid={!isValid || undefined}
                  onValueChange={(value) =>
                    value && setEnd({ ...end, ...fromPickerDate(value) })
                  }
                />
              </Field>
              {allDay ? null : (
                <Field data-invalid={!isValid || undefined}>
                  <FieldLabel htmlFor={`${id}-end-time`}>End time</FieldLabel>
                  <TimeInput
                    id={`${id}-end-time`}
                    hourCycle={settings.hourCycle === "h23" ? 24 : 12}
                    step={settings.slotMinutes}
                    value={end.time}
                    aria-invalid={!isValid || undefined}
                    onValueChange={(value) =>
                      value && setEnd({ ...end, time: value })
                    }
                  />
                </Field>
              )}
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-repeat`}>Repeat</FieldLabel>
              <Select
                aria-label="Repeat"
                selectedKey={recurrence}
                onSelectionChange={(key) => {
                  if (typeof key === "string") setRecurrence(key)
                }}
              >
                <SelectTrigger id={`${id}-repeat`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {repeatItems.map((item) => (
                    <SelectItem key={item.value} id={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </>
        )}
        {calendarItems.length > 1 ? (
          <Field>
            <FieldLabel
              htmlFor={`${id}-calendar`}
              className={cn(isQuick && "sr-only")}
            >
              Calendar
            </FieldLabel>
            <Select
              aria-label="Calendar"
              selectedKey={calendarId}
              onSelectionChange={(key) => {
                if (typeof key === "string") setCalendarId(key)
              }}
            >
              <SelectTrigger id={`${id}-calendar`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {calendarItems.map((item) => (
                  <SelectItem key={item.value} id={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        ) : null}
        {isQuick ? null : (
          <>
            <Field>
              <FieldLabel htmlFor={`${id}-location`}>Location</FieldLabel>
              <Input
                id={`${id}-location`}
                placeholder="Add location"
                value={location}
                onChange={(input) => setLocation(input.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
              <Textarea
                id={`${id}-description`}
                placeholder="Add description"
                value={description}
                onChange={(input) => setDescription(input.target.value)}
              />
            </Field>
          </>
        )}
      </FieldGroup>
      <div className="cn-event-calendar-event-form-actions flex items-center justify-end">
        {isQuick && onMoreOptions ? (
          <Button
            type="button"
            variant="ghost"
            onPress={() => onMoreOptions({ ...event, title })}
          >
            More options
          </Button>
        ) : (
          <Button type="button" variant="ghost" onPress={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isDisabled={!isValid}>
          Save
        </Button>
      </div>
    </form>
  )
}

function addPickerDay(date: Date) {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return next
}

// --- Dialogs -----------------------------------------------------------------

const RECURRENCE_SCOPES: RecurrenceScope[] = ["this", "following", "all"]

const SCOPE_LABELS: Record<RecurrenceScope, string> = {
  this: "This event",
  following: "This and following events",
  all: "All events",
}

function EventCalendarScopeDialog() {
  const { calendar } = useEventCalendarUi("EventCalendarScopeDialog")
  const prompt = calendar.scopePrompt
  const [scope, setScope] = React.useState<RecurrenceScope>("this")
  const id = React.useId()
  return (
    <Dialog
      data-slot="event-calendar-scope-dialog"
      isOpen={prompt !== undefined}
      onOpenChange={(open) => {
        if (!open) calendar.resolveScope(null)
      }}
      className="cn-event-calendar-scope-dialog"
      showCloseButton={false}
    >
      <DialogHeader>
        <DialogTitle>
          {prompt?.kind === "delete"
            ? "Delete recurring event"
            : "Edit recurring event"}
        </DialogTitle>
        <DialogDescription>Which events should change?</DialogDescription>
      </DialogHeader>
      <RadioGroup
        aria-label="Which events should change?"
        value={scope}
        onChange={(value) => {
          if (value === "this" || value === "following" || value === "all")
            setScope(value)
        }}
      >
        {RECURRENCE_SCOPES.map((item) => (
          <Field key={item} orientation="horizontal">
            <RadioGroupItem id={`${id}-${item}`} value={item} />
            <FieldLabel htmlFor={`${id}-${item}`}>
              {SCOPE_LABELS[item]}
            </FieldLabel>
          </Field>
        ))}
      </RadioGroup>
      <DialogFooter>
        <Button variant="ghost" onPress={() => calendar.resolveScope(null)}>
          Cancel
        </Button>
        <Button
          variant={prompt?.kind === "delete" ? "destructive" : "default"}
          onPress={() => calendar.resolveScope(scope)}
        >
          {prompt?.kind === "delete" ? "Delete" : "Save"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function EventCalendarShortcutsDialog() {
  const { isHelpOpen, setHelpOpen } = useEventCalendarUi(
    "EventCalendarShortcutsDialog"
  )
  return (
    <Dialog
      data-slot="event-calendar-shortcuts"
      isOpen={isHelpOpen}
      onOpenChange={setHelpOpen}
      className="cn-event-calendar-shortcuts"
    >
      <DialogHeader>
        <DialogTitle>Keyboard shortcuts</DialogTitle>
        <DialogDescription>
          They work while the calendar has focus.
        </DialogDescription>
      </DialogHeader>
      <dl className="cn-event-calendar-shortcuts-list grid">
        {EVENT_CALENDAR_SHORTCUTS.map((shortcut) => (
          <React.Fragment key={shortcut.label}>
            <dt className="cn-event-calendar-shortcuts-label">
              {shortcut.label}
            </dt>
            <dd className="flex justify-end">
              <KbdGroup>
                {shortcut.keys.map((key) => (
                  <Kbd key={key}>{key}</Kbd>
                ))}
              </KbdGroup>
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </Dialog>
  )
}

// --- Beside the grid ---------------------------------------------------------

// The days in view, marked as a band behind the mini month's days.
const inViewClass = { className: cn("cn-event-calendar-mini-month-in-view") }
  .className
const inViewStartClass = {
  className: cn("cn-event-calendar-mini-month-in-view-start"),
}.className
const inViewEndClass = {
  className: cn("cn-event-calendar-mini-month-in-view-end"),
}.className

function EventCalendarMiniMonth<TData>({
  calendar: calendarProp,
  onDateSelect,
  className,
}: PartProps<TData> & {
  /** After the calendar moves to a picked day, as a popover closes on it. */
  onDateSelect?: (date: Date) => void
  className?: string
}) {
  const calendar = useCalendarPart("EventCalendarMiniMonth", calendarProp)
  const { date, view, range, timeZone } = calendar
  const { weekStartsOn } = calendar.settings
  // React Aria's calendar takes days, not instants: the day it shows is the
  // date's day in the calendar's zone, and a picked day starts there.
  const selected = toCalendarDay(date, timeZone)
  const [month, setMonth] = React.useState(selected)
  // The shown month follows the calendar when it moves elsewhere.
  const [shownDate, setShownDate] = React.useState(date)
  if (shownDate !== date) {
    setShownDate(date)
    setMonth(selected)
  }
  const visible = getVisibleDays(view, date, range, timeZone)
  const toDate = (day: { year: number; month: number; day: number }) =>
    fromWallParts(
      { year: day.year, month: day.month, day: day.day, time: "00:00" },
      timeZone
    )
  return (
    <Calendar
      data-slot="event-calendar-mini-month"
      value={selected}
      onChange={(day) => {
        const picked = toDate(day)
        calendar.goTo(picked)
        onDateSelect?.(picked)
      }}
      focusedValue={month}
      onFocusChange={setMonth}
      firstDayOfWeek={FIRST_DAYS[weekStartsOn]}
      renderCell={({ date: day, defaultChildren }) => {
        const band = getDayBand(toDate(day), visible, weekStartsOn, timeZone)
        return (
          <>
            {band.isInView ? (
              <span
                aria-hidden
                className={cn(
                  inViewClass,
                  band.isStart && inViewStartClass,
                  band.isEnd && inViewEndClass,
                  "absolute inset-0 -z-10"
                )}
              />
            ) : null}
            {defaultChildren}
          </>
        )
      }}
      className={cn("cn-event-calendar-mini-month", className)}
    />
  )
}

const FIRST_DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const

function toCalendarDay(date: Date, timeZone: string | undefined) {
  const { year, month, day } = getWallParts(date, timeZone)
  return new CalendarDate(year, month, day)
}

function EventCalendarSources<TData>({
  calendar: calendarProp,
  className,
  ...props
}: PartProps<TData> & React.ComponentProps<"div">) {
  const calendar = useCalendarPart("EventCalendarSources", calendarProp)
  const id = React.useId()
  if (calendar.calendars.length === 0) return null
  return (
    <div
      data-slot="event-calendar-sources"
      role="group"
      aria-label="Calendars"
      className={cn("cn-event-calendar-sources flex flex-col", className)}
      {...props}
    >
      {calendar.calendars.map((source) => (
        <Field
          key={source.id}
          orientation="horizontal"
          style={getChipColorStyle(source.color)}
          className="cn-event-calendar-source"
        >
          <Checkbox
            id={`${id}-${source.id}`}
            isSelected={source.visible !== false}
            onChange={() => calendar.toggleCalendar(source.id)}
            className="cn-event-calendar-source-checkbox"
          />
          <FieldLabel
            htmlFor={`${id}-${source.id}`}
            className="min-w-0 truncate"
          >
            {source.name}
          </FieldLabel>
        </Field>
      ))}
    </div>
  )
}

export {
  EventCalendar,
  EventCalendarAgenda,
  EventCalendarContent,
  EventCalendarCreateButton,
  EventCalendarEmpty,
  EventCalendarEvent,
  EventCalendarEventDetails,
  EventCalendarEventForm,
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
  type EventCalendarBusinessHours,
  type EventCalendarChangeEvent,
  type EventCalendarColor,
  type EventCalendarController,
  type EventCalendarLoader,
  type EventCalendarLoadRequest,
  type EventCalendarProps,
  type EventCalendarRenderEventProps,
  type EventCalendarView,
}
