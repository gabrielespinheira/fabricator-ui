"use client"

import * as React from "react"

import {
  getSoundsEnabled,
  isSoundName,
  noteStep,
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
 * Every kind of component has its own sound: buttons knock (heavier for the
 * primary action, a damped thud for a destructive one), selection controls
 * click, rows tick, tabs ring, menus pop, dialogs bloom, sheets slide and
 * toasts chime by type. The full table is in the Sounds docs.
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
  /** Whether the control has aria-expanded: a disclosure trigger. */
  expandable?: boolean
  /** Button variant from data-variant, or read from the classes it renders. */
  variant?: string | null
  size?: string | null
  /** "previous" or "next" for paging and carousel controls. */
  direction?: "previous" | "next" | null
  /** A calendar day (it carries data-day). */
  day?: boolean
  /** A link inside Pagination (Base UI's Button replaces its data-slot). */
  paging?: boolean
}

/** Sounds that depend on the state the click commits. */
export type DeferredSound =
  | "switch"
  | "checkbox"
  | "toggle"
  | "tab"
  | "disclosure"

export type ClickSound = {
  sound: SoundName | DeferredSound
  pitch?: number
}

const ROW_SLOTS = [
  "sidebar-menu-button",
  "sidebar-menu-sub-button",
  "navigation-menu-link",
  "breadcrumb-link",
]

// Smaller buttons sound a little higher, larger ones a little lower.
const SIZE_PITCH: Record<string, number> = {
  xs: 1.12,
  "icon-xs": 1.12,
  sm: 1.06,
  "icon-sm": 1.06,
  lg: 0.92,
  "icon-lg": 0.92,
}

const DIRECTION_PITCH = { previous: 0.92, next: 1.08 }

export function resolveClickSound(target: ClickTarget): ClickSound | null {
  if (target.sound) {
    return isSoundName(target.sound) ? { sound: target.sound } : null
  }
  if (target.disabled) return { sound: "deny" }
  // Triggers that open a popup stay quiet: the popup plays when it appears.
  if (target.hasPopup) return null

  const { role, slot, tag, type } = target
  if (role === "switch" || slot === "switch") return { sound: "switch" }
  if (
    role === "checkbox" ||
    role === "menuitemcheckbox" ||
    (tag === "input" && type === "checkbox")
  ) {
    return { sound: "checkbox" }
  }
  if (slot === "toggle-group-item" || slot === "toggle" || target.pressed) {
    return { sound: "toggle" }
  }
  if (role === "tab") return { sound: "tab" }
  // One choice from a set.
  if (
    role === "radio" ||
    role === "menuitemradio" ||
    role === "option" ||
    (tag === "input" && type === "radio") ||
    target.day
  ) {
    return { sound: "pick" }
  }
  // The sidebar toggles quietly: it opens and closes too often to sound.
  if (slot === "sidebar-trigger" || slot === "sidebar-rail") return null
  // Accordions, collapsibles and <details>.
  if (target.expandable || tag === "summary") return { sound: "disclosure" }

  const pitch = target.direction ? DIRECTION_PITCH[target.direction] : undefined
  if (slot === "carousel-previous" || slot === "carousel-next") {
    return { sound: "whisk", pitch }
  }
  // A directional control drawn as a Button (it carries data-variant, like
  // the questionnaire's Previous and Next) keeps the button sound below.
  if (
    target.paging ||
    (target.direction && slot !== "button" && !target.variant)
  ) {
    return { sound: "page", pitch }
  }

  // Rows and links: the lightest sound, since there are many of them.
  if (
    role === "menuitem" ||
    role === "treeitem" ||
    (slot && ROW_SLOTS.includes(slot))
  ) {
    return { sound: "tick" }
  }

  if (slot === "button" || tag === "button" || role === "button") {
    const sizePitch = target.size ? SIZE_PITCH[target.size] : undefined
    const sound: SoundName =
      target.variant === "default"
        ? "press"
        : target.variant === "destructive"
          ? "thud"
          : target.variant === "link"
            ? "tick"
            : "tap"
    return { sound, pitch: sizePitch }
  }
  if (tag === "a" && slot) return { sound: "tick" }
  return null
}

/** The sound for a deferred click once the new state has committed. */
export function resolveStateSound(
  kind: Exclude<DeferredSound, "tab">,
  on: boolean
): SoundName {
  switch (kind) {
    case "switch":
      return on ? "toggle-on" : "toggle-off"
    case "checkbox":
      return on ? "check" : "uncheck"
    case "toggle":
      return on ? "latch" : "unlatch"
    case "disclosure":
      return on ? "expand" : "collapse"
  }
}

// Surfaces that open over the page, by kind.
const POPUP_SLOTS = [
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
const DIALOG_SLOTS = ["dialog-content", "search"]
const ALERT_SLOTS = ["alert-dialog-content"]
const PANEL_SLOTS = ["sheet-content", "drawer-content"]
const TOAST_SLOTS = ["toast"]

const SURFACE_SOUNDS: [string[], SoundName, SoundName][] = [
  [POPUP_SLOTS, "pop", "dismiss"],
  [DIALOG_SLOTS, "open", "close"],
  [ALERT_SLOTS, "alert", "close"],
  [PANEL_SLOTS, "slide-in", "slide-out"],
]

/** The sound for a toast of this type (Base UI and Sonner set data-type). */
export function resolveToastSound(
  type: string | null | undefined
): SoundName | null {
  switch (type) {
    case "success":
      return "success"
    case "error":
      return "error"
    case "warning":
      return "warning"
    // A loading toast plays when it settles into its final type.
    case "loading":
      return null
    default:
      return "notify"
  }
}

/** The sound for a surface with this data-slot appearing or going away. */
export function resolveSlotSound(
  slot: string | null | undefined,
  phase: "appear" | "disappear",
  type?: string | null
): SoundName | null {
  if (!slot) return null
  for (const [slots, appear, disappear] of SURFACE_SOUNDS) {
    if (slots.includes(slot)) return phase === "appear" ? appear : disappear
  }
  if (TOAST_SLOTS.includes(slot) && phase === "appear") {
    return resolveToastSound(type)
  }
  return null
}

const WATCHED = [
  ...[...SURFACE_SOUNDS.flatMap(([slots]) => slots), ...TOAST_SLOTS].map(
    (slot) => `[data-slot="${slot}"]`
  ),
  "[data-sonner-toast]",
].join(", ")

// Several surfaces can change in one batch; the most meaningful one plays.
const PRIORITY: SoundName[] = [
  "alert",
  "open",
  "slide-in",
  "pop",
  "error",
  "warning",
  "success",
  "notify",
  "close",
  "slide-out",
  "dismiss",
]
const CLOSING = new Set<SoundName>(["close", "slide-out", "dismiss"])
const TOASTS = new Set<SoundName>(["notify", "success", "warning", "error"])

// Surfaces only play when someone just pressed or typed, so a hover card or
// a navigation menu opening under the pointer stays quiet. Toasts arrive on
// their own and always play.
const GESTURE_WINDOW_MS = 1000
// A selection that closes its popup (an option, a menu item) plays itself,
// not the popup closing after it.
const COMMIT_WINDOW_MS = 250

function buttonVariant(element: Element) {
  const variant = element.getAttribute("data-variant")
  if (variant) return variant
  // Base UI's Button (and the parts built on it, like AlertDialogAction)
  // doesn't set data-variant; every style gives the primary variant
  // bg-primary and the destructive one a destructive colour.
  const classes = ` ${element.getAttribute("class") ?? ""} `
  if (classes.includes(" bg-primary ")) return "default"
  if (/\s(bg|text)-destructive[\s/]/.test(classes)) return "destructive"
  if (classes.includes(" underline-offset-4 ")) return "link"
  return null
}

function direction(element: Element): ClickTarget["direction"] {
  const slot = element.getAttribute("data-slot") ?? ""
  if (slot.endsWith("-previous")) return "previous"
  if (slot.endsWith("-next")) return "next"
  // Calendar month buttons (react-day-picker class names).
  if (element.classList.contains("rdp-button_previous")) return "previous"
  if (element.classList.contains("rdp-button_next")) return "next"
  if (element.closest('[data-slot="pagination"]')) {
    const label = element.getAttribute("aria-label") ?? ""
    if (/prev/i.test(label)) return "previous"
    if (/next/i.test(label)) return "next"
  }
  return null
}

function describe(element: Element): ClickTarget {
  const soundHost = element.closest("[data-sound]")
  const hasPopup = element.getAttribute("aria-haspopup")
  return {
    sound: soundHost?.getAttribute("data-sound"),
    role: element.getAttribute("role"),
    tag: element.tagName.toLowerCase(),
    type: element.getAttribute("type"),
    slot: element.getAttribute("data-slot"),
    disabled:
      element.getAttribute("aria-disabled") === "true" ||
      element.hasAttribute("data-disabled"),
    hasPopup: hasPopup !== null && hasPopup !== "false",
    pressed: element.hasAttribute("aria-pressed"),
    expandable: element.hasAttribute("aria-expanded"),
    variant: buttonVariant(element),
    size: element.getAttribute("data-size"),
    direction: direction(element),
    day: element.hasAttribute("data-day"),
    paging: element.closest('[data-slot="pagination"]') !== null,
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

function isPressed(element: Element) {
  return (
    element.getAttribute("aria-pressed") === "true" ||
    element.hasAttribute("data-pressed") ||
    element.getAttribute("data-state") === "on" ||
    element.hasAttribute("data-selected")
  )
}

function isExpanded(element: Element) {
  if (element.tagName === "SUMMARY") {
    return element.parentElement?.hasAttribute("open") ?? false
  }
  return element.getAttribute("aria-expanded") === "true"
}

/** The tab's position among the tabs of its list. */
function tabIndex(element: Element) {
  const list = element.closest('[role="tablist"]')
  if (!list) return 0
  return Array.from(list.querySelectorAll('[role="tab"]')).indexOf(element)
}

function slotOf(element: Element) {
  if (element.hasAttribute("data-sonner-toast")) return "toast"
  return element.getAttribute("data-slot")
}

function isOpen(element: Element) {
  // Search is open while it carries data-open (it never unmounts).
  if (element.getAttribute("data-slot") === "search") {
    return element.hasAttribute("data-open")
  }
  const state = element.getAttribute("data-state")
  return state !== "closed" && !element.hasAttribute("data-closed")
}

/** A slider's position from 0 to 1, for the notch's pitch. */
function sliderPosition(element: Element) {
  const input = element instanceof HTMLInputElement ? element : null
  const min = Number(input?.min || element.getAttribute("aria-valuemin") || 0)
  const max = Number(input?.max || element.getAttribute("aria-valuemax") || 100)
  const now = Number(input?.value ?? element.getAttribute("aria-valuenow"))
  if (!(max > min) || !Number.isFinite(now)) return 0.5
  return Math.min(1, Math.max(0, (now - min) / (max - min)))
}

function isSlider(element: Element) {
  return (
    element.getAttribute("role") === "slider" ||
    (element instanceof HTMLInputElement && element.type === "range")
  )
}

/**
 * The control a label stands for. Base UI gives the label's target id to a
 * hidden input beside its switch, checkbox or radio; the visible control is
 * the one with the role.
 */
function labelledControl(label: HTMLLabelElement | null) {
  const control = label?.control
  if (!control) return null
  const sibling = control.previousElementSibling
  return sibling?.matches("[role=switch], [role=checkbox], [role=radio]")
    ? sibling
    : control
}

// One set of listeners per document, however many <SoundEffects /> mount.
const installs = new WeakMap<Document, { count: number; remove: () => void }>()

/** Installs the document listeners; returns a cleanup function. */
export function installSoundEffects(root: Document = document) {
  const install = installs.get(root) ?? { count: 0, remove: listen(root) }
  install.count++
  installs.set(root, install)
  let installed = true
  return () => {
    if (!installed) return
    installed = false
    if (--install.count > 0) return
    install.remove()
    installs.delete(root)
  }
}

function listen(root: Document) {
  // A label click re-dispatches a click on its control; play once.
  let lastClickAt = -Infinity
  let lastGestureAt = -Infinity
  // The last click that committed a choice, so its popup closing stays quiet.
  let lastCommitAt = -Infinity
  // Surfaces announced so far, so exit animations and unmounts don't repeat.
  const announced = new WeakMap<Element, string>()
  let grabbing = false

  // Click sounds wait one frame. If the click also opened or closed a surface
  // (a Cancel button closing a dialog), the surface's sound plays instead:
  // React commits and the observer runs before that frame.
  let pendingClick: number | null = null
  let pendingSound: ClickSound["sound"] | null = null
  const cancelPendingClick = () => {
    if (pendingClick !== null) cancelAnimationFrame(pendingClick)
    pendingClick = null
    pendingSound = null
  }

  const onGesture = (event: Event) => {
    lastGestureAt = performance.now()
    if (
      event.type === "pointerdown" &&
      event.target instanceof Element &&
      !event.target.closest('[data-sound="none"]') &&
      event.target.closest('[data-slot="resizable-handle"]')
    ) {
      grabbing = true
      playSound("grab")
    }
  }

  const onPointerUp = () => {
    if (!grabbing) return
    grabbing = false
    playSound("drop")
  }

  const onClick = (event: MouseEvent) => {
    if (!getSoundsEnabled()) return
    const target = event.target
    if (!(target instanceof Element)) return
    // A label stands in for its control: React Aria renders switches and
    // checkboxes as a label around a hidden input and doesn't re-dispatch the
    // click to it.
    const control =
      target.closest(INTERACTIVE) ?? labelledControl(target.closest("label"))
    if (!control) return
    const now = performance.now()
    if (now - lastClickAt < 80) return
    const resolved = resolveClickSound(describe(control))
    if (!resolved) return
    lastClickAt = now
    if (resolved.sound !== "tap") lastCommitAt = now
    cancelPendingClick()
    pendingSound = resolved.sound
    pendingClick = requestAnimationFrame(() => {
      pendingClick = null
      pendingSound = null
      const { sound, pitch } = resolved
      if (sound === "tab") {
        playSound("note", { pitch: noteStep(tabIndex(control)) })
      } else if (sound === "switch" || sound === "checkbox") {
        playSound(resolveStateSound(sound, isChecked(control)))
      } else if (sound === "toggle") {
        playSound(resolveStateSound(sound, isPressed(control)))
      } else if (sound === "disclosure") {
        playSound(resolveStateSound(sound, isExpanded(control)))
      } else {
        playSound(sound, { pitch })
      }
    })
  }

  const notch = (element: Element) => {
    if (element.closest('[data-sound="none"]')) return
    playSound("notch", { pitch: 0.8 + sliderPosition(element) * 0.6 })
  }

  const onInput = (event: Event) => {
    if (event.target instanceof HTMLInputElement && isSlider(event.target)) {
      notch(event.target)
    }
  }

  const observer = new MutationObserver((records) => {
    if (!getSoundsEnabled()) return
    const now = performance.now()
    const gesture = now - lastGestureAt < GESTURE_WINDOW_MS
    const sounds = new Set<SoundName>()
    let slider: Element | null = null

    const consider = (element: Element, phase: "appear" | "disappear") => {
      const matches = element.matches(WATCHED)
        ? [element]
        : Array.from(element.querySelectorAll(WATCHED))
      for (const match of matches) {
        if (match.closest('[data-sound="none"]')) continue
        const open = phase === "appear" && isOpen(match)
        const type = match.getAttribute("data-type")
        // A toast is announced once per type, so a loading toast that settles
        // into success plays when it does.
        const next = open ? `open:${type ?? ""}` : "closed"
        const previous = announced.get(match)
        if (previous === next) continue
        announced.set(match, next)
        // Something that mounts closed (a collapsed Search, a kept-mounted
        // popup) has nothing to announce yet.
        if (previous === undefined && !open) continue
        const sound = resolveSlotSound(
          slotOf(match),
          open ? "appear" : "disappear",
          type
        )
        if (sound) sounds.add(sound)
      }
    }

    for (const record of records) {
      if (record.type === "attributes") {
        const element = record.target as Element
        if (record.attributeName === "aria-valuenow") {
          // Sliders only: progress bars also report aria-valuenow.
          if (isSlider(element)) slider = element
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

    const sound = PRIORITY.find(
      (name) => sounds.has(name) && (gesture || TOASTS.has(name))
    )
    if (sound) {
      if (CLOSING.has(sound)) {
        // A choice that closed its popup already played its own sound.
        if (now - lastCommitAt < COMMIT_WINDOW_MS) return
        if (pendingSound !== null && pendingSound !== "tap") return
      }
      cancelPendingClick()
      playSound(sound)
    } else if (slider) notch(slider)
  })

  root.addEventListener("pointerdown", onGesture, true)
  root.addEventListener("keydown", onGesture, true)
  root.addEventListener("pointerup", onPointerUp, true)
  root.addEventListener("pointercancel", onPointerUp, true)
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
      "data-type",
      "aria-valuenow",
    ],
  })

  return () => {
    cancelPendingClick()
    root.removeEventListener("pointerdown", onGesture, true)
    root.removeEventListener("keydown", onGesture, true)
    root.removeEventListener("pointerup", onPointerUp, true)
    root.removeEventListener("pointercancel", onPointerUp, true)
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
