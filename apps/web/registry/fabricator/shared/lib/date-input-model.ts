// Date Input's rules as pure functions: reading typed text as a date, writing a
// date back in the display format, and checking it against a range. No React
// and no DOM, so the website and React Native share it. The current day comes
// in as `referenceDate`; nothing here reads the clock.

import {
  addDays,
  format as formatWithPattern,
  isValid,
  parse,
  startOfDay,
  type Locale,
} from "date-fns"

const DEFAULT_DATE_FORMAT = "MMM d, yyyy"
const ISO_DATE_FORMAT = "yyyy-MM-dd"

const RELATIVE_DAYS: Record<string, number> = {
  yesterday: -1,
  today: 0,
  tomorrow: 1,
}

type DateFormatOptions = {
  format?: string
  locale?: Locale
}

type DateRange = {
  minDate?: Date
  maxDate?: Date
}

type DateParseOptions = DateFormatOptions & {
  referenceDate: Date
}

type DateCommit = {
  value: Date | undefined
  text: string
  isInvalid: boolean
}

function isDate(date: Date | undefined): date is Date {
  return date !== undefined && isValid(date)
}

/** The date in the display format, or "" without one. */
function formatDateValue(
  date: Date | undefined,
  { format = DEFAULT_DATE_FORMAT, locale }: DateFormatOptions = {}
) {
  if (!isDate(date)) return ""
  return formatWithPattern(date, format, { locale })
}

/** The local calendar day as yyyy-MM-dd, what a form submits. */
function formatIsoDate(date: Date | undefined) {
  if (!isDate(date)) return ""
  return formatWithPattern(date, ISO_DATE_FORMAT)
}

function parseWithPattern(
  text: string,
  pattern: string,
  { locale, referenceDate }: { locale?: Locale; referenceDate: Date }
) {
  const date = parse(text, pattern, referenceDate, { locale })
  if (!isValid(date)) return undefined
  // "Jun 1, 25" would otherwise be the year 25.
  const year = date.getFullYear()
  if (year < 1000 || year > 9999) return undefined
  return startOfDay(date)
}

/**
 * Reads typed text as a day: the display format, ISO yyyy-MM-dd, or today,
 * tomorrow and yesterday. Undefined when it isn't a whole, real date.
 */
function parseDateText(
  text: string,
  { format = DEFAULT_DATE_FORMAT, locale, referenceDate }: DateParseOptions
) {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return undefined
  const offset = RELATIVE_DAYS[normalized.toLowerCase()]
  if (offset !== undefined) return addDays(startOfDay(referenceDate), offset)
  return (
    parseWithPattern(normalized, format, { locale, referenceDate }) ??
    parseWithPattern(normalized, ISO_DATE_FORMAT, { referenceDate })
  )
}

/** Whether the day falls within the range, both ends included. */
function isDateInRange(date: Date, { minDate, maxDate }: DateRange) {
  const time = startOfDay(date).getTime()
  if (minDate && time < startOfDay(minDate).getTime()) return false
  if (maxDate && time > startOfDay(maxDate).getTime()) return false
  return true
}

/**
 * What the field holds once the text is committed (blur or Enter). A date is
 * rewritten in the display format. Text that isn't a date stays as typed and a
 * date outside the range is rewritten; both leave no value and mark the field
 * invalid.
 */
function commitDateText(
  text: string,
  options: DateParseOptions & DateRange
): DateCommit {
  if (!text.trim()) return { value: undefined, text: "", isInvalid: false }
  const date = parseDateText(text, options)
  if (!date) return { value: undefined, text, isInvalid: true }
  const formatted = formatDateValue(date, options)
  if (!isDateInRange(date, options)) {
    return { value: undefined, text: formatted, isInvalid: true }
  }
  return { value: date, text: formatted, isInvalid: false }
}

/** Whether two values are the same day, or both empty. */
function isSameDateValue(first: Date | undefined, second: Date | undefined) {
  return formatIsoDate(first) === formatIsoDate(second)
}

export {
  commitDateText,
  DEFAULT_DATE_FORMAT,
  formatDateValue,
  formatIsoDate,
  isDateInRange,
  isSameDateValue,
  ISO_DATE_FORMAT,
  parseDateText,
  type DateCommit,
  type DateFormatOptions,
  type DateParseOptions,
  type DateRange,
}
