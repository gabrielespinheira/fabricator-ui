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
  commitMonthText,
  DEFAULT_MONTH_FORMAT,
  formatMonthValue,
  getMonthOptions,
  getMonthYear,
  moveMonth,
  toMonthValue,
} from "@/registry/fabricator/shared/lib/month-input-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import { Button } from "@/registry/native/ui/button"
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

// Month Input: a text field that takes a typed month or one picked from a year
// of months. Typing commits on blur and the return key (Nov 2026, 2026-11,
// 11/2026, next month); the button opens the year. The rules are the
// website's, in lib/month-input-model.

const ROW_STARTS = [0, 3, 6, 9]

/** A new year slides in from the side it came from, on the move timing. */
function useYearSlide(year: number) {
  const motion = useMotion("move")
  const shouldAnimate = !motion.isOff && !motion.isReduced
  const offset = useSharedValue(0)
  const previousYear = React.useRef(year)
  const { enterMs, moveEasing } = motion
  React.useEffect(() => {
    if (year === previousYear.current) return
    const direction = year > previousYear.current ? 1 : -1
    previousYear.current = year
    if (!shouldAnimate) return
    offset.value = direction * 8
    offset.value = withTiming(0, { duration: enterMs, easing: moveEasing })
  }, [enterMs, moveEasing, offset, shouldAnimate, year])
  return useAnimatedStyle(() => ({
    opacity: 1 - Math.abs(offset.value) / 8,
    transform: [{ translateX: offset.value }],
  }))
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
  const feedback = useFeedback()
  const [shownMonth, setShownMonth] = React.useState(
    () => value ?? toMonthValue(new Date())
  )
  const year = getMonthYear(shownMonth)
  const thisMonth = toMonthValue(new Date())
  const options = getMonthOptions(year, { minMonth, maxMonth, locale })
  const slideStyle = useYearSlide(year)

  function moveYear(years: number) {
    feedback("page", { pitch: years > 0 ? 1.08 : 0.92 })
    setShownMonth(moveMonth(shownMonth, years * 12))
  }

  return (
    <View data-slot="month-input-picker">
      <View
        data-slot="month-input-header"
        className="cn-month-input-header flex-row items-center justify-between"
      >
        <Button
          data-sound="none"
          variant="ghost"
          size="icon-sm"
          accessibilityLabel="Previous year"
          onPress={() => moveYear(-1)}
        >
          <ChevronLeftIcon />
        </Button>
        <Text
          data-slot="month-input-year"
          accessibilityLiveRegion="polite"
          className="cn-month-input-year"
        >
          {year}
        </Text>
        <Button
          data-sound="none"
          variant="ghost"
          size="icon-sm"
          accessibilityLabel="Next year"
          onPress={() => moveYear(1)}
        >
          <ChevronRightIcon />
        </Button>
      </View>
      <Animated.View
        data-slot="month-input-grid"
        accessibilityLabel={`${label}, ${year}`}
        className="cn-month-input-grid"
        style={slideStyle}
      >
        {ROW_STARTS.map((rowStart) => (
          <View key={rowStart} className="cn-month-input-row flex-row">
            {options.slice(rowStart, rowStart + 3).map((option) => {
              const isSelected = option.value === value
              const isCurrent = option.value === thisMonth
              return (
                <Button
                  key={option.value}
                  data-sound="none"
                  data-slot="month-input-month"
                  data-selected={isSelected}
                  data-current={isCurrent}
                  variant="ghost"
                  disabled={option.isDisabled}
                  aria-selected={isSelected}
                  accessibilityLabel={formatMonthValue(option.value, {
                    format: "MMMM yyyy",
                    locale,
                  })}
                  className="cn-month-input-month flex-1"
                  onPress={() => {
                    feedback("pick")
                    onSelect(option.value)
                  }}
                >
                  <Text
                    data-selected={isSelected}
                    data-current={isCurrent}
                    className="cn-month-input-month-text"
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

function MonthInput(
  props: Omit<
    React.ComponentProps<typeof TextInput>,
    "value" | "defaultValue" | "editable"
  > & {
    value?: string
    defaultValue?: string
    onValueChange?: (value: string | undefined) => void
    format?: string
    locale?: Locale
    minMonth?: string
    maxMonth?: string
    /** Kept so code moves across: React Native has no form to submit. */
    name?: string
    pickerLabel?: string
    disabled?: boolean
    "aria-invalid"?: boolean
    className?: string
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
    name: _name,
    pickerLabel = "Choose month",
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
    formatMonthValue(currentValue, formatOptions)
  )
  const [isTextInvalid, setIsTextInvalid] = React.useState(false)
  const [syncedValue, setSyncedValue] = React.useState(currentValue)
  const [isOpen, setIsOpen] = React.useState(false)

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
  }

  function selectMonth(month: string) {
    setText(formatMonthValue(month, formatOptions))
    setIsTextInvalid(false)
    updateValue(month)
    setIsOpen(false)
  }

  return (
    <View
      data-slot="month-input"
      className={cn("cn-month-input min-w-0", className)}
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
            className="cn-month-input-text"
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
                  aria-label={pickerLabel}
                  data-open={isOpen}
                  className="cn-month-input-trigger"
                />
              }
            >
              <CalendarIcon />
            </PopoverTrigger>
          </InputGroupAddon>
        </InputGroup>
        <PopoverContent
          align="end"
          aria-label={pickerLabel}
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
    </View>
  )
}

export { MonthInput }
