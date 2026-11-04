// Fluid hover on touch: one highlight that glides to the pressed row, and a
// selection background that slides between selected rows. The website finds
// rows by selector; React Native has none, so each row spreads `getItemProps`.
import * as React from "react"
import { cn } from "cn"
import type { LayoutChangeEvent } from "react-native"
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from "react-native-reanimated"

import {
  sameRect,
  shouldGlide,
  type Rect,
} from "@/registry/native/lib/fluid-hover-model"
import { useMotion } from "@/registry/native/lib/motion"

type Overlay = { rect: Rect | null; animate: boolean }

export type FluidHoverOptions = {
  /** The key of the row that gets the sliding selection background. */
  selected?: string
  /** Rows that are never lit. */
  disabled?: string[]
}

export function useFluidHover({
  selected,
  disabled = [],
}: FluidHoverOptions = {}) {
  const [rows, setRows] = React.useState<Record<string, Rect>>({})
  const [lit, setLit] = React.useState<string | null>(null)

  const getItemProps = React.useCallback(
    (key: string) => ({
      onLayout: (event: LayoutChangeEvent) => {
        const { x, y, width, height } = event.nativeEvent.layout
        const rect = { top: y, left: x, width, height }
        setRows((current) =>
          sameRect(current[key] ?? null, rect)
            ? current
            : { ...current, [key]: rect }
        )
      },
      onPressIn: () => {
        if (!disabled.includes(key)) setLit(key)
      },
      onPressOut: () => setLit(null),
      onHoverIn: () => {
        if (!disabled.includes(key)) setLit(key)
      },
      onHoverOut: () => setLit(null),
    }),
    [disabled]
  )

  const litRect = lit ? (rows[lit] ?? null) : null
  const selectedRect = selected ? (rows[selected] ?? null) : null
  const previousLit = usePreviousRect(litRect)
  const previousSelected = usePreviousRect(selectedRect)
  const hover: Overlay = {
    rect: litRect,
    animate: shouldGlide(previousLit, litRect),
  }
  const selection: Overlay = {
    rect: selectedRect,
    animate: shouldGlide(previousSelected, selectedRect),
  }

  return { getItemProps, hover, selection }
}

/** The rect before this one, so a highlight knows where it's gliding from. */
function usePreviousRect(rect: Rect | null) {
  const [history, setHistory] = React.useState<{
    current: Rect | null
    previous: Rect | null
  }>({ current: rect, previous: null })
  if (sameRect(history.current, rect)) return history.previous
  setHistory({ current: rect, previous: history.current })
  return history.current
}

function FluidHoverOverlay({
  overlay,
  timing,
  className,
  style,
  ...props
}: {
  overlay: Overlay
  timing: "glide" | "move"
} & React.ComponentProps<typeof Animated.View>) {
  const motion = useMotion(timing)
  const { rect, animate } = overlay
  const duration = animate ? motion.enterMs : 0
  const easing = motion.enterEasing
  const opacity = useDerivedValue(() =>
    withTiming(rect ? 1 : 0, { duration: rect ? 0 : motion.exitMs })
  )
  const top = useDerivedValue(() =>
    rect ? withTiming(rect.top, { duration, easing }) : 0
  )
  const left = useDerivedValue(() =>
    rect ? withTiming(rect.left, { duration, easing }) : 0
  )
  const width = useDerivedValue(() =>
    rect ? withTiming(rect.width, { duration, easing }) : 0
  )
  const height = useDerivedValue(() =>
    rect ? withTiming(rect.height, { duration, easing }) : 0
  )
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    width: width.value,
    height: height.value,
    transform: [{ translateX: left.value }, { translateY: top.value }],
  }))
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={cn("absolute top-0 left-0", className)}
      style={[animatedStyle, style]}
      {...props}
    />
  )
}

/** The hover highlight. Render it as the first child of the container. */
function FluidHoverHighlight({
  hover,
  className,
  ...props
}: { hover: Overlay } & React.ComponentProps<typeof Animated.View>) {
  return (
    <FluidHoverOverlay
      overlay={hover}
      timing="glide"
      data-slot="fluid-hover-highlight"
      className={cn("cn-fluid-hover-highlight", className)}
      {...props}
    />
  )
}

/** The selection background. Render it before the highlight. */
function FluidHoverSelection({
  selection,
  className,
  ...props
}: { selection: Overlay } & React.ComponentProps<typeof Animated.View>) {
  return (
    <FluidHoverOverlay
      overlay={selection}
      timing="move"
      data-slot="fluid-hover-selection"
      className={cn("cn-fluid-hover-selection", className)}
      {...props}
    />
  )
}

export { FluidHoverHighlight, FluidHoverSelection }
