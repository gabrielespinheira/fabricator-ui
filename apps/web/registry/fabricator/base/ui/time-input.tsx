"use client"

// Time Input: a text field that takes a typed time or one picked on a wheel.
// Clicking the field opens the wheel under it (hours, minutes, optional
// seconds and AM/PM, as in the iOS Clock app) while the field keeps focus for
// typing; Arrow Down or Up opens it with focus on the hours. Typing (9, 930,
// 9:30 pm, 21:30:15, noon) commits on Enter or blur; the wheel commits as it
// settles. The value is "HH:mm", or "HH:mm:ss" with seconds, what a form
// submits. Time Range Input pairs two of them: the end stays after the start,
// and moving the start keeps the duration. The rules are in
// lib/time-input-model.
import * as React from "react"
import { cn } from "cn"

import {
  addMinutesToTime,
  commitTimeText,
  formatTimeDuration,
  formatTimeValue,
  getLocaleHourCycle,
  getTimeDuration,
  joinTime,
  shiftEndTime,
  splitTime,
  type HourCycle,
} from "@/registry/bases/base/lib/time-input-model"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/registry/bases/base/ui/input-group"
import { Popover, PopoverContent } from "@/registry/bases/base/ui/popover"
import { TimeWheel } from "@/registry/bases/base/ui/time-wheel"
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

/** A typed or set value in the field's form: with seconds or without. */
function toFieldTime(time: string | undefined, hasSeconds: boolean) {
  return time && joinTime(splitTime(time), { hasSeconds })
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
    /** Adds a seconds wheel; the value becomes "HH:mm:ss". */
    hasSeconds?: boolean
    /** Minutes between the minute wheel's rows. */
    step?: number
    minTime?: string
    maxTime?: string
    /** The start of a range: the value has to come after it. */
    startTime?: string
    name?: string
    wheelLabel?: string
  }
) {
  const {
    value,
    defaultValue,
    onValueChange,
    hourCycle: hourCycleProp,
    hasSeconds = false,
    step = 1,
    minTime,
    maxTime,
    startTime,
    name,
    wheelLabel = "Choose time",
    className,
    style,
    disabled,
    "aria-invalid": ariaInvalid,
    onBlur,
    onChange,
    onClick,
    onKeyDown,
    ref,
    ...inputProps
  } = props
  const hourCycle = useHourCycle(hourCycleProp)
  const isControlled = "value" in props
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = toFieldTime(
    isControlled ? value : uncontrolledValue,
    hasSeconds
  )

  const [text, setText] = React.useState(() =>
    formatTimeValue(currentValue, { hourCycle })
  )
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [syncedHourCycle, setSyncedHourCycle] = React.useState(hourCycle)
  const [isOpen, setIsOpen] = React.useState(false)
  // The wheel's popup is at least as wide as the field.
  const [fieldWidth, setFieldWidth] = React.useState<number>()
  const groupRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const wheelId = React.useId()

  // An end must come after its start, typed or picked.
  const earliestTime = startTime ? addMinutesToTime(startTime, 1) : minTime
  // The field is never narrower than its longest time, so none is cropped.
  const widestText = formatTimeValue(hasSeconds ? "22:00:00" : "22:00", {
    hourCycle,
  })

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

  function openWheel({ focusWheel }: { focusWheel: boolean }) {
    if (disabled) return
    setFieldWidth(groupRef.current?.offsetWidth)
    setIsOpen(true)
    if (!focusWheel) return
    requestAnimationFrame(() =>
      document
        .getElementById(wheelId)
        ?.querySelector<HTMLElement>('[role="spinbutton"]')
        ?.focus()
    )
  }

  function closeWheel({ focusField }: { focusField: boolean }) {
    setIsOpen(false)
    if (focusField) inputRef.current?.focus()
  }

  function commitText() {
    const commit = commitTimeText(text, {
      hourCycle,
      minTime: earliestTime,
      maxTime,
    })
    setText(commit.text)
    setIsTextInvalid(commit.isInvalid)
    updateValue(toFieldTime(commit.value, hasSeconds))
    return commit
  }

  function pickTime(time: string) {
    setText(formatTimeValue(time, { hourCycle }))
    setIsTextInvalid(false)
    updateValue(time)
  }

  return (
    <div
      data-slot="time-input"
      className={cn("cn-time-input w-full min-w-fit", className)}
    >
      <InputGroup ref={groupRef}>
        <InputGroupAddon
          align="inline-start"
          onClick={() => openWheel({ focusWheel: false })}
        >
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
          ref={(element) => {
            inputRef.current = element
            if (typeof ref === "function") return ref(element)
            if (ref) ref.current = element
          }}
          type="text"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-controls={isOpen ? wheelId : undefined}
          aria-invalid={ariaInvalid || isTextInvalid || undefined}
          style={{ minWidth: `${widestText.length}ch`, ...style }}
          disabled={disabled}
          value={text}
          onClick={(event) => {
            openWheel({ focusWheel: false })
            onClick?.(event)
          }}
          onChange={(event) => {
            setText(event.target.value)
            onChange?.(event)
          }}
          onBlur={(event) => {
            commitText()
            onBlur?.(event)
          }}
          onKeyDown={(event) => {
            onKeyDown?.(event)
            if (event.defaultPrevented) return
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault()
              commitText()
              openWheel({ focusWheel: true })
            } else if (event.key === "Escape" && isOpen) {
              event.preventDefault()
              event.stopPropagation()
              closeWheel({ focusField: false })
            } else if (event.key === "Enter") {
              const committedText = text
              const commit = commitText()
              closeWheel({ focusField: false })
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
          // A press on the field itself keeps the wheel; the field handles it.
          const target = details.event?.target
          if (target instanceof Node && groupRef.current?.contains(target)) {
            return
          }
          if (!open) setIsOpen(false)
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
          <TimeWheel
            id={wheelId}
            value={currentValue}
            onValueChange={pickTime}
            hourCycle={hourCycle}
            hasSeconds={hasSeconds}
            step={step}
            minTime={earliestTime}
            maxTime={maxTime}
            label={wheelLabel}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== "Escape") return
              event.preventDefault()
              event.stopPropagation()
              closeWheel({ focusField: true })
            }}
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
    step = 1,
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
      ? shiftEndTime(range.start, range.end, start, 60)
      : range.end && !getTimeDuration(start, range.end)
        ? shiftEndTime(start, undefined, start, 60)
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
        wheelLabel={startLabel}
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
        wheelLabel={endLabel}
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

export { TimeInput, TimeRangeInput, useHourCycle, type TimeRangeValue }
