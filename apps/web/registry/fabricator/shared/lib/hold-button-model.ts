// Hold to confirm: a press has to last the whole duration before it counts.
// Keyboard holds use the same keys a button presses with.

export const DEFAULT_HOLD_DURATION = 1200

export type HoldOutcome = "complete" | "released"

/** Space and Enter hold the button, as they press one. */
export function isHoldKey(key: string) {
  return key === " " || key === "Enter"
}

/** Whether a press held this long confirms. */
export function getHoldOutcome(
  heldMs: number,
  durationMs: number
): HoldOutcome {
  return heldMs >= durationMs ? "complete" : "released"
}
