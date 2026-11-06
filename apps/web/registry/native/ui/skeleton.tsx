import * as React from "react"
import { cn } from "cn"
import Animated, {
  cancelAnimation,
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"

// The website's animate-pulse: 2s there and back at every speed, on its own curve.
const PULSE_MS = 1000
const PULSE_EASING = Easing.bezier(0.4, 0, 0.6, 1)

/**
 * The website's `animate-pulse` and `shimmer` as an animated opacity. React
 * Native can't sweep a gradient through text without a mask, so both pulse. It's
 * a fade, so it keeps going under Reduce Motion, as on the website.
 */
function usePulse(isActive = true) {
  const opacity = useSharedValue(1)
  React.useEffect(() => {
    if (!isActive) return
    opacity.value = withRepeat(
      withTiming(0.5, {
        duration: PULSE_MS,
        easing: PULSE_EASING,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.Never
    )
    return () => {
      cancelAnimation(opacity)
      opacity.value = 1
    }
  }, [isActive, opacity])
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
