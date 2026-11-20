"use client"

import * as React from "react"

import {
  getGooeyPath,
  GOOEY_VIEW_BOX,
  resolveGooeyOptions,
  type GooeyDirection,
  type GooeyEffect,
  type GooeyPreference,
  type GooeySettings,
} from "@/registry/bases/__base__/lib/gooey-model"

export type {
  GooeyDirection,
  GooeyEffect,
  GooeyOptions,
  GooeyPreference,
  GooeySettings,
} from "@/registry/bases/__base__/lib/gooey-model"

const GooeyContext = React.createContext<GooeySettings | undefined>(undefined)

function GooeyProvider({
  mode,
  waviness,
  children,
}: GooeySettings & { children: React.ReactNode }) {
  const parent = React.useContext(GooeyContext)
  const resolvedMode = parent?.mode === "off" ? "off" : mode
  const resolvedWaviness = waviness ?? parent?.waviness
  const settings = React.useMemo(
    () => ({ mode: resolvedMode, waviness: resolvedWaviness }),
    [resolvedMode, resolvedWaviness]
  )
  return (
    <GooeyContext.Provider value={settings}>{children}</GooeyContext.Provider>
  )
}

const reducedMotion = "(prefers-reduced-motion: reduce)"
function subscribeToReducedMotion(listener: () => void) {
  const query = window.matchMedia(reducedMotion)
  query.addEventListener("change", listener)
  return () => query.removeEventListener("change", listener)
}
const getReducedMotion = () => window.matchMedia(reducedMotion).matches
const getServerReducedMotion = () => true

type GooeyProps = Omit<React.ComponentProps<"svg">, "children" | "viewBox"> & {
  effect?: GooeyEffect
  progress?: number
  intensity?: number
  waviness?: number
  direction?: GooeyDirection
  accentFill?: string
}

const gradientDirections: Record<
  GooeyDirection,
  [string, string, string, string]
> = {
  right: ["0%", "25%", "100%", "75%"],
  left: ["100%", "25%", "0%", "75%"],
  down: ["75%", "0%", "25%", "100%"],
  up: ["25%", "100%", "75%", "0%"],
}

/** A decorative silhouette. Place it behind the live controls it represents. */
function Gooey({
  effect,
  intensity,
  waviness,
  progress = 0,
  direction = "right",
  fill = "currentColor",
  accentFill,
  style,
  ...props
}: GooeyProps) {
  const settings = React.useContext(GooeyContext)
  const options = resolveGooeyOptions(
    settings,
    { effect, intensity, waviness },
    true
  )
  const isReduced = React.useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    getServerReducedMotion
  )
  const gradient = `gooey-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`
  const hasMelt = options?.effect === "melt" && Boolean(accentFill)
  const isActive = options && !isReduced && progress > 0
  const [x1, y1, x2, y2] = gradientDirections[direction]
  return (
    <svg
      {...props}
      data-slot="gooey"
      viewBox={GOOEY_VIEW_BOX}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={{ display: "block", ...style, pointerEvents: "none" }}
    >
      {hasMelt && (
        <defs>
          <linearGradient id={gradient} {...{ x1, y1, x2, y2 }}>
            <stop offset="25%" stopColor={fill} />
            <stop offset="75%" stopColor={accentFill} />
          </linearGradient>
        </defs>
      )}
      <path
        d={getGooeyPath(options?.effect ?? "move", 0, 0, 0, direction)}
        fill={fill}
        style={
          isActive
            ? {
                opacity: "clamp(0, calc(1 - var(--motion-scale, 1) * 1000), 1)",
              }
            : undefined
        }
      />
      {isActive && (
        <path
          d={getGooeyPath(
            options.effect,
            progress,
            options.intensity,
            options.waviness,
            direction
          )}
          fill={hasMelt ? `url(#${gradient})` : fill}
          style={{
            opacity: "clamp(0, calc(var(--motion-scale, 1) * 1000), 1)",
          }}
        />
      )}
    </svg>
  )
}

type GooeyFeedbackProps = {
  value: number | undefined
  gooey?: GooeyPreference
  effect: GooeyEffect
  isVertical?: boolean
  isDisabled?: boolean
  followsTextDirection?: boolean
  fill: string
}

/** A bounded pulse attached to a control's existing moving surface. */
function GooeyFeedback({
  gooey,
  effect,
  isDisabled,
  ...props
}: GooeyFeedbackProps) {
  const settings = React.useContext(GooeyContext)
  const options = resolveGooeyOptions(settings, gooey, false, effect)
  if (!options?.intensity || isDisabled) return null
  return <GooeyPulse {...props} {...options} />
}

function GooeyPulse({
  value,
  effect,
  intensity,
  waviness,
  isVertical,
  followsTextDirection,
  fill,
}: Omit<GooeyFeedbackProps, "gooey" | "isDisabled"> & {
  intensity: number
  waviness: number
}) {
  const isReduced = React.useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    getServerReducedMotion
  )
  const path = React.useRef<SVGPathElement>(null)
  const previous = React.useRef(value)
  React.useEffect(() => {
    const last = previous.current
    previous.current = value
    const element = path.current
    if (!element || last === undefined || value === undefined || value === last)
      return

    const styles = window.getComputedStyle(element)
    const scale = Number(styles.getPropertyValue("--motion-scale") || 1)
    const duration = styles.getPropertyValue("--motion-move").trim()
    const milliseconds =
      parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000) * scale
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) return

    const isForward =
      value > last !==
      Boolean(followsTextDirection && styles.direction === "rtl")
    const hasVerticalAxis =
      isVertical ??
      Boolean(
        element.closest(
          '[data-orientation="vertical"], [aria-orientation="vertical"]'
        )
      )
    const direction = hasVerticalAxis
      ? value > last
        ? "up"
        : "down"
      : isForward
        ? "right"
        : "left"
    const start = performance.now()
    let frame: number
    function draw(now: number) {
      const elapsed = Math.min((now - start) / milliseconds, 1)
      const shape = path.current
      if (!shape) return
      const progress = (1 - elapsed) ** 2
      shape.setAttribute(
        "d",
        getGooeyPath(effect, progress, intensity, waviness, direction)
      )
      shape.style.opacity = String(Math.min(progress * 2, 1))
      if (elapsed < 1) frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      element.style.opacity = "0"
    }
  }, [
    value,
    isReduced,
    intensity,
    waviness,
    effect,
    isVertical,
    followsTextDirection,
  ])

  if (isReduced) return null
  return (
    <svg
      data-slot="gooey-feedback"
      className="gooey-feedback"
      viewBox={GOOEY_VIEW_BOX}
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
      style={{
        position: "absolute",
        inset: "-40% -30%",
        width: "160%",
        height: "180%",
        opacity: "clamp(0, calc(var(--motion-scale, 1) * 1000), 1)",
        pointerEvents: "none",
      }}
    >
      <path ref={path} fill={fill} style={{ opacity: 0 }} />
    </svg>
  )
}

export { Gooey, GooeyFeedback, GooeyProvider }
export type { GooeyProps }
