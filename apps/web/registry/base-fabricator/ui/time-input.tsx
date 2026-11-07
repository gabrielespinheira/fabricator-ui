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
} from "@/registry/base-fabricator/lib/fluid-hover"
import {
  addMinutesToTime,
  commitTimeText,
  formatTimeDuration,
  formatTimeValue,
  getNearestTimeOption,
  getTimeDuration,
  getTimeOfDay,
  getTimeOptions,
  parseTimeText,
  shiftEndTime,
  type HourCycle,
} from "@/registry/base-fabricator/lib/time-input-model"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/base-fabricator/ui/input-group"
import { Popover, PopoverContent } from "@/registry/base-fabricator/ui/popover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

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

  // The list opens with the active time centred. An arrow step keeps it in
  // view; a jump (typing, Page keys) centres it again.
  React.useEffect(() => {
    if (!activeTime) return
    const index = options.indexOf(activeTime)
    const isStep =
      previousIndex.current !== undefined &&
      Math.abs(index - previousIndex.current) === 1
    previousIndex.current = index
    listRef.current
      ?.querySelector<HTMLElement>(`#${getOptionId(id, activeTime)}`)
      ?.scrollIntoView({ block: isStep ? "nearest" : "center" })
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
      className="relative isolate no-scrollbar grid max-h-[calc(var(--density-32)*7.5)] scroll-fade grid-cols-[max-content_1fr] gap-x-(--density-8) overflow-y-auto overscroll-contain outline-none"
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
            className="relative col-span-full grid h-(--density-32) shrink-0 cursor-pointer grid-cols-subgrid items-center rounded-lg px-(--density-8) text-(length:--density-text-13) text-muted-foreground tabular-nums transition-colors duration-feedback select-none aria-selected:bg-active aria-selected:text-foreground in-data-[fluid-hover]:aria-selected:bg-transparent data-highlighted:bg-hover data-highlighted:text-foreground in-data-[fluid-hover]:data-highlighted:bg-transparent"
            onPointerMove={() => {
              if (time !== activeTime) onActiveTimeChange(time)
            }}
            onClick={() => onSelect(time)}
          >
            <span className="in-aria-selected:font-semibold">
              {formatTimeValue(time, { hourCycle })}
            </span>
            {duration && (
              <span className="text-muted-foreground/70">
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
    hourCycle = 12,
    step = 15,
    minTime,
    maxTime,
    startTime,
    name,
    listLabel = "Choose time",
    className,
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
  const isControlled = "value" in props
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = isControlled ? value : uncontrolledValue

  const [text, setText] = React.useState(() =>
    formatTimeValue(currentValue, { hourCycle })
  )
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [isOpen, setIsOpen] = React.useState(false)
  const [activeTime, setActiveTime] = React.useState<string>()
  const groupRef = React.useRef<HTMLDivElement>(null)
  const listId = React.useId()

  const options = React.useMemo(
    () => getTimeOptions({ step, minTime, maxTime, after: startTime }),
    [step, minTime, maxTime, startTime]
  )
  // An end must come after its start, typed or picked.
  const earliestTime = startTime ? addMinutesToTime(startTime, 1) : minTime

  // A value set from outside replaces the text.
  if (syncedValue !== currentValue) {
    setSyncedValue(currentValue)
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
      className={cn(
        "w-full min-w-0 [&_[data-slot=input-group-addon]]:cursor-pointer [&_[data-slot=input-group-control]]:tabular-nums",
        className
      )}
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
            if (!isOpen) setIsOpen(true)
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
          className="w-auto min-w-[var(--anchor-width,var(--radix-popover-trigger-width,var(--trigger-width)))] gap-0 p-1"
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
      className={cn(
        "flex items-center gap-(--density-8) *:data-[slot=time-input]:w-36",
        className
      )}
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
        className="size-(--density-icon-16) shrink-0 text-muted-foreground"
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
          className="shrink-0 text-(length:--density-text-13) whitespace-nowrap text-muted-foreground tabular-nums"
        >
          {formatTimeDuration(duration)}
        </span>
      )}
    </div>
  )
}

export { TimeInput, TimeRangeInput, type TimeRangeValue }
