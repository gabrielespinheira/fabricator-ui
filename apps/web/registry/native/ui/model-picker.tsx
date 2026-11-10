import * as React from "react"
import { CheckIcon, IconProvider } from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import {
  getEffortHueShift,
  getEffortIndexAtPoint,
  getEffortKeyIndex,
  getEffortOffset,
  getEffortState,
} from "@/registry/fabricator/shared/lib/model-picker-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  shiftHue,
  toEffortFill,
} from "@/registry/native/lib/model-picker-color"
import { useMotion, usePressScale } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { PressWash, StateFill } from "@/registry/native/lib/press-wash"
import { getNotchPitch } from "@/registry/native/lib/slider-model"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// The model switcher's panel: an effort slider for the model in use, Auto and
// other routing tiles, and the models grouped by provider. It is the content of
// a Popover of your own, as on the website. A finger takes the pointer's place:
// rows and tiles light while pressed, and the effort slider takes a tap or a
// drag along its rail.

// The website's `max-h-[min(32rem,60dvh)]`.
const PANEL_MAX_HEIGHT = 512
const PANEL_VIEW_SHARE = 0.6

// A vertical scroll over the effort rail stays a scroll.
const ACTIVE_OFFSET = 8
const FAIL_OFFSET = 12
// The 24pt rail keeps a finger-sized target. Not with the gesture's hitSlop: on
// iOS a touch outside the view's bounds never reaches its recognizer.
const MIN_TARGET = 44
// The thumb under a finger, as the website's `active:scale-95`.
const THUMB_HELD_SCALE = 0.95

// The website's `size-3` for icons among a row's facts, which doesn't follow
// the density there either.
const META_ICON_SIZE = 12

const EFFORT_ACTIONS = [{ name: "increment" }, { name: "decrement" }]

// Muted until lit: pressed, selected or switched on.
const routeTextVariants = cva("cn-model-picker-route-text")
const routeLitTextVariants = cva("cn-model-picker-route-text-lit")
const itemTextVariants = cva("cn-model-picker-item-text")
const itemLitTextVariants = cva("cn-model-picker-item-text-lit")

// Read for their colours: the fill's at rest, and the info role the chosen
// effort turns from.
const effortFillVariants = cva("cn-model-picker-effort-fill")
const effortTintVariants = cva("cn-model-picker-effort-tint")
const effortLabelTintVariants = cva("cn-model-picker-effort-label-tint")

/** The panel, inside a popover's content: scrolls past its max height. */
function ModelPicker({
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  const { height } = useWindowDimensions()
  return (
    <ScrollView
      data-slot="model-picker"
      alwaysBounceVertical={false}
      keyboardShouldPersistTaps="handled"
      className={cn("cn-model-picker relative", className)}
      style={[
        { maxHeight: Math.min(PANEL_MAX_HEIGHT, height * PANEL_VIEW_SHARE) },
        style,
      ]}
      {...props}
    >
      <TextStyle className="cn-model-picker-text">
        {renderTextChildren(children)}
      </TextStyle>
    </ScrollView>
  )
}

/** A caption row at the top, such as "Select model" with a back button. */
function ModelPickerHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="model-picker-header"
      className={cn(
        "cn-model-picker-header shrink-0 flex-row items-center",
        className
      )}
      {...props}
    >
      <TextStyle className="cn-model-picker-header-text">
        {renderTextChildren(children)}
      </TextStyle>
    </View>
  )
}

/** Routing choices side by side above the models, such as Auto. */
function ModelPickerRoutes({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="model-picker-routes"
      className={cn("cn-model-picker-routes shrink-0 flex-row", className)}
      {...props}
    />
  )
}

/** The check at the end of a selected row or tile. */
function ModelPickerCheck({ selected }: { selected: boolean }) {
  const size = parseNumber(useCSSVariable("--density-icon-14"), 14)
  return (
    <View
      aria-hidden
      data-slot="model-picker-check"
      data-selected={selected}
      className="cn-model-picker-check shrink-0"
    >
      <TextStyle className="cn-model-picker-check-text">
        <CheckIcon size={size} />
      </TextStyle>
    </View>
  )
}

/**
 * A routing tile: its icon and label (the children), then a caption. Picked in
 * place of a model (`selected`), or checked on top of one with `aria-pressed`.
 */
function ModelPickerRoute({
  className,
  selected = false,
  caption,
  children,
  disabled,
  "aria-pressed": isPressed,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  /** Picked in place of a model. */
  selected?: boolean
  /** What the route does, under its label. */
  caption?: React.ReactNode
  /** Switched on beside a model, as an orchestrator is. */
  "aria-pressed"?: boolean
  children?: React.ReactNode
}) {
  const press = usePressScale()
  const [isPressedIn, setIsPressedIn] = React.useState(false)
  const feedback = useFeedback()
  const isToggle = isPressed !== undefined
  const isOn = selected || isPressed === true
  return (
    <Pressable
      data-slot="model-picker-route"
      data-selected={selected}
      data-pressed={isPressed === true}
      accessibilityRole={isToggle ? "togglebutton" : "button"}
      aria-selected={selected}
      aria-checked={isToggle ? isPressed : undefined}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      className={cn(
        "cn-model-picker-route relative flex-1 basis-0 overflow-hidden",
        className
      )}
      onPressIn={(event: GestureResponderEvent) => {
        press.onPressIn()
        setIsPressedIn(true)
        onPressIn?.(event)
      }}
      onPressOut={(event: GestureResponderEvent) => {
        press.onPressOut()
        setIsPressedIn(false)
        onPressOut?.(event)
      }}
      onPress={(event: GestureResponderEvent) => {
        if (isToggle) feedback(isPressed ? "unlatch" : "latch")
        else feedback("tap")
        onPress?.(event)
      }}
      {...props}
    >
      <StateFill isOn={isOn} className="cn-model-picker-route-fill" />
      <PressWash press={press} className="cn-model-picker-route-wash" />
      <TextStyle
        eases
        className={cn(
          routeTextVariants(),
          (isOn || isPressedIn) && routeLitTextVariants()
        )}
      >
        <View className="cn-model-picker-route-label min-w-0 flex-row items-center">
          <IconProvider strokeWidth={1.5}>
            {renderTextChildren(children)}
          </IconProvider>
          {selected ? (
            <View className="ms-auto">
              <ModelPickerCheck selected />
            </View>
          ) : null}
        </View>
        {caption ? (
          <Text
            data-slot="model-picker-route-caption"
            className="cn-model-picker-route-caption"
          >
            {caption}
          </Text>
        ) : null}
      </TextStyle>
    </Pressable>
  )
}

/** One provider's models, under its label. */
function ModelPickerGroup({
  className,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="model-picker-group"
      role="group"
      className={cn("cn-model-picker-group flex-col", className)}
      {...props}
    />
  )
}

function ModelPickerGroupLabel({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="model-picker-group-label"
      role="heading"
      className={cn(
        "cn-model-picker-group-label shrink-0 flex-row items-center",
        className
      )}
      {...props}
    >
      <TextStyle className="cn-model-picker-group-label-text">
        {renderTextChildren(children)}
      </TextStyle>
    </View>
  )
}

/** One model: its name, then `ModelPickerItemMeta`, then the check. */
function ModelPickerItem({
  className,
  selected = false,
  children,
  disabled,
  onPress,
  onPressIn,
  onPressOut,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> & {
  /** The model in use: tinted, with a check at the end. */
  selected?: boolean
  children?: React.ReactNode
}) {
  const press = usePressScale()
  const [isPressedIn, setIsPressedIn] = React.useState(false)
  const feedback = useFeedback()
  return (
    <Pressable
      data-slot="model-picker-item"
      data-selected={selected}
      role="button"
      aria-selected={selected}
      aria-disabled={disabled ?? undefined}
      disabled={disabled}
      className={cn(
        "cn-model-picker-item relative min-h-11 w-full flex-row items-center overflow-hidden",
        className
      )}
      onPressIn={(event: GestureResponderEvent) => {
        press.onPressIn()
        setIsPressedIn(true)
        onPressIn?.(event)
      }}
      onPressOut={(event: GestureResponderEvent) => {
        press.onPressOut()
        setIsPressedIn(false)
        onPressOut?.(event)
      }}
      onPress={(event: GestureResponderEvent) => {
        feedback("tap")
        onPress?.(event)
      }}
      {...props}
    >
      <StateFill isOn={selected} className="cn-model-picker-item-fill" />
      <PressWash press={press} className="cn-model-picker-item-wash" />
      <TextStyle
        eases
        className={cn(
          itemTextVariants(),
          (selected || isPressedIn) && itemLitTextVariants()
        )}
      >
        {renderTextChildren(children)}
        <ModelPickerCheck selected={selected} />
      </TextStyle>
    </Pressable>
  )
}

/** The model's name, cut to the room it has. */
function ModelPickerItemName({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="model-picker-item-name"
      numberOfLines={1}
      className={cn("min-w-0 flex-1", className)}
      {...props}
    />
  )
}

/** Quiet facts at the end of a row: Default, the context window, a fast speed. */
function ModelPickerItemMeta({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="model-picker-item-meta"
      className={cn(
        "cn-model-picker-item-meta shrink-0 flex-row items-center",
        className
      )}
      {...props}
    >
      <TextStyle className="cn-model-picker-item-meta-text">
        <IconProvider size={META_ICON_SIZE}>
          {renderTextChildren(children)}
        </IconProvider>
      </TextStyle>
    </View>
  )
}

type ModelPickerEffortLevel = { value: string; label: string }

/**
 * Reasoning effort for the model in use: a slider whose fill warms from blue
 * toward violet as the effort rises, the top level glowing. The model's button
 * sits above it, with the level's name across from it. A tap picks the nearest
 * level and a drag previews each one it crosses, taken when the finger lifts.
 */
function ModelPickerEffort({
  className,
  levels,
  value,
  onValueChange,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  /** The model's levels, lowest first. */
  levels: readonly ModelPickerEffortLevel[]
  /** The level in use. Without one, the slider rests in the middle and reads "Default". */
  value?: string | null
  onValueChange?: (value: string) => void
  /** The model button over the slider, which opens the model list. */
  children?: React.ReactNode
}) {
  const [preview, setPreview] = React.useState<number | null>(null)
  const [isHeld, setIsHeld] = React.useState(false)
  const [width, setWidth] = React.useState(0)
  const count = levels.length
  const { index, isChosen, isPeak } = getEffortState({
    count,
    chosenIndex: levels.findIndex((level) => level.value === value),
    preview,
  })
  const level = levels[index]
  const label = isChosen ? level?.label : "Default"
  const shift = getEffortHueShift(index, count)
  const feedback = useFeedback()

  const thumb = parseNumber(useCSSVariable("--density-24"), 24)
  const slop = Math.max((MIN_TARGET - thumb) / 2, 0)

  // The website turns the info colours' hue in CSS; here it's done on the
  // colours the theme resolves.
  const { backgroundColor: restColor } =
    useResolveClassNames(effortFillVariants())
  const { backgroundColor: infoColor } =
    useResolveClassNames(effortTintVariants())
  const { color: infoTextColor } = useResolveClassNames(
    effortLabelTintVariants()
  )
  const tint =
    typeof infoColor === "string" ? toEffortFill(infoColor, shift) : null
  const fillColor = isChosen
    ? (tint ?? undefined)
    : typeof restColor === "string"
      ? restColor
      : undefined
  const labelColor =
    isChosen && typeof infoTextColor === "string"
      ? (shiftHue(infoTextColor, shift) ?? undefined)
      : undefined

  // The thumb steps between levels on the feedback timing; with Reduce Motion
  // it moves at once, as on the website. The colours still fade.
  const motion = useMotion("feedback")
  const stepMs = motion.isReduced ? 0 : motion.enterMs
  const offset = useSharedValue(0)
  const scale = useSharedValue(1)
  const isMeasured = React.useRef(false)
  React.useEffect(() => {
    const target = getEffortOffset({ index, count, width, thumb })
    if (!isMeasured.current) {
      if (width > 0) isMeasured.current = true
      offset.set(target)
      return
    }
    offset.set(
      withTiming(target, {
        duration: stepMs,
        easing: motion.feedbackEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [count, index, motion.feedbackEasing, offset, stepMs, thumb, width])
  React.useEffect(() => {
    scale.set(
      withTiming(isHeld && !motion.isReduced ? THUMB_HELD_SCALE : 1, {
        duration: motion.enterMs,
        easing: motion.feedbackEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [isHeld, motion.enterMs, motion.feedbackEasing, motion.isReduced, scale])

  const colorConfig = React.useMemo(
    () => ({
      duration: motion.enterMs,
      easing: motion.feedbackEasing,
      reduceMotion: ReduceMotion.Never,
    }),
    [motion.enterMs, motion.feedbackEasing]
  )
  const fillStyle = useAnimatedStyle(() => ({
    width: offset.value + thumb,
    ...(fillColor === undefined
      ? {}
      : { backgroundColor: withTiming(fillColor, colorConfig) }),
  }))
  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }, { scale: scale.value }],
  }))

  // Each level the shown one reaches plays a notch, rising with the effort.
  const shown = React.useRef(index)
  React.useEffect(() => {
    shown.current = index
  }, [index])

  const latest = React.useRef({
    show: (_next: number) => {},
    commit: (_next: number) => {},
  })
  React.useEffect(() => {
    const notch = (next: number) => {
      if (next === shown.current) return
      shown.current = next
      feedback("notch", {
        pitch: getNotchPitch(next, { min: 0, max: count - 1 }),
      })
    }
    latest.current = {
      show: (next) => {
        notch(next)
        setPreview(next)
      },
      commit: (next) => {
        notch(next)
        setPreview(null)
        const picked = levels[next]
        if (picked && picked.value !== value) onValueChange?.(picked.value)
      },
    }
  })

  const gesture = React.useMemo(() => {
    const indexAt = (x: number) =>
      getEffortIndexAtPoint({ x, left: 0, width, thumb, count })
    const pan = Gesture.Pan()
      .runOnJS(true)
      .activeOffsetX([-ACTIVE_OFFSET, ACTIVE_OFFSET])
      .failOffsetY([-FAIL_OFFSET, FAIL_OFFSET])
      .onBegin(() => setIsHeld(true))
      .onStart((event) => latest.current.show(indexAt(event.x)))
      .onUpdate((event) => latest.current.show(indexAt(event.x)))
      .onEnd((event, isSuccess) => {
        if (isSuccess) latest.current.commit(indexAt(event.x))
      })
      .onFinalize((_event, isSuccess) => {
        setIsHeld(false)
        if (!isSuccess) setPreview(null)
      })
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onBegin(() => setIsHeld(true))
      .onEnd((event, isSuccess) => {
        if (isSuccess) latest.current.commit(indexAt(event.x))
      })
      .onFinalize(() => setIsHeld(false))
    return Gesture.Race(pan, tap)
  }, [count, thumb, width])

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const key =
      event.nativeEvent.actionName === "increment" ? "ArrowRight" : "ArrowLeft"
    const next = getEffortKeyIndex(key, index, count)
    if (next !== null) latest.current.commit(next)
  }

  if (count === 0) return null

  return (
    <View
      data-slot="model-picker-effort"
      data-chosen={isChosen}
      data-peak={isPeak}
      className={cn("cn-model-picker-effort flex-col", className)}
      {...props}
    >
      <View className="flex-row items-center justify-between gap-2">
        {renderTextChildren(children)}
        <TextStyle eases>
          <Text
            data-slot="model-picker-effort-label"
            data-chosen={isChosen}
            className="cn-model-picker-effort-label shrink-0"
            style={labelColor === undefined ? undefined : { color: labelColor }}
          >
            {label}
          </Text>
        </TextStyle>
      </View>
      <GestureDetector gesture={gesture}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Reasoning effort"
          accessibilityValue={{
            min: 0,
            max: count - 1,
            now: index,
            text: label,
          }}
          accessibilityActions={EFFORT_ACTIONS}
          onAccessibilityAction={onAccessibilityAction}
          style={{ marginVertical: -slop, paddingVertical: slop }}
        >
          <View
            data-slot="model-picker-effort-track"
            className="cn-model-picker-effort-track relative flex-row items-center"
            onLayout={(event: LayoutChangeEvent) => {
              setWidth(event.nativeEvent.layout.width)
            }}
          >
            <View
              aria-hidden
              data-slot="model-picker-effort-rail"
              className="cn-model-picker-effort-rail absolute inset-x-0 overflow-hidden"
            >
              <Animated.View
                data-slot="model-picker-effort-fill"
                className={cn(
                  effortFillVariants(),
                  "absolute inset-y-0 start-0"
                )}
                style={fillStyle}
              />
              {levels.map((step, at) => (
                <View
                  key={step.value}
                  data-slot="model-picker-effort-step"
                  data-reached={at <= index}
                  className="cn-model-picker-effort-step absolute top-1/2 overflow-hidden"
                  style={{
                    left:
                      getEffortOffset({ index: at, count, width, thumb }) +
                      thumb / 2,
                  }}
                >
                  <StateFill
                    isOn={at <= index}
                    data-chosen={isChosen}
                    className="cn-model-picker-effort-step-reached"
                  />
                </View>
              ))}
            </View>
            <Animated.View
              aria-hidden
              data-slot="model-picker-effort-thumb"
              className="cn-model-picker-effort-thumb absolute start-0 z-10"
              style={thumbStyle}
            />
          </View>
        </View>
      </GestureDetector>
    </View>
  )
}

/** A labelled control under the panel, ruled off from what's above: speed, permissions. */
function ModelPickerSetting({
  className,
  label,
  children,
  ...props
}: React.ComponentProps<typeof View> & { label: React.ReactNode }) {
  return (
    <View
      data-slot="model-picker-setting"
      className={cn(
        "cn-model-picker-setting flex-row items-center justify-between",
        className
      )}
      {...props}
    >
      <Text className="cn-model-picker-setting-label shrink-0">{label}</Text>
      {renderTextChildren(children)}
    </View>
  )
}

export {
  ModelPicker,
  ModelPickerHeader,
  ModelPickerRoutes,
  ModelPickerRoute,
  ModelPickerGroup,
  ModelPickerGroupLabel,
  ModelPickerItem,
  ModelPickerItemName,
  ModelPickerItemMeta,
  ModelPickerEffort,
  ModelPickerSetting,
  getEffortHueShift,
  getEffortKeyIndex,
  getEffortIndexAtPoint,
  type ModelPickerEffortLevel,
}
