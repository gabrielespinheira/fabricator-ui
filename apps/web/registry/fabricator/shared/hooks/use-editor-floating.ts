"use client"

import * as React from "react"

import {
  getFloatingLayout,
  intersectRects,
  type FloatingAlign,
  type FloatingSide,
  type SurfaceRect,
} from "@/registry/bases/__base__/lib/editor-surface-model"

// Keeps the editor's bars and menus whole wherever the editor sits. They open
// in the browser's top layer (the Popover API), so no parent's overflow,
// transform, mask or stacking crops them, and they stay inside the editor in
// the DOM, so a dialog's focus trap and outside press still count them in.

/** Room kept between a floating part and the edges of the screen. */
const SCREEN_INSET = 8

/** Puts an element with `popover="manual"` in the top layer. */
function openInTopLayer(element: HTMLElement | null) {
  // Browsers without the Popover API keep it as a fixed element.
  if (typeof element?.showPopover !== "function") return
  if (element.matches(":popover-open")) return
  element.showPopover()
}

function getView(element: Element) {
  return element.ownerDocument.defaultView ?? window
}

/** What the person can see of the page: the virtual keyboard and pinch zoom cut it. */
function getScreenRect(element: Element): SurfaceRect {
  const view = getView(element)
  const viewport = view.visualViewport
  const left = (viewport?.offsetLeft ?? 0) + SCREEN_INSET
  const top = (viewport?.offsetTop ?? 0) + SCREEN_INSET
  return {
    left,
    top,
    right: left + (viewport?.width ?? view.innerWidth) - SCREEN_INSET * 2,
    bottom: top + (viewport?.height ?? view.innerHeight) - SCREEN_INSET * 2,
  }
}

/**
 * The room an element's clipping and scrolling ancestors leave it on screen,
 * or null when they leave none. A fixed ancestor ends the walk: nothing
 * outside clips it.
 */
function getClipRect(element: Element): SurfaceRect | null {
  const view = getView(element)
  const { body, documentElement } = element.ownerDocument
  let clip: SurfaceRect | null = getScreenRect(element)
  let child = element
  while (clip && view.getComputedStyle(child).position !== "fixed") {
    const parent = child.parentElement
    if (!parent || parent === body || parent === documentElement) break
    const { overflowX, overflowY } = view.getComputedStyle(parent)
    if (overflowX !== "visible" || overflowY !== "visible") {
      clip = intersectRects(clip, parent.getBoundingClientRect())
    }
    child = parent
  }
  return clip
}

/** The part of an element that is on screen and not clipped, or null. */
function getVisibleRect(element: Element): SurfaceRect | null {
  const clip = getClipRect(element)
  return clip && intersectRects(clip, element.getBoundingClientRect())
}

type EditorFloatingOptions = {
  /** What it opens beside; null hides it, as when that scrolls out of view. */
  getAnchor: () => SurfaceRect | null
  /** Boxes to stay in before the screen, best first. */
  getLimits?: () => readonly SurfaceRect[]
  side: FloatingSide
  align: FloatingAlign
  gap: number
  /** The part scrolls, so it can be shorter than its content. */
  canShrink?: boolean
  /** Escape pressed inside it, kept from the dialog around the editor. */
  onEscape?: () => void
}

function placeFloating(element: HTMLElement, options: EditorFloatingOptions) {
  const anchor = options.getAnchor()
  element.toggleAttribute("data-anchor-hidden", !anchor)
  if (!anchor) return

  const screen = getScreenRect(element)
  const limits = options.getLimits?.() ?? []
  const { style, scrollTop } = element
  // For a part whose width follows the editor's.
  const [room = screen] = limits
  style.setProperty("--editor-room", `${room.right - room.left}px`)
  // Its own size, before the last placement shrank it.
  style.maxHeight = ""
  style.maxWidth = `${screen.right - screen.left}px`
  // offsetWidth ignores the entrance's scale.
  const size = { width: element.offsetWidth, height: element.offsetHeight }
  const layout = getFloatingLayout({
    ...options,
    anchor,
    limits,
    screen,
    size,
  })

  element.dataset.side = layout.side
  style.left = `${layout.left}px`
  style.top = `${layout.top}px`
  style.maxWidth = `${layout.maxWidth}px`
  if (layout.maxHeight < size.height) style.maxHeight = `${layout.maxHeight}px`
  element.scrollTop = scrollTop
  const originX = (anchor.left + anchor.right) / 2 - layout.left
  style.transformOrigin = `${originX}px ${layout.side === "top" ? "100%" : "0%"}`
}

/**
 * Opens the element in the top layer and keeps it beside its anchor through
 * scrolling, resizing, zooming and edits. Use it in a component that mounts
 * when the part opens.
 */
function useEditorFloating(
  ref: React.RefObject<HTMLElement | null>,
  options: EditorFloatingOptions
) {
  const optionsRef = React.useRef(options)

  // Every render of the part means its anchor or its content may have moved.
  React.useLayoutEffect(() => {
    optionsRef.current = options
    const element = ref.current
    if (!element) return
    openInTopLayer(element)
    placeFloating(element, options)
  })

  React.useEffect(() => {
    const element = ref.current
    if (!element) return
    const view = getView(element)
    const place = () => placeFloating(element, optionsRef.current)
    const observer = new ResizeObserver(place)
    const editor = element.closest("[data-slot=editor]")
    observer.observe(element)
    for (const observed of [
      editor,
      editor?.querySelector("[data-slot=editor-content]"),
    ]) {
      if (observed) observer.observe(observed)
    }
    const onScroll = (event: Event) => {
      // A menu scrolling its own items stays where it is.
      if (event.target instanceof Node && element.contains(event.target)) return
      place()
    }
    // At the window, ahead of a dialog that listens in the capture phase.
    const onKeyDown = (event: KeyboardEvent) => {
      const { onEscape } = optionsRef.current
      if (event.key !== "Escape" || event.isComposing || !onEscape) return
      if (!(event.target instanceof Node)) return
      if (!element.contains(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      onEscape()
    }
    view.addEventListener("keydown", onKeyDown, { capture: true })
    view.addEventListener("scroll", onScroll, { capture: true, passive: true })
    view.addEventListener("resize", place)
    view.visualViewport?.addEventListener("resize", place)
    view.visualViewport?.addEventListener("scroll", place)
    return () => {
      observer.disconnect()
      view.removeEventListener("keydown", onKeyDown, { capture: true })
      view.removeEventListener("scroll", onScroll, { capture: true })
      view.removeEventListener("resize", place)
      view.visualViewport?.removeEventListener("resize", place)
      view.visualViewport?.removeEventListener("scroll", place)
    }
  }, [ref])
}

export { getClipRect, getVisibleRect, openInTopLayer, useEditorFloating }
export type { EditorFloatingOptions }
