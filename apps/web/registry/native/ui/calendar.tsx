import * as React from "react"
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
} from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { type Day, type FirstWeekContainsDate, type Locale } from "date-fns"
import { Pressable, ScrollView, View } from "react-native"

import {
  formatCaption,
  formatDay,
  formatMonthDropdown,
  formatWeekdayName,
  formatWeekNumber,
  formatYearDropdown,
  getDayLabel,
  getDayModifiers,
  getDisplayMonths,
  getMonthOptions,
  getMonthWeeks,
  getNavBounds,
  getNextMonth,
  getPreviousMonth,
  getStartingMonth,
  getWeekdays,
  getYearOptions,
  isStretchedCalendar,
  selectMultiple,
  selectRange,
  selectSingle,
  type CalendarDay,
  type CaptionLayout,
  type DateRange,
  type DayContext,
  type DayModifiers,
  type Matcher,
} from "@/registry/native/lib/calendar-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { wrapTextChildren } from "@/registry/native/lib/text-children"
import { Button } from "@/registry/native/ui/button"
import { Text, TextStyle } from "@/registry/native/ui/text"

// react-day-picker's props on a grid of views. Its logic is in calendar-model;
// what's here only draws it.

// Taller by half the gap between weeks. Not wider: days touch, and a press would
// land on the day beside it.
const DAY_SLOP = { top: 4, bottom: 4 }
// Clear of everything around them, so they keep 44pt at any density.
const NAV_SLOP = 8
const CAPTION_SLOP = { top: 8, bottom: 8 }

const calendarDayWashVariants = cva("cn-calendar-day-wash")
const calendarFilledDayWashVariants = cva("cn-calendar-filled-day-wash")
const calendarNavWashVariants = cva("cn-calendar-nav-wash")

type ButtonVariant = React.ComponentProps<typeof Button>["variant"]

type CalendarClassNames = Partial<
  Record<
    | "months"
    | "month"
    | "nav"
    | "button_previous"
    | "button_next"
    | "month_caption"
    | "dropdowns"
    | "weekdays"
    | "weekday"
    | "week"
    | "week_number"
    | "day",
    string
  >
>

type CalendarFormatters = {
  formatCaption?: (month: Date, options: { locale?: Locale }) => string
  formatDay?: (date: Date, options: { locale?: Locale }) => string
  formatWeekdayName?: (date: Date, options: { locale?: Locale }) => string
  formatMonthDropdown?: (month: Date, options: { locale?: Locale }) => string
  formatYearDropdown?: (year: Date, options: { locale?: Locale }) => string
  formatWeekNumber?: (weekNumber: number) => string
}

type ChevronOrientation = "left" | "right" | "up" | "down"

type CalendarDayButtonProps = Omit<
  React.ComponentProps<typeof Button>,
  "variant" | "size"
> & {
  day: CalendarDay
  modifiers: DayModifiers
  locale?: Partial<Locale>
}

type CalendarComponents = {
  DayButton?: React.ComponentType<CalendarDayButtonProps>
  Chevron?: React.ComponentType<{ orientation: ChevronOrientation }>
  WeekNumber?: React.ComponentType<{
    children?: React.ReactNode
    weekNumber: number
  }>
}

type CalendarBaseProps = Omit<
  React.ComponentProps<typeof View>,
  "children" | "hidden"
> & {
  classNames?: CalendarClassNames
  showOutsideDays?: boolean
  captionLayout?: CaptionLayout
  locale?: Locale
  formatters?: CalendarFormatters
  components?: CalendarComponents
  disabled?: Matcher | readonly Matcher[]
  hidden?: Matcher | readonly Matcher[]
  month?: Date
  defaultMonth?: Date
  onMonthChange?: (month: Date) => void
  numberOfMonths?: number
  pagedNavigation?: boolean
  reverseMonths?: boolean
  disableNavigation?: boolean
  hideNavigation?: boolean
  hideWeekdays?: boolean
  weekStartsOn?: Day
  firstWeekContainsDate?: FirstWeekContainsDate
  ISOWeek?: boolean
  showWeekNumber?: boolean
  fixedWeeks?: boolean
  startMonth?: Date
  endMonth?: Date
  today?: Date
  modifiers?: DayContext["modifiers"]
  modifiersClassNames?: Record<string, string>
  footer?: React.ReactNode
  onDayPress?: (date: Date, modifiers: DayModifiers) => void
}

type OnSelect<TValue> = (
  value: TValue,
  triggerDate: Date,
  modifiers: DayModifiers
) => void

type CalendarSelectionProps =
  | {
      mode?: undefined
      selected?: undefined
      onSelect?: undefined
    }
  | {
      mode: "single"
      selected?: Date
      onSelect?: OnSelect<Date | undefined>
      required?: boolean
    }
  | {
      mode: "multiple"
      selected?: readonly Date[]
      onSelect?: OnSelect<Date[] | undefined>
      required?: boolean
      min?: number
      max?: number
    }
  | {
      mode: "range"
      selected?: DateRange
      onSelect?: OnSelect<DateRange | undefined>
      required?: boolean
      min?: number
      max?: number
      excludeDisabled?: boolean
      resetOnSelect?: boolean
    }

type CalendarProps = CalendarBaseProps & CalendarSelectionProps

/**
 * As react-day-picker does it: with `onSelect` the selection belongs to the
 * caller, even while undefined; without it the calendar keeps its own.
 */
function useSelection(props: CalendarProps) {
  const [own, setOwn] = React.useState<DayContext["selected"]>(props.selected)
  const selected = props.onSelect ? props.selected : own
  const press = (date: Date, modifiers: DayModifiers) => {
    if (props.mode === "single") {
      const next = selectSingle(
        selected instanceof Date ? selected : undefined,
        date,
        { required: props.required }
      )
      setOwn(next)
      props.onSelect?.(next, date, modifiers)
    } else if (props.mode === "multiple") {
      const current =
        selected && !(selected instanceof Date) && "length" in selected
          ? selected
          : undefined
      const next = selectMultiple(current, date, {
        required: props.required,
        min: props.min,
        max: props.max,
      })
      if (next === null) return
      setOwn(next)
      props.onSelect?.(next, date, modifiers)
    } else if (props.mode === "range") {
      const current =
        selected && !(selected instanceof Date) && !("length" in selected)
          ? selected
          : undefined
      const next = selectRange(current, date, {
        required: props.required,
        min: props.min,
        max: props.max,
        excludeDisabled: props.excludeDisabled,
        resetOnSelect: props.resetOnSelect,
        disabled: props.disabled,
      })
      setOwn(next)
      props.onSelect?.(next, date, modifiers)
    }
  }
  return { selected, press }
}

function DefaultChevron({ orientation }: { orientation: ChevronOrientation }) {
  if (orientation === "left") return <ChevronLeftIcon aria-hidden />
  if (orientation === "right") return <ChevronRightIcon aria-hidden />
  if (orientation === "up") return <ChevronUpIcon aria-hidden />
  return <ChevronDownIcon aria-hidden />
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  children,
  hitSlop = DAY_SLOP,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "variant" | "size"> & {
  day: CalendarDay
  modifiers: DayModifiers
  locale?: Partial<Locale>
}) {
  const feedback = useFeedback()
  const state = {
    "data-selected-single":
      modifiers.selected &&
      !modifiers.range_start &&
      !modifiers.range_end &&
      !modifiers.range_middle,
    "data-range-start": modifiers.range_start,
    "data-range-end": modifiers.range_end,
    "data-range-middle": modifiers.range_middle,
    "data-outside": modifiers.outside,
    "data-disabled": modifiers.disabled,
  }
  const isFilled =
    state["data-selected-single"] ||
    state["data-range-start"] ||
    state["data-range-end"]
  return (
    <Button
      data-sound="none"
      variant="ghost"
      size="icon"
      washClassName={
        isFilled ? calendarFilledDayWashVariants() : calendarDayWashVariants()
      }
      data-day={day.date.toLocaleDateString(locale?.code)}
      aria-selected={modifiers.selected}
      {...state}
      hitSlop={hitSlop}
      className={cn(
        "cn-calendar-day-button relative aspect-square w-full flex-col",
        className
      )}
      onPress={(event) => {
        feedback("pick")
        onPress?.(event)
      }}
      {...props}
    >
      {wrapTextChildren(children, (text, key) => (
        <Text key={key} {...state} className="cn-calendar-day-button-text">
          {text}
        </Text>
      ))}
    </Button>
  )
}

function CaptionButton({
  label,
  isOpen,
  onPress,
  Chevron,
}: {
  label: string
  isOpen: boolean
  onPress: () => void
  Chevron: NonNullable<CalendarComponents["Chevron"]>
}) {
  return (
    <Pressable
      data-slot="calendar-dropdown"
      role="button"
      aria-expanded={isOpen}
      hitSlop={CAPTION_SLOP}
      onPress={onPress}
      className="cn-calendar-dropdown-root"
    >
      <View className="cn-calendar-caption-label flex-row items-center gap-1">
        <Text className="cn-calendar-caption-text">{label}</Text>
        <TextStyle className="cn-calendar-caption-icon">
          <Chevron orientation={isOpen ? "up" : "down"} />
        </TextStyle>
      </View>
    </Pressable>
  )
}

function OptionGrid({
  options,
}: {
  options: {
    key: number
    label: string
    isCurrent: boolean
    onPress: () => void
  }[]
}) {
  return (
    <ScrollView nestedScrollEnabled className="cn-calendar-options grow-0">
      <View className="flex-row flex-wrap">
        {options.map((option) => (
          <View key={option.key} className="w-1/3 p-0.5">
            <Button
              variant={option.isCurrent ? "secondary" : "ghost"}
              size="sm"
              aria-selected={option.isCurrent}
              onPress={option.onPress}
              className="w-full px-0"
            >
              {option.label}
            </Button>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

function Calendar(props: CalendarProps & { buttonVariant?: ButtonVariant }) {
  const {
    className,
    classNames = {},
    showOutsideDays = true,
    captionLayout = "label",
    buttonVariant = "ghost",
    locale,
    formatters = {},
    components = {},
    disabled,
    hidden,
    month: monthProp,
    defaultMonth,
    onMonthChange,
    numberOfMonths = 1,
    pagedNavigation,
    reverseMonths,
    disableNavigation,
    hideNavigation,
    hideWeekdays,
    weekStartsOn,
    firstWeekContainsDate,
    ISOWeek,
    showWeekNumber,
    fixedWeeks,
    startMonth: startMonthProp,
    endMonth: endMonthProp,
    today,
    modifiers,
    modifiersClassNames,
    footer,
    onDayPress,
    mode,
    selected: _selected,
    onSelect: _onSelect,
    ...viewProps
  } = props
  const { selected, press } = useSelection(props)
  const feedback = useFeedback()

  const [startMonth, endMonth] = getNavBounds({
    captionLayout,
    startMonth: startMonthProp,
    endMonth: endMonthProp,
    today,
  })
  const [ownMonth, setOwnMonth] = React.useState(() =>
    getStartingMonth({
      month: monthProp,
      defaultMonth,
      today,
      numberOfMonths,
      startMonth,
      endMonth,
    })
  )
  const firstMonth = monthProp
    ? getStartingMonth({
        month: monthProp,
        numberOfMonths,
        startMonth,
        endMonth,
      })
    : ownMonth
  const goToMonth = (next: Date) => {
    setOwnMonth(next)
    onMonthChange?.(next)
  }

  const months = getDisplayMonths(firstMonth, numberOfMonths, {
    reverse: reverseMonths,
  })
  const previousMonth = getPreviousMonth(firstMonth, {
    numberOfMonths,
    pagedNavigation,
    disableNavigation,
    startMonth,
  })
  const nextMonth = getNextMonth(firstMonth, {
    numberOfMonths,
    pagedNavigation,
    disableNavigation,
    endMonth,
  })

  const weekOptions = {
    weekStartsOn: weekStartsOn ?? locale?.options?.weekStartsOn,
    firstWeekContainsDate,
    ISOWeek,
    locale,
  }
  const formatOptions = { locale }
  const Chevron = components.Chevron ?? DefaultChevron
  const DayButton = components.DayButton ?? CalendarDayButton
  const dayContext: DayContext = {
    mode,
    selected,
    disabled,
    hidden,
    today,
    modifiers,
    startMonth,
    endMonth,
  }

  return (
    <TextStyle className="cn-calendar-text">
      <View
        data-slot="calendar"
        className={cn("cn-calendar self-start", className)}
        {...viewProps}
      >
        <View
          className={cn(
            "relative flex-col gap-4 md:flex-row",
            classNames.months
          )}
        >
          {!hideNavigation && (
            <View
              pointerEvents="box-none"
              className={cn(
                "absolute inset-x-0 top-0 z-10 w-full flex-row items-center justify-between gap-1",
                classNames.nav
              )}
            >
              <Button
                data-sound="none"
                variant={buttonVariant}
                size="icon"
                washClassName={calendarNavWashVariants()}
                accessibilityLabel="Go to the previous month"
                disabled={!previousMonth}
                hitSlop={NAV_SLOP}
                onPress={() => {
                  if (!previousMonth) return
                  feedback("page", { pitch: 0.92 })
                  goToMonth(previousMonth)
                }}
                className={cn(
                  "cn-calendar-nav-button p-0",
                  classNames.button_previous
                )}
              >
                <Chevron orientation="left" />
              </Button>
              <Button
                data-sound="none"
                variant={buttonVariant}
                size="icon"
                washClassName={calendarNavWashVariants()}
                accessibilityLabel="Go to the next month"
                disabled={!nextMonth}
                hitSlop={NAV_SLOP}
                onPress={() => {
                  if (!nextMonth) return
                  feedback("page", { pitch: 1.08 })
                  goToMonth(nextMonth)
                }}
                className={cn(
                  "cn-calendar-nav-button p-0",
                  classNames.button_next
                )}
              >
                <Chevron orientation="right" />
              </Button>
            </View>
          )}
          {months.map((month, displayIndex) => (
            <CalendarMonth
              key={month.getTime()}
              month={month}
              displayIndex={displayIndex}
              classNames={classNames}
              isStretched={isStretchedCalendar(className)}
              captionLayout={captionLayout}
              formatters={formatters}
              formatOptions={formatOptions}
              weekOptions={weekOptions}
              fixedWeeks={fixedWeeks}
              hideWeekdays={hideWeekdays}
              showWeekNumber={showWeekNumber}
              showOutsideDays={showOutsideDays}
              startMonth={startMonth}
              endMonth={endMonth}
              dayContext={dayContext}
              modifiersClassNames={modifiersClassNames}
              locale={locale}
              Chevron={Chevron}
              DayButton={DayButton}
              WeekNumber={components.WeekNumber}
              goToMonth={goToMonth}
              onDayPress={(date, dayModifiers) => {
                onDayPress?.(date, dayModifiers)
                press(date, dayModifiers)
              }}
            />
          ))}
        </View>
        {footer ? <View className="cn-calendar-footer">{footer}</View> : null}
      </View>
    </TextStyle>
  )
}

type Pane = "days" | "months" | "years"

function CalendarMonth({
  month,
  displayIndex,
  classNames,
  isStretched,
  captionLayout,
  formatters,
  formatOptions,
  weekOptions,
  fixedWeeks,
  hideWeekdays,
  showWeekNumber,
  showOutsideDays,
  startMonth,
  endMonth,
  dayContext,
  modifiersClassNames,
  locale,
  Chevron,
  DayButton,
  WeekNumber,
  goToMonth,
  onDayPress,
}: {
  month: Date
  displayIndex: number
  classNames: CalendarClassNames
  isStretched: boolean
  captionLayout: CaptionLayout
  formatters: CalendarFormatters
  formatOptions: { locale?: Locale }
  weekOptions: Parameters<typeof getWeekdays>[0]
  fixedWeeks?: boolean
  hideWeekdays?: boolean
  showWeekNumber?: boolean
  showOutsideDays: boolean
  startMonth?: Date
  endMonth?: Date
  dayContext: DayContext
  modifiersClassNames?: Record<string, string>
  locale?: Locale
  Chevron: NonNullable<CalendarComponents["Chevron"]>
  DayButton: NonNullable<CalendarComponents["DayButton"]>
  WeekNumber?: CalendarComponents["WeekNumber"]
  goToMonth: (month: Date) => void
  onDayPress: (date: Date, modifiers: DayModifiers) => void
}) {
  const [pane, setPane] = React.useState<Pane>("days")
  const togglePane = (next: Pane) =>
    setPane((current) => (current === next ? "days" : next))
  const year = month.getFullYear()
  const format = {
    caption: formatters.formatCaption ?? formatCaption,
    day: formatters.formatDay ?? formatDay,
    weekday: formatters.formatWeekdayName ?? formatWeekdayName,
    monthOption: formatters.formatMonthDropdown ?? formatMonthDropdown,
    yearOption: formatters.formatYearDropdown ?? formatYearDropdown,
    weekNumber: formatters.formatWeekNumber ?? formatWeekNumber,
  }
  const showTo = (next: Date) => {
    // The pressed month stays where it was, when several are showing.
    const first = new Date(
      next.getFullYear(),
      next.getMonth() - displayIndex,
      1
    )
    goToMonth(first)
    setPane("days")
  }

  return (
    <View
      data-stretched={isStretched}
      className={cn(
        "cn-calendar-month w-full flex-col gap-4",
        classNames.month
      )}
    >
      <View
        className={cn(
          "cn-calendar-month-caption w-full flex-row items-center justify-center",
          classNames.month_caption
        )}
      >
        {captionLayout === "label" ? (
          <Text className="cn-calendar-caption">
            {format.caption(month, formatOptions)}
          </Text>
        ) : (
          <View
            className={cn(
              "cn-calendar-dropdowns w-full flex-row items-center justify-center",
              classNames.dropdowns
            )}
          >
            {captionLayout === "dropdown-years" ? (
              <Text className="cn-calendar-caption">
                {format.monthOption(month, formatOptions)}
              </Text>
            ) : (
              <CaptionButton
                label={format.monthOption(month, formatOptions)}
                isOpen={pane === "months"}
                onPress={() => togglePane("months")}
                Chevron={Chevron}
              />
            )}
            {captionLayout === "dropdown-months" ? (
              <Text className="cn-calendar-caption">
                {format.yearOption(month, formatOptions)}
              </Text>
            ) : (
              <CaptionButton
                label={format.yearOption(month, formatOptions)}
                isOpen={pane === "years"}
                onPress={() => togglePane("years")}
                Chevron={Chevron}
              />
            )}
          </View>
        )}
      </View>
      {pane === "months" && (
        <OptionGrid
          options={getMonthOptions(year, { startMonth, endMonth }).map(
            (option) => ({
              key: option,
              label: format.monthOption(
                new Date(year, option, 1),
                formatOptions
              ),
              isCurrent: option === month.getMonth(),
              onPress: () => showTo(new Date(year, option, 1)),
            })
          )}
        />
      )}
      {pane === "years" && startMonth && endMonth && (
        <OptionGrid
          options={getYearOptions(startMonth, endMonth)
            .reverse()
            .map((option) => ({
              key: option,
              label: format.yearOption(new Date(option, 0, 1), formatOptions),
              isCurrent: option === year,
              onPress: () => showTo(new Date(option, month.getMonth(), 1)),
            }))}
        />
      )}
      {pane === "days" && (
        <View role="grid" className="w-full flex-col">
          {!hideWeekdays && (
            <View className={cn("flex-row", classNames.weekdays)}>
              {showWeekNumber && <View className="cn-calendar-week-number" />}
              {getWeekdays(weekOptions).map((weekday) => (
                <View
                  key={weekday.getDay()}
                  role="columnheader"
                  className={cn("cn-calendar-weekday", classNames.weekday)}
                >
                  <Text
                    numberOfLines={1}
                    className="cn-calendar-weekday-text text-center"
                  >
                    {format.weekday(weekday, formatOptions)}
                  </Text>
                </View>
              ))}
            </View>
          )}
          {getMonthWeeks(month, { ...weekOptions, fixedWeeks }).map((week) => (
            <View
              key={week.weekNumber}
              role="row"
              className={cn("mt-2 w-full flex-row", classNames.week)}
            >
              {showWeekNumber && (
                <View
                  className={cn(
                    "cn-calendar-week-number items-center justify-center",
                    classNames.week_number
                  )}
                >
                  {WeekNumber ? (
                    <WeekNumber weekNumber={week.weekNumber}>
                      {format.weekNumber(week.weekNumber)}
                    </WeekNumber>
                  ) : (
                    <Text className="cn-calendar-weekday-text">
                      {format.weekNumber(week.weekNumber)}
                    </Text>
                  )}
                </View>
              )}
              {week.days.map((day) => {
                const dayModifiers = getDayModifiers(day, dayContext)
                const isEmpty =
                  dayModifiers.hidden || (day.outside && !showOutsideDays)
                const customClasses = Object.entries(modifiersClassNames ?? {})
                  .filter(([name]) => dayModifiers[name])
                  .map(([, classes]) => classes)
                return (
                  <View
                    key={day.date.getTime()}
                    data-today={dayModifiers.today && !dayModifiers.selected}
                    data-range-start={dayModifiers.range_start}
                    data-range-middle={dayModifiers.range_middle}
                    data-range-end={dayModifiers.range_end}
                    data-stretched={isStretched}
                    className={cn(
                      "cn-calendar-day relative aspect-square flex-1",
                      classNames.day,
                      ...customClasses
                    )}
                  >
                    {isEmpty ? null : (
                      <DayButton
                        day={day}
                        modifiers={dayModifiers}
                        locale={locale}
                        accessibilityLabel={getDayLabel(
                          day.date,
                          dayModifiers,
                          formatOptions
                        )}
                        disabled={dayModifiers.disabled}
                        onPress={() => onDayPress(day.date, dayModifiers)}
                      >
                        {format.day(day.date, formatOptions)}
                      </DayButton>
                    )}
                  </View>
                )
              })}
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

export { Calendar, CalendarDayButton, type DateRange }
