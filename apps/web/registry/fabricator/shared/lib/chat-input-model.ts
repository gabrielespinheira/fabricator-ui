// Chat Input's rules as pure functions: what a key does, what the send slot
// does, where attachments sit, mentions and the suggestion menu's trigger,
// the context meter's level, the voice level's envelope, and when the pill's
// field stacks above its controls. No React and no DOM, so the website and
// React Native share it.

/** The reply's progress, named as the AI SDK's `useChat` names it. */
type ChatInputStatus = "ready" | "submitted" | "streaming" | "error"

type ChatInputSubmitKey = "enter" | "mod-enter"

type ChatInputLayout = "default" | "large"

/** What the microphone is doing while voice chat is on. */
type ChatInputMicActivity =
  | "muted"
  | "listening"
  | "hearing"
  | "transcribing"
  | "speaking"

/** What the send slot does: its look and what a press does follow. */
type ChatInputSendAction =
  | "send"
  | "queue"
  | "idle"
  | "uploading"
  | "voice"
  | "stop"
  | "busy"

type ChatInputKey = {
  key: string
  shiftKey: boolean
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  /** An input method is composing text; its Enter picks a candidate. */
  isComposing: boolean
}

/**
 * What a key press in the field does. Enter sends (Shift+Enter adds a line)
 * unless `submitOn` is `mod-enter`, where Enter adds a line; Cmd or Ctrl+Enter
 * always sends. Escape stops a reply. ↑ in an empty field takes the last
 * queued message back to edit.
 */
function getChatInputKeyAction(
  event: ChatInputKey,
  {
    submitOn,
    isEmpty = false,
  }: { submitOn: ChatInputSubmitKey; isEmpty?: boolean }
): "submit" | "stop" | "recall" | "none" {
  if (event.isComposing) return "none"
  if (event.key === "Escape") return "stop"
  const hasModifier =
    event.shiftKey || event.altKey || event.metaKey || event.ctrlKey
  if (event.key === "ArrowUp")
    return isEmpty && !hasModifier ? "recall" : "none"
  if (event.key !== "Enter" || event.shiftKey || event.altKey) return "none"
  if (event.metaKey || event.ctrlKey) return "submit"
  return submitOn === "enter" ? "submit" : "none"
}

/** A reply is on its way. */
function isChatInputBusy(status: ChatInputStatus) {
  return status === "submitted" || status === "streaming"
}

/**
 * There is something to send and nothing in the way: text that isn't only
 * whitespace (or other content, such as attachments), no upload still
 * running, no reply on its way (unless messages queue behind it), and the
 * input enabled.
 */
function isChatInputReady({
  value,
  status,
  disabled = false,
  hasContent = false,
  queue = false,
  isUploading = false,
}: {
  value: string
  status: ChatInputStatus
  disabled?: boolean
  hasContent?: boolean
  queue?: boolean
  isUploading?: boolean
}) {
  if (disabled || isUploading) return false
  if (isChatInputBusy(status) && !queue) return false
  return hasContent || value.trim() !== ""
}

/**
 * The send slot. An empty input offers voice chat in send's place (and ends
 * it while it's on); a running reply turns it into stop while the input is
 * empty, and typed text queues behind it when queueing is on.
 */
function getChatInputSendAction({
  hasMessage,
  isUploading,
  isBusy,
  canStop,
  queue,
  hasVoice,
  isVoiceActive,
}: {
  hasMessage: boolean
  isUploading: boolean
  isBusy: boolean
  canStop: boolean
  queue: boolean
  hasVoice: boolean
  isVoiceActive: boolean
}): ChatInputSendAction {
  if (isUploading) return "uploading"
  if (hasVoice && !hasMessage && (isVoiceActive || !isBusy)) return "voice"
  if (isBusy) {
    if (hasMessage && queue) return "queue"
    return canStop ? "stop" : "busy"
  }
  return hasMessage ? "send" : "idle"
}

const SEND_LABELS: Record<ChatInputSendAction, string> = {
  send: "Send message",
  queue: "Queue message",
  idle: "Send message",
  uploading: "Attaching…",
  voice: "Start voice chat",
  stop: "Stop",
  busy: "Sending",
}

/** The send slot's name: what a press does, or ends voice chat while it's on. */
function getChatInputSendLabel(
  action: ChatInputSendAction,
  isVoiceActive = false
) {
  return action === "voice" && isVoiceActive
    ? "End voice chat"
    : SEND_LABELS[action]
}

/** The send slot draws the primary fill whenever a press does something. */
function isChatInputSendLit(action: ChatInputSendAction) {
  return action !== "idle" && action !== "uploading"
}

/** The send slot can't be pressed: nothing to send, an upload, or a reply it can't stop. */
function isChatInputSendDisabled(action: ChatInputSendAction) {
  return action === "idle" || action === "uploading" || action === "busy"
}

const MIC_LABELS: Record<ChatInputMicActivity, string> = {
  muted: "Unmute",
  listening: "Listening. Mute",
  hearing: "Hearing you. Mute",
  transcribing: "Transcribing…",
  speaking: "Stop speaking",
}

/** What a press on the microphone does, as its name. */
function getChatInputMicLabel(activity: ChatInputMicActivity) {
  return MIC_LABELS[activity]
}

/** The microphone hears or speaks: its icon follows the voice level. */
function isChatInputMicLive(activity: ChatInputMicActivity) {
  return (
    activity === "listening" ||
    activity === "hearing" ||
    activity === "speaking"
  )
}

/** The most images that ride beside send in the pill. */
const INLINE_ATTACHMENTS = 3

/**
 * Where attachments sit: across the large card; in the pill, beside send
 * while they are a few images and the draft is on one line, else across the
 * pill above it.
 */
function getChatInputAttachmentsLayout({
  layout,
  isStacked,
  items,
}: {
  layout: ChatInputLayout
  isStacked: boolean
  items: readonly { isImage: boolean }[]
}): "large" | "default" | "inline" {
  if (layout === "large") return "large"
  const isInline =
    !isStacked &&
    items.length <= INLINE_ATTACHMENTS &&
    items.every((item) => item.isImage)
  return isInline ? "inline" : "default"
}

/**
 * A file riding along with the next message. `File` is the website's file
 * and a picked asset on React Native, so the shape is shared and the file's
 * type is each platform's own.
 */
type ChatInputAttachedEntry<FileType = unknown> = {
  id: string
  /** The file's name, for the tile. */
  name: string
  /** A preview: an object URL or a file URI for an attached image, or a URL of your own. */
  src?: string
  /** The file, to send with the message. */
  file?: FileType
  /** True while its upload runs; send waits for it. */
  isUploading: boolean
}

type ChatInputAttachmentsAction<Entry> =
  | { type: "add"; entries: Entry[] }
  | { type: "land"; id: string }
  | { type: "remove"; id: string }
  | { type: "clear" }

/** The attachments' state changes, for `useChatInputAttachments`. */
function reduceChatInputAttachments<
  Entry extends { id: string; isUploading: boolean },
>(entries: Entry[], action: ChatInputAttachmentsAction<Entry>): Entry[] {
  switch (action.type) {
    case "add":
      return [...entries, ...action.entries]
    case "land":
      if (!entries.some((entry) => entry.id === action.id)) return entries
      return entries.map((entry) =>
        entry.id === action.id ? { ...entry, isUploading: false } : entry
      )
    case "remove":
      return entries.filter((entry) => entry.id !== action.id)
    case "clear":
      return []
  }
}

/** How full a model's context is: warning from 70%, destructive from 90%. */
function getChatInputContextLevel(fraction: number) {
  if (fraction < 0.7) return "calm"
  return fraction < 0.9 ? "high" : "full"
}

/** A token count in a few characters: 950, 84K, 1.3M. */
function formatTokenCount(count: number) {
  if (count < 1000) return String(count)
  if (count < 1_000_000) return `${Math.round(count / 1000)}K`
  const millions = Math.round(count / 100_000) / 10
  return `${millions}M`
}

type ChatInputMentionSegment = { text: string; sigil?: string }

function escapeForPattern(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")
}

/**
 * Splits a draft into plain text and mentions: a sigil (such as @ or /) at
 * the start or after whitespace, followed by a name. The segments join back
 * into the draft exactly, so an overlay drawn from them lines up with it.
 */
function splitChatInputMentions(
  text: string,
  sigils: readonly string[],
  isKnown: (mention: string) => boolean = () => true
): ChatInputMentionSegment[] {
  if (sigils.length === 0 || text === "") return [{ text }]
  const pattern = new RegExp(
    `(^|\\s)((?:${sigils.map(escapeForPattern).join("|")})[^\\s]+)`,
    "g"
  )
  const segments: ChatInputMentionSegment[] = []
  let cursor = 0
  for (const match of text.matchAll(pattern)) {
    const start = (match.index ?? 0) + (match[1]?.length ?? 0)
    const mention = match[2] ?? ""
    if (!isKnown(mention)) continue
    const sigil = sigils.find((candidate) => mention.startsWith(candidate))
    if (start > cursor) segments.push({ text: text.slice(cursor, start) })
    segments.push({ text: mention, sigil })
    cursor = start + mention.length
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) })
  return segments.length > 0 ? segments : [{ text }]
}

/** A sigil being typed at the caret, and the range a pick replaces. */
type ChatInputTrigger = {
  sigil: string
  /** What follows the sigil, up to the caret. */
  query: string
  start: number
  end: number
}

/**
 * The sigil (such as `/` or `@`) typed at the start or after a space or an
 * opening bracket, with the text from it to the caret and no space in
 * between: what a suggestion menu filters by. The one nearest the caret wins.
 */
function findChatInputTrigger(
  text: string,
  caret: number,
  sigils: readonly string[]
): ChatInputTrigger | null {
  const before = text.slice(0, caret)
  let found: ChatInputTrigger | null = null
  for (const sigil of sigils) {
    const match = before.match(
      new RegExp(`(?:^|[\\s(["'“‘])${escapeForPattern(sigil)}([^\\s]*)$`)
    )
    if (!match) continue
    const query = match[1] ?? ""
    const start = caret - query.length - sigil.length
    if (!found || start > found.start)
      found = { sigil, query, start, end: caret }
  }
  return found
}

/**
 * The draft after a pick: the typed token replaced by the pick and a space
 * (or removed, for an empty pick), and where the caret goes.
 */
function applyChatInputPick(
  text: string,
  trigger: ChatInputTrigger,
  replacement: string
) {
  const before = text.slice(0, trigger.start)
  const after = text.slice(trigger.end).replace(/^ /, "")
  if (!replacement) return { text: `${before}${after}`, caret: before.length }
  return {
    text: `${before}${replacement} ${after}`,
    caret: before.length + replacement.length + 1,
  }
}

/** Commands whose name holds the query: names starting with it first, each group in order. */
function filterChatInputCommands<Command extends { value: string }>(
  commands: readonly Command[],
  query: string
) {
  const needle = query.toLowerCase()
  if (!needle) return [...commands]
  const matches = commands.filter((command) =>
    command.value.toLowerCase().includes(needle)
  )
  return [
    ...matches.filter((command) =>
      command.value.toLowerCase().startsWith(needle)
    ),
    ...matches.filter(
      (command) => !command.value.toLowerCase().startsWith(needle)
    ),
  ]
}

/** How long something has run: 4s, 3m 04s, 1h 02m. */
function formatChatInputDuration(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000))
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60)
    return `${minutes}m ${String(seconds % 60).padStart(2, "0")}s`
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`
}

/** Room for the caret after the last character, so a draft that just fits doesn't wrap. */
const CARET_ROOM = 2

/**
 * Whether the pill's field stacks above its controls: once the draft wraps
 * beside them, and until it fits on one line there again. Measuring against
 * the room beside the controls, not the wider stacked field, keeps a draft
 * from flipping back and forth mid-sentence.
 */
function nextChatInputStacked({
  stacked,
  value,
  wraps,
  lineWidth,
  inlineWidth,
}: {
  stacked: boolean
  value: string
  /** The field beside the controls is taller than one line. */
  wraps: boolean
  /** The draft's width set on one line. */
  lineWidth: number
  /** The room for text beside the controls, read while the field was there. */
  inlineWidth: number
}) {
  if (!value) return false
  if (!stacked) return wraps
  return value.includes("\n") || lineWidth + CARET_ROOM > inlineWidth
}

// The input chain voice-glow applies to a microphone (its defaults), so the
// mic icon, which reads the same stream, moves with the glow.
const VOICE_GAIN = 3.1
const VOICE_GATE = 0.015
const VOICE_ATTACK_SECONDS = 0.325
const VOICE_RELEASE_SECONDS = 0.86

/** A voice level, 0 to 1, from a frame's RMS: silence under the noise gate, then the gain, capped at 1. */
function getChatInputVoiceLevel(rms: number) {
  if (rms < VOICE_GATE) return 0
  return Math.min(1, rms * VOICE_GAIN)
}

/** One step of the level's envelope: it rises on the attack and settles on the slower release. */
function smoothChatInputVoiceLevel(
  previous: number,
  target: number,
  seconds: number
) {
  const timeConstant =
    target > previous ? VOICE_ATTACK_SECONDS : VOICE_RELEASE_SECONDS
  return (
    previous + (target - previous) * (1 - Math.exp(-seconds / timeConstant))
  )
}

/** The glow's palette for the page it's on: the theme passed, else dark inside `.dark`. */
function getChatInputVoiceTheme({
  isDark,
  theme,
}: {
  isDark: boolean
  theme?: "dark" | "light"
}) {
  return theme ?? (isDark ? "dark" : "light")
}

/** How long each placeholder phrase stays. */
const PLACEHOLDER_MS = 4000

/** The fade out before the next phrase. */
const PLACEHOLDER_FADE_MS = 80

/** The option a key moves to in a set of options, wrapping around; null for any other key. */
function getChatInputOptionKeyIndex(key: string, index: number, count: number) {
  if (count === 0) return null
  if (key === "ArrowDown" || key === "ArrowRight") return (index + 1) % count
  if (key === "ArrowUp" || key === "ArrowLeft")
    return (index - 1 + count) % count
  if (key === "Home") return 0
  if (key === "End") return count - 1
  return null
}

export {
  applyChatInputPick,
  filterChatInputCommands,
  findChatInputTrigger,
  formatChatInputDuration,
  formatTokenCount,
  getChatInputAttachmentsLayout,
  getChatInputContextLevel,
  getChatInputKeyAction,
  getChatInputMicLabel,
  getChatInputOptionKeyIndex,
  getChatInputSendAction,
  getChatInputSendLabel,
  getChatInputVoiceLevel,
  getChatInputVoiceTheme,
  isChatInputBusy,
  isChatInputMicLive,
  isChatInputReady,
  isChatInputSendDisabled,
  isChatInputSendLit,
  nextChatInputStacked,
  PLACEHOLDER_FADE_MS,
  PLACEHOLDER_MS,
  reduceChatInputAttachments,
  smoothChatInputVoiceLevel,
  splitChatInputMentions,
  type ChatInputAttachedEntry,
  type ChatInputAttachmentsAction,
  type ChatInputKey,
  type ChatInputLayout,
  type ChatInputMentionSegment,
  type ChatInputMicActivity,
  type ChatInputSendAction,
  type ChatInputStatus,
  type ChatInputSubmitKey,
  type ChatInputTrigger,
}
