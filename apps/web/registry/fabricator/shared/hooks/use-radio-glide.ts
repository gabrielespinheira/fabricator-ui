"use client"

import * as React from "react"

import { useMergedRef } from "@/registry/bases/__base__/lib/fluid-hover"
import { getGlideOffset } from "@/registry/bases/__base__/lib/radio-glide-model"

const GROUP = '[data-slot="radio-group"]'
const ITEM = '[data-slot="radio-group-item"]'
const INDICATOR = '[data-slot="radio-group-indicator"]'
// Switches the indicators' transitions off while the glide's start is set.
const GLIDING = "data-gliding"

// Every primitive marks the checked radio its own way.
const CHECKED_ATTRIBUTES = ["data-checked", "data-state", "data-selected"]

function glide(group: HTMLElement, from: HTMLElement, to: HTMLElement) {
  const leaving = from.querySelector<HTMLElement>(INDICATOR)
  const arriving = to.querySelector<HTMLElement>(INDICATOR)
  if (!leaving || !arriving || !from.isConnected) return
  // Read mid-flight too, so a glide interrupted by another pick turns around
  // from where the dot is.
  const start = leaving.getBoundingClientRect()
  leaving.setAttribute(GLIDING, "")
  arriving.setAttribute(GLIDING, "")
  arriving.style.translate = ""
  const scale = group.offsetWidth
    ? group.getBoundingClientRect().width / group.offsetWidth
    : 1
  const offset = getGlideOffset(start, arriving.getBoundingClientRect(), scale)
  if (offset) arriving.style.translate = `${offset.x}px ${offset.y}px`
  // Commit the start with transitions off: the old dot vanishes and the new
  // one stands where it was. Then the style map's transition carries it home.
  void arriving.offsetWidth
  leaving.removeAttribute(GLIDING)
  arriving.removeAttribute(GLIDING)
  arriving.style.translate = ""
}

/**
 * Glides the checked dot from the radio it leaves to the one picked, like a
 * shared-layout animation. The dot stays inside each radio, so it renders on
 * the server and takes each radio's invalid and disabled look; only the move
 * is borrowed. Timing and reduced motion come from the indicator's transition
 * in the style map. Returns the group's ref, merged with the consumer's.
 *
 * `checked` matches the checked radio's own attribute, e.g. `[data-checked]`.
 */
export function useRadioGlide<T extends HTMLElement>(
  checked: string,
  ref?: React.Ref<T>
) {
  const attach = React.useCallback(
    (group: T | null) => {
      if (!group) return
      // A radio group nested in this one keeps its own dot.
      const findChecked = () =>
        Array.from(
          group.querySelectorAll<HTMLElement>(`${ITEM}${checked}`)
        ).find((item) => item.closest(GROUP) === group) ?? null
      let current = findChecked()
      // Runs after the primitive's commit and before paint, so the new dot is
      // never seen at rest before it sets off.
      const sync = () => {
        const next = findChecked()
        if (next === current) return
        const previous = current
        current = next
        if (previous && next) glide(group, previous, next)
      }
      const observer = new MutationObserver(sync)
      observer.observe(group, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: CHECKED_ATTRIBUTES,
      })
      return () => {
        // A new ref (a consumer's inline one) detaches this in the very commit
        // that moved the selection; disconnecting would drop that glide.
        if (observer.takeRecords().length > 0) sync()
        observer.disconnect()
      }
    },
    [checked]
  )
  return useMergedRef(attach, ref)
}
