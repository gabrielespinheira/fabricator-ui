// The Data Table's rules, free of React and the DOM: what each column type
// filters, formats, sorts, edits and calculates, the same query a server can
// run, and the arithmetic behind pagination, infinite scroll and selection.

export type DataTableColumnType =
  | "text"
  | "number"
  | "currency"
  | "percent"
  | "date"
  | "status"
  | "tags"
  | "person"
  | "link"
  | "email"
  | "boolean"
  | "progress"

export type DataTableFilterKind =
  | "text"
  | "number"
  | "date"
  | "option"
  | "multi"
  | "boolean"

export type DataTableOperator =
  | "contains"
  | "notContains"
  | "is"
  | "isNot"
  | "startsWith"
  | "endsWith"
  | "eq"
  | "neq"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "between"
  | "within"
  | "on"
  | "before"
  | "after"
  | "onOrBefore"
  | "onOrAfter"
  | "anyOf"
  | "noneOf"
  | "hasAny"
  | "hasAll"
  | "hasNone"
  | "checked"
  | "unchecked"
  | "empty"
  | "notEmpty"

export type DataTableDatePreset =
  | "today"
  | "yesterday"
  | "pastWeek"
  | "pastMonth"
  | "pastYear"
  | "thisMonth"
  | "thisYear"
  | "nextWeek"
  | "nextMonth"

/**
 * A column filter: a condition and what it compares with. `value` is text
 * for text columns, a number (or a day, in ms) for numbers and dates, and a
 * list of option values for statuses, people and tags. `to` closes a
 * `between`; `preset` is the range of `within`.
 */
export type DataTableFilter = {
  operator: DataTableOperator
  value?: string | number | string[]
  to?: number
  preset?: DataTableDatePreset
}

export type DataTableAlign = "start" | "center" | "end"

export type DataTableAggregate =
  | "count"
  | "filled"
  | "empty"
  | "unique"
  | "sum"
  | "average"
  | "median"
  | "min"
  | "max"
  | "checked"
  | "unchecked"

export type DataTableFormatOptions = {
  /** BCP 47 locale for every number and date. Fixed so the server and the browser agree. */
  locale?: string
  /** ISO 4217 code for currency columns. */
  currency?: string
  /** Short forms: 1.3M, 12K. */
  compact?: boolean
  /** Most digits after the point. */
  fractionDigits?: number
  /** Dates as "3 days ago" instead of "Nov 9, 2026". */
  relative?: boolean
  /** The time relative dates count from, in milliseconds. */
  now?: number
}

export const DATA_TABLE_LOCALE = "en-US"

type Option<T> = { value: T; label: string }

const OPERATORS: Record<DataTableFilterKind, Option<DataTableOperator>[]> = {
  text: [
    { value: "contains", label: "Contains" },
    { value: "notContains", label: "Does not contain" },
    { value: "is", label: "Is" },
    { value: "isNot", label: "Is not" },
    { value: "startsWith", label: "Starts with" },
    { value: "endsWith", label: "Ends with" },
    { value: "empty", label: "Is empty" },
    { value: "notEmpty", label: "Is not empty" },
  ],
  number: [
    { value: "eq", label: "=" },
    { value: "neq", label: "≠" },
    { value: "gt", label: ">" },
    { value: "gte", label: "≥" },
    { value: "lt", label: "<" },
    { value: "lte", label: "≤" },
    { value: "between", label: "Is between" },
    { value: "empty", label: "Is empty" },
    { value: "notEmpty", label: "Is not empty" },
  ],
  date: [
    { value: "within", label: "Is within" },
    { value: "on", label: "Is" },
    { value: "before", label: "Is before" },
    { value: "after", label: "Is after" },
    { value: "onOrBefore", label: "Is on or before" },
    { value: "onOrAfter", label: "Is on or after" },
    { value: "between", label: "Is between" },
    { value: "empty", label: "Is empty" },
    { value: "notEmpty", label: "Is not empty" },
  ],
  option: [
    { value: "anyOf", label: "Is any of" },
    { value: "noneOf", label: "Is none of" },
    { value: "empty", label: "Is empty" },
    { value: "notEmpty", label: "Is not empty" },
  ],
  multi: [
    { value: "hasAny", label: "Has any of" },
    { value: "hasAll", label: "Has all of" },
    { value: "hasNone", label: "Has none of" },
    { value: "empty", label: "Is empty" },
    { value: "notEmpty", label: "Is not empty" },
  ],
  boolean: [
    { value: "checked", label: "Is checked" },
    { value: "unchecked", label: "Is not checked" },
  ],
}

export const DATA_TABLE_DATE_PRESETS: Option<DataTableDatePreset>[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "pastWeek", label: "Past week" },
  { value: "pastMonth", label: "Past month" },
  { value: "pastYear", label: "Past year" },
  { value: "thisMonth", label: "This month" },
  { value: "thisYear", label: "This year" },
  { value: "nextWeek", label: "Next week" },
  { value: "nextMonth", label: "Next month" },
]

export const DATA_TABLE_AGGREGATE_LABELS: Record<DataTableAggregate, string> = {
  count: "Count",
  filled: "Filled",
  empty: "Empty",
  unique: "Unique",
  sum: "Sum",
  average: "Average",
  median: "Median",
  min: "Min",
  max: "Max",
  checked: "Checked",
  unchecked: "Unchecked",
}

const FILTER_KINDS: Record<DataTableColumnType, DataTableFilterKind> = {
  text: "text",
  email: "text",
  link: "text",
  number: "number",
  currency: "number",
  percent: "number",
  progress: "number",
  date: "date",
  status: "option",
  person: "option",
  tags: "multi",
  boolean: "boolean",
}

export function getFilterKind(type: DataTableColumnType): DataTableFilterKind {
  return FILTER_KINDS[type]
}

/** The conditions a kind of filter offers, its default first. */
export function getOperators(kind: DataTableFilterKind) {
  return OPERATORS[kind]
}

export function getDefaultOperator(kind: DataTableFilterKind) {
  return OPERATORS[kind][0].value
}

const VALUELESS: ReadonlySet<DataTableOperator> = new Set([
  "empty",
  "notEmpty",
  "checked",
  "unchecked",
])

/** Whether a condition compares with a value (empty, checked… don't). */
export function needsFilterValue(operator: DataTableOperator) {
  return !VALUELESS.has(operator)
}

// MARK: Column defaults

type ColumnTypeDefaults = {
  size: number
  minSize: number
  align: DataTableAlign
  sortDescFirst: boolean
}

const COLUMN_DEFAULTS: Record<DataTableColumnType, ColumnTypeDefaults> = {
  text: { size: 220, minSize: 120, align: "start", sortDescFirst: false },
  email: { size: 240, minSize: 140, align: "start", sortDescFirst: false },
  link: { size: 200, minSize: 120, align: "start", sortDescFirst: false },
  number: { size: 130, minSize: 90, align: "end", sortDescFirst: true },
  currency: { size: 160, minSize: 110, align: "end", sortDescFirst: true },
  percent: { size: 130, minSize: 90, align: "end", sortDescFirst: true },
  progress: { size: 170, minSize: 120, align: "start", sortDescFirst: true },
  date: { size: 170, minSize: 120, align: "start", sortDescFirst: true },
  status: { size: 150, minSize: 110, align: "start", sortDescFirst: false },
  person: { size: 190, minSize: 130, align: "start", sortDescFirst: false },
  tags: { size: 240, minSize: 140, align: "start", sortDescFirst: false },
  boolean: { size: 124, minSize: 80, align: "center", sortDescFirst: false },
}

/** Width, minimum width, alignment and first sort direction for a type. */
export function getColumnTypeDefaults(
  type: DataTableColumnType
): ColumnTypeDefaults {
  return COLUMN_DEFAULTS[type]
}

// MARK: Reading values

/** A date-like value as milliseconds, or null when it isn't one. */
export function toTimestamp(value: unknown): number | null {
  if (value instanceof Date) {
    const time = value.getTime()
    return Number.isNaN(time) ? null : time
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null
  if (typeof value === "string" && value.trim() !== "") {
    const time = Date.parse(value)
    return Number.isNaN(time) ? null : time
  }
  return null
}

function toNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function toText(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (Array.isArray(value)) return value.map(toText).join(" ")
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function toList(value: unknown): string[] {
  if (isBlank(value)) return []
  return Array.isArray(value) ? value.map(toText) : [toText(value)]
}

function isBlank(value: unknown) {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim() === ""
  if (Array.isArray(value)) return value.length === 0
  return false
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isOperatorOf(
  kind: DataTableFilterKind,
  value: unknown
): value is DataTableOperator {
  return OPERATORS[kind].some((option) => option.value === value)
}

function isDatePreset(value: unknown): value is DataTableDatePreset {
  return DATA_TABLE_DATE_PRESETS.some((option) => option.value === value)
}

/** A column filter for a kind, or null when the value isn't one. */
export function readFilter(
  kind: DataTableFilterKind,
  value: unknown
): DataTableFilter | null {
  if (!isRecord(value) || !isOperatorOf(kind, value.operator)) return null
  const raw = value.value
  const list = Array.isArray(raw)
    ? raw.filter((item): item is string => typeof item === "string")
    : undefined
  const scalar =
    typeof raw === "string" || typeof raw === "number" ? raw : undefined
  const to = toNumber(value.to)
  return {
    operator: value.operator,
    ...(list ? { value: list } : scalar === undefined ? {} : { value: scalar }),
    ...(to === null ? {} : { to }),
    ...(isDatePreset(value.preset) ? { preset: value.preset } : {}),
  }
}

// MARK: Filters

/** Whether a filter narrows anything; incomplete ones leave the state. */
export function isFilterActive(kind: DataTableFilterKind, filter: unknown) {
  const read = readFilter(kind, filter)
  if (!read) return false
  const { operator, value, to, preset } = read
  if (!needsFilterValue(operator)) return true
  if (operator === "within") return preset !== undefined
  if (operator === "between") {
    return typeof value === "number" || to !== undefined
  }
  if (kind === "text") return typeof value === "string" && value.trim() !== ""
  if (kind === "option" || kind === "multi") {
    return Array.isArray(value) && value.length > 0
  }
  return typeof value === "number"
}

function matchesText(cell: unknown, { operator, value }: DataTableFilter) {
  const query = toText(value).trim().toLowerCase()
  const text = toText(cell).trim().toLowerCase()
  switch (operator) {
    case "notContains":
      return !text.includes(query)
    case "is":
      return text === query
    case "isNot":
      return text !== query
    case "startsWith":
      return text.startsWith(query)
    case "endsWith":
      return text.endsWith(query)
    default:
      return text.includes(query)
  }
}

function isWithin(value: number, from?: number, to?: number) {
  if (from !== undefined && value < from) return false
  if (to !== undefined && value > to) return false
  return true
}

function matchesNumber(
  cell: unknown,
  { operator, value, to }: DataTableFilter
) {
  const number = toNumber(cell)
  const target = toNumber(value)
  if (operator === "neq") return number === null || number !== target
  if (number === null) return false
  if (operator === "between") return isWithin(number, target ?? undefined, to)
  if (target === null) return true
  switch (operator) {
    case "gt":
      return number > target
    case "gte":
      return number >= target
    case "lt":
      return number < target
    case "lte":
      return number <= target
    default:
      return number === target
  }
}

function matchesDate(
  cell: unknown,
  { operator, value, to, preset }: DataTableFilter,
  now: number
) {
  const time = toTimestamp(cell)
  if (time === null) return false
  if (operator === "within") {
    if (!preset) return true
    const range = getDatePresetRange(preset, now)
    return isWithin(time, range.from, range.to)
  }
  const day = toNumber(value)
  if (operator === "between") {
    return isWithin(
      time,
      day === null ? undefined : startOfDay(day),
      to === undefined ? undefined : endOfDay(to)
    )
  }
  if (day === null) return true
  switch (operator) {
    case "before":
      return time < startOfDay(day)
    case "after":
      return time > endOfDay(day)
    case "onOrBefore":
      return time <= endOfDay(day)
    case "onOrAfter":
      return time >= startOfDay(day)
    default:
      return isWithin(time, startOfDay(day), endOfDay(day))
  }
}

function matchesList(cell: unknown, { operator, value }: DataTableFilter) {
  const items = toList(cell)
  const picked = Array.isArray(value) ? value : []
  switch (operator) {
    case "noneOf":
    case "hasNone":
      return !items.some((item) => picked.includes(item))
    case "hasAll":
      return picked.every((item) => items.includes(item))
    default:
      return items.some((item) => picked.includes(item))
  }
}

/**
 * Whether a cell's value passes its column's filter. `now` anchors relative
 * dates ("within the past week").
 */
export function matchesFilter(
  kind: DataTableFilterKind,
  cell: unknown,
  filter: unknown,
  now: number = Date.now()
): boolean {
  if (!isFilterActive(kind, filter)) return true
  const read = readFilter(kind, filter)
  if (!read) return true
  switch (read.operator) {
    case "empty":
      return isBlank(cell)
    case "notEmpty":
      return !isBlank(cell)
    case "checked":
      return cell === true
    case "unchecked":
      return cell !== true
    default:
      break
  }
  switch (kind) {
    case "text":
      return matchesText(cell, read)
    case "number":
      return matchesNumber(cell, read)
    case "date":
      return matchesDate(cell, read, now)
    default:
      return matchesList(cell, read)
  }
}

/** How many rows hold each option: lists count once per item. */
export function countOptionValues(values: readonly unknown[]) {
  const counts = new Map<string, number>()
  for (const value of values) {
    for (const key of toList(value)) {
      counts.set(key, (counts.get(key) ?? 0) + 1)
    }
  }
  return counts
}

/** The global search: the query anywhere in the cell, ignoring case. */
export function matchesSearch(value: unknown, query: string) {
  const needle = query.trim().toLowerCase()
  if (needle === "") return true
  if (isBlank(value)) return false
  return toText(value).toLowerCase().includes(needle)
}

// MARK: Dates

function startOfDay(time: number) {
  const date = new Date(time)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

function endOfDay(time: number) {
  const date = new Date(time)
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  ).getTime()
}

function shift(time: number, { days = 0, months = 0, years = 0 }) {
  const date = new Date(time)
  return new Date(
    date.getFullYear() + years,
    date.getMonth() + months,
    date.getDate() + days
  ).getTime()
}

/** The whole local days a relative range covers, as seen from `now`. */
export function getDatePresetRange(
  preset: DataTableDatePreset,
  now: number
): { from: number; to: number } {
  const today = new Date(now)
  switch (preset) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) }
    case "yesterday": {
      const yesterday = shift(now, { days: -1 })
      return { from: yesterday, to: endOfDay(yesterday) }
    }
    case "pastWeek":
      return { from: shift(now, { days: -6 }), to: endOfDay(now) }
    case "pastMonth":
      return { from: shift(now, { months: -1 }), to: endOfDay(now) }
    case "pastYear":
      return { from: shift(now, { years: -1 }), to: endOfDay(now) }
    case "thisMonth":
      return {
        from: new Date(today.getFullYear(), today.getMonth(), 1).getTime(),
        to: endOfDay(now),
      }
    case "thisYear":
      return {
        from: new Date(today.getFullYear(), 0, 1).getTime(),
        to: endOfDay(now),
      }
    case "nextWeek":
      return { from: startOfDay(now), to: endOfDay(shift(now, { days: 6 })) }
    case "nextMonth":
      return { from: startOfDay(now), to: endOfDay(shift(now, { months: 1 })) }
  }
}

// MARK: Formatting

const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()
const relativeFormats = new Map<string, Intl.RelativeTimeFormat>()

function getNumberFormat(locale: string, options: Intl.NumberFormatOptions) {
  const key = `${locale}|${JSON.stringify(options)}`
  const cached = numberFormats.get(key)
  if (cached) return cached
  const format = new Intl.NumberFormat(locale, options)
  numberFormats.set(key, format)
  return format
}

function getDateFormat(locale: string) {
  const cached = dateFormats.get(locale)
  if (cached) return cached
  const format = new Intl.DateTimeFormat(locale, { dateStyle: "medium" })
  dateFormats.set(locale, format)
  return format
}

function getRelativeFormat(locale: string) {
  const cached = relativeFormats.get(locale)
  if (cached) return cached
  const format = new Intl.RelativeTimeFormat(locale, { numeric: "auto" })
  relativeFormats.set(locale, format)
  return format
}

const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

function formatRelativeDate(time: number, now: number, locale: string) {
  const format = getRelativeFormat(locale)
  // Within a day: "now", minutes, hours. Beyond: calendar days and up.
  const difference = time - now
  const sign = difference < 0 ? -1 : 1
  const distance = Math.abs(difference)
  if (distance < 45_000) return format.format(0, "second")
  if (distance < 45 * MINUTE) {
    return format.format(sign * Math.round(distance / MINUTE), "minute")
  }
  if (distance < 22 * HOUR) {
    return format.format(sign * Math.round(distance / HOUR), "hour")
  }
  return formatRelativeDays(time, now, format)
}

function formatRelativeDays(
  time: number,
  now: number,
  format: Intl.RelativeTimeFormat
) {
  const days = Math.round((startOfDay(time) - startOfDay(now)) / DAY)
  const elapsed = Math.abs(days)
  const sign = days < 0 ? -1 : 1
  if (elapsed < 7) return format.format(days, "day")
  if (elapsed < 30) return format.format(sign * Math.floor(elapsed / 7), "week")
  if (elapsed < 365) {
    return format.format(
      sign * Math.max(1, Math.floor(elapsed / 30.4375)),
      "month"
    )
  }
  return format.format(sign * Math.floor(elapsed / 365.25), "year")
}

function formatNumberLike(
  type: DataTableColumnType,
  value: number,
  options: DataTableFormatOptions
) {
  const locale = options.locale ?? DATA_TABLE_LOCALE
  const notation = options.compact ? "compact" : "standard"
  const digits =
    options.fractionDigits === undefined
      ? {}
      : {
          minimumFractionDigits: 0,
          maximumFractionDigits: options.fractionDigits,
        }
  if (type === "currency") {
    return getNumberFormat(locale, {
      style: "currency",
      currency: options.currency ?? "USD",
      notation,
      ...digits,
    }).format(value)
  }
  if (type === "percent") {
    return getNumberFormat(locale, {
      style: "percent",
      maximumFractionDigits: options.fractionDigits ?? 0,
    }).format(value)
  }
  if (type === "progress") return `${Math.round(value)}%`
  return getNumberFormat(locale, {
    notation,
    maximumFractionDigits: options.fractionDigits ?? 2,
  }).format(value)
}

/** A cell's value as text, the way its column shows it. */
export function formatDataTableValue(
  type: DataTableColumnType,
  value: unknown,
  options: DataTableFormatOptions = {}
): string {
  if (value === null || value === undefined) return ""
  const locale = options.locale ?? DATA_TABLE_LOCALE
  switch (type) {
    case "number":
    case "currency":
    case "percent":
    case "progress": {
      const number = toNumber(value)
      return number === null ? "" : formatNumberLike(type, number, options)
    }
    case "date": {
      const time = toTimestamp(value)
      if (time === null) return ""
      if (options.relative) {
        return formatRelativeDate(time, options.now ?? Date.now(), locale)
      }
      return getDateFormat(locale).format(time)
    }
    case "boolean":
      return value ? "Yes" : "No"
    case "tags":
      return Array.isArray(value) ? value.map(toText).join(", ") : toText(value)
    default:
      return toText(value)
  }
}

// MARK: Calculations

const COUNTS: DataTableAggregate[] = ["count", "filled", "empty", "unique"]
const NUMBERS: DataTableAggregate[] = [
  ...COUNTS,
  "sum",
  "average",
  "median",
  "min",
  "max",
]

/** The calculations a column's footer offers. */
export function getAggregateOptions(
  type: DataTableColumnType
): DataTableAggregate[] {
  switch (getFilterKind(type)) {
    case "number":
      return NUMBERS
    case "date":
      return ["count", "filled", "empty", "min", "max"]
    case "boolean":
      return ["count", "checked", "unchecked"]
    default:
      return COUNTS
  }
}

function readNumbers(values: readonly unknown[], dates: boolean) {
  const numbers: number[] = []
  for (const value of values) {
    const number =
      dates || value instanceof Date ? toTimestamp(value) : toNumber(value)
    if (number !== null) numbers.push(number)
  }
  return numbers
}

/** One footer calculation over the filtered rows' values. */
export function getAggregateValue(
  aggregate: DataTableAggregate,
  values: readonly unknown[],
  type?: DataTableColumnType
): number | null {
  switch (aggregate) {
    case "count":
      return values.length
    case "filled":
      return values.filter((value) => !isBlank(value)).length
    case "empty":
      return values.filter(isBlank).length
    case "unique": {
      const seen = new Set<string>()
      for (const value of values) {
        if (isBlank(value)) continue
        const items = Array.isArray(value) ? value : [value]
        for (const item of items) seen.add(toText(item))
      }
      return seen.size
    }
    case "checked":
      return values.filter((value) => value === true).length
    case "unchecked":
      return values.filter((value) => value !== true).length
    default:
      return getNumericAggregate(
        aggregate,
        readNumbers(values, type === "date")
      )
  }
}

function getNumericAggregate(
  aggregate: "sum" | "average" | "median" | "min" | "max",
  numbers: number[]
) {
  if (numbers.length === 0) return null
  switch (aggregate) {
    case "sum":
      return numbers.reduce((total, number) => total + number, 0)
    case "average":
      return (
        numbers.reduce((total, number) => total + number, 0) / numbers.length
      )
    case "median": {
      const sorted = [...numbers].sort((a, b) => a - b)
      const middle = Math.floor(sorted.length / 2)
      return sorted.length % 2 === 0
        ? (sorted[middle - 1] + sorted[middle]) / 2
        : sorted[middle]
    }
    case "min":
      return Math.min(...numbers)
    case "max":
      return Math.max(...numbers)
  }
}

const COUNTING: ReadonlySet<DataTableAggregate> = new Set([
  "count",
  "filled",
  "empty",
  "unique",
  "checked",
  "unchecked",
])

/** A calculation's result: counts as plain numbers, the rest in the column's format. */
export function formatDataTableAggregate(
  type: DataTableColumnType,
  aggregate: DataTableAggregate,
  value: number | null,
  options: DataTableFormatOptions = {}
) {
  if (value === null) return "–"
  if (COUNTING.has(aggregate))
    return formatDataTableValue("number", value, options)
  // A footer date is a point to read precisely, never "now".
  if (type === "date") {
    return formatDataTableValue("date", value, { ...options, relative: false })
  }
  return formatDataTableValue(type, value, options)
}

// MARK: Pagination, scrolling and selection

/** A CSS length in px or rem as pixels, or null for anything else. */
export function toPixels(value: string, rootFontSize: number) {
  const match = /^(-?[\d.]+)(px|rem)$/.exec(value.trim())
  if (!match) return null
  const number = Number(match[1])
  if (!Number.isFinite(number)) return null
  return match[2] === "rem" ? number * rootFontSize : number
}

export type DataTablePageItem = number | "start" | "end"

/**
 * Page buttons to show: the first and last page, the pages beside the
 * current one, and an ellipsis ("start" or "end") for each gap. Always the
 * same number of items once the pages don't fit, so the bar doesn't jump.
 */
export function getPageRange(
  pageIndex: number,
  pageCount: number,
  siblings = 1
): DataTablePageItem[] {
  const pages = (from: number, to: number) =>
    Array.from({ length: to - from }, (_, index) => from + index)
  const slots = siblings * 2 + 5
  if (pageCount <= slots) return pages(0, pageCount)
  const left = Math.max(pageIndex - siblings, 1)
  const right = Math.min(pageIndex + siblings, pageCount - 2)
  const hasStartGap = left > 2
  const hasEndGap = right < pageCount - 3
  const edge = siblings * 2 + 3
  if (!hasStartGap) return [...pages(0, edge), "end", pageCount - 1]
  if (!hasEndGap) return [0, "start", ...pages(pageCount - edge, pageCount)]
  return [0, "start", ...pages(left, right + 1), "end", pageCount - 1]
}

/** The first and last row a page shows, counted from one. */
export function getPageRowRange(
  pageIndex: number,
  pageSize: number,
  rowCount: number
) {
  if (rowCount === 0) return { start: 0, end: 0 }
  const start = pageIndex * pageSize + 1
  return { start, end: Math.min(rowCount, start + pageSize - 1) }
}

/** Whether a scroll that shows up to `lastIndex` should load the next page. */
export function shouldLoadMore({
  lastIndex,
  rowCount,
  threshold,
  hasMore,
  loading,
}: {
  lastIndex: number
  rowCount: number
  threshold: number
  hasMore: boolean
  loading: boolean
}) {
  if (!hasMore || loading) return false
  return lastIndex >= rowCount - 1 - threshold
}

/** The rows a Shift-click selects: every row between the anchor and the target. */
export function getRangeSelection(
  ids: readonly string[],
  anchor: string,
  target: string
) {
  const from = ids.indexOf(anchor)
  const to = ids.indexOf(target)
  if (from === -1 || to === -1) return [target]
  return ids.slice(Math.min(from, to), Math.max(from, to) + 1)
}

// MARK: Editing

/** The text an editor starts from: percentages as whole percents. */
export function getEditText(type: DataTableColumnType, value: unknown) {
  if (isBlank(value)) return ""
  if (type === "percent") {
    const number = toNumber(value)
    return number === null ? "" : String(Math.round(number * 10_000) / 100)
  }
  return toText(value)
}

const NUMERIC: ReadonlySet<DataTableColumnType> = new Set([
  "number",
  "currency",
  "percent",
  "progress",
])

/**
 * What an editor's text means for its column: a number for numeric types
 * (symbols and separators dropped, percents back to fractions, progress
 * kept within 0 to 100), trimmed text otherwise, and null for nothing.
 */
export function parseEditText(type: DataTableColumnType, text: string) {
  const trimmed = text.trim()
  if (trimmed === "") return null
  if (!NUMERIC.has(type)) return trimmed
  const number = Number(trimmed.replace(/[^\d.-]/g, ""))
  if (!Number.isFinite(number) || !/\d/.test(trimmed)) return null
  if (type === "percent") return number / 100
  if (type === "progress") return Math.min(100, Math.max(0, number))
  return number
}

// MARK: Sorting and querying

type ColumnDescription = {
  type: DataTableColumnType
  options?: readonly Option<string>[]
}

const collators = new Map<string, Intl.Collator>()

function getCollator(locale: string) {
  const cached = collators.get(locale)
  if (cached) return cached
  const collator = new Intl.Collator(locale, {
    numeric: true,
    sensitivity: "base",
  })
  collators.set(locale, collator)
  return collator
}

function toLabels(value: unknown, options?: readonly Option<string>[]) {
  const label = (item: unknown) =>
    options?.find((option) => option.value === item)?.label ?? toText(item)
  return Array.isArray(value) ? value.map(label).join(" ") : label(value)
}

/**
 * Orders two cells of a column: numbers and dates by value, statuses by
 * their options' order, the rest by their labels. Blanks come first, so
 * they sink to the end of a descending sort.
 */
export function compareCellValues(
  a: unknown,
  b: unknown,
  { type, options }: ColumnDescription,
  locale = DATA_TABLE_LOCALE
) {
  const blankA = isBlank(a)
  const blankB = isBlank(b)
  if (blankA || blankB) return Number(blankB) - Number(blankA)
  if (NUMERIC.has(type)) return Number(a) - Number(b)
  if (type === "boolean") return Number(Boolean(a)) - Number(Boolean(b))
  if (type === "date") return (toTimestamp(a) ?? 0) - (toTimestamp(b) ?? 0)
  if (type === "status" && options) {
    const order = options.map((option) => option.value)
    const indexA = order.indexOf(toText(a))
    const indexB = order.indexOf(toText(b))
    if (indexA !== -1 && indexB !== -1) return indexA - indexB
  }
  return getCollator(locale).compare(toLabels(a, options), toLabels(b, options))
}

const SEARCHABLE: ReadonlySet<string> = new Set<DataTableColumnType>([
  "text",
  "email",
  "link",
  "status",
  "person",
  "tags",
])

/** Whether the search reads a column: text and the labels of options. */
export function isSearchable(type: string) {
  return SEARCHABLE.has(type)
}

/** The label-aware text the search matches a cell against. */
export function getSearchText(
  value: unknown,
  options?: readonly Option<string>[]
) {
  return toLabels(value, options)
}

/**
 * The text a search matches a cell against, lowercased, or "" for a blank
 * cell. Worth keeping per row: a search over 10,000 rows asks for it on
 * every keystroke.
 */
export function toSearchText(
  value: unknown,
  options?: readonly Option<string>[]
) {
  if (isBlank(value)) return ""
  return toLabels(value, options).toLowerCase()
}

export type DataTableRowQuery = {
  sorting?: readonly { id: string; desc: boolean }[]
  filters?: readonly { id: string; value: unknown }[]
  search?: string
}

/**
 * The table's sorting, filters and search applied to plain rows, so a
 * server, a worker or a test answers a query exactly as the table would.
 */
export function queryRows<TRow>(
  rows: readonly TRow[],
  { sorting = [], filters = [], search = "" }: DataTableRowQuery,
  columns: Readonly<Record<string, ColumnDescription>>,
  read: (row: TRow, columnId: string) => unknown,
  now: number = Date.now()
): TRow[] {
  const searched = Object.entries(columns).filter(([, column]) =>
    isSearchable(column.type)
  )
  const result = rows.filter((row) => {
    for (const filter of filters) {
      const column = columns[filter.id]
      if (!column) continue
      const kind = getFilterKind(column.type)
      if (!matchesFilter(kind, read(row, filter.id), filter.value, now)) {
        return false
      }
    }
    if (search.trim() === "") return true
    return searched.some(([id, column]) =>
      matchesSearch(getSearchText(read(row, id), column.options), search)
    )
  })
  const sorts = sorting.filter((sort) => columns[sort.id])
  if (sorts.length === 0) return result
  return result.sort((a, b) => {
    for (const sort of sorts) {
      const order = compareCellValues(
        read(a, sort.id),
        read(b, sort.id),
        columns[sort.id]
      )
      if (order !== 0) return sort.desc ? -order : order
    }
    return 0
  })
}

/**
 * Every calculation each column's footer offers, over the rows a query
 * matched: what a server sends as a page's `aggregates`, so the footer
 * covers every match and not just the rows loaded so far.
 */
export function summarizeRows<TRow>(
  rows: readonly TRow[],
  columns: Readonly<Record<string, ColumnDescription>>,
  read: (row: TRow, columnId: string) => unknown
): Record<string, Partial<Record<DataTableAggregate, number | null>>> {
  return Object.fromEntries(
    Object.entries(columns).map(([id, column]) => {
      const values = rows.map((row) => read(row, id))
      return [
        id,
        Object.fromEntries(
          getAggregateOptions(column.type).map((aggregate) => [
            aggregate,
            getAggregateValue(aggregate, values, column.type),
          ])
        ),
      ]
    })
  )
}

// MARK: Windows

/**
 * Rows a loader returned a window at a time, laid out by position: the
 * table's rows in order, the row at a position (or nothing, for a window
 * not loaded yet) and each row's position.
 */
export function indexWindows<T>(
  windows: ReadonlyMap<number, readonly T[]>,
  size: number
) {
  const rows: T[] = []
  const positions: number[] = []
  const starts = new Map<number, { start: number; length: number }>()
  for (const [window, items] of [...windows].sort(([a], [b]) => a - b)) {
    starts.set(window, { start: rows.length, length: items.length })
    for (let index = 0; index < items.length; index++) {
      positions.push(window * size + index)
      rows.push(items[index])
    }
  }
  return {
    rows,
    rowIndexAt(position: number) {
      const window = Math.floor(position / size)
      const loaded = starts.get(window)
      const offset = position - window * size
      return loaded && offset < loaded.length
        ? loaded.start + offset
        : undefined
    },
    positionOf(rowIndex: number) {
      return positions[rowIndex] ?? rowIndex
    },
  }
}

/** The windows a range of positions needs that aren't loaded, out or failed. */
export function getWindowsToLoad({
  start,
  end,
  size,
  total,
  loaded,
  pending,
  failed,
}: {
  start: number
  end: number
  size: number
  total: number
  loaded: ReadonlySet<number>
  pending: ReadonlySet<number>
  failed: ReadonlySet<number>
}) {
  if (total <= 0) return []
  const first = Math.floor(Math.max(0, start) / size)
  const last = Math.floor(Math.min(end, total - 1) / size)
  const windows: number[] = []
  for (let window = first; window <= last; window++) {
    if (!loaded.has(window) && !pending.has(window) && !failed.has(window)) {
      windows.push(window)
    }
  }
  return windows
}

/** Requests out for windows the scroll has left, a window either side kept. */
export function getWindowsToCancel(
  pending: Iterable<number>,
  first: number,
  last: number
) {
  return [...pending].filter(
    (window) => window < first - 1 || window > last + 1
  )
}
