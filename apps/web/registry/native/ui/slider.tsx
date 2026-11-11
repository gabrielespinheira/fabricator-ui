import * as React from "react"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import {
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useFieldControl } from "@/registry/native/lib/field-model"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import {
  getClosestThumb,
  getNotchPitch,
  getSliderSteps,
  getThumbCenter,
  getThumbOffset,
  getThumbSize,
  getValueAtPosition,
  isStepFilled,
  resolveThumbCollision,
  sameValues,
  stepThumb,
  toSliderValues,
  type SliderCollision,
} from "@/registry/native/lib/slider-model"
import { DensityScope, useControlSize } from "@/registry/native/ui/density"

// A vertical scroll under a horizontal slider, or the reverse, stays a scroll.
const ACTIVE_OFFSET = 8
const FAIL_OFFSET = 12
// The 18pt track keeps a finger-sized target. Not with the gesture's hitSlop: on
// iOS a touch outside the view's bounds never reaches its recognizer.
const MIN_TARGET = 44

const ACCESSIBILITY_ACTIONS = [{ name: "increment" }, { name: "decrement" }]

function SliderThumb({
  index,
  count,
  shown,
  pressedIndex,
  held,
  length,
  min,
  max,
  thumbSize,
  isVertical,
  isDisabled,
  now,
  label,
  onAccessibilityAction,
}: {
  index: number
  count: number
  shown: SharedValue<number[]>
  pressedIndex: SharedValue<number>
  held: SharedValue<number>
  length: SharedValue<number>
  min: number
  max: number
  thumbSize: number
  isVertical: boolean
  isDisabled: boolean
  now: number | undefined
  label: string | undefined
  onAccessibilityAction: (event: AccessibilityActionEvent) => void
}) {
  const positionStyle = useAnimatedStyle(() => {
    const offset = getThumbOffset(shown.value[index] ?? min, {
      min,
      max,
      length: length.value,
      thumbSize,
    })
    // Held, the knob grows 2pt all round, as the website's white ring offset.
    const grow = pressedIndex.value === index ? (held.value * 4) / thumbSize : 0
    return {
      transform: [
        isVertical
          ? { translateY: Math.max(length.value - thumbSize - offset, 0) }
          : { translateX: offset },
        { scale: 1 + grow },
      ],
    }
  })
  const heldStyle = useAnimatedStyle(() => ({
    opacity: pressedIndex.value === index ? held.value : 0,
  }))
  return (
    <Animated.View
      data-slot="slider-thumb"
      data-disabled={isDisabled}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={
        label && count > 1 ? `${label}, ${index + 1} of ${count}` : label
      }
      accessibilityValue={{ min, max, now }}
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      accessibilityState={{ disabled: isDisabled }}
      onAccessibilityAction={onAccessibilityAction}
      className="cn-slider-thumb absolute shrink-0"
      style={[{ width: thumbSize, height: thumbSize }, positionStyle]}
    >
      <Animated.View
        pointerEvents="none"
        className="cn-slider-thumb-held absolute"
        style={heldStyle}
      />
    </Animated.View>
  )
}

function SliderStep({
  value,
  shown,
  length,
  min,
  max,
  thumbSize,
  isVertical,
  duration,
  easing,
}: {
  value: number
  shown: SharedValue<number[]>
  length: SharedValue<number>
  min: number
  max: number
  thumbSize: number
  isVertical: boolean
  duration: number
  easing: ReturnType<typeof useMotion>["enterEasing"]
}) {
  // A thumb-sized box on the step's thumb position, so the dot sits under the
  // knob's centre whatever its size. It shrinks away as the range covers it.
  const style = useAnimatedStyle(() => {
    const offset = getThumbOffset(value, {
      min,
      max,
      length: length.value,
      thumbSize,
    })
    const shownAmount = isStepFilled(value, shown.value) ? 0 : 1
    return {
      opacity: withTiming(shownAmount, { duration, easing }),
      transform: [
        isVertical
          ? { translateY: Math.max(length.value - thumbSize - offset, 0) }
          : { translateX: offset },
        { scale: withTiming(shownAmount, { duration, easing }) },
      ],
    }
  })
  return (
    <Animated.View
      className="absolute items-center justify-center"
      style={[{ width: thumbSize, height: thumbSize }, style]}
    >
      <View data-slot="slider-step" className="cn-slider-step" />
    </Animated.View>
  )
}

function SliderControl({
  className,
  defaultValue,
  value,
  onValueChange,
  onValueCommitted,
  min = 0,
  max = 100,
  step = 1,
  minStepsBetweenValues = 0,
  thumbCollisionBehavior = "push",
  orientation = "horizontal",
  disabled,
  size = "default",
  showSteps = false,
  accessibilityLabel,
  "aria-label": ariaLabel,
  ...props
}: React.ComponentProps<typeof Slider>) {
  const [current = [min, max], setCurrent] = useControllableState<
    number | readonly number[]
  >({
    prop: value,
    defaultProp: defaultValue ?? [min, max],
    onChange: onValueChange,
  })
  const values = React.useMemo(() => toSliderValues(current), [current])
  const isSingleNumber = typeof current === "number"
  const isVertical = orientation === "vertical"
  const field = useFieldControl()
  const isDisabled = disabled ?? field.isDisabled
  const label = accessibilityLabel ?? ariaLabel
  const feedback = useFeedback()

  const [space24, space36, icon16] = useCSSVariable([
    "--density-24",
    "--density-36",
    "--density-icon-16",
  ])
  const trackSize = parseNumber(icon16, 16) + 2
  const thumbSize = getThumbSize({
    space24: parseNumber(space24, 24),
    space36: parseNumber(space36, 36),
    icon16: parseNumber(icon16, 16),
    size,
  })
  const length = useSharedValue(0)

  // The thumbs follow this on the UI thread, so a drag never waits for a render.
  const live = useSharedValue(values)
  const pressedIndex = useSharedValue(0)
  const initialValues = useSharedValue(values)
  const grabOffset = useSharedValue(0)
  const isDragging = useSharedValue(false)
  const held = useSharedValue(0)

  // What's drawn: under a drag it's the finger, and anything else (a tap on the
  // track, a screen reader's step, a new `value`) moves there on the move timing.
  const shown = useSharedValue(values)
  // Ease-out, as the website's glide: it answers the tap at once and settles.
  const { enterMs: moveMs, enterEasing: glideEasing } = useMotion("move")
  useAnimatedReaction(
    () => live.value,
    (next, previous) => {
      if (previous === null) return
      shown.value = isDragging.value
        ? next
        : withTiming(next, { duration: moveMs, easing: glideEasing })
    }
  )

  // The website's hover shadow, for as long as a finger is on the thumb.
  const {
    enterMs: holdMs,
    exitMs: letGoMs,
    feedbackEasing,
    enterEasing: stepEasing,
  } = useMotion("feedback")

  // A drag may end on values the app didn't take: `syncCount` puts the thumbs
  // back on what it holds, once the last change has rendered.
  const [syncCount, setSyncCount] = React.useState(0)
  const lastValues = React.useRef(values)
  React.useEffect(() => {
    lastValues.current = values
    if (!isDragging.value) live.value = values
  }, [isDragging, live, syncCount, values])

  const toValue = (next: readonly number[]) =>
    isSingleNumber ? (next[0] ?? min) : next

  const playNotch = (value: number | undefined) => {
    feedback("notch", { pitch: getNotchPitch(value ?? min, { min, max }) })
  }

  const latest = React.useRef({
    change: (_next: number[], _thumbIndex: number) => {},
    commit: () => {},
  })
  React.useEffect(() => {
    latest.current = {
      change: (next, thumbIndex) => {
        lastValues.current = next
        playNotch(next[thumbIndex])
        setCurrent(toValue(next))
      },
      commit: () => {
        onValueCommitted?.(toValue(lastValues.current))
        setSyncCount((count) => count + 1)
      },
    }
  })
  const emitChange = React.useCallback((next: number[], thumbIndex: number) => {
    latest.current.change(next, thumbIndex)
  }, [])
  const emitCommit = React.useCallback(() => {
    latest.current.commit()
  }, [])

  const gesture = React.useMemo(() => {
    const range = { min, max, step, minStepsBetweenValues }

    const getPosition = (x: number, y: number) => {
      "worklet"
      return isVertical ? length.value - y : x
    }

    const press = (position: number) => {
      "worklet"
      const geometry = { min, max, length: length.value, thumbSize }
      const target = getValueAtPosition(position, { ...geometry, step })
      const index = getClosestThumb(live.value, target)
      const center = getThumbCenter(live.value[index] ?? min, geometry)
      pressedIndex.value = index
      initialValues.value = live.value
      // Pressed on the knob, it stays under the finger instead of jumping.
      grabOffset.value =
        Math.abs(position - center) <= thumbSize / 2 ? position - center : 0
    }

    const move = (position: number) => {
      "worklet"
      const next = getValueAtPosition(position - grabOffset.value, {
        min,
        max,
        step,
        length: length.value,
        thumbSize,
      })
      const result = resolveThumbCollision(
        thumbCollisionBehavior,
        live.value,
        initialValues.value,
        pressedIndex.value,
        next,
        range
      )
      pressedIndex.value = result.thumbIndex
      if (sameValues(result.values, live.value)) return
      live.value = result.values
      runOnJS(emitChange)(result.values, result.thumbIndex)
    }

    const pan = Gesture.Pan()
      .enabled(!isDisabled)
      .onBegin((event) => {
        press(getPosition(event.x, event.y))
        held.value = withTiming(1, {
          duration: holdMs,
          easing: feedbackEasing,
        })
      })
      .onStart(() => {
        isDragging.value = true
      })
      .onUpdate((event) => {
        move(getPosition(event.x, event.y))
      })
      .onFinalize(() => {
        held.value = withTiming(0, {
          duration: letGoMs,
          easing: feedbackEasing,
        })
        if (!isDragging.value) return
        isDragging.value = false
        runOnJS(emitCommit)()
      })
    if (isVertical) {
      pan.activeOffsetY([-ACTIVE_OFFSET, ACTIVE_OFFSET])
      pan.failOffsetX([-FAIL_OFFSET, FAIL_OFFSET])
    } else {
      pan.activeOffsetX([-ACTIVE_OFFSET, ACTIVE_OFFSET])
      pan.failOffsetY([-FAIL_OFFSET, FAIL_OFFSET])
    }

    const tap = Gesture.Tap()
      .enabled(!isDisabled)
      .onEnd((event, isSuccess) => {
        if (!isSuccess) return
        const position = getPosition(event.x, event.y)
        press(position)
        move(position)
        runOnJS(emitCommit)()
      })

    return Gesture.Race(pan, tap)
  }, [
    emitChange,
    emitCommit,
    feedbackEasing,
    grabOffset,
    held,
    holdMs,
    initialValues,
    isDisabled,
    isDragging,
    isVertical,
    length,
    letGoMs,
    live,
    max,
    min,
    minStepsBetweenValues,
    pressedIndex,
    step,
    thumbCollisionBehavior,
    thumbSize,
  ])

  const rangeStyle = useAnimatedStyle(() => {
    const geometry = { min, max, length: length.value, thumbSize }
    const thumbs = shown.value
    const last = getThumbCenter(thumbs[thumbs.length - 1] ?? min, geometry)
    // One thumb fills from the start; a range fills between its ends.
    const first =
      thumbs.length > 1 ? getThumbCenter(thumbs[0] ?? min, geometry) : 0
    return isVertical
      ? { bottom: first, height: last - first }
      : { left: first, width: last - first }
  })

  const getThumbActionHandler =
    (index: number) => (event: AccessibilityActionEvent) => {
      if (isDisabled) return
      const amount =
        event.nativeEvent.actionName === "increment"
          ? step
          : event.nativeEvent.actionName === "decrement"
            ? -step
            : 0
      if (amount === 0) return
      const next = stepThumb(values, index, amount, thumbCollisionBehavior, {
        min,
        max,
        step,
        minStepsBetweenValues,
      })
      if (sameValues(next, values)) return
      playNotch(next[index])
      setCurrent(toValue(next))
      onValueCommitted?.(toValue(next))
    }

  const steps = showSteps ? getSliderSteps({ min, max, step, values }) : []

  // Grows the control across its axis to the target, and takes the same back from
  // the layout, so it still sits as an 18pt track.
  const slop = Math.max((MIN_TARGET - trackSize) / 2, 0)
  const targetStyle = isVertical
    ? { marginHorizontal: -slop, paddingHorizontal: slop }
    : { marginVertical: -slop, paddingVertical: slop }

  return (
    <View
      data-slot="slider"
      data-size={size}
      data-orientation={orientation}
      className={cn(
        "data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full",
        className
      )}
      {...props}
    >
      <GestureDetector gesture={gesture}>
        <View
          data-orientation={orientation}
          data-disabled={isDisabled}
          className="cn-slider relative w-full flex-row items-center data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col"
          style={targetStyle}
          onLayout={(event: LayoutChangeEvent) => {
            const { width, height } = event.nativeEvent.layout
            length.value = isVertical ? height : width
          }}
        >
          <View
            data-slot="slider-track"
            data-orientation={orientation}
            className="cn-slider-track relative grow overflow-hidden"
          >
            <Animated.View
              data-slot="slider-range"
              data-orientation={orientation}
              className="cn-slider-range absolute data-[orientation=horizontal]:inset-y-0 data-[orientation=vertical]:inset-x-0"
              style={rangeStyle}
            />
          </View>
          {steps.length > 0 && (
            <View
              data-slot="slider-steps"
              data-orientation={orientation}
              pointerEvents="none"
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              className="absolute inset-0 flex-row items-center data-[orientation=vertical]:flex-col"
            >
              {steps.map(({ value: stepValue }) => (
                <SliderStep
                  key={stepValue}
                  value={stepValue}
                  shown={shown}
                  length={length}
                  min={min}
                  max={max}
                  thumbSize={thumbSize}
                  isVertical={isVertical}
                  duration={holdMs}
                  easing={stepEasing}
                />
              ))}
            </View>
          )}
          {values.map((_, index) => (
            <SliderThumb
              key={index}
              index={index}
              count={values.length}
              shown={shown}
              pressedIndex={pressedIndex}
              held={held}
              length={length}
              min={min}
              max={max}
              thumbSize={thumbSize}
              isVertical={isVertical}
              isDisabled={isDisabled}
              now={values[index]}
              label={label}
              onAccessibilityAction={getThumbActionHandler(index)}
            />
          ))}
        </View>
      </GestureDetector>
    </View>
  )
}

function Slider({
  size = "default",
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  value?: number | readonly number[]
  defaultValue?: number | readonly number[]
  onValueChange?: (value: number | readonly number[]) => void
  /** When a drag or tap ends, with the value it landed on. */
  onValueCommitted?: (value: number | readonly number[]) => void
  min?: number
  max?: number
  step?: number
  minStepsBetweenValues?: number
  thumbCollisionBehavior?: SliderCollision
  orientation?: "horizontal" | "vertical"
  disabled?: boolean
  size?: "sm" | "default" | "lg"
  /** A dot on every value the thumb can land on. For coarse steps. */
  showSteps?: boolean
}) {
  // size="sm" pins the compact density and "lg" the spacious one; the knob's
  // numbers are read inside the scope.
  const { density } = useControlSize(size)
  return (
    <DensityScope density={density}>
      <SliderControl size={size} {...props} />
    </DensityScope>
  )
}

export { Slider }
