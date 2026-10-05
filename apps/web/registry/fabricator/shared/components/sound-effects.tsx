"use client"

import * as React from "react"

import {
  getSoundsEnabled,
  isSoundName,
  playSound,
  setSoundsEnabled,
  setSoundVolume,
  type SoundName,
} from "@/registry/bases/__base__/lib/sounds"

/*
 * <SoundEffects /> gives every component interface sounds without touching
 * their source. Render it once near the root. While mounted it listens on the
 * document and picks a sound from what was clicked or what appeared, using
 * the same ARIA roles and data-slot names every base shares.
 *
 * Override per element with data-sound="<name>", or silence an element (and
 * everything inside it) with data-sound="none".
 */

const INTERACTIVE = [
  "[data-sound]",
  "button",
  "a[data-slot]",
  "summary",
  "input[type=checkbox]",
  "input[type=radio]",
  "[aria-pressed]",
  ...[
    "button",
    "switch",
    "checkbox",
    "radio",
    "tab",
    "option",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "treeitem",
  ].map((role) => `[role=${role}]`),
].join(", ")

/** What the click resolver needs to know about the clicked control. */
export type ClickTarget = {
  /** data-sound on the control or its nearest ancestor that has one. */
  sound?: string | null
  role?: string | null
  tag: string
  type?: string | null
  slot?: string | null
  disabled?: boolean
  hasPopup?: boolean
  pressed?: boolean
}

/** A sound now, or a sound that depends on the state after the click. */
export type ClickSound = SoundName | "toggle" | "check" | null

export function resolveClickSound(target: ClickTarget): ClickSound {
  if (target.sound) {
    return isSoundName(target.sound) ? target.sound : null
  }
  if (target.disabled) return "deny"
  // Triggers that open a popup stay quiet: the popup plays when it appears.
  if (target.hasPopup) return null

  const role = target.role
  if (role === "switch" || target.slot === "switch") return "toggle"
  if (
    role === "checkbox" ||
    role === "menuitemcheckbox" ||
    (target.tag === "input" && target.type === "checkbox")
  ) {
    return "check"
  }
  if (
    role === "radio" ||
    role === "tab" ||
    role === "option" ||
    role === "menuitemradio" ||
    role === "treeitem" ||
    (target.tag === "input" && target.type === "radio") ||
    target.slot === "toggle-group-item" ||
    target.pressed
  ) {
    return "tick"
  }
  if (
    role === "menuitem" ||
    role === "button" ||
    target.tag === "button" ||
    target.tag === "summary" ||
    (target.tag === "a" && !!target.slot)
  ) {
    return "tap"
  }
  return null
}

/** The sound for a switch or checkbox once its new state has committed. */
export function resolveStateSound(
  kind: "toggle" | "check",
  checked: boolean
): SoundName {
  if (kind === "toggle") return checked ? "toggle-on" : "toggle-off"
  return checked ? "check" : "uncheck"
}

const OPEN_SLOTS = [
  "dialog-content",
  "alert-dialog-content",
  "sheet-content",
  "drawer-content",
]

const POP_SLOTS = [
  "popover-content",
  "dropdown-menu-content",
  "dropdown-menu-sub-content",
  "context-menu-content",
  "context-menu-sub-content",
  "menubar-content",
  "menubar-sub-content",
  "select-content",
  "combobox-content",
  "hover-card-content",
  "navigation-menu-content",
]

const NOTIFY_SLOTS = ["toast"]

/** The sound for a popup with this data-slot appearing or going away. */
export function resolveSlotSound(
  slot: string | null | undefined,
  phase: "appear" | "disappear"
): SoundName | null {
  if (!slot) return null
  if (OPEN_SLOTS.includes(slot)) return phase === "appear" ? "open" : "close"
  if (phase === "disappear") return null
  if (POP_SLOTS.includes(slot)) return "pop"
  if (NOTIFY_SLOTS.includes(slot)) return "notify"
  return null
}

const WATCHED = [
  ...[...OPEN_SLOTS, ...POP_SLOTS, ...NOTIFY_SLOTS].map(
    (slot) => `[data-slot="${slot}"]`
  ),
  "[data-sonner-toast]",
].join(", ")

// Several popups can change in one batch; the most meaningful one plays.
const PRIORITY: SoundName[] = ["open", "notify", "close", "pop"]

function describe(element: Element): ClickTarget {
  const soundHost = element.closest("[data-sound]")
  return {
    sound: soundHost?.getAttribute("data-sound"),
    role: element.getAttribute("role"),
    tag: element.tagName.toLowerCase(),
    type: element.getAttribute("type"),
    slot: element.getAttribute("data-slot"),
    disabled:
      element.getAttribute("aria-disabled") === "true" ||
      element.hasAttribute("data-disabled"),
    hasPopup: (() => {
      const value = element.getAttribute("aria-haspopup")
      return value !== null && value !== "false"
    })(),
    pressed: element.hasAttribute("aria-pressed"),
  }
}

function isChecked(element: Element) {
  if (element instanceof HTMLInputElement) return element.checked
  return (
    element.getAttribute("aria-checked") === "true" ||
    element.hasAttribute("data-checked") ||
    element.getAttribute("data-state") === "checked"
  )
}

function slotOf(element: Element) {
  if (element.hasAttribute("data-sonner-toast")) return "toast"
  return element.getAttribute("data-slot")
}

function isOpen(element: Element) {
  const state = element.getAttribute("data-state")
  return state !== "closed" && !element.hasAttribute("data-closed")
}

/** Installs the document listeners; returns a cleanup function. */
export function installSoundEffects(root: Document = document) {
  // A label click re-dispatches a click on its control; play once.
  let lastClickAt = -Infinity
  // Popups announced so far, so exit animations and unmounts don't repeat.
  const announced = new WeakMap<Element, "open" | "closed">()

  // Click sounds wait one frame. If the click also opened or closed a popup
  // (a Cancel button closing a dialog), the popup's sound plays instead:
  // React commits and the observer runs before that frame.
  let pendingClick: number | null = null
  const cancelPendingClick = () => {
    if (pendingClick !== null) cancelAnimationFrame(pendingClick)
    pendingClick = null
  }

  const onClick = (event: MouseEvent) => {
    if (!getSoundsEnabled()) return
    const target = event.target
    if (!(target instanceof Element)) return
    // A label stands in for its control: React Aria renders switches and
    // checkboxes as a label around a hidden input and doesn't re-dispatch the
    // click to it.
    const control =
      target.closest(INTERACTIVE) ?? target.closest("label")?.control ?? null
    if (!control) return
    const now = performance.now()
    if (now - lastClickAt < 80) return
    const sound = resolveClickSound(describe(control))
    if (!sound) return
    lastClickAt = now
    cancelPendingClick()
    pendingClick = requestAnimationFrame(() => {
      pendingClick = null
      // Switches and checkboxes: read the state the click committed.
      playSound(
        sound === "toggle" || sound === "check"
          ? resolveStateSound(sound, isChecked(control))
          : sound
      )
    })
  }

  const onInput = (event: Event) => {
    const target = event.target
    if (target instanceof HTMLInputElement && target.type === "range") {
      if (target.closest('[data-sound="none"]')) return
      playSound("notch")
    }
  }

  const observer = new MutationObserver((records) => {
    if (!getSoundsEnabled()) return
    const sounds = new Set<SoundName>()
    const consider = (element: Element, phase: "appear" | "disappear") => {
      const matches = element.matches(WATCHED)
        ? [element]
        : Array.from(element.querySelectorAll(WATCHED))
      for (const match of matches) {
        if (match.closest('[data-sound="none"]')) continue
        const next = phase === "appear" && isOpen(match) ? "open" : "closed"
        if (announced.get(match) === next) continue
        announced.set(match, next)
        const sound = resolveSlotSound(
          slotOf(match),
          next === "open" ? "appear" : "disappear"
        )
        if (sound) sounds.add(sound)
      }
    }

    for (const record of records) {
      if (record.type === "attributes") {
        const element = record.target as Element
        if (record.attributeName === "aria-valuenow") {
          // Sliders only: progress bars also report aria-valuenow.
          if (
            (element.getAttribute("role") === "slider" ||
              (element instanceof HTMLInputElement &&
                element.type === "range")) &&
            !element.closest('[data-sound="none"]')
          ) {
            sounds.add("notch")
          }
          continue
        }
        if (element.matches(WATCHED)) {
          consider(element, isOpen(element) ? "appear" : "disappear")
        }
        continue
      }
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) consider(node, "appear")
      })
      record.removedNodes.forEach((node) => {
        if (node instanceof Element) consider(node, "disappear")
      })
    }

    const sound = PRIORITY.find((name) => sounds.has(name))
    if (sound) {
      cancelPendingClick()
      playSound(sound)
    } else if (sounds.has("notch")) playSound("notch")
  })

  root.addEventListener("click", onClick, true)
  root.addEventListener("input", onInput, true)
  observer.observe(root.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [
      "data-state",
      "data-open",
      "data-closed",
      "aria-valuenow",
    ],
  })

  return () => {
    cancelPendingClick()
    root.removeEventListener("click", onClick, true)
    root.removeEventListener("input", onInput, true)
    observer.disconnect()
  }
}

/**
 * Plays interface sounds for every component on the page while mounted.
 * Render it once, near the root, and pass the user's preference to `enabled`.
 */
export function SoundEffects({
  enabled,
  volume,
}: {
  /** Turns sounds on or off. Sounds are off until something turns them on. */
  enabled?: boolean
  /** Master volume, 0 to 1. */
  volume?: number
}) {
  React.useEffect(() => {
    if (enabled !== undefined) setSoundsEnabled(enabled)
  }, [enabled])

  React.useEffect(() => {
    if (volume !== undefined) setSoundVolume(volume)
  }, [volume])

  React.useEffect(() => installSoundEffects(), [])

  return null
}
