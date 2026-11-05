import * as React from "react"
import { cn } from "cn"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"

import { useMotion } from "@/registry/native/lib/motion"

/**
 * The pressed fill, as a layer under a control's content. An `active:` class can
 * only snap; this eases in and out on the feedback timing, as the website's
 * pressed step does. Render it as the Pressable's first child.
 */
function PressWash({
  press,
  className,
}: {
  press: { progress: SharedValue<number> }
  className?: string
}) {
  const style = useAnimatedStyle(() => ({ opacity: press.progress.value }))
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={cn("absolute inset-0", className)}
      style={style}
    />
  )
}

/**
 * A fill that follows a control's state, as a layer under its content: a class can
 * only snap, and the website eases fills on the feedback timing. Reduce Motion
 * keeps the fade. Render it as the Pressable's first child.
 */
function StateFill({
  isOn,
  className,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children"> & {
  isOn: boolean
}) {
  const motion = useMotion("feedback")
  const progress = useSharedValue(isOn ? 1 : 0)
  React.useEffect(() => {
    progress.set(
      withTiming(isOn ? 1 : 0, {
        duration: motion.enterMs,
        easing: motion.feedbackEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [isOn, motion.enterMs, motion.feedbackEasing, progress])
  const style = useAnimatedStyle(() => ({ opacity: progress.value }))
  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      className={cn("absolute inset-0", className)}
      style={style}
      {...props}
    />
  )
}

export { PressWash, StateFill }
