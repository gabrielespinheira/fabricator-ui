import * as React from "react"
import {
  useAccessibilityFocus,
  useEffectEvent as useLatestCallback,
} from "@rn-primitives/hooks"
import { Portal } from "@rn-primitives/portal"
import { cn } from "cn"
import {
  BackHandler,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type ViewProps,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { scheduleOnRN } from "react-native-worklets"

import { useSurfaceFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import {
  getClosedOffset,
  getDismissDuration,
  getDragOffset,
  getSwipeAxis,
  shouldDismissSheet,
  type SheetSide,
} from "@/registry/native/lib/sheet-model"
import { DensityScope, useDensity } from "@/registry/native/ui/density"

// A finger travels this far along the sheet's axis before the swipe starts, or
// across it before the swipe gives way to whatever is underneath.
const SWIPE_SLOP = 12

type SlotProps = ViewProps & { "data-slot"?: string }

type SheetSurfaceContextValue = {
  onOverlayPress: () => void
  overlayStyle: React.ComponentProps<typeof Animated.View>["style"]
  pan: ReturnType<typeof Gesture.Pan>
}

const SheetSurfaceContext =
  React.createContext<SheetSurfaceContextValue | null>(null)

/**
 * The scrim. Its opacity follows the panel, so it fades as the sheet is swiped
 * away. SheetSurface renders one when it isn't given its own `overlay`.
 */
function SheetSurfaceOverlay({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  const surface = React.use(SheetSurfaceContext)
  return (
    <Animated.View
      data-slot="sheet-surface-overlay"
      className={cn("cn-sheet-surface-overlay absolute inset-0", className)}
      style={[surface?.overlayStyle, style]}
      {...props}
    >
      <Pressable
        accessible={false}
        className="flex-1"
        onPress={surface?.onOverlayPress}
      />
    </Animated.View>
  )
}

/**
 * A ScrollView for inside a sheet. Dragging it scrolls instead of swiping the
 * sheet away; a swipe still works from everything around it.
 */
function SheetSurfaceScrollView(
  props: React.ComponentProps<typeof ScrollView>
) {
  const pan = React.use(SheetSurfaceContext)?.pan
  const native = React.useMemo(() => {
    const gesture = Gesture.Native()
    return pan ? gesture.blocksExternalGesture(pan) : gesture
  }, [pan])
  return (
    <GestureDetector gesture={native}>
      <ScrollView
        data-slot="sheet-surface-scroll-view"
        alwaysBounceVertical={false}
        keyboardShouldPersistTaps="handled"
        {...props}
      />
    </GestureDetector>
  )
}

type SheetSurfaceProps = Omit<
  React.ComponentProps<typeof Animated.View>,
  "children"
> & {
  /** Whether the sheet is showing. It stays mounted until it has slid out. */
  open: boolean
  /** Asks to close, from a swipe, the scrim or Android back. */
  onOpenChange: (open: boolean) => void
  /** The edge it attaches to and swipes away toward. */
  side?: SheetSide
  /** Swipe and scrim press. Android back always closes, as Escape does on web. */
  dismissible?: boolean
  /** With a scrim, hiding the page from screen readers. */
  modal?: boolean
  /** Replaces the default scrim. Use SheetSurfaceOverlay inside it. */
  overlay?: React.ReactNode
  /** A named PortalHost, instead of FabricatorRoot's. */
  hostName?: string
  /** On the outermost portalled view. */
  rootProps?: SlotProps
  /** On the keyboard-avoiding view the panel sits in. */
  viewportProps?: SlotProps
  children?: React.ReactNode
}

function SheetPanel({
  open,
  onOpenChange,
  onExited,
  side,
  dismissible,
  modal,
  overlay,
  rootProps,
  viewportProps,
  className,
  style,
  children,
  ...props
}: Omit<SheetSurfaceProps, "hostName" | "side" | "dismissible" | "modal"> & {
  onExited: () => void
  side: SheetSide
  dismissible: boolean
  modal: boolean
}) {
  const { isReduced, enterMs, exitMs, drawerEasing } = useMotion("sheet")
  const windowSize = useWindowDimensions()
  const axis = getSwipeAxis(side)
  const offset = useSharedValue(
    getClosedOffset(side, axis === "y" ? windowSize.height : windowSize.width)
  )
  // Reduce Motion keeps the fade and drops the travel.
  const fade = useSharedValue(isReduced ? 0 : 1)
  const size = useSharedValue(0)
  const isMeasured = React.useRef(false)
  const isSwipeExit = React.useRef(false)
  const hasExited = React.useRef(false)
  const focusRef =
    useAccessibilityFocus<React.ComponentRef<typeof Animated.View>>(open)

  const requestClose = useLatestCallback(() => onOpenChange(false))
  const handleExitEnd = useLatestCallback(() => {
    hasExited.current = true
    if (!open) onExited()
  })

  const enter = React.useCallback(() => {
    hasExited.current = false
    const config = {
      duration: enterMs,
      easing: drawerEasing,
      reduceMotion: ReduceMotion.Never,
    }
    if (isReduced) {
      offset.value = 0
      fade.value = withTiming(1, config)
      return
    }
    fade.value = 1
    offset.value = withTiming(0, config)
  }, [drawerEasing, enterMs, fade, isReduced, offset])

  const exit = React.useCallback(
    (duration: number) => {
      "worklet"
      const config = {
        duration,
        easing: drawerEasing,
        reduceMotion: ReduceMotion.Never,
      }
      const onDone = (finished?: boolean) => {
        "worklet"
        if (finished) scheduleOnRN(handleExitEnd)
      }
      if (isReduced) {
        fade.value = withTiming(0, config, onDone)
        return
      }
      offset.value = withTiming(
        getClosedOffset(side, size.value),
        config,
        onDone
      )
    },
    [drawerEasing, fade, handleExitEnd, isReduced, offset, side, size]
  )

  // A controlled parent can refuse a swipe: a frame later it's still open, so
  // the sheet goes back.
  const settleAfterSwipe = useLatestCallback(() => {
    if (!open) return
    isSwipeExit.current = false
    enter()
  })
  const handleSwipeDismiss = useLatestCallback(() => {
    isSwipeExit.current = true
    onOpenChange(false)
    requestAnimationFrame(settleAfterSwipe)
  })

  React.useEffect(() => {
    if (!isMeasured.current) {
      if (!open) onExited()
      return
    }
    if (open) {
      enter()
      return
    }
    if (isSwipeExit.current) {
      // Already on its way out. With motion off it may have landed already.
      isSwipeExit.current = false
      if (hasExited.current) onExited()
      return
    }
    exit(exitMs)
  }, [enter, exit, exitMs, onExited, open])

  React.useEffect(() => {
    if (!open) return
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        requestClose()
        return true
      }
    )
    return () => subscription.remove()
  }, [open, requestClose])

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout
    const measured = axis === "y" ? height : width
    size.value = measured
    if (isMeasured.current || measured === 0) return
    isMeasured.current = true
    if (!open) {
      onExited()
      return
    }
    offset.value = getClosedOffset(side, measured)
    enter()
  }

  const pan = React.useMemo(() => {
    const slop: [number, number] = [-SWIPE_SLOP, SWIPE_SLOP]
    const gesture = Gesture.Pan().enabled(dismissible)
    const onAxis =
      axis === "y"
        ? gesture.activeOffsetY(slop).failOffsetX(slop)
        : gesture.activeOffsetX(slop).failOffsetY(slop)
    return onAxis
      .onUpdate((event) => {
        "worklet"
        offset.value = getDragOffset(
          side,
          axis === "y" ? event.translationY : event.translationX
        )
      })
      .onEnd((event, success) => {
        "worklet"
        const translation =
          axis === "y" ? event.translationY : event.translationX
        const velocity = axis === "y" ? event.velocityY : event.velocityX
        if (
          !success ||
          !shouldDismissSheet({ side, size: size.value, translation, velocity })
        ) {
          offset.value = withTiming(0, {
            duration: exitMs,
            easing: drawerEasing,
          })
          return
        }
        exit(
          getDismissDuration({
            remaining: Math.abs(
              getClosedOffset(side, size.value) - offset.value
            ),
            velocity: Math.abs(velocity),
            duration: exitMs,
          })
        )
        scheduleOnRN(handleSwipeDismiss)
      })
  }, [
    axis,
    dismissible,
    drawerEasing,
    exit,
    exitMs,
    handleSwipeDismiss,
    offset,
    side,
    size,
  ])

  const panelStyle = useAnimatedStyle(() => ({
    opacity: fade.value,
    transform:
      axis === "y"
        ? [{ translateY: offset.value }]
        : [{ translateX: offset.value }],
  }))
  const overlayStyle = useAnimatedStyle(() => {
    const travelled =
      size.value > 0 ? Math.min(Math.abs(offset.value) / size.value, 1) : 1
    return { opacity: fade.value * (1 - travelled) }
  })

  const context = React.useMemo(
    () => ({
      onOverlayPress: () => {
        if (dismissible) requestClose()
      },
      overlayStyle,
      pan,
    }),
    [dismissible, overlayStyle, pan, requestClose]
  )

  return (
    <SheetSurfaceContext value={context}>
      <View
        data-slot="sheet-surface"
        aria-modal={modal}
        pointerEvents={open ? "box-none" : "none"}
        className="absolute inset-0"
        onAccessibilityEscape={requestClose}
        {...rootProps}
      >
        {modal ? (overlay ?? <SheetSurfaceOverlay />) : null}
        <KeyboardAvoidingView
          data-slot="sheet-surface-viewport"
          data-side={side}
          behavior="padding"
          pointerEvents="box-none"
          className="cn-sheet-surface-viewport flex-1"
          {...viewportProps}
        >
          <GestureDetector gesture={pan}>
            <Animated.View
              ref={focusRef}
              data-slot="sheet-surface-panel"
              data-side={side}
              role="dialog"
              className={cn("cn-sheet-surface-panel", className)}
              style={[panelStyle, style]}
              onLayout={handleLayout}
              {...props}
            >
              {children}
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </View>
    </SheetSurfaceContext>
  )
}

/**
 * A panel that slides in from one edge over a scrim: swipe to dismiss with
 * velocity, Android back, screen reader modal, safe areas and keyboard avoidance.
 * Portals to the root and keeps the nearest density. Portals leave the React tree,
 * so anything inside that reads a context has to get it from inside `children`.
 */
function SheetSurface({
  open,
  side = "bottom",
  dismissible = true,
  modal = true,
  hostName,
  ...props
}: SheetSurfaceProps) {
  const density = useDensity()
  const name = React.useId()
  useSurfaceFeedback("panel", open)
  const [isMounted, setIsMounted] = React.useState(open)
  if (open && !isMounted) setIsMounted(true)
  const handleExited = React.useCallback(() => setIsMounted(false), [])
  if (!isMounted) return null
  return (
    <Portal name={name} hostName={hostName}>
      <DensityScope key={name} density={density}>
        <SheetPanel
          open={open}
          onExited={handleExited}
          side={side}
          dismissible={dismissible}
          modal={modal}
          {...props}
        />
      </DensityScope>
    </Portal>
  )
}

export { SheetSurface, SheetSurfaceOverlay, SheetSurfaceScrollView }
