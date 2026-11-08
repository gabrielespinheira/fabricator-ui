"use client"

// Date Picker: a text field that takes a typed date or one picked from a
// calendar. Typing commits on blur and Enter (the display format, ISO
// yyyy-MM-dd, today, tomorrow or yesterday); Alt+ArrowDown or the button opens
// the calendar. The rules are in lib/date-picker-model.
import * as React from "react"
import { cn } from "cn"
import { type Locale } from "date-fns"

import {
  commitDateText,
  DEFAULT_DATE_FORMAT,
  formatDateValue,
  formatIsoDate,
  isSameDateValue,
  parseDateText,
} from "@/registry/bases/base/lib/date-picker-model"
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
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

function DatePicker(
  props: Omit<
    React.ComponentProps<"input">,
    "value" | "defaultValue" | "type" | "min" | "max"
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
    formatDateValue(currentValue, formatOptions)
  )
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [isOpen, setIsOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const groupRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)

  // A value set from outside replaces the text.
  if (!isSameDateValue(syncedValue, currentValue)) {
    setSyncedValue(currentValue)
    setText(formatDateValue(currentValue, formatOptions))
    setIsTextInvalid(false)
  }

  function updateValue(nextValue: Date | undefined) {
    setSyncedValue(nextValue)
    if (isSameDateValue(nextValue, currentValue)) return
    if (!isControlled) setUncontrolledValue(nextValue)
    onValueChange?.(nextValue)
  }

  function commitText() {
    const commit = commitDateText(text, {
      ...formatOptions,
      minDate,
      maxDate,
      referenceDate: new Date(),
    })
    setText(commit.text)
    setIsTextInvalid(commit.isInvalid)
    updateValue(commit.value)
    return commit
  }

  function selectDate(date: Date | undefined) {
    if (!date) return
    setText(formatDateValue(date, formatOptions))
    setIsTextInvalid(false)
    updateValue(date)
    setIsOpen(false)
  }

  const typedDate = parseDateText(text, {
    ...formatOptions,
    referenceDate: new Date(),
  })
  const disabledDays = [
    ...(minDate ? [{ before: minDate }] : []),
    ...(maxDate ? [{ after: maxDate }] : []),
  ]

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
              // Show the rewritten date before a second Enter submits the form.
              if (commit.text !== committedText || commit.isInvalid) {
                event.preventDefault()
              }
            }
          }}
          {...inputProps}
        />
        <InputGroupAddon align="inline-end">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
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
              <Calendar
                mode="single"
                autoFocus
                selected={currentValue}
                defaultMonth={typedDate ?? currentValue}
                onSelect={selectDate}
                locale={locale}
                disabled={disabledDays}
                startMonth={minDate}
                endMonth={maxDate}
              />
            </PopoverContent>
          </Popover>
        </InputGroupAddon>
      </InputGroup>
      {name && (
        <input
          type="hidden"
          data-slot="date-picker-value"
          name={name}
          value={formatIsoDate(currentValue)}
          disabled={disabled}
        />
      )}
    </div>
  )
}

export { DatePicker }
