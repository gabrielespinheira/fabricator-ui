import * as React from "react"
import { Loader2Icon, type IconProps } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
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
import { useResolveClassNames } from "uniwind"

const spinnerVariants = cva("cn-spinner items-center justify-center")

// The website's animate-spin: one turn a second at every speed. It keeps going
// under Reduce Motion and with motion off, since a still spinner reads as hung.
const TURN_MS = 1000

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

  const rotation = useSharedValue(0)
  React.useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: TURN_MS,
        easing: Easing.linear,
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      false,
      undefined,
      ReduceMotion.Never
    )
    return () => {
      cancelAnimation(rotation)
      rotation.value = 0
    }
  }, [rotation])
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
