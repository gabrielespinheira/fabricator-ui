// Month Input's rules as pure functions: reading typed text as a month,
// writing it back in the display format, the range check and the year grid.
// Values are "yyyy-MM", what a month field submits. No React and no DOM, so the
// website and React Native share it. The current month comes in as
// `referenceDate`; nothing here reads the clock.

import {
  addMonths,
  format as formatWithPattern,
  isValid,
  parse,
  type Locale,
} from "date-fns"

const DEFAULT_MONTH_FORMAT = "MMM yyyy"
const VALUE_FORMAT = "yyyy-MM"
const TYPED_FORMATS = ["MMMM yyyy", "MMM yyyy", "yyyy-MM", "M/yyyy", "MM/yyyy"]

const RELATIVE_MONTHS: Record<string, number> = {
  "last month": -1,
  "this month": 0,
  "next month": 1,
}

type MonthFormatOptions = {
  format?: string
  locale?: Locale
}

type MonthRange = {
  minMonth?: string
  maxMonth?: string
}

type MonthParseOptions = MonthFormatOptions & {
  referenceDate: Date
}

type MonthCommit = {
  value: string | undefined
  text: string
  isInvalid: boolean
}

type MonthOption = {
  value: string
  label: string
  isDisabled: boolean
}

function toDate(month: string) {
  const [year = 0, monthNumber = 1] = month.split("-").map(Number)
  return new Date(year, monthNumber - 1, 1)
}

function toValue(date: Date) {
  return formatWithPattern(date, VALUE_FORMAT)
}

/** The month in the display format, or "" without one. */
function formatMonthValue(
  month: string | undefined,
  { format = DEFAULT_MONTH_FORMAT, locale }: MonthFormatOptions = {}
) {
  if (!month) return ""
  return formatWithPattern(toDate(month), format, { locale })
}

/**
 * Reads typed text as a month: the display format, Nov 2026, November 2026,
 * 2026-11, 11/2026, or this, next and last month. Undefined when it isn't one.
 */
function parseMonthText(
  text: string,
  { format = DEFAULT_MONTH_FORMAT, locale, referenceDate }: MonthParseOptions
) {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return undefined
  const offset = RELATIVE_MONTHS[normalized.toLowerCase()]
  if (offset !== undefined) return toValue(addMonths(referenceDate, offset))

  for (const pattern of [format, ...TYPED_FORMATS]) {
    const date = parse(normalized, pattern, referenceDate, { locale })
    if (!isValid(date)) continue
    // "Nov 26" would otherwise be the year 26.
    const year = date.getFullYear()
    if (year < 1000 || year > 9999) continue
    return toValue(date)
  }
  return undefined
}

/** Whether the month falls within the range, both ends included. */
function isMonthInRange(month: string, { minMonth, maxMonth }: MonthRange) {
  // yyyy-MM strings sort as the months do.
  if (minMonth && month < minMonth) return false
  if (maxMonth && month > maxMonth) return false
  return true
}

/** The twelve months of a year for the grid, with those out of range off. */
function getMonthOptions(
  year: number,
  range: MonthRange & { locale?: Locale } = {}
): MonthOption[] {
  return Array.from({ length: 12 }, (_, index) => {
    const date = new Date(year, index, 1)
    const value = toValue(date)
    return {
      value,
      label: formatWithPattern(date, "MMM", { locale: range.locale }),
      isDisabled: !isMonthInRange(value, range),
    }
  })
}

/** The month a number of months away. */
function moveMonth(month: string, months: number) {
  return toValue(addMonths(toDate(month), months))
}

/** The year a month falls in. */
function getMonthYear(month: string) {
  return toDate(month).getFullYear()
}

/**
 * What the field holds once the text is committed (blur or Enter). A month is
 * rewritten in the display format. Text that isn't a month stays as typed and
 * a month outside the range is rewritten; both leave no value and mark the
 * field invalid.
 */
function commitMonthText(
  text: string,
  options: MonthParseOptions & MonthRange
): MonthCommit {
  if (!text.trim()) return { value: undefined, text: "", isInvalid: false }
  const month = parseMonthText(text, options)
  if (!month) return { value: undefined, text, isInvalid: true }
  const formatted = formatMonthValue(month, options)
  if (!isMonthInRange(month, options)) {
    return { value: undefined, text: formatted, isInvalid: true }
  }
  return { value: month, text: formatted, isInvalid: false }
}

export {
  commitMonthText,
  DEFAULT_MONTH_FORMAT,
  formatMonthValue,
  getMonthOptions,
  getMonthYear,
  isMonthInRange,
  moveMonth,
  parseMonthText,
  toValue as toMonthValue,
  type MonthCommit,
  type MonthOption,
  type MonthRange,
}
