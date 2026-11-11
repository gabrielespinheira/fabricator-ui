"use client"

import * as React from "react"
import { cn } from "cn"
import { createPortal } from "react-dom"
import {
  getAudioContext,
  VoiceBeam,
  type VoiceBeamColorVariant,
} from "voice-glow"

import {
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
  getChatInputTrayStack,
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
  type ChatInputLayout,
  type ChatInputMicActivity,
  type ChatInputSendAction,
  type ChatInputStatus,
  type ChatInputSubmitKey,
  type ChatInputTrigger,
} from "@/registry/bases/__base__/lib/chat-input-model"
import {
  buttonVariants,
  type Button,
} from "@/registry/bases/__base__/ui/button"
import { useDensity } from "@/registry/bases/__base__/ui/density"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The message box of a chat: a raised pill whose field stacks above its
// controls once the draft wraps (or a large card with the controls under the
// field), whose height eases to what it holds, and one send slot that offers voice chat while the
// draft is empty, sends once there is something to send, and stops a reply
// while one streams. Enter sends, Shift+Enter adds a line, Escape stops.

/** A file riding along with the next message: `file` is the dropped, pasted or picked `File`. */
type ChatInputAttached = ChatInputAttachedEntry<File>

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

/**
 * A getter for the live level of a microphone stream, analysed on the page's
 * shared audio context (voice-glow's): RMS each frame, through the same gate,
 * gain and envelope as the glow.
 */
function useStreamLevel(stream: MediaStream | null | undefined) {
  const [read, setRead] = React.useState<(() => number) | undefined>()

  React.useEffect(() => {
    const context = stream ? getAudioContext() : null
    if (!stream || !context || stream.getAudioTracks().length === 0) {
      setRead(undefined)
      return
    }
    const source = context.createMediaStreamSource(stream)
    const analyser = context.createAnalyser()
    analyser.fftSize = 1024
    source.connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    let level = 0
    let last = performance.now()
    setRead(() => () => {
      analyser.getFloatTimeDomainData(samples)
      let sum = 0
      for (const sample of samples) sum += sample * sample
      const now = performance.now()
      level = smoothChatInputVoiceLevel(
        level,
        getChatInputVoiceLevel(Math.sqrt(sum / samples.length)),
        (now - last) / 1000
      )
      last = now
      return level
    })
    return () => {
      source.disconnect()
      analyser.disconnect()
    }
  }, [stream])

  return read
}

/** Whether an element sits in a dark theme (`.dark` on it or an ancestor), following changes to <html>. */
function useIsDark(element: HTMLElement | null) {
  const [isDark, setDark] = React.useState(false)

  React.useEffect(() => {
    if (!element) return
    const update = () => setDark(element.closest(".dark") !== null)
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    return () => observer.disconnect()
  }, [element])

  return isDark
}

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
  /** The default is a one-line pill that stacks above its controls once the draft wraps; `large` is a card with the controls under the field. */
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
  /** The microphone's stream: the glow analyses it itself (and wins over `voiceLevel`). */
  voiceStream?: MediaStream | null
  /** The glow's palette. Default `colorful`. */
  voiceColor?: VoiceBeamColorVariant
  /** The glow's light or dark tuning. Default: dark inside `.dark`, else light. */
  voiceTheme?: "dark" | "light"
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
  voiceStream,
  voiceColor = "colorful",
  voiceTheme,
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
  const isDark = useIsDark(card)
  const streamLevel = useStreamLevel(isVoiceActive ? voiceStream : null)
  // With a stream, the mic icon follows its real level; else the one passed.
  const level = voiceStream ? streamLevel : voiceLevel

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
      isStacked: layout === "default" && isStacked,
      setStacked,
      isVoiceActive,
      setVoiceActive,
      voiceLevel: level,
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
      level,
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
        data-stacked={layout === "default" && isStacked ? "" : undefined}
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
          // voice-glow's VoiceBeam draws a sound-reactive glow along the
          // bottom edge of what it wraps; here it wraps an empty layer the
          // size of the card, behind the content.
          <div
            aria-hidden
            data-slot="chat-input-voice-glow"
            className="cn-chat-input-voice-glow pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]"
          >
            <VoiceBeam
              stream={voiceStream}
              level={voiceLevel ?? 0}
              colorVariant={voiceColor}
              theme={getChatInputVoiceTheme({ isDark, theme: voiceTheme })}
              className="size-full rounded-[inherit]"
            >
              <div className="size-full rounded-[inherit]" />
            </VoiceBeam>
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
          className="cn-chat-input-content relative z-10 flex shrink-0 flex-col group-data-[layout=default]/chat-input:grid group-data-[layout=default]/chat-input:grid-cols-[auto_minmax(0,1fr)_auto_auto] group-data-[layout=default]/chat-input:items-center group-data-[layout=default]/chat-input:group-data-stacked/chat-input:items-end"
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
        "cn-chat-input-header flex min-w-0 flex-wrap items-center group-data-[layout=default]/chat-input:col-span-full group-data-[layout=default]/chat-input:row-start-1",
        className
      )}
      {...props}
    />
  )
}

type ChatInputAttachmentElement = React.ReactElement<{ src?: string }>

/**
 * The files riding along with the next message, as `ChatInputAttachment`
 * tiles. Place it before the field: across the large card; in the pill a
 * few images ride beside send.
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
        "cn-chat-input-attachments group/chat-input-attachments flex min-w-0 data-[layout=default]:col-span-full data-[layout=default]:row-start-1 data-[layout=default]:flex-wrap data-[layout=inline]:col-start-3 data-[layout=inline]:row-start-2 data-[layout=large]:flex-wrap",
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

/**
 * The files riding along with a draft: what to render as
 * `ChatInputAttachment`s, and `attach` for the root's `onAttach` (dropped and
 * pasted files) and your own file picker. Images get an object URL preview,
 * released when they're removed, cleared or unmounted, so take what you send
 * from `file` before `clear`. With `upload`, each file waits for it; a
 * rejected upload drops the file and reports the error.
 */
function useChatInputAttachments({
  initial = [],
  upload,
}: {
  initial?: ChatInputAttached[]
  upload?: (file: File) => Promise<unknown>
} = {}) {
  const [attachments, dispatch] = React.useReducer(
    reduceChatInputAttachments,
    initial
  )
  const [previews] = React.useState(() => new Set<string>())

  React.useEffect(
    () => () => {
      for (const url of previews) URL.revokeObjectURL(url)
      previews.clear()
    },
    [previews]
  )

  const release = (entry: ChatInputAttached | undefined) => {
    if (!entry?.src || !previews.delete(entry.src)) return
    URL.revokeObjectURL(entry.src)
  }

  const remove = (id: string) => {
    release(attachments.find((entry) => entry.id === id))
    dispatch({ type: "remove", id })
  }

  const attach = (files: File[]) => {
    const added = files.map((file) => {
      const src = file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined
      if (src) previews.add(src)
      return {
        id: crypto.randomUUID(),
        name: file.name,
        src,
        file,
        isUploading: upload !== undefined,
      }
    })
    dispatch({ type: "add", entries: added })
    if (!upload) return
    for (const entry of added)
      upload(entry.file).then(
        () => dispatch({ type: "land", id: entry.id }),
        (error: unknown) => {
          release(entry)
          dispatch({ type: "remove", id: entry.id })
          reportError(error)
        }
      )
  }

  const clear = () => {
    for (const entry of attachments) release(entry)
    dispatch({ type: "clear" })
  }

  return {
    attachments,
    attach,
    remove,
    clear,
    /** For the root's `hasContent`: files send without text. */
    hasContent: attachments.length > 0,
    /** For the root's `isUploading`: send waits while one uploads. */
    isUploading: attachments.some((entry) => entry.isUploading),
  }
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

  // A draft your app sets (a + menu inserting a /) moves the caret without
  // a select event; the menus read it here once the text is in, whichever
  // comes first, the focus or the draft.
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field || field.ownerDocument.activeElement !== field) return
    setCaret(field.selectionStart)
  }, [value, setCaret])

  // A pick from a suggestion menu places the caret once its text is in.
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    if (pendingCaret === null || !field) return
    field.focus()
    field.setSelectionRange(pendingCaret, pendingCaret)
    clearPendingCaret()
  }, [pendingCaret, value, clearPendingCaret])

  // The field grows with the draft up to its max height, then scrolls; the
  // pill's field stacks once the draft wraps beside its controls.
  React.useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    field.style.height = "auto"
    field.style.height = `${field.scrollHeight}px`
    if (layout !== "default") return
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
      className="cn-chat-input-field grid min-w-0 group-data-[layout=default]/chat-input:col-start-2 group-data-[layout=default]/chat-input:row-start-2 group-data-[layout=default]/chat-input:group-data-stacked/chat-input:col-span-full group-data-[layout=default]/chat-input:group-data-stacked/chat-input:col-start-1"
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
          // A draft your app changed (+ inserting a /) moved the caret
          // without a select event, so the menus read it here.
          setCaret(event.currentTarget.selectionStart)
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

/** The row under the field in the large card. In the pill its two groups sit beside the field. */
function ChatInputFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-footer"
      className={cn(
        "cn-chat-input-footer flex min-w-0 items-center group-data-[layout=default]/chat-input:contents",
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
        "cn-chat-input-tools me-auto flex min-w-0 items-center group-data-[layout=default]/chat-input:col-start-1 group-data-[layout=default]/chat-input:row-start-2 group-data-[layout=default]/chat-input:me-0 group-data-[layout=default]/chat-input:group-data-stacked/chat-input:row-start-3",
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
        "cn-chat-input-actions ms-auto flex min-w-0 items-center group-data-[layout=default]/chat-input:col-start-4 group-data-[layout=default]/chat-input:row-start-2 group-data-[layout=default]/chat-input:group-data-stacked/chat-input:row-start-3",
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
  const label = ariaLabel ?? getChatInputSendLabel(sendAction, isVoiceActive)
  const resolvedVariant =
    variant ?? (isChatInputSendLit(sendAction) ? "default" : "secondary")
  const isSubmit = sendAction === "send" || sendAction === "queue"
  const isDisabled = disabled || isChatInputSendDisabled(sendAction)

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
  const iconRef = useVoiceLevelVariable(
    voiceLevel,
    isVoiceActive && isChatInputMicLive(activity)
  )
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
  size = "icon",
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

type ChatInputOptionsContextValue = {
  value: string | undefined
  select: (value: string) => void
}

const ChatInputOptionsContext =
  React.createContext<ChatInputOptionsContextValue | null>(null)

type ChatInputOptionsProps = Omit<
  React.ComponentProps<"div">,
  "defaultValue" | "onChange"
> & {
  /** The option in use. Controlled. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

/**
 * A set of choices with a line of explanation each, such as what the agent
 * may do without asking: a radio group that goes in a popover from a footer
 * pill. One option is in use and checked; arrows move and pick, as in any
 * radio group.
 */
function ChatInputOptions({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  onKeyDown,
  ...props
}: ChatInputOptionsProps) {
  const [value, setValue] = useControllable<string | undefined>(
    valueProp,
    defaultValue
  )
  const context = React.useMemo(
    () => ({
      value,
      select: (next: string) => {
        setValue(next)
        onValueChange?.(next)
      },
    }),
    [value, setValue, onValueChange]
  )

  return (
    <ChatInputOptionsContext.Provider value={context}>
      <div
        role="radiogroup"
        data-slot="chat-input-options"
        onKeyDown={(event) => {
          onKeyDown?.(event)
          if (event.defaultPrevented) return
          const options = Array.from(
            event.currentTarget.querySelectorAll<HTMLButtonElement>(
              '[data-slot="chat-input-option"]:not(:disabled)'
            )
          )
          const index = options.findIndex(
            (option) => option === document.activeElement
          )
          const next = getChatInputOptionKeyIndex(
            event.key,
            Math.max(0, index),
            options.length
          )
          if (next === null) return
          event.preventDefault()
          const option = options[next]
          option?.focus()
          if (option?.dataset.value) context.select(option.dataset.value)
        }}
        className={cn("cn-chat-input-options flex flex-col", className)}
        {...props}
      />
    </ChatInputOptionsContext.Provider>
  )
}

type ChatInputOptionProps = Omit<
  React.ComponentProps<"button">,
  "value" | "children"
> & {
  value: string
  label: React.ReactNode
  /** A line under the label on what the option does. */
  description?: React.ReactNode
  icon?: React.ReactNode
}

/** One choice: its icon, label and description, and a check while it's in use. */
function ChatInputOption({
  className,
  value,
  label,
  description,
  icon,
  type = "button",
  onClick,
  ...props
}: ChatInputOptionProps) {
  const context = React.useContext(ChatInputOptionsContext)
  if (!context)
    throw new ChatInputContextError("ChatInputOption> in <ChatInputOptions")
  const isChecked = context.value === value

  return (
    <button
      type={type}
      role="radio"
      aria-checked={isChecked}
      tabIndex={isChecked || context.value === undefined ? 0 : -1}
      data-slot="chat-input-option"
      data-value={value}
      data-checked={isChecked ? "" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (!event.defaultPrevented) context.select(value)
      }}
      className={cn(
        "cn-chat-input-option flex w-full items-start text-start outline-none disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      {icon && (
        <span aria-hidden className="cn-chat-input-option-icon flex shrink-0">
          {icon}
        </span>
      )}
      <span className="grid min-w-0 flex-1">
        <span className="cn-chat-input-option-label">{label}</span>
        {description && (
          <span className="cn-chat-input-option-description">
            {description}
          </span>
        )}
      </span>
      <IconPlaceholder
        lucide="CheckIcon"
        tabler="IconCheck"
        hugeicons="Tick02Icon"
        phosphor="CheckIcon"
        remixicon="RiCheckLine"
        aria-hidden
        data-slot="chat-input-option-check"
        className="cn-chat-input-option-check shrink-0"
      />
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

// Where a tray sits in a `ChatInputTrays` stack: all of it, its first row in
// front of a folded stack, or folded away behind it.
const TrayStackContext = React.createContext<"full" | "front" | "hidden">(
  "full"
)

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
function ChatInputTray({
  className,
  level = 1,
  children,
  ...props
}: ChatInputTrayProps) {
  const place = React.useContext(TrayStackContext)
  if (place === "hidden") return null
  // Folded, the front tray holds only its first row and sits just behind
  // the card, with the stack's edges stepping back from it.
  const isFront = place === "front"
  return (
    <div
      data-slot="chat-input-tray"
      data-level={isFront ? 1 : level}
      className={cn("cn-chat-input-tray relative grid min-w-0", className)}
      {...props}
    >
      {isFront ? React.Children.toArray(children).slice(0, 1) : children}
    </div>
  )
}

type ChatInputTraysProps = React.ComponentProps<"div"> & {
  /** Whether every row shows. Folded by default: the front row, and the rest as edges behind it. */
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
}

/**
 * Folds a stack of `ChatInputTray`s. Only the front row shows, the frontmost
 * tray's first, with the other rows peeking out behind it as up to two
 * edges; pressing the edges opens every row, and Show less folds them
 * again. Place it just before `ChatInput`, with the trays inside, furthest
 * back first.
 */
function ChatInputTrays({
  className,
  expanded: expandedProp,
  defaultExpanded = false,
  onExpandedChange,
  children,
  ...props
}: ChatInputTraysProps) {
  const [expandedState, setExpandedState] = React.useState(defaultExpanded)
  const isExpanded = expandedProp ?? expandedState
  const setExpanded = (next: boolean) => {
    if (expandedProp === undefined) setExpandedState(next)
    onExpandedChange?.(next)
  }
  const trays = React.Children.toArray(children).filter((child) =>
    React.isValidElement<{ children?: React.ReactNode }>(child)
  )
  const stack = getChatInputTrayStack({
    rows: trays.map((tray) =>
      React.isValidElement<{ children?: React.ReactNode }>(tray)
        ? React.Children.toArray(tray.props.children).length
        : 0
    ),
    isExpanded,
  })
  const edges = Array.from({ length: stack.edges }, (_, index) =>
    String(stack.edges - index + 1)
  )
  return (
    <div
      data-slot="chat-input-trays"
      data-collapsed={stack.isCollapsed ? "" : undefined}
      className={cn("cn-chat-input-trays grid min-w-0", className)}
      {...props}
    >
      {stack.isCollapsible && !stack.isCollapsed && (
        <button
          type="button"
          aria-expanded
          data-slot="chat-input-trays-less"
          className="cn-chat-input-trays-less flex items-center justify-self-end outline-none"
          onClick={() => setExpanded(false)}
        >
          Show less
          <IconPlaceholder
            lucide="ChevronDownIcon"
            tabler="IconChevronDown"
            hugeicons="ArrowDown01Icon"
            phosphor="CaretDownIcon"
            remixicon="RiArrowDownSLine"
            aria-hidden
          />
        </button>
      )}
      {stack.isCollapsed && (
        <button
          type="button"
          aria-expanded={false}
          aria-label={`Show ${stack.hiddenRows} more`}
          data-slot="chat-input-trays-edges"
          className="cn-chat-input-trays-edges grid cursor-pointer outline-none"
          onClick={() => setExpanded(true)}
        >
          {edges.map((level) => (
            <span
              key={level}
              data-slot="chat-input-tray-edge"
              data-level={level}
              className="cn-chat-input-tray cn-chat-input-tray-edge block"
            />
          ))}
        </button>
      )}
      {trays.map((tray, index) => (
        <TrayStackContext
          key={index}
          value={
            stack.isCollapsed
              ? index === stack.front
                ? "front"
                : "hidden"
              : "full"
          }
        >
          {tray}
        </TrayStackContext>
      ))}
    </div>
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
  ChatInputOptions,
  ChatInputOption,
  ChatInputCommands,
  ChatInputTray,
  ChatInputTrays,
  ChatInputTrayEntry,
  ChatInputTrayItem,
  ChatInputTrayTrigger,
  ChatInputTrayContent,
  ChatInputTrayMeta,
  useChatInput,
  useRotatingPlaceholder,
  useChatInputAttachments,
  reduceChatInputAttachments,
  getChatInputKeyAction,
  getChatInputSendAction,
  getChatInputAttachmentsLayout,
  getChatInputContextLevel,
  getChatInputMicLabel,
  getChatInputVoiceLevel,
  getChatInputVoiceTheme,
  smoothChatInputVoiceLevel,
  splitChatInputMentions,
  findChatInputTrigger,
  applyChatInputPick,
  filterChatInputCommands,
  formatChatInputDuration,
  getChatInputOptionKeyIndex,
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
  type ChatInputAttached,
}
