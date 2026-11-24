import {
  toArtifactMarkdown,
  toFileSlug,
  type AssistantArtifact,
} from "@/registry/bases/__base__/blocks/assistant-01/lib/assistant-artifact-model"

// The assistant's conversation as plain data, and the rules that move it
// along: no React, no timers. The page feeds it actions as a reply runs.

export type AssistantSource = {
  title: string
  domain: string
  url: string
}

export type AssistantCode = {
  language: string
  code: string
}

/** One thing the assistant did to answer: a search, a file read, code it ran. */
export type AssistantStep = {
  id: string
  kind: "search" | "read" | "code"
  /** What the step did, e.g. "Searched the web". */
  label: string
  /** What it is doing, shown shimmering while it runs. */
  runningLabel: string
  /** Blocked steps wait for the person: a sign-in, a permission. */
  status: "running" | "done" | "blocked" | "stopped" | "error"
  /** A short result or the reason it ended: "6 results", "Needs a sign-in". */
  detail?: string
  seconds?: number
  input?: AssistantCode
  output?: AssistantCode
  sources?: AssistantSource[]
  /** The service a blocked step needs: "Gartner". */
  connection?: string
}

export type AssistantPart =
  | { type: "text"; text: string }
  | { type: "step"; step: AssistantStep }
  | { type: "artifact"; artifact: AssistantArtifact }

export type AssistantAttachment = {
  name: string
  size: string
}

export type AssistantReplyStatus =
  | "thinking"
  | "working"
  | "streaming"
  | "done"
  | "stopped"
  | "failed"

export type AssistantRating = "good" | "bad"

export type AssistantMessage =
  | {
      id: string
      role: "user"
      text: string
      attachments: AssistantAttachment[]
    }
  | {
      id: string
      role: "assistant"
      parts: AssistantPart[]
      status: AssistantReplyStatus
      rating?: AssistantRating
      /** Why a failed reply ended. */
      error?: string
    }

export type AssistantReply = Extract<AssistantMessage, { role: "assistant" }>
export type AssistantQuestion = Extract<AssistantMessage, { role: "user" }>

export type AssistantChat = {
  id: string
  title: string
  updatedAt: string
  isPinned: boolean
  messages: AssistantMessage[]
}

export type AssistantAction =
  | {
      type: "send"
      userId: string
      replyId: string
      text: string
      attachments: AssistantAttachment[]
    }
  | { type: "restart"; replyId: string }
  | { type: "step-start"; replyId: string; step: AssistantStep }
  | {
      type: "step-end"
      replyId: string
      stepId: string
      status: "done" | "blocked" | "error"
      detail?: string
      seconds?: number
    }
  | { type: "step-resume"; replyId: string; stepId: string }
  | { type: "text"; replyId: string; chunk: string }
  | { type: "artifact"; replyId: string; artifact: AssistantArtifact }
  | { type: "finish"; replyId: string }
  | { type: "stop"; replyId: string }
  | { type: "fail"; replyId: string; error: string }
  | { type: "rate"; replyId: string; rating: AssistantRating }

function updateReply(
  messages: AssistantMessage[],
  replyId: string,
  update: (reply: AssistantReply) => AssistantReply
) {
  return messages.map((message) =>
    message.role === "assistant" && message.id === replyId
      ? update(message)
      : message
  )
}

function updateSteps(
  parts: AssistantPart[],
  update: (step: AssistantStep) => AssistantStep
) {
  return parts.map(
    (part): AssistantPart =>
      part.type === "step" ? { type: "step", step: update(part.step) } : part
  )
}

function stopRunningSteps(parts: AssistantPart[]) {
  return updateSteps(parts, (step) =>
    step.status === "running" ? { ...step, status: "stopped" } : step
  )
}

function appendText(parts: AssistantPart[], chunk: string): AssistantPart[] {
  const last = parts.at(-1)
  if (last?.type === "text") {
    return [...parts.slice(0, -1), { type: "text", text: last.text + chunk }]
  }
  return [...parts, { type: "text", text: chunk }]
}

export function reduceAssistantMessages(
  messages: AssistantMessage[],
  action: AssistantAction
): AssistantMessage[] {
  if (action.type === "send") {
    return [
      ...messages,
      {
        id: action.userId,
        role: "user",
        text: action.text,
        attachments: action.attachments,
      },
      { id: action.replyId, role: "assistant", parts: [], status: "thinking" },
    ]
  }
  return updateReply(messages, action.replyId, (reply) =>
    reduceReply(reply, action)
  )
}

function reduceReply(
  reply: AssistantReply,
  action: Exclude<AssistantAction, { type: "send" }>
): AssistantReply {
  switch (action.type) {
    case "restart":
      return {
        id: reply.id,
        role: "assistant",
        parts: [],
        status: "thinking",
      }
    case "step-start":
      return {
        ...reply,
        status: "working",
        parts: [...reply.parts, { type: "step", step: action.step }],
      }
    case "step-end":
      return {
        ...reply,
        parts: updateSteps(reply.parts, (step) =>
          step.id === action.stepId
            ? {
                ...step,
                status: action.status,
                detail: action.detail ?? step.detail,
                seconds: action.seconds ?? step.seconds,
              }
            : step
        ),
      }
    case "step-resume":
      return {
        ...reply,
        status: "working",
        parts: updateSteps(reply.parts, (step) =>
          step.id === action.stepId ? { ...step, status: "running" } : step
        ),
      }
    case "text":
      return {
        ...reply,
        status: "streaming",
        parts: appendText(reply.parts, action.chunk),
      }
    case "artifact":
      return {
        ...reply,
        parts: [
          ...reply.parts,
          { type: "artifact", artifact: action.artifact },
        ],
      }
    case "finish":
      return { ...reply, status: "done" }
    case "stop":
      return {
        ...reply,
        status: "stopped",
        parts: stopRunningSteps(reply.parts),
      }
    case "fail":
      return {
        ...reply,
        status: "failed",
        error: action.error,
        parts: stopRunningSteps(reply.parts),
      }
    case "rate":
      return {
        ...reply,
        rating: reply.rating === action.rating ? undefined : action.rating,
      }
  }
}

export function isReplyRunning(reply: AssistantReply) {
  return (
    reply.status === "thinking" ||
    reply.status === "working" ||
    reply.status === "streaming"
  )
}

/** The Chat Input's `status`: what the reply that is running is doing. */
export function getChatInputStatus(messages: AssistantMessage[]) {
  const running = messages.find(
    (message) => message.role === "assistant" && isReplyRunning(message)
  )
  if (running?.role !== "assistant") return "ready"
  return running.status === "streaming" ? "streaming" : "submitted"
}

export type AssistantPartGroup =
  | {
      type: "steps"
      key: string
      /** Steps that ended or are running. */
      settled: AssistantStep[]
      /** Steps that wait for the person. */
      blocked: AssistantStep[]
      isRunning: boolean
    }
  | { type: "text"; key: string; text: string }
  | { type: "artifact"; key: string; artifact: AssistantArtifact }

/** A reply's parts as they are shown: consecutive steps become one group. */
export function groupReplyParts(parts: AssistantPart[]) {
  const groups: AssistantPartGroup[] = []
  parts.forEach((part, index) => {
    if (part.type === "text") {
      groups.push({ type: "text", key: `text-${index}`, text: part.text })
      return
    }
    if (part.type === "artifact") {
      groups.push({
        type: "artifact",
        key: part.artifact.id,
        artifact: part.artifact,
      })
      return
    }
    let group = groups.at(-1)
    if (group?.type !== "steps") {
      group = {
        type: "steps",
        key: part.step.id,
        settled: [],
        blocked: [],
        isRunning: false,
      }
      groups.push(group)
    }
    const steps = part.step.status === "blocked" ? group.blocked : group.settled
    steps.push(part.step)
    group.isRunning ||= part.step.status === "running"
  })
  return groups
}

/** "8s", "1m", "1m 12s". */
export function formatWorkDuration(seconds: number) {
  const total = Math.max(1, Math.round(seconds))
  const minutes = Math.floor(total / 60)
  const rest = total % 60
  if (minutes === 0) return `${rest}s`
  return rest === 0 ? `${minutes}m` : `${minutes}m ${rest}s`
}

/** "Worked for 8s, 2 steps" for a group of steps that ended. */
export function getStepsSummary(steps: AssistantStep[]) {
  const seconds = steps.reduce((sum, step) => sum + (step.seconds ?? 0), 0)
  const count = `${steps.length} ${steps.length === 1 ? "step" : "steps"}`
  return seconds > 0
    ? `Worked for ${formatWorkDuration(seconds)}, ${count}`
    : count
}

/** The pages a reply used, each once. */
export function getReplySources(reply: AssistantReply) {
  const sources = new Map<string, AssistantSource>()
  for (const part of reply.parts) {
    if (part.type !== "step" || part.step.status !== "done") continue
    for (const source of part.step.sources ?? []) {
      if (!sources.has(source.url)) sources.set(source.url, source)
    }
  }
  return [...sources.values()]
}

/** What the assistant wrote, for copying. */
export function getReplyText(reply: AssistantReply) {
  return reply.parts
    .flatMap((part) => (part.type === "text" ? [part.text.trim()] : []))
    .join("\n\n")
}

/** The message a reply answers, to ask it again. */
export function getReplyQuestion(
  messages: AssistantMessage[],
  replyId: string
): AssistantQuestion | null {
  const index = messages.findIndex((message) => message.id === replyId)
  const question = messages
    .slice(0, Math.max(0, index))
    .findLast((message) => message.role === "user")
  return question?.role === "user" ? question : null
}

export function getChatArtifacts(messages: AssistantMessage[]) {
  return messages.flatMap((message) =>
    message.role === "assistant"
      ? message.parts.flatMap((part) =>
          part.type === "artifact" ? [part.artifact] : []
        )
      : []
  )
}

/** A reply cut into words, each with the spacing after it, to stream. */
export function splitIntoChunks(text: string) {
  return text.match(/^\s+|\S+\s*/g) ?? []
}

const TITLE_LENGTH = 40

/** A new chat's name, from the first thing the person asked. */
export function getChatTitle(text: string) {
  const sentence = text
    .trim()
    .split(/[.?!\n]/)[0]
    .replace(/\s+/g, " ")
    .trim()
  if (!sentence) return "New chat"
  if (sentence.length <= TITLE_LENGTH) return sentence

  const words: string[] = []
  for (const word of sentence.split(" ")) {
    if ([...words, word].join(" ").length > TITLE_LENGTH) break
    words.push(word)
  }
  return `${words.join(" ")}…`
}

const DAY = 24 * 60 * 60 * 1000

const RECENCY = [
  { id: "today", label: "Today", maxDays: 0 },
  { id: "yesterday", label: "Yesterday", maxDays: 1 },
  { id: "week", label: "Previous 7 days", maxDays: 7 },
  { id: "older", label: "Older", maxDays: Infinity },
] as const

function getDay(date: Date) {
  return Math.floor(date.getTime() / DAY)
}

function sortByRecency<T extends { updatedAt: string }>(chats: readonly T[]) {
  return chats.toSorted(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  )
}

/**
 * Chats under Pinned, Today, Yesterday, Previous 7 days and Older, newest
 * first. Days are UTC days, so the server and the browser agree.
 */
export function groupAssistantChats<
  T extends { updatedAt: string; isPinned: boolean },
>(chats: readonly T[], now: Date) {
  const sorted = sortByRecency(chats)
  const recent = sorted.filter((chat) => !chat.isPinned)
  const today = getDay(now)
  const daysAgo = (chat: T) => today - getDay(new Date(chat.updatedAt))

  return [
    {
      id: "pinned",
      label: "Pinned",
      chats: sorted.filter((chat) => chat.isPinned),
    },
    ...RECENCY.map((group, index) => {
      const after = RECENCY[index - 1]?.maxDays ?? -Infinity
      return {
        id: group.id,
        label: group.label,
        chats: recent.filter((chat) => {
          const days = daysAgo(chat)
          return days > after && days <= group.maxDays
        }),
      }
    }),
  ].filter((group) => group.chats.length > 0)
}

function normalizeSearch(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
}

function getMessageText(message: AssistantMessage) {
  return message.role === "user" ? message.text : getReplyText(message)
}

/** The line a search found, without its Markdown. */
function getSnippet(chat: AssistantChat, word: string) {
  for (const message of chat.messages) {
    const line = getMessageText(message)
      .split("\n")
      .find((entry) => normalizeSearch(entry).includes(word))
    if (line) return line.replace(/[*#`|]|^[-\d]+[.\s]+/g, "").trim()
  }
  return null
}

/**
 * Chats that hold every word typed, in the title or the conversation. Titles
 * come first; a match inside a chat brings the line it was found in.
 */
export function searchAssistantChats(
  chats: readonly AssistantChat[],
  query: string
) {
  const sorted = sortByRecency(chats)
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean)
  const [firstWord] = words
  if (!firstWord) return sorted.map((chat) => ({ chat, snippet: null }))

  const inTitle: { chat: AssistantChat; snippet: string | null }[] = []
  const inMessages: { chat: AssistantChat; snippet: string | null }[] = []
  for (const chat of sorted) {
    const title = normalizeSearch(chat.title)
    if (words.every((word) => title.includes(word))) {
      inTitle.push({ chat, snippet: null })
      continue
    }
    const text = normalizeSearch(
      [chat.title, ...chat.messages.map(getMessageText)].join("\n")
    )
    if (!words.every((word) => text.includes(word))) continue
    const bodyWord = words.find((word) => !title.includes(word)) ?? firstWord
    inMessages.push({ chat, snippet: getSnippet(chat, bodyWord) })
  }
  return [...inTitle, ...inMessages]
}

/** "48 KB" for an attachment's size. */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatStepLine(step: AssistantStep) {
  const detail = step.status === "stopped" ? "stopped" : step.detail
  return detail ? `_${step.label}: ${detail}_` : `_${step.label}_`
}

function formatPart(part: AssistantPart) {
  if (part.type === "step") return formatStepLine(part.step)
  if (part.type === "artifact") return toArtifactMarkdown(part.artifact)
  return part.text.trim()
}

/** The conversation as a Markdown document, for exporting. */
export function formatChatAsMarkdown(
  title: string,
  messages: AssistantMessage[]
) {
  const sections = [`# ${title}`]
  for (const message of messages) {
    if (message.role === "assistant") {
      sections.push("## Assistant", ...message.parts.map(formatPart))
      continue
    }
    sections.push("## You", message.text)
    if (message.attachments.length > 0) {
      sections.push(
        `Attached: ${message.attachments.map(({ name }) => name).join(", ")}`
      )
    }
  }
  return `${sections.join("\n\n")}\n`
}

/** "q3-revenue-analysis.md" for "Q3 revenue: analysis!". */
export function toMarkdownFileName(title: string) {
  return `${toFileSlug(title) || "chat"}.md`
}
