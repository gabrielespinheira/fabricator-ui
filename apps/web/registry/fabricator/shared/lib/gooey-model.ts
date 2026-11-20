export const GOOEY_EFFECTS = ["move", "morph", "bend", "melt"] as const
export const GOOEY_MODES = ["off", "subtle", "expressive"] as const

export type GooeyEffect = (typeof GOOEY_EFFECTS)[number]
export type GooeyMode = (typeof GOOEY_MODES)[number]
export type GooeyDirection = "right" | "left" | "down" | "up"
export type GooeySettings = { mode: GooeyMode; waviness?: number }
export type GooeyOptions = {
  effect?: GooeyEffect
  intensity?: number
  waviness?: number
}
export type GooeyPreference = boolean | GooeyEffect | GooeyOptions

// Start point followed by eight cubic curves. The resting body fills 100 × 40.
// Every recipe has the same topology so it can settle into the same shape.
export const GOOEY_GEOMETRY = {
  resting: [
    20, 0, 30, 0, 40, 0, 50, 0, 60, 0, 70, 0, 80, 0, 91, 0, 100, 9, 100, 20,
    100, 31, 91, 40, 80, 40, 70, 40, 60, 40, 50, 40, 40, 40, 30, 40, 20, 40, 9,
    40, 0, 31, 0, 20, 0, 9, 9, 0, 20, 0,
  ],
  move: [
    17, 3, 32, -2, 42, -2, 50, -2, 61, -2, 73, -3, 83, -3, 96, -3, 105, 8, 105,
    20, 105, 32, 96, 43, 83, 43, 73, 43, 61, 42, 50, 42, 42, 42, 32, 42, 17, 37,
    5, 33, -25, 40, -25, 20, -25, 0, 5, 7, 17, 3,
  ],
  morph: [
    15, -5, 32, -5, 37, 13, 50, 13, 63, 13, 68, -7, 85, -7, 101, -7, 111, 5,
    111, 20, 111, 35, 101, 47, 85, 47, 68, 47, 63, 27, 50, 27, 37, 27, 32, 45,
    15, 45, 1, 45, -10, 35, -10, 20, -10, 5, 1, -5, 15, -5,
  ],
  bend: [
    18, -6, 29, -6, 38, 9, 50, 9, 62, 9, 74, -3, 89, -3, 103, -3, 112, 6, 112,
    16, 112, 28, 102, 37, 89, 37, 75, 37, 64, 49, 50, 49, 37, 49, 25, 34, 14,
    34, 1, 34, -12, 27, -12, 15, -12, 2, 3, -6, 18, -6,
  ],
  melt: [
    17, -2, 34, -4, 43, 8, 54, 5, 64, 2, 69, -6, 83, -6, 99, -6, 111, 2, 111,
    17, 111, 34, 92, 45, 77, 44, 62, 43, 64, 31, 51, 35, 41, 38, 30, 47, 15, 45,
    0, 43, -11, 37, -11, 23, -11, 7, 2, 0, 17, -2,
  ],
}

export const GOOEY_DEFAULTS = { subtle: 0.65, expressive: 1, waviness: 0.25 }
export const GOOEY_VIEW_BOX = "-30 -16 160 72"

function clampUnit(value: number) {
  "worklet"
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0
}

export function resolveGooeyOptions(
  settings: GooeySettings | undefined,
  preference: GooeyPreference | undefined,
  isStandalone: boolean,
  defaultEffect: GooeyEffect = "move"
): Required<GooeyOptions> | null {
  if (settings?.mode === "off" || preference === false) return null
  if (!settings && preference === undefined && !isStandalone) return null

  const options =
    typeof preference === "string"
      ? { effect: preference }
      : typeof preference === "object"
        ? preference
        : undefined
  return {
    effect: options?.effect ?? defaultEffect,
    intensity: clampUnit(
      options?.intensity ?? GOOEY_DEFAULTS[settings?.mode ?? "subtle"]
    ),
    waviness: clampUnit(
      options?.waviness ?? settings?.waviness ?? GOOEY_DEFAULTS.waviness
    ),
  }
}

export function getGooeyFrame(
  effect: GooeyEffect,
  progress: number,
  intensity: number,
  waviness: number,
  direction: GooeyDirection = "right"
) {
  "worklet"
  const strength = clampUnit(progress) * clampUnit(intensity)
  const ripple = 4 * strength * clampUnit(waviness)
  const { resting } = GOOEY_GEOMETRY
  const target = GOOEY_GEOMETRY[effect]
  const frame: number[] = []
  for (let index = 0; index < resting.length; index += 2) {
    const x = resting[index] + (target[index] - resting[index]) * strength
    const y =
      resting[index + 1] +
      (target[index + 1] - resting[index + 1]) * strength +
      Math.sin(resting[index] * 0.13 + resting[index + 1] * 0.18) * ripple
    if (direction === "down") frame.push(100 - y * 2.5, x * 0.4)
    else if (direction === "up") frame.push(y * 2.5, 40 - x * 0.4)
    else frame.push(direction === "left" ? 100 - x : x, y)
  }
  return frame
}

export function getGooeyPath(
  effect: GooeyEffect,
  progress: number,
  intensity: number,
  waviness: number,
  direction: GooeyDirection = "right"
) {
  "worklet"
  const [x, y, ...curves] = getGooeyFrame(
    effect,
    progress,
    intensity,
    waviness,
    direction
  )
  let path = `M${x.toFixed(2)} ${y.toFixed(2)}`
  for (let index = 0; index < curves.length; index += 6) {
    path += `C${curves
      .slice(index, index + 6)
      .map((coordinate) => coordinate.toFixed(2))
      .join(" ")}`
  }
  return `${path}Z`
}
