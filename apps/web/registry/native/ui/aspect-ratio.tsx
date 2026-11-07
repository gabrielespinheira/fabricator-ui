import * as React from "react"
import { cn } from "cn"
import { View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useMotion } from "@/registry/native/lib/motion"
import { renderTextChildren } from "@/registry/native/ui/text"

// A new ratio reshapes the frame on the move timing, as the website's does.
function AspectRatio({
  ratio,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof View> & { ratio: number }) {
  const motion = useMotion("move")
  const animatedRatio = useSharedValue(ratio)
  React.useEffect(() => {
    // Reanimated jumps to the end under Reduce Motion, and the duration is 0
    // when motion is off.
    animatedRatio.value = withTiming(ratio, {
      duration: motion.enterMs,
      easing: motion.moveEasing,
    })
  }, [animatedRatio, motion, ratio])
  const ratioStyle = useAnimatedStyle(() => ({
    aspectRatio: animatedRatio.value,
  }))
  return (
    <Animated.View
      data-slot="aspect-ratio"
      style={[ratioStyle, style]}
      className={cn("cn-aspect-ratio relative", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </Animated.View>
  )
}

export { AspectRatio }
