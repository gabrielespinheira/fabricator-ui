"use client"

// The Event Calendar's controller: the view, the date, the settings, the
// events (a local list, a controlled list or a range loader), the optimistic
// layer for changes in flight, undo and redo, and the scope question a
// recurring event asks. It knows nothing about FullCalendar or the DOM, so
// every part, on any platform, reads and drives the same object.
import * as React from "react"

import {
  collectChunkEvents,
  getChunkKeys,
  getChunkRange,
  getKeysToEvict,
  getKeysToLoad,
  patchChunks,
  type EventCalendarChunks,
  type EventCalendarLoader,
} from "@/registry/bases/__base__/lib/event-calendar-loader"
import {
  applyEventChange,
  createEventChange,
  DEFAULT_EVENT_CALENDAR_SETTINGS,
  formatViewTitle,
  getColumnCount,
  getContinuityBuffer,
  getContinuousRange,
  getContinuousWindow,
  getViewRange,
  invertEventChange,
  isEventEditable,
  isEventVisible,
  isTimeGridView,
  resolveBusinessHours,
  shiftViewDate,
  toEventCalendarWeekday,
  type CalendarEvent,
  type CalendarSource,
  type EventCalendarBusinessHours,
  type EventCalendarChange,
  type EventCalendarChangeReason,
  type EventCalendarRange,
  type EventCalendarSettings,
  type EventCalendarView,
  type EventCalendarWeekday,
  type RecurrenceScope,
} from "@/registry/bases/__base__/lib/event-calendar-model"
import {
  applyRecurringDelete,
  applyRecurringEdit,
  createEventIndex,
  isOccurrence,
  queryEventIndex,
} from "@/registry/bases/__base__/lib/event-calendar-recurrence"

/** A change, with `apply` for a local list: `setEvents(change.apply)`. */
type EventCalendarChangeEvent<TData = unknown> = EventCalendarChange<TData> & {
  apply: (events: CalendarEvent<TData>[]) => CalendarEvent<TData>[]
}

type EventCalendarNotice<TData = unknown> = {
  id: number
  status: "done" | "failed"
  message: string
  change: EventCalendarChange<TData>
  /** Undo a change that landed, or try a failed one again. */
  action?: { label: string; run: () => void }
}

type EventCalendarScopePrompt<TData = unknown> = {
  kind: "edit" | "delete"
  event: CalendarEvent<TData>
  next?: CalendarEvent<TData>
  reason: EventCalendarChangeReason
  /** Called when the question is dismissed and nothing changes. */
  onCancel?: () => void
}

/** What the calendar shows beside its grid: details, a form, or nothing. */
type EventCalendarPanel<TData = unknown> =
  | { kind: "details"; event: CalendarEvent<TData> }
  | { kind: "create"; event: CalendarEvent<TData> }
  | { kind: "edit"; event: CalendarEvent<TData> }

type UseEventCalendarOptions<TData = unknown> = {
  /** A controlled list. Changes reach it through `onEventChange`. */
  events?: CalendarEvent<TData>[]
  /** A list the calendar keeps itself. */
  defaultEvents?: CalendarEvent<TData>[]
  /** Loads events by month, instead of a list. */
  load?: EventCalendarLoader<TData>
  /**
   * Every change: created, moved, resized, edited, deleted, undone. Return a
   * Promise to keep the change pending until it lands; a rejection reverts
   * it. For a local list: `(change) => setEvents(change.apply)`.
   */
  onEventChange?: (change: EventCalendarChangeEvent<TData>) => unknown
  /** Return `false` to handle opening an event yourself. */
  onEventOpen?: (event: CalendarEvent<TData>) => boolean | void
  onRangeChange?: (details: {
    start: Date
    end: Date
    view: EventCalendarView
  }) => void
  calendars?: CalendarSource[]
  view?: EventCalendarView
  defaultView?: EventCalendarView
  onViewChange?: (view: EventCalendarView) => void
  views?: EventCalendarView[]
  /** Columns in the N-day view: 4, or 3 on a narrow calendar. */
  days?: number
  date?: Date
  defaultDate?: Date
  onDateChange?: (date: Date) => void
  settings?: Partial<EventCalendarSettings>
  defaultSettings?: Partial<EventCalendarSettings>
  onSettingsChange?: (settings: EventCalendarSettings) => void
  /** An IANA name; the device's zone when unset. */
  timeZone?: string
  /** A BCP 47 tag; "en-US" when unset, so server and client agree. */
  locale?: string
  /** Shades time outside working hours: `true` for Monday to Friday, 9 to 5. */
  businessHours?: EventCalendarBusinessHours | boolean
  /**
   * Day, N days and Week scroll sideways by day, and start on whichever day
   * the scroll stops at. On by default.
   */
  continuous?: boolean
  /** Whether events can be created and changed. */
  editable?: boolean
  createId?: () => string
}

const ALL_VIEWS: EventCalendarView[] = [
  "day",
  "days",
  "week",
  "month",
  "agenda",
]

const EMPTY_CALENDARS: CalendarSource[] = []

const CHANGE_MESSAGES: Record<EventCalendarChangeReason, string> = {
  create: "Event created",
  duplicate: "Event duplicated",
  move: "Event moved",
  resize: "Event updated",
  edit: "Event updated",
  delete: "Event deleted",
  undo: "Change undone",
  redo: "Change redone",
}

const FAILURE_MESSAGES: Record<EventCalendarChangeReason, string> = {
  create: "Couldn't create the event",
  duplicate: "Couldn't duplicate the event",
  move: "Couldn't move the event",
  resize: "Couldn't change the event",
  edit: "Couldn't save the event",
  delete: "Couldn't delete the event",
  undo: "Couldn't undo the change",
  redo: "Couldn't redo the change",
}

/** Loaded months kept before the farthest from the view are dropped. */
const MAX_CACHED_MONTHS = 24

let idCounter = 0

function createDefaultId() {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  idCounter += 1
  return `event-${Date.now().toString(36)}-${idCounter}`
}

/** A ref that always holds the latest value, for callbacks kept stable. */
function useLatest<T>(value: T) {
  const ref = React.useRef(value)
  React.useLayoutEffect(() => {
    ref.current = value
  })
  return ref
}

/** A value a prop controls when it's set, and local state otherwise. */
function useControllable<T>(
  value: T | undefined,
  defaultValue: T | (() => T),
  onChange: ((value: T) => void) | undefined
): [T, (value: T) => void] {
  const [local, setLocal] = React.useState(defaultValue)
  const isControlled = value !== undefined
  const onChangeRef = useLatest(onChange)
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setLocal(next)
      onChangeRef.current?.(next)
    },
    [isControlled, onChangeRef]
  )
  return [isControlled ? value : local, set]
}

function withApply<TData>(
  change: EventCalendarChange<TData>
): EventCalendarChangeEvent<TData> {
  return {
    ...change,
    apply: (events) => applyEventChange(events, change),
  }
}

function getChangeIds(change: EventCalendarChange) {
  return [
    change.event.id,
    ...change.created.map((event) => event.id),
    ...change.updated.map((event) => event.id),
    ...change.deleted.map((event) => event.id),
  ]
}

function useEventCalendar<TData = unknown>(
  options: UseEventCalendarOptions<TData> = {}
) {
  const {
    events: controlledEvents,
    defaultEvents,
    load,
    onEventChange,
    onEventOpen,
    onRangeChange,
    calendars = EMPTY_CALENDARS,
    views = ALL_VIEWS,
    timeZone,
    locale = "en-US",
    createId = createDefaultId,
  } = options

  // --- Layout ---------------------------------------------------------------

  // Narrow calendars (phones) get three columns and the N-day view by default.
  const [isCompact, setCompact] = React.useState(false)
  const days = options.days ?? (isCompact ? 3 : 4)

  // --- View and date --------------------------------------------------------

  // Until someone picks a view, a narrow calendar shows N days and a wide
  // one the week.
  const [hasChosenView, setChosenView] = React.useState(
    options.view !== undefined || options.defaultView !== undefined
  )
  const [chosenView, setViewState] = useControllable<EventCalendarView>(
    options.view,
    options.defaultView ?? "week",
    options.onViewChange
  )
  const view: EventCalendarView = hasChosenView
    ? chosenView
    : isCompact
      ? "days"
      : "week"
  const setView = React.useCallback(
    (next: EventCalendarView) => {
      setChosenView(true)
      setFreeStart(false)
      setViewState(next)
    },
    [setViewState]
  )

  const [date, setDate] = useControllable<Date>(
    options.date,
    () => options.defaultDate ?? new Date(),
    options.onDateChange
  )

  // --- Settings -------------------------------------------------------------

  const [localSettings, setLocalSettings] = React.useState<
    Partial<EventCalendarSettings>
  >(() => options.defaultSettings ?? {})
  const settings = React.useMemo<EventCalendarSettings>(
    () => ({
      ...DEFAULT_EVENT_CALENDAR_SETTINGS,
      ...getLocaleSettings(locale),
      ...localSettings,
      ...options.settings,
    }),
    [locale, localSettings, options.settings]
  )
  const onSettingsChangeRef = useLatest(options.onSettingsChange)
  const setSettings = React.useCallback(
    (patch: Partial<EventCalendarSettings>) => {
      setLocalSettings((current) => ({ ...current, ...patch }))
      onSettingsChangeRef.current?.({ ...settings, ...patch })
    },
    [onSettingsChangeRef, settings]
  )

  // --- Continuity -----------------------------------------------------------

  // A continuous time grid scrolls by day. A scroll starts it on whichever
  // day it stops at; Today, a picked date or another view line a week up
  // with its first day again.
  const isContinuous = (options.continuous ?? true) && isTimeGridView(view)
  const columns = getColumnCount(view, days, settings.showWeekends)
  const [hasFreeStart, setFreeStart] = React.useState(false)
  const isFree = isContinuous && hasFreeStart
  const continuity = React.useMemo(
    () => ({ showWeekends: settings.showWeekends, timeZone }),
    [settings.showWeekends, timeZone]
  )

  // The range keeps its identity while its days stay the same, so moving
  // the date inside a week reloads and redraws nothing.
  const aligned = getViewRange(view, date, {
    days,
    weekStartsOn: settings.weekStartsOn,
    timeZone,
  })
  const computed = isContinuous
    ? getContinuousRange(isFree ? date : aligned.start, columns, continuity)
    : aligned
  const rangeStart = +computed.start
  const rangeEnd = +computed.end
  const range = React.useMemo<EventCalendarRange>(
    () => ({ start: new Date(rangeStart), end: new Date(rangeEnd) }),
    [rangeEnd, rangeStart]
  )
  const title = React.useMemo(
    () => formatViewTitle(view, range, { locale, timeZone }),
    [locale, range, timeZone, view]
  )

  const onRangeChangeRef = useLatest(onRangeChange)
  React.useEffect(() => {
    onRangeChangeRef.current?.({ start: range.start, end: range.end, view })
  }, [onRangeChangeRef, range, view])

  // From a free start, a step moves by the columns in view and stays free.
  const step = React.useCallback(
    (direction: 1 | -1) => {
      if (!isFree) {
        setDate(shiftViewDate(view, date, direction, { days, timeZone }))
        return
      }
      const window = getContinuousWindow(date, columns, {
        buffer: columns,
        ...continuity,
      })
      setDate(window.dates[window.first + direction * columns])
    },
    [columns, continuity, date, days, isFree, setDate, timeZone, view]
  )
  const next = React.useCallback(() => step(1), [step])
  const previous = React.useCallback(() => step(-1), [step])
  const goTo = React.useCallback(
    (next: Date) => {
      setFreeStart(false)
      setDate(next)
    },
    [setDate]
  )
  const today = React.useCallback(() => goTo(new Date()), [goTo])
  /** Starts a continuous grid on a day, as a sideways scroll does. */
  const setStartDate = React.useCallback(
    (start: Date) => {
      setFreeStart(true)
      setDate(start)
    },
    [setDate]
  )

  // --- Calendars ------------------------------------------------------------

  const [hiddenCalendars, setHiddenCalendars] = React.useState<Set<string>>(
    () =>
      new Set(
        calendars
          .filter((calendar) => calendar.visible === false)
          .map((calendar) => calendar.id)
      )
  )
  const visibleCalendars = React.useMemo(
    () =>
      calendars.map((calendar) => ({
        ...calendar,
        visible: !hiddenCalendars.has(calendar.id),
      })),
    [calendars, hiddenCalendars]
  )
  const toggleCalendar = React.useCallback((id: string) => {
    setHiddenCalendars((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // --- Events ---------------------------------------------------------------

  const [localEvents, setLocalEvents] = React.useState<CalendarEvent<TData>[]>(
    () => defaultEvents ?? []
  )
  const [chunks, setChunks] = React.useState<EventCalendarChunks<TData>>(
    () => new Map()
  )
  const loadKeys = React.useMemo(
    () => getChunkKeys(range, timeZone, { prefetch: true }),
    [range, timeZone]
  )
  const loadRef = useLatest(load)
  const loadKeysRef = useLatest(loadKeys)
  const requests = React.useRef(new Map<string, AbortController>())

  // Months load once; a failed month waits for `retry` or `refetch`.
  React.useEffect(() => {
    const loader = loadRef.current
    if (!loader) return
    // Months that left the view stop loading.
    for (const [key, controller] of requests.current) {
      if (loadKeys.includes(key)) continue
      controller.abort()
      requests.current.delete(key)
      setChunks((current) => {
        if (current.get(key)?.status !== "loading") return current
        const next = new Map(current)
        next.delete(key)
        return next
      })
    }
    const keys = getKeysToLoad(chunks, loadKeys).filter(
      (key) => !requests.current.has(key)
    )
    if (keys.length === 0) return
    setChunks((current) => {
      const next = new Map(current)
      for (const key of keys) next.set(key, { status: "loading", events: [] })
      return next
    })
    for (const key of keys) {
      const controller = new AbortController()
      requests.current.set(key, controller)
      const { start, end } = getChunkRange(key, timeZone)
      loader({ start, end, signal: controller.signal }).then(
        (events) => {
          if (controller.signal.aborted) return
          requests.current.delete(key)
          setChunks((current) => {
            const next = new Map(current).set(key, {
              status: "loaded",
              events,
            })
            const keep = loadKeysRef.current
            for (const old of getKeysToEvict(next, keep, MAX_CACHED_MONTHS)) {
              next.delete(old)
            }
            return next
          })
        },
        () => {
          if (controller.signal.aborted) return
          requests.current.delete(key)
          setChunks((current) =>
            new Map(current).set(key, { status: "error", events: [] })
          )
        }
      )
    }
  }, [chunks, loadKeys, loadKeysRef, loadRef, timeZone])

  React.useEffect(() => {
    const current = requests.current
    return () => {
      for (const controller of current.values()) controller.abort()
      current.clear()
    }
  }, [])

  const viewKeys = React.useMemo(
    () => getChunkKeys(range, timeZone),
    [range, timeZone]
  )
  const isLoading =
    load !== undefined &&
    viewKeys.some((key) => (chunks.get(key)?.status ?? "loading") === "loading")
  const hasLoadError =
    load !== undefined &&
    viewKeys.some((key) => chunks.get(key)?.status === "error")

  const refetch = React.useCallback(() => {
    for (const controller of requests.current.values()) controller.abort()
    requests.current.clear()
    setChunks(new Map())
  }, [])

  const retry = React.useCallback(() => {
    setChunks((current) => {
      const next = new Map(current)
      for (const [key, chunk] of current) {
        if (chunk.status === "error") next.delete(key)
      }
      return next
    })
  }, [])

  const baseEvents = React.useMemo(() => {
    if (controlledEvents) return controlledEvents
    if (load) return collectChunkEvents(chunks, loadKeys)
    return localEvents
  }, [chunks, controlledEvents, load, loadKeys, localEvents])

  const [events, addOptimistic] = React.useOptimistic(
    baseEvents,
    (current: CalendarEvent<TData>[], change: EventCalendarChange<TData>) =>
      applyEventChange(current, change)
  )

  // A period either side is expanded too, so a page swiped in (native) or
  // reached by a quick next already has its events, and a continuous grid
  // has the columns it scrolls into.
  const eventRange = React.useMemo<EventCalendarRange>(() => {
    const length = +range.end - +range.start
    const around = {
      start: new Date(+range.start - length),
      end: new Date(+range.end + length),
    }
    if (!isContinuous) return around
    const window = getContinuousWindow(range.start, columns, {
      buffer: getContinuityBuffer(columns),
      ...continuity,
    })
    return {
      start: window.start < around.start ? window.start : around.start,
      end: window.end > around.end ? window.end : around.end,
    }
  }, [columns, continuity, isContinuous, range])

  // Indexed once per list, so moving through dates is a binary search, not a
  // pass over every event. An edit re-indexes, reusing every parsed date.
  const eventIndex = React.useMemo(
    () => createEventIndex(events, timeZone),
    [events, timeZone]
  )
  const shownEvents = React.useMemo(
    () =>
      queryEventIndex(eventIndex, eventRange).filter((event) =>
        isEventVisible(event, visibleCalendars)
      ),
    [eventIndex, eventRange, visibleCalendars]
  )
  // The toolbar answers at once; the grid redraws its events in a render
  // React can interrupt. Changes run in a transition, so they aren't delayed.
  const visibleEvents = React.useDeferredValue(shownEvents)

  // --- Changes --------------------------------------------------------------

  const isEditable =
    options.editable ??
    (onEventChange !== undefined ||
      (controlledEvents === undefined && load === undefined))

  const [pendingIds, setPendingIds] = React.useState<Set<string>>(
    () => new Set()
  )
  const [notice, setNotice] = React.useState<EventCalendarNotice<TData>>()
  const noticeId = React.useRef(0)
  const [history, setHistory] = React.useState<{
    undo: EventCalendarChange<TData>[]
    redo: EventCalendarChange<TData>[]
  }>({ undo: [], redo: [] })
  const [, startTransition] = React.useTransition()

  const onEventChangeRef = useLatest(onEventChange)
  const isLocal = controlledEvents === undefined && load === undefined
  const hasLoader = load !== undefined

  type CommitSource = {
    source: "undo" | "redo"
    original: EventCalendarChange<TData>
  }
  const commitRef =
    React.useRef<
      (change: EventCalendarChange<TData>, origin?: CommitSource) => void
    >(undefined)
  const undoRef = React.useRef<() => void>(undefined)

  const commit = React.useCallback(
    (change: EventCalendarChange<TData>, origin?: CommitSource) => {
      const ids = getChangeIds(change)
      setPendingIds((current) => new Set([...current, ...ids]))
      startTransition(async () => {
        addOptimistic(change)
        const announce = (status: "done" | "failed") => {
          noticeId.current += 1
          setNotice({
            id: noticeId.current,
            status,
            change,
            message:
              status === "done"
                ? CHANGE_MESSAGES[change.reason]
                : FAILURE_MESSAGES[change.reason],
            action:
              status === "failed"
                ? {
                    label: "Retry",
                    run: () => commitRef.current?.(change, origin),
                  }
                : origin
                  ? undefined
                  : { label: "Undo", run: () => undoRef.current?.() },
          })
        }
        try {
          await onEventChangeRef.current?.(withApply(change))
          if (isLocal) {
            setLocalEvents((current) => applyEventChange(current, change))
          }
          if (hasLoader) {
            setChunks((current) => patchChunks(current, change, timeZone))
          }
          setHistory((current) => {
            if (origin?.source === "undo") {
              return {
                undo: current.undo,
                redo: [...current.redo, origin.original],
              }
            }
            if (origin?.source === "redo") {
              return {
                undo: [...current.undo, origin.original],
                redo: current.redo,
              }
            }
            return { undo: [...current.undo, change], redo: [] }
          })
          announce("done")
        } catch (error) {
          announce("failed")
          reportError(error)
        } finally {
          setPendingIds((current) => {
            const next = new Set(current)
            for (const id of ids) next.delete(id)
            return next
          })
        }
      })
    },
    [addOptimistic, hasLoader, isLocal, onEventChangeRef, timeZone]
  )
  React.useLayoutEffect(() => {
    commitRef.current = commit
  })

  const undo = React.useCallback(() => {
    const last = history.undo.at(-1)
    if (!last) return
    setHistory((current) => ({ ...current, undo: current.undo.slice(0, -1) }))
    commit(invertEventChange(last, "undo"), { source: "undo", original: last })
  }, [commit, history.undo])
  React.useLayoutEffect(() => {
    undoRef.current = undo
  })

  const redo = React.useCallback(() => {
    const last = history.redo.at(-1)
    if (!last) return
    setHistory((current) => ({ ...current, redo: current.redo.slice(0, -1) }))
    commit({ ...last, reason: "redo" }, { source: "redo", original: last })
  }, [commit, history.redo])

  const [scopePrompt, setScopePrompt] =
    React.useState<EventCalendarScopePrompt<TData>>()

  const createEvent = React.useCallback(
    (
      event: CalendarEvent<TData>,
      reason: "create" | "duplicate" = "create"
    ) => {
      commit(createEventChange({ reason, event, created: [event] }))
    },
    [commit]
  )

  const duplicateEvent = React.useCallback(
    (event: CalendarEvent<TData>) => {
      const copy: CalendarEvent<TData> = { ...event, id: createId() }
      delete copy.recurringEventId
      delete copy.originalStart
      if (isOccurrence(event)) delete copy.recurrence
      createEvent(copy, "duplicate")
    },
    [createEvent, createId]
  )

  const updateEvent = React.useCallback(
    (
      event: CalendarEvent<TData>,
      next: CalendarEvent<TData>,
      {
        reason = "edit",
        scope,
        onCancel,
      }: {
        reason?: EventCalendarChangeReason
        scope?: RecurrenceScope
        /**
         * For a recurring event: called if its scope question is dismissed,
         * as a grid that drew the move already puts the event back.
         */
        onCancel?: () => void
      } = {}
    ) => {
      if (isOccurrence(event) && !scope) {
        setScopePrompt({ kind: "edit", event, next, reason, onCancel })
        return
      }
      if (isOccurrence(event) && scope) {
        const change = applyRecurringEdit({
          stored: events,
          occurrence: event,
          next,
          scope,
          timeZone,
          createId,
        })
        commit(
          createEventChange({
            reason,
            event: next,
            previous: event,
            scope,
            ...change,
          })
        )
        return
      }
      commit(
        createEventChange({
          reason,
          event: next,
          previous: event,
          updated: [next],
          replaced: [event],
        })
      )
    },
    [commit, createId, events, timeZone]
  )

  const deleteEvent = React.useCallback(
    (event: CalendarEvent<TData>, scope?: RecurrenceScope) => {
      if (isOccurrence(event) && !scope) {
        setScopePrompt({ kind: "delete", event, reason: "delete" })
        return
      }
      if (isOccurrence(event) && scope) {
        const change = applyRecurringDelete({
          stored: events,
          occurrence: event,
          scope,
          timeZone,
        })
        commit(createEventChange({ reason: "delete", event, scope, ...change }))
        return
      }
      commit(createEventChange({ reason: "delete", event, deleted: [event] }))
    },
    [commit, events, timeZone]
  )

  const resolveScope = React.useCallback(
    (scope: RecurrenceScope | null) => {
      const prompt = scopePrompt
      setScopePrompt(undefined)
      if (!prompt) return
      if (!scope) {
        prompt.onCancel?.()
        return
      }
      if (prompt.kind === "delete") deleteEvent(prompt.event, scope)
      else if (prompt.next) {
        updateEvent(prompt.event, prompt.next, { reason: prompt.reason, scope })
      }
    },
    [deleteEvent, scopePrompt, updateEvent]
  )

  // --- Panels ---------------------------------------------------------------

  const [panel, setPanel] = React.useState<EventCalendarPanel<TData>>()
  const onEventOpenRef = useLatest(onEventOpen)

  const openEvent = React.useCallback(
    (event: CalendarEvent<TData>) => {
      if (onEventOpenRef.current?.(event) === false) return
      setPanel({ kind: "details", event })
    },
    [onEventOpenRef]
  )
  const editEvent = React.useCallback(
    (event: CalendarEvent<TData>) => setPanel({ kind: "edit", event }),
    []
  )
  const startCreate = React.useCallback(
    (draft: CalendarEvent<TData>) => setPanel({ kind: "create", event: draft }),
    []
  )
  const closePanel = React.useCallback(() => setPanel(undefined), [])

  const canEdit = React.useCallback(
    (event: CalendarEvent<TData>) =>
      isEditable && isEventEditable(event, calendars),
    [calendars, isEditable]
  )

  return {
    // Configuration
    calendars: visibleCalendars,
    views,
    days,
    timeZone,
    locale,
    settings,
    businessHours: resolveBusinessHours(options.businessHours),
    isEditable,
    isCompact,
    createId,
    // View
    view,
    date,
    range,
    title,
    /** Whether the time grid scrolls sideways by day (`continuous`). */
    isContinuous,
    /** The day columns a time grid shows. */
    columns,
    setView,
    goTo,
    setStartDate,
    next,
    previous,
    today,
    setCompact,
    setSettings,
    toggleCalendar,
    // Events
    events,
    visibleEvents,
    isLoading,
    hasLoadError,
    refetch,
    retry,
    pendingIds,
    canEdit,
    // Changes
    createEvent,
    duplicateEvent,
    updateEvent,
    deleteEvent,
    undo,
    redo,
    canUndo: history.undo.length > 0,
    canRedo: history.redo.length > 0,
    notice,
    scopePrompt,
    resolveScope,
    // Panels
    panel,
    openEvent,
    editEvent,
    startCreate,
    closePanel,
  }
}

type EventCalendarController<TData = unknown> = ReturnType<
  typeof useEventCalendar<TData>
>

/** The locale's hour cycle and first day, where Intl knows them. */
function getLocaleSettings(locale: string): Partial<EventCalendarSettings> {
  const settings: Partial<EventCalendarSettings> = {}
  const cycle = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
  }).resolvedOptions().hourCycle
  if (cycle)
    settings.hourCycle = cycle === "h11" || cycle === "h12" ? "h12" : "h23"
  // Hermes may have no Intl.Locale, and Firefox no getWeekInfo: the first
  // day then stays the default.
  if (typeof Intl.Locale !== "function") return settings
  const intlLocale = new Intl.Locale(locale)
  if (typeof intlLocale.getWeekInfo === "function") {
    settings.weekStartsOn = toEventCalendarWeekday(
      intlLocale.getWeekInfo().firstDay
    )
  }
  return settings
}

function reportError(error: unknown) {
  // A failed change is shown to the person; the error is for the developer.
  globalThis.reportError?.(error)
}

export {
  getLocaleSettings,
  useEventCalendar,
  type EventCalendarBusinessHours,
  type EventCalendarChangeEvent,
  type EventCalendarController,
  type EventCalendarNotice,
  type EventCalendarPanel,
  type EventCalendarRange,
  type EventCalendarScopePrompt,
  type UseEventCalendarOptions,
}
