// Motion by role, never milliseconds: the same tokens as the website, read
// from the theme, so `applyLook` and a scoped speed reach every surface.

import * as React from "react"
import {
  Easing,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  DEFAULT_MOTION_SPEED,
  MOTION_SPEED_NAMES,
  MOTION_SPEEDS,
} from "@/registry/fabricator/motion"
import {
  getSurfaceFrom,
  parseBezier,
  parseNumber,
} from "@/registry/native/lib/motion-tokens"

type MotionRole =
  | "feedback"
  | "glide"
  | "move"
  | "tooltip"
  | "popup"
  | "dialog"
  | "sheet"
  | "disclosure"
  | "toast"

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
    const { easings } = MOTION_SPEEDS[name ?? DEFAULT_MOTION_SPEED]
    return {
      isOff: multiplier === 0,
      isReduced,
      enterMs: parseNumber(enter, 0) * multiplier,
      exitMs: parseNumber(exit, 0) * multiplier,
      enterEasing: Easing.bezier(...parseBezier(easings.enter)),
      exitEasing: Easing.bezier(...parseBezier(easings.exit)),
      moveEasing: Easing.bezier(...parseBezier(easings.move)),
      drawerEasing: Easing.bezier(...parseBezier(easings.drawer)),
    }
  }, [enter, exit, scale, speed, isReduced])
}

type SurfaceFrom = { scale?: number; translateY?: number }

/**
 * `entering` and `exiting` for a surface that appears: a fade, plus the zoom
 * and slide its role allows. Undefined when motion is off.
 */
function useSurfaceAnimation(role: MotionRole, from: SurfaceFrom = {}) {
  const motion = useMotion(role)
  // Only these roles zoom; asking for any other token warns in development.
  const hasScale = role === "tooltip" || role === "popup" || role === "dialog"
  const scaleToken = useCSSVariable(
    hasScale ? `--motion-${role}-scale` : "--motion-press-scale"
  )
  const scale = from.scale ?? (hasScale ? parseNumber(scaleToken, 1) : 1)
  const translateY = from.translateY ?? 0
  return React.useMemo(() => {
    if (motion.isOff) return { entering: undefined, exiting: undefined }
    const start = getSurfaceFrom({ scale, translateY }, motion.isReduced)
    const enter = { duration: motion.enterMs, easing: motion.enterEasing }
    const exit = { duration: motion.exitMs, easing: motion.exitEasing }
    return {
      entering: () => {
        "worklet"
        return {
          initialValues: {
            opacity: start.opacity,
            transform: [
              { translateY: start.translateY },
              { scale: start.scale },
            ],
          },
          animations: {
            opacity: withTiming(1, enter),
            transform: [
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
            transform: [{ translateY: 0 }, { scale: 1 }],
          },
          animations: {
            opacity: withTiming(start.opacity, exit),
            transform: [
              { translateY: withTiming(start.translateY, exit) },
              { scale: withTiming(start.scale, exit) },
            ],
          },
        }
      },
    }
  }, [motion, scale, translateY])
}

/** The press: a scale while held, on the feedback timing. */
function usePressScale() {
  const motion = useMotion("feedback")
  const pressScale = parseNumber(useCSSVariable("--motion-press-scale"), 1)
  const scale = useSharedValue(1)
  const target = motion.isReduced || motion.isOff ? 1 : pressScale
  const onPressIn = React.useCallback(() => {
    scale.set(
      withTiming(target, {
        duration: motion.enterMs,
        easing: motion.enterEasing,
      })
    )
  }, [motion.enterEasing, motion.enterMs, scale, target])
  const onPressOut = React.useCallback(() => {
    scale.set(
      withTiming(1, {
        duration: motion.exitMs,
        easing: motion.exitEasing,
      })
    )
  }, [motion.exitEasing, motion.exitMs, scale])
  return { scale, onPressIn, onPressOut }
}

export { useMotion, usePressScale, useSurfaceAnimation, type MotionRole }
