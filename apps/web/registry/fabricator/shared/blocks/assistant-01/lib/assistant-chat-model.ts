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

export type AssistantToolCall = {
  id: string
  kind: "search" | "read" | "code"
  /** What the tool did, e.g. "Searched the web". */
  label: string
  /** What it is doing, shown shimmering while it runs. */
  runningLabel: string
  status: "running" | "done" | "error"
  /** A short result or the reason it failed: "6 results", "403". */
  detail?: string
  input?: AssistantCode
  output?: AssistantCode
  sources?: AssistantSource[]
}

export type AssistantPart =
  | { type: "text"; text: string }
  | { type: "tool"; tool: AssistantToolCall }

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
    }

export type AssistantReply = Extract<AssistantMessage, { role: "assistant" }>

export type AssistantAction =
  | {
      type: "send"
      userId: string
      assistantId: string
      text: string
      attachments: AssistantAttachment[]
    }
  | { type: "tool-start"; tool: AssistantToolCall }
  | {
      type: "tool-end"
      id: string
      status: "done" | "error"
      detail?: string
    }
  | { type: "text"; chunk: string }
  | { type: "finish" }
  | { type: "stop" }

function updateReply(
  messages: AssistantMessage[],
  update: (reply: AssistantReply) => AssistantReply
) {
  const last = messages.at(-1)
  if (last?.role !== "assistant") return messages
  return [...messages.slice(0, -1), update(last)]
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
  switch (action.type) {
    case "send":
      return [
        ...messages,
        {
          id: action.userId,
          role: "user",
          text: action.text,
          attachments: action.attachments,
        },
        {
          id: action.assistantId,
          role: "assistant",
          parts: [],
          status: "thinking",
        },
      ]
    case "tool-start":
      return updateReply(messages, (reply) => ({
        ...reply,
        status: "working",
        parts: [...reply.parts, { type: "tool", tool: action.tool }],
      }))
    case "tool-end":
      return updateReply(messages, (reply) => ({
        ...reply,
        parts: reply.parts.map((part) =>
          part.type === "tool" && part.tool.id === action.id
            ? {
                type: "tool",
                tool: {
                  ...part.tool,
                  status: action.status,
                  detail: action.detail ?? part.tool.detail,
                },
              }
            : part
        ),
      }))
    case "text":
      return updateReply(messages, (reply) => ({
        ...reply,
        status: "streaming",
        parts: appendText(reply.parts, action.chunk),
      }))
    case "finish":
      return updateReply(messages, (reply) => ({ ...reply, status: "done" }))
    case "stop":
      return updateReply(messages, (reply) => ({
        ...reply,
        status: "stopped",
        parts: reply.parts.map((part) =>
          part.type === "tool" && part.tool.status === "running"
            ? {
                type: "tool",
                tool: { ...part.tool, status: "error", detail: "Stopped" },
              }
            : part
        ),
      }))
  }
}

/** The Chat Input's `status` for the conversation's last reply. */
export function getChatInputStatus(messages: AssistantMessage[]) {
  const last = messages.at(-1)
  if (last?.role !== "assistant") return "ready"
  if (last.status === "thinking" || last.status === "working") {
    return "submitted"
  }
  if (last.status === "streaming") return "streaming"
  return "ready"
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

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Chats under Today, Yesterday, Previous 7 days and Older, newest first. */
export function groupChatsByRecency<T extends { updatedAt: string }>(
  chats: readonly T[],
  now: Date
) {
  const today = startOfDay(now).getTime()
  const sorted = [...chats].sort(
    (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
  )
  const daysAgo = (chat: T) =>
    Math.round((today - startOfDay(new Date(chat.updatedAt)).getTime()) / DAY)

  return RECENCY.map((group, index) => {
    const after = index === 0 ? -Infinity : RECENCY[index - 1].maxDays
    return {
      id: group.id,
      label: group.label,
      chats: sorted.filter((chat) => {
        const days = daysAgo(chat)
        return days > after && days <= group.maxDays
      }),
    }
  }).filter((group) => group.chats.length > 0)
}

/** "48 KB" for an attachment's size. */
export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatToolLine(tool: AssistantToolCall) {
  if (tool.status === "error") return `_${tool.label}: failed (${tool.detail})_`
  return tool.detail ? `_${tool.label}: ${tool.detail}_` : `_${tool.label}_`
}

/** The conversation as a Markdown document, for exporting. */
export function formatChatAsMarkdown(
  title: string,
  messages: AssistantMessage[]
) {
  const sections = [`# ${title}`]
  for (const message of messages) {
    if (message.role === "user") {
      sections.push("## You", message.text)
      if (message.attachments.length > 0) {
        sections.push(
          `Attached: ${message.attachments.map(({ name }) => name).join(", ")}`
        )
      }
      continue
    }
    sections.push("## Assistant")
    for (const part of message.parts) {
      sections.push(
        part.type === "tool" ? formatToolLine(part.tool) : part.text.trim()
      )
    }
  }
  return `${sections.join("\n\n")}\n`
}

/** "q3-revenue-analysis.md" for "Q3 revenue: analysis!". */
export function toMarkdownFileName(title: string) {
  const name = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return `${name || "chat"}.md`
}
