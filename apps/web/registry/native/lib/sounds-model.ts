// Native feedback is haptic: interface sounds are unusual in a phone app and the
// website's are synthesized with Web Audio, which React Native doesn't have.
// Each sound name keeps its meaning as a haptic.
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
  expand: null,
  collapse: null,
  alert: { kind: "notification", type: "warning" },
  notify: { kind: "impact", weight: "light" },
  success: { kind: "notification", type: "success" },
  warning: { kind: "notification", type: "warning" },
  error: { kind: "notification", type: "error" },
  notch: { kind: "selection" },
  grab: { kind: "impact", weight: "medium" },
  drop: { kind: "impact", weight: "light" },
  deny: { kind: "notification", type: "error" },
}

export function getHaptic(name: FeedbackName): Haptic {
  return HAPTICS[name]
}
