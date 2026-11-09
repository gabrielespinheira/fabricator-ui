// Time Input's rules as pure functions: reading typed text as a time of day,
// writing it back in 12- or 24-hour form, the range check and the list of
// times to pick from, and the wheel's columns. Values are "HH:mm", or
// "HH:mm:ss" with seconds, what a time field submits. No React and no DOM, so
// the website and React Native share it.

type HourCycle = 12 | 24

type TimeRange = {
  minTime?: string
  maxTime?: string
}

type TimeParts = {
  hours: number
  minutes: number
  seconds: number
}

type Meridiem = "AM" | "PM"

type TimeCommit = {
  value: string | undefined
  text: string
  isInvalid: boolean
}

const MINUTES_PER_DAY = 24 * 60
const LAST_MINUTE = MINUTES_PER_DAY - 1

const NAMED_TIMES: Record<string, string> = {
  noon: "12:00",
  midnight: "00:00",
}

// Hours, then optional minutes and seconds, then an optional a or p of a
// meridiem.
const TIME_PATTERN =
  /^(\d{1,2})(?:[:.h]?(\d{2}))?(?::(\d{2}))?\s*([ap])?\.?\s*(?:m\.?)?$/

const pad = (value: number) => String(value).padStart(2, "0")

/** A time's hours, minutes and seconds; seconds are 0 when it has none. */
function splitTime(time: string): TimeParts {
  const [hours = 0, minutes = 0, seconds = 0] = time.split(":").map(Number)
  return { hours, minutes, seconds }
}

/** The parts as "HH:mm", or "HH:mm:ss" with seconds. */
function joinTime(
  { hours, minutes, seconds }: TimeParts,
  { hasSeconds }: { hasSeconds: boolean }
) {
  const time = `${pad(hours)}:${pad(minutes)}`
  return hasSeconds ? `${time}:${pad(seconds)}` : time
}

function toSeconds(time: string) {
  const { hours, minutes, seconds } = splitTime(time)
  return hours * 3600 + minutes * 60 + seconds
}

function toMinutes(time: string) {
  const [hours = 0, minutes = 0] = time.split(":").map(Number)
  return hours * 60 + minutes
}

function fromMinutes(totalMinutes: number) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
}

/** The hour in 24-hour form, or undefined when it can't be one. */
function toDayHour(hours: number, meridiem: string | undefined) {
  if (!meridiem) return hours < 24 ? hours : undefined
  if (hours < 1 || hours > 12) return undefined
  const hourOfHalf = hours % 12
  return meridiem === "p" ? hourOfHalf + 12 : hourOfHalf
}

/**
 * Reads typed text as a time: 9, 9:30, 930, 21:30, 9pm, 9:30 p.m., noon or
 * midnight. Undefined when it isn't a real time of day.
 */
function parseTimeText(text: string) {
  const normalized = text.trim().toLowerCase().replace(/\s+/g, " ")
  if (!normalized) return undefined
  const named = NAMED_TIMES[normalized]
  if (named) return named

  // Three or four bare digits are hours and minutes run together: 930, 2130.
  const compact = /^\d{3,4}$/.test(normalized)
    ? `${normalized.slice(0, -2)}:${normalized.slice(-2)}`
    : normalized
  const match = TIME_PATTERN.exec(compact)
  if (!match) return undefined
  const [, hourText = "", minuteText = "0", secondText, meridiem] = match

  const hours = toDayHour(Number(hourText), meridiem)
  const minutes = Number(minuteText)
  const seconds = Number(secondText ?? 0)
  if (hours === undefined || minutes > 59 || seconds > 59) return undefined
  return joinTime(
    { hours, minutes, seconds },
    { hasSeconds: secondText !== undefined }
  )
}

/** The time as people read it: "9:30 PM" or "21:30". "" without one. */
function formatTimeValue(
  time: string | undefined,
  { hourCycle }: { hourCycle: HourCycle }
) {
  if (!time) return ""
  const { hours, minutes, seconds } = splitTime(time)
  const rest =
    time.split(":").length > 2
      ? `${pad(minutes)}:${pad(seconds)}`
      : pad(minutes)
  if (hourCycle === 24) return `${pad(hours)}:${rest}`
  const { hour, meridiem } = toHour12(hours)
  return `${hour}:${rest} ${meridiem}`
}

/** An hour of the day on a 12-hour clock: 0 is 12 AM, 13 is 1 PM. */
function toHour12(hours: number): { hour: number; meridiem: Meridiem } {
  return { hour: hours % 12 || 12, meridiem: hours < 12 ? "AM" : "PM" }
}

/** A 12-hour clock's hour back on the day: 12 AM is 0, 1 PM is 13. */
function fromHour12(hour: number, meridiem: Meridiem) {
  return (hour % 12) + (meridiem === "PM" ? 12 : 0)
}

/** The hour wheel: 1 to 12 on a 12-hour clock, 0 to 23 on a 24-hour one. */
function getHourValues(hourCycle: HourCycle) {
  return hourCycle === 12
    ? Array.from({ length: 12 }, (_, index) => index + 1)
    : Array.from({ length: 24 }, (_, index) => index)
}

/** The minute (or second) wheel: 0 to 59, every `step`. */
function getMinuteValues(step: number) {
  const safeStep = Math.max(1, Math.round(step))
  return Array.from(
    { length: Math.ceil(60 / safeStep) },
    (_, index) => index * safeStep
  )
}

/**
 * The time moved inside the range when a wheel leaves it: before the start
 * becomes the start, after the end the end. Keeps the time's own form.
 */
function clampTime(time: string, { minTime, maxTime }: TimeRange) {
  const hasSeconds = time.split(":").length > 2
  const bound = (limit: string) => joinTime(splitTime(limit), { hasSeconds })
  if (minTime && toSeconds(time) < toSeconds(minTime)) return bound(minTime)
  if (maxTime && toSeconds(time) > toSeconds(maxTime)) return bound(maxTime)
  return time
}

/** Whether the time falls within the range, both ends included. */
function isTimeInRange(time: string, { minTime, maxTime }: TimeRange) {
  const minutes = toMinutes(time)
  if (minTime && minutes < toMinutes(minTime)) return false
  if (maxTime && minutes > toMinutes(maxTime)) return false
  return true
}

/**
 * The times to pick from: every `step` minutes from the range's start. After
 * a start (an end time's list), from one step after it, and the day's last
 * minute when no step fits.
 */
function getTimeOptions({
  step,
  minTime,
  maxTime,
  after,
}: TimeRange & { step: number; after?: string }) {
  const end = maxTime ? toMinutes(maxTime) : LAST_MINUTE
  const start =
    after === undefined
      ? minTime
        ? toMinutes(minTime)
        : 0
      : Math.max(toMinutes(after) + step, minTime ? toMinutes(minTime) : 0)
  const options: string[] = []
  for (let minutes = start; minutes <= end; minutes += step) {
    options.push(fromMinutes(minutes))
  }
  if (after !== undefined && options.length === 0 && toMinutes(after) < end) {
    options.push(fromMinutes(end))
  }
  return options
}

/** The time some minutes later, no later than the day's last minute. */
function addMinutesToTime(time: string, minutes: number) {
  return fromMinutes(Math.min(toMinutes(time) + minutes, LAST_MINUTE))
}

/** Minutes from the start to the end, or undefined unless the end is later. */
function getTimeDuration(start: string, end: string) {
  const minutes = toMinutes(end) - toMinutes(start)
  return minutes > 0 ? minutes : undefined
}

/** A duration as a list shows it beside an end time: 15min, 1h, 1h 45min. */
function formatTimeDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest}min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}min`
}

/**
 * Where the end goes when the start moves: as far after it as before, so the
 * duration holds, and no later than the day's last minute. Without an end,
 * one step after the start.
 */
function shiftEndTime(
  previousStart: string,
  previousEnd: string | undefined,
  nextStart: string,
  step = 15
) {
  const duration = previousEnd
    ? (getTimeDuration(previousStart, previousEnd) ?? step)
    : step
  return addMinutesToTime(nextStart, duration)
}

/**
 * What the field holds once the text is committed (blur or Enter). A time is
 * rewritten in the display format. Text that isn't a time stays as typed and a
 * time outside the range is rewritten; both leave no value and mark the field
 * invalid.
 */
function commitTimeText(
  text: string,
  options: TimeRange & { hourCycle: HourCycle }
): TimeCommit {
  if (!text.trim()) return { value: undefined, text: "", isInvalid: false }
  const time = parseTimeText(text)
  if (!time) return { value: undefined, text, isInvalid: true }
  const formatted = formatTimeValue(time, options)
  if (!isTimeInRange(time, options)) {
    return { value: undefined, text: formatted, isInvalid: true }
  }
  return { value: time, text: formatted, isInvalid: false }
}

/** The clock a locale writes times in: 12 (9:30 PM) or 24 (21:30). */
function getLocaleHourCycle(locale?: string): HourCycle {
  const { hourCycle } = new Intl.DateTimeFormat(locale, {
    hour: "numeric",
  }).resolvedOptions()
  return hourCycle === "h11" || hourCycle === "h12" ? 12 : 24
}

/**
 * The longest time the list shows, as text: a field at least this wide never
 * crops a time, whichever is picked.
 */
function getWidestTimeText(options: string[], hourCycle: HourCycle) {
  return options
    .map((time) => formatTimeValue(time, { hourCycle }))
    .reduce((widest, text) => (text.length > widest.length ? text : widest), "")
}

/** A date's clock time as HH:mm, or HH:mm:ss with seconds. */
function getTimeOfDay(
  date: Date,
  { hasSeconds = false }: { hasSeconds?: boolean } = {}
) {
  return joinTime(
    {
      hours: date.getHours(),
      minutes: date.getMinutes(),
      seconds: date.getSeconds(),
    },
    { hasSeconds }
  )
}

/** The option a list should show first: the value, or the nearest after it. */
function getNearestTimeOption(options: string[], time: string | undefined) {
  if (!time) return undefined
  const minutes = toMinutes(time)
  return (
    options.find((option) => toMinutes(option) >= minutes) ?? options.at(-1)
  )
}

export {
  addMinutesToTime,
  clampTime,
  fromHour12,
  getHourValues,
  getMinuteValues,
  joinTime,
  splitTime,
  toHour12,
  commitTimeText,
  formatTimeDuration,
  formatTimeValue,
  getTimeDuration,
  getLocaleHourCycle,
  getNearestTimeOption,
  getTimeOfDay,
  getTimeOptions,
  getWidestTimeText,
  isTimeInRange,
  parseTimeText,
  shiftEndTime,
  type HourCycle,
  type Meridiem,
  type TimeParts,
  type TimeCommit,
  type TimeRange,
}
