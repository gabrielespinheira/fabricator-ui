// The messenger's rules, free of React: conversations, what each row and
// header says, how a transcript groups into days and runs, and the state
// changes a person causes. Times are epoch milliseconds; labels take a locale
// and a time zone so the server and the browser print the same text.

/** The signed-in person's id in `senderId`. */
export const ME = "me"

/** Consecutive messages from one sender stay in one run within this gap. */
const RUN_GAP = 15 * 60_000

export type TimeFormat = { locale: string; timeZone: string }

export type Presence =
  | { kind: "online" }
  | { kind: "offline"; lastSeenAt: number }

export type Person = {
  id: string
  name: string
  avatar?: string
  presence: Presence
  phone?: string
  email?: string
}

export type MessageBody =
  | { kind: "text"; text: string }
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "file"; name: string; size: string }
  | { kind: "voice"; src: string; duration: number; peaks: number[] }

export type Reaction = { emoji: string; count: number; label: string }

export type ChatMessage = {
  id: string
  senderId: string
  sentAt: number
  body: MessageBody
  reactions?: Reaction[]
  /** When the other side read it; only for my messages. */
  readAt?: number
}

export type Conversation = {
  id: string
  kind: "direct" | "group"
  title: string
  avatar?: string
  /** Everyone in it but me. */
  memberIds: string[]
  messages: ChatMessage[]
  unreadCount: number
  isPinned: boolean
  isMuted: boolean
  /** I blocked them: nothing more arrives and the composer gives way. */
  isBlocked?: boolean
}

export type TranscriptRun = {
  id: string
  senderId: string
  isMine: boolean
  messages: ChatMessage[]
}

export type TranscriptDay = {
  key: string
  label: string
  runs: TranscriptRun[]
}

// MARK: Time

const DAY = 24 * 60 * 60_000

function getDayNumber(time: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(time)
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((entry) => entry.type === type)?.value)
  return Date.UTC(part("year"), part("month") - 1, part("day")) / DAY
}

function getDaysAgo(time: number, now: number, timeZone: string) {
  return getDayNumber(now, timeZone) - getDayNumber(time, timeZone)
}

// ICU prints a narrow no-break space before AM/PM in some runtimes and a plain
// space in others; one of them keeps server and browser text identical.
function format(
  time: number,
  { locale, timeZone }: TimeFormat,
  options: Intl.DateTimeFormatOptions
) {
  return new Intl.DateTimeFormat(locale, { timeZone, ...options })
    .format(time)
    .replace(/[  ]/g, " ")
}

function formatDate(time: number, now: number, timeFormat: TimeFormat) {
  const isThisYear =
    format(time, timeFormat, { year: "numeric" }) ===
    format(now, timeFormat, { year: "numeric" })
  return format(time, timeFormat, {
    month: "short",
    day: "numeric",
    ...(isThisYear ? {} : { year: "numeric" }),
  })
}

export function formatClock(time: number, timeFormat: TimeFormat) {
  return format(time, timeFormat, { hour: "numeric", minute: "2-digit" })
}

/** A conversation row's time: today's clock, then Yesterday, a weekday, a date. */
export function formatListTime(
  time: number,
  now: number,
  timeFormat: TimeFormat
) {
  const daysAgo = getDaysAgo(time, now, timeFormat.timeZone)
  if (daysAgo <= 0) return formatClock(time, timeFormat)
  if (daysAgo === 1) return "Yesterday"
  if (daysAgo < 7) return format(time, timeFormat, { weekday: "short" })
  return formatDate(time, now, timeFormat)
}

function formatDayLabel(time: number, now: number, timeFormat: TimeFormat) {
  const daysAgo = getDaysAgo(time, now, timeFormat.timeZone)
  if (daysAgo <= 0) return "Today"
  if (daysAgo === 1) return "Yesterday"
  if (daysAgo < 7) return format(time, timeFormat, { weekday: "long" })
  return formatDate(time, now, timeFormat)
}

export function formatPresence(
  presence: Presence,
  now: number,
  timeFormat: TimeFormat
) {
  if (presence.kind === "online") return "Online"
  const minutes = Math.max(1, Math.round((now - presence.lastSeenAt) / 60_000))
  const daysAgo = getDaysAgo(presence.lastSeenAt, now, timeFormat.timeZone)
  if (minutes < 60) return `Last seen ${minutes} min ago`
  if (daysAgo <= 0) return `Last seen ${Math.floor(minutes / 60)} h ago`
  if (daysAgo === 1) return "Last seen yesterday"
  return `Last seen ${formatDate(presence.lastSeenAt, now, timeFormat)}`
}

export function formatDuration(seconds: number) {
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** "PDF · 1.2 MB": the file's type from its extension, then its size. */
export function describeFile(name: string, size: string) {
  const extension = name.includes(".") ? name.split(".").at(-1) : undefined
  return `${extension ? extension.toUpperCase() : "File"} · ${size}`
}

// MARK: Transcript

export function groupTranscript(
  messages: ChatMessage[],
  { now, format: timeFormat }: { now: number; format: TimeFormat }
) {
  const days: TranscriptDay[] = []
  for (const message of messages) {
    const key = String(getDayNumber(message.sentAt, timeFormat.timeZone))
    let day = days.at(-1)
    if (day?.key !== key) {
      day = {
        key,
        label: formatDayLabel(message.sentAt, now, timeFormat),
        runs: [],
      }
      days.push(day)
    }
    const run = day.runs.at(-1)
    const previous = run?.messages.at(-1)
    if (
      run &&
      previous &&
      run.senderId === message.senderId &&
      message.sentAt - previous.sentAt <= RUN_GAP
    ) {
      run.messages.push(message)
    } else {
      day.runs.push({
        id: message.id,
        senderId: message.senderId,
        isMine: message.senderId === ME,
        messages: [message],
      })
    }
  }
  return days
}

/** "Read 9:42 AM" or "Delivered", under my latest message. */
export function getReadReceipt(
  messages: ChatMessage[],
  timeFormat: TimeFormat
) {
  const mine = messages.findLast((message) => message.senderId === ME)
  if (!mine) return undefined
  return {
    messageId: mine.id,
    label: mine.readAt
      ? `Read ${formatClock(mine.readAt, timeFormat)}`
      : "Delivered",
  }
}

// MARK: Conversations

function getFirstName(name: string) {
  return name.split(" ")[0]
}

function describeBody(body: MessageBody) {
  switch (body.kind) {
    case "text":
      return body.text
    case "image":
      return body.caption ? `Photo: ${body.caption}` : "Photo"
    case "file":
      return body.name
    case "voice":
      return `Voice message (${formatDuration(body.duration)})`
  }
}

export function getMessagePreview(
  message: ChatMessage,
  { isGroup, people }: { isGroup: boolean; people: Person[] }
) {
  const text = describeBody(message.body)
  if (message.senderId === ME) return `You: ${text}`
  if (!isGroup) return text
  const sender = people.find((person) => person.id === message.senderId)
  return `${getFirstName(sender?.name ?? "Someone")}: ${text}`
}

function getLastActivity(conversation: Conversation) {
  return conversation.messages.at(-1)?.sentAt ?? 0
}

export function sortConversations(conversations: Conversation[]) {
  return conversations.toSorted(
    (a, b) =>
      Number(b.isPinned) - Number(a.isPinned) ||
      getLastActivity(b) - getLastActivity(a)
  )
}

export function filterConversations(
  conversations: Conversation[],
  query: string,
  people: Person[]
) {
  const needle = query.trim().toLowerCase()
  if (!needle) return conversations
  return conversations.filter((conversation) => {
    const names = conversation.memberIds.map(
      (id) => people.find((person) => person.id === id)?.name ?? ""
    )
    const last = conversation.messages.at(-1)
    return [conversation.title, ...names, last ? describeBody(last.body) : ""]
      .join("\n")
      .toLowerCase()
      .includes(needle)
  })
}

/** The row an arrow key, Home or End moves to; it stops at the ends. */
export function getAdjacentId(
  ids: string[],
  currentId: string,
  move: "next" | "previous" | "first" | "last"
) {
  if (move === "first") return ids[0]
  if (move === "last") return ids.at(-1)
  const index = ids.indexOf(currentId)
  if (index === -1) return ids[0]
  const next = move === "next" ? index + 1 : index - 1
  return ids[Math.min(ids.length - 1, Math.max(0, next))]
}

// MARK: State

export type MessengerState = {
  conversations: Conversation[]
  openId: string
  /** Each conversation keeps its own unsent text. */
  drafts: Record<string, string>
  /** Who is typing in each conversation. */
  typing: Record<string, string | undefined>
}

export type MessengerAction =
  | { type: "open"; id: string }
  | { type: "draft"; id: string; text: string }
  | { type: "send"; id: string; message: ChatMessage }
  | { type: "typing"; id: string; personId: string | undefined }
  | { type: "receive"; id: string; message: ChatMessage }
  | { type: "read"; id: string; at: number }
  | { type: "mute"; id: string; isMuted: boolean }
  | { type: "block"; id: string; isBlocked: boolean }

function updateConversation(
  state: MessengerState,
  id: string,
  update: (conversation: Conversation) => Conversation
) {
  return state.conversations.map((conversation) =>
    conversation.id === id ? update(conversation) : conversation
  )
}

export function messengerReducer(
  state: MessengerState,
  action: MessengerAction
): MessengerState {
  switch (action.type) {
    case "open":
      return {
        ...state,
        openId: action.id,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          unreadCount: 0,
        })),
      }
    case "draft":
      return { ...state, drafts: { ...state.drafts, [action.id]: action.text } }
    case "send":
      return {
        ...state,
        drafts: { ...state.drafts, [action.id]: "" },
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, action.message],
        })),
      }
    case "typing":
      return {
        ...state,
        typing: { ...state.typing, [action.id]: action.personId },
      }
    case "receive":
      return {
        ...state,
        typing: { ...state.typing, [action.id]: undefined },
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, action.message],
          unreadCount:
            state.openId === action.id ? 0 : conversation.unreadCount + 1,
        })),
      }
    case "read":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: conversation.messages.map((message) =>
            message.senderId === ME && message.readAt === undefined
              ? { ...message, readAt: action.at }
              : message
          ),
        })),
      }
    case "mute":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          isMuted: action.isMuted,
        })),
      }
    case "block":
      return {
        ...state,
        typing: { ...state.typing, [action.id]: undefined },
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          isBlocked: action.isBlocked,
        })),
      }
  }
}
