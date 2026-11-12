// Motion by role, never milliseconds: the same tokens as the website, read
// from the theme, so `applyLook` and a scoped speed reach every surface.

import * as React from "react"
import {
  Easing,
  ReduceMotion,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  DEFAULT_MOTION_SPEED,
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
  type MotionSpeedName,
} from "@/registry/fabricator/motion"
import {
  getSurfaceFrom,
  getSurfaceOrigin,
  getSurfaceTravel,
  parseBezier,
  parseNumber,
  type SurfaceAlign,
  type SurfaceSide,
} from "@/registry/native/lib/motion-tokens"

type MotionRole =
  | "feedback"
  | "glide"
  | "move"
  | "theme"
  | "tooltip"
  | "popup"
  | "dialog"
  | "sheet"
  | "disclosure"
  | "toast"

function buildEasings(name: MotionSpeedName) {
  const { easings } = MOTION_SPEEDS[name]
  return {
    enterEasing: Easing.bezier(...parseBezier(easings.enter)),
    exitEasing: Easing.bezier(...parseBezier(easings.exit)),
    moveEasing: Easing.bezier(...parseBezier(easings.move)),
    drawerEasing: Easing.bezier(...parseBezier(easings.drawer)),
    themeEasing: Easing.bezier(...parseBezier(easings.theme)),
    feedbackEasing: Easing.bezier(...parseBezier(easings.feedback)),
  }
}

const speedEasings = new Map<MotionSpeedName, ReturnType<typeof buildEasings>>()

// One set per speed: a screen can hold hundreds of controls that read them.
function getEasings(name: MotionSpeedName) {
  const existing = speedEasings.get(name)
  if (existing) return existing
  const built = buildEasings(name)
  speedEasings.set(name, built)
  return built
}

/** A role's timings and curves, scaled and zeroed the way the website does. */
function useMotion(role: MotionRole) {
  const [enter, exit, scale, speed] = useCSSVariable([
    `--motion-${role}`,
    `--motion-${role}-exit`,
    "--motion-scale",
    "--motion-speed",
  ])
  const isReduced = useReducedMotion()
  return React.useMemo(() => {
    const multiplier = parseNumber(scale, 1)
    const name = MOTION_SPEED_NAMES[parseNumber(speed, 1)]
    return {
      isOff: multiplier === 0,
      isReduced,
      enterMs: parseNumber(enter, 0) * multiplier,
      exitMs: parseNumber(exit, 0) * multiplier,
      ...getEasings(name ?? DEFAULT_MOTION_SPEED),
    }
  }, [enter, exit, scale, speed, isReduced])
}

type SurfaceFrom = {
  scale?: number
  translateX?: number
  translateY?: number
  /** The side the surface opens on: it grows from the edge beside its trigger. */
  side?: SurfaceSide
  align?: SurfaceAlign
  /** Off for a surface that only slides, as a toast does. */
  hasFade?: boolean
}

/**
 * `entering` and `exiting` for a surface that appears: a fade, plus the zoom
 * and slide its role allows. `origin` goes on the same view as `style`, so a
 * popup grows from its trigger. Undefined when motion is off.
 */
function useSurfaceAnimation(role: MotionRole, from: SurfaceFrom = {}) {
  const motion = useMotion(role)
  // Only these roles zoom, and only tooltips and popups travel; asking for any
  // other token warns in development.
  const hasScale = role === "tooltip" || role === "popup" || role === "dialog"
  const hasTravel = role === "tooltip" || role === "popup"
  const [scaleToken, travelToken] = useCSSVariable([
    hasScale ? `--motion-${role}-scale` : "--motion-press-scale",
    hasTravel ? `--motion-${role}-travel` : "--motion-press-scale",
  ])
  const scale = from.scale ?? (hasScale ? parseNumber(scaleToken, 1) : 1)
  const travel = getSurfaceTravel(
    from.side,
    hasTravel ? parseNumber(travelToken, 0) : 0
  )
  const translateX = from.translateX ?? travel.translateX
  const translateY = from.translateY ?? travel.translateY
  const hasFade = from.hasFade ?? true
  const transformOrigin = getSurfaceOrigin(from.side, from.align)
  return React.useMemo(() => {
    const origin = { transformOrigin }
    if (motion.isOff) return { entering: undefined, exiting: undefined, origin }
    const start = getSurfaceFrom(
      { scale, translateX, translateY, hasFade },
      motion.isReduced
    )
    // Reanimated jumps a timing to its end under Reduce Motion by default, and
    // `start` has already dropped the travel and the zoom: the fade stays.
    const enter = {
      duration: motion.enterMs,
      easing: motion.enterEasing,
      reduceMotion: ReduceMotion.Never,
    }
    const exit = {
      duration: motion.exitMs,
      easing: motion.exitEasing,
      reduceMotion: ReduceMotion.Never,
    }
    return {
      origin,
      entering: () => {
        "worklet"
        return {
          initialValues: {
            opacity: start.opacity,
            transform: [
              { translateX: start.translateX },
              { translateY: start.translateY },
              { scale: start.scale },
            ],
          },
          animations: {
            opacity: withTiming(1, enter),
            transform: [
              { translateX: withTiming(0, enter) },
              { translateY: withTiming(0, enter) },
              { scale: withTiming(1, enter) },
            ],
          },
        }
      },
      exiting: () => {
        "worklet"
        return {
          initialValues: {
            opacity: 1,
            transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }],
          },
          animations: {
            opacity: withTiming(start.opacity, exit),
            transform: [
              { translateX: withTiming(start.translateX, exit) },
              { translateY: withTiming(start.translateY, exit) },
              { scale: withTiming(start.scale, exit) },
            ],
          },
        }
      },
    }
  }, [hasFade, motion, scale, transformOrigin, translateX, translateY])
}

/**
 * The press: a scale and a pressed wash while held, on the feedback timing, one
 * duration both ways as on the website. A touch has no hover to ease into it, so
 * `progress` also fades the pressed fill out on release (see PressWash), where a
 * class could only snap. `isHeld` keeps the wash on while the control's popup is
 * open, as the website's `aria-expanded` step does.
 */
function usePressScale({ isHeld = false }: { isHeld?: boolean } = {}) {
  const motion = useMotion("feedback")
  const pressScale = parseNumber(useCSSVariable("--motion-press-scale"), 1)
  const scale = useSharedValue(1)
  const progress = useSharedValue(isHeld ? 1 : 0)
  const target = motion.isReduced || motion.isOff ? 1 : pressScale
  const config = React.useMemo(
    () => ({
      duration: motion.enterMs,
      easing: motion.feedbackEasing,
      reduceMotion: ReduceMotion.Never,
    }),
    [motion.enterMs, motion.feedbackEasing]
  )
  React.useEffect(() => {
    progress.set(withTiming(isHeld ? 1 : 0, config))
  }, [config, isHeld, progress])
  const onPressIn = React.useCallback(() => {
    scale.set(withTiming(target, config))
    progress.set(withTiming(1, config))
  }, [config, progress, scale, target])
  const onPressOut = React.useCallback(() => {
    scale.set(withTiming(1, config))
    progress.set(withTiming(isHeld ? 1 : 0, config))
  }, [config, isHeld, progress, scale])
  return { scale, progress, onPressIn, onPressOut }
}

export { useMotion, usePressScale, useSurfaceAnimation, type MotionRole }
