import * as React from "react"
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
  XIcon,
} from "@fabricator-ui/icons-react-native"
import { Portal } from "@rn-primitives/portal"
import { cn } from "cn"
import {
  AccessibilityInfo,
  Pressable,
  useWindowDimensions,
  View,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  ReduceMotion,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  getToastStack,
  TOAST_GAP,
  TOAST_INSET,
  TOAST_PEEK,
  type ToastPlacement,
} from "@/registry/fabricator/shared/lib/toast-stack-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion, useSurfaceAnimation } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import {
  getStackSizes,
  getToastFeedback,
} from "@/registry/native/lib/toast-model"
import {
  createToastStore,
  type ToastObject,
  type ToastStore,
} from "@/registry/native/lib/toast-store"
import { Button } from "@/registry/native/ui/button"
import { DensityScope, useDensity } from "@/registry/native/ui/density"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// Base UI's toast parts over the same manager API. On a phone the stack sits at
// the top of the screen, below the safe area, and swipes away with a finger.

type ToastActionProps = Omit<
  React.ComponentProps<typeof Button>,
  "render" | "asChild"
>
type ToastManager = ToastStore<unknown, ToastActionProps>
type ToastItem = ToastObject<unknown, ToastActionProps>
type SwipeDirection = "up" | "down" | "left" | "right"

function createToastManager(): ToastManager {
  return createToastStore<unknown, ToastActionProps>()
}

const toast = createToastManager()

const ToastManagerContext = React.createContext<ToastManager | null>(null)

function useToastStore() {
  const manager = React.use(ToastManagerContext)
  if (!manager) {
    throw new Error("Toast parts must be used within a <ToastProvider />")
  }
  return manager
}

function useToastManager() {
  const manager = useToastStore()
  const toasts = React.useSyncExternalStore(
    manager.subscribe,
    manager.getToasts
  )
  return {
    toasts,
    add: manager.add,
    close: manager.close,
    update: manager.update,
    promise: manager.promise,
  }
}

function ToastProvider({
  children,
  timeout,
  limit,
  toastManager,
}: {
  children?: React.ReactNode
  timeout?: number
  limit?: number
  toastManager?: ToastManager
}) {
  const [ownManager] = React.useState(createToastManager)
  const manager = toastManager ?? ownManager
  React.useLayoutEffect(() => {
    manager.configure({ timeout, limit })
  }, [limit, manager, timeout])
  return <ToastManagerContext value={manager}>{children}</ToastManagerContext>
}

function ToastPortal({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const manager = useToastStore()
  const density = useDensity()
  const name = React.useId()
  // The host lists its portals by position: without a key, a dialog closing under
  // this one would remount every toast, and each would chime again.
  return (
    <Portal name={name}>
      <ToastManagerContext key={name} value={manager}>
        <DensityScope density={density}>
          <View
            data-slot="toast-portal"
            pointerEvents="box-none"
            className={cn("absolute inset-0", className)}
            {...props}
          >
            {children}
          </View>
        </DensityScope>
      </ToastManagerContext>
    </Portal>
  )
}

type StackEntry = {
  /** Nothing until the stack's first toast is laid out. */
  placement: ToastPlacement | undefined
  isVisible: boolean
  zIndex: number
}

const ALONE: StackEntry = { placement: undefined, isVisible: true, zIndex: 0 }

const ToastStackContext = React.createContext<{
  entries: ReadonlyMap<string, StackEntry>
  canExpand: boolean
  isExpanded: boolean
  /** Opens the stack, which pauses the timers until it closes again. */
  toggleExpanded: () => void
  /** Restarts the timers a touch paused, unless the stack it opened holds them. */
  releaseTimers: () => void
  maxWidth: number
  isCentered: boolean
}>({
  entries: new Map(),
  canExpand: false,
  isExpanded: false,
  isOpened: false,
  maxWidth: 0,
  isCentered: true,
  toggleExpanded: () => {},
})

// The width, in text sizes, past which a toast wraps, and the space it leaves
// beside it, as on the website.
const MAX_WIDTH_IN_TEXT = 27
const SCREEN_MARGIN = 32
// Where a toast moves from the middle of the screen to its end (`sm`).
const END_ALIGNED_MIN_WIDTH = 640

function ToastViewport({
  className,
  expanded = false,
  gap = TOAST_GAP,
  peek = TOAST_PEEK,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  /** Keeps the stack open instead of opening when pressed. */
  expanded?: boolean
  /** Space between toasts while open. */
  gap?: number
  /** How far each toast behind shows under the one in front. */
  peek?: number
}) {
  const manager = useToastStore()
  const { toasts } = useToastManager()
  const { width: windowWidth } = useWindowDimensions()
  const textSize = parseNumber(useCSSVariable("--density-text-13"), 13)
  const [isOpened, setIsOpened] = React.useState(false)
  // A press opens the stack before its touch lets go of the timers.
  const isOpenedRef = React.useRef(false)
  const setOpened = React.useCallback((next: boolean) => {
    isOpenedRef.current = next
    setIsOpened(next)
  }, [])
  const releaseTimers = React.useCallback(() => {
    if (!isOpenedRef.current) manager.resume()
  }, [manager])
  const canExpand = toasts.length > 1 && !expanded

  React.useEffect(() => {
    if (!canExpand) setOpened(false)
  }, [canExpand, setOpened])

  // An open stack is being read: nothing should close under the reader.
  React.useEffect(() => {
    if (!isOpened) return
    manager.pause()
    return () => manager.resume()
  }, [isOpened, manager])

  const isExpanded = expanded || isOpened
  const stack = React.useMemo(() => {
    const placements = getToastStack(getStackSizes(toasts), {
      isExpanded,
      gap,
      peek,
      inset: TOAST_INSET,
    })
    const limit = manager.getLimit()
    return {
      entries: new Map(
        toasts.map((item, index) => [
          item.id,
          {
            placement: placements[index],
            isVisible: index < limit,
            zIndex: toasts.length - index,
          },
        ])
      ),
      canExpand,
      isExpanded,
      toggleExpanded: () => setOpened(!isOpened),
      releaseTimers,
      maxWidth: Math.min(
        textSize * MAX_WIDTH_IN_TEXT,
        windowWidth - SCREEN_MARGIN
      ),
      isCentered: windowWidth < END_ALIGNED_MIN_WIDTH,
    }
  }, [
    canExpand,
    gap,
    isExpanded,
    isOpened,
    manager,
    peek,
    releaseTimers,
    setOpened,
    textSize,
    toasts,
    windowWidth,
  ])

  return (
    <ToastStackContext value={stack}>
      <View
        data-slot="toast-viewport"
        accessibilityLabel="Notifications"
        pointerEvents="box-none"
        className={cn(
          "top-safe-offset-2 absolute inset-x-4 z-50 sm:right-4 sm:left-auto sm:w-full sm:max-w-sm",
          className
        )}
        {...props}
      >
        {children}
      </View>
    </ToastStackContext>
  )
}

const ToastContext = React.createContext<{
  item: ToastItem
  isBehind: boolean
  /** Its text ran into its line limit, so a press shows the rest. */
  noteClamped: () => void
  isClamped: boolean
} | null>(null)

// Past either of these a swipe dismisses, in points and points per second.
const SWIPE_DISTANCE = 40
const SWIPE_VELOCITY = 600
const OFF_SCREEN = 600
// Where a toast comes from: just past the top edge. It fades and grows in.
const ENTER_TRAVEL = -64

const DEFAULT_SWIPE: readonly SwipeDirection[] = ["up", "left", "right"]

function Toast({
  className,
  toast: item,
  swipeDirection = DEFAULT_SWIPE,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & {
  toast: ToastItem
  /** Which ways it can be swiped away. Empty keeps it in place. */
  swipeDirection?: readonly SwipeDirection[]
}) {
  const manager = useToastStore()
  const { entries, isCentered, releaseTimers } = React.use(ToastStackContext)
  const { placement, isVisible, zIndex } = entries.get(item.id) ?? ALONE
  // Until it's laid out, its size is the one it covers: it waits for its own.
  const width = item.size && placement?.width
  const height = item.size && placement?.height
  const motion = useMotion("toast")
  const enterScale = parseNumber(useCSSVariable("--motion-popup-scale"), 1)
  const { entering, exiting } = useSurfaceAnimation("toast", {
    scale: enterScale,
    translateY: ENTER_TRAVEL,
  })
  const feedback = useFeedback()
  const [isClamped, setIsClamped] = React.useState(false)
  const noteClamped = React.useCallback(() => setIsClamped(true), [])

  const boxWidth = useSharedValue(width)
  const boxHeight = useSharedValue(height)
  const stackX = useSharedValue(0)
  const stackY = useSharedValue(placement?.offset ?? 0)
  const stackOpacity = useSharedValue(isVisible ? 1 : 0)
  const swipeX = useSharedValue(0)
  const swipeY = useSharedValue(0)
  const swipeAxis = useSharedValue<"x" | "y" | null>(null)

  // Once per type: a loading toast plays as it settles, and an update that keeps
  // its type stays quiet.
  React.useEffect(() => {
    const sound = getToastFeedback(item.type)
    if (sound) feedback(sound)
  }, [feedback, item.type])

  // As on the website: place, size and opacity on the toast's timing. Its first
  // size is the one it already has on screen, so that takes no animation.
  const isBehind = placement?.isBehind ?? false
  const translateX = isCentered ? 0 : -(placement?.inset ?? 0)
  const translateY = placement?.offset ?? 0
  React.useEffect(() => {
    const timing = {
      duration: motion.enterMs,
      easing: motion.enterEasing,
      reduceMotion: ReduceMotion.Never,
    }
    stackOpacity.value = withTiming(isVisible ? 1 : 0, timing)
    const isFirstSize = boxWidth.value === undefined
    if (motion.isReduced || isFirstSize) {
      stackX.value = translateX
      stackY.value = translateY
      boxWidth.value = width
      boxHeight.value = height
      return
    }
    stackX.value = withTiming(translateX, timing)
    stackY.value = withTiming(translateY, timing)
    if (width === undefined || height === undefined) return
    boxWidth.value = withTiming(width, timing)
    boxHeight.value = withTiming(height, timing)
  }, [
    boxHeight,
    boxWidth,
    height,
    isVisible,
    motion.enterEasing,
    motion.enterMs,
    motion.isReduced,
    stackOpacity,
    stackX,
    stackY,
    translateX,
    translateY,
    width,
  ])

  const stackStyle = useAnimatedStyle(() => ({
    width: boxWidth.value ?? 0,
    height: boxHeight.value ?? 0,
    opacity: boxWidth.value === undefined ? 0 : stackOpacity.value,
    transform: [
      { translateX: stackX.value + swipeX.value },
      { translateY: stackY.value + swipeY.value },
    ],
  }))

  const { close, pause } = manager
  const pan = React.useMemo(() => {
    const exit = {
      duration: motion.exitMs,
      easing: motion.exitEasing,
      reduceMotion: ReduceMotion.Never,
    }
    const { isReduced } = motion
    const allowsX = (delta: number) => {
      "worklet"
      return swipeDirection.includes(delta < 0 ? "left" : "right")
    }
    const allowsY = (delta: number) => {
      "worklet"
      return swipeDirection.includes(delta < 0 ? "up" : "down")
    }
    const closeToast = (isFinished?: boolean) => {
      "worklet"
      if (isFinished) runOnJS(close)(item.id)
    }
    return Gesture.Pan()
      .enabled(swipeDirection.length > 0)
      .activeOffsetX([-10, 10])
      .activeOffsetY([-10, 10])
      .onBegin(() => {
        swipeAxis.value = null
        runOnJS(pause)()
      })
      .onUpdate((event) => {
        // The first move picks the axis, so a toast never drifts diagonally.
        swipeAxis.value ??=
          Math.abs(event.translationX) > Math.abs(event.translationY)
            ? "x"
            : "y"
        // A direction it can't leave by still gives a little under the finger.
        if (swipeAxis.value === "x") {
          swipeX.value =
            event.translationX * (allowsX(event.translationX) ? 1 : 0.2)
        } else {
          swipeY.value =
            event.translationY * (allowsY(event.translationY) ? 1 : 0.2)
        }
      })
      .onEnd((event) => {
        const leavesX =
          swipeAxis.value === "x" &&
          allowsX(event.translationX) &&
          (Math.abs(event.translationX) > SWIPE_DISTANCE ||
            Math.abs(event.velocityX) > SWIPE_VELOCITY)
        const leavesY =
          swipeAxis.value === "y" &&
          allowsY(event.translationY) &&
          (Math.abs(event.translationY) > SWIPE_DISTANCE ||
            Math.abs(event.velocityY) > SWIPE_VELOCITY)
        if (isReduced && (leavesX || leavesY)) {
          // Reduce Motion keeps the fade and drops the travel.
          stackOpacity.value = withTiming(0, exit, closeToast)
        } else if (leavesX) {
          swipeX.value = withTiming(
            Math.sign(event.translationX) * OFF_SCREEN,
            exit,
            closeToast
          )
        } else if (leavesY) {
          swipeY.value = withTiming(
            Math.sign(event.translationY) * OFF_SCREEN,
            exit,
            closeToast
          )
        } else {
          swipeX.value = withTiming(0, exit)
          swipeY.value = withTiming(0, exit)
        }
      })
      .onFinalize(() => {
        runOnJS(releaseTimers)()
      })
  }, [
    close,
    item.id,
    motion.exitEasing,
    motion.exitMs,
    motion.isReduced,
    pause,
    releaseTimers,
    stackOpacity,
    swipeDirection,
    swipeX,
    swipeY,
  ])

  // VoiceOver doesn't follow live regions the way TalkBack does.
  const { title, description, updateKey } = item
  React.useEffect(() => {
    const announcement = [title, description]
      .filter((part) => typeof part === "string")
      .join(". ")
    if (announcement) AccessibilityInfo.announceForAccessibility(announcement)
  }, [description, title, updateKey])

  const context = React.useMemo(
    () => ({ item, isBehind, isClamped, noteClamped }),
    [isBehind, isClamped, item, noteClamped]
  )

  return (
    <ToastContext value={context}>
      <Animated.View
        entering={entering}
        exiting={exiting}
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0 items-center sm:items-end"
        style={{ zIndex }}
      >
        <GestureDetector gesture={pan}>
          <Animated.View
            data-slot="toast"
            data-type={item.type}
            data-behind={isBehind}
            data-limited={Boolean(item.limited)}
            role="alert"
            aria-live={item.priority === "high" ? "assertive" : "polite"}
            aria-hidden={isBehind}
            pointerEvents={item.limited ? "none" : "auto"}
            className={cn("cn-toast", className)}
            style={[stackStyle, style]}
            {...props}
          >
            <TextStyle className="cn-toast-text">
              {renderTextChildren(children)}
            </TextStyle>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </ToastContext>
  )
}

/** Fades what a covered toast hides. */
function useBehindFade() {
  const isBehind = React.use(ToastContext)?.isBehind ?? false
  const motion = useMotion("feedback")
  const fade = useSharedValue(isBehind ? 0 : 1)
  React.useEffect(() => {
    fade.value = withTiming(isBehind ? 0 : 1, {
      duration: motion.enterMs,
      easing: motion.feedbackEasing,
    })
  }, [fade, isBehind, motion.enterMs, motion.feedbackEasing])
  const style = useAnimatedStyle(() => ({ opacity: fade.value }))
  return { isBehind, style }
}

// Laid out at its natural size, whatever the toast around it is cut to: that's
// the size the toast grows to, and its text never wraps again on the way.
function ToastContent({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View>) {
  const manager = useToastStore()
  const toastContext = React.use(ToastContext)
  const { canExpand, toggleExpanded, maxWidth } = React.use(ToastStackContext)
  const { isBehind, style: fadeStyle } = useBehindFade()
  const id = toastContext?.item.id
  return (
    <View
      pointerEvents="box-none"
      className="cn-toast-clip absolute inset-0 overflow-hidden"
    >
      <View
        pointerEvents="box-none"
        className="absolute top-0 left-0"
        style={{ width: maxWidth }}
      >
        <Pressable
          accessible={false}
          disabled={!canExpand && !toastContext?.isClamped}
          onPress={toggleExpanded}
          className="self-start"
          onLayout={({ nativeEvent: { layout } }) => {
            if (id === undefined) return
            manager.setSize(id, { width: layout.width, height: layout.height })
          }}
        >
          <Animated.View
            data-slot="toast-content"
            data-behind={isBehind}
            className={cn("cn-toast-content flex-row items-center", className)}
            style={[fadeStyle, style]}
            {...props}
          >
            {renderTextChildren(children)}
          </Animated.View>
        </Pressable>
      </View>
    </View>
  )
}

/** Text cut to a number of lines until the stack is open. */
function ClampedText({
  lines,
  ...props
}: React.ComponentProps<typeof Text> & { lines: number }) {
  const toastContext = React.use(ToastContext)
  const { isExpanded } = React.use(ToastStackContext)
  return (
    <Text
      numberOfLines={isExpanded ? undefined : lines}
      onTextLayout={({ nativeEvent }) => {
        if (nativeEvent.lines.length >= lines) toastContext?.noteClamped()
      }}
      {...props}
    />
  )
}

function ToastTitle({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  const content = children ?? React.use(ToastContext)?.item.title
  if (content === undefined || content === null) return null
  return (
    <ClampedText
      lines={2}
      data-slot="toast-title"
      className={cn("cn-toast-title", className)}
      {...props}
    >
      {content}
    </ClampedText>
  )
}

function ToastDescription({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  const item = React.use(ToastContext)?.item
  const content = children ?? item?.description
  if (content === undefined || content === null) return null
  return (
    <ClampedText
      lines={3}
      data-slot="toast-description"
      // On its own it is the message, so it takes the foreground.
      data-alone={item?.title === undefined || item.title === null}
      className={cn("cn-toast-description", className)}
      {...props}
    >
      {content}
    </ClampedText>
  )
}

function ToastAction({
  className,
  render = <Button variant="secondary" size="sm" />,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  Pick<RenderProps, "render"> & { children?: React.ReactNode }) {
  const action = React.use(ToastContext)?.item.actionProps
  const content = children ?? action?.children
  if (content === undefined || content === null) return null
  return renderSlot(
    { render },
    {
      "data-slot": "toast-action",
      ...action,
      className: cn("cn-toast-action shrink-0", action?.className, className),
      ...props,
    },
    content
  )
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-xs" />,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  Pick<RenderProps, "render"> & { children?: React.ReactNode }) {
  const manager = useToastStore()
  const id = React.use(ToastContext)?.item.id
  const { isBehind, style } = useBehindFade()
  return (
    <Animated.View
      pointerEvents={isBehind ? "none" : "box-none"}
      className="cn-toast-close-corner absolute"
      style={style}
    >
      {renderSlot(
        { render },
        {
          "data-slot": "toast-close",
          accessibilityLabel: "Close toast",
          className: cn("cn-toast-close shrink-0", className),
          onPress: (event: Parameters<NonNullable<typeof onPress>>[0]) => {
            manager.close(id)
            onPress?.(event)
          },
          ...props,
        },
        children ?? <XIcon aria-hidden />
      )}
    </Animated.View>
  )
}

function ToastSpinner() {
  const motion = useMotion("sheet")
  const rotation = useSharedValue(0)
  const shouldSpin = !motion.isOff && !motion.isReduced
  // One turn takes as long as the website's animate-spin at the default speed.
  const duration = motion.enterMs * 2.5
  React.useEffect(() => {
    if (!shouldSpin) return
    rotation.value = withRepeat(
      withTiming(360, { duration, easing: Easing.linear }),
      -1
    )
    return () => {
      cancelAnimation(rotation)
      rotation.value = 0
    }
  }, [duration, rotation, shouldSpin])
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))
  return (
    <Animated.View style={style}>
      <Loader2Icon aria-hidden />
    </Animated.View>
  )
}

function getTypeIcon(type: string | undefined): React.ReactNode {
  if (type === "success") {
    return (
      <TextStyle className="cn-toast-icon-success">
        <CircleCheckIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "info") {
    return (
      <TextStyle className="cn-toast-icon-info">
        <InfoIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "warning") {
    return (
      <TextStyle className="cn-toast-icon-warning">
        <TriangleAlertIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "error") {
    return (
      <TextStyle className="cn-toast-icon-error">
        <OctagonXIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "loading") return <ToastSpinner />

  return null
}

/** Fades its content in when the toast changes type, as it changes size. */
function ToastSwap({
  className,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  const item = React.use(ToastContext)?.item
  const motion = useMotion("move")
  const isSettled = item !== undefined && item.updateKey > 0 && !motion.isOff
  return (
    <Animated.View
      key={item?.type}
      entering={
        isSettled
          ? FadeIn.duration(motion.enterMs).reduceMotion(ReduceMotion.Never)
          : undefined
      }
      className={className}
      {...props}
    />
  )
}

function ToastIcon({
  type,
  icon = getTypeIcon(type),
}: {
  type: string | undefined
  /** Shown instead of the type's icon. `null` shows none. */
  icon?: React.ReactNode
}) {
  if (!icon) {
    return null
  }

  return (
    <ToastSwap data-slot="toast-icon" className="cn-toast-icon shrink-0">
      {icon}
    </ToastSwap>
  )
}

type ToastData = {
  /** Shown instead of the type's icon. `null` shows none. */
  icon?: React.ReactNode
}

function isToastData(data: unknown): data is ToastData {
  return typeof data === "object" && data !== null
}

/** The text, and its actions beside it, or under it when they don't fit. */
function ToastBody({ className, ...props }: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="toast-body"
      className={cn(
        "cn-toast-body shrink flex-row flex-wrap items-center",
        className
      )}
      {...props}
    />
  )
}

function ToastMessage({
  className,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  return (
    <ToastSwap
      data-slot="toast-message"
      className={cn("cn-toast-message shrink flex-col", className)}
      {...props}
    />
  )
}

function ToastList() {
  const { toasts } = useToastManager()

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon
          type={toastItem.type}
          icon={isToastData(toastItem.data) ? toastItem.data.icon : undefined}
        />
        <ToastBody>
          <ToastMessage>
            <ToastTitle />
            <ToastDescription />
          </ToastMessage>
          <ToastAction />
        </ToastBody>
      </ToastContent>
      <ToastClose />
    </Toast>
  ))
}

function ToastHost() {
  const { toasts } = useToastManager()
  // Portals stack in the order they mount, so this one mounts with its first
  // toast: that puts it over any dialog already open.
  if (toasts.length === 0) return null
  return (
    <ToastPortal>
      <ToastViewport>
        <ToastList />
      </ToastViewport>
    </ToastPortal>
  )
}

function Toaster({
  children,
  toastManager = toast,
  ...props
}: React.ComponentProps<typeof ToastProvider>) {
  return (
    <ToastProvider toastManager={toastManager} {...props}>
      {children}
      <ToastHost />
    </ToastProvider>
  )
}

export {
  Toaster,
  Toast,
  ToastAction,
  ToastBody,
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastIcon,
  ToastMessage,
  ToastPortal,
  ToastProvider,
  ToastTitle,
  ToastViewport,
  createToastManager,
  toast,
  useToastManager,
  type ToastItem,
  type ToastManager,
}
