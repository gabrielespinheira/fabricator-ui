import * as React from "react"
import {
  ArrowUpIcon,
  AudioLinesIcon,
  CheckIcon,
  ChevronDownIcon,
  FileIcon,
  IconProvider,
  MicIcon,
  MicOffIcon,
  SquareIcon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { useComposedRefs } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  Image,
  Pressable,
  TextInput,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native"
import {
  KeyboardStickyView,
  useKeyboardState,
} from "react-native-keyboard-controller"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import Svg, {
  Circle,
  Defs,
  Ellipse,
  RadialGradient,
  Stop,
} from "react-native-svg"
import { useCSSVariable, useResolveClassNames, useUniwind } from "uniwind"

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
} from "@/registry/fabricator/shared/lib/chat-input-model"
import {
  getChatInputGlowRoles,
  getChatInputKeyboardOffset,
  getChatInputMentionTone,
  getChatInputReturnKey,
  withChatInputAlpha,
  type ChatInputGlowRole,
  type ChatInputMentionTone,
  type ChatInputVoiceColor,
} from "@/registry/native/lib/chat-input-native-model"
import { getTouchSlop } from "@/registry/native/lib/density-scale"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  FluidHoverScrollList,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import {
  useMotion,
  usePressScale,
  useSurfaceAnimation,
} from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { PressWash } from "@/registry/native/lib/press-wash"
import { Button } from "@/registry/native/ui/button"
import { Spinner } from "@/registry/native/ui/spinner"
import {
  renderTextChildren,
  Text,
  TextClassContext,
  TextStyle,
} from "@/registry/native/ui/text"

// The message box of a chat: a raised pill whose field stacks above its
// controls once the draft wraps (or a large card with the controls under the
// field), whose height eases to what it holds, and one send slot that offers
// voice chat while the draft is empty, sends once there is something to send,
// and stops a reply while one streams. The return key sends; with
// `submitOn="mod-enter"` it adds a line and only the send slot sends.

type TextInputRef = React.ComponentRef<typeof TextInput>

/** A picked file, as Expo's image and document pickers return it. */
type ChatInputFile = {
  uri: string
  name: string
  /** `image/…` gets a preview from `uri`. */
  mimeType?: string
  size?: number
}

/** A file riding along with the next message: `file` is the picked asset. */
type ChatInputAttached = ChatInputAttachedEntry<ChatInputFile>

/** The width under which the pill hides the context meter's reading, as the website's `@max-md`. */
const NARROW_WIDTH = 448

/** How far the mic's icon swells at full voice, as the website's 0.4. */
const MIC_SWELL = 0.4

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

function useLatest<T>(value: T) {
  const ref = React.useRef(value)
  React.useEffect(() => {
    ref.current = value
  }, [value])
  return ref
}

function isPart<Props>(
  child: React.ReactNode,
  part: (props: Props) => React.ReactNode
): child is React.ReactElement<Props> {
  return React.isValidElement(child) && child.type === part
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
  /** The pill has tools before its field: the field's start inset follows. */
  hasTools: boolean
  /** The input is narrower than the website's `md` container. */
  isNarrow: boolean
  isVoiceActive: boolean
  setVoiceActive: (active: boolean) => void
  /** The live voice level, 0 to 1, on the UI thread. */
  voiceLevel: SharedValue<number>
  attach: ((files: ChatInputFile[]) => void) | undefined
  recall: (() => void) | undefined
  caret: number
  setCaret: (caret: number) => void
  isFocused: boolean
  setFocused: (focused: boolean) => void
  setInvalid: (invalid: boolean) => void
  /** Puts the caret in the field. */
  focus: () => void
  registerField: (field: TextInputRef | null) => void
  /** Replaces the draft and puts the caret at `caret`, keeping focus in the field. */
  replaceValue: (value: string, caret: number) => void
  pendingCaret: number | null
  clearPendingCaret: () => void
  /** A suggestion menu's return key, run before the field's own. */
  registerReturn: (id: string, handler: () => boolean) => () => void
  handleReturn: () => boolean
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
  const context = React.use(ChatInputContext)
  if (!context) throw new ChatInputContextError(part)
  return context
}

// Where the pill renders its attachments: across the top, or beside send.
// The parts render in both places and keep to the one their layout picks.
const AttachmentsSlotContext = React.createContext<"block" | "inline" | null>(
  null
)

// A tray's buttons are compact, as the website's `[data-slot=chat-input-tray]`.
const TrayContext = React.createContext(false)

/**
 * The empty field's hint: a list of phrases takes turns, each fading out
 * before the next comes in. One phrase, a draft, or Reduce Motion holds it
 * still.
 */
function useRotatingPlaceholder(phrases: readonly string[], isActive: boolean) {
  const [index, setIndex] = React.useState(0)
  const [isFading, setFading] = React.useState(false)
  const isReduced = useReducedMotion()
  const isTurning = isActive && phrases.length > 1 && !isReduced

  React.useEffect(() => {
    if (!isTurning) return
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

/** Reads the app's level every frame onto the UI thread while voice chat is on. */
function useVoiceLevel(level: (() => number) | undefined, isActive: boolean) {
  const shared = useSharedValue(0)
  const levelRef = useLatest(level)
  const hasLevel = level !== undefined
  React.useEffect(() => {
    if (!isActive || !hasLevel) {
      shared.set(0)
      return
    }
    let frame = requestAnimationFrame(function draw() {
      shared.set(Math.min(1, Math.max(0, levelRef.current?.() ?? 0)))
      frame = requestAnimationFrame(draw)
    })
    return () => {
      cancelAnimationFrame(frame)
      shared.set(0)
    }
  }, [hasLevel, isActive, levelRef, shared])
  return shared
}

/**
 * The card's height, easing to what it holds on the move timing. Undefined
 * until the content has been measured once, so the first frame takes its
 * natural height.
 */
function useContentHeight() {
  const motion = useMotion("move")
  const [isMeasured, setMeasured] = React.useState(false)
  const height = useSharedValue(0)
  const onLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      const next = event.nativeEvent.layout.height
      if (!isMeasured || motion.isOff || motion.isReduced) {
        height.set(next)
        setMeasured(true)
        return
      }
      height.set(
        withTiming(next, {
          duration: motion.enterMs,
          easing: motion.moveEasing,
          reduceMotion: ReduceMotion.Never,
        })
      )
    },
    [height, isMeasured, motion]
  )
  const style = useAnimatedStyle(() =>
    isMeasured ? { height: height.value } : {}
  )
  return { isMeasured, style, onLayout }
}

/**
 * Rides the on-screen keyboard, stopping a gap above it, as the editor's
 * keyboard bar does. How far is measured while the keyboard is down, as the
 * composer's distance from the window's bottom edge, so a home indicator's
 * inset or a tab bar under it isn't lifted twice.
 */
function ChatInputKeyboardRide({ children }: { children?: React.ReactNode }) {
  const isKeyboardVisible = useKeyboardState((state) => state.isVisible)
  const { height: windowHeight } = useWindowDimensions()
  const gap = parseNumber(useCSSVariable("--density-8"), 8)
  const [distance, setDistance] = React.useState(0)
  const ref = React.useRef<React.ComponentRef<typeof View>>(null)
  const measure = React.useCallback(() => {
    if (isKeyboardVisible) return
    ref.current?.measureInWindow((_x, y, _width, height) => {
      setDistance(windowHeight - (y + height))
    })
  }, [isKeyboardVisible, windowHeight])
  React.useEffect(measure, [measure])
  return (
    <KeyboardStickyView
      offset={{
        closed: 0,
        opened: getChatInputKeyboardOffset({ distanceToBottom: distance, gap }),
      }}
    >
      <View ref={ref} onLayout={measure}>
        {children}
      </View>
    </KeyboardStickyView>
  )
}

// The glow's strength for a dark or a light theme.
const GLOW_THEME_CLASSES = {
  dark: cva("cn-chat-input-voice-glow cn-chat-input-voice-glow-dark"),
  light: cva("cn-chat-input-voice-glow cn-chat-input-voice-glow-light"),
}

// Each lobe's colour role, resolved for the gradient.
const GLOW_LOBE_CLASSES: Record<ChatInputGlowRole, () => string> = {
  primary: cva("cn-chat-input-voice-glow-lobe-primary"),
  info: cva("cn-chat-input-voice-glow-lobe-info"),
  success: cva("cn-chat-input-voice-glow-lobe-success"),
  warning: cva("cn-chat-input-voice-glow-lobe-warning"),
  destructive: cva("cn-chat-input-voice-glow-lobe-destructive"),
  foreground: cva("cn-chat-input-voice-glow-lobe-foreground"),
}

// Three lobes along the bottom edge, the centre widest, in the viewBox's units.
const GLOW_LOBES = [
  { cx: 50, rx: 46, ry: 70 },
  { cx: 16, rx: 34, ry: 52 },
  { cx: 84, rx: 34, ry: 52 },
] as const

/**
 * Voice chat's glow on React Native: the website's comes from voice-glow on
 * Web Audio and canvas, so this draws three soft lobes in the colour roles
 * along the card's bottom edge, rising and brightening with the level.
 */
function ChatInputVoiceGlow({
  level,
  color,
  theme,
}: {
  level: SharedValue<number>
  color: ChatInputVoiceColor
  theme: "dark" | "light"
}) {
  const motion = useMotion("move")
  const isStill = motion.isReduced || motion.isOff
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, "")
  const roles = getChatInputGlowRoles(color)
  const centre = useResolveClassNames(GLOW_LOBE_CLASSES[roles[0]]()).color
  const start = useResolveClassNames(GLOW_LOBE_CLASSES[roles[1]]()).color
  const end = useResolveClassNames(GLOW_LOBE_CLASSES[roles[2]]()).color
  const colors = [centre, start, end]
  const style = useAnimatedStyle(() => {
    const value = isStill ? 0.5 : level.value
    return {
      opacity: 0.55 + value * 0.45,
      transform: [{ scaleY: 0.7 + value * 0.5 }],
      transformOrigin: "bottom",
    }
  })
  return (
    <View
      aria-hidden
      pointerEvents="none"
      data-slot="chat-input-voice-glow"
      className={cn(GLOW_THEME_CLASSES[theme](), "absolute inset-0")}
    >
      <Animated.View className="size-full" style={style}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <Defs>
            {GLOW_LOBES.map((_lobe, index) => (
              <RadialGradient
                key={index}
                id={`${id}-${index}`}
                cx="50%"
                cy="100%"
                rx="50%"
                ry="100%"
              >
                <Stop
                  offset="0"
                  stopColor={
                    typeof colors[index] === "string"
                      ? colors[index]
                      : undefined
                  }
                  stopOpacity={index === 0 ? 0.55 : 0.4}
                />
                <Stop
                  offset="1"
                  stopColor={
                    typeof colors[index] === "string"
                      ? colors[index]
                      : undefined
                  }
                  stopOpacity={0}
                />
              </RadialGradient>
            ))}
          </Defs>
          {GLOW_LOBES.map((lobe, index) => (
            <Ellipse
              key={index}
              cx={lobe.cx}
              cy={100}
              rx={lobe.rx}
              ry={lobe.ry}
              fill={`url(#${id}-${index})`}
            />
          ))}
        </Svg>
      </Animated.View>
    </View>
  )
}

type ChatInputProps = Omit<React.ComponentProps<typeof View>, "children"> & {
  children?: React.ReactNode
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
  /** `mod-enter`: the return key adds a line, and only the send slot sends, for long-form drafts. */
  submitOn?: ChatInputSubmitKey
  /** Something besides the text to send, such as attachments: an empty draft can be sent. */
  hasContent?: boolean
  /** While a reply is on its way, typed text still sends, as a message queued after it. */
  queue?: boolean
  /** An attachment is still uploading: send waits. */
  isUploading?: boolean
  /** Takes files: `useChatInput().attach` hands them here, for a picker of your own. */
  onAttach?: (files: ChatInputFile[]) => void
  /** Takes the last queued message back to edit: `useChatInput().recall` calls it. */
  onRecall?: () => void
  /** Voice chat is on. Controlled. */
  isVoiceActive?: boolean
  defaultVoiceActive?: boolean
  /** With it, an empty input offers voice chat in send's place. */
  onVoiceActiveChange?: (active: boolean) => void
  /** The live voice level, 0 to 1, read every frame: the glow and the microphone follow it. */
  voiceLevel?: () => number
  /** The glow's palette. Default `colorful`. */
  voiceColor?: ChatInputVoiceColor
  /** The glow's light or dark tuning. Default: the theme's. */
  voiceTheme?: "dark" | "light"
  disabled?: boolean
  /** Pinned to the bottom of a screen: it rides the on-screen keyboard. Needs `KeyboardProvider` at the app's root. */
  sticky?: boolean
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
  voiceColor = "colorful",
  voiceTheme,
  disabled = false,
  sticky = false,
  style,
  onLayout,
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
  const [caret, setCaret] = React.useState(0)
  const [isFocused, setFocused] = React.useState(false)
  const [isInvalid, setInvalid] = React.useState(false)
  const [width, setWidth] = React.useState(0)
  const [pendingCaret, setPendingCaret] = React.useState<number | null>(null)
  const fieldRef = React.useRef<TextInputRef | null>(null)
  const returnHandlers = React.useRef(new Map<string, () => boolean>())
  const height = useContentHeight()
  const level = useVoiceLevel(voiceLevel, isVoiceActive)
  const { theme } = useUniwind()
  const [d36, d8] = useCSSVariable(["--density-36", "--density-8"])
  // The website's `calc(var(--density-36) / 2 + var(--density-8))`: round
  // around the round send, and kept as the stacked pill grows.
  const pillRadius = parseNumber(d36, 36) / 2 + parseNumber(d8, 8)

  const registerReturn = React.useCallback(
    (id: string, handler: () => boolean) => {
      const handlers = returnHandlers.current
      handlers.set(id, handler)
      return () => {
        handlers.delete(id)
      }
    },
    []
  )
  const handleReturn = React.useCallback(() => {
    for (const handler of returnHandlers.current.values())
      if (handler()) return true
    return false
  }, [])
  const replaceValue = React.useCallback(
    (next: string, nextCaret: number) => {
      setValue(next)
      setCaret(nextCaret)
      setPendingCaret(nextCaret)
    },
    [setValue]
  )
  const clearPendingCaret = React.useCallback(() => setPendingCaret(null), [])
  const registerField = React.useCallback((field: TextInputRef | null) => {
    fieldRef.current = field
  }, [])
  const focus = React.useCallback(() => fieldRef.current?.focus(), [])

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

  const items = React.Children.toArray(children)
  const menus = items.filter((child) => isPart(child, ChatInputCommands))
  const body = items.filter((child) => !isPart(child, ChatInputCommands))
  const footer = body.find((child) => isPart(child, ChatInputFooter))
  const footerItems = footer
    ? React.Children.toArray(footer.props.children)
    : []
  const tools = footerItems.filter((child) => isPart(child, ChatInputTools))
  const ends = footerItems.filter((child) => !isPart(child, ChatInputTools))
  const fieldIndex = body.findIndex((child) => isPart(child, ChatInputTextarea))
  const isPill = layout === "default" && fieldIndex !== -1
  const stackedRow = useSurfaceAnimation("move", { translateY: -4 })

  const context = React.useMemo<ChatInputContextValue>(
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
      hasTools: tools.length > 0,
      isNarrow: width > 0 && width < NARROW_WIDTH,
      isVoiceActive,
      setVoiceActive,
      voiceLevel: level,
      attach: onAttach,
      recall: onRecall,
      caret,
      setCaret,
      isFocused,
      setFocused,
      setInvalid,
      focus,
      registerField,
      replaceValue,
      pendingCaret,
      clearPendingCaret,
      registerReturn,
      handleReturn,
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
      tools.length,
      width,
      isVoiceActive,
      setVoiceActive,
      level,
      onAttach,
      onRecall,
      caret,
      isFocused,
      focus,
      registerField,
      replaceValue,
      pendingCaret,
      clearPendingCaret,
      registerReturn,
      handleReturn,
      submit,
      stop,
    ]
  )

  // The pill sets its controls beside the field, and under it once the
  // draft wraps: the footer's groups come out of it, as the website's
  // `display: contents` footer does in its grid.
  let content: React.ReactNode = renderTextChildren(body)
  if (isPill) {
    const isRowStacked = context.isStacked
    const before = body.slice(0, fieldIndex).filter((child) => child !== footer)
    const after = body.slice(fieldIndex + 1).filter((child) => child !== footer)
    const attachments = before.filter((child) =>
      isPart(child, ChatInputAttachments)
    )
    content = (
      <>
        <AttachmentsSlotContext value="block">
          {renderTextChildren(before)}
        </AttachmentsSlotContext>
        <View
          data-stacked={isRowStacked}
          className={cn(
            "flex-row",
            isRowStacked ? "items-end" : "items-center"
          )}
        >
          {isRowStacked ? null : tools}
          {body[fieldIndex]}
          <AttachmentsSlotContext value="inline">
            {isRowStacked ? null : attachments}
          </AttachmentsSlotContext>
          {isRowStacked ? null : ends}
        </View>
        {isRowStacked ? (
          <Animated.View
            entering={stackedRow.entering}
            className="flex-row items-center"
          >
            {tools}
            <View className="flex-1" />
            {ends}
          </Animated.View>
        ) : null}
        {renderTextChildren(after)}
      </>
    )
  }

  const card = (
    <Animated.View
      ref={ref}
      data-slot="chat-input"
      data-layout={layout}
      data-status={status}
      data-stacked={context.isStacked}
      data-voice={isVoiceActive}
      data-focused={isFocused}
      data-invalid={isInvalid}
      data-disabled={disabled}
      aria-disabled={disabled}
      className={cn("cn-chat-input relative", className)}
      style={[
        layout === "default" ? { borderRadius: pillRadius } : undefined,
        height.style,
        style,
      ]}
      onLayout={(event) => {
        setWidth(event.nativeEvent.layout.width)
        onLayout?.(event)
      }}
      {...props}
    >
      {/* A press on the card's bare surface puts the caret in the field. */}
      <Pressable
        accessible={false}
        disabled={disabled}
        onPress={focus}
        data-layout={layout}
        className={cn(
          "cn-chat-input-clip justify-end overflow-hidden",
          height.isMeasured ? "absolute inset-0" : undefined
        )}
        style={layout === "default" ? { borderRadius: pillRadius } : undefined}
      >
        {isVoiceActive ? (
          <ChatInputVoiceGlow
            level={level}
            color={voiceColor}
            theme={getChatInputVoiceTheme({
              isDark: theme === "dark",
              theme: voiceTheme,
            })}
          />
        ) : null}
        <View
          data-slot="chat-input-content"
          data-layout={layout}
          onLayout={height.onLayout}
          className="cn-chat-input-content shrink-0"
        >
          {content}
        </View>
      </Pressable>
      {/* A border on the card would sit inside its eased height and clip the
          content, so the invalid edge is drawn over it. */}
      {isInvalid ? (
        <View
          aria-hidden
          pointerEvents="none"
          className="cn-chat-input-invalid absolute inset-0 border"
          style={
            layout === "default" ? { borderRadius: pillRadius } : undefined
          }
        />
      ) : null}
      {menus}
    </Animated.View>
  )

  return (
    <ChatInputContext value={context}>
      {sticky ? <ChatInputKeyboardRide>{card}</ChatInputKeyboardRide> : card}
    </ChatInputContext>
  )
}

/** Across the card over the field: quoted context, a mode, a reply-to. */
function ChatInputHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="chat-input-header"
      className={cn(
        "cn-chat-input-header min-w-0 flex-row flex-wrap items-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

type ChatInputAttachmentElement = React.ReactElement<{ src?: string }>

// The tiles read where their row sits, for their size.
const AttachmentsLayoutContext = React.createContext<
  "large" | "default" | "inline"
>("large")

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
}: React.ComponentProps<typeof View>) {
  const { layout, isStacked } = useChatInput("ChatInputAttachments")
  const slot = React.use(AttachmentsSlotContext)
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
  if (slot !== null && (slot === "inline") !== (placement === "inline"))
    return null

  return (
    <AttachmentsLayoutContext value={placement}>
      <View
        role="list"
        data-slot="chat-input-attachments"
        data-layout={placement}
        aria-label={ariaLabel}
        className={cn(
          "cn-chat-input-attachments min-w-0 flex-row",
          placement === "inline" ? "items-center" : "flex-wrap",
          className
        )}
        {...props}
      >
        {children}
      </View>
    </AttachmentsLayoutContext>
  )
}

/**
 * The files riding along with a draft: what to render as
 * `ChatInputAttachment`s, and `attach` for the root's `onAttach` and your own
 * picker (expo-image-picker's or expo-document-picker's assets fit
 * `ChatInputFile`). Images preview from their URI. With `upload`, each file
 * waits for it; a rejected upload drops the file and reports the error.
 */
function useChatInputAttachments({
  initial = [],
  upload,
}: {
  initial?: ChatInputAttached[]
  upload?: (file: ChatInputFile) => Promise<unknown>
} = {}) {
  const [attachments, dispatch] = React.useReducer(
    reduceChatInputAttachments<ChatInputAttached>,
    initial
  )
  const count = React.useRef(0)

  const remove = (id: string) => dispatch({ type: "remove", id })

  const attach = (files: ChatInputFile[]) => {
    const added = files.map((file) => {
      count.current += 1
      return {
        id: `${Date.now().toString(36)}-${count.current}`,
        name: file.name,
        src: file.mimeType?.startsWith("image/") ? file.uri : undefined,
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
          dispatch({ type: "remove", id: entry.id })
          // The global handler reports it, as the website's reportError does.
          setTimeout(() => {
            throw error
          })
        }
      )
  }

  const clear = () => dispatch({ type: "clear" })

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

// The website's `opacity-50` on an image still uploading.
const UPLOADING_OPACITY = 0.5

const chatInputAttachmentTileVariants = cva(
  "cn-chat-input-attachment-tile relative flex-row items-center overflow-hidden"
)

function ChatInputAttachment({
  className,
  name,
  src,
  isUploading = false,
  onRemove,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  /** The file's name: the image's label, and the chip's text for a file. */
  name: string
  /** An image preview. Without it, the tile is a file chip. */
  src?: string
  /** Dims the preview and spins over it. */
  isUploading?: boolean
  /** Shows a remove button on the tile's corner. */
  onRemove?: () => void
  /** Content for a tile of your own, such as a lightbox trigger around the image. */
  children?: React.ReactNode
}) {
  const placement = React.use(AttachmentsLayoutContext)
  const feedback = useFeedback()
  const label = name || "Pasted file"
  const kind = src ? "image" : "file"
  const enter = useSurfaceAnimation("move", { translateY: 4 })
  const motion = useMotion("move")
  const opacity = useSharedValue(isUploading ? UPLOADING_OPACITY : 1)
  React.useEffect(() => {
    opacity.set(
      withTiming(isUploading ? UPLOADING_OPACITY : 1, {
        duration: motion.enterMs,
        easing: motion.moveEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [isUploading, motion, opacity])
  const imageStyle = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const [removeSize, removeIcon] = useCSSVariable([
    "--density-20",
    "--density-icon-14",
  ])
  const removeSlop = getTouchSlop(parseNumber(removeSize, 20))

  return (
    <Animated.View
      role="listitem"
      entering={enter.entering}
      data-slot="chat-input-attachment"
      data-kind={kind}
      data-layout={placement}
      data-uploading={isUploading}
      aria-busy={isUploading}
      className={cn("cn-chat-input-attachment relative shrink-0", className)}
      {...props}
    >
      <View
        data-slot="chat-input-attachment-tile"
        data-kind={kind}
        data-layout={placement}
        className={chatInputAttachmentTileVariants()}
      >
        {children ??
          (src ? (
            <Animated.View className="size-full" style={imageStyle}>
              <Image
                source={{ uri: src }}
                accessibilityLabel={label}
                resizeMode="cover"
                className="cn-chat-input-attachment-image size-full"
              />
            </Animated.View>
          ) : (
            <IconProvider strokeWidth={1.5}>
              <TextStyle className="cn-chat-input-attachment-icon">
                <FileIcon aria-hidden />
              </TextStyle>
              <Text
                numberOfLines={1}
                className="cn-chat-input-attachment-name min-w-0 shrink"
              >
                {label}
              </Text>
            </IconProvider>
          ))}
        {isUploading ? (
          <View className="absolute inset-0 items-center justify-center">
            <Spinner aria-label={`Uploading ${label}`} />
          </View>
        ) : null}
      </View>
      {onRemove && !isUploading ? (
        <Pressable
          role="button"
          data-slot="chat-input-attachment-remove"
          aria-label={`Remove ${label}`}
          hitSlop={removeSlop}
          onPress={() => {
            feedback("tap")
            onRemove()
          }}
          className="cn-chat-input-attachment-remove absolute items-center justify-center"
        >
          <TextStyle className="cn-chat-input-attachment-remove-text">
            <XIcon aria-hidden size={parseNumber(removeIcon, 14)} />
          </TextStyle>
        </Pressable>
      ) : null}
    </Animated.View>
  )
}

// A mention's tint, by its sigil.
const MENTION_CLASSES: Record<ChatInputMentionTone, () => string> = {
  file: cva("cn-chat-input-mention cn-chat-input-mention-file"),
  skill: cva("cn-chat-input-mention cn-chat-input-mention-skill"),
  artifact: cva("cn-chat-input-mention cn-chat-input-mention-artifact"),
  card: cva("cn-chat-input-mention cn-chat-input-mention-card"),
  other: cva("cn-chat-input-mention cn-chat-input-mention-other"),
}

const chatInputMeasureVariants = cva("cn-chat-input-measure")

type ChatInputTextareaProps = Omit<
  React.ComponentProps<typeof TextInput>,
  "value" | "defaultValue" | "placeholder"
> & {
  /** The empty field's hint. A list takes turns, one phrase every few seconds. */
  placeholder?: string | readonly string[]
  /** Sigils, such as `["@", "/"]`, whose mentions are drawn tinted as you type. */
  mentions?: readonly string[]
  /** Which mentions to tint, such as the names of real skills. Default: all of them. */
  isKnownMention?: (mention: string) => boolean
  "aria-invalid"?: boolean
}

function ChatInputTextarea({
  className,
  ref,
  onChangeText,
  onSelectionChange,
  onFocus,
  onBlur,
  onSubmitEditing,
  onKeyPress,
  onLayout,
  placeholder = "",
  mentions,
  isKnownMention,
  "aria-label": ariaLabel = "Message",
  "aria-invalid": isInvalid = false,
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
    hasTools,
    recall,
    setCaret,
    setFocused,
    setInvalid,
    registerField,
    pendingCaret,
    clearPendingCaret,
    handleReturn,
    submit,
    stop,
  } = useChatInput("ChatInputTextarea")
  const composedRef = useComposedRefs(ref, registerField)
  const hint = useRotatingPlaceholder(
    typeof placeholder === "string" ? [placeholder] : placeholder,
    value === ""
  )
  const segments = React.useMemo(
    () =>
      mentions ? splitChatInputMentions(value, mentions, isKnownMention) : null,
    [mentions, value, isKnownMention]
  )
  const skillColor = useCSSVariable("--syntax-keyword")
  const skillTint = typeof skillColor === "string" ? skillColor : undefined
  const returnKey = getChatInputReturnKey(submitOn)
  const isPill = layout === "default"

  React.useEffect(() => {
    setInvalid(isInvalid)
  }, [isInvalid, setInvalid])

  // An empty draft never stacks (the shared rule's first case). Sending
  // clears the field without changing its layout, so no measurement would
  // ask again.
  React.useEffect(() => {
    if (value === "") setStacked(false)
  }, [value, setStacked])

  // A pick from a suggestion menu places the caret once its text is in,
  // then lets the field own its selection again.
  React.useEffect(() => {
    if (pendingCaret === null) return
    const frame = requestAnimationFrame(clearPendingCaret)
    return () => cancelAnimationFrame(frame)
  }, [pendingCaret, clearPendingCaret])

  // The pill's field stacks once the draft wraps beside its controls: the
  // field's height against one line's, and the draft's width on one line
  // (an unseen copy measures it) against the room the field had there.
  const measures = React.useRef({
    fieldWidth: 0,
    lineWidth: 0,
    oneLine: 0,
    inlineWidth: 0,
  })
  const lastFlip = React.useRef<string | null>(null)
  const decide = () => {
    if (!isPill) return
    const current = measures.current
    if (!isStacked) current.inlineWidth = current.fieldWidth
    if (current.oneLine === 0 || current.inlineWidth === 0) return
    const next = nextChatInputStacked({
      stacked: isStacked,
      value,
      // By width, not height: a Text and a TextInput give the same font
      // different line heights, so the one-line copy can't say how tall one
      // line of the field is. Both have the field's side padding.
      wraps:
        value.includes("\n") || current.lineWidth + 2 > current.inlineWidth,
      lineWidth: current.lineWidth,
      inlineWidth: current.inlineWidth,
    })
    if (next === isStacked) return
    // One flip per draft and width: a measurement that disagrees with itself
    // after the flip can never bounce the layout back and forth.
    const flip = `${current.inlineWidth}:${value}`
    if (lastFlip.current === flip) return
    lastFlip.current = flip
    setStacked(next)
  }

  return (
    <View
      data-slot="chat-input-field"
      data-layout={layout}
      data-stacked={isStacked}
      // In the pill's row it takes the room beside the controls; in the large
      // card's column a flex-1 would collapse it to nothing.
      className={cn(
        "cn-chat-input-field min-w-0",
        isPill ? "flex-1" : undefined
      )}
    >
      {isPill ? (
        <View
          aria-hidden
          pointerEvents="none"
          className="absolute start-0 top-0 w-[10000px] items-start opacity-0"
        >
          <Text
            numberOfLines={1}
            data-tools={hasTools}
            className={chatInputMeasureVariants()}
            onLayout={(event) => {
              measures.current.lineWidth = event.nativeEvent.layout.width
              measures.current.oneLine = event.nativeEvent.layout.height
              decide()
            }}
          >
            {value.split("\n")[0] || " "}
          </Text>
        </View>
      ) : null}
      <TextInput
        ref={composedRef}
        data-slot="chat-input-textarea"
        data-layout={layout}
        data-stacked={isStacked}
        data-tools={hasTools}
        data-invalid={isInvalid}
        aria-label={ariaLabel}
        aria-invalid={isInvalid}
        aria-disabled={disabled}
        editable={!disabled}
        multiline
        scrollEnabled
        textAlignVertical="top"
        placeholder={hint.text}
        placeholderTextColorClassName={
          hint.isFading ? "accent-transparent" : "accent-muted-foreground"
        }
        selectionColorClassName="accent-primary"
        returnKeyType={returnKey.returnKeyType}
        submitBehavior={returnKey.submitBehavior}
        enterKeyHint={submitOn === "enter" ? "send" : "enter"}
        selection={
          pendingCaret === null
            ? undefined
            : { start: pendingCaret, end: pendingCaret }
        }
        value={segments ? undefined : value}
        onChangeText={(text) => {
          onChangeText?.(text)
          setValue(text)
        }}
        onSelectionChange={(event) => {
          onSelectionChange?.(event)
          setCaret(event.nativeEvent.selection.start)
        }}
        onFocus={(event) => {
          onFocus?.(event)
          setFocused(true)
        }}
        onBlur={(event) => {
          onBlur?.(event)
          setFocused(false)
        }}
        onSubmitEditing={(event) => {
          onSubmitEditing?.(event)
          if (handleReturn()) return
          submit()
        }}
        onKeyPress={(event) => {
          onKeyPress?.(event)
          // A hardware keyboard's Escape stops a reply and ↑ in an empty
          // field recalls, where the platform reports those keys.
          const action = getChatInputKeyAction(
            {
              key: event.nativeEvent.key,
              shiftKey: false,
              metaKey: false,
              ctrlKey: false,
              altKey: false,
              isComposing: false,
            },
            { submitOn, isEmpty: value === "" }
          )
          if (action === "stop" && isBusy) stop()
          else if (action === "recall") recall?.()
        }}
        onLayout={(event) => {
          onLayout?.(event)
          measures.current.fieldWidth = event.nativeEvent.layout.width
          decide()
        }}
        className={cn(
          "cn-chat-input-textarea w-full min-w-0 bg-transparent",
          className
        )}
        {...props}
      >
        {segments
          ? segments.map((segment, index) =>
              segment.sigil ? (
                <Text
                  key={index}
                  data-slot="chat-input-mention"
                  data-sigil={segment.sigil}
                  className={MENTION_CLASSES[
                    getChatInputMentionTone(segment.sigil)
                  ]()}
                  style={
                    getChatInputMentionTone(segment.sigil) === "skill" &&
                    skillTint
                      ? {
                          color: skillTint,
                          backgroundColor: withChatInputAlpha(skillTint, 0.15),
                        }
                      : undefined
                  }
                >
                  {segment.text}
                </Text>
              ) : (
                <Text key={index} className="cn-chat-input-segment">
                  {segment.text}
                </Text>
              )
            )
          : null}
      </TextInput>
    </View>
  )
}

/** The row under the field in the large card. In the pill its two groups sit beside the field. */
function ChatInputFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="chat-input-footer"
      className={cn(
        "cn-chat-input-footer min-w-0 flex-row items-center",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

/** Controls at the start: add, attach, permissions, modes. */
function ChatInputTools({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { layout, isStacked } = useChatInput("ChatInputTools")
  return (
    <View
      data-slot="chat-input-tools"
      data-layout={layout}
      data-stacked={isStacked}
      className={cn(
        "cn-chat-input-tools min-w-0 shrink flex-row items-center",
        layout === "large" ? "me-auto" : undefined,
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

/** Controls at the end: the context meter, the model, the microphone, send. */
function ChatInputActions({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { layout, isStacked } = useChatInput("ChatInputActions")
  return (
    <View
      data-slot="chat-input-actions"
      data-layout={layout}
      data-stacked={isStacked}
      className={cn(
        "cn-chat-input-actions min-w-0 flex-row items-center",
        layout === "large" ? "ms-auto" : undefined,
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

type ChatInputButtonProps = React.ComponentProps<typeof Button>

const chatInputButtonTrayTextVariants = cva("cn-chat-input-button-text-tray")

// The pressed wash follows the button's corners where it sits.
const WASH_CLASSES = {
  pill: cva("cn-chat-input-button-wash cn-chat-input-button-wash-pill"),
  card: cva("cn-chat-input-button-wash"),
  tray: cva("cn-chat-input-button-wash cn-chat-input-button-wash-tray"),
}

/** A label beside the icon makes a pill, as the website's `has-[>span]`. */
function hasLabel(children: React.ReactNode) {
  return React.Children.toArray(children).some(
    (child) =>
      typeof child === "string" ||
      typeof child === "number" ||
      isPart(child, Text)
  )
}

/**
 * Where a footer button sits and its shape, for its size, corners and the
 * touch target around it: round in the pill, 32pt squares in the large card
 * and popovers, compact in a tray; a label makes it a pill. The website reads
 * these from its ancestors and children; React Native passes them as props.
 */
function useChatInputButtonPlace(
  size: ChatInputButtonProps["size"],
  isLabelled: boolean
) {
  const layout = React.use(ChatInputContext)?.layout
  const isTray = React.use(TrayContext)
  const [d24, d32, d36, icon14] = useCSSVariable([
    "--density-24",
    "--density-32",
    "--density-36",
    "--density-icon-14",
  ])
  const place = isTray ? "tray" : layout === "default" ? "pill" : "card"
  const shape = size !== "icon" ? "sized" : isLabelled ? "pill" : "square"
  const height =
    place === "tray"
      ? parseNumber(d24, 24)
      : place === "pill"
        ? parseNumber(d36, 36)
        : parseNumber(d32, 32)
  return {
    isTray,
    iconSize: parseNumber(icon14, 14),
    data: { "data-place": place, "data-shape": shape },
    washClassName: WASH_CLASSES[place](),
    // A size you pass keeps the Button's own height and touch target.
    hitSlop: shape === "sized" ? undefined : getTouchSlop(height),
  }
}

/**
 * A ghost button for the footer. Just an icon, it is square (round in the
 * pill); with a label it is a pill.
 */
function ChatInputButton({
  className,
  variant = "ghost",
  size = "icon",
  children,
  hitSlop,
  ...props
}: ChatInputButtonProps & {
  /** A toggle that's on holds the active fill, as the website's `aria-pressed`. */
  "data-pressed"?: boolean
}) {
  const place = useChatInputButtonPlace(size, hasLabel(children))
  return (
    <Button
      data-slot="chat-input-button"
      data-variant={variant}
      data-size={size}
      {...place.data}
      variant={variant}
      size={size}
      hitSlop={hitSlop ?? place.hitSlop}
      washClassName={place.washClassName}
      className={cn("cn-chat-input-button", className)}
      {...props}
    >
      <TextStyle
        className={place.isTray ? chatInputButtonTrayTextVariants() : undefined}
      >
        {place.isTray ? (
          <IconProvider size={place.iconSize}>
            {renderTextChildren(children)}
          </IconProvider>
        ) : (
          renderTextChildren(children)
        )}
      </TextStyle>
    </Button>
  )
}

/** One of the send slot's glyphs: they share a cell and trade places with a fade and a scale. */
function SubmitGlyph({
  isShown,
  scale = 1,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children"> & {
  isShown: boolean
  /** Its size while shown, as a share of its own. */
  scale?: number
  children?: React.ReactNode
}) {
  const motion = useMotion("feedback")
  const progress = useSharedValue(isShown ? 1 : 0)
  React.useEffect(() => {
    progress.set(
      withTiming(isShown ? 1 : 0, {
        duration: motion.isOff ? 0 : motion.enterMs,
        easing: motion.feedbackEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [isShown, motion, progress])
  const isStill = motion.isReduced
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: isStill ? scale : (0.5 + progress.value * 0.5) * scale },
    ],
  }))
  return (
    <Animated.View
      aria-hidden
      pointerEvents="none"
      className={cn("absolute items-center justify-center", className)}
      style={style}
      {...props}
    >
      {children}
    </Animated.View>
  )
}

// Nothing to send, or an upload on its way: the glyph is muted on the
// secondary fill.
const chatInputSubmitMutedVariants = cva("cn-chat-input-submit-text-muted")

/** The stop square is filled with the button's text colour. */
function StopSquare() {
  const inherited = React.use(TextClassContext)
  const { color } = useResolveClassNames(inherited ?? "")
  const size = parseNumber(useCSSVariable("--density-icon-14"), 14)
  const fill = typeof color === "string" ? color : undefined
  return <SquareIcon size={size} fill={fill} />
}

/**
 * The send slot. Empty with voice chat available, it starts voice chat (and
 * ends it while it's on); with a draft it sends, or queues while a reply
 * runs; while a reply streams into an empty input it's a stop square, and
 * spins while one is on its way that it can't stop.
 */
function ChatInputSubmit({
  className,
  children,
  variant,
  size = "icon",
  onPress,
  hitSlop,
  "aria-label": ariaLabel,
  ...props
}: ChatInputButtonProps) {
  const {
    layout,
    sendAction,
    disabled,
    isVoiceActive,
    setVoiceActive,
    submit,
    stop,
  } = useChatInput("ChatInputSubmit")
  const place = useChatInputButtonPlace(size, false)
  const isVoiceEnd = sendAction === "voice" && isVoiceActive
  const label = ariaLabel ?? getChatInputSendLabel(sendAction, isVoiceActive)
  const resolvedVariant =
    variant ?? (isChatInputSendLit(sendAction) ? "default" : "secondary")
  const isDisabled = disabled || isChatInputSendDisabled(sendAction)
  const icon = parseNumber(useCSSVariable("--density-icon-16"), 16)

  return (
    <Button
      data-slot="chat-input-submit"
      data-state={sendAction}
      data-voice={isVoiceEnd}
      data-variant={resolvedVariant}
      data-size={size}
      {...place.data}
      data-sound={
        sendAction === "voice"
          ? isVoiceActive
            ? "unlatch"
            : "latch"
          : undefined
      }
      variant={resolvedVariant}
      size={size}
      disabled={isDisabled}
      aria-label={label}
      aria-busy={sendAction === "busy" || sendAction === "uploading"}
      aria-selected={sendAction === "voice" ? isVoiceActive : undefined}
      hitSlop={hitSlop ?? place.hitSlop}
      washClassName={place.washClassName}
      onPress={(event: GestureResponderEvent) => {
        onPress?.(event)
        if (event.defaultPrevented) return
        if (sendAction === "stop") stop()
        else if (sendAction === "voice") setVoiceActive(!isVoiceActive)
        else submit()
      }}
      className={cn("cn-chat-input-submit", className)}
      {...props}
    >
      {children ?? (
        <TextStyle
          className={
            sendAction === "idle" || sendAction === "uploading"
              ? chatInputSubmitMutedVariants()
              : undefined
          }
        >
          <View
            className="items-center justify-center"
            style={{ width: icon, height: icon }}
          >
            <SubmitGlyph
              data-slot="chat-input-submit-send"
              isShown={
                sendAction === "send" ||
                sendAction === "queue" ||
                sendAction === "idle" ||
                sendAction === "uploading"
              }
              className="cn-chat-input-submit-send"
            >
              <IconProvider strokeWidth={2}>
                <ArrowUpIcon />
              </IconProvider>
            </SubmitGlyph>
            <SubmitGlyph
              data-slot="chat-input-submit-voice"
              isShown={sendAction === "voice" && !isVoiceActive}
              className="cn-chat-input-submit-voice"
            >
              <AudioLinesIcon />
            </SubmitGlyph>
            <SubmitGlyph
              data-slot="chat-input-submit-end"
              isShown={isVoiceEnd}
              className="cn-chat-input-submit-end"
            >
              <XIcon />
            </SubmitGlyph>
            <SubmitGlyph
              data-slot="chat-input-submit-spinner"
              isShown={sendAction === "busy"}
              className="cn-chat-input-submit-spinner"
            >
              <Spinner aria-hidden size={icon} />
            </SubmitGlyph>
            <SubmitGlyph
              data-slot="chat-input-submit-stop"
              isShown={sendAction === "stop"}
              scale={0.75}
              className="cn-chat-input-submit-stop"
            >
              <StopSquare />
            </SubmitGlyph>
          </View>
        </TextStyle>
      )}
    </Button>
  )
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
  hitSlop,
  "aria-label": ariaLabel,
  ...props
}: Omit<ChatInputButtonProps, "children"> & {
  /** What the microphone is doing. */
  activity: ChatInputMicActivity
}) {
  const { isVoiceActive, voiceLevel } = useChatInput("ChatInputMic")
  const place = useChatInputButtonPlace(size, false)
  const motion = useMotion("feedback")
  const isLive =
    isChatInputMicLive(activity) && !motion.isReduced && !motion.isOff
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isLive ? 1 + voiceLevel.value * MIC_SWELL : 1 }],
  }))
  if (!isVoiceActive) return null
  const label = ariaLabel ?? getChatInputMicLabel(activity)

  return (
    <Button
      data-slot="chat-input-mic"
      data-activity={activity}
      data-variant={variant}
      data-size={size}
      {...place.data}
      data-sound={
        activity === "speaking"
          ? undefined
          : activity === "muted"
            ? "unlatch"
            : "latch"
      }
      variant={variant}
      size={size}
      aria-label={label}
      aria-selected={activity === "muted"}
      hitSlop={hitSlop ?? place.hitSlop}
      washClassName={place.washClassName}
      className={cn("cn-chat-input-button cn-chat-input-mic", className)}
      {...props}
    >
      <Animated.View
        aria-hidden
        className="cn-chat-input-mic-icon items-center justify-center"
        style={iconStyle}
      >
        {activity === "transcribing" ? (
          <Spinner aria-hidden />
        ) : activity === "speaking" ? (
          <AudioLinesIcon />
        ) : activity === "muted" ? (
          <MicOffIcon />
        ) : (
          <MicIcon />
        )}
      </Animated.View>
    </Button>
  )
}

// The ring's colour for how full the context is.
const RING_CLASSES = {
  calm: cva(
    "cn-chat-input-context-meter-ring cn-chat-input-context-meter-ring-calm"
  ),
  high: cva(
    "cn-chat-input-context-meter-ring cn-chat-input-context-meter-ring-high"
  ),
  full: cva(
    "cn-chat-input-context-meter-ring cn-chat-input-context-meter-ring-full"
  ),
}

const chatInputContextMeterTrackVariants = cva(
  "cn-chat-input-context-meter-track"
)

// The ring in the website's 14-unit viewBox.
const RING_RADIUS = 5.25
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

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
  hitSlop,
  "aria-label": ariaLabel,
  ...props
}: Omit<ChatInputButtonProps, "value" | "children"> & {
  /** How full the context is, 0 to 1. */
  value: number
  /** The reading beside the ring, hidden in a narrow input. Default: the percentage. */
  label?: React.ReactNode
}) {
  const isNarrow = React.use(ChatInputContext)?.isNarrow ?? false
  const isLabelled = !isNarrow
  const place = useChatInputButtonPlace(size, isLabelled)
  const fraction = Math.min(1, Math.max(0, value))
  const percent = `${Math.round(fraction * 100)}%`
  const level = getChatInputContextLevel(fraction)
  const ring = useResolveClassNames(RING_CLASSES[level]()).color
  const track = useResolveClassNames(chatInputContextMeterTrackVariants()).color
  const ringSize = parseNumber(useCSSVariable("--density-icon-14"), 14)

  return (
    <Button
      data-slot="chat-input-context-meter"
      data-level={level}
      data-variant={variant}
      data-size={size}
      {...place.data}
      variant={variant}
      size={size}
      aria-label={ariaLabel ?? `Context ${percent} used`}
      hitSlop={hitSlop ?? place.hitSlop}
      washClassName={place.washClassName}
      className={cn(
        "cn-chat-input-button cn-chat-input-context-meter",
        className
      )}
      {...props}
    >
      {isLabelled ? (
        <Text className="cn-chat-input-context-meter-label">
          {label ?? percent}
        </Text>
      ) : null}
      <Svg
        width={ringSize}
        height={ringSize}
        viewBox="0 0 14 14"
        aria-hidden
        data-slot="chat-input-context-meter-ring"
        style={{ transform: [{ rotate: "-90deg" }] }}
      >
        <Circle
          cx="7"
          cy="7"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="1.75"
          stroke={typeof track === "string" ? track : undefined}
        />
        <Circle
          cx="7"
          cy="7"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="1.75"
          strokeLinecap="round"
          stroke={typeof ring === "string" ? ring : undefined}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - fraction)}
        />
      </Svg>
    </Button>
  )
}

type ChatInputOptionsContextValue = {
  value: string | undefined
  select: (value: string) => void
}

const ChatInputOptionsContext =
  React.createContext<ChatInputOptionsContextValue | null>(null)

/**
 * A set of choices with a line of explanation each, such as what the agent
 * may do without asking: a radio group that goes in a popover from a footer
 * pill. One option is in use and checked.
 */
function ChatInputOptions({
  className,
  value: valueProp,
  defaultValue,
  onValueChange,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  children?: React.ReactNode
  /** The option in use. Controlled. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
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
    <ChatInputOptionsContext value={context}>
      <View
        role="radiogroup"
        data-slot="chat-input-options"
        className={cn("cn-chat-input-options flex-col", className)}
        {...props}
      >
        {children}
      </View>
    </ChatInputOptionsContext>
  )
}

const chatInputOptionTextVariants = cva("cn-chat-input-option-text")
const chatInputOptionCheckedTextVariants = cva(
  "cn-chat-input-option-text cn-chat-input-option-text-checked"
)

const chatInputOptionWashVariants = cva("cn-chat-input-option-wash")

/** One choice: its icon, label and description, and a check while it's in use. */
function ChatInputOption({
  className,
  value,
  label,
  description,
  icon,
  onPress,
  onPressIn,
  onPressOut,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  value: string
  label: React.ReactNode
  /** A line under the label on what the option does. */
  description?: React.ReactNode
  icon?: React.ReactNode
}) {
  const context = React.use(ChatInputOptionsContext)
  const feedback = useFeedback()
  const press = usePressScale()
  const checkSize = parseNumber(useCSSVariable("--density-icon-14"), 14)
  if (!context)
    throw new ChatInputContextError("ChatInputOption> in <ChatInputOptions")
  const isChecked = context.value === value

  return (
    <Pressable
      role="radio"
      aria-checked={isChecked}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      data-slot="chat-input-option"
      data-value={value}
      data-checked={isChecked}
      onPressIn={(event) => {
        press.onPressIn()
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        press.onPressOut()
        onPressOut?.(event)
      }}
      onPress={(event) => {
        feedback("pick")
        context.select(value)
        onPress?.(event)
      }}
      className={cn(
        "cn-chat-input-option relative w-full flex-row items-start disabled:opacity-50",
        className
      )}
      {...props}
    >
      <PressWash press={press} className={chatInputOptionWashVariants()} />
      <TextStyle
        eases
        className={
          isChecked
            ? chatInputOptionCheckedTextVariants()
            : chatInputOptionTextVariants()
        }
      >
        <IconProvider strokeWidth={1.5}>
          {icon ? (
            <View aria-hidden className="cn-chat-input-option-icon shrink-0">
              {icon}
            </View>
          ) : null}
          <View className="min-w-0 flex-1">
            {typeof label === "string" ? (
              <Text className="cn-chat-input-option-label">{label}</Text>
            ) : (
              label
            )}
            {typeof description === "string" ? (
              <Text className="cn-chat-input-option-description">
                {description}
              </Text>
            ) : (
              description
            )}
          </View>
          <View
            aria-hidden
            data-slot="chat-input-option-check"
            data-checked={isChecked}
            className="cn-chat-input-option-check shrink-0"
          >
            <CheckIcon size={checkSize} />
          </View>
        </IconProvider>
      </TextStyle>
    </Pressable>
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

const chatInputCommandsListVariants = cva("cn-chat-input-commands-list-content")

const chatInputCommandTextVariants = cva("cn-chat-input-command-text")
const chatInputCommandLitTextVariants = cva(
  "cn-chat-input-command-text cn-chat-input-command-text-lit"
)

const COMMAND_NAME_CLASSES = {
  command: cva("cn-chat-input-command-name cn-chat-input-command-name-command"),
  skill: cva("cn-chat-input-command-name cn-chat-input-command-name-skill"),
}

/**
 * The suggestion menu for a sigil typed in the field, such as `/` for
 * commands and skills: it opens over the card as you type the sigil at the
 * start or after a space, filters by what follows, and writes the pick into
 * the draft. A tap picks a row; the return key picks the first.
 */
function ChatInputCommands({
  className,
  sigil = "/",
  commands,
  onRun,
  title = "Commands and skills",
  emptyText = "No matching commands.",
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  /** What opens the menu. Default `/`. */
  sigil?: string
  commands: readonly ChatInputCommand[]
  /** A command with `runs`: it's taken out of the draft and handed here. */
  onRun?: (command: ChatInputCommand) => void
  /** The menu's name and heading. */
  title?: string
  /** Shown when nothing matches what's typed. */
  emptyText?: React.ReactNode
}) {
  const { value, caret, isFocused, replaceValue, registerReturn } =
    useChatInput("ChatInputCommands")
  const feedback = useFeedback()
  const id = React.useId()
  const [dismissed, setDismissed] = React.useState<string | null>(null)
  const surface = useSurfaceAnimation("popup", { side: "top" })
  const skillColor = useCSSVariable("--syntax-keyword")
  const dismissSlop = getTouchSlop(
    parseNumber(useCSSVariable("--density-24"), 24)
  )

  const trigger = findChatInputTrigger(value, caret, [sigil])
  const dismissKey = trigger ? `${trigger.start}:${value}` : null
  const isOpen = Boolean(trigger) && isFocused && dismissKey !== dismissed
  const matches = trigger
    ? filterChatInputCommands(commands, trigger.query)
    : []

  const pick = (command: ChatInputCommand, at: ChatInputTrigger) => {
    feedback("pick")
    if (command.runs) {
      const next = applyChatInputPick(value, at, "")
      replaceValue(next.text, next.caret)
      onRun?.(command)
      return
    }
    const next = applyChatInputPick(value, at, `${sigil}${command.value}`)
    replaceValue(next.text, next.caret)
  }

  const handleReturn = () => {
    const first = matches[0]
    if (!isOpen || !trigger || !first) return false
    pick(first, trigger)
    return true
  }
  const handleReturnRef = useLatest(handleReturn)
  React.useEffect(
    () => registerReturn(id, () => handleReturnRef.current()),
    [registerReturn, id, handleReturnRef]
  )

  if (!isOpen || !trigger) return null

  return (
    <Animated.View
      role="dialog"
      aria-label={title}
      entering={surface.entering}
      exiting={surface.exiting}
      data-slot="chat-input-commands"
      className={cn(
        "cn-chat-input-commands absolute inset-x-0 bottom-full z-50 flex-col overflow-hidden",
        className
      )}
      style={surface.origin}
      {...props}
    >
      <View
        data-slot="chat-input-commands-header"
        className="cn-chat-input-commands-header flex-row items-center justify-between"
      >
        <Text className="cn-chat-input-commands-title">{title}</Text>
        <Pressable
          role="button"
          aria-label="Dismiss"
          hitSlop={dismissSlop}
          onPress={() => {
            feedback("dismiss")
            setDismissed(dismissKey)
          }}
          className="cn-chat-input-commands-hint items-center justify-center"
        >
          <TextStyle className="cn-chat-input-commands-hint-text">
            <XIcon aria-hidden />
          </TextStyle>
        </Pressable>
      </View>
      {matches.length === 0 ? (
        <Text className="cn-chat-input-commands-empty">{emptyText}</Text>
      ) : (
        <FluidHoverScrollList
          role="list"
          aria-label={title}
          nestedScrollEnabled
          className="cn-chat-input-commands-list grow-0"
          contentContainerClassName={chatInputCommandsListVariants()}
        >
          {matches.map((command, index) => (
            <ChatInputCommandRow
              key={command.value}
              command={command}
              sigil={sigil}
              isActive={index === 0}
              skillColor={
                typeof skillColor === "string" ? skillColor : undefined
              }
              onPick={() => pick(command, trigger)}
            />
          ))}
        </FluidHoverScrollList>
      )}
    </Animated.View>
  )
}

function ChatInputCommandRow({
  command,
  sigil,
  isActive,
  skillColor,
  onPick,
}: {
  command: ChatInputCommand
  sigil: string
  /** The row the return key picks. */
  isActive: boolean
  skillColor: string | undefined
  onPick: () => void
}) {
  const kind = command.kind ?? "command"
  const { isLit, rowProps } = useFluidRow({ onActivate: onPick })
  return (
    <Pressable
      role="option"
      aria-selected={isActive}
      data-slot="chat-input-command"
      data-kind={kind}
      data-active={isActive}
      data-lit={isLit}
      onPress={onPick}
      className="cn-chat-input-command relative flex-row items-center"
      {...rowProps}
    >
      <TextStyle
        eases
        className={
          isLit
            ? chatInputCommandLitTextVariants()
            : chatInputCommandTextVariants()
        }
      >
        <IconProvider strokeWidth={isLit ? 2 : 1.5}>
          {command.icon ? (
            <View aria-hidden className="cn-chat-input-command-icon shrink-0">
              {kind === "skill" && skillColor ? (
                <IconProvider color={skillColor}>{command.icon}</IconProvider>
              ) : (
                command.icon
              )}
            </View>
          ) : null}
          <Text
            numberOfLines={1}
            className={COMMAND_NAME_CLASSES[kind]()}
            style={
              kind === "skill" && skillColor ? { color: skillColor } : undefined
            }
          >
            {sigil}
            {command.value}
          </Text>
          {command.description ? (
            <Text
              numberOfLines={1}
              className="cn-chat-input-command-description min-w-0 flex-1"
            >
              {command.description}
            </Text>
          ) : (
            <View className="flex-1" />
          )}
          {command.badge ? (
            <View className="cn-chat-input-command-badge shrink-0">
              <Text className="cn-chat-input-command-badge-text">
                {command.badge}
              </Text>
            </View>
          ) : null}
        </IconProvider>
      </TextStyle>
    </Pressable>
  )
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
}: React.ComponentProps<typeof View> & {
  /**
   * How far back it sits: 1 just behind the card (queued messages), 2
   * behind that (background work), 3 furthest back (a goal). Each is inset
   * a little more, so a stack of trays steps back from the card.
   */
  level?: 1 | 2 | 3
}) {
  const enter = useSurfaceAnimation("move", { translateY: 8 })
  return (
    <TrayContext value={true}>
      <Animated.View
        entering={enter.entering}
        data-slot="chat-input-tray"
        data-level={level}
        className={cn("cn-chat-input-tray relative min-w-0", className)}
        {...props}
      >
        {children}
      </Animated.View>
    </TrayContext>
  )
}

type ChatInputTrayEntryContextValue = {
  isOpen: boolean
  setOpen: (open: boolean) => void
}

const ChatInputTrayEntryContext =
  React.createContext<ChatInputTrayEntryContextValue | null>(null)

function useChatInputTrayEntry(part: string) {
  const context = React.use(ChatInputTrayEntryContext)
  if (!context)
    throw new ChatInputContextError(`${part}> in <ChatInputTrayEntry`)
  return context
}

/** A tray row that opens to more: a goal's reason, a task's output. */
function ChatInputTrayEntry({
  className,
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [isOpen, setOpen] = useControllable(openProp, defaultOpen, onOpenChange)
  const context = React.useMemo(() => ({ isOpen, setOpen }), [isOpen, setOpen])
  return (
    <ChatInputTrayEntryContext value={context}>
      <View
        data-slot="chat-input-tray-entry"
        data-open={isOpen}
        className={cn("cn-chat-input-tray-entry min-w-0", className)}
        {...props}
      >
        {children}
      </View>
    </ChatInputTrayEntryContext>
  )
}

/** One row: an icon, its text, then actions such as Steer or Stop. */
function ChatInputTrayItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const muted = useResolveClassNames("text-muted-foreground").color
  const hasTrigger = React.Children.toArray(children).some((child) =>
    isPart(child, ChatInputTrayTrigger)
  )
  return (
    <View
      data-slot="chat-input-tray-item"
      data-trigger={hasTrigger}
      className={cn(
        "cn-chat-input-tray-item min-w-0 flex-row items-center",
        className
      )}
      {...props}
    >
      <TextStyle className="cn-chat-input-tray-item-text">
        <IconProvider
          strokeWidth={1.5}
          {...(typeof muted === "string" ? { color: muted } : {})}
        >
          {renderTextChildren(children)}
        </IconProvider>
      </TextStyle>
    </View>
  )
}

const chatInputTrayTriggerWashVariants = cva("cn-chat-input-tray-trigger-wash")

/** The text of a row inside a `ChatInputTrayEntry`: a button that opens its content. */
function ChatInputTrayTrigger({
  className,
  children,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  children?: React.ReactNode
}) {
  const { isOpen, setOpen } = useChatInputTrayEntry("ChatInputTrayTrigger")
  const feedback = useFeedback()
  const press = usePressScale()
  const motion = useMotion("feedback")
  const turn = useSharedValue(isOpen ? 1 : 0)
  React.useEffect(() => {
    turn.set(
      withTiming(isOpen ? 1 : 0, {
        duration: motion.isOff ? 0 : motion.enterMs,
        easing: motion.feedbackEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [isOpen, motion, turn])
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value * 180}deg` }],
  }))
  const chevronSize = parseNumber(useCSSVariable("--density-icon-14"), 14)
  return (
    <Pressable
      role="button"
      data-slot="chat-input-tray-trigger"
      aria-expanded={isOpen}
      onPressIn={(event) => {
        press.onPressIn()
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        press.onPressOut()
        onPressOut?.(event)
      }}
      onPress={(event) => {
        feedback(isOpen ? "collapse" : "expand")
        setOpen(!isOpen)
        onPress?.(event)
      }}
      className={cn(
        "cn-chat-input-tray-trigger relative h-full min-w-0 flex-1 flex-row items-center",
        className
      )}
      {...props}
    >
      <PressWash press={press} className={chatInputTrayTriggerWashVariants()} />
      {renderTextChildren(children)}
      <Animated.View
        aria-hidden
        data-slot="chat-input-tray-chevron"
        className="cn-chat-input-tray-chevron shrink-0"
        style={chevronStyle}
      >
        <ChevronDownIcon size={chevronSize} />
      </Animated.View>
    </Pressable>
  )
}

/** What a `ChatInputTrayEntry` opens to. */
function ChatInputTrayContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const { isOpen } = useChatInputTrayEntry("ChatInputTrayContent")
  const enter = useSurfaceAnimation("disclosure")
  if (!isOpen) return null
  return (
    <Animated.View
      entering={enter.entering}
      data-slot="chat-input-tray-content"
      className={cn("cn-chat-input-tray-content", className)}
      {...props}
    >
      <TextStyle className="cn-chat-input-tray-content-text">
        {renderTextChildren(children)}
      </TextStyle>
    </Animated.View>
  )
}

/** A quiet reading at the end of a row's text: how long it has run, a goal's status. */
function ChatInputTrayMeta({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="chat-input-tray-meta"
      numberOfLines={1}
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
  type ChatInputFile,
}
