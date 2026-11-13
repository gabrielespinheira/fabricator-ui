import * as React from "react"
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@fabricator-ui/icons-react-native"
import { cn } from "cn"
import { type Locale } from "date-fns"
import { TextInput, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import {
  commitDateText,
  formatDateValue,
  formatIsoDate,
  getDateGridOptions,
  getDateGridTitle,
  getDefaultDateFormat,
  isSameDateValue,
  moveDateCell,
  parseDateText,
  startOfGranularity,
  type DateGranularity,
  type DateGridGranularity,
} from "@/registry/fabricator/shared/lib/date-picker-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import { Button } from "@/registry/native/ui/button"
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
import { Text } from "@/registry/native/ui/text"

// Date Picker: a text field that takes a typed date or one picked from a
// calendar. Typing commits on blur and the return key (the display format, ISO
// yyyy-MM-dd, today, tomorrow or yesterday); the button opens the calendar.
// `granularity` picks a month or a year from a grid of twelve instead, and the
// value is its first day. The rules are the website's, in
// lib/date-picker-model.

const ROW_STARTS = [0, 3, 6, 9]

const GRID_PAGE_LABELS: Record<
  DateGridGranularity,
  { previous: string; next: string }
> = {
  month: { previous: "Previous year", next: "Next year" },
  year: { previous: "Previous years", next: "Next years" },
}

const CALENDAR_LABELS: Record<DateGranularity, string> = {
  day: "Choose date",
  month: "Choose month",
  year: "Choose year",
}

/** A new page slides in from the side it came from, on the move timing. */
function usePageSlide(title: string, direction: number) {
  const motion = useMotion("move")
  const shouldAnimate = !motion.isOff && !motion.isReduced
  const offset = useSharedValue(0)
  const previousTitle = React.useRef(title)
  const { enterMs, moveEasing } = motion
  React.useEffect(() => {
    if (title === previousTitle.current) return
    previousTitle.current = title
    if (!shouldAnimate) return
    offset.value = direction * 8
    offset.value = withTiming(0, { duration: enterMs, easing: moveEasing })
  }, [direction, enterMs, moveEasing, offset, shouldAnimate, title])
  return useAnimatedStyle(() => ({
    opacity: 1 - Math.abs(offset.value) / 8,
    transform: [{ translateX: offset.value }],
  }))
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
  const feedback = useFeedback()
  const [shownCell, setShownCell] = React.useState(() =>
    startOfGranularity(defaultFocus ?? new Date(), granularity)
  )
  const [direction, setDirection] = React.useState(1)
  const toKey = (date: Date | undefined) => formatIsoDate(date, { granularity })
  const selectedKey = toKey(value)
  const currentKey = toKey(new Date())
  const title = getDateGridTitle(shownCell, granularity)
  const options = getDateGridOptions(shownCell, {
    granularity,
    minDate,
    maxDate,
    locale,
  })
  const pageLabels = GRID_PAGE_LABELS[granularity]
  const slideStyle = usePageSlide(title, direction)

  function movePage(pages: number) {
    feedback("page", { pitch: pages > 0 ? 1.08 : 0.92 })
    setDirection(pages)
    setShownCell(moveDateCell(shownCell, pages * 12, granularity))
  }

  return (
    <View
      data-slot="date-picker-grid-panel"
      className="cn-date-picker-grid-panel"
    >
      <View
        data-slot="date-picker-grid-header"
        className="cn-date-picker-grid-header flex-row items-center justify-between"
      >
        <Button
          data-sound="none"
          variant="ghost"
          size="icon-sm"
          accessibilityLabel={pageLabels.previous}
          onPress={() => movePage(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Text
          data-slot="date-picker-grid-title"
          accessibilityLiveRegion="polite"
          className="cn-date-picker-grid-title"
        >
          {title}
        </Text>
        <Button
          data-sound="none"
          variant="ghost"
          size="icon-sm"
          accessibilityLabel={pageLabels.next}
          onPress={() => movePage(1)}
        >
          <ChevronRightIcon />
        </Button>
      </View>
      <Animated.View
        data-slot="date-picker-grid"
        accessibilityLabel={`${label}, ${title}`}
        className="cn-date-picker-grid"
        style={slideStyle}
      >
        {ROW_STARTS.map((rowStart) => (
          <View key={rowStart} className="cn-date-picker-grid-row flex-row">
            {options.slice(rowStart, rowStart + 3).map((option) => {
              const key = toKey(option.value)
              const isSelected = key === selectedKey
              const isCurrent = key === currentKey
              return (
                <Button
                  key={key}
                  data-sound="none"
                  data-slot="date-picker-cell"
                  data-selected={isSelected}
                  data-current={isCurrent}
                  variant="ghost"
                  disabled={option.isDisabled}
                  aria-selected={isSelected}
                  accessibilityLabel={option.fullLabel}
                  className="cn-date-picker-cell flex-1"
                  onPress={() => {
                    feedback("pick")
                    onSelect(option.value)
                  }}
                >
                  <Text
                    data-selected={isSelected}
                    data-current={isCurrent}
                    className="cn-date-picker-cell-text"
                  >
                    {option.label}
                  </Text>
                </Button>
              )
            })}
          </View>
        ))}
      </Animated.View>
    </View>
  )
}

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
    /** What the value is: a day from a calendar, or a month or year from a grid. */
    granularity?: DateGranularity
    disabled?: boolean
    "aria-invalid"?: boolean
    className?: string
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
    name: _name,
    calendarLabel = CALENDAR_LABELS[granularity],
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
  const formatOptions = { format, locale, granularity }

  const [text, setText] = React.useState(() =>
    formatDateValue(currentValue, formatOptions)
  )
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [isOpen, setIsOpen] = React.useState(false)

  // A value set from outside replaces the text.
  if (!isSameDateValue(syncedValue, currentValue, { granularity })) {
    setSyncedValue(currentValue)
    setText(formatDateValue(currentValue, formatOptions))
    setIsTextInvalid(false)
  }

  function updateValue(nextValue: Date | undefined) {
    setSyncedValue(nextValue)
    if (isSameDateValue(nextValue, currentValue, { granularity })) return
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
          {granularity === "day" ? (
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
          ) : (
            <DatePickerGrid
              value={currentValue}
              defaultFocus={typedDate ?? currentValue}
              granularity={granularity}
              minDate={minDate}
              maxDate={maxDate}
              locale={locale}
              label={calendarLabel}
              onSelect={selectDate}
            />
          )}
        </PopoverContent>
      </Popover>
    </View>
  )
}

export { DatePicker }
