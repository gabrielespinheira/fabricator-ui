"use client"

import * as React from "react"

import {
  getToastStack,
  shouldStackActions,
  TOAST_GAP,
  TOAST_INSET,
  TOAST_PEEK,
  type ToastSize,
} from "@/registry/bases/__base__/lib/toast-stack-model"

// Base UI's toasts and Sonner's.
const TOAST = '[data-slot="toast"], [data-sonner-toast]'
// Closed, and animating out: it keeps the place it had.
const LEAVING = '[data-ending-style], [data-removed="true"]'
const EXPANDED = '[data-expanded=""], [data-expanded="true"]'
const ACTION = '[data-slot="toast-action"], [data-content] ~ *'
const SONNER_TEXT = "[data-content]"
const SONNER_PARTS = "[data-content], [data-content] ~ *"
// Lays a toast out at its natural size, for the time it takes to read it.
const MEASURING = "data-measuring"
const STACKED = "data-stacked"
const BEHIND = "data-behind-front"
const SETTLED = "data-settled"

function setPixels(element: HTMLElement, name: string, value: number) {
  element.style.setProperty(`--toast-${name}`, `${value}px`)
}

/** Its size before an update, part-way through a transition included. */
function readCurrentSize(toast: HTMLElement): ToastSize | null {
  if (!toast.style.getPropertyValue("--toast-box-width")) return null
  const { width, height } = getComputedStyle(toast)
  return { width: parseFloat(width), height: parseFloat(height) }
}

function setBox(toast: HTMLElement, { width, height }: ToastSize) {
  setPixels(toast, "box-width", width)
  setPixels(toast, "box-height", height)
}

/** The size it wants, leaving its natural width on it for its content. */
function measureToast(toast: HTMLElement): ToastSize {
  const style = getComputedStyle(toast)
  const maxWidth = parseFloat(style.maxWidth)
  toast.removeAttribute(STACKED)
  toast.setAttribute(MEASURING, "row")
  toast.toggleAttribute(
    STACKED,
    shouldStackActions({
      rowWidth: parseFloat(style.width),
      maxWidth,
      hasActions: toast.querySelector(ACTION) !== null,
    })
  )
  toast.setAttribute(MEASURING, "box")
  // Rounded up, so a fraction of a pixel never wraps the last word.
  const size = {
    width: Math.ceil(parseFloat(style.width)),
    height: Math.ceil(parseFloat(style.height)),
  }
  setPixels(toast, "natural-width", size.width)
  // Sonner lays its parts out in the toast itself. While the toast changes size
  // around them, its text keeps a width of its own, and each part is cut to the
  // toast from where it stands.
  const text = toast.querySelector<HTMLElement>(SONNER_TEXT)
  if (text) {
    const { width } = getComputedStyle(text)
    setPixels(toast, "text-width", Math.ceil(parseFloat(width)))
  }
  toast.querySelectorAll<HTMLElement>(SONNER_PARTS).forEach((part) => {
    setPixels(part, "part-x", part.offsetLeft)
    setPixels(part, "part-y", part.offsetTop)
  })
  toast.removeAttribute(MEASURING)
  return size
}

function layOutStack(stack: Element, toasts: HTMLElement[]) {
  const front = toasts[0]
  if (!front) return
  const currentSizes = toasts.map(readCurrentSize)
  const sizes = toasts.map(measureToast)
  // Measuring ended any size transition, so each starts over from the size it
  // was showing.
  toasts.forEach((toast, index) => {
    const size = currentSizes[index]
    if (size) setBox(toast, size)
  })
  void front.offsetHeight
  const gap = parseFloat(getComputedStyle(stack).getPropertyValue("--gap"))
  const placements = getToastStack(sizes, {
    isExpanded: front.matches(EXPANDED),
    gap: Number.isNaN(gap) ? TOAST_GAP : gap,
    peek: TOAST_PEEK,
    inset: TOAST_INSET,
  })
  toasts.forEach((toast, index) => {
    const placement = placements[index]
    if (!placement) return
    setBox(toast, placement)
    setPixels(toast, "offset", placement.offset)
    setPixels(toast, "inset", placement.inset)
    toast.toggleAttribute(BEHIND, placement.isBehind)
  })
}

/** Restarts the content's entrance: the toast now says something else. */
function markSettled(toast: HTMLElement) {
  toast.removeAttribute(SETTLED)
  void toast.offsetWidth
  toast.setAttribute(SETTLED, "")
}

/**
 * Sizes toasts to their content and stacks them, for the element that holds
 * them. The style map reads the result from each toast: its box
 * (`--toast-box-width`, `--toast-box-height`), its place (`--toast-offset`,
 * `--toast-inset`), `data-stacked` when its actions sit under its text,
 * `data-behind-front` when another covers it and `data-settled` once its type
 * has changed.
 */
export function useToastStack() {
  const [container, setContainer] = React.useState<HTMLElement | null>(null)

  React.useLayoutEffect(() => {
    if (!container) return

    const layOut = () => {
      const toasts = Array.from(
        container.querySelectorAll<HTMLElement>(TOAST)
      ).filter((toast) => !toast.matches(LEAVING))
      // Sonner keeps one stack per position.
      new Set(toasts.map((toast) => toast.parentElement)).forEach((stack) => {
        if (!stack) return
        layOutStack(
          stack,
          toasts.filter((toast) => toast.parentElement === stack)
        )
      })
    }

    const observer = new MutationObserver((records) => {
      for (const { attributeName, target } of records) {
        if (attributeName !== "data-type") continue
        if (target instanceof HTMLElement && target.matches(TOAST)) {
          markSettled(target)
        }
      }
      layOut()
    })
    observer.observe(container, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "data-type",
        "data-expanded",
        "data-ending-style",
        "data-removed",
      ],
    })
    window.addEventListener("resize", layOut)
    layOut()
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", layOut)
    }
  }, [container])

  return setContainer
}
