import * as React from "react"
import { CalendarIcon } from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { type Locale } from "date-fns"
import { TextInput, View } from "react-native"

import {
  commitDateText,
  DEFAULT_DATE_FORMAT,
  formatDateValue,
  isSameDateValue,
  parseDateText,
} from "@/registry/fabricator/shared/lib/date-picker-model"
import { Calendar } from "@/registry/native/ui/calendar"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/registry/native/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/registry/native/ui/popover"

// Date Picker: a text field that takes a typed date or one picked from a
// calendar. Typing commits on blur and the return key (the display format, ISO
// yyyy-MM-dd, today, tomorrow or yesterday); the button opens the calendar. The
// rules are the website's, in lib/date-picker-model.

function DatePicker(
  props: Omit<
    React.ComponentProps<typeof TextInput>,
    "value" | "defaultValue" | "editable"
  > & {
    value?: Date
    defaultValue?: Date
    onValueChange?: (value: Date | undefined) => void
    format?: string
    locale?: Locale
    minDate?: Date
    maxDate?: Date
    /** Kept so code moves across: React Native has no form to submit. */
    name?: string
    calendarLabel?: string
    disabled?: boolean
    "aria-invalid"?: boolean
    className?: string
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
    name: _name,
    calendarLabel = "Choose date",
    disabled = false,
    "aria-invalid": ariaInvalid,
    className,
    onBlur,
    onChangeText,
    onSubmitEditing,
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
    <View
      data-slot="date-picker"
      className={cn("cn-date-picker min-w-0", className)}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <InputGroup>
          <InputGroupInput
            value={text}
            aria-invalid={Boolean(ariaInvalid) || isTextInvalid}
            editable={!disabled}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
            className="cn-date-picker-text"
            onChangeText={(nextText) => {
              setText(nextText)
              onChangeText?.(nextText)
            }}
            onBlur={(event) => {
              commitText()
              onBlur?.(event)
            }}
            onSubmitEditing={(event) => {
              commitText()
              onSubmitEditing?.(event)
            }}
            {...inputProps}
          />
          <InputGroupAddon align="inline-end">
            <PopoverTrigger
              disabled={disabled}
              render={
                <InputGroupButton
                  variant="ghost"
                  size="icon-xs"
                  aria-label={calendarLabel}
                  data-open={isOpen}
                  className="cn-date-picker-trigger"
                />
              }
            >
              <CalendarIcon />
            </PopoverTrigger>
          </InputGroupAddon>
        </InputGroup>
        <PopoverContent
          align="end"
          aria-label={calendarLabel}
          className="cn-date-picker-content"
        >
          <Calendar
            mode="single"
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
    </View>
  )
}

export { DatePicker }
