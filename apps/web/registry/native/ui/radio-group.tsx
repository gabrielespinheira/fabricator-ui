import * as React from "react"
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
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { StateFill } from "@/registry/native/lib/press-wash"
import { renderTextChildren } from "@/registry/native/ui/text"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// The press gives more than a button's: the website's `active:scale-90`.
const PRESS_GIVE = 0.1

type RadioGroupContextValue = {
  value: string | undefined
  select: (value: string) => void
  isDisabled: boolean
  isReadOnly: boolean
}

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(
  null
)

function RadioGroup({
  className,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  readOnly = false,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  disabled?: boolean
  readOnly?: boolean
  children?: React.ReactNode
}) {
  const [current, setCurrent] = useControllableState({
    prop: value,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next)
    },
  })
  const context = React.useMemo<RadioGroupContextValue>(
    () => ({
      value: current,
      select: setCurrent,
      isDisabled: disabled,
      isReadOnly: readOnly,
    }),
    [current, disabled, readOnly, setCurrent]
  )
  return (
    <RadioGroupContext value={context}>
      <View
        data-slot="radio-group"
        role="radiogroup"
        aria-disabled={disabled}
        className={cn("cn-radio-group w-full flex-col", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </RadioGroupContext>
  )
}

function RadioGroupItem({
  className,
  value,
  disabled,
  "aria-invalid": isInvalid,
  onPress,
  onPressIn,
  onPressOut,
  style,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  value: string
  "aria-invalid"?: boolean
}) {
  const group = React.use(RadioGroupContext)
  const isChecked = group?.value === value
  const feedback = useFeedback()
  const isReadOnly = group?.isReadOnly ?? false
  const select = () => {
    feedback("pick")
    group?.select(value)
  }
  const field = useFieldControl({
    activate: () => {
      if (!isDisabled && !isReadOnly) select()
    },
    isChecked,
  })
  const isDisabled = disabled ?? (group?.isDisabled || field.isDisabled)
  const isFieldInvalid = isInvalid ?? field.isInvalid
  const state = isChecked ? "checked" : "unchecked"

  // The dot scales in on the move timing and out on the feedback exit.
  const enter = useMotion("move")
  const exit = useMotion("feedback")
  const progress = useSharedValue(isChecked ? 1 : 0)
  React.useEffect(() => {
    progress.value = withTiming(isChecked ? 1 : 0, {
      duration: isChecked ? enter.enterMs : exit.exitMs,
      easing: isChecked ? enter.enterEasing : exit.exitEasing,
    })
  }, [enter, exit, isChecked, progress])
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: progress.value }],
  }))

  const press = usePressScale()
  const isFlat = exit.isReduced || exit.isOff
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isFlat ? 1 : 1 - PRESS_GIVE * press.progress.value }],
  }))

  return (
    <AnimatedPressable
      data-slot="radio-group-item"
      data-state={state}
      data-invalid={isFieldInvalid}
      role="radio"
      aria-checked={isChecked}
      aria-disabled={isDisabled}
      aria-invalid={isFieldInvalid}
      disabled={isDisabled}
      hitSlop={14}
      className={cn(
        "cn-radio-group-item shrink-0 items-center justify-center disabled:opacity-50",
        className
      )}
      style={[pressStyle, style]}
      onPress={(event) => {
        if (!isReadOnly) select()
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
        isOn={isChecked}
        data-invalid={Boolean(isFieldInvalid)}
        className="cn-radio-group-fill"
      />
      <Animated.View
        data-slot="radio-group-indicator"
        className="cn-radio-group-indicator items-center justify-center"
        style={indicatorStyle}
      >
        <View className="cn-radio-group-indicator-icon" />
      </Animated.View>
    </AnimatedPressable>
  )
}

export { RadioGroup, RadioGroupItem }
