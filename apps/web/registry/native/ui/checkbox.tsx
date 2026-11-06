import * as React from "react"
import { CheckIcon, MinusIcon } from "@fabricator-ui/icons-react-native"
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
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { StateFill } from "@/registry/native/lib/press-wash"
import { TextStyle } from "@/registry/native/ui/text"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// The press gives more than a button's: the website's `active:scale-90`.
const PRESS_GIVE = 0.1
// The mark is this much smaller than the icon size, centred in the box.
const MARK_INSET = 4

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

  // The check comes in on the move timing and goes on the feedback exit.
  const enter = useMotion("move")
  const exit = useMotion("feedback")
  const progress = useSharedValue(isOn ? 1 : 0)
  React.useEffect(() => {
    progress.value = withTiming(isOn ? 1 : 0, {
      duration: isOn ? enter.enterMs : exit.exitMs,
      easing: isOn ? enter.enterEasing : exit.exitEasing,
    })
  }, [enter, exit, isOn, progress])
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.6 + 0.4 * progress.value }],
  }))
  // The website's clip-path: it wipes in from the start edge.
  const wipeStyle = useAnimatedStyle(() => ({
    width: `${progress.value * 100}%`,
  }))
  const markSize =
    parseNumber(useCSSVariable("--density-icon-16"), 16) - MARK_INSET

  const press = usePressScale()
  const isFlat = exit.isReduced || exit.isOff
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
      <TextStyle className="cn-checkbox-indicator-text">
        <Animated.View
          data-slot="checkbox-indicator"
          className="cn-checkbox-indicator items-center justify-center"
          style={indicatorStyle}
        >
          <Animated.View
            className="h-full self-start overflow-hidden"
            style={wipeStyle}
          >
            {indeterminate ? (
              <MinusIcon size={markSize} strokeWidth={3} />
            ) : (
              <CheckIcon size={markSize} strokeWidth={3} />
            )}
          </Animated.View>
        </Animated.View>
      </TextStyle>
    </AnimatedPressable>
  )
}

export { Checkbox }
