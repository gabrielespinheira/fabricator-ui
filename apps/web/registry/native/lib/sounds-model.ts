// Native feedback is two layers under one name: the website's sound, rendered to
// a file, and a haptic that keeps the sound's meaning. Devices without a motor
// ignore the haptic.
import type { FeedbackName } from "@/registry/native/lib/feedback"

export type Haptic =
  | { kind: "selection" }
  | { kind: "impact"; weight: "light" | "medium" | "heavy" }
  | { kind: "notification"; type: "success" | "warning" | "error" }
  | null

const HAPTICS: Record<FeedbackName, Haptic> = {
  tap: { kind: "impact", weight: "light" },
  press: { kind: "impact", weight: "medium" },
  thud: { kind: "impact", weight: "heavy" },
  tick: { kind: "selection" },
  copy: { kind: "impact", weight: "light" },
  check: { kind: "selection" },
  uncheck: { kind: "selection" },
  pick: { kind: "selection" },
  "toggle-on": { kind: "impact", weight: "light" },
  "toggle-off": { kind: "impact", weight: "light" },
  latch: { kind: "selection" },
  unlatch: { kind: "selection" },
  note: { kind: "selection" },
  page: { kind: "selection" },
  // Surfaces moving have their own visual weight: no buzz for each one.
  whisk: null,
  pop: null,
  dismiss: null,
  open: null,
  close: null,
  "slide-in": null,
  "slide-out": null,
  // A row opening: the only feedback when the ring switch silences the sound.
  expand: { kind: "selection" },
  collapse: { kind: "selection" },
  alert: { kind: "notification", type: "warning" },
  notify: { kind: "impact", weight: "light" },
  success: { kind: "notification", type: "success" },
  warning: { kind: "notification", type: "warning" },
  error: { kind: "notification", type: "error" },
  notch: { kind: "selection" },
  grab: { kind: "impact", weight: "medium" },
  drop: { kind: "impact", weight: "light" },
  // A disabled control saying no: light, not the weight of a real error.
  deny: { kind: "impact", weight: "light" },
}

export function getHaptic(name: FeedbackName): Haptic {
  return HAPTICS[name]
}

// The same sound can't retrigger faster than this, as on the website.
const RETRIGGER_MS = 35
// A selection that closes its popup plays itself, not the popup closing after it.
const COMMIT_WINDOW_MS = 250
const CLOSING = new Set<FeedbackName>(["close", "slide-out", "dismiss"])
// Sounds that aren't a committed choice: a plain button, and surfaces themselves.
const NOT_A_COMMIT = new Set<FeedbackName>([
  "tap",
  "pop",
  "open",
  "alert",
  "slide-in",
  "close",
  "slide-out",
  "dismiss",
  "notify",
  "success",
  "warning",
  "error",
])

/** Decides whether a sound plays now, given what played just before it. */
export function createSoundGate() {
  const lastPlayed = new Map<FeedbackName, number>()
  let lastCommitAt = -Infinity
  return (name: FeedbackName, now: number) => {
    if (now - (lastPlayed.get(name) ?? -Infinity) < RETRIGGER_MS) return false
    if (CLOSING.has(name) && now - lastCommitAt < COMMIT_WINDOW_MS) return false
    lastPlayed.set(name, now)
    if (!NOT_A_COMMIT.has(name)) lastCommitAt = now
    return true
  }
}

const PITCH_STEP = 0.05

/** A continuous pitch as a step, so a drag shares a handful of rendered files. */
export function quantizePitch(pitch: number) {
  return Math.round(pitch / PITCH_STEP) * PITCH_STEP
}
