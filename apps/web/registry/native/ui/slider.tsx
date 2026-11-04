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
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import { useFeedback } from "@/registry/native/lib/feedback"
import { useFieldControl } from "@/registry/native/lib/field-model"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import {
  getClosestThumb,
  getThumbCenter,
  getThumbOffset,
  getValueAtPosition,
  resolveThumbCollision,
  sameValues,
  stepThumb,
  toSliderValues,
  type SliderCollision,
} from "@/registry/native/lib/slider-model"

// A vertical scroll under a horizontal slider, or the reverse, stays a scroll.
const ACTIVE_OFFSET = 8
const FAIL_OFFSET = 12
// The 18pt track keeps a finger-sized target.
const MIN_TARGET = 44

const ACCESSIBILITY_ACTIONS = [{ name: "increment" }, { name: "decrement" }]

function SliderThumb({
  index,
  count,
  live,
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
  live: SharedValue<number[]>
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
    const offset = getThumbOffset(live.value[index] ?? min, {
      min,
      max,
      length: length.value,
      thumbSize,
    })
    return {
      transform: [
        isVertical
          ? { translateY: Math.max(length.value - thumbSize - offset, 0) }
          : { translateX: offset },
      ],
    }
  })
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
      style={positionStyle}
    />
  )
}

function Slider({
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
  accessibilityLabel,
  "aria-label": ariaLabel,
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
}) {
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

  const thumbSize = parseNumber(useCSSVariable("--density-icon-16"), 16)
  const length = useSharedValue(0)

  // The thumbs follow this on the UI thread, so a drag never waits for a render.
  const live = useSharedValue(values)
  const pressedIndex = useSharedValue(0)
  const initialValues = useSharedValue(values)
  const grabOffset = useSharedValue(0)
  const isDragging = useSharedValue(false)

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

  const latest = React.useRef({
    change: (_next: number[]) => {},
    commit: () => {},
  })
  React.useEffect(() => {
    latest.current = {
      change: (next) => {
        lastValues.current = next
        feedback("notch")
        setCurrent(toValue(next))
      },
      commit: () => {
        onValueCommitted?.(toValue(lastValues.current))
        setSyncCount((count) => count + 1)
      },
    }
  })
  const emitChange = React.useCallback((next: number[]) => {
    latest.current.change(next)
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
      runOnJS(emitChange)(result.values)
    }

    const pan = Gesture.Pan()
      .enabled(!isDisabled)
      .onBegin((event) => {
        press(getPosition(event.x, event.y))
      })
      .onStart(() => {
        isDragging.value = true
      })
      .onUpdate((event) => {
        move(getPosition(event.x, event.y))
      })
      .onFinalize(() => {
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

    const slop = Math.max((MIN_TARGET - thumbSize - 2) / 2, 0)
    const hitSlop = isVertical ? { horizontal: slop } : { vertical: slop }
    return Gesture.Race(pan.hitSlop(hitSlop), tap.hitSlop(hitSlop))
  }, [
    emitChange,
    emitCommit,
    grabOffset,
    initialValues,
    isDisabled,
    isDragging,
    isVertical,
    length,
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
    const thumbs = live.value
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
      setCurrent(toValue(next))
      onValueCommitted?.(toValue(next))
    }

  return (
    <View
      data-slot="slider"
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
          {values.map((_, index) => (
            <SliderThumb
              key={index}
              index={index}
              count={values.length}
              live={live}
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

export { Slider }
