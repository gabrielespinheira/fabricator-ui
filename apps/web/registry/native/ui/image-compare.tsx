import * as React from "react"
import {
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  View,
  type AccessibilityActionEvent,
  type LayoutChangeEvent,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import Svg, { ClipPath, Defs, Path, Image as SvgImage } from "react-native-svg"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import {
  createImageCompareMotion,
  getImageCompareCurve,
  getImageCompareKeyValue,
  getImageCompareLabelOpacity,
  getImageCompareMaxBend,
  getImageCompareNotch,
  getImageComparePosition,
  getImageCompareReleaseValue,
  getImageCompareValueAtPoint,
  getImageCompareValueText,
  isImageCompareSettled,
  stepImageCompareMotion,
  type ImageCompareMotionMode,
} from "@/registry/fabricator/shared/lib/image-compare-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { Text, TextStyle } from "@/registry/native/ui/text"

// Two pictures of the same scene in one frame, split by a line you drag. The
// line is jelly: its ends chase the knob on a soft spring and the "before"
// picture is cut along the same curve. A tap glides the knob there; a flick
// sends it to that edge. The physics is the website's (image-compare-model),
// run on the UI thread, so a drag never waits for JavaScript.
//
// Both pictures are drawn by one SVG with the same cover crop, so the halves
// line up (the website's object-cover); the "before" one is clipped by the
// curve.

// A vertical scroll over the pictures stays a scroll.
const ACTIVE_OFFSET = 8
const FAIL_OFFSET = 12
// The line is 2pt, on a 6pt band at a quarter of its colour for the glow.
const LINE_WIDTH = 2
const GLOW_WIDTH = 6

const ACCESSIBILITY_ACTIONS = [{ name: "increment" }, { name: "decrement" }]

const AnimatedPath = Animated.createAnimatedComponent(Path)

// The line's colour, read off the style map for the SVG to stroke with.
const imageCompareLineVariants = cva("cn-image-compare-line")

type ImageCompareProps = Omit<React.ComponentProps<typeof View>, "children"> & {
  beforeSrc: string
  afterSrc: string
  beforeAlt?: string
  afterAlt?: string
  /** Names the "before" picture on its label and for screen readers. */
  beforeLabel?: string
  afterLabel?: string
  /** Show the labels over the pictures. */
  hasLabels?: boolean
  /** The share of the frame the "before" picture holds, from 0 to 100. */
  value?: number
  defaultValue?: number
  onValueChange?: (value: number) => void
  /** When a drag, a tap or a screen reader's step ends, with the value it landed on. */
  onValueCommitted?: (value: number) => void
  /** How far a screen reader's step moves the line, and where a drag notches. */
  step?: number
  disabled?: boolean
  "aria-label"?: string
}

function ImageCompare({
  beforeSrc,
  afterSrc,
  beforeAlt = "",
  afterAlt = "",
  beforeLabel = "Before",
  afterLabel = "After",
  hasLabels = true,
  value: valueProp,
  defaultValue = 50,
  onValueChange,
  onValueCommitted,
  step = 10,
  disabled = false,
  className,
  onLayout,
  accessibilityLabel,
  "aria-label": ariaLabel,
  ...props
}: ImageCompareProps) {
  const [value = defaultValue, setValue] = useControllableState<number>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const label = accessibilityLabel ?? ariaLabel ?? "Compare images"
  const feedback = useFeedback()
  const clipId = `image-compare-${React.useId().replace(/:/g, "")}`

  const lineStyle = useResolveClassNames(imageCompareLineVariants())
  const lineColor =
    typeof lineStyle.color === "string" ? lineStyle.color : "white"

  // Glides and the jelly stop with Reduce Motion or motion off; a slower
  // speed stretches them, as --motion-scale does on the website.
  const {
    isOff,
    isReduced,
    enterMs: holdMs,
    feedbackEasing,
  } = useMotion("feedback")
  const isStill = isOff || isReduced
  const [scaleToken, iconToken] = useCSSVariable([
    "--motion-scale",
    "--density-icon-16",
  ])
  const motionScale = parseNumber(scaleToken, 1) || 1
  const iconSize = parseNumber(iconToken, 16)

  const width = useSharedValue(0)
  const height = useSharedValue(0)
  const target = useSharedValue(value)
  const mode = useSharedValue<ImageCompareMotionMode>("glide")
  const motion = useSharedValue(createImageCompareMotion(0))
  const isDragging = useSharedValue(false)
  const held = useSharedValue(0)
  const labelCenters = useSharedValue({ before: 0, after: 0 })

  useFrameCallback((frame) => {
    const frameWidth = width.get()
    if (!frameWidth) return
    const position = getImageComparePosition(target.get(), frameWidth)
    const current = motion.get()
    if (isStill || isImageCompareSettled(current, position)) {
      if (current.knob !== position || current.ends !== position) {
        motion.set(createImageCompareMotion(position))
      }
      return
    }
    motion.set(
      stepImageCompareMotion(current, {
        target: position,
        mode: mode.get(),
        delta: (frame.timeSincePreviousFrame ?? 16) / 1000 / motionScale,
        maxBend: getImageCompareMaxBend(frameWidth, height.get()),
      })
    )
  })

  // A new value from the app, a tap or a screen reader glides there. A drag
  // moves the target itself, on the UI thread.
  React.useEffect(() => {
    if (isDragging.get()) return
    target.set(value)
    mode.set("glide")
  }, [isDragging, mode, target, value])

  const latest = React.useRef({ value, notch: -1 })
  React.useEffect(() => {
    latest.current.value = value
  }, [value])
  const change = React.useCallback(
    (next: number, shouldNotch: boolean) => {
      const notch = getImageCompareNotch(next, step)
      if (shouldNotch && notch.index !== latest.current.notch) {
        feedback("notch", { pitch: notch.pitch })
      }
      latest.current.notch = notch.index
      setValue(next)
    },
    [feedback, setValue, step]
  )
  const commit = React.useCallback(
    (next: number) => {
      change(next, true)
      onValueCommitted?.(next)
    },
    [change, onValueCommitted]
  )

  const gesture = React.useMemo(() => {
    const readValue = (x: number) => {
      "worklet"
      return getImageCompareValueAtPoint(x, width.get())
    }

    const pan = Gesture.Pan()
      .enabled(!disabled)
      .activeOffsetX([-ACTIVE_OFFSET, ACTIVE_OFFSET])
      .failOffsetY([-FAIL_OFFSET, FAIL_OFFSET])
      .onStart((event) => {
        isDragging.set(true)
        mode.set("drag")
        held.set(withTiming(1, { duration: holdMs, easing: feedbackEasing }))
        const next = readValue(event.x)
        target.set(next)
        runOnJS(change)(next, true)
      })
      .onUpdate((event) => {
        const next = readValue(event.x)
        if (next === target.get()) return
        target.set(next)
        runOnJS(change)(next, true)
      })
      .onEnd((event) => {
        const next = getImageCompareReleaseValue(target.get(), event.velocityX)
        mode.set("glide")
        target.set(next)
        runOnJS(commit)(next)
      })
      .onFinalize(() => {
        if (!isDragging.get()) return
        isDragging.set(false)
        mode.set("glide")
        held.set(withTiming(0, { duration: holdMs, easing: feedbackEasing }))
      })

    const tap = Gesture.Tap()
      .enabled(!disabled)
      .onEnd((event, isSuccess) => {
        if (!isSuccess) return
        const next = readValue(event.x)
        mode.set("glide")
        target.set(next)
        runOnJS(commit)(next)
      })

    return Gesture.Race(pan, tap)
  }, [
    change,
    commit,
    disabled,
    feedbackEasing,
    held,
    holdMs,
    isDragging,
    mode,
    target,
    width,
  ])

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const key =
      event.nativeEvent.actionName === "increment" ? "ArrowRight" : "ArrowLeft"
    const next = getImageCompareKeyValue(key, latest.current.value, step)
    if (next === null || disabled) return
    commit(next)
  }

  const clipProps = useAnimatedProps(() => {
    const { knob, ends } = motion.get()
    return { d: getImageCompareCurve(knob, ends, height.get()).clip }
  })
  const lineProps = useAnimatedProps(() => {
    const { knob, ends } = motion.get()
    return { d: getImageCompareCurve(knob, ends, height.get()).line }
  })
  const handleStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: motion.get().knob },
      { scale: 1 - held.get() * 0.1 },
    ],
  }))
  const beforeLabelStyle = useAnimatedStyle(() => ({
    opacity: getImageCompareLabelOpacity(
      "before",
      motion.get().knob,
      labelCenters.get().before
    ),
  }))
  const afterLabelStyle = useAnimatedStyle(() => ({
    opacity: getImageCompareLabelOpacity(
      "after",
      motion.get().knob,
      labelCenters.get().after
    ),
  }))

  const measureLabel =
    (side: "before" | "after") => (event: LayoutChangeEvent) => {
      const { x, width: labelWidth } = event.nativeEvent.layout
      labelCenters.set({ ...labelCenters.get(), [side]: x + labelWidth / 2 })
    }

  return (
    <GestureDetector gesture={gesture}>
      <View
        data-slot="image-compare"
        data-disabled={disabled}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{
          min: 0,
          max: 100,
          now: Math.round(value),
          text: getImageCompareValueText(value, beforeLabel, afterLabel),
        }}
        accessibilityActions={ACCESSIBILITY_ACTIONS}
        accessibilityState={{ disabled }}
        onAccessibilityAction={onAccessibilityAction}
        className={cn("cn-image-compare relative overflow-hidden", className)}
        onLayout={(event) => {
          const layout = event.nativeEvent.layout
          width.set(layout.width)
          height.set(layout.height)
          onLayout?.(event)
        }}
        {...props}
      >
        <Svg
          data-slot="image-compare-before"
          width="100%"
          height="100%"
          pointerEvents="none"
          className="absolute inset-0"
        >
          <Defs>
            <ClipPath id={clipId}>
              <AnimatedPath animatedProps={clipProps} />
            </ClipPath>
          </Defs>
          <SvgImage
            data-slot="image-compare-image"
            data-side="after"
            href={{ uri: afterSrc }}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid slice"
            accessibilityLabel={afterAlt}
          />
          <SvgImage
            data-slot="image-compare-image"
            data-side="before"
            href={{ uri: beforeSrc }}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            accessibilityLabel={beforeAlt}
          />
          <AnimatedPath
            animatedProps={lineProps}
            fill="none"
            stroke={lineColor}
            strokeOpacity={0.25}
            strokeWidth={GLOW_WIDTH}
          />
          <AnimatedPath
            data-slot="image-compare-line"
            animatedProps={lineProps}
            fill="none"
            stroke={lineColor}
            strokeWidth={LINE_WIDTH}
          />
        </Svg>
        {hasLabels && (
          <>
            <Animated.View
              data-slot="image-compare-label"
              data-side="before"
              pointerEvents="none"
              className="cn-image-compare-label absolute"
              style={beforeLabelStyle}
              onLayout={measureLabel("before")}
            >
              <Text className="cn-image-compare-label-text" numberOfLines={1}>
                {beforeLabel}
              </Text>
            </Animated.View>
            <Animated.View
              data-slot="image-compare-label"
              data-side="after"
              pointerEvents="none"
              className="cn-image-compare-label absolute"
              style={afterLabelStyle}
              onLayout={measureLabel("after")}
            >
              <Text className="cn-image-compare-label-text" numberOfLines={1}>
                {afterLabel}
              </Text>
            </Animated.View>
          </>
        )}
        <View
          pointerEvents="none"
          className="absolute inset-y-0 left-0 w-0 items-center justify-center overflow-visible"
        >
          <Animated.View
            data-slot="image-compare-handle"
            className="cn-image-compare-handle flex-row items-center justify-center"
            style={handleStyle}
          >
            <TextStyle className="cn-image-compare-handle-icon">
              <ChevronLeftIcon
                size={iconSize}
                strokeWidth={2.25}
                style={{ marginRight: -2 }}
              />
              <ChevronRightIcon
                size={iconSize}
                strokeWidth={2.25}
                style={{ marginLeft: -2 }}
              />
            </TextStyle>
          </Animated.View>
        </View>
      </View>
    </GestureDetector>
  )
}

export { ImageCompare, type ImageCompareProps }
