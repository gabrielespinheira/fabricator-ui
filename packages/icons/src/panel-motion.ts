"use client"

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
} from "react"

import type { AnimatedIconHandle, AnimatedIconProps } from "./animated-icon.js"
import {
  SIDEBAR_TOGGLE_DURATION,
  SIDEBAR_TOGGLE_EASING,
} from "./generated/runtime/sidebar-toggle.js"
import { isMotionOff } from "./motion-preference.js"

export type AnimatedPanelIconProps = AnimatedIconProps & {
  /** Keep the icon in the selected panel state. */
  open?: boolean
  ref?: Ref<AnimatedIconHandle>
}

function getTiming(element: SVGSVGElement | null) {
  const style = element && getComputedStyle(element)
  const token = style?.getPropertyValue("--motion-move").trim()
  const duration = token
    ? Number.parseFloat(token) * (token.endsWith("ms") ? 1 : 1000)
    : SIDEBAR_TOGGLE_DURATION
  const scale = Number.parseFloat(
    style?.getPropertyValue("--motion-scale") ?? ""
  )
  const curve = style
    ?.getPropertyValue("--motion-ease-move")
    .match(/cubic-bezier\(([^)]+)\)/)?.[1]
  const [
    x1 = SIDEBAR_TOGGLE_EASING[0],
    y1 = 0,
    x2 = SIDEBAR_TOGGLE_EASING[2],
    y2 = 1,
  ] = curve?.split(",").map(Number) ?? SIDEBAR_TOGGLE_EASING
  const isStill = isMotionOff(element)
  const sample = (time: number, first: number, second: number) =>
    3 * (1 - time) ** 2 * time * first +
    3 * (1 - time) * time ** 2 * second +
    time ** 3

  return {
    duration:
      isStill || !Number.isFinite(duration)
        ? 0
        : duration * (Number.isFinite(scale) ? scale : 1),
    ease(progress: number) {
      let lower = 0
      let upper = 1
      for (let step = 0; step < 12; step++) {
        const middle = (lower + upper) / 2
        if (sample(middle, x1, x2) < progress) lower = middle
        else upper = middle
      }
      return sample((lower + upper) / 2, y1, y2)
    },
  }
}

export function usePanelMotion(
  open: boolean | undefined,
  loop: boolean | undefined,
  ref: Ref<AnimatedIconHandle> | undefined
) {
  const svg = useRef<SVGSVGElement>(null)
  const frame = useRef(0)
  const phase = useRef(Number(Boolean(open)))
  const shouldRepeat = useRef(false)
  const [progress, setProgress] = useState(phase.current)
  const cancel = useCallback(() => cancelAnimationFrame(frame.current), [])

  const move = useCallback(
    (target: number, onComplete?: () => void) => {
      cancel()
      const { duration, ease } = getTiming(svg.current)
      const start = phase.current
      if (duration <= 0 || start === target) {
        phase.current = target
        setProgress(target)
        if (duration > 0) onComplete?.()
        return
      }
      const started = performance.now()
      function draw(now: number) {
        const elapsed = Math.max(0, Math.min(1, (now - started) / duration))
        phase.current =
          elapsed === 1 ? target : start + (target - start) * ease(elapsed)
        setProgress(phase.current)
        if (elapsed < 1) frame.current = requestAnimationFrame(draw)
        else onComplete?.()
      }
      frame.current = requestAnimationFrame(draw)
    },
    [cancel]
  )

  useEffect(() => {
    if (open !== undefined) move(Number(open))
    return cancel
  }, [open, move, cancel])
  useEffect(() => {
    if (!loop) shouldRepeat.current = false
  }, [loop])

  function startPreview() {
    if (open !== undefined || isMotionOff(svg.current)) return
    shouldRepeat.current = Boolean(loop)
    function play() {
      move(1, () =>
        move(0, () => {
          if (shouldRepeat.current && !isMotionOff(svg.current)) play()
        })
      )
    }
    play()
  }

  function finishPreview() {
    shouldRepeat.current = false
  }

  useImperativeHandle(ref, () => ({
    startAnimation: startPreview,
    stopAnimation() {
      shouldRepeat.current = false
      cancel()
      phase.current = Number(Boolean(open))
      setProgress(phase.current)
    },
  }))

  return { progress, svg, startPreview, finishPreview }
}
