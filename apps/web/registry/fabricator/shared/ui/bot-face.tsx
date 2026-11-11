"use client"

import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "cn"

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
} from "@/registry/bases/__base__/lib/bot-face-model"

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

type BotFaceProps = Omit<React.ComponentProps<"span">, "color" | "children"> & {
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
  ref,
  "aria-label": label,
  ...props
}: BotFaceProps) {
  const phase = getBotFacePhase(React.useId())
  const root = React.useRef<HTMLSpanElement>(null)
  const face = React.useRef<HTMLSpanElement>(null)
  const eyeGroup = React.useRef<HTMLSpanElement>(null)
  const eyelids = React.useRef<HTMLSpanElement>(null)
  const gazeX = gaze?.x
  const gazeY = gaze?.y

  React.useEffect(() => {
    const element = root.current
    const body = face.current
    const pupils = eyeGroup.current
    const lids = eyelids.current
    if (!element || !body || !pupils || !lids) return
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)")
    let frame = 0
    let started = 0
    let last = 0
    let pointer: { x: number; y: number } | null = null
    let touchedAt = -Infinity
    let isVisible = true
    let bounds = element.getBoundingClientRect()
    const current = { x: 0, y: 0 }
    const reset = () => {
      body.style.transform = ""
      pupils.style.transform = ""
      lids.style.transform = ""
    }
    const move = (event: PointerEvent) => {
      if (!followPointer || !animated || !isVisible) return
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
    const draw = (now: number) => {
      if (!started) started = now
      const elapsed = now - started
      const target =
        gazeX !== undefined && gazeY !== undefined
          ? clampBotFaceGaze({ x: gazeX, y: gazeY })
          : pointer && now - touchedAt < 1400
            ? getBotFaceGaze(pointer.x, pointer.y, bounds)
            : getBotFaceIdleGaze(elapsed + phase)
      const amount = 1 - Math.exp(-Math.min(now - last, 64) / 110)
      current.x += (target.x - current.x) * amount
      current.y += (target.y - current.y) * amount
      body.style.transform = `translate(${current.x * 2}%, ${current.y * 2}%) rotate(${current.x * 9 - current.y * 4}deg)`
      pupils.style.transform = `translate(${current.x * 10}%, ${current.y * 8}%)`
      lids.style.transform = `scaleY(${getBotFaceBlink(elapsed + phase, blink)})`
      last = now
      frame = requestAnimationFrame(draw)
    }
    const syncMotion = () => {
      cancelAnimationFrame(frame)
      const isOff =
        getComputedStyle(element).getPropertyValue("--motion-scale").trim() ===
        "0"
      reset()
      current.x = 0
      current.y = 0
      started = 0
      last = 0
      if (
        animated &&
        isVisible &&
        !reduced.matches &&
        !isOff &&
        !document.hidden
      )
        frame = requestAnimationFrame(draw)
    }
    const motionObserver = new MutationObserver(syncMotion)
    let ancestor: HTMLElement | null = element
    while (ancestor) {
      motionObserver.observe(ancestor, {
        attributes: true,
        attributeFilter: ["class", "style", "data-motion"],
      })
      ancestor = ancestor.parentElement
    }
    reduced.addEventListener("change", syncMotion)
    document.addEventListener("visibilitychange", syncMotion)
    syncMotion()
    window.addEventListener("pointermove", move, { passive: true })
    window.addEventListener("pointerdown", move, { passive: true })
    document.addEventListener("pointerleave", leave)
    window.addEventListener("blur", leave)
    window.addEventListener("scroll", measure, { passive: true, capture: true })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    const visibilityObserver = new IntersectionObserver((entries) => {
      isVisible = entries.some((entry) => entry.isIntersecting)
      syncMotion()
    })
    visibilityObserver.observe(element)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      visibilityObserver.disconnect()
      motionObserver.disconnect()
      reduced.removeEventListener("change", syncMotion)
      document.removeEventListener("visibilitychange", syncMotion)
      window.removeEventListener("pointermove", move)
      window.removeEventListener("pointerdown", move)
      document.removeEventListener("pointerleave", leave)
      window.removeEventListener("blur", leave)
      window.removeEventListener("scroll", measure, true)
      reset()
    }
  }, [animated, blink, followPointer, gazeX, gazeY, phase])

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
      data-animated={animated}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        "relative inline-block shrink-0 align-middle",
        botFaceVariants({ color }),
        className
      )}
      style={{
        width: BOT_FACE_SIZES[size],
        height: BOT_FACE_SIZES[size],
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
              fill={`var(${getBotFaceEyeToken(color)})`}
              aria-hidden="true"
            >
              {[40, 60].map((x) => (
                <rect
                  key={x}
                  x={x - 4.5}
                  y={eyes === "dots" ? 45.5 : 40}
                  width="9"
                  height={eyes === "dots" || eyes === "square" ? 9 : 20}
                  rx={eyes === "square" ? 2 : 4.5}
                  transform={
                    eyes === "slant" ? `rotate(-20 ${x} 50)` : undefined
                  }
                />
              ))}
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
}
