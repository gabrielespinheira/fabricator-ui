import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { View, type GestureResponderEvent } from "react-native"
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated"
import Svg, { Path, Rect } from "react-native-svg"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import {
  BOT_FACE_SIZES,
  clampBotFaceGaze,
  getBotFaceBlink,
  getBotFaceGaze,
  getBotFaceIdleGaze,
  getBotFacePath,
  getBotFacePhase,
  type BotFaceColor,
  type BotFaceEyes,
  type BotFaceGaze,
  type BotFaceShape,
  type BotFaceSize,
} from "@/registry/fabricator/shared/lib/bot-face-model"
import { useMotion } from "@/registry/native/lib/motion"

const botFaceVariants = cva("cn-bot-face", {
  variants: {
    color: {
      primary: "cn-bot-face-color-primary",
      secondary: "cn-bot-face-color-secondary",
      info: "cn-bot-face-color-info",
      success: "cn-bot-face-color-success",
      warning: "cn-bot-face-color-warning",
      destructive: "cn-bot-face-color-destructive",
      neutral: "cn-bot-face-color-neutral",
      blue: "cn-bot-face-color-blue",
      indigo: "cn-bot-face-color-indigo",
      violet: "cn-bot-face-color-violet",
      pink: "cn-bot-face-color-pink",
      red: "cn-bot-face-color-red",
      orange: "cn-bot-face-color-orange",
      amber: "cn-bot-face-color-amber",
      green: "cn-bot-face-color-green",
      teal: "cn-bot-face-color-teal",
    },
  },
})

function getBotFaceEyeToken(color: BotFaceColor) {
  if (
    color === "primary" ||
    color === "secondary" ||
    color === "info" ||
    color === "success" ||
    color === "warning" ||
    color === "destructive"
  )
    return `--${color}-foreground`
  return "--background"
}

type BotFaceProps = Omit<React.ComponentProps<typeof View>, "children"> & {
  shape?: BotFaceShape
  color?: BotFaceColor
  eyes?: BotFaceEyes
  size?: BotFaceSize
  animated?: boolean
  blink?: boolean
  followPointer?: boolean
  gaze?: BotFaceGaze
}

function BotFace({
  className,
  shape = "squircle",
  color = "primary",
  eyes = "slant",
  size = "default",
  animated = true,
  blink = true,
  followPointer = true,
  gaze,
  style,
  "aria-label": ariaLabel,
  accessibilityLabel,
  onTouchStart,
  onTouchMove,
  onLayout,
  ...props
}: BotFaceProps) {
  const label = ariaLabel ?? accessibilityLabel
  const { isReduced, isOff } = useMotion("move")
  const isAnimated = animated && !isReduced && !isOff
  const classes = cn("relative shrink-0", botFaceVariants({ color }), className)
  const resolved = useResolveClassNames(classes)
  const eyeColor = useCSSVariable(getBotFaceEyeToken(color))
  const dimension = BOT_FACE_SIZES[size]
  const width = useSharedValue<number>(dimension)
  const height = useSharedValue<number>(dimension)
  const phase = getBotFacePhase(React.useId())
  const clock = useSharedValue(0)
  const targetX = useSharedValue(0)
  const targetY = useSharedValue(0)
  const touchUntil = useSharedValue(0)
  const x = useSharedValue(0)
  const y = useSharedValue(0)
  const opening = useSharedValue(1)
  const controlledX = gaze?.x
  const controlledY = gaze?.y

  const frameCallback = useFrameCallback((frame) => {
    if (!isAnimated) {
      x.set(0)
      y.set(0)
      opening.set(1)
      return
    }
    const elapsed = clock.get() + (frame.timeSincePreviousFrame ?? 0)
    clock.set(elapsed)
    const target =
      controlledX !== undefined && controlledY !== undefined
        ? clampBotFaceGaze({ x: controlledX, y: controlledY })
        : elapsed < touchUntil.get()
          ? { x: targetX.get(), y: targetY.get() }
          : getBotFaceIdleGaze(elapsed + phase)
    const amount =
      1 - Math.exp(-Math.min(frame.timeSincePreviousFrame ?? 16, 64) / 110)
    x.set(x.get() + (target.x - x.get()) * amount)
    y.set(y.get() + (target.y - y.get()) * amount)
    opening.set(getBotFaceBlink(elapsed + phase, blink))
  }, isAnimated)

  React.useEffect(() => {
    frameCallback.setActive(isAnimated)
    return () => frameCallback.setActive(false)
  }, [frameCallback, isAnimated])

  React.useEffect(() => {
    if (!isAnimated) {
      x.set(0)
      y.set(0)
      opening.set(1)
    }
  }, [isAnimated, x, y, opening])

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() * width.get() * 0.02 },
      { translateY: y.get() * height.get() * 0.02 },
      { rotate: `${x.get() * 9 - y.get() * 4}deg` },
    ],
  }))
  const gazeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() * width.get() * 0.1 },
      { translateY: y.get() * height.get() * 0.08 },
    ],
  }))
  const blinkStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: opening.get() }],
  }))
  const lookAtTouch = (event: GestureResponderEvent) => {
    if (!followPointer || !isAnimated) return
    const next = getBotFaceGaze(
      event.nativeEvent.locationX,
      event.nativeEvent.locationY,
      { x: 0, y: 0, width: width.get(), height: height.get() }
    )
    targetX.set(next.x)
    targetY.set(next.y)
    touchUntil.set(clock.get() + 1400)
  }

  return (
    <View
      data-slot="bot-face"
      data-shape={shape}
      data-color={color}
      data-eyes={eyes}
      data-size={size}
      data-animated={animated}
      role={label ? "img" : undefined}
      accessible={Boolean(label)}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={classes}
      style={[{ width: dimension, height: dimension }, style]}
      onLayout={(event) => {
        width.set(event.nativeEvent.layout.width)
        height.set(event.nativeEvent.layout.height)
        onLayout?.(event)
      }}
      onTouchStart={(event) => {
        lookAtTouch(event)
        onTouchStart?.(event)
      }}
      onTouchMove={(event) => {
        lookAtTouch(event)
        onTouchMove?.(event)
      }}
      {...props}
    >
      <Animated.View
        data-slot="bot-face-body"
        pointerEvents="none"
        className="absolute inset-0"
        style={bodyStyle}
      >
        <Svg
          data-slot="bot-face-shape"
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          style={{ position: "absolute" }}
        >
          <Path
            d={getBotFacePath(shape)}
            fill={
              typeof resolved.color === "string" ? resolved.color : undefined
            }
          />
        </Svg>
        <Animated.View
          data-slot="bot-face-gaze"
          className="absolute inset-0"
          style={gazeStyle}
        >
          <Animated.View
            data-slot="bot-face-eyes"
            className="absolute inset-0"
            style={blinkStyle}
          >
            <Svg
              viewBox="0 0 100 100"
              width="100%"
              height="100%"
              fill={typeof eyeColor === "string" ? eyeColor : undefined}
            >
              {[40, 60].map((position) => (
                <Rect
                  key={position}
                  x={position - 4.5}
                  y={eyes === "dots" ? 45.5 : 40}
                  width={9}
                  height={eyes === "dots" || eyes === "square" ? 9 : 20}
                  rx={eyes === "square" ? 2 : 4.5}
                  transform={
                    eyes === "slant" ? `rotate(-20 ${position} 50)` : undefined
                  }
                />
              ))}
            </Svg>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </View>
  )
}

export {
  BotFace,
  type BotFaceProps,
  type BotFaceShape,
  type BotFaceColor,
  type BotFaceEyes,
  type BotFaceSize,
  type BotFaceGaze,
}
