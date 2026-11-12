"use client"

import * as React from "react"

import {
  getChipShift,
  getTransitionTime,
  parseTranslate,
  reconcileChips,
  removeExitedChip,
  type ChipPoint,
  type ChipPresence,
} from "@/registry/bases/__base__/lib/multi-select-model"

// Marks each chip the hook animates; the value is the chip's key.
const KEY = "data-chip-key"
// Marks a chip that is leaving; the style map runs its exit from it.
const EXITING = "data-exiting"
// Inline styles that pop a leaving chip out of the row.
const POPPED = ["position", "left", "top", "width"] as const

function getTime(element: Element) {
  const style = getComputedStyle(element)
  return getTransitionTime(
    style.transitionProperty,
    style.transitionDuration,
    style.transitionDelay
  )
}

// Where each chip is laid out in the container, ignoring glides in flight.
// The container is the chips' offset parent.
function measure(container: HTMLElement) {
  const points = new Map<string, ChipPoint>()
  for (const chip of container.querySelectorAll<HTMLElement>(`[${KEY}]`)) {
    const key = chip.getAttribute(KEY)
    if (key !== null) points.set(key, { x: chip.offsetLeft, y: chip.offsetTop })
  }
  return points
}

// Takes each leaving chip out of the row, pinned where it stands, so the
// chips after it move up now rather than once it has gone. Pins every leaving
// chip before moving any, since each pin shifts the rest. A chip picked again
// before it left goes back into the row.
function popLeavingChips(container: HTMLElement) {
  const chips = Array.from(container.querySelectorAll<HTMLElement>(`[${KEY}]`))
  const pins = chips
    .filter((chip) => chip.hasAttribute(EXITING) && !chip.style.position)
    .map((chip) => ({
      chip,
      left: chip.offsetLeft,
      top: chip.offsetTop,
      // Fractional, so the pinned label doesn't lose a pixel and truncate.
      width: chip.getBoundingClientRect().width,
    }))
  for (const chip of chips) {
    if (chip.hasAttribute(EXITING) || !chip.style.position) continue
    for (const property of POPPED) chip.style.removeProperty(property)
  }
  for (const { chip, left, top, width } of pins) {
    chip.style.position = "absolute"
    chip.style.left = `${left}px`
    chip.style.top = `${top}px`
    chip.style.width = `${width}px`
  }
}

/**
 * Pops a removed chip out of the row where it stood and lets its exit
 * transition run there, while the chips after it glide into place at the same
 * time. Entrances are CSS (`@starting-style`); exits and glides take their
 * timing from the chip's own transition in the style map, so reduced motion
 * and `data-motion="off"` stop them too.
 *
 * Spread `getChipProps(chip)` on each chip and attach `ref` to the element
 * the chips wrap in; their row is the positioned element around it.
 */
export function useChipPresence<TItem>(
  items: readonly TItem[],
  getKey: (item: TItem) => string
) {
  const [chips, setChips] = React.useState<readonly ChipPresence<TItem>[]>(() =>
    reconcileChips([], items, getKey)
  )
  const next = reconcileChips(chips, items, getKey)
  if (next !== chips) setChips(next)

  const [container, setContainer] = React.useState<HTMLElement | null>(null)
  const points = React.useRef(new Map<string, ChipPoint>())
  const leaving = React.useRef(new Set<string>())

  // Glide every chip that moved since the last layout from where it was.
  React.useLayoutEffect(() => {
    if (!container) return
    popLeavingChips(container)
    const after = measure(container)
    for (const [key, point] of after) {
      const chip = container.querySelector<HTMLElement>(
        `[${KEY}="${CSS.escape(key)}"]`
      )
      const before = points.current.get(key)
      // Only a chip whose place changed glides; one still gliding to the
      // same place keeps its glide.
      if (!chip || !before || !getChipShift(before, point)) continue
      if (getTime(chip) === 0) continue
      // A glide still in flight turns around from where the chip is drawn.
      const flight = parseTranslate(getComputedStyle(chip).translate)
      const shift = getChipShift(
        { x: before.x + flight.x, y: before.y + flight.y },
        point
      )
      if (!shift) continue
      chip.style.transition = "none"
      chip.style.translate = `${shift.x}px ${shift.y}px`
      void chip.offsetWidth
      chip.style.transition = ""
      chip.style.translate = ""
    }
    points.current = after
  }, [container, next])

  // A resized field moves chips without a change to glide.
  React.useEffect(() => {
    if (!container) return
    const observer = new ResizeObserver(() => {
      points.current = measure(container)
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [container])

  // Drop each leaving chip once its exit has run.
  React.useEffect(() => {
    if (!container) return
    const timers: number[] = []
    for (const chip of next) {
      if (!chip.isExiting || leaving.current.has(chip.key)) continue
      const element = container.querySelector(
        `[${KEY}="${CSS.escape(chip.key)}"]`
      )
      const time = element ? getTime(element) : 0
      leaving.current.add(chip.key)
      timers.push(
        window.setTimeout(() => {
          leaving.current.delete(chip.key)
          setChips((current) => removeExitedChip(current, chip.key))
        }, time)
      )
    }
    // A chip picked again before it left stops leaving.
    for (const key of leaving.current) {
      if (!next.some((chip) => chip.key === key && chip.isExiting)) {
        leaving.current.delete(key)
      }
    }
    return () => {
      for (const timer of timers) window.clearTimeout(timer)
    }
  }, [container, next])

  const getChipProps = React.useCallback(
    ({ key, isExiting }: ChipPresence<TItem>) => ({
      [KEY]: key,
      [EXITING]: isExiting ? "" : undefined,
    }),
    []
  )

  return { chips: next, ref: setContainer, getChipProps }
}
