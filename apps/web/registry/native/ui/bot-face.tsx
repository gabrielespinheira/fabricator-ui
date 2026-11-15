import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { AppState, View, type GestureResponderEvent } from "react-native"
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useFrameCallback,
  useSharedValue,
} from "react-native-reanimated"
import Svg, { Path } from "react-native-svg"
import { useCSSVariable, useResolveClassNames } from "uniwind"

import {
  createBotFaceEyeMorph,
  getBotFaceMorphedEyePath,
  stepBotFaceEyeMorph,
} from "@/registry/fabricator/shared/lib/bot-face-eye-morph"
import {
  BOT_FACE_SIZES,
  clampBotFaceGaze,
  getBotFaceBlink,
  getBotFaceCustomColors,
  getBotFaceGaze,
  getBotFacePath,
  getBotFacePhase,
  isBotFaceNamedColor,
  type BotFaceColor,
  type BotFaceEyes,
  type BotFaceGaze,
  type BotFaceShape,
  type BotFaceSize,
} from "@/registry/fabricator/shared/lib/bot-face-model"
import {
  BOT_FACE_GAZE_TRAVEL,
  createBotFaceMotion,
  getBotFaceBlinkOpening,
  getBotFaceTarget,
  stepBotFaceMotion,
  stepBotFacePlayback,
  type BotFaceState,
} from "@/registry/fabricator/shared/lib/bot-face-motion"
import { useMotion } from "@/registry/native/lib/motion"

const AnimatedPath = Animated.createAnimatedComponent(Path)

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
      gray: "cn-bot-face-color-gray",
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
  state?: BotFaceState
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
  state = "idle",
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
  const namedColor = isBotFaceNamedColor(color) ? color : undefined
  const customColor = namedColor ? undefined : getBotFaceCustomColors(color)
  const label = ariaLabel ?? accessibilityLabel
  const move = useMotion("move")
  const settle = useMotion("settle")
  const speed = useCSSVariable("--motion-speed")
  const [isActive, setIsActive] = React.useState(
    AppState.currentState === "active"
  )
  React.useEffect(() => {
    const subscription = AppState.addEventListener("change", (activity) =>
      setIsActive(activity === "active")
    )
    return () => subscription.remove()
  }, [])
  const isAnimated =
    animated && !move.isReduced && !move.isOff && Number(speed) !== 3
  const classes = cn(
    "relative shrink-0",
    botFaceVariants({ color: namedColor }),
    className
  )
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
  const motion = useSharedValue(createBotFaceMotion(state))
  const playback = useSharedValue({ state, elapsed: 0 })
  const opening = useSharedValue(1)
  const controlledX = gaze?.x
  const controlledY = gaze?.y
  const [initial] = React.useState(() =>
    createBotFaceEyeMorph(getBotFaceTarget(state), eyes, state)
  )
  const eyeMorph = useSharedValue(initial)

  React.useEffect(() => {
    if (isAnimated) return
    const target = {
      ...getBotFaceTarget(state),
      gazeX: 0,
      gazeY: 0,
      tilt: 0,
      pitch: 0,
      yaw: 0,
    }
    motion.set(stepBotFaceMotion(motion.get(), target, 0, 0, 0))
    eyeMorph.set(createBotFaceEyeMorph(target, eyes, state))
    opening.set(1)
  }, [isAnimated, state, eyes, motion, eyeMorph, opening])

  const frameCallback = useFrameCallback((frame) => {
    const delta = Math.min(frame.timeSincePreviousFrame ?? 0, 64)
    const elapsed = clock.get() + delta
    clock.set(elapsed)
    const gesture = stepBotFacePlayback(playback.get(), state, delta)
    playback.set(gesture)
    const target = getBotFaceTarget(
      state,
      gesture.elapsed + (state === "idle" ? phase : 0)
    )
    const attention =
      controlledX !== undefined && controlledY !== undefined
        ? clampBotFaceGaze({ x: controlledX, y: controlledY })
        : state === "idle" && followPointer && elapsed < touchUntil.get()
          ? { x: targetX.get(), y: targetY.get() }
          : { x: target.gazeX, y: target.gazeY }
    target.gazeX = attention.x
    target.gazeY = attention.y
    eyeMorph.set(
      stepBotFaceEyeMorph(
        eyeMorph.get(),
        target,
        eyes,
        state,
        delta,
        (move.enterMs + settle.enterMs) / 2
      )
    )
    motion.set(
      stepBotFaceMotion(
        motion.get(),
        target,
        delta,
        move.enterMs,
        settle.enterMs
      )
    )
    opening.set(getBotFaceBlink(elapsed + phase, blink))
  }, false)

  React.useEffect(() => {
    frameCallback.setActive(isAnimated && isActive)
    return () => frameCallback.setActive(false)
  }, [frameCallback, isAnimated, isActive])

  const pose = useDerivedValue(() =>
    isAnimated
      ? motion.get().pose
      : {
          ...getBotFaceTarget(state),
          gazeX: 0,
          gazeY: 0,
          tilt: 0,
          pitch: 0,
          yaw: 0,
        }
  )
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${pose.get().tilt}deg` },
      { rotateX: `${pose.get().pitch}deg` },
      { rotateY: `${pose.get().yaw}deg` },
    ],
  }))
  const gazeStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          (pose.get().gazeX * width.get() * BOT_FACE_GAZE_TRAVEL) / 100,
      },
      {
        translateY:
          (pose.get().gazeY * height.get() * BOT_FACE_GAZE_TRAVEL) / 100,
      },
    ],
  }))
  const blinkStyle = useAnimatedStyle(() => ({
    transform: [
      {
        scaleY: isAnimated
          ? getBotFaceBlinkOpening(pose.get(), opening.get())
          : 1,
      },
    ],
  }))
  const renderedEyes = useDerivedValue(() =>
    isAnimated
      ? eyeMorph.get()
      : createBotFaceEyeMorph(getBotFaceTarget(state), eyes, state)
  )
  const leftProps = useAnimatedProps(() => ({
    d: getBotFaceMorphedEyePath(renderedEyes.get(), "left"),
  }))
  const rightProps = useAnimatedProps(() => ({
    d: getBotFaceMorphedEyePath(renderedEyes.get(), "right"),
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
      data-state={state}
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
              customColor?.fill ??
              (typeof resolved.color === "string" ? resolved.color : undefined)
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
              fill={
                customColor?.eyes ??
                (typeof eyeColor === "string" ? eyeColor : undefined)
              }
            >
              <AnimatedPath
                data-slot="bot-face-eye"
                d={getBotFaceMorphedEyePath(initial, "left")}
                animatedProps={leftProps}
              />
              <AnimatedPath
                data-slot="bot-face-eye"
                d={getBotFaceMorphedEyePath(initial, "right")}
                animatedProps={rightProps}
              />
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
  type BotFaceState,
}
