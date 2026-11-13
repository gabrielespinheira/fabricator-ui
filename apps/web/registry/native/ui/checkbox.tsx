import * as React from "react"
import { useControllableState } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Pressable } from "react-native"
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import Svg, { Path } from "react-native-svg"
import { useResolveClassNames } from "uniwind"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useFieldControl } from "@/registry/native/lib/field-model"
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { StateFill } from "@/registry/native/lib/press-wash"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)
const AnimatedPath = Animated.createAnimatedComponent(Path)

// The press gives more than a button's: the website's `active:scale-90`.
const PRESS_GIVE = 0.1
// The website's mark, in a 24-unit box: the check starts at its short leg.
// react-native-svg has no `pathLength`, so each path carries its own length.
const CHECK = { d: "M4 12l5 5L20 6", length: 16 * Math.SQRT2 }
const MINUS = { d: "M5 12h14", length: 14 }
const MARK_STROKE = 3

// Resolved for each stroke's colour: an SVG path takes no class.
const checkboxCheckVariants = cva("cn-checkbox-check")
const checkboxMinusVariants = cva("cn-checkbox-minus")

/** A path that draws itself from its start as `progress` goes 0 → 1. */
function MarkPath({
  d,
  length,
  progress,
  className,
}: {
  d: string
  length: number
  progress: SharedValue<number>
  className: string
}) {
  const { color } = useResolveClassNames(className)
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }))
  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={typeof color === "string" ? color : "white"}
      strokeWidth={MARK_STROKE}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={[length, length * 2]}
      animatedProps={animatedProps}
    />
  )
}

function Checkbox({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  indeterminate = false,
  disabled,
  "aria-invalid": isInvalid,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  indeterminate?: boolean
  "aria-invalid"?: boolean
}) {
  const [isChecked = false, setIsChecked] = useControllableState({
    prop: checked,
    defaultProp: defaultChecked,
    onChange: onCheckedChange,
  })
  const feedback = useFeedback()
  const toggle = () => {
    feedback(isChecked ? "uncheck" : "check")
    setIsChecked(!isChecked)
  }
  const field = useFieldControl({
    activate: () => {
      if (!isDisabled) toggle()
    },
    isChecked: isChecked || indeterminate,
  })
  const isDisabled = disabled ?? field.isDisabled
  const isFieldInvalid = isInvalid ?? field.isInvalid
  const isOn = isChecked || indeterminate
  const state = indeterminate
    ? "indeterminate"
    : isChecked
      ? "checked"
      : "unchecked"

  // The mark fades in from 0.6 on the feedback timing while its stroke draws
  // on the move timing, both on the entrance curve; it shrinks and fades on
  // the feedback exit. Indeterminate draws a minus.
  const feedbackMotion = useMotion("feedback")
  const drawMotion = useMotion("move")
  const visible = useSharedValue(isOn ? 1 : 0)
  const checkDraw = useSharedValue(isChecked && !indeterminate ? 1 : 0)
  const minusDraw = useSharedValue(indeterminate ? 1 : 0)
  React.useEffect(() => {
    const exit = {
      duration: feedbackMotion.exitMs,
      easing: feedbackMotion.exitEasing,
    }
    // A drawn stroke stays while the mark fades out, then resets; between
    // checked and indeterminate the mark stays, so the outgoing one retracts.
    const draw = (isDrawn: boolean) => {
      if (isDrawn) {
        return withTiming(1, {
          duration: drawMotion.enterMs,
          easing: drawMotion.enterEasing,
        })
      }
      if (isOn) return withTiming(0, exit)
      return withDelay(exit.duration, withTiming(0, { duration: 0 }))
    }
    visible.set(
      withTiming(
        isOn ? 1 : 0,
        isOn
          ? {
              duration: feedbackMotion.enterMs,
              easing: feedbackMotion.enterEasing,
            }
          : exit
      )
    )
    checkDraw.set(draw(isChecked && !indeterminate))
    minusDraw.set(draw(indeterminate))
  }, [
    checkDraw,
    drawMotion,
    feedbackMotion,
    indeterminate,
    isChecked,
    isOn,
    minusDraw,
    visible,
  ])
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: visible.value,
    transform: [{ scale: 0.6 + 0.4 * visible.value }],
  }))
  const press = usePressScale()
  const isFlat = feedbackMotion.isReduced || feedbackMotion.isOff
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isFlat ? 1 : 1 - PRESS_GIVE * press.progress.value }],
  }))

  return (
    <AnimatedPressable
      data-slot="checkbox"
      data-state={state}
      data-invalid={Boolean(isFieldInvalid)}
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : isChecked}
      aria-disabled={isDisabled ?? undefined}
      aria-invalid={isFieldInvalid}
      disabled={isDisabled}
      hitSlop={14}
      className={cn(
        "cn-checkbox shrink-0 items-center justify-center disabled:opacity-50",
        className
      )}
      style={[pressStyle, style]}
      onPress={(event) => {
        toggle()
        onPress?.(event)
      }}
      onPressIn={(event) => {
        press.onPressIn()
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        press.onPressOut()
        onPressOut?.(event)
      }}
      {...props}
    >
      <StateFill
        isOn={isOn}
        data-invalid={Boolean(isFieldInvalid)}
        className="cn-checkbox-fill"
      />
      <Animated.View
        data-slot="checkbox-indicator"
        className="cn-checkbox-indicator items-center justify-center"
        style={indicatorStyle}
      >
        <Animated.View data-slot="checkbox-mark" className="cn-checkbox-mark">
          <Svg width="100%" height="100%" viewBox="0 0 24 24">
            <MarkPath
              {...CHECK}
              progress={checkDraw}
              className={checkboxCheckVariants()}
            />
            <MarkPath
              {...MINUS}
              progress={minusDraw}
              className={checkboxMinusVariants()}
            />
          </Svg>
        </Animated.View>
      </Animated.View>
    </AnimatedPressable>
  )
}

export { Checkbox }
