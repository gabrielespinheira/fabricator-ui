import * as React from "react"
import { StarIcon } from "@fabricator-ui/icons-react-native"
import { useControllableState } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { View, type AccessibilityActionEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useResolveClassNames } from "uniwind"

import {
  getRatingKeyValue,
  getRatingStarFill,
  getRatingValueAtPoint,
  getRatingValueText,
  snapRatingValue,
  type RatingStarSpan,
  type RatingStep,
} from "@/registry/fabricator/shared/lib/rating-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion } from "@/registry/native/lib/motion"

// A row of stars that holds a score. A tap sets the score under the finger,
// half a star at a time with step={0.5}, and a horizontal drag scrubs it with
// a notch each step; a vertical one scrolls. Read-only it's an image of the
// score, showing any fraction. The values are the website's (rating-model).

// A vertical scroll over the stars stays a scroll.
const ACTIVE_OFFSET = 4
const FAIL_OFFSET = 12
// The star under the finger lifts, as the website's hovered star does.
const ACTIVE_SCALE = 1.15
// A star the score reaches pops in from half size on the bounce spring.
const POP_FROM = 0.5

const ACCESSIBILITY_ACTIONS = [{ name: "increment" }, { name: "decrement" }]

// The root holds the fill colour (text) and its edge (border), read off for
// the icons: an SVG takes no class.
const ratingVariants = cva("cn-rating flex-row items-center self-start", {
  variants: {
    variant: {
      default: "cn-rating-variant-default",
      primary: "cn-rating-variant-primary",
      info: "cn-rating-variant-info",
      success: "cn-rating-variant-success",
      warning: "cn-rating-variant-warning",
      error: "cn-rating-variant-error",
    },
    size: {
      sm: "cn-rating-size-sm",
      default: "cn-rating-size-default",
      lg: "cn-rating-size-lg",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "default",
  },
})

// Each star's box, read off for the icon's size.
const ratingStarVariants = cva("cn-rating-star", {
  variants: {
    size: {
      sm: "cn-rating-star-size-sm",
      default: "cn-rating-star-size-default",
      lg: "cn-rating-star-size-lg",
    },
  },
  defaultVariants: { size: "default" },
})

// An empty star's colour, and its red while invalid.
const ratingStarEmptyVariants = cva("cn-rating-star-empty")
const ratingStarInvalidVariants = cva("cn-rating-star-empty-invalid")

type RatingProps = Omit<React.ComponentProps<typeof View>, "children"> &
  VariantProps<typeof ratingVariants> & {
    /** The score, from 0 to max. */
    value?: number
    defaultValue?: number
    onValueChange?: (value: number) => void
    /** When a tap, a drag or a screen reader's step ends, with the score. */
    onValueCommitted?: (value: number) => void
    /** How many stars. */
    max?: number
    /** 1 for whole stars, 0.5 for halves. */
    step?: RatingStep
    /** Shows the score, with any fraction, and takes no input. */
    readOnly?: boolean
    disabled?: boolean
    /** The form name, kept for parity: React Native has no form to submit. */
    name?: string
    /** What screen readers hear for a score. */
    getAriaValueText?: (value: number, max: number) => string
    "aria-label"?: string
    "aria-invalid"?: boolean
  }

type RatingColors = { fill: string; edge: string; empty: string }

function toColor(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback
}

function RatingStar({
  fill,
  isActive,
  size,
  iconSize,
  colors,
  onLayout,
}: {
  fill: number
  isActive: boolean
  size: VariantProps<typeof ratingStarVariants>["size"]
  iconSize: number
  colors: RatingColors
  onLayout: (span: RatingStarSpan) => void
}) {
  const motion = useMotion("bounce")
  const feedbackMotion = useMotion("feedback")
  const isStill = motion.isOff || motion.isReduced
  const isEmpty = fill === 0
  const pop = useSharedValue(isEmpty ? POP_FROM : 1)
  const lift = useSharedValue(1)

  React.useEffect(() => {
    if (isEmpty || isStill) {
      pop.set(isEmpty ? POP_FROM : 1)
      return
    }
    pop.set(POP_FROM)
    pop.set(
      withTiming(1, { duration: motion.enterMs, easing: motion.bounceEasing })
    )
  }, [isEmpty, isStill, motion, pop])

  React.useEffect(() => {
    const target = isActive && !isStill ? ACTIVE_SCALE : 1
    lift.set(
      withTiming(target, {
        duration: feedbackMotion.enterMs,
        easing: feedbackMotion.enterEasing,
      })
    )
  }, [feedbackMotion, isActive, isStill, lift])

  const starStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lift.get() }],
  }))
  const fillStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pop.get() }],
  }))

  const state =
    fill === 1
      ? "full"
      : fill === 0
        ? "empty"
        : fill === 0.5
          ? "half"
          : "partial"

  return (
    <Animated.View
      data-slot="rating-star"
      data-state={state}
      data-active={isActive}
      pointerEvents="none"
      className={cn(ratingStarVariants({ size }), "relative")}
      style={starStyle}
      onLayout={(event) => {
        const { x, width } = event.nativeEvent.layout
        onLayout({ start: x, end: x + width })
      }}
    >
      <View data-slot="rating-star-empty" className="absolute inset-0">
        <StarIcon size={iconSize} color={colors.empty} fill={colors.empty} />
      </View>
      <Animated.View
        data-slot="rating-star-fill"
        className="cn-rating-star-fill absolute inset-y-0 start-0"
        style={[{ width: `${fill * 100}%` }, fillStyle]}
      >
        <StarIcon size={iconSize} color={colors.edge} fill={colors.fill} />
      </Animated.View>
    </Animated.View>
  )
}

function Rating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  onValueCommitted,
  max = 5,
  step = 1,
  readOnly = false,
  disabled = false,
  name: _name,
  getAriaValueText = getRatingValueText,
  variant = "default",
  size = "default",
  className,
  accessibilityLabel,
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid = false,
  ...props
}: RatingProps) {
  const [rawValue = defaultValue, setValue] = useControllableState<number>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  // A read-only score keeps its fraction; one you set keeps to the step.
  const value = readOnly ? rawValue : snapRatingValue(rawValue, step, max)
  const label = accessibilityLabel ?? ariaLabel ?? "Rating"
  const valueText = getAriaValueText(value, max)
  const isInteractive = !readOnly && !disabled
  const feedback = useFeedback()
  const [isDragging, setIsDragging] = React.useState(false)

  const rootClassName = ratingVariants({ variant, size })
  const rootStyle = useResolveClassNames(rootClassName)
  const starStyle = useResolveClassNames(ratingStarVariants({ size }))
  const emptyStyle = useResolveClassNames(
    ariaInvalid ? ratingStarInvalidVariants() : ratingStarEmptyVariants()
  )
  const fillColor = toColor(rootStyle.color, "#fbbf24")
  const colors: RatingColors = {
    fill: fillColor,
    edge: toColor(rootStyle.borderColor, fillColor),
    empty: toColor(emptyStyle.color, "#80808033"),
  }
  const iconSize = typeof starStyle.width === "number" ? starStyle.width : 20

  // Where each star sits, and what the handlers read between renders.
  const spans = React.useRef<RatingStarSpan[]>([])
  const latest = React.useRef(value)
  React.useEffect(() => {
    latest.current = value
  }, [value])

  const change = React.useCallback(
    (next: number) => {
      if (next === latest.current) return
      latest.current = next
      feedback("notch", { pitch: 0.8 + (next / max) * 0.6 })
      setValue(next)
    },
    [feedback, max, setValue]
  )

  const gesture = React.useMemo(() => {
    const readValue = (x: number) =>
      getRatingValueAtPoint(x, spans.current, step)

    const pan = Gesture.Pan()
      .runOnJS(true)
      .enabled(isInteractive)
      .activeOffsetX([-ACTIVE_OFFSET, ACTIVE_OFFSET])
      .failOffsetY([-FAIL_OFFSET, FAIL_OFFSET])
      .onStart((event) => {
        setIsDragging(true)
        change(readValue(event.x))
      })
      .onUpdate((event) => change(readValue(event.x)))
      .onEnd(() => onValueCommitted?.(latest.current))
      .onFinalize(() => setIsDragging(false))

    const tap = Gesture.Tap()
      .runOnJS(true)
      .enabled(isInteractive)
      .onEnd((event, isSuccess) => {
        if (!isSuccess) return
        const next = readValue(event.x)
        change(next)
        onValueCommitted?.(next)
      })

    return Gesture.Race(pan, tap)
  }, [change, isInteractive, onValueCommitted, step])

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (!isInteractive) return
    const key =
      event.nativeEvent.actionName === "increment" ? "ArrowRight" : "ArrowLeft"
    const next = getRatingKeyValue(key, latest.current, { step, max })
    if (next === null) return
    change(next)
    onValueCommitted?.(next)
  }

  const starCount = Math.max(0, Math.ceil(max))
  const activeIndex = isDragging ? Math.ceil(value) - 1 : -1
  const stars = Array.from({ length: starCount }, (_, index) => (
    <RatingStar
      key={index}
      fill={getRatingStarFill(index, value)}
      isActive={index === activeIndex}
      size={size}
      iconSize={iconSize}
      colors={colors}
      onLayout={(span) => {
        spans.current[index] = span
        spans.current.length = starCount
      }}
    />
  ))

  if (readOnly) {
    return (
      <View
        data-slot="rating"
        data-variant={variant}
        data-size={size}
        data-readonly
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${label}: ${valueText}`}
        className={cn(rootClassName, className)}
        {...props}
      >
        {stars}
      </View>
    )
  }

  return (
    <GestureDetector gesture={gesture}>
      <View
        data-slot="rating"
        data-variant={variant}
        data-size={size}
        data-disabled={disabled}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={label}
        accessibilityValue={{ min: 0, max, now: value, text: valueText }}
        accessibilityActions={ACCESSIBILITY_ACTIONS}
        accessibilityState={{ disabled }}
        onAccessibilityAction={onAccessibilityAction}
        className={cn(rootClassName, className)}
        {...props}
      >
        {stars}
      </View>
    </GestureDetector>
  )
}

export { Rating, ratingVariants, type RatingProps }
