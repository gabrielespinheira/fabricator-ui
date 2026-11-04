import * as React from "react"
import { cn } from "cn"
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

import { useMotion } from "@/registry/native/lib/motion"

// One way of the pulse, in sheet timings: 2s there and back at the default
// speed, the length of the website's animate-pulse.
const PULSE_SHEET_TIMINGS = 2.5

/**
 * The website's `animate-pulse` and `shimmer` as an animated opacity. React
 * Native can't sweep a gradient through text without a mask, so both pulse.
 * Stays still under Reduce Motion and when motion is off.
 */
function usePulse(isActive = true) {
  const motion = useMotion("sheet")
  const opacity = useSharedValue(1)
  const shouldPulse = isActive && !motion.isOff && !motion.isReduced
  const duration = motion.enterMs * PULSE_SHEET_TIMINGS
  const easing = motion.moveEasing
  React.useEffect(() => {
    if (!shouldPulse) return
    opacity.value = withRepeat(withTiming(0.5, { duration, easing }), -1, true)
    return () => {
      cancelAnimation(opacity)
      opacity.value = 1
    }
  }, [duration, easing, opacity, shouldPulse])
  return useAnimatedStyle(() => ({ opacity: opacity.value }))
}

function Skeleton({
  className,
  style,
  ...props
}: React.ComponentProps<typeof Animated.View>) {
  const pulseStyle = usePulse()
  return (
    <Animated.View
      data-slot="skeleton"
      className={cn("cn-skeleton", className)}
      style={[pulseStyle, style]}
      {...props}
    />
  )
}

export { Skeleton, usePulse }
