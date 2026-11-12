import * as React from "react"
import { useControllableState } from "@rn-primitives/hooks"
import { cn } from "cn"
import { Linking, View, type LayoutChangeEvent } from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"

import {
  getPreviewRailCardOffset,
  getPreviewRailIndexAtPoint,
  getPreviewRailLit,
  getPreviewRailTickScale,
  getPreviewRailValue,
  isPreviewRailDisabledAt,
  isPreviewRailExternalHref,
  isPreviewRailReleaseInside,
} from "@/registry/fabricator/shared/lib/preview-rail-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { useMotion, useSurfaceAnimation } from "@/registry/native/lib/motion"
import { StateFill } from "@/registry/native/lib/press-wash"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

// A rail of thin ticks, one per section. A finger takes the pointer's place:
// a press lights the tick under it and shows its card, a drag along the rail
// moves the light with a tick on each step, and lifting on the rail follows
// the lit item. With nothing pressed, the swell rests on the current item.
// The logic is the website's (preview-rail-model).

/** How far past the rail, in pt, a lifted finger still counts as on it. */
const RELEASE_SLACK = 24
/** Movement, in pt, that turns a press into a scrub. */
const SCRUB_DISTANCE = 4

const ACCESSIBILITY_ACTIONS = [{ name: "activate" }]

type PreviewRailItem = {
  value: string
  label: string
  /** Shown on the card under the label, and read as the tick's hint. */
  description?: React.ReactNode
  /** A URL with a scheme opens through `Linking`. In-page anchors and paths
   * have nowhere to go in an app: follow `onValueChange` instead. */
  href?: string
  target?: string
  rel?: string
  disabled?: boolean
}

type PreviewRailProps = Omit<React.ComponentProps<typeof View>, "children"> & {
  items: PreviewRailItem[]
  orientation?: "vertical" | "horizontal"
  /** Where the card sits: after a vertical rail, above a horizontal one. */
  side?: "start" | "end"
  /** The current item. */
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** The card's content. Defaults to the item's label and description. */
  renderPreview?: (item: PreviewRailItem) => React.ReactNode
  "aria-label"?: string
}

type Size = { width: number; height: number }

function getCardSide(
  orientation: PreviewRailProps["orientation"],
  side: NonNullable<PreviewRailProps["side"]>
) {
  if (orientation === "horizontal") return side === "start" ? "top" : "bottom"
  return side === "start" ? "left" : "right"
}

// Ticks grow towards the card.
const TICK_ORIGIN = {
  right: "left",
  left: "right",
  top: "bottom",
  bottom: "top",
} as const

function PreviewRailTick({
  item,
  orientation,
  scale,
  isLit,
  isCurrent,
  origin,
  onActivate,
}: {
  item: PreviewRailItem
  orientation: NonNullable<PreviewRailProps["orientation"]>
  scale: number
  isLit: boolean
  isCurrent: boolean
  origin: (typeof TICK_ORIGIN)[keyof typeof TICK_ORIGIN]
  onActivate: (item: PreviewRailItem) => void
}) {
  const { isOff, isReduced, enterMs, moveEasing } = useMotion("move")
  const isStill = isOff || isReduced
  const length = useSharedValue(scale)
  const isHorizontal = orientation === "horizontal"

  React.useEffect(() => {
    if (isStill) {
      length.set(scale)
      return
    }
    length.set(
      withTiming(scale, {
        duration: enterMs,
        easing: moveEasing,
        reduceMotion: ReduceMotion.Never,
      })
    )
  }, [scale, isStill, enterMs, moveEasing, length])

  const tickStyle = useAnimatedStyle(() =>
    isHorizontal
      ? { transform: [{ scaleY: length.value }] }
      : { transform: [{ scaleX: length.value }] }
  )

  return (
    <View
      data-slot="preview-rail-item"
      data-orientation={orientation}
      data-disabled={item.disabled ? "true" : undefined}
      accessible
      accessibilityRole={item.href === undefined ? "button" : "link"}
      accessibilityLabel={item.label}
      accessibilityHint={
        typeof item.description === "string" ? item.description : undefined
      }
      accessibilityState={{ selected: isCurrent, disabled: item.disabled }}
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      onAccessibilityAction={() => onActivate(item)}
      className={cn(
        "cn-preview-rail-item items-center justify-center data-[orientation=horizontal]:flex-col"
      )}
    >
      <Animated.View
        data-slot="preview-rail-tick"
        data-orientation={orientation}
        style={[{ transformOrigin: origin }, tickStyle]}
        className={cn("cn-preview-rail-tick overflow-hidden")}
      >
        <StateFill
          isOn={isLit || isCurrent}
          className="cn-preview-rail-tick-fill"
        />
      </Animated.View>
    </View>
  )
}

function PreviewRail({
  items,
  orientation = "vertical",
  side = orientation === "horizontal" ? "start" : "end",
  value: valueProp,
  defaultValue,
  onValueChange,
  renderPreview,
  className,
  accessibilityLabel,
  "aria-label": ariaLabel,
  ...props
}: PreviewRailProps) {
  const [requestedValue, setValue] = useControllableState<string | undefined>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: (next) => {
      if (next !== undefined) onValueChange?.(next)
    },
  })
  const feedback = useFeedback()
  const isHorizontal = orientation === "horizontal"
  const cardSide = getCardSide(orientation, side)
  const [pressed, setPressed] = React.useState<string | null>(null)
  const pressedRef = React.useRef<string | null>(null)
  const [listSize, setListSize] = React.useState<Size>({ width: 0, height: 0 })

  const value = getPreviewRailValue(items, requestedValue)
  const { litIndex, preview } = getPreviewRailLit(
    items,
    { pressed, hovered: null, focused: null },
    value
  )
  const previewIndex = items.findIndex((item) => item.value === preview)
  const previewItem = items[previewIndex]
  const length = isHorizontal ? listSize.width : listSize.height
  const step = length / Math.max(items.length, 1)

  const activate = React.useCallback(
    (item: PreviewRailItem) => {
      if (item.disabled) return
      setValue(item.value)
      if (item.href !== undefined && isPreviewRailExternalHref(item.href)) {
        void Linking.openURL(item.href)
      }
    },
    [setValue]
  )

  const press = React.useCallback(
    (point: { x: number; y: number }) => {
      const index = getPreviewRailIndexAtPoint(
        items,
        isHorizontal ? point.x : point.y,
        step
      )
      const next = items[index]?.value ?? null
      if (next !== null && next !== pressedRef.current) feedback("tick")
      pressedRef.current = next
      setPressed(next)
    },
    [items, isHorizontal, step, feedback]
  )

  const release = React.useCallback(
    (point: { x: number; y: number }) => {
      const item = items.find(
        (candidate) => candidate.value === pressedRef.current
      )
      const isOnEnabledTick =
        isPreviewRailReleaseInside(point, listSize, RELEASE_SLACK) &&
        !isPreviewRailDisabledAt(items, isHorizontal ? point.x : point.y, step)
      if (item && isOnEnabledTick) activate(item)
    },
    [items, listSize, isHorizontal, step, activate]
  )

  const clear = React.useCallback(() => {
    pressedRef.current = null
    setPressed(null)
  }, [])

  const gesture = React.useMemo(() => {
    const tap = Gesture.Tap()
      .runOnJS(true)
      .onBegin(press)
      .onEnd((event, isSuccess) => {
        if (isSuccess) release(event)
      })
      .onFinalize(clear)
    const scrub = Gesture.Pan()
      .runOnJS(true)
      .minDistance(SCRUB_DISTANCE)
      .shouldCancelWhenOutside(false)
      .onBegin(press)
      .onUpdate(press)
      .onEnd(release)
      .onFinalize(clear)
    return Gesture.Race(scrub, tap)
  }, [press, release, clear])

  // The card appears at its tick, then glides from tick to tick, never past
  // the rail's ends.
  const move = useMotion("move")
  const isStill = move.isOff || move.isReduced
  const [cardLength, setCardLength] = React.useState(0)
  const offset = useSharedValue(0)
  const shownIndexRef = React.useRef(-1)
  React.useEffect(() => {
    const shownIndex = shownIndexRef.current
    shownIndexRef.current = previewIndex
    if (previewIndex < 0) return
    const target = getPreviewRailCardOffset({
      index: previewIndex,
      step,
      count: items.length,
      cardLength,
    })
    const isGliding = shownIndex >= 0 && shownIndex !== previewIndex && !isStill
    offset.set(
      isGliding
        ? withTiming(target, {
            duration: move.enterMs,
            easing: move.moveEasing,
            reduceMotion: ReduceMotion.Never,
          })
        : target
    )
  }, [
    previewIndex,
    step,
    items.length,
    cardLength,
    isStill,
    move.enterMs,
    move.moveEasing,
    offset,
  ])

  const trackStyle = useAnimatedStyle(() =>
    isHorizontal
      ? { transform: [{ translateX: offset.value }] }
      : { transform: [{ translateY: offset.value }] }
  )
  // Beside the rail, on the card's side.
  const placement = {
    right: { top: 0, left: listSize.width },
    left: { top: 0, right: listSize.width },
    top: { left: 0, bottom: listSize.height },
    bottom: { left: 0, top: listSize.height },
  }[cardSide]
  const { entering, exiting, origin } = useSurfaceAnimation("popup", {
    side: cardSide,
  })
  const feedbackMotion = useMotion("feedback")
  const contentEntering =
    feedbackMotion.isOff || feedbackMotion.isReduced
      ? undefined
      : FadeIn.duration(feedbackMotion.enterMs)

  return (
    <View
      data-slot="preview-rail"
      data-orientation={orientation}
      role="navigation"
      accessibilityLabel={
        accessibilityLabel ?? ariaLabel ?? "Section navigation"
      }
      className={cn("cn-preview-rail relative z-10", className)}
      {...props}
    >
      <GestureDetector gesture={gesture}>
        <View
          data-slot="preview-rail-list"
          data-orientation={orientation}
          onLayout={(event: LayoutChangeEvent) => {
            const { width, height } = event.nativeEvent.layout
            setListSize({ width, height })
          }}
          className={cn(
            "cn-preview-rail-list flex-col data-[orientation=horizontal]:flex-row"
          )}
        >
          {items.map((item, index) => (
            <PreviewRailTick
              key={item.value}
              item={item}
              orientation={orientation}
              scale={getPreviewRailTickScale(index, litIndex)}
              isLit={index === litIndex}
              isCurrent={item.value === value}
              origin={TICK_ORIGIN[cardSide]}
              onActivate={activate}
            />
          ))}
        </View>
      </GestureDetector>
      <Animated.View
        data-slot="preview-rail-preview"
        data-side={cardSide}
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
        style={[placement, trackStyle]}
        className={cn("cn-preview-rail-preview absolute")}
      >
        {previewItem ? (
          <Animated.View
            data-slot="preview-rail-card"
            entering={entering}
            exiting={exiting}
            style={origin}
            onLayout={(event: LayoutChangeEvent) => {
              const { width, height } = event.nativeEvent.layout
              setCardLength(isHorizontal ? width : height)
            }}
            className={cn("cn-preview-rail-card")}
          >
            <Animated.View
              key={previewItem.value}
              entering={contentEntering}
              data-slot="preview-rail-content"
              className={cn("cn-preview-rail-content")}
            >
              {renderPreview ? (
                renderPreview(previewItem)
              ) : (
                <>
                  <Text
                    data-slot="preview-rail-title"
                    className="cn-preview-rail-title"
                  >
                    {previewItem.label}
                  </Text>
                  {previewItem.description ? (
                    <View data-slot="preview-rail-description">
                      <TextStyle className="cn-preview-rail-description">
                        {renderTextChildren(previewItem.description)}
                      </TextStyle>
                    </View>
                  ) : null}
                </>
              )}
            </Animated.View>
          </Animated.View>
        ) : null}
      </Animated.View>
    </View>
  )
}

export { PreviewRail, type PreviewRailItem, type PreviewRailProps }
