import * as React from "react"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useFieldControl } from "@/registry/native/lib/field-model"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { DensityScope } from "@/registry/native/ui/density"

// A press stretches the knob 4pt toward the centre and squashes it by the same.
const PRESS_STRETCH = 4
const TRACK_INSET = 2

function SwitchControl({
  className,
  size,
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled,
  readOnly = false,
  "aria-invalid": isInvalid,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  size: "sm" | "default"
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  readOnly?: boolean
  "aria-invalid"?: boolean
}) {
  const [isChecked = false, setIsChecked] = useControllableState({
    prop: checked,
    defaultProp: defaultChecked,
    onChange: onCheckedChange,
  })
  const feedback = useFeedback()
  const toggle = () => {
    feedback(isChecked ? "toggle-off" : "toggle-on")
    setIsChecked(!isChecked)
  }
  const field = useFieldControl({
    activate: () => {
      if (!isDisabled && !readOnly) toggle()
    },
    isChecked,
  })
  const isDisabled = disabled ?? field.isDisabled
  const isFieldInvalid = isInvalid ?? field.isInvalid
  const state = isChecked ? "checked" : "unchecked"

  // Height and travel read the density this switch is in, for the knob's numbers.
  const [height, travelToken] = useCSSVariable(["--density-20", "--density-14"])
  const knob = parseNumber(height, 20) - TRACK_INSET * 2
  const travel = parseNumber(travelToken, 14)

  const slideMotion = useMotion("move")
  const colorMotion = useMotion("feedback")
  const slide = useSharedValue(isChecked ? 1 : 0)
  const fill = useSharedValue(isChecked ? 1 : 0)
  const press = useSharedValue(0)
  React.useEffect(() => {
    slide.value = withTiming(isChecked ? 1 : 0, {
      duration: slideMotion.enterMs,
      easing: slideMotion.moveEasing,
    })
    fill.value = withTiming(isChecked ? 1 : 0, {
      duration: colorMotion.enterMs,
      easing: colorMotion.enterEasing,
    })
  }, [colorMotion, fill, isChecked, slide, slideMotion])

  const fillStyle = useAnimatedStyle(() => ({ opacity: fill.value }))
  const thumbStyle = useAnimatedStyle(() => ({
    width: knob + press.value * PRESS_STRETCH,
    height: knob - press.value * PRESS_STRETCH,
    transform: [
      {
        translateX: slide.value * (travel - press.value * PRESS_STRETCH),
      },
    ],
  }))

  return (
    <Pressable
      data-slot="switch"
      data-size={size}
      data-state={state}
      data-invalid={isFieldInvalid}
      role="switch"
      aria-checked={isChecked}
      aria-disabled={isDisabled}
      aria-invalid={isFieldInvalid}
      disabled={isDisabled}
      hitSlop={12}
      className={cn(
        "cn-switch relative flex-row items-center disabled:opacity-50",
        className
      )}
      onPress={(event) => {
        if (!readOnly) toggle()
        onPress?.(event)
      }}
      onPressIn={(event) => {
        press.value = withTiming(1, {
          duration: slideMotion.enterMs,
          easing: slideMotion.moveEasing,
        })
        onPressIn?.(event)
      }}
      onPressOut={(event) => {
        press.value = withTiming(0, {
          duration: slideMotion.exitMs,
          easing: slideMotion.moveEasing,
        })
        onPressOut?.(event)
      }}
      {...props}
    >
      <Animated.View
        pointerEvents="none"
        className="cn-switch-fill absolute inset-0"
        style={fillStyle}
      />
      <Animated.View
        data-slot="switch-thumb"
        data-state={state}
        pointerEvents="none"
        className="cn-switch-thumb"
        style={thumbStyle}
      />
    </Pressable>
  )
}

function Switch({
  size = "default",
  ...props
}: Omit<React.ComponentProps<typeof SwitchControl>, "size"> & {
  size?: "sm" | "default"
}) {
  // size="sm" pins the switch to compact, so the knob's numbers must be read
  // inside the scope.
  return (
    <DensityScope density={size === "sm" ? "compact" : undefined}>
      <SwitchControl size={size} {...props} />
    </DensityScope>
  )
}

export { Switch }
