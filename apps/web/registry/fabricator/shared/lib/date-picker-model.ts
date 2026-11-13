// Date Picker's rules as pure functions: reading typed text as a date, writing a
// date back in the display format, checking it against a range, and the grid of
// months or years. A value at month or year granularity is the first day of its
// month or year. No React and no DOM, so the website and React Native share it.
// The current day comes in as `referenceDate`; nothing here reads the clock.

import {
  addDays,
  addMonths,
  addYears,
  format as formatWithPattern,
  isValid,
  parse,
  startOfDay,
  startOfMonth,
  startOfYear,
  type Locale,
} from "date-fns"

/** What one value is: a day, a month or a year. */
type DateGranularity = "day" | "month" | "year"

/** The granularities picked from a grid instead of a calendar. */
type DateGridGranularity = Exclude<DateGranularity, "day">

const DEFAULT_DATE_FORMAT = "MMM d, yyyy"
const ISO_DATE_FORMAT = "yyyy-MM-dd"

const DEFAULT_FORMATS: Record<DateGranularity, string> = {
  day: DEFAULT_DATE_FORMAT,
  month: "MMM yyyy",
  year: "yyyy",
}

const ISO_FORMATS: Record<DateGranularity, string> = {
  day: ISO_DATE_FORMAT,
  month: "yyyy-MM",
  year: "yyyy",
}

// What typing reads besides the display format.
const TYPED_FORMATS: Record<DateGranularity, string[]> = {
  day: [ISO_DATE_FORMAT],
  month: ["MMMM yyyy", "MMM yyyy", "yyyy-MM", "M/yyyy", "MM/yyyy"],
  year: ["yyyy"],
}

const RELATIVE_WORDS: Record<DateGranularity, Record<string, number>> = {
  day: { yesterday: -1, today: 0, tomorrow: 1 },
  month: { "last month": -1, "this month": 0, "next month": 1 },
  year: { "last year": -1, "this year": 0, "next year": 1 },
}

// A page of the grid: a year of months, or twelve years.
const GRID_PAGE_SIZE = 12

type DateFormatOptions = {
  format?: string
  locale?: Locale
  granularity?: DateGranularity
}

type DateRange = {
  minDate?: Date
  maxDate?: Date
  granularity?: DateGranularity
}

type DateParseOptions = DateFormatOptions & {
  referenceDate: Date
}

type DateCommit = {
  value: Date | undefined
  text: string
  isInvalid: boolean
}

type DateGridOption = {
  value: Date
  /** What the cell shows: Jan, or 2026. */
  label: string
  /** What it's called aloud: January 2026, or 2026. */
  fullLabel: string
  isDisabled: boolean
}

function isDate(date: Date | undefined): date is Date {
  return date !== undefined && isValid(date)
}

/** The day, month or year a date falls in, as its first moment. */
function startOfGranularity(date: Date, granularity: DateGranularity) {
  if (granularity === "year") return startOfYear(date)
  if (granularity === "month") return startOfMonth(date)
  return startOfDay(date)
}

/** The display format a granularity uses unless `format` says otherwise. */
function getDefaultDateFormat(granularity: DateGranularity = "day") {
  return DEFAULT_FORMATS[granularity]
}

/** The date in the display format, or "" without one. */
function formatDateValue(
  date: Date | undefined,
  { granularity = "day", format, locale }: DateFormatOptions = {}
) {
  if (!isDate(date)) return ""
  return formatWithPattern(date, format ?? DEFAULT_FORMATS[granularity], {
    locale,
  })
}

/**
 * The local date as a form submits it: yyyy-MM-dd for a day, yyyy-MM for a
 * month (an `<input type="month">`'s value) and yyyy for a year.
 */
function formatIsoDate(
  date: Date | undefined,
  { granularity = "day" }: { granularity?: DateGranularity } = {}
) {
  if (!isDate(date)) return ""
  return formatWithPattern(date, ISO_FORMATS[granularity])
}

/**
 * The day and its time as a form's datetime-local value: yyyy-MM-ddTHH:mm, or
 * yyyy-MM-ddTHH:mm:ss with seconds.
 */
function formatIsoDateTime(
  date: Date | undefined,
  { hasSeconds = false }: { hasSeconds?: boolean } = {}
) {
  if (!isDate(date)) return ""
  return formatWithPattern(
    date,
    hasSeconds ? "yyyy-MM-dd'T'HH:mm:ss" : "yyyy-MM-dd'T'HH:mm"
  )
}

/** The day with the time of day "HH:mm" or "HH:mm:ss" on it. */
function setDateTime(date: Date, time: string) {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(":").map(Number)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    hours,
    minutes,
    seconds
  )
}

// What a time looks like at the end of typed text: 10:30, 9.30, 9pm, noon.
const TIME_TEXT_PATTERN =
  /^(\d{1,2}[:.]\d{2}|\d{1,2}\s*[ap]\.?m?\.?|noon|midnight)/i

/**
 * Typed text split into its date and its time: "Nov 12, 2026, 10:30 AM" or
 * "tomorrow at 9pm". The part after the last comma or "at" is the time only
 * when it reads like one, so a date's own year stays with the date.
 */
function splitDateTimeText(text: string) {
  const trimmed = text.trim()
  const match = /^(.*?)(?:,\s*|\s+at\s+)([^,]+)$/i.exec(trimmed)
  const timeText = match?.[2]?.trim()
  if (!match?.[1] || !timeText || !TIME_TEXT_PATTERN.test(timeText)) {
    return { dateText: trimmed, timeText: undefined }
  }
  return { dateText: match[1].trim(), timeText }
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
  return date
}

/** The date a number of days, months or years away. */
function moveDateCell(
  date: Date,
  amount: number,
  granularity: DateGranularity
) {
  const start = startOfGranularity(date, granularity)
  if (granularity === "year") return addYears(start, amount)
  if (granularity === "month") return addMonths(start, amount)
  return addDays(start, amount)
}

/**
 * Reads typed text as a date at its granularity. A day: the display format,
 * ISO yyyy-MM-dd, or today, tomorrow and yesterday. A month: the display
 * format, November 2026, 2026-11, 11/2026, or this, next and last month. A
 * year: four digits, or this, next and last year. Undefined when it isn't a
 * whole, real one.
 */
function parseDateText(
  text: string,
  { granularity = "day", format, locale, referenceDate }: DateParseOptions
) {
  const normalized = text.trim().replace(/\s+/g, " ")
  if (!normalized) return undefined
  const offset = RELATIVE_WORDS[granularity][normalized.toLowerCase()]
  if (offset !== undefined) {
    return moveDateCell(referenceDate, offset, granularity)
  }
  const patterns = [
    format ?? DEFAULT_FORMATS[granularity],
    ...TYPED_FORMATS[granularity],
  ]
  for (const pattern of patterns) {
    const date = parseWithPattern(normalized, pattern, {
      locale,
      referenceDate,
    })
    if (date) return startOfGranularity(date, granularity)
  }
  return undefined
}

/**
 * Whether the date falls within the range, both ends included, comparing
 * whole days, months or years.
 */
function isDateInRange(
  date: Date,
  { minDate, maxDate, granularity = "day" }: DateRange
) {
  const time = startOfGranularity(date, granularity).getTime()
  if (minDate && time < startOfGranularity(minDate, granularity).getTime()) {
    return false
  }
  if (maxDate && time > startOfGranularity(maxDate, granularity).getTime()) {
    return false
  }
  return true
}

/** The first cell of the grid page a date falls on. */
function getDateGridPage(date: Date, granularity: DateGridGranularity) {
  if (granularity === "month") return startOfYear(date)
  const year = date.getFullYear()
  const offset = ((year % GRID_PAGE_SIZE) + GRID_PAGE_SIZE) % GRID_PAGE_SIZE
  return new Date(year - offset, 0, 1)
}

/** Whether two dates fall on the same grid page. */
function isSameDateGridPage(
  first: Date,
  second: Date,
  granularity: DateGridGranularity
) {
  return (
    getDateGridPage(first, granularity).getTime() ===
    getDateGridPage(second, granularity).getTime()
  )
}

/** The grid's heading: the year of months, or the span of years. */
function getDateGridTitle(date: Date, granularity: DateGridGranularity) {
  const first = getDateGridPage(date, granularity).getFullYear()
  if (granularity === "month") return String(first)
  return `${first}–${first + GRID_PAGE_SIZE - 1}`
}

/**
 * The twelve cells on the page a date falls on (the months of its year, or
 * twelve years), with those outside the range off.
 */
function getDateGridOptions(
  date: Date,
  {
    granularity,
    minDate,
    maxDate,
    locale,
  }: {
    granularity: DateGridGranularity
    minDate?: Date
    maxDate?: Date
    locale?: Locale
  }
): DateGridOption[] {
  const page = getDateGridPage(date, granularity)
  return Array.from({ length: GRID_PAGE_SIZE }, (_, index) => {
    const value = moveDateCell(page, index, granularity)
    return {
      value,
      label: formatWithPattern(
        value,
        granularity === "month" ? "MMM" : "yyyy",
        {
          locale,
        }
      ),
      fullLabel: formatWithPattern(
        value,
        granularity === "month" ? "MMMM yyyy" : "yyyy",
        { locale }
      ),
      isDisabled: !isDateInRange(value, { minDate, maxDate, granularity }),
    }
  })
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

/**
 * Whether two values are the same day (or month, or year), or both empty.
 */
function isSameDateValue(
  first: Date | undefined,
  second: Date | undefined,
  { granularity = "day" }: { granularity?: DateGranularity } = {}
) {
  return (
    formatIsoDate(first, { granularity }) ===
    formatIsoDate(second, { granularity })
  )
}

export {
  commitDateText,
  DEFAULT_DATE_FORMAT,
  formatDateValue,
  formatIsoDate,
  formatIsoDateTime,
  getDateGridOptions,
  getDateGridTitle,
  getDefaultDateFormat,
  isDateInRange,
  isSameDateGridPage,
  isSameDateValue,
  ISO_DATE_FORMAT,
  moveDateCell,
  parseDateText,
  setDateTime,
  splitDateTimeText,
  startOfGranularity,
  type DateCommit,
  type DateFormatOptions,
  type DateGranularity,
  type DateGridGranularity,
  type DateGridOption,
  type DateParseOptions,
  type DateRange,
}
