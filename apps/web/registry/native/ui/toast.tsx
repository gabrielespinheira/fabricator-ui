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
import { AccessibilityInfo, Pressable, View } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { useMotion, useSurfaceAnimation } from "@/registry/native/lib/motion"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import {
  createToastStore,
  getToastStack,
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
  return (
    <Portal name={name}>
      <ToastManagerContext value={manager}>
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

type StackEntry = ReturnType<typeof getToastStack>[number] & { zIndex: number }

const FRONT: StackEntry = {
  translateY: 0,
  scale: 1,
  opacity: 1,
  isBehind: false,
  height: undefined,
  zIndex: 0,
}

const ToastStackContext = React.createContext<{
  entries: ReadonlyMap<string, StackEntry>
  canExpand: boolean
  isExpanded: boolean
  toggleExpanded: () => void
}>({
  entries: new Map(),
  canExpand: false,
  isExpanded: false,
  toggleExpanded: () => {},
})

function ToastViewport({
  className,
  expanded = false,
  gap = 12,
  peek = 12,
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
  const [isOpened, setIsOpened] = React.useState(false)
  const canExpand = toasts.length > 1 && !expanded

  React.useEffect(() => {
    if (!canExpand) setIsOpened(false)
  }, [canExpand])

  // An open stack is being read: nothing should close under the reader.
  React.useEffect(() => {
    if (!isOpened) return
    manager.pause()
    return () => manager.resume()
  }, [isOpened, manager])

  const isExpanded = expanded || isOpened
  const stack = React.useMemo(() => {
    const entries = getToastStack(toasts, {
      expanded: isExpanded,
      gap,
      peek,
      limit: manager.getLimit(),
    })
    return {
      entries: new Map(
        toasts.map((item, index) => [
          item.id,
          { ...(entries[index] ?? FRONT), zIndex: toasts.length - index },
        ])
      ),
      canExpand,
      isExpanded,
      toggleExpanded: () => setIsOpened((current) => !current),
    }
  }, [canExpand, gap, isExpanded, manager, peek, toasts])

  return (
    <ToastStackContext value={stack}>
      <View
        data-slot="toast-viewport"
        accessibilityLabel="Notifications"
        pointerEvents="box-none"
        className={cn(
          "top-safe-offset-2 absolute inset-x-4 z-50 max-w-sm sm:right-4 sm:left-auto sm:w-full",
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
} | null>(null)

// Past either of these a swipe dismisses, in points and points per second.
const SWIPE_DISTANCE = 56
const SWIPE_VELOCITY = 600
const OFF_SCREEN = 600

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
  const { entries, canExpand, toggleExpanded, isExpanded } =
    React.use(ToastStackContext)
  const entry = entries.get(item.id) ?? FRONT
  const motion = useMotion("toast")
  const { entering, exiting } = useSurfaceAnimation("toast", {
    scale: 1,
    translateY: -24,
  })

  const stackY = useSharedValue(entry.translateY)
  const stackScale = useSharedValue(entry.scale)
  const stackOpacity = useSharedValue(entry.opacity)
  const swipeX = useSharedValue(0)
  const swipeY = useSharedValue(0)

  React.useEffect(() => {
    const timing = { duration: motion.enterMs, easing: motion.enterEasing }
    stackY.value = withTiming(entry.translateY, timing)
    stackScale.value = withTiming(entry.scale, timing)
    stackOpacity.value = withTiming(entry.opacity, timing)
  }, [
    entry.opacity,
    entry.scale,
    entry.translateY,
    motion.enterEasing,
    motion.enterMs,
    stackOpacity,
    stackScale,
    stackY,
  ])

  const stackStyle = useAnimatedStyle(() => ({
    opacity: stackOpacity.value,
    transform: [
      { translateX: swipeX.value },
      { translateY: stackY.value + swipeY.value },
      { scale: stackScale.value },
    ],
  }))

  const { close, pause, resume } = manager
  const pan = React.useMemo(() => {
    const exit = { duration: motion.exitMs, easing: motion.exitEasing }
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
        runOnJS(pause)()
      })
      .onUpdate((event) => {
        // A direction it can't leave by still gives a little under the finger.
        swipeX.value =
          event.translationX * (allowsX(event.translationX) ? 1 : 0.2)
        swipeY.value =
          event.translationY * (allowsY(event.translationY) ? 1 : 0.2)
      })
      .onEnd((event) => {
        const leavesX =
          allowsX(event.translationX) &&
          (Math.abs(event.translationX) > SWIPE_DISTANCE ||
            Math.abs(event.velocityX) > SWIPE_VELOCITY)
        const leavesY =
          allowsY(event.translationY) &&
          (Math.abs(event.translationY) > SWIPE_DISTANCE ||
            Math.abs(event.velocityY) > SWIPE_VELOCITY)
        if (leavesX) {
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
        if (!isExpanded) runOnJS(resume)()
      })
  }, [
    close,
    isExpanded,
    item.id,
    motion.exitEasing,
    motion.exitMs,
    pause,
    resume,
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
    () => ({ item, isBehind: entry.isBehind }),
    [entry.isBehind, item]
  )

  return (
    <ToastContext value={context}>
      <Animated.View
        entering={entering}
        exiting={exiting}
        pointerEvents="box-none"
        className="absolute inset-x-0 top-0"
        style={{ zIndex: entry.zIndex }}
      >
        <GestureDetector gesture={pan}>
          <Animated.View
            data-slot="toast"
            data-type={item.type}
            data-behind={entry.isBehind}
            data-limited={Boolean(item.limited)}
            role="alert"
            aria-live={item.priority === "high" ? "assertive" : "polite"}
            aria-hidden={entry.isBehind}
            pointerEvents={item.limited ? "none" : "auto"}
            className={cn("cn-toast w-full overflow-hidden", className)}
            style={[
              entry.height === undefined ? undefined : { height: entry.height },
              stackStyle,
              style,
            ]}
            {...props}
          >
            <TextStyle className="cn-toast-text">
              <Pressable
                accessible={false}
                disabled={!canExpand}
                onPress={toggleExpanded}
              >
                {renderTextChildren(children)}
              </Pressable>
            </TextStyle>
          </Animated.View>
        </GestureDetector>
      </Animated.View>
    </ToastContext>
  )
}

function ToastContent({
  className,
  children,
  onLayout,
  ...props
}: React.ComponentProps<typeof View>) {
  const manager = useToastStore()
  const context = React.use(ToastContext)
  return (
    <View
      data-slot="toast-content"
      data-behind={context?.isBehind ?? false}
      // Its own height: a toast behind is cut to the height of the one in front.
      onLayout={(event) => {
        if (context) {
          manager.setHeight(context.item.id, event.nativeEvent.layout.height)
        }
        onLayout?.(event)
      }}
      className={cn(
        "flex-row items-center gap-3 overflow-hidden p-4 data-[behind=true]:opacity-0",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
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
    <Text
      data-slot="toast-title"
      className={cn("cn-toast-title", className)}
      {...props}
    >
      {content}
    </Text>
  )
}

function ToastDescription({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Text>) {
  const content = children ?? React.use(ToastContext)?.item.description
  if (content === undefined || content === null) return null
  return (
    <Text
      data-slot="toast-description"
      className={cn("cn-toast-description", className)}
      {...props}
    >
      {content}
    </Text>
  )
}

function ToastAction({
  className,
  render = <Button variant="outline" size="sm" />,
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
      className: cn("shrink-0", action?.className, className),
      ...props,
    },
    content
  )
}

function ToastClose({
  className,
  children,
  render = <Button variant="ghost" size="icon-sm" />,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  Pick<RenderProps, "render"> & { children?: React.ReactNode }) {
  const manager = useToastStore()
  const id = React.use(ToastContext)?.item.id
  return renderSlot(
    { render },
    {
      "data-slot": "toast-close",
      accessibilityLabel: "Close toast",
      className: cn("shrink-0", className),
      onPress: (event: Parameters<NonNullable<typeof onPress>>[0]) => {
        manager.close(id)
        onPress?.(event)
      },
      ...props,
    },
    children ?? <XIcon aria-hidden />
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

function ToastIcon({ type }: { type: string | undefined }) {
  let icon: React.ReactNode = null

  if (type === "success") {
    icon = (
      <TextStyle className="cn-toast-icon-success">
        <CircleCheckIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "info") {
    icon = (
      <TextStyle className="cn-toast-icon-info">
        <InfoIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "warning") {
    icon = (
      <TextStyle className="cn-toast-icon-warning">
        <TriangleAlertIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "error") {
    icon = (
      <TextStyle className="cn-toast-icon-error">
        <OctagonXIcon aria-hidden />
      </TextStyle>
    )
  }

  if (type === "loading") {
    icon = <ToastSpinner />
  }

  if (!icon) {
    return null
  }

  return (
    <View data-slot="toast-icon" className="shrink-0">
      {icon}
    </View>
  )
}

function ToastList() {
  const { toasts } = useToastManager()

  return toasts.map((toastItem) => (
    <Toast key={toastItem.id} toast={toastItem}>
      <ToastContent>
        <ToastIcon type={toastItem.type} />
        <View className="min-w-0 flex-1 flex-col gap-1">
          <ToastTitle />
          <ToastDescription />
        </View>
        <ToastAction />
        <ToastClose />
      </ToastContent>
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
  ToastClose,
  ToastContent,
  ToastDescription,
  ToastIcon,
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
