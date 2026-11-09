"use client"

// Month Input: a text field that takes a typed month or one picked from a year
// of months. Typing commits on blur and Enter (Nov 2026, 2026-11, 11/2026,
// next month); Alt+ArrowDown or the button opens the grid. The value is
// "yyyy-MM", what a form submits. The rules are in lib/month-input-model.
import * as React from "react"
import { cn } from "cn"
import { type Locale } from "date-fns"

import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
} from "@/registry/bases/radix/lib/fluid-hover"
import {
  commitMonthText,
  DEFAULT_MONTH_FORMAT,
  formatMonthValue,
  getMonthOptions,
  getMonthYear,
  moveMonth,
  toMonthValue,
} from "@/registry/bases/radix/lib/month-input-model"
import { Button } from "@/registry/bases/radix/ui/button"
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
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const MONTH_MOVES: Record<string, number> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -3,
  ArrowDown: 3,
  PageUp: -12,
  PageDown: 12,
}

function MonthInputGrid({
  value,
  minMonth,
  maxMonth,
  locale,
  label,
  onSelect,
}: {
  value: string | undefined
  minMonth?: string
  maxMonth?: string
  locale?: Locale
  label: string
  onSelect: (month: string) => void
}) {
  const [focusedMonth, setFocusedMonth] = React.useState(
    () => value ?? toMonthValue(new Date())
  )
  const [direction, setDirection] = React.useState<"previous" | "next">()
  const year = getMonthYear(focusedMonth)
  const thisMonth = toMonthValue(new Date())
  const options = getMonthOptions(year, { minMonth, maxMonth, locale })
  const gridRef = React.useRef<HTMLDivElement>(null)
  const fluid = useFluidHover<HTMLDivElement>({
    items: '[role="gridcell"]',
    highlighted: "[data-highlighted]",
    selected: '[aria-selected="true"]',
    axis: "xy",
  })

  // Focus follows the focused month, including into a new year's grid.
  React.useEffect(() => {
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-month="${focusedMonth}"]`)
      ?.focus()
  }, [focusedMonth])

  function moveFocus(months: number) {
    const next = moveMonth(focusedMonth, months)
    if (getMonthYear(next) !== year) {
      setDirection(months > 0 ? "next" : "previous")
    }
    setFocusedMonth(next)
  }

  function moveYear(years: number) {
    setDirection(years > 0 ? "next" : "previous")
    setFocusedMonth(moveMonth(focusedMonth, years * 12))
  }

  return (
    <div data-slot="month-input-picker" className="flex flex-col">
      <div
        data-slot="month-input-header"
        className="cn-month-input-header flex items-center justify-between"
      >
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous year"
          onClick={() => moveYear(-1)}
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
          data-slot="month-input-year"
          className="cn-month-input-year"
        >
          {year}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next year"
          onClick={() => moveYear(1)}
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
        key={year}
        ref={(element) => {
          gridRef.current = element
          fluid.attach(element)
        }}
        role="grid"
        aria-label={`${label}, ${year}`}
        data-slot="month-input-grid"
        data-direction={direction}
        className="cn-month-input-grid relative isolate grid grid-cols-3"
        onKeyDown={(event) => {
          const move = MONTH_MOVES[event.key]
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
            {options.slice(rowStart, rowStart + 3).map((option) => (
              <button
                key={option.value}
                type="button"
                role="gridcell"
                tabIndex={option.value === focusedMonth ? 0 : -1}
                disabled={option.isDisabled}
                aria-selected={option.value === value}
                aria-label={formatMonthValue(option.value, {
                  format: "MMMM yyyy",
                  locale,
                })}
                data-month={option.value}
                data-slot="month-input-month"
                data-highlighted={option.value === focusedMonth || undefined}
                data-current={option.value === thisMonth || undefined}
                className="cn-month-input-month relative flex items-center justify-center outline-none select-none"
                onFocus={() => setFocusedMonth(option.value)}
                onClick={() => onSelect(option.value)}
              >
                {option.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthInput(
  props: Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "type" | "min" | "max"
  > & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string | undefined) => void
    format?: string
    locale?: Locale
    minMonth?: string
    maxMonth?: string
    name?: string
    pickerLabel?: string
  }
) {
  const {
    value,
    defaultValue,
    onValueChange,
    format = DEFAULT_MONTH_FORMAT,
    locale,
    minMonth,
    maxMonth,
    name,
    pickerLabel = "Choose month",
    className,
    disabled,
    "aria-invalid": ariaInvalid,
    onBlur,
    onChange,
    onKeyDown,
    ref,
    ...inputProps
  } = props
  const isControlled = "value" in props
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue)
  const currentValue = isControlled ? value : uncontrolledValue
  const formatOptions = { format, locale }

  const [text, setText] = React.useState(() =>
    formatMonthValue(currentValue, formatOptions)
  )
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [isOpen, setIsOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const wasDismissedOutside = React.useRef(false)

  // A value set from outside replaces the text.
  if (syncedValue !== currentValue) {
    setSyncedValue(currentValue)
    setText(formatMonthValue(currentValue, formatOptions))
    setIsTextInvalid(false)
  }

  function updateValue(nextValue: string | undefined) {
    setSyncedValue(nextValue)
    if (nextValue === currentValue) return
    if (!isControlled) setUncontrolledValue(nextValue)
    onValueChange?.(nextValue)
  }

  function commitText() {
    const commit = commitMonthText(text, {
      ...formatOptions,
      minMonth,
      maxMonth,
      referenceDate: new Date(),
    })
    setText(commit.text)
    setIsTextInvalid(commit.isInvalid)
    updateValue(commit.value)
    return commit
  }

  function selectMonth(month: string) {
    setText(formatMonthValue(month, formatOptions))
    setIsTextInvalid(false)
    updateValue(month)
    setIsOpen(false)
  }

  return (
    <div
      data-slot="month-input"
      className={cn("cn-month-input w-full min-w-0", className)}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
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
                  setIsOpen(true)
                } else if (event.key === "Enter") {
                  const committedText = text
                  const commit = commitText()
                  // Show the rewritten month before a second Enter submits the form.
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
                  aria-label={pickerLabel}
                  className="cn-month-input-trigger"
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
          aria-label={pickerLabel}
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
          className="cn-month-input-content"
        >
          <MonthInputGrid
            value={currentValue}
            minMonth={minMonth}
            maxMonth={maxMonth}
            locale={locale}
            label={pickerLabel}
            onSelect={selectMonth}
          />
        </PopoverContent>
      </Popover>
      {name && (
        <input
          type="hidden"
          data-slot="month-input-value"
          name={name}
          value={currentValue ?? ""}
          disabled={disabled}
        />
      )}
    </div>
  )
}

export { MonthInput }
