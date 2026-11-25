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

export type MailAccountId = "work" | "personal"

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
  /** A company without a logo here: it goes by its whole name. */
  isCompany?: boolean
}

export type MailAttachment = { name: string; size: string }

export type MailMessage = {
  id: string
  fromId: string
  toIds: string[]
  ccIds?: string[]
  sentAt: number
  /** Text with light Markdown; a blank line starts a new paragraph. */
  body: string
  attachments?: MailAttachment[]
}

export type MailThread = {
  id: string
  /** The account it arrived in. */
  account: MailAccountId
  subject: string
  box: MailBox
  isUnread: boolean
  isStarred: boolean
  labels: MailLabelId[]
  /** Out of the inbox until then. */
  snoozedUntil?: number
  messages: MailMessage[]
}

/** A new message while it is being written. */
export type MailDraft = {
  toIds: string[]
  subject: string
  body: string
  /** A forwarded message, as quoted lines; it goes out under the body. */
  quote?: string
  /** Files that come with it, such as the forwarded message's. */
  attachments?: MailAttachment[]
}

export type MailReplyMode = "reply" | "replyAll"

/** A reply while it is being written, kept per thread. */
export type MailReplyDraft = {
  body: string
  mode: MailReplyMode
  files: readonly File[]
}

export type MailState = {
  threads: MailThread[]
  openId: string | null
  selectedIds: string[]
  /** Unsent replies by thread id. */
  replyDrafts: Record<string, MailReplyDraft>
}

export type MailAction =
  | { type: "open"; id: string }
  | { type: "close" }
  | { type: "toggleSelected"; id: string }
  | { type: "selectAll"; ids: string[] }
  | { type: "clearSelection" }
  | { type: "move"; ids: string[]; box: MailBox; visibleIds: string[] }
  | { type: "snooze"; ids: string[]; until: number; visibleIds: string[] }
  | { type: "setUnread"; ids: string[]; isUnread: boolean }
  | { type: "star"; id: string; isStarred: boolean }
  /** null discards the draft. */
  | { type: "draftReply"; id: string; draft: MailReplyDraft | null }
  | { type: "reply"; id: string; message: MailMessage }
  /** Undo for a reply: the message comes out and its text goes back. */
  | {
      type: "unsendReply"
      id: string
      messageId: string
      draft: MailReplyDraft
    }
  /** A sent, saved or received thread; replaces an earlier one with its id. */
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
    keepId,
  }: {
    view: MailView
    filter: MailFilter
    query: string
    contacts: MailContact[]
    /** The open thread: reading it doesn't take it off an Unread list. */
    keepId?: string | null
  }
) {
  return threads
    .filter(
      (thread) =>
        isInView(thread, view) &&
        (thread.id === keepId || matchesFilter(thread, filter)) &&
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

export type MailThreadMove =
  | "archive"
  | "moveToInbox"
  | "delete"
  | "snooze"
  | "spam"

const MOVES: Record<MailBox, MailThreadMove[]> = {
  inbox: ["archive", "delete", "snooze", "spam"],
  sent: ["archive", "delete", "snooze"],
  archive: ["moveToInbox", "delete", "snooze", "spam"],
  spam: ["moveToInbox", "delete"],
  trash: ["moveToInbox"],
  drafts: ["delete"],
}

/** Whether an action makes sense where the thread is. */
export function canApplyMailAction(thread: MailThread, move: MailThreadMove) {
  if (move === "moveToInbox" && thread.snoozedUntil !== undefined) return true
  return MOVES[thread.box].includes(move)
}

/** The snoozed thread that comes back first. */
export function findNextSnoozed(threads: MailThread[]) {
  return threads
    .filter((thread) => isInFolder(thread, "snoozed"))
    .toSorted((a, b) => (a.snoozedUntil ?? 0) - (b.snoozedUntil ?? 0))
    .at(0)
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

function omitDraft(drafts: Record<string, MailReplyDraft>, id: string) {
  return Object.fromEntries(
    Object.entries(drafts).filter(([threadId]) => threadId !== id)
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
    case "close":
      return { ...state, openId: null, selectedIds: [] }
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
        ...state,
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
        ...state,
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
    case "draftReply":
      return {
        ...state,
        replyDrafts: action.draft
          ? { ...state.replyDrafts, [action.id]: action.draft }
          : omitDraft(state.replyDrafts, action.id),
      }
    case "reply":
      return {
        ...state,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          messages: [...thread.messages, action.message],
        })),
        replyDrafts: omitDraft(state.replyDrafts, action.id),
      }
    case "unsendReply":
      return {
        ...state,
        threads: updateThreads(state.threads, [action.id], (thread) => ({
          ...thread,
          messages: thread.messages.filter(({ id }) => id !== action.messageId),
        })),
        replyDrafts: { ...state.replyDrafts, [action.id]: action.draft },
      }
    case "send":
      return {
        ...state,
        threads: [
          action.thread,
          ...state.threads.filter(({ id }) => id !== action.thread.id),
        ],
      }
    case "restore":
      return {
        ...state,
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
        openId: state.openId === action.id ? null : state.openId,
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

/** Where a thread is in the list: 3 of 17. */
export function getListPosition(ids: string[], id: string | null) {
  const index = id === null ? -1 : ids.indexOf(id)
  return index === -1 ? null : { place: index + 1, total: ids.length }
}

// MARK: Writing

/** Who a reply to `message` goes to. After your own, the same people again. */
export function getReplyRecipientIds(
  message: MailMessage,
  mode: MailReplyMode
) {
  const isMine = message.fromId === ME
  if (mode === "reply") return isMine ? message.toIds : [message.fromId]
  const everyone = [message.fromId, ...message.toIds, ...(message.ccIds ?? [])]
  return [...new Set(everyone)].filter((id) => id !== ME)
}

export type MailComposeErrors = { to?: string; body?: string }

export function getComposeErrors(
  draft: MailDraft,
  { fileCount }: { fileCount: number }
): MailComposeErrors {
  return {
    ...(draft.toIds.length === 0 && {
      to: "Add at least one person to send to.",
    }),
    ...(!draft.body.trim() &&
      !draft.quote &&
      fileCount === 0 && { body: "Write a message or attach a file." }),
  }
}

/** Whether closing it leaves something worth saving. */
export function hasDraftContent(
  draft: MailDraft,
  { fileCount }: { fileCount: number }
) {
  return (
    draft.toIds.length > 0 ||
    draft.subject.trim() !== "" ||
    draft.body.trim() !== "" ||
    fileCount > 0
  )
}

/** Whether a draft is still what it was when it was opened. */
export function isSameDraft(a: MailDraft, b: MailDraft) {
  return (
    a.subject === b.subject &&
    a.body === b.body &&
    a.toIds.length === b.toIds.length &&
    a.toIds.every((id, index) => id === b.toIds[index])
  )
}

/** What a draft says once sent: the text, then what it quotes. */
export function getDraftBody({ body, quote = "" }: MailDraft) {
  return [body.trim(), quote].filter(Boolean).join("\n\n")
}

/** The other way around, to keep writing a saved draft. */
export function splitDraftBody(text: string): { body: string; quote?: string } {
  const lines = text.trimEnd().split("\n")
  const start = lines.findLastIndex((line) => !line.startsWith(">")) + 1
  if (start === lines.length) return { body: text }
  return {
    body: lines.slice(0, start).join("\n").trimEnd(),
    quote: lines.slice(start).join("\n"),
  }
}

/** The latest message as quoted lines, under who wrote it and when. */
export function getForwardQuote(
  thread: MailThread,
  contacts: MailContact[],
  timeFormat: TimeFormat
) {
  const latest = thread.messages.at(-1)
  if (!latest) return ""
  const sender = findContact(contacts, latest.fromId)
  const lines = [
    "Forwarded message",
    `From: ${[sender?.name, sender?.email].filter(Boolean).join(", ")}`,
    `Date: ${formatMailDateTime(latest.sentAt, timeFormat)}`,
    `Subject: ${thread.subject}`,
    "",
    ...splitQuote(latest.body).text.split("\n"),
  ]
  return lines.map((line) => `> ${line}`.trimEnd()).join("\n")
}

// MARK: Text

/**
 * What a message says, apart from the earlier message it quotes at its end
 * ("On Monday, Ada wrote:" and the lines that start with ">").
 */
export function splitQuote(body: string): {
  text: string
  attribution?: string
  quote?: string
} {
  const lines = body.trimEnd().split("\n")
  const lastOwn = lines.findLastIndex((line) => !line.startsWith(">"))
  const quoted = lines.slice(lastOwn + 1)
  if (quoted.length === 0) return { text: body }

  const quote = quoted.map((line) => line.replace(/^> ?/, "")).join("\n")
  const attribution = lastOwn === -1 ? "" : lines[lastOwn]
  if (!attribution.endsWith(":")) {
    return {
      text: lines
        .slice(0, lastOwn + 1)
        .join("\n")
        .trimEnd(),
      quote,
    }
  }
  return {
    text: lines.slice(0, lastOwn).join("\n").trimEnd(),
    attribution,
    quote,
  }
}

const LIST_LINE = /^\s*(?:[-*+]|\d+[.)])\s/

/** Markdown joins single line breaks; mail keeps them. */
export function toMailMarkdown(text: string) {
  const lines = text.split("\n")
  const unquoted = lines.map((line) => line.replace(/^> ?/, ""))
  const isProse = (line: string | undefined) =>
    line !== undefined && line.trim() !== "" && !LIST_LINE.test(line)
  return lines
    .map((line, index) =>
      isProse(unquoted[index]) &&
      isProse(unquoted[index + 1]) &&
      !line.endsWith("  ")
        ? `${line}  `
        : line
    )
    .join("\n")
}

/** A message as one line: no quote, no formatting marks. */
export function getMessageSnippet(message: MailMessage) {
  const { text, quote = "" } = splitQuote(message.body)
  return (text.trim() || quote)
    .replace(/^\s*(?:[-*+>]|\d+[.)]|#{1,6})\s+/gm, "")
    .replace(/(\*\*|__|~~|`)(.+?)\1/g, "$2")
    .replace(/(^|\s)[*_](\S(?:.*?\S)?)[*_](?=\s|[.,;:!?]|$)/gm, "$1$2")
    .replace(/\s+/g, " ")
    .trim()
}

/** The latest message as one line. */
export function getSnippet(thread: MailThread) {
  const latest = thread.messages.at(-1)
  return latest ? getMessageSnippet(latest) : ""
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

/** What a reply calls someone: a first name, or a company's whole name. */
export function getShortName(contact: MailContact | undefined) {
  if (!contact) return ""
  if (contact.brand || contact.isCompany) return contact.name
  return contact.name.split(" ")[0]
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
