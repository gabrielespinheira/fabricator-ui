// The month grid and selection rules react-day-picker has on the website, on
// date-fns alone: weeks, outside days, matchers and the three selection modes.

import {
  addDays,
  addMonths,
  addYears,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfISOWeek,
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  getISOWeek,
  getWeek,
  isAfter,
  isBefore,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfISOWeek,
  startOfMonth,
  startOfWeek,
  startOfYear,
  type Day,
  type FirstWeekContainsDate,
  type Locale,
} from "date-fns"

export type DateRange = { from: Date | undefined; to?: Date | undefined }

export type Matcher =
  | boolean
  | Date
  | ((date: Date) => boolean)
  | DateRange
  | { before: Date; after?: Date }
  | { after: Date; before?: Date }
  | { dayOfWeek: number | readonly number[] }
  | readonly Date[]

export type CalendarMode = "single" | "multiple" | "range"

export type CaptionLayout =
  | "label"
  | "dropdown"
  | "dropdown-months"
  | "dropdown-years"

export type CalendarDay = {
  date: Date
  displayMonth: Date
  outside: boolean
}

export type CalendarWeek = {
  weekNumber: number
  days: CalendarDay[]
}

export type WeekOptions = {
  weekStartsOn?: Day
  firstWeekContainsDate?: FirstWeekContainsDate
  ISOWeek?: boolean
  locale?: Locale
}

function getWeekStart(date: Date, options: WeekOptions) {
  return options.ISOWeek ? startOfISOWeek(date) : startOfWeek(date, options)
}

function getWeekEnd(date: Date, options: WeekOptions) {
  return options.ISOWeek ? endOfISOWeek(date) : endOfWeek(date, options)
}

export function getMonthWeeks(
  month: Date,
  options: WeekOptions & { fixedWeeks?: boolean } = {}
): CalendarWeek[] {
  const start = getWeekStart(startOfMonth(month), options)
  const end = getWeekEnd(endOfMonth(month), options)
  const total = differenceInCalendarDays(end, start) + 1
  const count = options.fixedWeeks ? Math.max(total, 42) : total
  const weeks: CalendarWeek[] = []
  for (let index = 0; index < count; index += 7) {
    const firstDay = addDays(start, index)
    weeks.push({
      weekNumber: options.ISOWeek
        ? getISOWeek(firstDay)
        : getWeek(firstDay, options),
      days: Array.from({ length: 7 }, (_, offset) => {
        const date = addDays(firstDay, offset)
        return {
          date,
          displayMonth: month,
          outside: !isSameMonth(date, month),
        }
      }),
    })
  }
  return weeks
}

export function getWeekdays(options: WeekOptions = {}) {
  const start = getWeekStart(new Date(), options)
  return Array.from({ length: 7 }, (_, index) => addDays(start, index))
}

function rangeIncludes(
  { from, to }: DateRange,
  date: Date,
  excludeEnds = false
) {
  const margin = excludeEnds ? 1 : 0
  if (from && to) {
    const [start, end] =
      differenceInCalendarDays(to, from) < 0 ? [to, from] : [from, to]
    return (
      differenceInCalendarDays(date, start) >= margin &&
      differenceInCalendarDays(end, date) >= margin
    )
  }
  if (excludeEnds) return false
  if (to) return isSameDay(to, date)
  return from ? isSameDay(from, date) : false
}

function isDateRange(matcher: object): matcher is DateRange {
  return "from" in matcher || "to" in matcher
}

function matchesOne(date: Date, matcher: Matcher): boolean {
  if (typeof matcher === "boolean") return matcher
  if (typeof matcher === "function") return matcher(date)
  if (matcher instanceof Date) return isSameDay(date, matcher)
  if ("length" in matcher) return matcher.some((day) => isSameDay(date, day))
  if (isDateRange(matcher)) return rangeIncludes(matcher, date)
  if ("dayOfWeek" in matcher) {
    const days: readonly number[] =
      typeof matcher.dayOfWeek === "number"
        ? [matcher.dayOfWeek]
        : matcher.dayOfWeek
    return days.includes(date.getDay())
  }
  const { before, after } = matcher
  const isBeforeLimit = before
    ? differenceInCalendarDays(before, date) > 0
    : false
  const isAfterLimit = after ? differenceInCalendarDays(date, after) > 0 : false
  if (before && after && isAfter(before, after)) {
    return isBeforeLimit && isAfterLimit
  }
  return isBeforeLimit || isAfterLimit
}

function isMatcherList(
  matchers: Matcher | readonly Matcher[]
): matchers is readonly Matcher[] {
  return Array.isArray(matchers)
}

/** react-day-picker's matchers: any of a list counts. */
export function matchesDate(
  date: Date,
  matchers: Matcher | readonly Matcher[] | undefined
) {
  if (matchers === undefined) return false
  return isMatcherList(matchers)
    ? matchers.some((matcher) => matchesOne(date, matcher))
    : matchesOne(date, matchers)
}

export function selectSingle(
  selected: Date | undefined,
  date: Date,
  { required = false }: { required?: boolean } = {}
) {
  return !required && selected && isSameDay(date, selected) ? undefined : date
}

/** The next dates, or null when the press changes nothing. */
export function selectMultiple(
  selected: readonly Date[] | undefined,
  date: Date,
  {
    required = false,
    min,
    max,
  }: { required?: boolean; min?: number; max?: number } = {}
) {
  const current = selected ?? []
  if (current.some((day) => isSameDay(day, date))) {
    if (current.length === min) return null
    if (required && current.length === 1) return null
    return current.filter((day) => !isSameDay(day, date))
  }
  return current.length === max ? [date] : [...current, date]
}

function addToRange(
  date: Date,
  range: DateRange | undefined,
  min: number,
  max: number,
  required: boolean
): DateRange | undefined {
  const { from, to } = range ?? {}
  let next: DateRange | undefined
  if (!from && !to) {
    next = { from: date, to: min > 0 ? undefined : date }
  } else if (from && !to) {
    if (isSameDay(from, date)) {
      if (min === 0) next = { from, to: date }
      else next = required ? { from, to: undefined } : undefined
    } else {
      next = isBefore(date, from)
        ? { from: date, to: from }
        : { from, to: date }
    }
  } else if (from && to) {
    if (isSameDay(from, date) && isSameDay(to, date)) {
      next = required ? { from, to } : undefined
    } else if (isSameDay(from, date)) {
      next = { from, to: min > 0 ? undefined : date }
    } else if (isSameDay(to, date)) {
      next = { from: date, to: min > 0 ? undefined : date }
    } else {
      next = isBefore(date, from) ? { from: date, to } : { from, to: date }
    }
  }
  if (next?.from && next.to) {
    const days = differenceInCalendarDays(next.to, next.from)
    if ((max > 0 && days > max) || (min > 1 && days < min)) {
      return { from: date, to: undefined }
    }
  }
  return next
}

function rangeHasMatch(
  { from, to }: { from: Date; to: Date },
  matchers: Matcher | readonly Matcher[]
) {
  const days = differenceInCalendarDays(to, from)
  for (let offset = 0; offset <= days; offset += 1) {
    if (matchesDate(addDays(from, offset), matchers)) return true
  }
  return false
}

export function selectRange(
  selected: DateRange | undefined,
  date: Date,
  {
    required = false,
    min = 0,
    max = 0,
    disabled,
    excludeDisabled = false,
    resetOnSelect = false,
  }: {
    required?: boolean
    min?: number
    max?: number
    disabled?: Matcher | readonly Matcher[]
    excludeDisabled?: boolean
    resetOnSelect?: boolean
  } = {}
) {
  const { from, to } = selected ?? {}
  let next: DateRange | undefined
  if (resetOnSelect && ((from && to) || !from)) {
    const isOneDay = from && to && isSameDay(from, to) && isSameDay(date, from)
    next = !required && isOneDay ? undefined : { from: date, to: undefined }
  } else {
    next = addToRange(date, selected, min, max, required)
  }
  if (
    excludeDisabled &&
    disabled !== undefined &&
    next?.from &&
    next.to &&
    rangeHasMatch({ from: next.from, to: next.to }, disabled)
  ) {
    return { from: date, to: undefined }
  }
  return next
}

export type DayModifiers = Record<string, boolean> & {
  selected: boolean
  disabled: boolean
  hidden: boolean
  outside: boolean
  today: boolean
  focused: boolean
  range_start: boolean
  range_middle: boolean
  range_end: boolean
}

export type DayContext = {
  mode?: CalendarMode
  selected?: Date | readonly Date[] | DateRange
  disabled?: Matcher | readonly Matcher[]
  hidden?: Matcher | readonly Matcher[]
  today?: Date
  modifiers?: Record<string, Matcher | readonly Matcher[] | undefined>
  startMonth?: Date
  endMonth?: Date
}

function isSelectedIn(context: DayContext, date: Date) {
  const { mode, selected } = context
  if (!selected) return false
  if (selected instanceof Date) {
    return mode === "single" && isSameDay(selected, date)
  }
  if ("length" in selected) {
    return mode === "multiple" && selected.some((day) => isSameDay(day, date))
  }
  return mode === "range" && rangeIncludes(selected, date)
}

export function getDayModifiers(
  { date, outside }: CalendarDay,
  context: DayContext
): DayModifiers {
  const { disabled, hidden, modifiers = {}, startMonth, endMonth } = context
  const isDisabled = matchesDate(date, disabled)
  const isHidden =
    matchesDate(date, hidden) ||
    (startMonth ? differenceInCalendarDays(date, startMonth) < 0 : false) ||
    (endMonth
      ? differenceInCalendarDays(date, endOfMonth(endMonth)) > 0
      : false)
  const selected = isSelectedIn(context, date) && !isDisabled && !isHidden
  const range =
    context.mode === "range" &&
    context.selected &&
    !(context.selected instanceof Date) &&
    !("length" in context.selected)
      ? context.selected
      : undefined
  const custom: Record<string, boolean> = {}
  for (const [name, matcher] of Object.entries(modifiers)) {
    custom[name] = matchesDate(date, matcher)
  }
  return {
    ...custom,
    selected,
    disabled: isDisabled,
    hidden: isHidden,
    outside,
    today: isSameDay(date, context.today ?? new Date()),
    focused: false,
    range_start: Boolean(
      selected && range?.from && isSameDay(date, range.from)
    ),
    range_end: Boolean(selected && range?.to && isSameDay(date, range.to)),
    range_middle: Boolean(
      selected && range && rangeIncludes(range, date, true)
    ),
  }
}

export function getDisplayMonths(
  firstMonth: Date,
  numberOfMonths = 1,
  { reverse = false }: { reverse?: boolean } = {}
) {
  const months = Array.from({ length: numberOfMonths }, (_, index) =>
    addMonths(startOfMonth(firstMonth), index)
  )
  return reverse ? months.reverse() : months
}

type NavigationOptions = {
  numberOfMonths?: number
  pagedNavigation?: boolean
  disableNavigation?: boolean
}

export function getNextMonth(
  firstMonth: Date,
  {
    numberOfMonths = 1,
    pagedNavigation = false,
    disableNavigation = false,
    endMonth,
  }: NavigationOptions & { endMonth?: Date } = {}
) {
  if (disableNavigation) return undefined
  if (
    endMonth &&
    differenceInCalendarMonths(endMonth, firstMonth) < numberOfMonths
  ) {
    return undefined
  }
  return addMonths(
    startOfMonth(firstMonth),
    pagedNavigation ? numberOfMonths : 1
  )
}

export function getPreviousMonth(
  firstMonth: Date,
  {
    numberOfMonths = 1,
    pagedNavigation = false,
    disableNavigation = false,
    startMonth,
  }: NavigationOptions & { startMonth?: Date } = {}
) {
  if (disableNavigation) return undefined
  if (
    startMonth &&
    differenceInCalendarMonths(startOfMonth(firstMonth), startMonth) <= 0
  ) {
    return undefined
  }
  return addMonths(
    startOfMonth(firstMonth),
    pagedNavigation ? -numberOfMonths : -1
  )
}

export function getStartingMonth({
  month,
  defaultMonth,
  today = new Date(),
  numberOfMonths = 1,
  startMonth,
  endMonth,
}: {
  month?: Date
  defaultMonth?: Date
  today?: Date
  numberOfMonths?: number
  startMonth?: Date
  endMonth?: Date
}) {
  let initial = month ?? defaultMonth ?? today
  if (
    endMonth &&
    differenceInCalendarMonths(endMonth, initial) < numberOfMonths - 1
  ) {
    initial = addMonths(endMonth, -(numberOfMonths - 1))
  }
  if (startMonth && differenceInCalendarMonths(initial, startMonth) < 0) {
    initial = startMonth
  }
  return startOfMonth(initial)
}

/** How far navigation goes. A year dropdown needs a range, so it gets a default. */
export function getNavBounds({
  captionLayout,
  startMonth,
  endMonth,
  today = new Date(),
}: {
  captionLayout?: CaptionLayout
  startMonth?: Date
  endMonth?: Date
  today?: Date
}): [Date | undefined, Date | undefined] {
  const hasYears =
    captionLayout === "dropdown" || captionLayout === "dropdown-years"
  const start = startMonth
    ? startOfMonth(startMonth)
    : hasYears
      ? startOfYear(addYears(today, -100))
      : undefined
  const end = endMonth
    ? endOfMonth(endMonth)
    : hasYears
      ? endOfYear(today)
      : undefined
  return [start && startOfDay(start), end && startOfDay(end)]
}

export function getYearOptions(startMonth: Date, endMonth: Date) {
  const first = startMonth.getFullYear()
  const count = endMonth.getFullYear() - first + 1
  return Array.from({ length: Math.max(count, 0) }, (_, index) => first + index)
}

export function getMonthOptions(
  year: number,
  { startMonth, endMonth }: { startMonth?: Date; endMonth?: Date } = {}
) {
  return Array.from({ length: 12 }, (_, month) => month).filter((month) => {
    const date = new Date(year, month, 1)
    if (startMonth && isBefore(date, startOfMonth(startMonth))) return false
    return !(endMonth && isAfter(date, endMonth))
  })
}

type FormatOptions = { locale?: Locale }

export const formatCaption = (month: Date, options?: FormatOptions) =>
  format(month, "LLLL y", options)

export const formatDay = (date: Date, options?: FormatOptions) =>
  format(date, "d", options)

export const formatWeekdayName = (date: Date, options?: FormatOptions) =>
  format(date, "cccccc", options)

export const formatMonthDropdown = (month: Date, options?: FormatOptions) =>
  format(month, "LLL", options)

export const formatYearDropdown = (year: Date, options?: FormatOptions) =>
  format(year, "yyyy", options)

export const formatWeekNumber = (weekNumber: number) =>
  weekNumber < 10 ? `0${weekNumber}` : String(weekNumber)

/** What a screen reader says for a day. */
export function getDayLabel(
  date: Date,
  modifiers: Pick<DayModifiers, "today" | "selected">,
  options?: FormatOptions
) {
  const name = format(date, "PPPP", options)
  const label = modifiers.today ? `Today, ${name}` : name
  return modifiers.selected ? `${label}, selected` : label
}
