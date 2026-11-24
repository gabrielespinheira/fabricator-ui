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
  role?: string
  /** For their local time. */
  timeZone?: string
  phone?: string
  email?: string
}

export type MessageBody =
  | { kind: "text"; text: string }
  | { kind: "image"; src: string; alt: string; caption?: string }
  | { kind: "file"; name: string; size: string }
  | { kind: "voice"; src: string; duration: number; peaks: number[] }

export type Reaction = { emoji: string; personIds: string[] }

export type ChatMessage = {
  id: string
  senderId: string
  sentAt: number
  body: MessageBody
  /** The message this one answers. */
  replyToId?: string
  reactions?: Reaction[]
  /** Where my message is on its way; a delivered one has none. */
  status?: "sending" | "failed"
  /** When the other side read my message. */
  readAt?: number
  /** Who read my message, in a group. */
  readBy?: string[]
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
  /** I marked it unread: it stays so until I open it again. */
  isMarkedUnread?: boolean
  isPinned: boolean
  isMuted: boolean
  /** When I started it, for a conversation nobody has written in yet. */
  startedAt?: number
  /** I blocked them: nothing more arrives and the composer gives way. */
  isBlocked?: boolean
}

export type TranscriptRun = {
  id: string
  senderId: string
  isMine: boolean
  /** The "New messages" marker goes above it. */
  isFirstUnread: boolean
  messages: ChatMessage[]
}

/** A message's place in its run, which decides the corners it joins. */
export type RunPosition = "only" | "first" | "middle" | "last"

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
  {
    now,
    format: timeFormat,
    unreadFromId,
  }: { now: number; format: TimeFormat; unreadFromId?: string }
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
    const isFirstUnread = message.id === unreadFromId
    if (
      run &&
      previous &&
      !isFirstUnread &&
      run.senderId === message.senderId &&
      // A failed message ends its run, so its Retry is right under it.
      previous.status !== "failed" &&
      message.status !== "failed" &&
      message.sentAt - previous.sentAt <= RUN_GAP
    ) {
      run.messages.push(message)
    } else {
      day.runs.push({
        id: message.id,
        senderId: message.senderId,
        isMine: message.senderId === ME,
        isFirstUnread,
        messages: [message],
      })
    }
  }
  return days
}

export function getRunPosition(index: number, count: number): RunPosition {
  if (count === 1) return "only"
  if (index === 0) return "first"
  return index === count - 1 ? "last" : "middle"
}

/** Where unread messages start, counting back over other people's. */
export function getFirstUnreadId(messages: ChatMessage[], unreadCount: number) {
  if (unreadCount <= 0) return undefined
  const theirs = messages.filter((message) => message.senderId !== ME)
  return theirs.slice(-unreadCount).at(0)?.id
}

function getReceiptLabel(
  message: ChatMessage,
  timeFormat: TimeFormat,
  people: Person[]
) {
  if (message.status === "sending") return "Sending"
  if (message.readAt) return `Read ${formatClock(message.readAt, timeFormat)}`
  const readBy = message.readBy ?? []
  if (readBy.length === 0) return "Delivered"
  if (readBy.length > 2) return `Read by ${readBy.length}`
  return `Read by ${joinFirstNames(readBy, people)}`
}

/** "Read 9:42 AM", "Delivered" or "Sending", under my latest message. */
export function getReadReceipt(
  messages: ChatMessage[],
  timeFormat: TimeFormat,
  people: Person[] = []
) {
  const mine = messages.findLast(
    (message) => message.senderId === ME && message.status !== "failed"
  )
  if (!mine) return undefined
  return {
    messageId: mine.id,
    label: getReceiptLabel(mine, timeFormat, people),
  }
}

/** What a conversation shared, newest first. */
export function getSharedMedia(messages: ChatMessage[]) {
  const newestFirst = messages.toReversed()
  return {
    photos: newestFirst.flatMap((message) =>
      message.body.kind === "image" ? [{ ...message, body: message.body }] : []
    ),
    files: newestFirst.flatMap((message) =>
      message.body.kind === "file" ? [{ ...message, body: message.body }] : []
    ),
  }
}

// MARK: Reactions and actions

/** The reactions one press away, and what a screen reader calls them. */
export const QUICK_REACTIONS = [
  { emoji: "👍", name: "Thumbs up" },
  { emoji: "❤️", name: "Heart" },
  { emoji: "😂", name: "Laughing" },
  { emoji: "😮", name: "Surprised" },
  { emoji: "👏", name: "Applause" },
  { emoji: "👀", name: "Eyes" },
]

export function toggleReaction(
  reactions: Reaction[] = [],
  emoji: string,
  personId: string
) {
  const current = reactions.find((reaction) => reaction.emoji === emoji)
  if (!current) return [...reactions, { emoji, personIds: [personId] }]
  const personIds = current.personIds.includes(personId)
    ? current.personIds.filter((id) => id !== personId)
    : [...current.personIds, personId]
  return reactions
    .map((reaction) => (reaction === current ? { emoji, personIds } : reaction))
    .filter((reaction) => reaction.personIds.length > 0)
}

/** "Heart from Maya and you". */
export function describeReaction(reaction: Reaction, people: Person[]) {
  const name =
    QUICK_REACTIONS.find(({ emoji }) => emoji === reaction.emoji)?.name ??
    reaction.emoji
  return `${name} from ${joinFirstNames(reaction.personIds, people)}`
}

export function canReact(message: ChatMessage) {
  return message.status === undefined
}

export type MessageActionId = "reply" | "copy" | "unread" | "retry" | "delete"

export function getMessageActions(message: ChatMessage): MessageActionId[] {
  const copy: MessageActionId[] = message.body.kind === "text" ? ["copy"] : []
  if (message.status === "sending") return copy
  if (message.status === "failed") return ["retry", ...copy, "delete"]
  return ["reply", ...copy, message.senderId === ME ? "delete" : "unread"]
}

// MARK: Conversations

function getFirstName(name: string) {
  return name.split(" ")[0]
}

function joinFirstNames(personIds: string[], people: Person[]) {
  const names = personIds.map((id) => {
    if (id === ME) return "you"
    const person = people.find((entry) => entry.id === id)
    return getFirstName(person?.name ?? "someone")
  })
  if (names.length < 2) return names.join("")
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
}

/** A message in one line, for a row's preview or a quote. */
export function describeBody(body: MessageBody) {
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
  return conversation.messages.at(-1)?.sentAt ?? conversation.startedAt ?? 0
}

/** The count a row shows: none for the conversation being read right now. */
export function getVisibleUnread(
  conversation: Conversation,
  readingId: string | null
) {
  const isRead = conversation.id === readingId && !conversation.isMarkedUnread
  return isRead ? 0 : conversation.unreadCount
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
  const isTitleMatch = ({ title }: Conversation) =>
    title.toLowerCase().includes(needle)
  const matches = conversations.filter((conversation) => {
    const names = conversation.memberIds.map(
      (id) => people.find((person) => person.id === id)?.name ?? ""
    )
    const last = conversation.messages.at(-1)
    return [conversation.title, ...names, last ? describeBody(last.body) : ""]
      .join("\n")
      .toLowerCase()
      .includes(needle)
  })
  return matches.toSorted(
    (a, b) => Number(isTitleMatch(b)) - Number(isTitleMatch(a))
  )
}

/** Who a new message can go to, by name or role. */
export function filterPeople(people: Person[], query: string) {
  const needle = query.trim().toLowerCase()
  return people.filter((person) =>
    `${person.name}\n${person.role ?? ""}`.toLowerCase().includes(needle)
  )
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
  /** The message each conversation's draft answers. */
  replyTo: Record<string, string | undefined>
  /** Where each conversation's "New messages" marker is. */
  unreadFrom: Record<string, string | undefined>
}

export type MessengerAction =
  | { type: "open"; id: string }
  | { type: "seen"; id: string }
  | { type: "start"; person: Person; at: number }
  | { type: "draft"; id: string; text: string }
  | { type: "reply"; id: string; messageId: string | undefined }
  | { type: "send"; id: string; message: ChatMessage }
  | { type: "deliver"; id: string; messageId: string }
  | { type: "fail"; id: string; messageId: string }
  | { type: "retry"; id: string; messageId: string; at: number }
  | { type: "delete"; id: string; messageId: string }
  | { type: "restore"; id: string; message: ChatMessage }
  | { type: "react"; id: string; messageId: string; emoji: string }
  | { type: "typing"; id: string; personId: string | undefined }
  | {
      type: "receive"
      id: string
      message: ChatMessage
      /** The conversation is open, but the phone is showing the list. */
      isAway?: boolean
    }
  | { type: "read"; id: string; at: number; personId?: string }
  | { type: "unread"; id: string; messageId: string }
  | { type: "mute"; id: string; isMuted: boolean }
  | { type: "pin"; id: string; isPinned: boolean }
  | { type: "block"; id: string; isBlocked: boolean }

/** The state a screen starts in, with the open conversation's marker set. */
export function createMessengerState(
  conversations: Conversation[],
  openId: string
): MessengerState {
  const open = conversations.find(({ id }) => id === openId)
  return {
    conversations,
    openId,
    drafts: {},
    typing: {},
    replyTo: {},
    unreadFrom: {
      [openId]: open && getFirstUnreadId(open.messages, open.unreadCount),
    },
  }
}

function updateConversation(
  state: MessengerState,
  id: string,
  update: (conversation: Conversation) => Conversation
) {
  return state.conversations.map((conversation) =>
    conversation.id === id ? update(conversation) : conversation
  )
}

function updateMessage(
  state: MessengerState,
  id: string,
  messageId: string,
  update: (message: ChatMessage) => ChatMessage
) {
  return updateConversation(state, id, (conversation) => ({
    ...conversation,
    messages: conversation.messages.map((message) =>
      message.id === messageId ? update(message) : message
    ),
  }))
}

function markRead(
  message: ChatMessage,
  kind: Conversation["kind"],
  { at, personId }: { at: number; personId?: string }
): ChatMessage {
  if (message.senderId !== ME || message.status === "failed") return message
  if (kind === "direct") return { ...message, readAt: message.readAt ?? at }
  const readBy = message.readBy ?? []
  if (!personId || readBy.includes(personId)) return message
  return { ...message, readBy: [...readBy, personId] }
}

function openConversation(state: MessengerState, id: string): MessengerState {
  const opened = state.conversations.find((entry) => entry.id === id)
  return {
    ...state,
    openId: id,
    unreadFrom: {
      ...state.unreadFrom,
      [id]: opened && getFirstUnreadId(opened.messages, opened.unreadCount),
    },
    conversations: updateConversation(state, id, (conversation) => ({
      ...conversation,
      unreadCount: 0,
      isMarkedUnread: false,
    })),
  }
}

export function messengerReducer(
  state: MessengerState,
  action: MessengerAction
): MessengerState {
  switch (action.type) {
    case "open":
      return openConversation(state, action.id)
    case "seen":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) =>
          conversation.isMarkedUnread
            ? conversation
            : { ...conversation, unreadCount: 0 }
        ),
      }
    case "start": {
      const { person, at } = action
      const existing = state.conversations.find(
        ({ kind, memberIds }) =>
          kind === "direct" && memberIds.includes(person.id)
      )
      if (existing) return openConversation(state, existing.id)
      const started: Conversation = {
        id: person.id,
        kind: "direct",
        title: person.name,
        memberIds: [person.id],
        messages: [],
        unreadCount: 0,
        isPinned: false,
        isMuted: false,
        startedAt: at,
      }
      return {
        ...state,
        openId: started.id,
        conversations: [...state.conversations, started],
      }
    }
    case "draft":
      return { ...state, drafts: { ...state.drafts, [action.id]: action.text } }
    case "reply":
      return {
        ...state,
        replyTo: { ...state.replyTo, [action.id]: action.messageId },
      }
    case "send": {
      const replyToId = state.replyTo[action.id]
      const message = replyToId
        ? { ...action.message, replyToId }
        : action.message
      return {
        ...state,
        drafts: { ...state.drafts, [action.id]: "" },
        replyTo: { ...state.replyTo, [action.id]: undefined },
        unreadFrom: { ...state.unreadFrom, [action.id]: undefined },
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, message],
        })),
      }
    }
    case "deliver":
      return {
        ...state,
        conversations: updateMessage(
          state,
          action.id,
          action.messageId,
          (message) => ({ ...message, status: undefined })
        ),
      }
    case "fail":
      return {
        ...state,
        conversations: updateMessage(
          state,
          action.id,
          action.messageId,
          (message) => ({ ...message, status: "failed" })
        ),
      }
    case "retry":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: [
            ...conversation.messages.filter(
              ({ id }) => id !== action.messageId
            ),
            ...conversation.messages
              .filter(({ id }) => id === action.messageId)
              .map(
                (message): ChatMessage => ({
                  ...message,
                  status: "sending",
                  sentAt: action.at,
                })
              ),
          ],
        })),
      }
    case "delete":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: conversation.messages.filter(
            ({ id }) => id !== action.messageId
          ),
        })),
      }
    case "restore":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, action.message].toSorted(
            (a, b) => a.sentAt - b.sentAt
          ),
        })),
      }
    case "react":
      return {
        ...state,
        conversations: updateMessage(
          state,
          action.id,
          action.messageId,
          (message) => ({
            ...message,
            reactions: toggleReaction(message.reactions, action.emoji, ME),
          })
        ),
      }
    case "typing":
      return {
        ...state,
        typing: { ...state.typing, [action.id]: action.personId },
      }
    case "receive": {
      const isBeingRead = state.openId === action.id && !action.isAway
      return {
        ...state,
        typing: { ...state.typing, [action.id]: undefined },
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: [...conversation.messages, action.message],
          unreadCount: isBeingRead ? 0 : conversation.unreadCount + 1,
        })),
      }
    }
    case "read":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          messages: conversation.messages.map((message) =>
            markRead(message, conversation.kind, action)
          ),
        })),
      }
    case "unread":
      return {
        ...state,
        unreadFrom: { ...state.unreadFrom, [action.id]: action.messageId },
        conversations: updateConversation(state, action.id, (conversation) => {
          const from = conversation.messages.findIndex(
            ({ id }) => id === action.messageId
          )
          return {
            ...conversation,
            isMarkedUnread: true,
            unreadCount: conversation.messages
              .slice(from)
              .filter(({ senderId }) => senderId !== ME).length,
          }
        }),
      }
    case "mute":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          isMuted: action.isMuted,
        })),
      }
    case "pin":
      return {
        ...state,
        conversations: updateConversation(state, action.id, (conversation) => ({
          ...conversation,
          isPinned: action.isPinned,
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
