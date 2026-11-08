"use client"

import * as React from "react"
import { cn } from "cn"
import { createPortal } from "react-dom"

import {
  buttonVariants,
  type Button,
} from "@/registry/bases/__base__/ui/button"
import { useDensity } from "@/registry/bases/__base__/ui/density"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The message box of a chat: a raised card whose field grows with the draft
// and whose height eases to what it holds, controls under the field (or beside
// it in the compact pill), and one send slot that offers voice chat while the
// draft is empty, sends once there is something to send, and stops a reply
// while one streams. Enter sends, Shift+Enter adds a line, Escape stops.

/** The reply's progress, named as the AI SDK's `useChat` names it. */
type ChatInputStatus = "ready" | "submitted" | "streaming" | "error"

type ChatInputSubmitKey = "enter" | "mod-enter"

type ChatInputLayout = "default" | "compact"

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

/** The most images that ride beside send in the compact pill. */
const INLINE_ATTACHMENTS = 3

/**
 * Where attachments sit: across the card in the default layout; in the
 * compact pill, beside send while they are a few images and the draft is on
 * one line, else across the card above it.
 */
function getChatInputAttachmentsLayout({
  layout,
  isStacked,
  items,
}: {
  layout: ChatInputLayout
  isStacked: boolean
  items: readonly { isImage: boolean }[]
}): "default" | "compact" | "inline" {
  if (layout === "default") return "default"
  const isInline =
    !isStacked &&
    items.length <= INLINE_ATTACHMENTS &&
    items.every((item) => item.isImage)
  return isInline ? "inline" : "compact"
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
      new RegExp(
        `(?:^|[\\s(["'\u201c\u2018])${escapeForPattern(sigil)}([^\\s]*)$`
      )
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
 * Whether the compact field stacks above its controls: once the draft wraps
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

let lineMeasurer: CanvasRenderingContext2D | null | undefined

/** How wide `text` sets on one line in the field's font. */
function measureLineWidth(field: HTMLElement, text: string) {
  lineMeasurer ??= document.createElement("canvas").getContext("2d")
  if (!lineMeasurer) return 0
  const style = getComputedStyle(field)
  // The computed `font` shorthand is empty when a longhand can't be written
  // in it (font-feature-settings, variations), so it's built from the parts.
  lineMeasurer.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
  lineMeasurer.letterSpacing = style.letterSpacing
  return lineMeasurer.measureText(text).width
}

/** The width a field's text can take: inside its padding and any scrollbar. */
function measureTextRoom(field: HTMLElement) {
  const style = getComputedStyle(field)
  return (
    field.clientWidth -
    Number.parseFloat(style.paddingLeft) -
    Number.parseFloat(style.paddingRight)
  )
}

/** The field's height with one line of text. */
function measureOneLineHeight(field: HTMLElement) {
  const style = getComputedStyle(field)
  const lineHeight =
    Number.parseFloat(style.lineHeight) ||
    Number.parseFloat(style.fontSize) * 1.5
  return (
    lineHeight +
    Number.parseFloat(style.paddingTop) +
    Number.parseFloat(style.paddingBottom)
  )
}

/** How long each placeholder phrase stays. */
const PLACEHOLDER_MS = 4000

/** The fade out before the next phrase. */
const PLACEHOLDER_FADE_MS = 80

/**
 * The empty field's hint: a list of phrases takes turns, each fading out
 * before the next comes in. One phrase, a draft, or a preference for reduced
 * motion holds it still.
 */
function useRotatingPlaceholder(phrases: readonly string[], isActive: boolean) {
  const [index, setIndex] = React.useState(0)
  const [isFading, setFading] = React.useState(false)
  const isTurning = isActive && phrases.length > 1

  React.useEffect(() => {
    if (!isTurning) return
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return
    let swap: ReturnType<typeof setTimeout> | undefined
    const turn = setInterval(() => {
      setFading(true)
      swap = setTimeout(() => {
        setIndex((current) => current + 1)
        setFading(false)
      }, PLACEHOLDER_FADE_MS)
    }, PLACEHOLDER_MS)
    return () => {
      clearInterval(turn)
      clearTimeout(swap)
      setFading(false)
    }
  }, [isTurning])

  return { text: phrases[index % phrases.length] ?? "", isFading }
}

/**
 * Writes the live voice level (0 to 1) to `--chat-input-voice-level` on an
 * element every frame, outside React, while `isLive`.
 */
function useVoiceLevelVariable(
  level: (() => number) | undefined,
  isLive: boolean
) {
  const ref = React.useRef<HTMLElement | null>(null)
  const levelRef = React.useRef(level)
  React.useEffect(() => {
    levelRef.current = level
  }, [level])
  React.useEffect(() => {
    const element = ref.current
    if (!isLive || !element) return
    let frame = requestAnimationFrame(function draw() {
      const value = Math.min(1, Math.max(0, levelRef.current?.() ?? 0))
      element.style.setProperty("--chat-input-voice-level", value.toFixed(3))
      frame = requestAnimationFrame(draw)
    })
    return () => {
      cancelAnimationFrame(frame)
      element.style.removeProperty("--chat-input-voice-level")
    }
  }, [isLive])
  return ref
}

function useControllable<T>(
  controlled: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultValue)
  const isControlled = controlled !== undefined
  const value = isControlled ? controlled : uncontrolled
  const setValue = React.useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next)
      onChange?.(next)
    },
    [isControlled, onChange]
  )
  return [value, setValue] as const
}

type ChatInputContextValue = {
  value: string
  setValue: (value: string) => void
  status: ChatInputStatus
  layout: ChatInputLayout
  submitOn: ChatInputSubmitKey
  disabled: boolean
  isBusy: boolean
  isReady: boolean
  canStop: boolean
  sendAction: ChatInputSendAction
  isStacked: boolean
  setStacked: (stacked: boolean) => void
  isVoiceActive: boolean
  setVoiceActive: (active: boolean) => void
  voiceLevel: (() => number) | undefined
  attach: ((files: File[]) => void) | undefined
  recall: (() => void) | undefined
  setTextarea: (textarea: HTMLTextAreaElement | null) => void
  card: HTMLFormElement | null
  caret: number
  setCaret: (caret: number) => void
  isFocused: boolean
  setFocused: (focused: boolean) => void
  /** Replaces the draft and puts the caret at `caret`, keeping focus in the field. */
  replaceValue: (value: string, caret: number) => void
  pendingCaret: number | null
  clearPendingCaret: () => void
  combobox: ChatInputCombobox | null
  setCombobox: React.Dispatch<React.SetStateAction<ChatInputCombobox | null>>
  /** A suggestion menu's keys, run before the field's own. */
  registerMenuKeys: (
    id: string,
    handler: (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean
  ) => () => void
  handleMenuKey: (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean
  submit: () => void
  stop: () => void
}

/** The open suggestion menu, for the field's combobox attributes. */
type ChatInputCombobox = { listId: string; activeId: string | undefined }

const ChatInputContext = React.createContext<ChatInputContextValue | null>(null)

class ChatInputContextError extends Error {
  constructor(part: string) {
    super(`<${part}> must be inside <ChatInput>.`)
    this.name = "ChatInputContextError"
  }
}

function useChatInput(part = "useChatInput") {
  const context = React.useContext(ChatInputContext)
  if (!context) throw new ChatInputContextError(part)
  return context
}

/** The height of what the card holds, for the card to ease to. */
function useContentHeight(content: React.RefObject<HTMLElement | null>) {
  const [height, setHeight] = React.useState<number>()
  React.useLayoutEffect(() => {
    const element = content.current
    if (!element || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight))
    observer.observe(element)
    return () => observer.disconnect()
  }, [content])
  return height
}

function hasFiles(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types).includes("Files")
}

type ChatInputProps = Omit<
  React.ComponentProps<"form">,
  "onSubmit" | "defaultValue"
> & {
  /** The draft. Controlled. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Sends the draft; the input clears through `onValueChange("")`. */
  onSubmit?: (value: string) => void
  /** Stops the reply. Without it, send only spins while a reply is on its way. */
  onStop?: () => void
  /** The reply's progress. Pass `useChat`'s `status` as it is. */
  status?: ChatInputStatus
  /** `compact` is a one-line pill that stacks above its controls once the draft wraps. */
  layout?: ChatInputLayout
  /** `mod-enter` sends with Cmd or Ctrl+Enter only, for long-form drafts. */
  submitOn?: ChatInputSubmitKey
  /** Something besides the text to send, such as attachments: an empty draft can be sent. */
  hasContent?: boolean
  /** While a reply is on its way, typed text still sends, as a message queued after it. */
  queue?: boolean
  /** An attachment is still uploading: send waits. */
  isUploading?: boolean
  /** Takes dropped and pasted files. With it, the card shows "Drop to attach" while files are dragged over it. */
  onAttach?: (files: File[]) => void
  /** ↑ in an empty field: take the last queued message back to edit. */
  onRecall?: () => void
  /** Voice chat is on. Controlled. */
  isVoiceActive?: boolean
  defaultVoiceActive?: boolean
  /** With it, an empty input offers voice chat in send's place. */
  onVoiceActiveChange?: (active: boolean) => void
  /** The live voice level, 0 to 1, read every frame: the glow and the microphone follow it. */
  voiceLevel?: () => number
  disabled?: boolean
}

function ChatInput({
  className,
  children,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  onSubmit,
  onStop,
  status = "ready",
  layout = "default",
  submitOn = "enter",
  hasContent = false,
  queue = false,
  isUploading = false,
  onAttach,
  onRecall,
  isVoiceActive: isVoiceActiveProp,
  defaultVoiceActive = false,
  onVoiceActiveChange,
  voiceLevel,
  disabled = false,
  style,
  onPointerDown,
  ref,
  ...props
}: ChatInputProps) {
  const [value, setValue] = useControllable(
    valueProp,
    defaultValue,
    onValueChange
  )
  const [isVoiceActive, setVoiceActive] = useControllable(
    isVoiceActiveProp,
    defaultVoiceActive,
    onVoiceActiveChange
  )
  const [isStacked, setStacked] = React.useState(false)
  const [isDropping, setDropping] = React.useState(false)
  const [textarea, setTextarea] = React.useState<HTMLTextAreaElement | null>(
    null
  )
  const [card, setCard] = React.useState<HTMLFormElement | null>(null)
  const [caret, setCaret] = React.useState(0)
  const [isFocused, setFocused] = React.useState(false)
  const [pendingCaret, setPendingCaret] = React.useState<number | null>(null)
  const [combobox, setCombobox] = React.useState<ChatInputCombobox | null>(null)
  const menuHandlers = React.useRef(
    new Map<
      string,
      (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean
    >()
  )
  const contentRef = React.useRef<HTMLDivElement>(null)
  const height = useContentHeight(contentRef)

  const registerMenuKeys = React.useCallback(
    (
      id: string,
      handler: (event: React.KeyboardEvent<HTMLTextAreaElement>) => boolean
    ) => {
      const handlers = menuHandlers.current
      handlers.set(id, handler)
      return () => {
        handlers.delete(id)
      }
    },
    []
  )
  const handleMenuKey = React.useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      for (const handler of menuHandlers.current.values())
        if (handler(event)) return true
      return false
    },
    []
  )
  const replaceValue = React.useCallback(
    (next: string, nextCaret: number) => {
      setValue(next)
      setCaret(nextCaret)
      setPendingCaret(nextCaret)
    },
    [setValue]
  )
  const clearPendingCaret = React.useCallback(() => setPendingCaret(null), [])
  const setRefs = React.useCallback(
    (node: HTMLFormElement | null) => {
      setCard(node)
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref]
  )
  const glowRef = useVoiceLevelVariable(voiceLevel, isVoiceActive)

  const isBusy = isChatInputBusy(status)
  const isReady = isChatInputReady({
    value,
    status,
    disabled,
    hasContent,
    queue,
    isUploading,
  })
  const canStop = isBusy && onStop !== undefined && !disabled
  const sendAction = getChatInputSendAction({
    hasMessage: hasContent || value.trim() !== "",
    isUploading,
    isBusy,
    canStop,
    queue,
    hasVoice: onVoiceActiveChange !== undefined,
    isVoiceActive,
  })

  const submit = React.useCallback(() => {
    if (!isReady) return
    onSubmit?.(value)
    setValue("")
  }, [isReady, onSubmit, setValue, value])

  const stop = React.useCallback(() => {
    if (canStop) onStop?.()
  }, [canStop, onStop])

  const context = React.useMemo(
    () => ({
      value,
      setValue,
      status,
      layout,
      submitOn,
      disabled,
      isBusy,
      isReady,
      canStop,
      sendAction,
      isStacked: layout === "compact" && isStacked,
      setStacked,
      isVoiceActive,
      setVoiceActive,
      voiceLevel,
      attach: onAttach,
      recall: onRecall,
      setTextarea,
      card,
      caret,
      setCaret,
      isFocused,
      setFocused,
      replaceValue,
      pendingCaret,
      clearPendingCaret,
      combobox,
      setCombobox,
      registerMenuKeys,
      handleMenuKey,
      submit,
      stop,
    }),
    [
      value,
      setValue,
      status,
      layout,
      submitOn,
      disabled,
      isBusy,
      isReady,
      canStop,
      sendAction,
      isStacked,
      isVoiceActive,
      setVoiceActive,
      voiceLevel,
      onAttach,
      onRecall,
      card,
      caret,
      isFocused,
      replaceValue,
      pendingCaret,
      clearPendingCaret,
      combobox,
      registerMenuKeys,
      handleMenuKey,
      submit,
      stop,
    ]
  )

  return (
    <ChatInputContext.Provider value={context}>
      <form
        ref={setRefs}
        data-slot="chat-input"
        data-layout={layout}
        data-status={status}
        data-stacked={layout === "compact" && isStacked ? "" : undefined}
        data-voice={isVoiceActive ? "" : undefined}
        data-dropping={isDropping ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        style={height === undefined ? style : { height, ...style }}
        className={cn(
          "cn-chat-input group/chat-input @container/chat-input relative isolate flex cursor-text flex-col justify-end overflow-clip",
          className
        )}
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        // A press on the card's bare surface puts the caret in the field.
        onPointerDown={(event) => {
          onPointerDown?.(event)
          const target = event.target
          if (
            event.defaultPrevented ||
            !(target instanceof HTMLElement) ||
            target.closest(
              "button, a, input, textarea, select, img, [role], [tabindex]"
            )
          )
            return
          event.preventDefault()
          textarea?.focus()
        }}
        onDragOver={(event) => {
          if (!onAttach || disabled || !hasFiles(event.dataTransfer)) return
          event.preventDefault()
          setDropping(true)
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return
          setDropping(false)
        }}
        onDrop={(event) => {
          if (!onAttach || disabled || !hasFiles(event.dataTransfer)) return
          event.preventDefault()
          setDropping(false)
          onAttach(Array.from(event.dataTransfer.files))
          textarea?.focus()
        }}
        {...props}
      >
        {isVoiceActive && (
          <div
            ref={(node) => {
              glowRef.current = node
            }}
            aria-hidden
            data-slot="chat-input-voice-glow"
            className="cn-chat-input-voice-glow pointer-events-none absolute inset-0 overflow-hidden"
          >
            <span className="cn-chat-input-voice-glow-start absolute" />
            <span className="cn-chat-input-voice-glow-end absolute" />
          </div>
        )}
        {isDropping && (
          <div
            aria-hidden
            data-slot="chat-input-drop"
            className="cn-chat-input-drop pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <IconPlaceholder
              lucide="PaperclipIcon"
              tabler="IconPaperclip"
              hugeicons="Attachment01Icon"
              phosphor="PaperclipIcon"
              remixicon="RiAttachment2"
            />
            Drop to attach
          </div>
        )}
        <div
          ref={contentRef}
          data-slot="chat-input-content"
          className="cn-chat-input-content relative z-10 flex shrink-0 flex-col group-data-[layout=compact]/chat-input:grid group-data-[layout=compact]/chat-input:grid-cols-[auto_minmax(0,1fr)_auto_auto] group-data-[layout=compact]/chat-input:items-center group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:items-end"
        >
          {children}
        </div>
      </form>
    </ChatInputContext.Provider>
  )
}

/** Across the card over the field: quoted context, a mode, a reply-to. */
function ChatInputHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-header"
      className={cn(
        "cn-chat-input-header flex min-w-0 flex-wrap items-center group-data-[layout=compact]/chat-input:col-span-full group-data-[layout=compact]/chat-input:row-start-1",
        className
      )}
      {...props}
    />
  )
}

type ChatInputAttachmentElement = React.ReactElement<{ src?: string }>

/**
 * The files riding along with the next message, as `ChatInputAttachment`
 * tiles. Place it in the card before the field: across the card in the
 * default layout; in the compact pill a few images ride beside send.
 */
function ChatInputAttachments({
  className,
  children,
  "aria-label": ariaLabel = "Attachments",
  ...props
}: React.ComponentProps<"ul">) {
  const { layout, isStacked } = useChatInput("ChatInputAttachments")
  const items = React.Children.toArray(children).filter(
    (child): child is ChatInputAttachmentElement =>
      React.isValidElement<{ src?: string }>(child)
  )
  if (items.length === 0) return null
  const placement = getChatInputAttachmentsLayout({
    layout,
    isStacked,
    items: items.map((item) => ({ isImage: Boolean(item.props.src) })),
  })

  return (
    <ul
      data-slot="chat-input-attachments"
      data-layout={placement}
      aria-label={ariaLabel}
      className={cn(
        "cn-chat-input-attachments group/chat-input-attachments flex min-w-0 data-[layout=compact]:col-span-full data-[layout=compact]:row-start-1 data-[layout=compact]:flex-wrap data-[layout=default]:flex-wrap data-[layout=inline]:col-start-3 data-[layout=inline]:row-start-2",
        className
      )}
      {...props}
    >
      {children}
    </ul>
  )
}

type ChatInputAttachmentProps = Omit<React.ComponentProps<"li">, "children"> & {
  /** The file's name: the tile's tooltip, and the chip's text for a file. */
  name: string
  /** An image preview. Without it, the tile is a file chip. */
  src?: string
  /** Dims the preview and spins over it. */
  isUploading?: boolean
  /** Shows a remove button on hover and focus. */
  onRemove?: () => void
  /** Content for a tile of your own, such as a lightbox trigger around the image. */
  children?: React.ReactNode
}

function ChatInputAttachment({
  className,
  name,
  src,
  isUploading = false,
  onRemove,
  children,
  ...props
}: ChatInputAttachmentProps) {
  const label = name || "Pasted file"
  return (
    <li
      data-slot="chat-input-attachment"
      data-kind={src ? "image" : "file"}
      data-uploading={isUploading ? "" : undefined}
      aria-busy={isUploading || undefined}
      className={cn(
        "cn-chat-input-attachment group/chat-input-attachment relative shrink-0",
        className
      )}
      {...props}
    >
      <div
        data-slot="chat-input-attachment-tile"
        title={label}
        className="cn-chat-input-attachment-tile relative flex items-center overflow-hidden"
      >
        {children ??
          (src ? (
            <img
              src={src}
              alt={label}
              className="cn-chat-input-attachment-image size-full object-cover"
            />
          ) : (
            <>
              <IconPlaceholder
                lucide="FileIcon"
                tabler="IconFile"
                hugeicons="File01Icon"
                phosphor="FileIcon"
                remixicon="RiFileLine"
                aria-hidden
              />
              <span className="cn-chat-input-attachment-name min-w-0 truncate">
                {label}
              </span>
            </>
          ))}
        {isUploading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <Spinner aria-label={`Uploading ${label}`} />
          </span>
        )}
      </div>
      {onRemove && !isUploading && (
        <button
          type="button"
          data-slot="chat-input-attachment-remove"
          aria-label={`Remove ${label}`}
          onClick={onRemove}
          className="cn-chat-input-attachment-remove absolute flex items-center justify-center"
        >
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
            aria-hidden
          />
        </button>
      )}
    </li>
  )
}

type ChatInputTextareaProps = Omit<
  React.ComponentProps<"textarea">,
  "value" | "defaultValue" | "placeholder"
> & {
  /** The empty field's hint. A list takes turns, one phrase every few seconds. */
  placeholder?: string | readonly string[]
  /** Sigils, such as `["@", "/"]`, whose mentions are drawn tinted as you type. */
  mentions?: readonly string[]
  /** Which mentions to tint, such as the names of real skills. Default: all of them. */
  isKnownMention?: (mention: string) => boolean
}

function ChatInputTextarea({
  className,
  ref,
  onChange,
  onKeyDown,
  onPaste,
  onScroll,
  placeholder = "",
  mentions,
  isKnownMention,
  onSelect,
  onFocus,
  onBlur,
  rows = 1,
  "aria-label": ariaLabel = "Message",
  ...props
}: ChatInputTextareaProps) {
  const {
    value,
    setValue,
    layout,
    submitOn,
    disabled,
    isBusy,
    isStacked,
    setStacked,
    attach,
    recall,
    setTextarea,
    setCaret,
    setFocused,
    pendingCaret,
    clearPendingCaret,
    combobox,
    handleMenuKey,
    submit,
    stop,
  } = useChatInput("ChatInputTextarea")
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  const mirrorRef = React.useRef<HTMLDivElement>(null)
  const inlineWidth = React.useRef(0)
  const lastFlip = React.useRef<string | null>(null)
  const [width, setWidth] = React.useState(0)
  const hint = useRotatingPlaceholder(
    typeof placeholder === "string" ? [placeholder] : placeholder,
    value === ""
  )
  const segments = React.useMemo(
    () =>
      mentions ? splitChatInputMentions(value, mentions, isKnownMention) : null,
    [mentions, value, isKnownMention]
  )

  const setRefs = React.useCallback(
    (node: HTMLTextAreaElement | null) => {
      fieldRef.current = node
      setTextarea(node)
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    },
    [ref, setTextarea]
  )

  // A narrower or wider card rewraps the draft.
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field || typeof ResizeObserver === "undefined") return
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.round(entry.contentRect.width))
    )
    observer.observe(field)
    return () => observer.disconnect()
  }, [])

  // A pick from a suggestion menu places the caret once its text is in.
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    if (pendingCaret === null || !field) return
    field.focus()
    field.setSelectionRange(pendingCaret, pendingCaret)
    clearPendingCaret()
  }, [pendingCaret, value, clearPendingCaret])

  // The field grows with the draft up to its max height, then scrolls; the
  // compact field stacks once the draft wraps beside its controls.
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.style.height = "auto"
    field.style.height = `${field.scrollHeight}px`
    if (layout !== "compact") return
    if (!isStacked) inlineWidth.current = measureTextRoom(field)
    const next = nextChatInputStacked({
      stacked: isStacked,
      value,
      wraps: field.scrollHeight > measureOneLineHeight(field) + 1,
      lineWidth: measureLineWidth(field, value),
      inlineWidth: inlineWidth.current,
    })
    if (next === isStacked) return
    // One flip per draft and width: a measurement that disagrees with itself
    // after the flip can never bounce the layout back and forth.
    const flip = `${width}:${value}`
    if (lastFlip.current === flip) return
    lastFlip.current = flip
    setStacked(next)
  }, [value, layout, isStacked, setStacked, width])

  return (
    <div
      data-slot="chat-input-field"
      className="cn-chat-input-field grid min-w-0 group-data-[layout=compact]/chat-input:col-start-2 group-data-[layout=compact]/chat-input:row-start-2 group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:col-span-full group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:col-start-1"
    >
      {segments && (
        <div
          ref={mirrorRef}
          aria-hidden
          data-slot="chat-input-mirror"
          className="cn-chat-input-textarea pointer-events-none col-start-1 row-start-1 overflow-hidden break-words whitespace-pre-wrap"
        >
          {segments.map((segment, index) =>
            segment.sigil ? (
              <span
                key={index}
                data-slot="chat-input-mention"
                data-sigil={segment.sigil}
                className="cn-chat-input-mention"
              >
                {segment.text}
              </span>
            ) : (
              <React.Fragment key={index}>{segment.text}</React.Fragment>
            )
          )}
          {"​"}
        </div>
      )}
      <textarea
        ref={setRefs}
        data-slot="chat-input-textarea"
        data-mentions={segments ? "" : undefined}
        data-placeholder-fading={hint.isFading ? "" : undefined}
        rows={rows}
        aria-label={ariaLabel}
        aria-autocomplete={combobox ? "list" : undefined}
        aria-controls={combobox?.listId}
        aria-activedescendant={combobox?.activeId}
        placeholder={hint.text}
        enterKeyHint={submitOn === "enter" ? "send" : "enter"}
        disabled={disabled}
        value={value}
        onChange={(event) => {
          onChange?.(event)
          setValue(event.target.value)
          setCaret(event.target.selectionStart)
        }}
        onSelect={(event) => {
          onSelect?.(event)
          setCaret(event.currentTarget.selectionStart)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          setFocused(true)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          setFocused(false)
        }}
        onPaste={(event) => {
          onPaste?.(event)
          const files = Array.from(event.clipboardData.files)
          if (event.defaultPrevented || !attach || files.length === 0) return
          event.preventDefault()
          attach(files)
        }}
        onScroll={(event) => {
          onScroll?.(event)
          if (mirrorRef.current)
            mirrorRef.current.scrollTop = event.currentTarget.scrollTop
        }}
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented || handleMenuKey(event)) return
          const action = getChatInputKeyAction(
            {
              key: event.key,
              shiftKey: event.shiftKey,
              metaKey: event.metaKey,
              ctrlKey: event.ctrlKey,
              altKey: event.altKey,
              // Safari ends composition before keydown; 229 is its Enter.
              isComposing:
                event.nativeEvent.isComposing ||
                event.nativeEvent.keyCode === 229,
            },
            { submitOn, isEmpty: value === "" }
          )
          if (action === "submit") {
            event.preventDefault()
            submit()
          } else if (action === "stop" && isBusy) {
            event.preventDefault()
            stop()
          } else if (action === "recall" && recall) {
            event.preventDefault()
            recall()
          }
        }}
        className={cn(
          "cn-chat-input-textarea col-start-1 row-start-1 block w-full min-w-0 resize-none bg-transparent outline-none disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
    </div>
  )
}

/** The row under the field. In the compact layout its two groups sit beside the field. */
function ChatInputFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-footer"
      className={cn(
        "cn-chat-input-footer flex min-w-0 items-center group-data-[layout=compact]/chat-input:contents",
        className
      )}
      {...props}
    />
  )
}

/** Controls at the start: add, attach, permissions, modes. */
function ChatInputTools({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-tools"
      className={cn(
        "cn-chat-input-tools me-auto flex min-w-0 items-center group-data-[layout=compact]/chat-input:col-start-1 group-data-[layout=compact]/chat-input:row-start-2 group-data-[layout=compact]/chat-input:me-0 group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:row-start-3",
        className
      )}
      {...props}
    />
  )
}

/** Controls at the end: the context meter, the model, the microphone, send. */
function ChatInputActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-actions"
      className={cn(
        "cn-chat-input-actions ms-auto flex min-w-0 items-center group-data-[layout=compact]/chat-input:col-start-4 group-data-[layout=compact]/chat-input:row-start-2 group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:row-start-3",
        className
      )}
      {...props}
    />
  )
}

type ChatInputButtonProps = React.ComponentProps<"button"> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">

/**
 * A ghost button for the footer; it never submits the form. Just an icon, it
 * is square; with a label (in a `<span>`) it is a pill.
 */
function ChatInputButton({
  className,
  variant = "ghost",
  size = "icon",
  type = "button",
  ...props
}: ChatInputButtonProps) {
  return (
    <button
      data-slot="chat-input-button"
      data-variant={variant}
      data-size={size}
      type={type}
      className={cn(
        buttonVariants({ variant, size }),
        "cn-chat-input-button",
        className
      )}
      {...props}
    />
  )
}

/**
 * The send slot. Empty with voice chat available, it starts voice chat (and
 * ends it while it's on); with a draft it sends, or queues while a reply
 * runs; while a reply streams into an empty input it spins and turns into a
 * stop square on hover or focus.
 */
function ChatInputSubmit({
  className,
  children,
  variant,
  size = "icon",
  onClick,
  "aria-label": ariaLabel,
  ...props
}: ChatInputButtonProps) {
  const { sendAction, disabled, isVoiceActive, setVoiceActive, stop } =
    useChatInput("ChatInputSubmit")
  const isVoiceEnd = sendAction === "voice" && isVoiceActive
  const label =
    ariaLabel ?? (isVoiceEnd ? "End voice chat" : SEND_LABELS[sendAction])
  const isLit =
    sendAction === "send" ||
    sendAction === "queue" ||
    sendAction === "voice" ||
    sendAction === "stop" ||
    sendAction === "busy"
  const resolvedVariant = variant ?? (isLit ? "default" : "secondary")
  const isSubmit = sendAction === "send" || sendAction === "queue"
  const isDisabled =
    disabled ||
    sendAction === "idle" ||
    sendAction === "uploading" ||
    sendAction === "busy"

  return (
    <button
      data-slot="chat-input-submit"
      data-state={sendAction}
      data-voice={isVoiceEnd ? "" : undefined}
      data-variant={resolvedVariant}
      data-size={size}
      type={isSubmit ? "submit" : "button"}
      disabled={isDisabled}
      aria-label={label}
      aria-pressed={sendAction === "voice" ? isVoiceActive : undefined}
      title={
        sendAction === "stop"
          ? "Stop (Esc)"
          : sendAction === "voice"
            ? label
            : undefined
      }
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        if (sendAction === "stop") stop()
        if (sendAction === "voice") setVoiceActive(!isVoiceActive)
      }}
      className={cn(
        buttonVariants({ variant: resolvedVariant, size }),
        "cn-chat-input-submit group/chat-input-submit",
        className
      )}
      {...props}
    >
      {children ?? (
        <span className="grid place-items-center *:[grid-area:1/1]">
          <IconPlaceholder
            lucide="ArrowUpIcon"
            tabler="IconArrowUp"
            hugeicons="ArrowUp01Icon"
            phosphor="ArrowUpIcon"
            remixicon="RiArrowUpLine"
            aria-hidden
            data-slot="chat-input-submit-send"
            className="cn-chat-input-submit-send"
          />
          <IconPlaceholder
            lucide="AudioLinesIcon"
            tabler="IconWaveSine"
            hugeicons="AudioWave01Icon"
            phosphor="WaveformIcon"
            remixicon="RiVoiceprintLine"
            aria-hidden
            data-slot="chat-input-submit-voice"
            className="cn-chat-input-submit-voice"
          />
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
            aria-hidden
            data-slot="chat-input-submit-end"
            className="cn-chat-input-submit-end"
          />
          <Spinner
            aria-hidden
            role="presentation"
            data-slot="chat-input-submit-spinner"
            className="cn-chat-input-submit-spinner"
          />
          <IconPlaceholder
            lucide="SquareIcon"
            tabler="IconPlayerStopFilled"
            hugeicons="StopIcon"
            phosphor="StopIcon"
            remixicon="RiStopFill"
            aria-hidden
            data-slot="chat-input-submit-stop"
            className="cn-chat-input-submit-stop"
          />
        </span>
      )}
    </button>
  )
}

type ChatInputMicProps = Omit<ChatInputButtonProps, "children"> & {
  /** What the microphone is doing. */
  activity: ChatInputMicActivity
}

/**
 * Voice chat's microphone, beside send while voice chat is on. It listens on
 * its own, so a press mutes and unmutes, or stops the reply while one is
 * speaking. Its icon swells with the voice level.
 */
function ChatInputMic({
  className,
  activity,
  variant = "ghost",
  size = "icon",
  "aria-label": ariaLabel,
  ...props
}: ChatInputMicProps) {
  const { isVoiceActive, voiceLevel } = useChatInput("ChatInputMic")
  const isLive =
    activity === "listening" ||
    activity === "hearing" ||
    activity === "speaking"
  const iconRef = useVoiceLevelVariable(voiceLevel, isVoiceActive && isLive)
  if (!isVoiceActive) return null
  const label = ariaLabel ?? getChatInputMicLabel(activity)

  return (
    <button
      type="button"
      data-slot="chat-input-mic"
      data-activity={activity}
      data-variant={variant}
      data-size={size}
      aria-label={label}
      aria-pressed={activity === "muted"}
      title={activity === "speaking" ? `${label} (Esc)` : label}
      className={cn(
        buttonVariants({ variant, size }),
        "cn-chat-input-button cn-chat-input-mic",
        className
      )}
      {...props}
    >
      <span
        ref={(node) => {
          iconRef.current = node
        }}
        aria-hidden
        className="cn-chat-input-mic-icon grid place-items-center"
      >
        {activity === "transcribing" ? (
          <Spinner role="presentation" />
        ) : activity === "speaking" ? (
          <IconPlaceholder
            lucide="AudioLinesIcon"
            tabler="IconWaveSine"
            hugeicons="AudioWave01Icon"
            phosphor="WaveformIcon"
            remixicon="RiVoiceprintLine"
          />
        ) : activity === "muted" ? (
          <IconPlaceholder
            lucide="MicOffIcon"
            tabler="IconMicrophoneOff"
            hugeicons="MicOff01Icon"
            phosphor="MicrophoneSlashIcon"
            remixicon="RiMicOffLine"
          />
        ) : (
          <IconPlaceholder
            lucide="MicIcon"
            tabler="IconMicrophone"
            hugeicons="Mic01Icon"
            phosphor="MicrophoneIcon"
            remixicon="RiMicLine"
          />
        )}
      </span>
    </button>
  )
}

type ChatInputContextMeterProps = Omit<ChatInputButtonProps, "value"> & {
  /** How full the context is, 0 to 1. */
  value: number
  /** The reading beside the ring, hidden in a narrow input. Default: the percentage. */
  label?: React.ReactNode
}

/**
 * How full the model's context is, as a ring that turns warning from 70% and
 * destructive from 90%, with a reading beside it. A button, to open the
 * details in a popover of your own.
 */
function ChatInputContextMeter({
  className,
  value,
  label,
  variant = "ghost",
  size = "default",
  "aria-label": ariaLabel,
  ...props
}: ChatInputContextMeterProps) {
  const fraction = Math.min(1, Math.max(0, value))
  const percent = `${Math.round(fraction * 100)}%`
  const radius = 5.25
  const circumference = 2 * Math.PI * radius

  return (
    <button
      type="button"
      data-slot="chat-input-context-meter"
      data-level={getChatInputContextLevel(fraction)}
      data-variant={variant}
      data-size={size}
      aria-label={ariaLabel ?? `Context ${percent} used`}
      className={cn(
        buttonVariants({ variant, size }),
        "cn-chat-input-button cn-chat-input-context-meter",
        className
      )}
      {...props}
    >
      <span className="cn-chat-input-context-meter-label">
        {label ?? percent}
      </span>
      <svg
        viewBox="0 0 14 14"
        aria-hidden
        data-slot="chat-input-context-meter-ring"
        className="cn-chat-input-context-meter-ring -rotate-90"
      >
        <circle
          cx="7"
          cy="7"
          r={radius}
          fill="none"
          strokeWidth="1.75"
          className="cn-chat-input-context-meter-track"
        />
        <circle
          cx="7"
          cy="7"
          r={radius}
          fill="none"
          strokeWidth="1.75"
          strokeLinecap="round"
          stroke="currentColor"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
        />
      </svg>
    </button>
  )
}

type ChatInputCommand = {
  /** The name after the sigil, such as `goal` or `code-review`. */
  value: string
  description?: React.ReactNode
  icon?: React.ReactNode
  /** A short tag at the end of the row, such as "project". */
  badge?: React.ReactNode
  /** `skill` names read in the skill tint, mono; `command` names in bold. */
  kind?: "command" | "skill"
  /** Picking it runs it through `onRun` instead of writing it into the draft. */
  runs?: boolean
}

type ChatInputCommandsProps = Omit<
  React.ComponentProps<"div">,
  "children" | "title"
> & {
  /** What opens the menu. Default `/`. */
  sigil?: string
  commands: readonly ChatInputCommand[]
  /** A command with `runs`: it's taken out of the draft and handed here. */
  onRun?: (command: ChatInputCommand) => void
  /** The menu's name and heading. */
  title?: string
  /** Shown when nothing matches what's typed. */
  emptyText?: React.ReactNode
}

/**
 * The suggestion menu for a sigil typed in the field, such as `/` for
 * commands and skills: it opens over the card as you type the sigil at the
 * start or after a space, filters by what follows, and writes the pick into
 * the draft. ↑ and ↓ move, ↵ or Tab pick, Esc dismisses.
 */
function ChatInputCommands({
  className,
  sigil = "/",
  commands,
  onRun,
  title = "Commands and skills",
  emptyText = "No matching commands.",
  ...props
}: ChatInputCommandsProps) {
  const {
    value,
    caret,
    isFocused,
    card,
    replaceValue,
    registerMenuKeys,
    setCombobox,
  } = useChatInput("ChatInputCommands")
  const density = useDensity()
  const id = React.useId()
  const listId = `${id}-list`
  const listRef = React.useRef<HTMLDivElement>(null)
  const [dismissed, setDismissed] = React.useState<string | null>(null)
  const [active, setActive] = React.useState({ query: "", index: 0 })
  const [rect, setRect] = React.useState<DOMRect | null>(null)

  const trigger = findChatInputTrigger(value, caret, [sigil])
  const dismissKey = trigger ? `${trigger.start}:${value}` : null
  const isOpen = Boolean(trigger) && isFocused && dismissKey !== dismissed
  const matches = trigger
    ? filterChatInputCommands(commands, trigger.query)
    : []
  const activeIndex =
    trigger && active.query === trigger.query
      ? Math.min(active.index, Math.max(0, matches.length - 1))
      : 0
  const activeId =
    isOpen && matches.length > 0 ? `${id}-option-${activeIndex}` : undefined

  const pick = (command: ChatInputCommand) => {
    if (!trigger) return
    if (command.runs) {
      const next = applyChatInputPick(value, trigger, "")
      replaceValue(next.text, next.caret)
      onRun?.(command)
      return
    }
    const next = applyChatInputPick(value, trigger, `${sigil}${command.value}`)
    replaceValue(next.text, next.caret)
  }

  const handleKey = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isOpen || !trigger || event.nativeEvent.isComposing) return false
    if (event.key === "Escape") {
      event.preventDefault()
      setDismissed(dismissKey)
      return true
    }
    if (matches.length === 0) return false
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault()
      const step = event.key === "ArrowDown" ? 1 : -1
      setActive({
        query: trigger.query,
        index: (activeIndex + step + matches.length) % matches.length,
      })
      return true
    }
    if (
      (event.key === "Enter" || event.key === "Tab") &&
      !event.shiftKey &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      event.preventDefault()
      const command = matches[activeIndex]
      if (command) pick(command)
      return true
    }
    return false
  }
  const handleKeyRef = React.useRef(handleKey)
  React.useLayoutEffect(() => {
    handleKeyRef.current = handleKey
  })
  React.useEffect(
    () => registerMenuKeys(id, (event) => handleKeyRef.current(event)),
    [registerMenuKeys, id]
  )

  // The field names the open menu and its active option.
  React.useLayoutEffect(() => {
    if (!isOpen) {
      setCombobox((current) => (current?.listId === listId ? null : current))
      return
    }
    setCombobox({ listId, activeId })
  }, [isOpen, listId, activeId, setCombobox])
  React.useEffect(
    () => () =>
      setCombobox((current) => (current?.listId === listId ? null : current)),
    [listId, setCombobox]
  )

  // The menu spans the card and follows it as it moves or resizes.
  React.useLayoutEffect(() => {
    if (!isOpen || !card) return
    const measure = () => setRect(card.getBoundingClientRect())
    measure()
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure)
    observer?.observe(card)
    window.addEventListener("resize", measure)
    window.addEventListener("scroll", measure, true)
    return () => {
      observer?.disconnect()
      window.removeEventListener("resize", measure)
      window.removeEventListener("scroll", measure, true)
    }
  }, [isOpen, card])

  React.useLayoutEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [activeIndex, isOpen])

  if (!isOpen || !rect || typeof document === "undefined") return null

  return createPortal(
    <div
      role="dialog"
      aria-label={title}
      data-slot="chat-input-commands"
      data-density={density}
      style={{
        left: rect.left,
        width: rect.width,
        bottom: window.innerHeight - rect.top,
      }}
      className={cn(
        "cn-chat-input-commands fixed z-50 flex flex-col overflow-hidden",
        className
      )}
      {...props}
    >
      <div
        data-slot="chat-input-commands-header"
        className="cn-chat-input-commands-header flex items-center justify-between"
      >
        <span className="cn-chat-input-commands-title">{title}</span>
        <span className="cn-chat-input-commands-hint">
          ↑↓ to navigate · ↵ to insert · esc to dismiss
        </span>
      </div>
      {matches.length === 0 ? (
        <p className="cn-chat-input-commands-empty">{emptyText}</p>
      ) : (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-label={title}
          className="cn-chat-input-commands-list relative overflow-y-auto"
        >
          {matches.map((command, index) => (
            <div
              key={command.value}
              id={`${id}-option-${index}`}
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              data-index={index}
              data-kind={command.kind ?? "command"}
              data-slot="chat-input-command"
              onMouseMove={() =>
                trigger && setActive({ query: trigger.query, index })
              }
              onMouseDown={(event) => {
                event.preventDefault()
                pick(command)
              }}
              className="cn-chat-input-command flex cursor-pointer items-center"
            >
              {command.icon && (
                <span
                  aria-hidden
                  className="cn-chat-input-command-icon flex shrink-0"
                >
                  {command.icon}
                </span>
              )}
              <span className="cn-chat-input-command-name shrink-0">
                {sigil}
                {command.value}
              </span>
              {command.description && (
                <span className="cn-chat-input-command-description min-w-0 flex-1 truncate">
                  {command.description}
                </span>
              )}
              {command.badge && (
                <span className="cn-chat-input-command-badge ms-auto shrink-0">
                  {command.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>,
    document.body
  )
}

type ChatInputTrayProps = React.ComponentProps<"div"> & {
  /**
   * How far back it sits: 1 just behind the card (queued messages), 2
   * behind that (background work), 3 furthest back (a goal). Each is inset
   * a little more, so a stack of trays steps back from the card.
   */
  level?: 1 | 2 | 3
}

/**
 * Tucked behind the card's top edge: messages queued for after the reply,
 * work running in the background, the goal the agent works toward. Place
 * trays just before `ChatInput`, furthest back first.
 */
function ChatInputTray({ className, level = 1, ...props }: ChatInputTrayProps) {
  return (
    <div
      data-slot="chat-input-tray"
      data-level={level}
      className={cn("cn-chat-input-tray relative grid min-w-0", className)}
      {...props}
    />
  )
}

type ChatInputTrayEntryContextValue = {
  isOpen: boolean
  setOpen: (open: boolean) => void
  contentId: string
}

const ChatInputTrayEntryContext =
  React.createContext<ChatInputTrayEntryContextValue | null>(null)

function useChatInputTrayEntry(part: string) {
  const context = React.useContext(ChatInputTrayEntryContext)
  if (!context)
    throw new ChatInputContextError(`${part}> in <ChatInputTrayEntry`)
  return context
}

type ChatInputTrayEntryProps = React.ComponentProps<"div"> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}

/** A tray row that opens to more: a goal's reason, a task's output. */
function ChatInputTrayEntry({
  className,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ChatInputTrayEntryProps) {
  const [isOpen, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const contentId = React.useId()
  const context = React.useMemo(
    () => ({ isOpen, setOpen, contentId }),
    [isOpen, setOpen, contentId]
  )
  return (
    <ChatInputTrayEntryContext.Provider value={context}>
      <div
        data-slot="chat-input-tray-entry"
        data-open={isOpen ? "" : undefined}
        className={cn(
          "cn-chat-input-tray-entry group/chat-input-tray-entry min-w-0",
          className
        )}
        {...props}
      />
    </ChatInputTrayEntryContext.Provider>
  )
}

/** One row: an icon, its text, then actions such as Steer or Stop. */
function ChatInputTrayItem({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-tray-item"
      className={cn(
        "cn-chat-input-tray-item flex min-w-0 items-center",
        className
      )}
      {...props}
    />
  )
}

/** The text of a row inside a `ChatInputTrayEntry`: a button that opens its content. */
function ChatInputTrayTrigger({
  className,
  children,
  onClick,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  const { isOpen, setOpen, contentId } = useChatInputTrayEntry(
    "ChatInputTrayTrigger"
  )
  return (
    <button
      type={type}
      data-slot="chat-input-tray-trigger"
      aria-expanded={isOpen}
      aria-controls={contentId}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) setOpen(!isOpen)
      }}
      className={cn(
        "cn-chat-input-tray-trigger flex h-full min-w-0 flex-1 items-center text-start outline-none",
        className
      )}
      {...props}
    >
      {children}
      <IconPlaceholder
        lucide="ChevronDownIcon"
        tabler="IconChevronDown"
        hugeicons="ArrowDown01Icon"
        phosphor="CaretDownIcon"
        remixicon="RiArrowDownSLine"
        aria-hidden
        data-slot="chat-input-tray-chevron"
        className="cn-chat-input-tray-chevron shrink-0"
      />
    </button>
  )
}

/** What a `ChatInputTrayEntry` opens to. */
function ChatInputTrayContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { isOpen, contentId } = useChatInputTrayEntry("ChatInputTrayContent")
  return (
    <div
      id={contentId}
      hidden={!isOpen}
      data-slot="chat-input-tray-content"
      className={cn("cn-chat-input-tray-content", className)}
      {...props}
    />
  )
}

/** A quiet reading at the end of a row's text: how long it has run, a goal's status. */
function ChatInputTrayMeta({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="chat-input-tray-meta"
      className={cn("cn-chat-input-tray-meta shrink-0", className)}
      {...props}
    />
  )
}

export {
  ChatInput,
  ChatInputHeader,
  ChatInputAttachments,
  ChatInputAttachment,
  ChatInputTextarea,
  ChatInputFooter,
  ChatInputTools,
  ChatInputActions,
  ChatInputButton,
  ChatInputSubmit,
  ChatInputMic,
  ChatInputContextMeter,
  ChatInputCommands,
  ChatInputTray,
  ChatInputTrayEntry,
  ChatInputTrayItem,
  ChatInputTrayTrigger,
  ChatInputTrayContent,
  ChatInputTrayMeta,
  useChatInput,
  useRotatingPlaceholder,
  getChatInputKeyAction,
  getChatInputSendAction,
  getChatInputAttachmentsLayout,
  getChatInputContextLevel,
  getChatInputMicLabel,
  splitChatInputMentions,
  findChatInputTrigger,
  applyChatInputPick,
  filterChatInputCommands,
  formatChatInputDuration,
  formatTokenCount,
  isChatInputBusy,
  isChatInputReady,
  nextChatInputStacked,
  type ChatInputStatus,
  type ChatInputSubmitKey,
  type ChatInputLayout,
  type ChatInputMicActivity,
  type ChatInputSendAction,
  type ChatInputTrigger,
  type ChatInputCommand,
}
