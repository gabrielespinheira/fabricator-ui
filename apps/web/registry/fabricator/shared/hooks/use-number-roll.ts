"use client"

// Rolls a number field's value into place when it steps: up from below when
// it grows, down from above when it shrinks, on the soft spring. The field's
// input is controlled, so React keeps its `value` attribute in step; typing
// changes it too, and is left alone. Reduce Motion and motion off skip it.
import * as React from "react"

import { getNumberRollDirection } from "@/registry/bases/__base__/lib/number-roll-model"
import { resolveSpringTransition } from "@/registry/bases/__base__/lib/spring-model"

// A value change this soon after a keystroke in the field is the typing's.
const TYPING_WINDOW_MS = 80
// How far the arriving value starts from its place, as a share of its height.
const ROLL_DISTANCE = "40%"

function roll(input: HTMLInputElement, direction: "up" | "down") {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
  const style = getComputedStyle(input)
  const timing = resolveSpringTransition(
    style.getPropertyValue("--motion-spring-soft-duration"),
    style.getPropertyValue("--motion-ease-soft-spring"),
    style.getPropertyValue("--motion-scale")
  )
  if (!timing) return
  const from = direction === "up" ? ROLL_DISTANCE : `-${ROLL_DISTANCE}`
  input.animate(
    [
      { translate: `0 ${from}`, opacity: 0 },
      { translate: "0 0", opacity: 1 },
    ],
    timing
  )
}

/** Ref callback for the number field's input. */
export function useNumberRoll() {
  const [input, setInput] = React.useState<HTMLInputElement | null>(null)

  React.useEffect(() => {
    if (!input) return
    let shown = input.value
    let typedAt = Number.NEGATIVE_INFINITY
    const onInput = () => {
      typedAt = performance.now()
      shown = input.value
    }
    const observer = new MutationObserver(() => {
      const previous = shown
      shown = input.value
      if (performance.now() - typedAt < TYPING_WINDOW_MS) return
      const direction = getNumberRollDirection(previous, shown)
      if (direction) roll(input, direction)
    })
    observer.observe(input, { attributes: true, attributeFilter: ["value"] })
    input.addEventListener("input", onInput)
    return () => {
      observer.disconnect()
      input.removeEventListener("input", onInput)
    }
  }, [input])

  return setInput
}
