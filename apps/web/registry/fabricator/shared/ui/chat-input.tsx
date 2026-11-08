"use client"

import * as React from "react"
import { cn } from "cn"

import {
  buttonVariants,
  type Button,
} from "@/registry/bases/__base__/ui/button"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The message box of a chat: a raised card whose field grows with the draft
// and whose height eases to what it holds, controls under the field (or beside
// it in the compact pill), and a send button that turns into stop while a
// reply streams. Enter sends, Shift+Enter adds a line, Escape stops.

/** The reply's progress, named as the AI SDK's `useChat` names it. */
type ChatInputStatus = "ready" | "submitted" | "streaming" | "error"

type ChatInputSubmitKey = "enter" | "mod-enter"

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
 * always sends. Escape stops a reply.
 */
function getChatInputKeyAction(
  event: ChatInputKey,
  { submitOn }: { submitOn: ChatInputSubmitKey }
): "submit" | "stop" | "none" {
  if (event.isComposing) return "none"
  if (event.key === "Escape") return "stop"
  if (event.key !== "Enter" || event.shiftKey || event.altKey) return "none"
  if (event.metaKey || event.ctrlKey) return "submit"
  return submitOn === "enter" ? "submit" : "none"
}

/** A reply is on its way: send turns into stop. */
function isChatInputBusy(status: ChatInputStatus) {
  return status === "submitted" || status === "streaming"
}

/**
 * There is something to send and nothing in the way: text that isn't only
 * whitespace (or other content, such as attachments), no reply on its way
 * (unless messages queue behind it), and the input enabled.
 */
function isChatInputReady({
  value,
  status,
  disabled = false,
  hasContent = false,
  queue = false,
}: {
  value: string
  status: ChatInputStatus
  disabled?: boolean
  hasContent?: boolean
  queue?: boolean
}) {
  if (disabled) return false
  if (isChatInputBusy(status) && !queue) return false
  return hasContent || value.trim() !== ""
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
  layout: "default" | "compact"
  submitOn: ChatInputSubmitKey
  disabled: boolean
  isBusy: boolean
  isReady: boolean
  canStop: boolean
  isStacked: boolean
  setStacked: (stacked: boolean) => void
  textarea: HTMLTextAreaElement | null
  setTextarea: (textarea: HTMLTextAreaElement | null) => void
  submit: () => void
  stop: () => void
}

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
  layout?: "default" | "compact"
  /** `mod-enter` sends with Cmd or Ctrl+Enter only, for long-form drafts. */
  submitOn?: ChatInputSubmitKey
  /** Something besides the text to send, such as attachments: an empty draft can be sent. */
  hasContent?: boolean
  /** While a reply is on its way, Enter still sends, for a message to queue after it. Send stays stop. */
  queue?: boolean
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
  disabled = false,
  style,
  onPointerDown,
  ...props
}: ChatInputProps) {
  const [value, setValue] = useControllable(
    valueProp,
    defaultValue,
    onValueChange
  )
  const [isStacked, setStacked] = React.useState(false)
  const [textarea, setTextarea] = React.useState<HTMLTextAreaElement | null>(
    null
  )
  const contentRef = React.useRef<HTMLDivElement>(null)
  const height = useContentHeight(contentRef)

  const isBusy = isChatInputBusy(status)
  const isReady = isChatInputReady({
    value,
    status,
    disabled,
    hasContent,
    queue,
  })
  const canStop = isBusy && onStop !== undefined && !disabled

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
      isStacked: layout === "compact" && isStacked,
      setStacked,
      textarea,
      setTextarea,
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
      isStacked,
      textarea,
      submit,
      stop,
    ]
  )

  return (
    <ChatInputContext.Provider value={context}>
      <form
        data-slot="chat-input"
        data-layout={layout}
        data-status={status}
        data-stacked={layout === "compact" && isStacked ? "" : undefined}
        data-disabled={disabled ? "" : undefined}
        style={height === undefined ? style : { height, ...style }}
        className={cn(
          "cn-chat-input group/chat-input relative isolate flex cursor-text flex-col justify-end overflow-clip",
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
              "button, a, input, textarea, select, [role], [tabindex]"
            )
          )
            return
          event.preventDefault()
          textarea?.focus()
        }}
        {...props}
      >
        <div
          ref={contentRef}
          data-slot="chat-input-content"
          className="cn-chat-input-content relative flex shrink-0 flex-col group-data-[layout=compact]/chat-input:grid group-data-[layout=compact]/chat-input:grid-cols-[auto_minmax(0,1fr)_auto] group-data-[layout=compact]/chat-input:items-center group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:items-end"
        >
          {children}
        </div>
      </form>
    </ChatInputContext.Provider>
  )
}

/** Across the card over the field: attachments, quoted context, a mode. */
function ChatInputHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-header"
      className={cn(
        "cn-chat-input-header flex min-w-0 flex-wrap items-center group-data-[layout=compact]/chat-input:col-span-3 group-data-[layout=compact]/chat-input:row-start-1",
        className
      )}
      {...props}
    />
  )
}

function ChatInputTextarea({
  className,
  ref,
  onChange,
  onKeyDown,
  rows = 1,
  "aria-label": ariaLabel = "Message",
  ...props
}: Omit<React.ComponentProps<"textarea">, "value" | "defaultValue">) {
  const {
    value,
    setValue,
    layout,
    submitOn,
    disabled,
    isBusy,
    isStacked,
    setStacked,
    setTextarea,
    submit,
    stop,
  } = useChatInput("ChatInputTextarea")
  const fieldRef = React.useRef<HTMLTextAreaElement>(null)
  const inlineWidth = React.useRef(0)
  const lastFlip = React.useRef<string | null>(null)
  const [width, setWidth] = React.useState(0)

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
    <textarea
      ref={setRefs}
      data-slot="chat-input-textarea"
      rows={rows}
      aria-label={ariaLabel}
      enterKeyHint={submitOn === "enter" ? "send" : "enter"}
      disabled={disabled}
      value={value}
      onChange={(event) => {
        onChange?.(event)
        setValue(event.target.value)
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented) return
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
          { submitOn }
        )
        if (action === "submit") {
          event.preventDefault()
          submit()
        } else if (action === "stop" && isBusy) {
          event.preventDefault()
          stop()
        }
      }}
      className={cn(
        "cn-chat-input-textarea block w-full min-w-0 resize-none bg-transparent outline-none group-data-[layout=compact]/chat-input:col-start-2 group-data-[layout=compact]/chat-input:row-start-2 group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:col-span-3 group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:col-start-1 disabled:cursor-not-allowed",
        className
      )}
      {...props}
    />
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

/** Controls at the start: add, attach, modes. */
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

/** Controls at the end: the model, voice, send. */
function ChatInputActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-actions"
      className={cn(
        "cn-chat-input-actions ms-auto flex shrink-0 items-center group-data-[layout=compact]/chat-input:col-start-3 group-data-[layout=compact]/chat-input:row-start-2 group-data-[layout=compact]/chat-input:group-data-stacked/chat-input:row-start-3",
        className
      )}
      {...props}
    />
  )
}

type ChatInputButtonProps = React.ComponentProps<"button"> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">

/** A ghost icon button for the footer; it never submits the form. */
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
 * Sends the draft. While a reply is on its way it spins, and turns into a
 * stop square on hover or focus when the input has `onStop`.
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
  const { isBusy, isReady, canStop, disabled, stop } =
    useChatInput("ChatInputSubmit")
  const state = isBusy ? "busy" : "idle"
  const label = ariaLabel ?? (isBusy ? (canStop ? "Stop" : "Sending") : "Send")

  const resolvedVariant =
    variant ?? (isReady || isBusy ? "default" : "secondary")

  return (
    <button
      data-slot="chat-input-submit"
      data-state={state}
      data-can-stop={canStop ? "" : undefined}
      data-variant={resolvedVariant}
      data-size={size}
      type={isBusy ? "button" : "submit"}
      disabled={disabled || (isBusy ? !canStop : !isReady)}
      aria-label={label}
      title={isBusy && canStop ? "Stop (Esc)" : undefined}
      onClick={(event) => {
        onClick?.(event)
        if (isBusy && !event.defaultPrevented) stop()
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

/**
 * Tucked behind the card's top edge: messages queued for after the reply,
 * work running in the background. Place it just before `ChatInput`.
 */
function ChatInputTray({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="chat-input-tray"
      className={cn("cn-chat-input-tray relative grid min-w-0", className)}
      {...props}
    />
  )
}

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

export {
  ChatInput,
  ChatInputHeader,
  ChatInputTextarea,
  ChatInputFooter,
  ChatInputTools,
  ChatInputActions,
  ChatInputButton,
  ChatInputSubmit,
  ChatInputTray,
  ChatInputTrayItem,
  useChatInput,
  getChatInputKeyAction,
  isChatInputBusy,
  isChatInputReady,
  nextChatInputStacked,
  type ChatInputStatus,
  type ChatInputSubmitKey,
}
