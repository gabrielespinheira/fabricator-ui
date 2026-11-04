import * as React from "react"
import { CheckIcon, MinusIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useFieldControl } from "@/registry/native/lib/field-model"
import { useMotion } from "@/registry/native/lib/motion"
import { TextStyle } from "@/registry/native/ui/text"

function Checkbox({
  className,
  checked,
  defaultChecked = false,
  onCheckedChange,
  indeterminate = false,
  disabled,
  "aria-invalid": isInvalid,
  onPress,
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
    activate: toggle,
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

  const motion = useMotion("move")
  const progress = useSharedValue(isOn ? 1 : 0)
  React.useEffect(() => {
    progress.value = withTiming(isOn ? 1 : 0, {
      duration: isOn ? motion.enterMs : motion.exitMs,
      easing: isOn ? motion.enterEasing : motion.exitEasing,
    })
  }, [isOn, motion, progress])
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + 0.4 * progress.value }],
  }))

  return (
    <Pressable
      data-slot="checkbox"
      data-state={state}
      data-invalid={Boolean(isFieldInvalid)}
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : isChecked}
      aria-disabled={isDisabled ?? undefined}
      aria-invalid={isFieldInvalid}
      disabled={isDisabled}
      hitSlop={12}
      className={cn(
        "cn-checkbox shrink-0 items-center justify-center disabled:opacity-50",
        className
      )}
      onPress={(event) => {
        toggle()
        onPress?.(event)
      }}
      {...props}
    >
      <TextStyle className="cn-checkbox-indicator-text">
        <Animated.View
          data-slot="checkbox-indicator"
          className="cn-checkbox-indicator items-center justify-center"
          style={indicatorStyle}
        >
          {indeterminate ? (
            <MinusIcon strokeWidth={3} />
          ) : (
            <CheckIcon strokeWidth={3} />
          )}
        </Animated.View>
      </TextStyle>
    </Pressable>
  )
}

export { Checkbox }
