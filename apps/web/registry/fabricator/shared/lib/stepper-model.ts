// Stepper: where each step stands against the current one.

export type StepState = "complete" | "current" | "upcoming"

/** Steps count from 1; `current` past the last step completes them all. */
export function getStepState(step: number, current: number): StepState {
  if (step < current) return "complete"
  if (step === current) return "current"
  return "upcoming"
}
