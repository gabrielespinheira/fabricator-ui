"use client"

// One tooltip that travels between triggers: a tooltip opening while another
// shows, or just after it closed, starts at the old one's place and size and
// springs to its own on the lead spring (tooltip-travel-model). Every tooltip
// on the page shares the last one shown. Reduce Motion and motion off open
// in place, as before.
import * as React from "react"

import { resolveSpringTransition } from "@/registry/bases/__base__/lib/spring-model"
import {
  getTooltipTravel,
  shouldTooltipTravel,
  type TooltipBox,
} from "@/registry/bases/__base__/lib/tooltip-travel-model"

let last: {
  element: HTMLElement
  box: TooltipBox
  hiddenAt: number | null
} | null = null

function measure(element: HTMLElement): TooltipBox {
  const rect = element.getBoundingClientRect()
  return {
    left: rect.left,
    top: rect.top,
    width: element.offsetWidth,
    height: element.offsetHeight,
  }
}

function travel(element: HTMLElement, from: TooltipBox, to: TooltipBox) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const style = getComputedStyle(element)
  const timing = resolveSpringTransition(
    style.getPropertyValue("--motion-spring-lead-duration"),
    style.getPropertyValue("--motion-ease-lead-spring"),
    style.getPropertyValue("--motion-scale")
  )
  if (!timing) return
  const start = getTooltipTravel(from, to)
  // The new label stays on one line while the box grows or shrinks to it,
  // clipped instead of wrapping at the old width.
  element.animate(
    [
      {
        translate: `${start.x}px ${start.y}px`,
        width: `${start.width}px`,
        height: `${start.height}px`,
        overflow: "hidden",
        whiteSpace: "nowrap",
      },
      {
        translate: "0 0",
        width: `${to.width}px`,
        height: `${to.height}px`,
        overflow: "hidden",
        whiteSpace: "nowrap",
      },
    ],
    timing
  )
}

/** Ref callback for the tooltip's popup. */
export function useTooltipTravel() {
  return React.useCallback((element: HTMLElement | null) => {
    if (!element) return
    const previous = last && last.element !== element ? last : null
    const shouldTravel = shouldTooltipTravel(previous, performance.now())
    // The positioner places the popup after it mounts.
    const frame = requestAnimationFrame(() => {
      const box = measure(element)
      if (shouldTravel && previous) travel(element, previous.box, box)
      last = { element, box, hiddenAt: null }
    })
    return () => {
      cancelAnimationFrame(frame)
      if (last?.element === element) {
        last = { ...last, hiddenAt: performance.now() }
      }
    }
  }, [])
}
