// The mail block's rules: which threads a folder or label shows, what the
// counts are, and how selection and the actions change the mailbox. No React
// and no clock: callers pass "now" and a time format.

export const ME = "me"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export type TimeFormat = { locale: string; timeZone: string }

export type MailBox = "inbox" | "sent" | "drafts" | "archive" | "spam" | "trash"

export type MailFolder =
  | "inbox"
  | "starred"
  | "snoozed"
  | "sent"
  | "drafts"
  | "archive"
  | "spam"
  | "trash"

export type MailLabelId = "work" | "travel" | "receipts" | "personal"

export type MailView =
  | { kind: "folder"; folder: MailFolder }
  | { kind: "label"; label: MailLabelId }

export type MailFilter = "all" | "unread" | "starred"

export type MailContact = {
  id: string
  name: string
  email: string
  avatar?: string
  /** A company's logo, by name; see MailAvatar. */
  brand?: string
}

export type MailAttachment = { name: string; size: string }

export type MailMessage = {
  id: string
  fromId: string
  toIds: string[]
  ccIds?: string[]
  sentAt: number
  /** Plain text; a blank line starts a new paragraph. */
  body: string
  attachments?: MailAttachment[]
}

export type MailThread = {
  id: string
  subject: string
  box: MailBox
  isUnread: boolean
  isStarred: boolean
  labels: MailLabelId[]
  /** Out of the inbox until then. */
  snoozedUntil?: number
  messages: MailMessage[]
}

export type MailState = {
  threads: MailThread[]
  openId: string | null
  selectedIds: string[]
}

export type MailAction =
  | { type: "open"; id: string }
  | { type: "toggleSelected"; id: string }
  | { type: "selectAll"; ids: string[] }
  | { type: "clearSelection" }
  | { type: "move"; ids: string[]; box: MailBox; visibleIds: string[] }
  | { type: "snooze"; ids: string[]; until: number; visibleIds: string[] }
  | { type: "setUnread"; ids: string[]; isUnread: boolean }
  | { type: "star"; id: string; isStarred: boolean }
  | { type: "reply"; id: string; message: MailMessage }
  | { type: "send"; thread: MailThread }
  /** Undo: the changed threads as they were, and what was open. */
  | { type: "restore"; threads: MailThread[]; openId: string | null }
  /** Takes a thread out: Undo for a sent message, or a draft once sent. */
  | { type: "remove"; id: string }

// MARK: Folders and search

const OUT_OF_VIEW: MailBox[] = ["trash", "spam"]

function isInFolder(thread: MailThread, folder: MailFolder) {
  switch (folder) {
    case "inbox":
      return thread.box === "inbox" && thread.snoozedUntil === undefined
    case "starred":
      return thread.isStarred && !OUT_OF_VIEW.includes(thread.box)
    case "snoozed":
      return thread.box === "inbox" && thread.snoozedUntil !== undefined
    case "sent":
      return (
        thread.box !== "drafts" &&
        !OUT_OF_VIEW.includes(thread.box) &&
        thread.messages.some(({ fromId }) => fromId === ME)
      )
    default:
      return thread.box === folder
  }
}

function isInView(thread: MailThread, view: MailView) {
  return view.kind === "folder"
    ? isInFolder(thread, view.folder)
    : thread.labels.includes(view.label) && !OUT_OF_VIEW.includes(thread.box)
}

function matchesFilter(thread: MailThread, filter: MailFilter) {
  if (filter === "unread") return thread.isUnread
  if (filter === "starred") return thread.isStarred
  return true
}

function matchesQuery(
  thread: MailThread,
  query: string,
  contacts: MailContact[]
) {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  const people = new Set(
    thread.messages.flatMap(({ fromId, toIds }) => [fromId, ...toIds])
  )
  const text = [
    thread.subject,
    ...thread.messages.map(({ body }) => body.replace(/\s+/g, " ")),
    ...contacts
      .filter(({ id }) => people.has(id))
      .flatMap(({ name, email }) => [name, email]),
  ]
  return text.some((value) => value.toLowerCase().includes(needle))
}

export function getLatestAt(thread: MailThread) {
  return thread.messages.at(-1)?.sentAt ?? 0
}

/** The threads a view shows, newest first. */
export function getVisibleThreads(
  threads: MailThread[],
  {
    view,
    filter,
    query,
    contacts,
  }: {
    view: MailView
    filter: MailFilter
    query: string
    contacts: MailContact[]
  }
) {
  return threads
    .filter(
      (thread) =>
        isInView(thread, view) &&
        matchesFilter(thread, filter) &&
        matchesQuery(thread, query, contacts)
    )
    .toSorted((a, b) => getLatestAt(b) - getLatestAt(a))
}

/** Unread in the inbox and in spam, and every draft. */
export function getMailCounts(threads: MailThread[]) {
  const count = (test: (thread: MailThread) => boolean) =>
    threads.filter(test).length
  return {
    inbox: count((thread) => isInFolder(thread, "inbox") && thread.isUnread),
    drafts: count((thread) => thread.box === "drafts"),
    spam: count((thread) => thread.box === "spam" && thread.isUnread),
  }
}

// MARK: Actions

/** The thread to open once `ids` leave the list: the next, else the one before. */
function getNextOpenId(state: MailState, ids: string[], visibleIds: string[]) {
  if (state.openId === null || !ids.includes(state.openId)) return state.openId
  const index = visibleIds.indexOf(state.openId)
  const remaining = (id: string) => !ids.includes(id)
  return (
    visibleIds.slice(index + 1).find(remaining) ??
    visibleIds.slice(0, Math.max(index, 0)).findLast(remaining) ??
    null
  )
}

function updateThreads(
  threads: MailThread[],
  ids: string[],
  update: (thread: MailThread) => MailThread
) {
  return threads.map((thread) =>
    ids.includes(thread.id) ? update(thread) : thread
  )
}

export function mailReducer(state: MailState, action: MailAction): MailState {
  switch (action.type) {
    case "open":
      return {
        ...state,
        openId: action.id,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          isUnread: false,
        })),
      }
    case "toggleSelected":
      return {
        ...state,
        selectedIds: state.selectedIds.includes(action.id)
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      }
    case "selectAll":
      return { ...state, selectedIds: action.ids }
    case "clearSelection":
      return { ...state, selectedIds: [] }
    case "move":
      return {
        threads: updateThreads(state.threads, action.ids, (thread) => ({
          ...thread,
          box: action.box,
          snoozedUntil: undefined,
        })),
        openId: getNextOpenId(state, action.ids, action.visibleIds),
        selectedIds: [],
      }
    case "snooze":
      return {
        threads: updateThreads(state.threads, action.ids, (thread) => ({
          ...thread,
          box: "inbox",
          snoozedUntil: action.until,
        })),
        openId: getNextOpenId(state, action.ids, action.visibleIds),
        selectedIds: [],
      }
    case "setUnread":
      return {
        ...state,
        threads: updateThreads(state.threads, action.ids, (thread) => ({
          ...thread,
          isUnread: action.isUnread,
        })),
        selectedIds: [],
      }
    case "star":
      return {
        ...state,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          isStarred: action.isStarred,
        })),
      }
    case "reply":
      return {
        ...state,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          messages: [...thread.messages, action.message],
        })),
      }
    case "send":
      return { ...state, threads: [action.thread, ...state.threads] }
    case "restore":
      return {
        threads: state.threads.map(
          (thread) =>
            action.threads.find(({ id }) => id === thread.id) ?? thread
        ),
        openId: action.openId,
        selectedIds: [],
      }
    case "remove":
      return {
        ...state,
        threads: state.threads.filter(({ id }) => id !== action.id),
      }
  }
}

/** ↑ and ↓ through the list; the ends hold. With nothing open, the first. */
export function getAdjacentId(
  ids: string[],
  currentId: string | null,
  direction: "next" | "previous"
) {
  const index = currentId === null ? -1 : ids.indexOf(currentId)
  if (index === -1) return ids[0]
  const next = direction === "next" ? index + 1 : index - 1
  return ids[Math.min(Math.max(next, 0), ids.length - 1)]
}

// MARK: Text

/** The latest message as one line. */
export function getSnippet(thread: MailThread) {
  return (thread.messages.at(-1)?.body ?? "").replace(/\s+/g, " ").trim()
}

/** Who wrote, in the order they joined, with "me" for you. */
export function getParticipants(thread: MailThread, contacts: MailContact[]) {
  const senderIds = [...new Set(thread.messages.map(({ fromId }) => fromId))]
  const name = (id: string) =>
    id === ME
      ? "me"
      : (contacts.find((contact) => contact.id === id)?.name ?? "")
  const label =
    senderIds.length === 1
      ? name(senderIds[0])
      : senderIds
          .map((id) => (id === ME ? "me" : name(id).split(" ")[0]))
          .join(", ")
  return { label, count: thread.messages.length }
}

export function findContact(contacts: MailContact[], id: string) {
  return contacts.find((contact) => contact.id === id)
}

// MARK: Time

type ZonedParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  weekday: number
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function getZonedParts(time: number, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  }).formatToParts(time)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? ""
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
    weekday: WEEKDAYS.indexOf(value("weekday")),
  }
}

/** The instant a wall-clock time in a time zone happens. */
function getZonedTime(
  { year, month, day, hour, minute }: Omit<ZonedParts, "weekday">,
  timeZone: string
) {
  const guess = Date.UTC(year, month - 1, day, hour, minute)
  const shown = getZonedParts(guess, timeZone)
  const offset =
    Date.UTC(shown.year, shown.month - 1, shown.day, shown.hour, shown.minute) -
    guess
  return guess - offset
}

function getCalendarDaysAgo(time: number, now: number, timeZone: string) {
  const day = (parts: ZonedParts) =>
    Date.UTC(parts.year, parts.month - 1, parts.day)
  return Math.round(
    (day(getZonedParts(now, timeZone)) - day(getZonedParts(time, timeZone))) /
      DAY
  )
}

function format(
  time: number,
  { locale, timeZone }: TimeFormat,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options }).format(time)
}

function formatClock(time: number, timeFormat: TimeFormat) {
  return format(time, timeFormat, { hour: "numeric", minute: "2-digit" })
}

/** The list's time: the clock today, then the weekday, then the date. */
export function formatMailTime(
  time: number,
  now: number,
  timeFormat: TimeFormat
) {
  const daysAgo = getCalendarDaysAgo(time, now, timeFormat.timeZone)
  if (daysAgo <= 0) return formatClock(time, timeFormat)
  if (daysAgo === 1) return "Yesterday"
  if (daysAgo < 7) return format(time, timeFormat, { weekday: "short" })
  const isThisYear =
    getZonedParts(time, timeFormat.timeZone).year ===
    getZonedParts(now, timeFormat.timeZone).year
  return format(time, timeFormat, {
    month: "short",
    day: "numeric",
    year: isThisYear ? undefined : "numeric",
  })
}

/**
 * A message's full date, in its header. The date and the clock are formatted
 * apart: engines join them differently ("," or "at"), and the server's text
 * must match the browser's.
 */
export function formatMailDateTime(time: number, timeFormat: TimeFormat) {
  const date = format(time, timeFormat, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
  return `${date}, ${formatClock(time, timeFormat)}`
}

export type SnoozeOption = {
  id: "later" | "tomorrow" | "weekend" | "next-week"
  label: string
  detail: string
  until: number
}

/** When a snoozed thread comes back: today's evening, then mornings. */
export function getSnoozeOptions(
  now: number,
  timeFormat: TimeFormat
): SnoozeOption[] {
  const { timeZone } = timeFormat
  const today = getZonedParts(now, timeZone)
  const morning = (daysAhead: number) => {
    const date = new Date(
      Date.UTC(today.year, today.month - 1, today.day + daysAhead)
    )
    return getZonedTime(
      {
        year: date.getUTCFullYear(),
        month: date.getUTCMonth() + 1,
        day: date.getUTCDate(),
        hour: 8,
        minute: 0,
      },
      timeZone
    )
  }
  const daysUntil = (weekday: number) => ((weekday - today.weekday + 6) % 7) + 1
  const dayAndClock = (time: number) =>
    `${format(time, timeFormat, { weekday: "short" })}, ${formatClock(time, timeFormat)}`

  const options: SnoozeOption[] = []
  // Later today is at least an hour away.
  if (today.hour < 17) {
    const evening = getZonedTime({ ...today, hour: 18, minute: 0 }, timeZone)
    options.push({
      id: "later",
      label: "Later today",
      detail: formatClock(evening, timeFormat),
      until: evening,
    })
  }
  const tomorrow = morning(1)
  const weekend = morning(daysUntil(6))
  const nextWeek = morning(daysUntil(1))
  options.push(
    {
      id: "tomorrow",
      label: "Tomorrow",
      detail: dayAndClock(tomorrow),
      until: tomorrow,
    },
    {
      id: "weekend",
      label: "This weekend",
      detail: dayAndClock(weekend),
      until: weekend,
    },
    {
      id: "next-week",
      label: "Next week",
      detail: dayAndClock(nextWeek),
      until: nextWeek,
    }
  )
  return options
}

export function formatSnoozedUntil(
  until: number,
  now: number,
  timeFormat: TimeFormat
) {
  const daysAhead = -getCalendarDaysAgo(until, now, timeFormat.timeZone)
  const clock = formatClock(until, timeFormat)
  if (daysAhead <= 0) return `today, ${clock}`
  if (daysAhead === 1) return `tomorrow, ${clock}`
  return `${format(until, timeFormat, { weekday: "long" })}, ${clock}`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`
}
