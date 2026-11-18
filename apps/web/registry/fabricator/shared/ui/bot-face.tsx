"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"

import {
  createBotFaceEyeMorph,
  getBotFaceMorphedEyePath,
  stepBotFaceEyeMorph,
} from "@/registry/bases/__base__/lib/bot-face-eye-morph"
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
} from "@/registry/bases/__base__/lib/bot-face-model"
import {
  BOT_FACE_GAZE_TRAVEL,
  createBotFaceMotion,
  getBotFaceBlinkOpening,
  getBotFaceTarget,
  stepBotFaceMotion,
  stepBotFacePlayback,
  type BotFacePose,
  type BotFaceState,
} from "@/registry/bases/__base__/lib/bot-face-motion"

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

type BotFaceProps = Omit<React.ComponentProps<"span">, "color" | "children"> & {
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
  ref,
  "aria-label": label,
  ...props
}: BotFaceProps) {
  const namedColor = isBotFaceNamedColor(color) ? color : undefined
  const customColor = namedColor ? undefined : getBotFaceCustomColors(color)
  const phase = getBotFacePhase(React.useId())
  const root = React.useRef<HTMLSpanElement>(null)
  const face = React.useRef<HTMLSpanElement>(null)
  const eyeGroup = React.useRef<HTMLSpanElement>(null)
  const eyelids = React.useRef<HTMLSpanElement>(null)
  const leftEye = React.useRef<SVGPathElement>(null)
  const rightEye = React.useRef<SVGPathElement>(null)
  // React owns the initial SVG; the adapter owns subsequent poses, including
  // interrupted ones. Rendering a new state's d here would jump before a frame.
  const [initial] = React.useState(() =>
    createBotFaceEyeMorph(getBotFaceTarget(state), eyes, state)
  )
  const eyeMorph = React.useRef(initial)
  const motion = React.useRef(createBotFaceMotion(state))
  const clock = React.useRef(0)
  const playback = React.useRef({ state, elapsed: 0 })
  const controller = React.useRef<{ sync: () => void } | null>(null)
  const gazeX = gaze?.x
  const gazeY = gaze?.y
  const readInputs = React.useEffectEvent(() => ({
    state,
    eyes,
    animated,
    blink,
    followPointer,
    gazeX,
    gazeY,
  }))

  React.useEffect(() => {
    const element = root.current
    const body = face.current
    const pupils = eyeGroup.current
    const lids = eyelids.current
    const left = leftEye.current
    const right = rightEye.current
    if (!element || !body || !pupils || !lids || !left || !right) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let previousTime: number | null = null
    let pointer: { x: number; y: number } | null = null
    let touchedAt = -Infinity
    let isVisible = true
    let moveDuration = 0
    let settleDuration = 0
    let isMotionEnabled = false
    let bounds = element.getBoundingClientRect()
    const paint = (pose: BotFacePose, opening: number) => {
      body.style.transform = `rotate(${pose.tilt}deg) rotateX(${pose.pitch}deg) rotateY(${pose.yaw}deg)`
      pupils.style.transform = `translate(${pose.gazeX * BOT_FACE_GAZE_TRAVEL}%, ${pose.gazeY * BOT_FACE_GAZE_TRAVEL}%)`
      lids.style.transform = `scaleY(${getBotFaceBlinkOpening(pose, opening)})`
      left.setAttribute("d", getBotFaceMorphedEyePath(eyeMorph.current, "left"))
      right.setAttribute(
        "d",
        getBotFaceMorphedEyePath(eyeMorph.current, "right")
      )
    }
    const draw = (now: number) => {
      const inputs = readInputs()
      const delta = previousTime === null ? 0 : Math.min(now - previousTime, 64)
      previousTime = now
      clock.current += delta
      const elapsed = clock.current + phase
      playback.current = stepBotFacePlayback(
        playback.current,
        inputs.state,
        delta
      )
      const gestureTime =
        playback.current.elapsed + (inputs.state === "idle" ? phase : 0)
      const target = getBotFaceTarget(inputs.state, gestureTime)
      const attention =
        inputs.gazeX !== undefined && inputs.gazeY !== undefined
          ? clampBotFaceGaze({ x: inputs.gazeX, y: inputs.gazeY })
          : inputs.state === "idle" &&
              inputs.followPointer &&
              pointer &&
              now - touchedAt < 1400
            ? getBotFaceGaze(pointer.x, pointer.y, bounds)
            : { x: target.gazeX, y: target.gazeY }
      target.gazeX = attention.x
      target.gazeY = attention.y
      eyeMorph.current = stepBotFaceEyeMorph(
        eyeMorph.current,
        target,
        inputs.eyes,
        inputs.state,
        delta,
        (moveDuration + settleDuration) / 2
      )
      motion.current = stepBotFaceMotion(
        motion.current,
        target,
        delta,
        moveDuration,
        settleDuration
      )
      paint(motion.current.pose, getBotFaceBlink(elapsed, inputs.blink))
      frame = requestAnimationFrame(draw)
    }
    const sync = () => {
      const inputs = readInputs()
      const computed = getComputedStyle(element)
      const parseDuration = (role: string) => {
        const value = computed.getPropertyValue(`--motion-${role}`).trim()
        return Number.parseFloat(value) * (value.endsWith("ms") ? 1 : 1000)
      }
      const scale = Number.parseFloat(
        computed.getPropertyValue("--motion-scale")
      )
      moveDuration = parseDuration("move") * scale
      settleDuration = parseDuration("settle") * scale
      isMotionEnabled =
        inputs.animated &&
        !reduced.matches &&
        scale > 0 &&
        computed.getPropertyValue("--motion-speed").trim() !== "3"
      const shouldRun = isMotionEnabled && isVisible && !document.hidden
      if (!shouldRun) {
        cancelAnimationFrame(frame)
        frame = 0
        previousTime = null
        if (!isMotionEnabled) {
          const target = {
            ...getBotFaceTarget(inputs.state),
            gazeX: 0,
            gazeY: 0,
            tilt: 0,
            pitch: 0,
            yaw: 0,
          }
          motion.current = stepBotFaceMotion(motion.current, target, 0, 0, 0)
          eyeMorph.current = stepBotFaceEyeMorph(
            eyeMorph.current,
            target,
            inputs.eyes,
            inputs.state,
            0,
            0
          )
          paint(target, 1)
        }
        return
      }
      if (!frame) frame = requestAnimationFrame(draw)
    }
    controller.current = { sync }
    const move = (event: PointerEvent) => {
      if (!readInputs().followPointer || !isMotionEnabled || !isVisible) return
      pointer = { x: event.clientX, y: event.clientY }
      touchedAt = event.pointerType === "mouse" ? Infinity : performance.now()
      bounds = element.getBoundingClientRect()
    }
    const leave = () => {
      pointer = null
    }
    const measure = () => {
      bounds = element.getBoundingClientRect()
    }
    const settings = new MutationObserver(sync)
    let ancestor: HTMLElement | null = element
    while (ancestor) {
      settings.observe(ancestor, {
        attributes: true,
        attributeFilter: ["class", "style", "data-motion"],
      })
      ancestor = ancestor.parentElement
    }
    const resize = new ResizeObserver(measure)
    resize.observe(element)
    const visibility = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting)
      sync()
    })
    visibility.observe(element)
    reduced.addEventListener("change", sync)
    document.addEventListener("visibilitychange", sync)
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerdown", move, { passive: true })
    document.addEventListener("pointerleave", leave)
    window.addEventListener("blur", leave)
    window.addEventListener("scroll", measure, { passive: true, capture: true })
    sync()
    return () => {
      controller.current = null
      cancelAnimationFrame(frame)
      resize.disconnect()
      visibility.disconnect()
      settings.disconnect()
      reduced.removeEventListener("change", sync)
      document.removeEventListener("visibilitychange", sync)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerdown", move)
      document.removeEventListener("pointerleave", leave)
      window.removeEventListener("blur", leave)
      window.removeEventListener("scroll", measure, true)
    }
  }, [phase])

  React.useLayoutEffect(() => {
    controller.current?.sync()
  }, [state, eyes, animated, blink, followPointer, gazeX, gazeY])

  return (
    <span
      ref={(node) => {
        root.current = node
        if (typeof ref === "function") return ref(node)
        if (ref) ref.current = node
      }}
      data-slot="bot-face"
      data-shape={shape}
      data-color={color}
      data-eyes={eyes}
      data-size={size}
      data-state={state}
      data-animated={animated}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "relative inline-block shrink-0 align-middle",
        botFaceVariants({ color: namedColor }),
        className
      )}
      style={{
        width: BOT_FACE_SIZES[size],
        height: BOT_FACE_SIZES[size],
        color: customColor?.fill,
        ...style,
      }}
      {...props}
    >
      <span
        ref={face}
        data-slot="bot-face-body"
        className="absolute inset-0 block"
      >
        <svg
          data-slot="bot-face-shape"
          viewBox="0 0 100 100"
          fill="currentColor"
          className="absolute inset-0 size-full"
          aria-hidden="true"
        >
          <path d={getBotFacePath(shape)} />
        </svg>
        <span
          ref={eyeGroup}
          data-slot="bot-face-gaze"
          className="absolute inset-0 block"
        >
          <span
            ref={eyelids}
            data-slot="bot-face-eyes"
            className="absolute inset-0 block origin-center"
          >
            <svg
              viewBox="0 0 100 100"
              className="size-full"
              fill={customColor?.eyes ?? `var(${getBotFaceEyeToken(color)})`}
              aria-hidden="true"
            >
              <path
                ref={leftEye}
                data-slot="bot-face-eye"
                d={getBotFaceMorphedEyePath(initial, "left")}
              />
              <path
                ref={rightEye}
                data-slot="bot-face-eye"
                d={getBotFaceMorphedEyePath(initial, "right")}
              />
            </svg>
          </span>
        </span>
      </span>
    </span>
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
