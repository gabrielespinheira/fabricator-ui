"use client"

import {
  useCallback,
  useMemo,
  useState,
  type MouseEvent,
  type MouseEventHandler,
} from "react"
import { useAnimation as useMotionAnimation } from "motion/react"

import { hasA11yProp } from "./generated/runtime/attributes.js"
import type { IconWeight } from "./generated/runtime/types.js"
import { renderIcon, type IconProps } from "./icon.js"
import { isMotionOff } from "./motion-preference.js"

export { isMotionOff } from "./motion-preference.js"

/** The same props as an outline icon. */
export type AnimatedIconProps = Omit<IconProps, "nonScalingStroke" | "ref"> & {
  variant?: IconWeight
  /** Keep replaying until the pointer leaves or stopAnimation is called. */
  loop?: boolean
}

/** Passing a `ref` takes over from hover: start and stop the animation yourself. */
export type AnimatedIconHandle = {
  startAnimation: () => void
  stopAnimation: () => void
}

type HoverHandler = MouseEventHandler<SVGSVGElement>

/**
 * Motion's `useAnimation`, which every animated icon goes through: with reduced
 * motion, or `data-motion="off"` on `<html>`, the icon stays at rest.
 */
export function useAnimation() {
  const controls = useMotionAnimation()
  return useMemo(
    () => ({
      ...controls,
      start: ((...args) =>
        isMotionOff()
          ? Promise.resolve([])
          : controls.start(...args)) as typeof controls.start,
    }),
    [controls]
  )
}

/** Hover state for the few icons that animate from it, with the same rule. */
export function useHoverState(initial: boolean) {
  const [isHovered, setIsHovered] = useState(initial)
  const setHover = useCallback((next: boolean) => {
    if (next && isMotionOff()) return
    setIsHovered(next)
  }, [])
  return [isHovered, setHover] as const
}

/**
 * Upstream's icons forward the consumer's hover handlers only when a ref
 * controls them. Generated icons pass these empty ones to that code and call
 * the consumer's from `composeHandlers`, so they always run, once.
 */
export const NO_HANDLERS: {
  onMouseEnter?: HoverHandler
  onMouseLeave?: HoverHandler
} = {}

export function composeHandlers(
  own: ((event: MouseEvent<SVGSVGElement>) => unknown) | undefined,
  consumer: HoverHandler | undefined
): HoverHandler {
  return (event) => {
    void own?.(event)
    consumer?.(event)
  }
}

/** The root every animated icon renders: an `<svg>` like any outline icon's. */
export function AnimatedSvg({
  name,
  variant: _variant,
  loop: _loop,
  ...props
}: AnimatedIconProps & { name: string }) {
  return renderIcon(
    { name, node: [] },
    { ...(!hasA11yProp(props) && { "aria-hidden": true }), ...props }
  )
}
