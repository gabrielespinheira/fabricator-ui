"use client"

// Submenu aim for any menu popup, on every base. While the pointer heads for
// the submenu open from this menu (submenu-aim-model), the menu's rows hear
// nothing of it: hover events aimed at them stop at the window, before the
// primitive or Fluid Hover sees them, so the trigger stays lit and the
// submenu stays open. When the aim ends (the pointer lands in the submenu,
// turns away, rests or presses), the hover the rows missed is replayed, so
// the primitive's state matches where the pointer really is.
//
// The submenu is the element the open trigger's aria-controls names, which
// Base UI, Radix and React Aria all set.
import * as React from "react"

import {
  getSubmenuSide,
  initialSubmenuAim,
  stepSubmenuAim,
  SUBMENU_AIM_REST_MS,
  type AimPoint,
  type SubmenuAim,
} from "@/registry/bases/__base__/lib/submenu-aim-model"

const HOVER_EVENTS = [
  "pointerover",
  "pointerout",
  "pointerenter",
  "pointerleave",
  "pointermove",
  "mouseover",
  "mouseout",
  "mouseenter",
  "mouseleave",
  "mousemove",
] as const

const OPEN_TRIGGER = '[aria-haspopup][aria-expanded="true"][aria-controls]'

type OpenSubmenu = { trigger: HTMLElement; submenu: Element }

const replayed = new WeakSet<Event>()

/** Whether a hover event is one submenu aim replayed, not the browser's. */
export function isSubmenuAimReplay(event: Event) {
  return replayed.has(event)
}

/** Ref callback for a menu popup: its rows wait while the pointer aims at its open submenu. */
export function useSubmenuAim() {
  return React.useCallback((menu: HTMLElement | null) => {
    if (!menu) return
    return attachSubmenuAim(menu)
  }, [])
}

function attachSubmenuAim(menu: HTMLElement) {
  let aim: SubmenuAim = initialSubmenuAim
  // What the menu's handlers last saw under the pointer.
  let hovered: Element | null = null
  let isHolding = false
  let pointer: AimPoint | null = null
  let restTimer: number | undefined

  function getOpenSubmenu(): OpenSubmenu | null {
    const trigger = menu.querySelector<HTMLElement>(OPEN_TRIGGER)
    const id = trigger?.getAttribute("aria-controls")
    const controlled = id ? document.getElementById(id) : null
    if (!trigger || !controlled) return null
    // React Aria names the menu inside its popover.
    const submenu =
      controlled.closest('[data-slot$="sub-content"]') ?? controlled
    return { trigger, submenu }
  }

  function dispatch(
    type: string,
    target: Element,
    point: AimPoint,
    relatedTarget: Element | null,
    bubbles: boolean
  ) {
    const init = {
      bubbles,
      cancelable: true,
      composed: true,
      clientX: point.x,
      clientY: point.y,
      relatedTarget,
      view: window,
    }
    const event = type.startsWith("pointer")
      ? new PointerEvent(type, {
          ...init,
          pointerId: 1,
          pointerType: "mouse",
          isPrimary: true,
        })
      : new MouseEvent(type, init)
    replayed.add(event)
    target.dispatchEvent(event)
  }

  // The element and its ancestors up to the first that also holds `other`:
  // the ones a pointer moving between the two leaves or enters.
  function getCrossed(element: Element, other: Element | null) {
    const crossed: Element[] = []
    for (
      let node: Element | null = element;
      node && !(other && node.contains(other));
      node = node.parentElement
    ) {
      crossed.push(node)
    }
    return crossed
  }

  function replayLeave(from: Element, to: Element, point: AimPoint) {
    for (const family of ["pointer", "mouse"]) {
      dispatch(`${family}out`, from, point, to, true)
      for (const element of getCrossed(from, to)) {
        dispatch(`${family}leave`, element, point, to, false)
      }
    }
  }

  function replayEnter(to: Element, from: Element | null, point: AimPoint) {
    for (const family of ["pointer", "mouse"]) {
      dispatch(`${family}over`, to, point, from, true)
      for (const element of getCrossed(to, from).reverse()) {
        dispatch(`${family}enter`, element, point, from, false)
      }
    }
    dispatch("pointermove", to, point, null, true)
    dispatch("mousemove", to, point, null, true)
  }

  // Hand the rows back. `next` is what is under the pointer now; when the
  // browser is about to announce it itself (`isEntering`), only the leave the
  // rows missed is replayed.
  function release(next: Element | null, point: AimPoint, isEntering: boolean) {
    window.clearTimeout(restTimer)
    aim = { ...initialSubmenuAim, anchor: point }
    if (!isHolding) return
    isHolding = false
    if (!next || next === hovered) return
    if (hovered?.isConnected) replayLeave(hovered, next, point)
    if (!isEntering) replayEnter(next, hovered, point)
    hovered = next
  }

  function waitForRest() {
    window.clearTimeout(restTimer)
    restTimer = window.setTimeout(() => {
      if (!pointer) return
      release(document.elementFromPoint(pointer.x, pointer.y), pointer, false)
    }, SUBMENU_AIM_REST_MS)
  }

  function onHover(event: Event) {
    if (replayed.has(event) || !(event instanceof MouseEvent)) return
    if (event instanceof PointerEvent && event.pointerType !== "mouse") return
    const target = event.target
    if (!(target instanceof Element)) return
    const point = { x: event.clientX, y: event.clientY }
    const open = getOpenSubmenu()
    if (!open) {
      if (isHolding)
        release(menu.contains(target) ? target : null, point, false)
      aim = initialSubmenuAim
    } else if (
      event instanceof PointerEvent &&
      (point.x !== pointer?.x || point.y !== pointer.y)
    ) {
      // Every pointer event steers, not only moves: entering the next row is
      // announced before the move that gets there.
      pointer = point
      const submenuRect = open.submenu.getBoundingClientRect()
      const side = getSubmenuSide(
        open.trigger.getBoundingClientRect(),
        submenuRect
      )
      aim = stepSubmenuAim(aim, point, submenuRect, side)
      if (aim.isAiming) waitForRest()
    }
    const isOverSubmenu = Boolean(open?.submenu.contains(target))
    const isOverRows = menu.contains(target) && !isOverSubmenu
    if (aim.isAiming && isOverRows) {
      isHolding = true
      event.stopPropagation()
      return
    }
    const isEntering =
      event.type === "pointerover" || event.type === "mouseover"
    if (isHolding && (isOverRows || isOverSubmenu)) {
      release(target, point, isEntering)
    }
    // Outside the menu while holding, the rows still think the pointer is on
    // the row it left.
    if (isEntering && !isHolding) hovered = target
  }

  // A press while holding goes to the row under the pointer, so it must hear
  // the hover first.
  function onPress(event: PointerEvent) {
    if (!isHolding || !(event.target instanceof Element)) return
    release(event.target, { x: event.clientX, y: event.clientY }, false)
  }

  for (const type of HOVER_EVENTS) {
    window.addEventListener(type, onHover, { capture: true })
  }
  window.addEventListener("pointerdown", onPress, { capture: true })
  return () => {
    window.clearTimeout(restTimer)
    for (const type of HOVER_EVENTS) {
      window.removeEventListener(type, onHover, { capture: true })
    }
    window.removeEventListener("pointerdown", onPress, { capture: true })
  }
}
