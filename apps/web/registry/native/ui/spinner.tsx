import * as React from "react"
import { Loader2Icon, type IconProps } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated"
import { useResolveClassNames } from "uniwind"

import { useMotion } from "@/registry/native/lib/motion"

const spinnerVariants = cva("cn-spinner items-center justify-center")

// One turn, in sheet timings: 1s at the default speed, the length of the
// website's animate-spin.
const TURN_SHEET_TIMINGS = 2.5

function Spinner({
  className,
  size,
  color,
  "aria-label": ariaLabel = "Loading",
  ...props
}: IconProps & { className?: string }) {
  const classes = cn(spinnerVariants(), className)
  const resolved = useResolveClassNames(classes)
  const iconSize =
    size ?? (typeof resolved.width === "number" ? resolved.width : 16)
  const iconColor =
    color ?? (typeof resolved.color === "string" ? resolved.color : undefined)

  const motion = useMotion("sheet")
  const rotation = useSharedValue(0)
  const shouldSpin = !motion.isOff && !motion.isReduced
  const duration = motion.enterMs * TURN_SHEET_TIMINGS
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
  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))

  return (
    <Animated.View
      data-slot="spinner"
      role="status"
      accessible
      aria-label={ariaLabel}
      className={classes}
      style={[{ width: iconSize, height: iconSize }, spinStyle]}
    >
      <Loader2Icon size={iconSize} color={iconColor} {...props} />
    </Animated.View>
  )
}

export { Spinner }
