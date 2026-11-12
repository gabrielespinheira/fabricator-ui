"use client"

// Date Picker: a date field. By default the field is a button that opens a
// calendar; with `hasTime` a column of times sits beside the calendar and the
// value is that day at that time. `granularity` picks a month or a year from a
// grid of twelve instead, and the value is its first day. `editable` makes the
// field a text input as well, which reads the display format, ISO yyyy-MM-dd,
// today, tomorrow or yesterday, and a time after a comma or "at" (or a month or
// year's own forms). The rules are in lib/date-picker-model and
// lib/time-input-model.
import * as React from "react"
import { cn } from "cn"
import { type Locale } from "date-fns"

import {
  commitDateText,
  formatDateValue,
  formatIsoDate,
  formatIsoDateTime,
  getDateGridOptions,
  getDateGridTitle,
  getDefaultDateFormat,
  isSameDateGridPage,
  isSameDateValue,
  moveDateCell,
  parseDateText,
  setDateTime,
  splitDateTimeText,
  startOfGranularity,
  type DateGranularity,
  type DateGridGranularity,
} from "@/registry/bases/radix/lib/date-picker-model"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
} from "@/registry/bases/radix/lib/fluid-hover"
import {
  formatTimeValue,
  getTimeOfDay,
  parseTimeText,
  type HourCycle,
} from "@/registry/bases/radix/lib/time-input-model"
import { Button } from "@/registry/bases/radix/ui/button"
import { Calendar } from "@/registry/bases/radix/ui/calendar"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/bases/radix/ui/input-group"
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/bases/radix/ui/popover"
import { useHourCycle } from "@/registry/bases/radix/ui/time-input"
import { TimeWheel } from "@/registry/bases/radix/ui/time-wheel"
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

// Arrow keys move by one cell and by a row of three; Page Up and Page Down by
// a page of twelve.
const GRID_MOVES: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -3,
  ArrowDown: 3,
  PageUp: -12,
  PageDown: 12,
}

const GRID_PAGE_LABELS: Record<
  DateGridGranularity,
  { previous: string; next: string }
> = {
  month: { previous: "Previous year", next: "Next year" },
  year: { previous: "Previous years", next: "Next years" },
}

function DatePickerGrid({
  value,
  defaultFocus,
  granularity,
  minDate,
  maxDate,
  locale,
  label,
  onSelect,
}: {
  value: Date | undefined
  defaultFocus: Date | undefined
  granularity: DateGridGranularity
  minDate: Date | undefined
  maxDate: Date | undefined
  locale: Locale | undefined
  label: string
  onSelect: (value: Date) => void
}) {
  const [focusedCell, setFocusedCell] = React.useState(() =>
    startOfGranularity(defaultFocus ?? new Date(), granularity)
  )
  const [direction, setDirection] = React.useState<"previous" | "next">()
  const toKey = (date: Date | undefined) => formatIsoDate(date, { granularity })
  const focusedKey = toKey(focusedCell)
  const selectedKey = toKey(value)
  const currentKey = toKey(new Date())
  const title = getDateGridTitle(focusedCell, granularity)
  const options = getDateGridOptions(focusedCell, {
    granularity,
    minDate,
    maxDate,
    locale,
  })
  const pageLabels = GRID_PAGE_LABELS[granularity]
  const gridRef = React.useRef<HTMLDivElement>(null)
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="gridcell"]',
    highlighted: "[data-highlighted]",
    selected: '[aria-selected="true"]',
    axis: "xy",
  })

  // Focus follows the focused cell, including onto a new page.
  React.useEffect(() => {
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-value="${focusedKey}"]`)
      ?.focus()
  }, [focusedKey])

  function moveFocus(amount: number) {
    const next = moveDateCell(focusedCell, amount, granularity)
    if (!isSameDateGridPage(next, focusedCell, granularity)) {
      setDirection(amount > 0 ? "next" : "previous")
    }
    setFocusedCell(next)
  }

  return (
    <div
      data-slot="date-picker-grid-panel"
      className="cn-date-picker-grid-panel flex flex-col"
    >
      <div
        data-slot="date-picker-grid-header"
        className="cn-date-picker-grid-header flex items-center justify-between"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={pageLabels.previous}
          onClick={() => moveFocus(-12)}
        >
          <IconPlaceholder
            lucide="ChevronLeftIcon"
            tabler="IconChevronLeft"
            hugeicons="ArrowLeft01Icon"
            phosphor="CaretLeftIcon"
            remixicon="RiArrowLeftSLine"
          />
        </Button>
        <span
          aria-live="polite"
          data-slot="date-picker-grid-title"
          className="cn-date-picker-grid-title"
        >
          {title}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={pageLabels.next}
          onClick={() => moveFocus(12)}
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
      <div
        key={title}
        ref={(element) => {
          gridRef.current = element
          fluid.attach(element)
        }}
        role="grid"
        aria-label={`${label}, ${title}`}
        data-slot="date-picker-grid"
        data-direction={direction}
        className="cn-date-picker-grid relative isolate grid grid-cols-3"
        onKeyDown={(event) => {
          const move = GRID_MOVES[event.key]
          if (move === undefined) return
          event.preventDefault()
          moveFocus(move)
        }}
        {...fluid.props}
      >
        <FluidHoverSelection selection={fluid.selection} />
        <FluidHoverHighlight hover={fluid.hover} />
        {[0, 3, 6, 9].map((rowStart) => (
          <div key={rowStart} role="row" className="contents">
            {options.slice(rowStart, rowStart + 3).map((option) => {
              const key = toKey(option.value)
              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  tabIndex={key === focusedKey ? 0 : -1}
                  disabled={option.isDisabled}
                  aria-selected={key === selectedKey}
                  aria-label={option.fullLabel}
                  data-value={key}
                  data-slot="date-picker-cell"
                  data-highlighted={key === focusedKey || undefined}
                  data-current={key === currentKey || undefined}
                  className="cn-date-picker-cell relative flex items-center justify-center outline-none select-none"
                  onFocus={() => setFocusedCell(option.value)}
                  onClick={() => onSelect(option.value)}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

const CALENDAR_LABELS: Record<DateGranularity, string> = {
  day: "Choose date",
  month: "Choose month",
  year: "Choose year",
}

const PLACEHOLDERS: Record<DateGranularity, string> = {
  day: "Pick a date",
  month: "Pick a month",
  year: "Pick a year",
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
    /** What the value is: a day from a calendar, or a month or year from a grid. */
    granularity?: DateGranularity
    /** Lets people type the date (and time) as well as pick it. */
    editable?: boolean
    /** Adds a time wheel beside the calendar. Days only. */
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
    granularity = "day",
    format = getDefaultDateFormat(granularity),
    locale,
    minDate,
    maxDate,
    name,
    calendarLabel = CALENDAR_LABELS[granularity],
    editable = false,
    hasTime: hasTimeProp = false,
    hasSeconds = false,
    step = 1,
    hourCycle: hourCycleProp,
    timeLabel = "Choose time",
    placeholder = hasTimeProp && granularity === "day"
      ? "Pick a date and time"
      : PLACEHOLDERS[granularity],
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
  // A month or a year has no time of day.
  const hasTime = hasTimeProp && granularity === "day"
  const isControlled = "value" in props
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = isControlled ? value : uncontrolledValue
  const formatOptions = { format, locale, granularity }

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
  const wasDismissedOutside = React.useRef(false)
  const timeListId = React.useId()

  // A value set from outside, or a new clock, rewrites the text.
  if (
    !isSameDateValue(syncedValue, currentValue, { granularity }) ||
    syncedHourCycle !== hourCycle
  ) {
    setSyncedValue(currentValue)
    setSyncedHourCycle(hourCycle)
    setText(formatFieldText(currentValue))
    setIsTextInvalid(false)
  }

  function updateValue(nextValue: Date | undefined) {
    setSyncedValue(nextValue)
    if (isSameDateValue(nextValue, currentValue, { granularity })) return
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

  const panel =
    granularity === "day" ? (
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
    ) : (
      <DatePickerGrid
        value={currentValue}
        defaultFocus={typedDate ?? currentValue}
        granularity={granularity}
        minDate={minDate}
        maxDate={maxDate}
        locale={locale}
        label={calendarLabel}
        onSelect={selectDay}
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
          : formatIsoDate(currentValue, { granularity })
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
      <Popover open={isOpen} onOpenChange={changeOpen}>
        <PopoverAnchor asChild>
          <InputGroup>
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
              <PopoverTrigger asChild disabled={disabled}>
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label={calendarLabel}
                  className="cn-date-picker-trigger"
                >
                  <IconPlaceholder
                    lucide="CalendarIcon"
                    tabler="IconCalendar"
                    hugeicons="CalendarIcon"
                    phosphor="CalendarIcon"
                    remixicon="RiCalendarLine"
                  />
                </InputGroupButton>
              </PopoverTrigger>
            </InputGroupAddon>
          </InputGroup>
        </PopoverAnchor>
        <PopoverContent
          aria-label={calendarLabel}
          align="end"
          onOpenAutoFocus={(event) => event.preventDefault()}
          onPointerDownOutside={() => {
            wasDismissedOutside.current = true
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault()
            // A click elsewhere keeps the focus where it landed.
            if (!wasDismissedOutside.current) inputRef.current?.focus()
            wasDismissedOutside.current = false
          }}
          className="cn-date-picker-content w-auto overflow-hidden"
        >
          {panel}
        </PopoverContent>
      </Popover>
      {hiddenInput}
    </div>
  )
}

export { DatePicker }
