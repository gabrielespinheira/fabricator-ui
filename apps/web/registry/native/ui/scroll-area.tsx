import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { LinearGradient } from "expo-linear-gradient"
import { ScrollView, View } from "react-native"
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import { parseNumber } from "@/registry/native/lib/motion-tokens"
import {
  getFadeOpacity,
  withAlpha,
} from "@/registry/native/lib/scroll-fade-model"
import { renderTextChildren } from "@/registry/native/ui/text"

// Native scrolling, with the edges faded where there is more to scroll. Touch
// keeps the platform's own scroll indicators, so `ScrollBar` draws nothing: it's
// here so the website's markup works, and a horizontal one sets the axis.

const fadeColorVariants = cva("cn-scroll-area-fade-color")

function ScrollBar(_props: {
  className?: string
  orientation?: "vertical" | "horizontal"
}) {
  return null
}

function EdgeFade({
  edge,
  isHorizontal,
  color,
  distance,
  size,
}: {
  edge: "start" | "end"
  isHorizontal: boolean
  color: string
  distance: SharedValue<number>
  size: number
}) {
  const style = useAnimatedStyle(() => ({
    opacity: getFadeOpacity(distance.value, size),
  }))
  const towards = isHorizontal ? { x: 1, y: 0 } : { x: 0, y: 1 }
  return (
    <Animated.View
      pointerEvents="none"
      data-horizontal={isHorizontal}
      data-edge={edge}
      className="cn-scroll-area-fade absolute"
      style={style}
    >
      <LinearGradient
        colors={
          edge === "start"
            ? [color, withAlpha(color, 0)]
            : [withAlpha(color, 0), color]
        }
        start={{ x: 0, y: 0 }}
        end={towards}
        style={{ flex: 1 }}
      />
    </Animated.View>
  )
}

function ScrollArea({
  className,
  children,
  horizontal,
  fadeColor,
  onLayout,
  onContentSizeChange,
  ...props
}: Omit<React.ComponentProps<typeof ScrollView>, "onScroll"> & {
  /** What's behind the area: the fade paints over the content in this colour. */
  fadeColor?: string
}) {
  const parts = React.Children.toArray(children)
  const isScrollBar = (part: React.ReactNode) =>
    React.isValidElement(part) && part.type === ScrollBar
  const hasHorizontalBar = parts.some(
    (part) =>
      isScrollBar(part) &&
      React.isValidElement<{ orientation?: string }>(part) &&
      part.props.orientation === "horizontal"
  )
  const isHorizontal = Boolean(horizontal ?? hasHorizontalBar)

  const { color: themeColor } = useResolveClassNames(fadeColorVariants())
  const color =
    fadeColor ?? (typeof themeColor === "string" ? themeColor : "transparent")
  const fadeSize = parseNumber(useCSSVariable("--density-24"), 24)

  const offset = useSharedValue(0)
  const viewport = useSharedValue(0)
  const content = useSharedValue(0)
  const fromStart = useSharedValue(0)
  const toEnd = useSharedValue(0)

  const updateEdges = (nextOffset: number) => {
    "worklet"
    fromStart.value = nextOffset
    toEnd.value = content.value - viewport.value - nextOffset
  }
  const onScroll = useAnimatedScrollHandler((event) => {
    offset.value = isHorizontal ? event.contentOffset.x : event.contentOffset.y
    updateEdges(offset.value)
  })

  return (
    <View
      data-slot="scroll-area"
      className={cn("cn-scroll-area relative overflow-hidden", className)}
    >
      <Animated.ScrollView
        data-slot="scroll-area-viewport"
        horizontal={isHorizontal}
        scrollEventThrottle={16}
        nestedScrollEnabled
        onScroll={onScroll}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout
          viewport.value = isHorizontal ? width : height
          updateEdges(offset.value)
          onLayout?.(event)
        }}
        onContentSizeChange={(width, height) => {
          content.value = isHorizontal ? width : height
          updateEdges(offset.value)
          onContentSizeChange?.(width, height)
        }}
        className="cn-scroll-area-viewport size-full"
        {...props}
      >
        {renderTextChildren(parts.filter((part) => !isScrollBar(part)))}
      </Animated.ScrollView>
      <EdgeFade
        edge="start"
        isHorizontal={isHorizontal}
        color={color}
        distance={fromStart}
        size={fadeSize}
      />
      <EdgeFade
        edge="end"
        isHorizontal={isHorizontal}
        color={color}
        distance={toEnd}
        size={fadeSize}
      />
    </View>
  )
}

export { ScrollArea, ScrollBar }
