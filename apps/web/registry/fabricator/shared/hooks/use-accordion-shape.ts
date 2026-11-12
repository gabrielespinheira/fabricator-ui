"use client"

import * as React from "react"

import { getAccordionItemShape } from "@/registry/bases/__base__/lib/accordion-model"

const ITEM = ':scope > [data-slot="accordion-item"]'
// Every primitive marks an open item its own way.
const OPEN = '[data-open], [data-state="open"], [data-expanded]'
const OPEN_ATTRIBUTES = ["data-open", "data-state", "data-expanded"]

// Marks each item with where it sits: `data-gap` above an open item and the
// one after it, `data-joined-top` and `data-joined-bottom` on the corners
// closed neighbours share. Attributes rather than `:has()` selectors, which
// cost the whole page a style pass on every click.
function applyAccordionShape(root: HTMLElement) {
  const items = Array.from(root.querySelectorAll<HTMLElement>(ITEM))
  const keys = items.map((_, index) => String(index))
  const open = keys.filter((_, index) => items[index].matches(OPEN))
  items.forEach((item, index) => {
    const shape = getAccordionItemShape(keys, open, keys[index])
    item.toggleAttribute("data-gap", shape.hasGap)
    item.toggleAttribute("data-joined-top", !shape.isTopRound)
    item.toggleAttribute("data-joined-bottom", !shape.isBottomRound)
  })
}

/**
 * A ref callback for the accordion's root. The shape follows every open and
 * close before the frame paints, so the gaps and corners start moving with
 * the panel.
 */
function useAccordionShape<T extends HTMLElement>() {
  const [root, setRoot] = React.useState<T | null>(null)
  React.useLayoutEffect(() => {
    if (!root) return
    applyAccordionShape(root)
    const observer = new MutationObserver(() => applyAccordionShape(root))
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: OPEN_ATTRIBUTES,
    })
    return () => observer.disconnect()
  }, [root])
  return setRoot
}

export { useAccordionShape }
