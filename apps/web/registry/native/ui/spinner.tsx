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
  type SharedValue,
} from "react-native-reanimated"
import Svg, { Polygon } from "react-native-svg"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import {
  getSpinnerDots,
  getSpinnerDuration,
  getSpinnerFrame,
  getSpinnerMotion,
  getSpinnerPolygonPoints,
  SPINNER_VALUES,
  type SpinnerMotion,
  type SpinnerVariant,
} from "@/registry/fabricator/shared/lib/spinner-model"
import { useMotion } from "@/registry/native/lib/motion"
import { TextClassContext } from "@/registry/native/ui/text"

const spinnerVariants = cva("cn-spinner")

type SpinnerProps = IconProps & {
  className?: string
  variant?: SpinnerVariant
  speed?: number
  animated?: boolean
}

type DotProps = {
  dot: ReturnType<typeof getSpinnerDots>[number]
  motion: SpinnerMotion
  clock: SharedValue<number>
  dimension: number
  color: string | undefined
  isAnimated: boolean
}

function SpinnerDot({
  dot,
  motion,
  clock,
  dimension,
  color,
  isAnimated,
}: DotProps) {
  const style = useAnimatedStyle(() => {
    const phase = (clock.value + dot.phase) % 1
    const state = getSpinnerFrame(motion, phase)
    return {
      opacity:
        dot.opacity * (isAnimated ? state.opacity : 0.3 + dot.phase * 0.6),
      transform: [
        {
          translateX: isAnimated
            ? (state.translateX * dot.travelX * dimension) / 24
            : 0,
        },
        {
          translateY: isAnimated
            ? (state.translateY * dot.travelY * dimension) / 24
            : 0,
        },
        { rotate: `${isAnimated ? state.rotation : 0}deg` },
        { scaleX: isAnimated ? state.scaleX : 1 },
        { scaleY: isAnimated ? state.scaleY : 1 },
      ],
    }
  })
  const width = (dimension * dot.width) / 24
  const height = (dimension * dot.height) / 24
  return (
    <Animated.View
      data-slot="spinner-dot"
      style={[
        {
          position: "absolute",
          left: (dot.x / 24) * dimension - width / 2,
          top: (dot.y / 24) * dimension - height / 2,
          width,
          height,
          borderRadius:
            dot.shape === "circle" ? width / 2 : (dimension * 0.6) / 24,
          backgroundColor:
            dot.shape === "triangle" || dot.shape === "hexagon"
              ? undefined
              : color,
        },
        style,
      ]}
    >
      {dot.shape === "triangle" || dot.shape === "hexagon" ? (
        <Svg
          width={width}
          height={height}
          viewBox={`0 0 ${dot.width} ${dot.height}`}
        >
          <Polygon
            points={getSpinnerPolygonPoints(dot.shape, dot.width, dot.height)}
            fill={color}
          />
        </Svg>
      ) : null}
    </Animated.View>
  )
}

function Spinner({
  className,
  size,
  color,
  variant,
  speed = 1,
  animated = true,
  "aria-label": ariaLabel = "Loading",
  "aria-hidden": ariaHidden,
  ...props
}: SpinnerProps) {
  const inherited = React.use(TextClassContext)
  const classes = cn(spinnerVariants(), "text-foreground", inherited, className)
  const resolved = useResolveClassNames(classes)
  const dimension =
    size ?? (typeof resolved.width === "number" ? resolved.width : 16)
  const dotColor =
    color ?? (typeof resolved.color === "string" ? resolved.color : undefined)
  const storedVariant = useCSSVariable("--spinner-variant")
  const selected =
    variant ?? SPINNER_VALUES[Number(storedVariant ?? 0)] ?? "orbit"
  const { isReduced, isOff } = useMotion("move")
  const isAnimated = animated && !isReduced && !isOff
  const duration = getSpinnerDuration(speed)
  const clock = useSharedValue(0)

  React.useEffect(() => {
    clock.value = 0
    if (isAnimated) {
      clock.value = withRepeat(
        withTiming(1, { duration, easing: Easing.linear }),
        -1
      )
    }
    return () => {
      cancelAnimation(clock)
    }
  }, [clock, duration, isAnimated])

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${clock.value * 360}deg` }],
  }))
  const motion = selected === "ring" ? null : getSpinnerMotion(selected)
  const dots = React.useMemo(
    () => (selected === "ring" ? [] : getSpinnerDots(selected)),
    [selected]
  )
  return (
    <Animated.View
      data-slot="spinner"
      data-animated={isAnimated}
      role="status"
      accessible
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      className={classes}
      style={{ width: dimension, height: dimension }}
    >
      <Animated.View
        data-slot="spinner-pattern"
        data-variant={selected}
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          { width: dimension, height: dimension },
          selected === "ring" ? ringStyle : undefined,
        ]}
      >
        {selected === "ring" ? (
          <Loader2Icon size={dimension} color={dotColor} {...props} />
        ) : (
          motion &&
          dots.map((dot, index) => (
            <SpinnerDot
              key={index}
              dot={dot}
              motion={motion}
              clock={clock}
              dimension={dimension}
              color={dotColor}
              isAnimated={isAnimated}
            />
          ))
        )}
      </Animated.View>
    </Animated.View>
  )
}

export { Spinner, type SpinnerProps, type SpinnerVariant }
