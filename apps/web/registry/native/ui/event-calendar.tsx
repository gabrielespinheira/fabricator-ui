// The Event Calendar: a Google Calendar-class scheduler, on
// @super-calendar/native behind its own adapter (event-calendar-engine).
// `<EventCalendar events={events} onEventChange={(change) =>
// setEvents(change.apply)} />` draws the header, the grid and every panel, and
// turns on creating, moving, resizing, editing, deleting and undo. The
// controller, the model and the props are the website's: compose the parts
// with `useEventCalendar` to place them yourself.
import * as React from "react"
import {
  AlignLeftIcon,
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  MapPinIcon,
  PencilIcon,
  PlusIcon,
  SettingsIcon,
  Trash2Icon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import {
  AccessibilityInfo,
  ScrollView,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from "react-native"

import {
  useEventCalendar,
  type EventCalendarBusinessHours,
  type EventCalendarChangeEvent,
  type EventCalendarController,
  type UseEventCalendarOptions,
} from "@/registry/fabricator/shared/hooks/use-event-calendar"
import {
  type EventCalendarLoader,
  type EventCalendarLoadRequest,
} from "@/registry/fabricator/shared/lib/event-calendar-loader"
import {
  formatEventDay,
  formatEventTimeRange,
  fromWallParts,
  getDayBand,
  getEventTimes,
  getViewLabel,
  getVisibleDays,
  getWallParts,
  isEventCalendarView,
  resolveEventColor,
  setEventTimes,
  type CalendarEvent,
  type CalendarSource,
  type EventCalendarColor,
  type EventCalendarView,
  type EventCalendarWeekday,
  type RecurrenceScope,
  type WallParts,
} from "@/registry/fabricator/shared/lib/event-calendar-model"
import {
  describeRecurrence,
  EventCalendarRecurrenceError,
  getRecurrencePresets,
  parseRecurrence,
} from "@/registry/fabricator/shared/lib/event-calendar-recurrence"
import {
  getCreateDraft,
  getNextSlotRange,
} from "@/registry/native/lib/event-calendar-native-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { Button } from "@/registry/native/ui/button"
import { Calendar } from "@/registry/native/ui/calendar"
import { Checkbox } from "@/registry/native/ui/checkbox"
import { DatePicker } from "@/registry/native/ui/date-picker"
import { DensityProvider, type Density } from "@/registry/native/ui/density"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/registry/native/ui/dialog"
import { Drawer, DrawerContent } from "@/registry/native/ui/drawer"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/registry/native/ui/empty"
import { EventCalendarAgenda } from "@/registry/native/ui/event-calendar-agenda"
import {
  EventCalendarEngine,
  type EventCalendarAnchor,
  type EventCalendarRenderEventProps,
} from "@/registry/native/ui/event-calendar-engine"
import {
  ChipPaletteContext,
  ChipPaletteProvider,
  EventCalendarEvent,
} from "@/registry/native/ui/event-calendar-event"
import { Field, FieldGroup, FieldLabel } from "@/registry/native/ui/field"
import { Input } from "@/registry/native/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/native/ui/popover"
import { RadioGroup, RadioGroupItem } from "@/registry/native/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/registry/native/ui/select"
import { Switch } from "@/registry/native/ui/switch"
import { Text, TextStyle } from "@/registry/native/ui/text"
import { Textarea } from "@/registry/native/ui/textarea"
import { TimeInput } from "@/registry/native/ui/time-input"
import { toast } from "@/registry/native/ui/toast"

// --- Context -----------------------------------------------------------------

type EventCalendarUi<TData> = {
  calendar: EventCalendarController<TData>
  variant: "card" | "flat"
  /** Where the open panel points, in window points; the middle when unset. */
  anchor: EventCalendarAnchor | null
  setAnchor: (anchor: EventCalendarAnchor | null) => void
  /** The full form for the open draft or event. */
  isFormOpen: boolean
  setFormOpen: (open: boolean) => void
  renderEvent?: (props: EventCalendarRenderEventProps<TData>) => React.ReactNode
}

const EventCalendarContext =
  React.createContext<EventCalendarUi<unknown> | null>(null)

class EventCalendarContextError extends Error {
  constructor(part: string) {
    super(`${part} needs a \`calendar\` prop or an <EventCalendar> around it.`)
    this.name = "EventCalendarContextError"
  }
}

// One calendar's parts share its event type, which a context can't carry: the
// root puts its controller in, and its own parts read the same type back.
function useEventCalendarUi<TData>(part: string) {
  const context = React.use(EventCalendarContext)
  if (!context) throw new EventCalendarContextError(part)
  return context as EventCalendarUi<TData>
}

/** The controller from a `calendar` prop, or from the nearest calendar. */
function useCalendarPart<TData>(
  part: string,
  calendar: EventCalendarController<TData> | undefined
) {
  const context = React.use(EventCalendarContext)
  if (calendar) return calendar
  if (!context) throw new EventCalendarContextError(part)
  return useEventCalendarUi<TData>(part).calendar
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
  /** Keyboard shortcuts; a hardware keyboard reaches no view on native yet. */
  shortcuts?: boolean
  className?: string
  children?: React.ReactNode
}

type EventCalendarProps<TData = unknown> = UseEventCalendarOptions<TData> &
  EventCalendarOwnProps<TData> &
  Omit<
    React.ComponentProps<typeof View>,
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
  ...rest
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
  return <EventCalendarFrame {...rest} calendar={calendar} />
}

// Below this width the calendar takes a phone's layout: three columns, the
// N-day view, and panels that rise from the bottom.
const COMPACT_WIDTH = 640

function EventCalendarFrame<TData>({
  calendar,
  variant = "card",
  size = "default",
  renderEvent,
  shortcuts: _shortcuts,
  className,
  children,
  onLayout,
  ...props
}: EventCalendarOwnProps<TData> &
  Omit<React.ComponentProps<typeof View>, "children"> & {
    calendar: EventCalendarController<TData>
  }) {
  const [anchor, setAnchor] = React.useState<EventCalendarAnchor | null>(null)
  const [isFormOpen, setFormOpen] = React.useState(false)
  const { setCompact, notice } = calendar

  // Every change reports itself in a toast, with Undo, or Retry if it failed,
  // and to VoiceOver, which can't see the toast arrive.
  React.useEffect(() => {
    if (!notice) return
    toast.add({
      title: notice.message,
      type: notice.status === "failed" ? "error" : undefined,
      actionProps: notice.action
        ? { children: notice.action.label, onPress: notice.action.run }
        : undefined,
    })
    AccessibilityInfo.announceForAccessibility(notice.message)
  }, [notice])

  const ui = React.useMemo<EventCalendarUi<TData>>(
    () => ({
      calendar,
      variant,
      anchor,
      setAnchor,
      isFormOpen,
      setFormOpen,
      renderEvent,
    }),
    [anchor, calendar, isFormOpen, renderEvent, variant]
  )

  const frame = (
    <EventCalendarContext value={ui as EventCalendarUi<unknown>}>
      <ChipPaletteProvider>
        <View
          data-slot="event-calendar"
          data-variant={variant}
          data-view={calendar.view}
          data-compact={calendar.isCompact}
          className={cn("cn-event-calendar flex-col", className)}
          onLayout={(event: LayoutChangeEvent) => {
            setCompact(event.nativeEvent.layout.width < COMPACT_WIDTH)
            onLayout?.(event)
          }}
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
        </View>
      </ChipPaletteProvider>
    </EventCalendarContext>
  )
  if (size === "default") return frame
  return <DensityProvider density={SIZE_DENSITY[size]}>{frame}</DensityProvider>
}

/** A draft at the next slot of the shown range, as Create does. */
function startCreateAtNextSlot<TData>(
  calendar: EventCalendarController<TData>
) {
  const { start, end } = getNextSlotRange(
    new Date(),
    calendar.range,
    calendar.settings
  )
  calendar.startCreate(
    getCreateDraft<TData>({
      id: calendar.createId(),
      start,
      end,
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
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="event-calendar-header"
      className={cn(
        "cn-event-calendar-header flex-row items-center",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          <View className="cn-event-calendar-header-start min-w-0 flex-row items-center">
            <EventCalendarTitle />
            <EventCalendarToday />
            <EventCalendarNavigation />
          </View>
          <View className="cn-event-calendar-header-end flex-row items-center">
            <EventCalendarViewSelect />
            <EventCalendarSettings />
            <EventCalendarCreateButton />
          </View>
        </>
      )}
    </View>
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
}: PartProps<TData> & React.ComponentProps<typeof View>) {
  const calendar = useCalendarPart("EventCalendarNavigation", calendarProp)
  const label = getViewLabel(calendar.view, calendar.days).toLowerCase()
  return (
    <View
      data-slot="event-calendar-navigation"
      className={cn(
        "cn-event-calendar-navigation flex-row items-center",
        className
      )}
      {...props}
    >
      <Button
        data-sound="page"
        variant="ghost"
        size="icon"
        accessibilityLabel={`Previous ${label}`}
        onPress={() => calendar.previous()}
      >
        <ChevronLeftIcon />
      </Button>
      <Button
        data-sound="page"
        variant="ghost"
        size="icon"
        accessibilityLabel={`Next ${label}`}
        onPress={() => calendar.next()}
      >
        <ChevronRightIcon />
      </Button>
    </View>
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
}: PartProps<TData> & React.ComponentProps<typeof View>) {
  const calendar = useCalendarPart("EventCalendarTitle", calendarProp)
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <View
        data-slot="event-calendar-title"
        role="heading"
        accessibilityLiveRegion="polite"
        className={cn("cn-event-calendar-title min-w-0 shrink", className)}
        {...props}
      >
        <PopoverTrigger
          render={
            <Button
              variant="outline"
              data-slot="event-calendar-title-trigger"
              accessibilityHint="Opens a calendar to choose a date"
              className="cn-event-calendar-title-trigger"
            />
          }
        >
          <Text
            numberOfLines={1}
            className="cn-event-calendar-title-text min-w-0 shrink"
          >
            {calendar.title}
          </Text>
          <View data-slot="event-calendar-title-icon" className="shrink-0">
            <TextStyle className="cn-event-calendar-title-icon">
              <ChevronDownIcon />
            </TextStyle>
          </View>
        </PopoverTrigger>
      </View>
      <PopoverContent
        data-slot="event-calendar-date-picker"
        align="start"
        className="cn-event-calendar-date-picker"
      >
        <EventCalendarMiniMonth
          calendar={calendar}
          onDateSelect={() => setOpen(false)}
        />
      </PopoverContent>
    </Popover>
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
    <Select<EventCalendarView>
      items={items}
      value={calendar.view}
      onValueChange={(value) => {
        if (isEventCalendarView(value)) calendar.setView(value)
      }}
    >
      <SelectTrigger
        data-slot="event-calendar-view-select"
        accessibilityLabel="View"
        className={cn("cn-event-calendar-view-select", className)}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value} value={item.value}>
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
  const context = React.use(EventCalendarContext)
  if (!calendar.isEditable) return null
  return (
    <Button
      data-slot="event-calendar-create"
      className={cn("cn-event-calendar-create", className)}
      onPress={() => {
        context?.setAnchor(null)
        startCreateAtNextSlot(calendar)
      }}
      {...props}
    >
      {children ?? (
        <>
          <PlusIcon />
          <Text>Create</Text>
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

const WEEKDAYS: Record<string, EventCalendarWeekday> = {
  "0": 0,
  "1": 1,
  "6": 6,
}

function EventCalendarSettings<TData>({
  calendar: calendarProp,
  className,
}: PartProps<TData> & { className?: string }) {
  const calendar = useCalendarPart("EventCalendarSettings", calendarProp)
  const { settings, setSettings } = calendar
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            accessibilityLabel="Calendar settings"
            className={cn("cn-event-calendar-settings-trigger", className)}
          />
        }
      >
        <SettingsIcon />
      </PopoverTrigger>
      <PopoverContent
        data-slot="event-calendar-settings"
        align="end"
        className="cn-event-calendar-settings"
      >
        <FieldGroup className="cn-event-calendar-settings-group">
          <Field orientation="horizontal">
            <FieldLabel>Show weekends</FieldLabel>
            <Switch
              accessibilityLabel="Show weekends"
              checked={settings.showWeekends}
              onCheckedChange={(checked) =>
                setSettings({ showWeekends: checked })
              }
            />
          </Field>
          <Field orientation="horizontal">
            <FieldLabel>Show week numbers</FieldLabel>
            <Switch
              accessibilityLabel="Show week numbers"
              checked={settings.showWeekNumbers}
              onCheckedChange={(checked) =>
                setSettings({ showWeekNumbers: checked })
              }
            />
          </Field>
          <SettingsSelect
            label="Week starts on"
            items={WEEKDAY_ITEMS}
            value={String(settings.weekStartsOn)}
            onValueChange={(value) => {
              const weekday = WEEKDAYS[value]
              if (weekday !== undefined) setSettings({ weekStartsOn: weekday })
            }}
          />
          <SettingsSelect
            label="Time format"
            items={HOUR_CYCLE_ITEMS}
            value={settings.hourCycle}
            onValueChange={(value) =>
              setSettings({ hourCycle: value === "h23" ? "h23" : "h12" })
            }
          />
          <SettingsSelect
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
      </PopoverContent>
    </Popover>
  )
}

function SettingsSelect({
  label,
  items,
  value,
  onValueChange,
}: {
  label: string
  items: { value: string; label: string }[]
  value: string
  onValueChange: (value: string) => void
}) {
  return (
    <Field orientation="horizontal">
      <FieldLabel>{label}</FieldLabel>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onValueChange(next)
        }}
      >
        <SelectTrigger
          size="sm"
          accessibilityLabel={label}
          className="cn-event-calendar-settings-select"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
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
}: React.ComponentProps<typeof View>) {
  const ui = useEventCalendarUi("EventCalendarContent")
  const { calendar, variant } = ui
  const draft =
    calendar.panel?.kind === "create" ? calendar.panel.event : undefined
  const openFromGrid = (anchor: EventCalendarAnchor | null) =>
    ui.setAnchor(anchor)
  return (
    <View
      data-slot="event-calendar-content"
      data-variant={variant}
      data-loading={calendar.isLoading}
      className={cn(
        "cn-event-calendar-content relative min-h-0 flex-1 flex-col",
        className
      )}
      {...props}
    >
      {calendar.isLoading ? (
        <View
          aria-hidden
          className="cn-event-calendar-loading absolute inset-x-0 top-0 z-10"
        />
      ) : null}
      {calendar.hasLoadError ? (
        <View
          role="alert"
          className="cn-event-calendar-error flex-row items-center"
        >
          <Text className="cn-event-calendar-error-text min-w-0 flex-1">
            Some events couldn&apos;t load.
          </Text>
          <Button variant="outline" size="sm" onPress={() => calendar.retry()}>
            Try again
          </Button>
        </View>
      ) : null}
      {calendar.view === "agenda" ? (
        <EventCalendarAgenda
          calendar={calendar}
          className="min-h-0 flex-1"
          onEventSelect={(event, anchor) => {
            ui.setAnchor(anchor)
            calendar.openEvent(event)
          }}
          empty={<EventCalendarEmpty />}
        />
      ) : (
        <EventCalendarEngine
          calendar={calendar}
          renderEvent={ui.renderEvent}
          draft={draft}
          onAnchor={openFromGrid}
          onEventMenu={(event) => calendar.openEvent(event)}
        />
      )}
    </View>
  )
}

function EventCalendarEmpty({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  const context = React.use(EventCalendarContext)
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
            onPress={() => startCreateAtNextSlot(calendar)}
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
 * Portalled content leaves the React tree, so a panel gives its parts the
 * calendar again, read before the portal, and the chip colours with it.
 */
function PanelScope({
  value,
  children,
}: {
  value: EventCalendarUi<unknown> | null
  children?: React.ReactNode
}) {
  return (
    <EventCalendarContext value={value}>
      <ChipPaletteProvider>{children}</ChipPaletteProvider>
    </EventCalendarContext>
  )
}

type PanelPlace = { left: number; top: number; width: number; height: number }

/**
 * Details and quick create rise from the bottom in a drawer on a phone, and
 * point at their event in a popover on a tablet. One popover serves every
 * event: an invisible trigger moves over the event, measured as it opens
 * (the page may have scrolled since), and the popover opens from it. The
 * full form is a dialog.
 */
function EventCalendarPanels() {
  const scope = React.use(EventCalendarContext)
  const ui = useEventCalendarUi("EventCalendarPanels")
  const { calendar, anchor, isFormOpen, setFormOpen } = ui
  const panel = calendar.panel
  const isQuickOpen =
    panel !== undefined && panel.kind !== "edit" && !isFormOpen
  const isPopover = isQuickOpen && !calendar.isCompact
  const [place, setPlace] = React.useState<PanelPlace | null>(null)
  const rootRef = React.useRef<React.ComponentRef<typeof View>>(null)
  const close = () => {
    calendar.closePanel()
    setFormOpen(false)
  }

  React.useEffect(() => {
    if (!isPopover) {
      setPlace(null)
      return
    }
    rootRef.current?.measureInWindow((x, y, width, height) => {
      // With no event to point at (Create, a sweep), the calendar's middle.
      const target = anchor ?? {
        x: x + width / 2,
        y: y + height / 3,
        width: 1,
        height: 1,
      }
      setPlace({
        left: target.x - x,
        top: target.y - y,
        width: target.width,
        height: target.height,
      })
    })
  }, [anchor, isPopover, panel])

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
        onMoreOptions={() => setFormOpen(true)}
      />
    ) : null

  return (
    <>
      {calendar.isCompact ? (
        <Drawer open={isQuickOpen} onOpenChange={(open) => !open && close()}>
          <DrawerContent
            data-slot="event-calendar-drawer"
            accessibilityLabel={
              panel?.kind === "create" ? "New event" : "Event"
            }
          >
            <PanelScope value={scope}>
              <View className="cn-event-calendar-drawer-body">{quick}</View>
            </PanelScope>
          </DrawerContent>
        </Drawer>
      ) : (
        <View ref={rootRef} pointerEvents="none" className="absolute inset-0">
          <Popover
            open={isPopover && place !== null}
            onOpenChange={(open) => !open && close()}
          >
            <PopoverTrigger asChild>
              <View
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                className="absolute"
                style={place ?? undefined}
              />
            </PopoverTrigger>
            <PopoverContent
              data-slot="event-calendar-popover-panel"
              side="bottom"
              align="start"
              className="cn-event-calendar-panel"
            >
              <PanelScope value={scope}>{quick}</PanelScope>
            </PopoverContent>
          </Popover>
        </View>
      )}
      <Dialog
        open={(panel !== undefined && isFormOpen) || panel?.kind === "edit"}
        onOpenChange={(open) => !open && close()}
      >
        <DialogContent
          data-slot="event-calendar-form-dialog"
          className="cn-event-calendar-form-dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {panel?.kind === "create" ? "New event" : "Edit event"}
            </DialogTitle>
          </DialogHeader>
          {panel && panel.kind !== "details" ? (
            <PanelScope value={scope}>
              <EventCalendarEventForm
                key={panel.event.id}
                event={panel.event}
                isNew={panel.kind === "create"}
                onCancel={close}
              />
            </PanelScope>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function EventCalendarEventDetails<TData>({
  event,
  onClose,
  className,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  event: CalendarEvent<TData>
  onClose?: () => void
}) {
  const { calendar, setFormOpen } = useEventCalendarUi<TData>(
    "EventCalendarEventDetails"
  )
  const resolve = React.use(ChipPaletteContext)
  const feedback = useFeedback()
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
  const fill = resolve?.(resolveEventColor(event, calendar.calendars)).fill

  return (
    <View
      data-slot="event-calendar-event-details"
      className={cn("cn-event-calendar-event-details flex-col", className)}
      {...props}
    >
      <View className="cn-event-calendar-event-details-actions flex-row items-center justify-end">
        {canEdit ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              accessibilityLabel="Edit event"
              onPress={() => {
                calendar.editEvent(event)
                setFormOpen(true)
              }}
            >
              <PencilIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              accessibilityLabel="Duplicate event"
              onPress={() => {
                calendar.duplicateEvent(event)
                onClose?.()
              }}
            >
              <CopyIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              data-sound="thud"
              accessibilityLabel="Delete event"
              onPress={() => {
                onClose?.()
                calendar.deleteEvent(event)
              }}
            >
              <Trash2Icon />
            </Button>
          </>
        ) : null}
        <Button
          variant="ghost"
          size="icon-sm"
          accessibilityLabel="Close"
          onPress={() => {
            feedback("dismiss")
            onClose?.()
          }}
        >
          <XIcon />
        </Button>
      </View>
      <View className="cn-event-calendar-event-details-heading flex-row items-start">
        <View
          aria-hidden
          className="cn-event-calendar-event-details-swatch shrink-0"
          style={fill ? { backgroundColor: fill } : undefined}
        />
        <View className="min-w-0 flex-1 flex-col">
          <Text
            role="heading"
            className="cn-event-calendar-event-details-title"
          >
            {event.title || "(No title)"}
          </Text>
          <Text className="cn-event-calendar-event-details-time">
            {`${formatEventDay(times.start, formatOptions)} · ${formatEventTimeRange(times, formatOptions)}`}
          </Text>
          {recurrence ? (
            <Text className="cn-event-calendar-event-details-time">
              {recurrence}
            </Text>
          ) : null}
        </View>
      </View>
      {event.location ? (
        <DetailsRow icon={<MapPinIcon />}>{event.location}</DetailsRow>
      ) : null}
      {event.description ? (
        <DetailsRow icon={<AlignLeftIcon />}>{event.description}</DetailsRow>
      ) : null}
      {source ? (
        <DetailsRow icon={<CalendarIcon />}>{source.name}</DetailsRow>
      ) : null}
    </View>
  )
}

function DetailsRow({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: string
}) {
  return (
    <View className="cn-event-calendar-event-details-row flex-row items-start">
      <View
        aria-hidden
        className="cn-event-calendar-event-details-icon shrink-0 items-center justify-center"
      >
        {icon}
      </View>
      <Text className="cn-event-calendar-event-details-row-text min-w-0 flex-1">
        {children}
      </Text>
    </View>
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

function addPickerDay(date: Date) {
  const next = new Date(date)
  next.setDate(next.getDate() + 1)
  return next
}

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
  onMoreOptions?: () => void
  className?: string
}) {
  const { calendar } = useEventCalendarUi<TData>("EventCalendarEventForm")
  const { timeZone, locale, settings } = calendar
  const times = getEventTimes(event, timeZone)
  const [title, setTitle] = React.useState(event.title)
  const [allDay, setAllDay] = React.useState(times.allDay)
  const [start, setStart] = React.useState<WallParts>(() =>
    getWallParts(times.start, timeZone)
  )
  const [end, setEnd] = React.useState<WallParts>(() =>
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
    const items = getRecurrencePresets(startDate, { locale, timeZone }).map(
      (preset) => ({ value: preset.value ?? "none", label: preset.label })
    )
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

  const save = () => {
    if (!isValid) return
    const timed = setEventTimes(
      event,
      { start: startDate, end: endDate, allDay },
      timeZone
    )
    const next: CalendarEvent<TData> = { ...timed, title: title.trim() }
    const fields = {
      recurrence: recurrence === "none" ? undefined : recurrence,
      calendarId: calendarId || undefined,
      location: location.trim() || undefined,
      description: description.trim() || undefined,
    }
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) Reflect.deleteProperty(next, key)
      else Object.assign(next, { [key]: value })
    }
    calendar.closePanel()
    onCancel?.()
    if (isNew) calendar.createEvent(next)
    else calendar.updateEvent(event, next, { reason: "edit" })
  }

  const formatOptions = { locale, timeZone, hourCycle: settings.hourCycle }
  // The full form is taller than a phone with its keyboard up: its fields
  // scroll, its actions stay.
  const { height: windowHeight } = useWindowDimensions()
  const hourCycle = settings.hourCycle === "h23" ? 24 : 12

  return (
    <View
      data-slot="event-calendar-event-form"
      data-quick={isQuick}
      className={cn("cn-event-calendar-event-form flex-col", className)}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!isQuick}
        style={isQuick ? undefined : { maxHeight: windowHeight * 0.4 }}
      >
        <FieldGroup className="cn-event-calendar-event-form-fields">
          <Field>
            {isQuick ? null : <FieldLabel>Title</FieldLabel>}
            <Input
              autoFocus
              placeholder="Add title"
              accessibilityLabel="Title"
              value={title}
              returnKeyType="done"
              onChangeText={setTitle}
              onSubmitEditing={save}
              className="cn-event-calendar-event-form-title"
            />
          </Field>
          {isQuick ? (
            <Text className="cn-event-calendar-event-form-summary">
              {`${formatEventDay(startDate, formatOptions)} · ${formatEventTimeRange(
                { start: startDate, end: endDate, allDay },
                formatOptions
              )}`}
            </Text>
          ) : (
            <>
              <Field orientation="horizontal">
                <FieldLabel>All day</FieldLabel>
                <Switch
                  accessibilityLabel="All day"
                  checked={allDay}
                  onCheckedChange={setAllDay}
                />
              </Field>
              <View className="cn-event-calendar-event-form-times flex-row flex-wrap">
                <Field className="cn-event-calendar-event-form-time">
                  <FieldLabel>Starts</FieldLabel>
                  <DatePicker
                    accessibilityLabel="Start date"
                    value={toPickerDate(start)}
                    onValueChange={(value) =>
                      value && setStart({ ...start, ...fromPickerDate(value) })
                    }
                  />
                </Field>
                {allDay ? null : (
                  <Field className="cn-event-calendar-event-form-time">
                    <FieldLabel>Start time</FieldLabel>
                    <TimeInput
                      accessibilityLabel="Start time"
                      hourCycle={hourCycle}
                      step={settings.slotMinutes}
                      value={start.time}
                      onValueChange={(value) =>
                        value && setStart({ ...start, time: value })
                      }
                    />
                  </Field>
                )}
                <Field className="cn-event-calendar-event-form-time">
                  <FieldLabel>Ends</FieldLabel>
                  <DatePicker
                    accessibilityLabel="End date"
                    value={toPickerDate(end)}
                    aria-invalid={!isValid}
                    onValueChange={(value) =>
                      value && setEnd({ ...end, ...fromPickerDate(value) })
                    }
                  />
                </Field>
                {allDay ? null : (
                  <Field
                    data-invalid={!isValid}
                    className="cn-event-calendar-event-form-time"
                  >
                    <FieldLabel>End time</FieldLabel>
                    <TimeInput
                      accessibilityLabel="End time"
                      hourCycle={hourCycle}
                      step={settings.slotMinutes}
                      value={end.time}
                      aria-invalid={!isValid}
                      onValueChange={(value) =>
                        value && setEnd({ ...end, time: value })
                      }
                    />
                  </Field>
                )}
              </View>
              <Field>
                <FieldLabel>Repeat</FieldLabel>
                <Select
                  items={repeatItems}
                  value={recurrence}
                  onValueChange={(value) => {
                    if (typeof value === "string") setRecurrence(value)
                  }}
                >
                  <SelectTrigger accessibilityLabel="Repeat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {repeatItems.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
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
              {isQuick ? null : <FieldLabel>Calendar</FieldLabel>}
              <Select
                items={calendarItems}
                value={calendarId}
                onValueChange={(value) => {
                  if (typeof value === "string") setCalendarId(value)
                }}
              >
                <SelectTrigger accessibilityLabel="Calendar">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {calendarItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
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
                <FieldLabel>Location</FieldLabel>
                <Input
                  placeholder="Add location"
                  accessibilityLabel="Location"
                  value={location}
                  onChangeText={setLocation}
                />
              </Field>
              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  placeholder="Add description"
                  accessibilityLabel="Description"
                  value={description}
                  onChangeText={setDescription}
                />
              </Field>
            </>
          )}
        </FieldGroup>
      </ScrollView>
      <View className="cn-event-calendar-event-form-actions flex-row items-center justify-end">
        {isQuick && onMoreOptions ? (
          <Button variant="ghost" onPress={onMoreOptions}>
            More options
          </Button>
        ) : (
          <Button variant="ghost" onPress={onCancel}>
            Cancel
          </Button>
        )}
        <Button disabled={!isValid} onPress={save}>
          Save
        </Button>
      </View>
    </View>
  )
}

// --- Dialogs -----------------------------------------------------------------

const SCOPE_LABELS: Record<RecurrenceScope, string> = {
  this: "This event",
  following: "This and following events",
  all: "All events",
}

const SCOPES: RecurrenceScope[] = ["this", "following", "all"]

function isRecurrenceScope(value: string): value is RecurrenceScope {
  return SCOPES.some((scope) => scope === value)
}

function EventCalendarScopeDialog() {
  const { calendar } = useEventCalendarUi("EventCalendarScopeDialog")
  const prompt = calendar.scopePrompt
  const [scope, setScope] = React.useState<RecurrenceScope>("this")
  return (
    <Dialog
      open={prompt !== undefined}
      onOpenChange={(open) => {
        if (!open) calendar.resolveScope(null)
      }}
    >
      <DialogContent
        data-slot="event-calendar-scope-dialog"
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
          value={scope}
          onValueChange={(value) => {
            if (isRecurrenceScope(value)) setScope(value)
          }}
        >
          {SCOPES.map((item) => (
            <Field key={item} orientation="horizontal">
              <RadioGroupItem
                accessibilityLabel={SCOPE_LABELS[item]}
                value={item}
              />
              <FieldLabel onPress={() => setScope(item)}>
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
      </DialogContent>
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
  const [month, setMonth] = React.useState(date)
  // The shown month follows the calendar when it moves elsewhere.
  const [shownDate, setShownDate] = React.useState(date)
  if (shownDate !== date) {
    setShownDate(date)
    setMonth(date)
  }
  const visible = getVisibleDays(view, date, range, timeZone)
  const bandOf = (day: Date) => getDayBand(day, visible, weekStartsOn, timeZone)
  return (
    <Calendar
      data-slot="event-calendar-mini-month"
      mode="single"
      selected={calendar.date}
      onSelect={(day: Date | undefined) => {
        if (!day) return
        calendar.goTo(day)
        onDateSelect?.(day)
      }}
      month={month}
      onMonthChange={setMonth}
      weekStartsOn={weekStartsOn}
      modifiers={{
        inView: (day: Date) => bandOf(day).isInView,
        inViewStart: (day: Date) => bandOf(day).isStart,
        inViewEnd: (day: Date) => bandOf(day).isEnd,
      }}
      modifiersClassNames={{
        inView: inViewClass,
        inViewStart: inViewStartClass,
        inViewEnd: inViewEndClass,
      }}
      className={cn("cn-event-calendar-mini-month", className)}
    />
  )
}

function EventCalendarSources<TData>({
  calendar: calendarProp,
  className,
  ...props
}: PartProps<TData> & React.ComponentProps<typeof View>) {
  const calendar = useCalendarPart("EventCalendarSources", calendarProp)
  if (calendar.calendars.length === 0) return null
  return (
    <ChipPaletteProvider>
      <View
        data-slot="event-calendar-sources"
        role="group"
        accessibilityLabel="Calendars"
        className={cn("cn-event-calendar-sources flex-col", className)}
        {...props}
      >
        {calendar.calendars.map((source) => (
          <EventCalendarSource
            key={source.id}
            source={source}
            onToggle={() => calendar.toggleCalendar(source.id)}
          />
        ))}
      </View>
    </ChipPaletteProvider>
  )
}

function EventCalendarSource({
  source,
  onToggle,
}: {
  source: CalendarSource
  onToggle: () => void
}) {
  const resolve = React.use(ChipPaletteContext)
  const fill = resolve?.(source.color).fill
  const isVisible = source.visible !== false
  return (
    <Field orientation="horizontal" className="cn-event-calendar-source">
      <Checkbox
        accessibilityLabel={source.name}
        checked={isVisible}
        onCheckedChange={onToggle}
        className="cn-event-calendar-source-checkbox"
      />
      <View
        aria-hidden
        className="cn-event-calendar-source-swatch shrink-0"
        style={fill ? { backgroundColor: fill } : undefined}
      />
      <FieldLabel onPress={onToggle} className="min-w-0 flex-1">
        {source.name}
      </FieldLabel>
    </Field>
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
