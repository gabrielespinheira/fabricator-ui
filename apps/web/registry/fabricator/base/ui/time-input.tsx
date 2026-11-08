"use client"

// Time Input: a text field that takes a typed time or one picked from a list,
// following the WAI-ARIA combobox pattern. Clicking the field or pressing an
// arrow key opens the list while focus stays in the field: the arrows move
// through the times, typing (9, 930, 9:30 pm, 21:30, noon) jumps to the
// nearest one, Enter commits and Escape puts the last value back. The value is
// "HH:mm", what a form submits. Time Range Input pairs two of them: the end's
// list starts after the start and counts the duration, and moving the start
// keeps it. The rules are in lib/time-input-model.
import * as React from "react"
import { cn } from "cn"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
} from "@/registry/bases/base/lib/fluid-hover"
import {
  addMinutesToTime,
  commitTimeText,
  formatTimeDuration,
  formatTimeValue,
  getLocaleHourCycle,
  getNearestTimeOption,
  getTimeDuration,
  getTimeOfDay,
  getTimeOptions,
  getWidestTimeText,
  parseTimeText,
  shiftEndTime,
  type HourCycle,
} from "@/registry/bases/base/lib/time-input-model"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/bases/base/ui/input-group"
import { Popover, PopoverContent } from "@/registry/bases/base/ui/popover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function subscribeToLocale() {
  return () => {}
}

/**
 * The clock to write times in: the prop, or the reader's locale. The server
 * and the first client render use 12 hours, so hydration matches; the locale's
 * clock takes over right after.
 */
function useHourCycle(hourCycle: HourCycle | undefined): HourCycle {
  const localeHourCycle = React.useSyncExternalStore<HourCycle>(
    subscribeToLocale,
    () => getLocaleHourCycle(),
    () => 12
  )
  return hourCycle ?? localeHourCycle
}

function getOptionId(listId: string, time: string) {
  return `${listId}-${time.replace(":", "")}`
}

function TimeInputList({
  id,
  options,
  value,
  activeTime,
  startTime,
  hourCycle,
  label,
  onActiveTimeChange,
  onSelect,
}: {
  id: string
  options: string[]
  value: string | undefined
  activeTime: string | undefined
  startTime: string | undefined
  hourCycle: HourCycle
  label: string
  onActiveTimeChange: (time: string) => void
  onSelect: (time: string) => void
}) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="option"]',
    highlighted: "[data-highlighted]",
    selected: '[aria-selected="true"]',
  })
  const listRef = React.useRef<HTMLDivElement>(null)
  const previousIndex = React.useRef<number>(undefined)
  const isPointerMove = React.useRef(false)

  // The list opens with the active time centred. An arrow step keeps it in
  // view and a jump (typing, Page keys) centres it again; the pointer never
  // scrolls it. Only the list scrolls, never the page around it.
  React.useEffect(() => {
    const list = listRef.current
    if (!activeTime || !list) return
    const index = options.indexOf(activeTime)
    const isStep =
      previousIndex.current !== undefined &&
      Math.abs(index - previousIndex.current) === 1
    previousIndex.current = index
    if (isPointerMove.current) {
      isPointerMove.current = false
      return
    }
    const option = list.querySelector<HTMLElement>(
      `#${getOptionId(id, activeTime)}`
    )
    if (!option) return
    const top = option.offsetTop
    const bottom = top + option.offsetHeight
    if (!isStep) {
      list.scrollTop = top - (list.clientHeight - option.offsetHeight) / 2
    } else if (top < list.scrollTop) {
      list.scrollTop = top
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTop = bottom - list.clientHeight
    }
  }, [activeTime, id, options])

  return (
    <div
      ref={(element) => {
        listRef.current = element
        fluid.attach(element)
      }}
      id={id}
      role="listbox"
      aria-label={label}
      data-slot="time-input-list"
      data-duration={startTime ? true : undefined}
      className="cn-time-input-list relative isolate grid grid-cols-[max-content_1fr] overflow-y-auto overscroll-contain outline-none"
      // Rows never take focus: the field keeps it while the list moves.
      onMouseDown={(event) => event.preventDefault()}
      {...fluid.props}
    >
      <FluidHoverSelection selection={fluid.selection} />
      <FluidHoverHighlight hover={fluid.hover} />
      {options.map((time) => {
        const duration = startTime && getTimeDuration(startTime, time)
        return (
          <div
            key={time}
            id={getOptionId(id, time)}
            role="option"
            data-slot="time-input-option"
            data-highlighted={time === activeTime || undefined}
            aria-selected={time === value}
            className="cn-time-input-option relative col-span-full grid shrink-0 cursor-pointer grid-cols-subgrid items-center select-none"
            onPointerMove={() => {
              if (time === activeTime) return
              isPointerMove.current = true
              onActiveTimeChange(time)
            }}
            onClick={() => onSelect(time)}
          >
            <span className="cn-time-input-option-time">
              {formatTimeValue(time, { hourCycle })}
            </span>
            {duration && (
              <span className="cn-time-input-option-duration">
                {formatTimeDuration(duration)}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function TimeInput(
  props: Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "type" | "min" | "max" | "step"
  > & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string | undefined) => void
    hourCycle?: HourCycle
    step?: number
    minTime?: string
    maxTime?: string
    /** The start of a range: the list begins after it and shows durations. */
    startTime?: string
    name?: string
    listLabel?: string
  }
) {
  const {
    value,
    defaultValue,
    onValueChange,
    hourCycle: hourCycleProp,
    step = 15,
    minTime,
    maxTime,
    startTime,
    name,
    listLabel = "Choose time",
    className,
    style,
    disabled,
    "aria-invalid": ariaInvalid,
    onBlur,
    onChange,
    onClick,
    onFocus,
    onKeyDown,
    ref,
    ...inputProps
  } = props
  const hourCycle = useHourCycle(hourCycleProp)
  const isControlled = "value" in props
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = isControlled ? value : uncontrolledValue

  const [text, setText] = React.useState(() =>
    formatTimeValue(currentValue, { hourCycle })
  )
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [syncedHourCycle, setSyncedHourCycle] = React.useState(hourCycle)
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeTime, setActiveTime] = React.useState<string>()
  // The list is at least as wide as the field, from its first frame, so the
  // highlight never measures a narrower row.
  const [fieldWidth, setFieldWidth] = React.useState<number>()
  const groupRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  const options = React.useMemo(
    () => getTimeOptions({ step, minTime, maxTime, after: startTime }),
    [step, minTime, maxTime, startTime]
  )
  // An end must come after its start, typed or picked.
  const earliestTime = startTime ? addMinutesToTime(startTime, 1) : minTime

  // The field is never narrower than its longest time, so none is cropped.
  const widestText = React.useMemo(
    () => getWidestTimeText(options, hourCycle),
    [options, hourCycle]
  )

  // A value set from outside, or a new clock, rewrites the text.
  if (syncedValue !== currentValue || syncedHourCycle !== hourCycle) {
    setSyncedValue(currentValue)
    setSyncedHourCycle(hourCycle)
    setText(formatTimeValue(currentValue, { hourCycle }))
    setIsTextInvalid(false)
  }

  function updateValue(nextValue: string | undefined) {
    setSyncedValue(nextValue)
    if (nextValue === currentValue) return
    if (!isControlled) setUncontrolledValue(nextValue)
    onValueChange?.(nextValue)
  }

  function openList() {
    if (disabled || isOpen) return
    // Open on the value, or on the time nearest now, as a calendar opens on
    // today.
    setActiveTime(
      getNearestTimeOption(options, currentValue ?? getTimeOfDay(new Date()))
    )
    setFieldWidth(groupRef.current?.offsetWidth)
    setIsOpen(true)
  }

  function closeList() {
    setIsOpen(false)
    setActiveTime(undefined)
  }

  function commitText() {
    const commit = commitTimeText(text, {
      hourCycle,
      minTime: earliestTime,
      maxTime,
    })
    setText(commit.text)
    setIsTextInvalid(commit.isInvalid)
    updateValue(commit.value)
    return commit
  }

  function selectTime(time: string) {
    setText(formatTimeValue(time, { hourCycle }))
    setIsTextInvalid(false)
    updateValue(time)
    closeList()
  }

  function moveActiveTime(offset: number) {
    const index = activeTime ? options.indexOf(activeTime) : -1
    const nextIndex = Math.max(0, Math.min(options.length - 1, index + offset))
    const time = options[nextIndex]
    if (!time) return
    setActiveTime(time)
    setText(formatTimeValue(time, { hourCycle }))
    setIsTextInvalid(false)
  }

  const moves: Record<string, number> = {
    ArrowDown: 1,
    ArrowUp: -1,
    PageDown: 5,
    PageUp: -5,
  }

  return (
    <div
      data-slot="time-input"
      className={cn("cn-time-input w-full min-w-fit", className)}
    >
      <InputGroup ref={groupRef}>
        <InputGroupAddon align="inline-start" onClick={openList}>
          <IconPlaceholder
            lucide="ClockIcon"
            tabler="IconClock"
            hugeicons="Clock01Icon"
            phosphor="ClockIcon"
            remixicon="RiTimeLine"
            aria-hidden
          />
        </InputGroupAddon>
        <InputGroupInput
          ref={ref}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listId : undefined}
          aria-activedescendant={
            isOpen && activeTime ? getOptionId(listId, activeTime) : undefined
          }
          aria-invalid={ariaInvalid || isTextInvalid || undefined}
          style={{ minWidth: `${widestText.length}ch`, ...style }}
          disabled={disabled}
          value={text}
          onFocus={(event) => {
            event.currentTarget.select()
            onFocus?.(event)
          }}
          onClick={(event) => {
            openList()
            onClick?.(event)
          }}
          onChange={(event) => {
            setText(event.target.value)
            const typed = parseTimeText(event.target.value)
            if (typed) setActiveTime(getNearestTimeOption(options, typed))
            if (!isOpen) {
              setFieldWidth(groupRef.current?.offsetWidth)
              setIsOpen(true)
            }
            onChange?.(event)
          }}
          onBlur={(event) => {
            commitText()
            closeList()
            onBlur?.(event)
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.defaultPrevented) return
            const offset = moves[event.key]
            if (offset !== undefined) {
              event.preventDefault()
              if (isOpen) moveActiveTime(offset)
              else openList()
            } else if (event.key === "Escape" && isOpen) {
              event.preventDefault()
              event.stopPropagation()
              setText(formatTimeValue(currentValue, { hourCycle }))
              setIsTextInvalid(false)
              closeList()
            } else if (event.key === "Enter") {
              const committedText = text
              const commit = commitText()
              closeList()
              // Show the rewritten time before a second Enter submits the form.
              if (commit.text !== committedText || commit.isInvalid) {
                event.preventDefault()
              }
            }
          }}
          {...inputProps}
        />
      </InputGroup>
      <Popover
        open={isOpen}
        onOpenChange={(open, details) => {
          // A press on the field itself keeps the list; the field handles it.
          const target = details.event?.target
          if (target instanceof Node && groupRef.current?.contains(target)) {
            return
          }
          if (!open) closeList()
        }}
      >
        <PopoverContent
          anchor={groupRef}
          align="start"
          initialFocus={false}
          finalFocus={false}
          className="cn-time-input-content"
          style={{ minWidth: fieldWidth }}
        >
          <TimeInputList
            id={listId}
            options={options}
            value={currentValue}
            activeTime={activeTime}
            startTime={startTime}
            hourCycle={hourCycle}
            label={listLabel}
            onActiveTimeChange={setActiveTime}
            onSelect={selectTime}
          />
        </PopoverContent>
      </Popover>
      {name && (
        <input
          type="hidden"
          data-slot="time-input-value"
          name={name}
          value={currentValue ?? ""}
          disabled={disabled}
        />
      )}
    </div>
  )
}

type TimeRangeValue = {
  start: string | undefined
  end: string | undefined
}

function TimeRangeInput(
  props: Omit<React.ComponentProps<"div">, "defaultValue"> & {
    value?: TimeRangeValue
    defaultValue?: TimeRangeValue
    onValueChange?: (value: TimeRangeValue) => void
    hourCycle?: HourCycle
    step?: number
    minTime?: string
    maxTime?: string
    /** The start field's id, for a label's htmlFor. */
    startId?: string
    startLabel?: string
    endLabel?: string
    /** Submits "<name>-start" and "<name>-end". */
    name?: string
    disabled?: boolean
  }
) {
  const {
    value,
    defaultValue,
    onValueChange,
    hourCycle,
    step = 15,
    minTime,
    maxTime,
    startId,
    startLabel = "Start time",
    endLabel = "End time",
    name,
    disabled,
    className,
    ...rootProps
  } = props
  const isControlled = "value" in props
  const [uncontrolledValue, setUncontrolledValue] =
    React.useState<TimeRangeValue>(
      defaultValue ?? { start: undefined, end: undefined }
    )
  const range = (isControlled ? value : uncontrolledValue) ?? {
    start: undefined,
    end: undefined,
  }
  const duration =
    range.start && range.end
      ? getTimeDuration(range.start, range.end)
      : undefined

  function updateRange(nextRange: TimeRangeValue) {
    if (!isControlled) setUncontrolledValue(nextRange)
    onValueChange?.(nextRange)
  }

  function changeStart(start: string | undefined) {
    if (!start) return updateRange({ ...range, start })
    // Moving the start keeps the duration; a new start pushes an end that
    // no longer follows it to one step after.
    const end = range.start
      ? shiftEndTime(range.start, range.end, start, step)
      : range.end && !getTimeDuration(start, range.end)
        ? shiftEndTime(start, undefined, start, step)
        : range.end
    updateRange({ start, end })
  }

  return (
    <div
      role="group"
      data-slot="time-range-input"
      className={cn("cn-time-range-input flex items-center", className)}
      {...rootProps}
    >
      <TimeInput
        id={startId}
        aria-label={startLabel}
        listLabel={startLabel}
        value={range.start}
        onValueChange={changeStart}
        hourCycle={hourCycle}
        step={step}
        minTime={minTime}
        maxTime={maxTime}
        name={name && `${name}-start`}
        disabled={disabled}
        placeholder="Start"
      />
      <IconPlaceholder
        lucide="ArrowRightIcon"
        tabler="IconArrowRight"
        hugeicons="ArrowRight02Icon"
        phosphor="ArrowRightIcon"
        remixicon="RiArrowRightLine"
        aria-hidden
        className="cn-time-range-input-separator shrink-0"
      />
      <TimeInput
        aria-label={endLabel}
        listLabel={endLabel}
        value={range.end}
        onValueChange={(end) => updateRange({ ...range, end })}
        hourCycle={hourCycle}
        step={step}
        minTime={minTime}
        maxTime={maxTime}
        startTime={range.start}
        name={name && `${name}-end`}
        disabled={disabled}
        placeholder="End"
      />
      {duration && (
        <span
          data-slot="time-range-input-duration"
          className="cn-time-range-input-duration shrink-0 whitespace-nowrap"
        >
          {formatTimeDuration(duration)}
        </span>
      )}
    </div>
  )
}

export { TimeInput, TimeRangeInput, type TimeRangeValue }
