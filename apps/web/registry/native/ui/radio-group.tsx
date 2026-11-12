import * as React from "react"
import { useComposedRefs, useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Pressable, View } from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"

import { getGlideOffset } from "@/registry/fabricator/shared/lib/radio-glide-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useFieldControl } from "@/registry/native/lib/field-model"
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { StateFill } from "@/registry/native/lib/press-wash"
import { renderTextChildren } from "@/registry/native/ui/text"

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

// The press gives more than a button's: the website's `active:scale-90`.
const PRESS_GIVE = 0.1

// The checked radio's dot, so the next pick can glide it over.
type Dot = {
  item: React.RefObject<ViewInstance | null>
  progress: SharedValue<number>
  offsetX: SharedValue<number>
  offsetY: SharedValue<number>
}

type RadioGroupContextValue = {
  value: string | undefined
  select: (value: string) => void
  isDisabled: boolean
  isReadOnly: boolean
  checkedDot: React.RefObject<Dot | null>
}

type ViewInstance = React.ComponentRef<typeof View>

type Rect = { left: number; top: number; width: number; height: number }

function measure(view: ViewInstance | null) {
  return new Promise<Rect | null>((resolve) => {
    if (!view) return resolve(null)
    view.measureInWindow((left, top, width, height) =>
      resolve({ left, top, width, height })
    )
  })
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
  const checkedDot = React.useRef<Dot | null>(null)
  const context = React.useMemo<RadioGroupContextValue>(
    () => ({
      value: current,
      select: setCurrent,
      isDisabled: disabled,
      isReadOnly: readOnly,
      checkedDot,
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
  ref,
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

  // Picking another radio glides the dot over from the one it leaves, on the
  // move timing with the entrance curve, as the website does. A first pick
  // scales it in on the same timing; a cleared value scales it out on the
  // feedback exit. Reduce Motion and motion off snap.
  const enter = useMotion("move")
  const exit = useMotion("feedback")
  const isFlat = exit.isReduced || exit.isOff
  const item = React.useRef<ViewInstance>(null)
  const itemRef = useComposedRefs(item, ref)
  const progress = useSharedValue(isChecked ? 1 : 0)
  const offsetX = useSharedValue(0)
  const offsetY = useSharedValue(0)
  const dot = React.useMemo<Dot>(
    () => ({ item, progress, offsetX, offsetY }),
    [progress, offsetX, offsetY]
  )
  const checkedDot = group?.checkedDot
  const isGroupCleared = group?.value === undefined || group.value === ""
  React.useEffect(() => {
    if (!isChecked) {
      // Switching hands the dot to the next radio, which takes it over.
      if (isGroupCleared && checkedDot?.current === dot)
        checkedDot.current = null
      progress.set(
        withTiming(0, { duration: exit.exitMs, easing: exit.exitEasing })
      )
      return
    }
    const previous = checkedDot?.current ?? null
    if (checkedDot) checkedDot.current = dot
    const timing = { duration: enter.enterMs, easing: enter.enterEasing }
    if (!previous || previous === dot || isFlat) {
      progress.set(withTiming(1, timing))
      return
    }
    let isCancelled = false
    void Promise.all([
      measure(previous.item.current),
      measure(item.current),
    ]).then(([from, to]) => {
      if (isCancelled) return
      // Mid-flight, the old dot still stands off its radio.
      const start = from && {
        ...from,
        left: from.left + previous.offsetX.get(),
        top: from.top + previous.offsetY.get(),
      }
      const offset = to ? getGlideOffset(start, to) : null
      previous.progress.set(0)
      previous.offsetX.set(0)
      previous.offsetY.set(0)
      progress.set(1)
      if (!offset) return
      offsetX.set(offset.x)
      offsetY.set(offset.y)
      offsetX.set(withTiming(0, timing))
      offsetY.set(withTiming(0, timing))
    })
    return () => {
      isCancelled = true
    }
  }, [
    checkedDot,
    dot,
    enter,
    exit,
    isChecked,
    isFlat,
    isGroupCleared,
    offsetX,
    offsetY,
    progress,
  ])
  React.useEffect(
    () => () => {
      if (checkedDot?.current === dot) checkedDot.current = null
    },
    [checkedDot, dot]
  )
  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateX: offsetX.value },
      { translateY: offsetY.value },
      { scale: progress.value },
    ],
  }))

  const press = usePressScale()
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: isFlat ? 1 : 1 - PRESS_GIVE * press.progress.value }],
  }))

  return (
    <AnimatedPressable
      ref={itemRef}
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
        <View
          data-invalid={Boolean(isFieldInvalid)}
          className="cn-radio-group-indicator-icon"
        />
      </Animated.View>
    </AnimatedPressable>
  )
}

export { RadioGroup, RadioGroupItem }
