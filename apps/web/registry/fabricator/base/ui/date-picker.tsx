"use client"

// Date Picker: a date field. By default the field is a button that opens a
// calendar; with `hasTime` a column of times sits beside the calendar and the
// value is that day at that time. `editable` makes the field a text input as
// well, which reads the display format, ISO yyyy-MM-dd, today, tomorrow or
// yesterday, and a time after a comma or "at". The rules are in
// lib/date-picker-model and lib/time-input-model.
import * as React from "react"
import { cn } from "cn"
import { type Locale } from "date-fns"

import {
  commitDateText,
  DEFAULT_DATE_FORMAT,
  formatDateValue,
  formatIsoDate,
  formatIsoDateTime,
  isSameDateValue,
  parseDateText,
  setDateTime,
  splitDateTimeText,
} from "@/registry/bases/base/lib/date-picker-model"
import {
  formatTimeValue,
  getTimeOfDay,
  parseTimeText,
  type HourCycle,
} from "@/registry/bases/base/lib/time-input-model"
import { Calendar } from "@/registry/bases/base/ui/calendar"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/bases/base/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/bases/base/ui/popover"
import { useHourCycle } from "@/registry/bases/base/ui/time-input"
import { TimeWheel } from "@/registry/bases/base/ui/time-wheel"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function DatePickerPanel({
  day,
  time,
  defaultMonth,
  hasTime,
  hasSeconds,
  step,
  hourCycle,
  locale,
  minDate,
  maxDate,
  timeListId,
  timeLabel,
  onDayChange,
  onTimeChange,
  onTimeDone,
}: {
  day: Date | undefined
  time: string | undefined
  defaultMonth: Date | undefined
  hasTime: boolean
  hasSeconds: boolean
  step: number
  hourCycle: HourCycle
  locale: Locale | undefined
  minDate: Date | undefined
  maxDate: Date | undefined
  timeListId: string
  timeLabel: string
  onDayChange: (day: Date) => void
  onTimeChange: (time: string) => void
  onTimeDone: () => void
}) {
  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

  return (
    <div data-slot="date-picker-panel" className="cn-date-picker-panel flex">
      <Calendar
        mode="single"
        required
        autoFocus
        selected={day}
        defaultMonth={defaultMonth}
        onSelect={onDayChange}
        locale={locale}
        disabled={disabledDays}
        startMonth={minDate}
        endMonth={maxDate}
      />
      {hasTime && (
        // The wheel is as tall as the calendar beside it.
        <div data-slot="date-picker-time" className="cn-date-picker-time flex">
          <TimeWheel
            id={timeListId}
            value={time}
            onValueChange={onTimeChange}
            hourCycle={hourCycle}
            hasSeconds={hasSeconds}
            step={step}
            label={timeLabel}
            className="cn-date-picker-time-wheel h-full"
            onKeyDown={(event) => {
              if (event.key !== "Enter") return
              event.preventDefault()
              onTimeDone()
            }}
          />
        </div>
      )}
    </div>
  )
}

function DatePicker(
  props: Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "type" | "min" | "max" | "step"
  > & {
    value?: Date
    defaultValue?: Date
    onValueChange?: (value: Date | undefined) => void
    format?: string
    locale?: Locale
    minDate?: Date
    maxDate?: Date
    name?: string
    calendarLabel?: string
    /** Lets people type the date (and time) as well as pick it. */
    editable?: boolean
    /** Adds a time wheel beside the calendar. */
    hasTime?: boolean
    /** Adds a seconds wheel; the time gets seconds. */
    hasSeconds?: boolean
    step?: number
    hourCycle?: HourCycle
    timeLabel?: string
  }
) {
  const {
    value,
    defaultValue,
    onValueChange,
    format = DEFAULT_DATE_FORMAT,
    locale,
    minDate,
    maxDate,
    name,
    calendarLabel = "Choose date",
    editable = false,
    hasTime = false,
    hasSeconds = false,
    step = 1,
    hourCycle: hourCycleProp,
    timeLabel = "Choose time",
    placeholder = hasTime ? "Pick a date and time" : "Pick a date",
    className,
    disabled,
    "aria-invalid": ariaInvalid,
    onBlur,
    onChange,
    onKeyDown,
    ref,
    ...inputProps
  } = props
  const hourCycle = useHourCycle(hourCycleProp)
  const isControlled = "value" in props
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = isControlled ? value : uncontrolledValue
  const formatOptions = { format, locale }

  function formatFieldText(date: Date | undefined) {
    const dateText = formatDateValue(date, formatOptions)
    if (!date || !hasTime) return dateText
    return `${dateText}, ${formatTimeValue(getTimeOfDay(date, { hasSeconds }), {
      hourCycle,
    })}`
  }

  const [text, setText] = React.useState(() => formatFieldText(currentValue))
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [syncedHourCycle, setSyncedHourCycle] = React.useState(hourCycle)
  const [isOpen, setIsOpen] = React.useState(false)
  // What the open panel holds until it makes a whole value.
  const [draftDay, setDraftDay] = React.useState<Date>()
  const [draftTime, setDraftTime] = React.useState<string>()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const groupRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const timeListId = React.useId()
  const contentRef = React.useRef<HTMLDivElement>(null)

  // A value set from outside, or a new clock, rewrites the text.
  if (
    !isSameDateValue(syncedValue, currentValue) ||
    syncedHourCycle !== hourCycle
  ) {
    setSyncedValue(currentValue)
    setSyncedHourCycle(hourCycle)
    setText(formatFieldText(currentValue))
    setIsTextInvalid(false)
  }

  function updateValue(nextValue: Date | undefined) {
    setSyncedValue(nextValue)
    if (isSameDateValue(nextValue, currentValue)) return
    if (!isControlled) setUncontrolledValue(nextValue)
    onValueChange?.(nextValue)
  }

  function commitValue(nextValue: Date) {
    setText(formatFieldText(nextValue))
    setIsTextInvalid(false)
    updateValue(nextValue)
  }

  function changeOpen(open: boolean) {
    if (open) {
      setDraftDay(currentValue)
      // The wheel always shows a time: the value's, or now.
      setDraftTime(
        hasTime
          ? getTimeOfDay(currentValue ?? new Date(), { hasSeconds })
          : undefined
      )
    }
    setIsOpen(open)
  }

  function selectDay(day: Date) {
    setDraftDay(day)
    if (!hasTime) {
      commitValue(day)
      setIsOpen(false)
      return
    }
    commitValue(
      setDateTime(day, draftTime ?? getTimeOfDay(new Date(), { hasSeconds }))
    )
  }

  function selectTime(time: string) {
    setDraftTime(time)
    // The wheel moves the value as it settles; it stays open for the next
    // column, and closes on Enter or a click elsewhere.
    if (draftDay) commitValue(setDateTime(draftDay, time))
  }

  function commitText() {
    const { dateText, timeText } = hasTime
      ? splitDateTimeText(text)
      : { dateText: text, timeText: undefined }
    const commit = commitDateText(dateText, {
      ...formatOptions,
      minDate,
      maxDate,
      referenceDate: new Date(),
    })
    const typedTime = timeText ? parseTimeText(timeText) : undefined
    const isTimeInvalid = Boolean(timeText && !typedTime)
    const keptTime = currentValue
      ? getTimeOfDay(currentValue, { hasSeconds })
      : "00:00"
    const nextValue =
      commit.value && hasTime && !isTimeInvalid
        ? setDateTime(commit.value, typedTime ?? keptTime)
        : isTimeInvalid
          ? undefined
          : commit.value
    const nextText = nextValue ? formatFieldText(nextValue) : commit.text
    setText(isTimeInvalid ? text : nextText)
    setIsTextInvalid(commit.isInvalid || isTimeInvalid)
    updateValue(nextValue)
    return { text: nextText, isInvalid: commit.isInvalid || isTimeInvalid }
  }

  const typedDate = editable
    ? parseDateText(hasTime ? splitDateTimeText(text).dateText : text, {
        ...formatOptions,
        referenceDate: new Date(),
      })
    : undefined

  const panel = (
    <DatePickerPanel
      day={draftDay}
      time={draftTime}
      defaultMonth={typedDate ?? draftDay}
      hasTime={hasTime}
      hasSeconds={hasSeconds}
      step={step}
      hourCycle={hourCycle}
      locale={locale}
      minDate={minDate}
      maxDate={maxDate}
      timeListId={timeListId}
      timeLabel={timeLabel}
      onDayChange={selectDay}
      onTimeChange={selectTime}
      onTimeDone={() => setIsOpen(false)}
    />
  )

  const hiddenInput = name && (
    <input
      type="hidden"
      data-slot="date-picker-value"
      name={name}
      value={
        hasTime
          ? formatIsoDateTime(currentValue, { hasSeconds })
          : formatIsoDate(currentValue)
      }
      disabled={disabled}
    />
  )

  if (!editable) {
    return (
      <div
        data-slot="date-picker"
        className={cn("cn-date-picker w-full min-w-fit", className)}
      >
        <Popover open={isOpen} onOpenChange={changeOpen}>
          <PopoverTrigger
            id={inputProps.id}
            aria-label={inputProps["aria-label"]}
            aria-labelledby={inputProps["aria-labelledby"]}
            aria-describedby={inputProps["aria-describedby"]}
            aria-haspopup="dialog"
            aria-invalid={ariaInvalid || undefined}
            disabled={disabled}
            data-slot="date-picker-field"
            data-placeholder={currentValue ? undefined : ""}
            className="cn-date-picker-field flex w-full items-center whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconPlaceholder
              lucide="CalendarIcon"
              tabler="IconCalendar"
              hugeicons="CalendarIcon"
              phosphor="CalendarIcon"
              remixicon="RiCalendarLine"
              aria-hidden
              className="cn-date-picker-field-icon shrink-0"
            />
            <span className="truncate">
              {currentValue ? text : placeholder}
            </span>
          </PopoverTrigger>
          <PopoverContent
            aria-label={calendarLabel}
            align="start"
            ref={contentRef}
            // Open on the calendar's day (the picked one, or today), not on
            // the popup itself.
            initialFocus={() =>
              contentRef.current?.querySelector<HTMLElement>(
                '[data-slot="calendar"] [tabindex="0"]'
              ) ?? true
            }
            className="cn-date-picker-content w-auto overflow-hidden"
          >
            {panel}
          </PopoverContent>
        </Popover>
        {hiddenInput}
      </div>
    )
  }

  return (
    <div
      data-slot="date-picker"
      className={cn("cn-date-picker w-full min-w-0", className)}
    >
      <InputGroup ref={groupRef}>
        <InputGroupInput
          ref={(element) => {
            inputRef.current = element
            if (typeof ref === "function") return ref(element)
            if (ref) ref.current = element
          }}
          type="text"
          autoComplete="off"
          aria-keyshortcuts="Alt+ArrowDown"
          aria-invalid={ariaInvalid || isTextInvalid || undefined}
          disabled={disabled}
          placeholder={placeholder}
          value={text}
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
            if (event.key === "ArrowDown" && event.altKey) {
              event.preventDefault()
              commitText()
              changeOpen(true)
            } else if (event.key === "Enter") {
              const committedText = text
              const commit = commitText()
              // Show the rewritten date before a second Enter submits the form.
              if (commit.text !== committedText || commit.isInvalid) {
                event.preventDefault()
              }
            }
          }}
          {...inputProps}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={isOpen} onOpenChange={changeOpen}>
            <PopoverTrigger
              ref={triggerRef}
              disabled={disabled}
              render={
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label={calendarLabel}
                  className="cn-date-picker-trigger"
                />
              }
            >
              <IconPlaceholder
                lucide="CalendarIcon"
                tabler="IconCalendar"
                hugeicons="CalendarIcon"
                phosphor="CalendarIcon"
                remixicon="RiCalendarLine"
              />
            </PopoverTrigger>
            <PopoverContent
              aria-label={calendarLabel}
              align="end"
              // Line the calendar up with the field's edge, not the button's.
              alignOffset={() => {
                const group = groupRef.current?.getBoundingClientRect()
                const trigger = triggerRef.current?.getBoundingClientRect()
                return group && trigger ? trigger.right - group.right : 0
              }}
              initialFocus={false}
              finalFocus={inputRef}
              className="cn-date-picker-content w-auto overflow-hidden"
            >
              {panel}
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
      {hiddenInput}
    </div>
  )
}

export { DatePicker }
