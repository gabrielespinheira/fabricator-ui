// The Model Picker's effort slider rules: which level shows, where it sits on
// the track, the level a key or a touch moves it to and the hue it warms to.
// Plain data, shared by the website's component and React Native's.

/** Where the effort ramp starts and ends, in degrees from the info hue. */
const EFFORT_HUE_FROM = -30
const EFFORT_HUE_TO = 40

/**
 * The effort fill's OKLCH lightness, in both modes: lighter than the info fill,
 * so the ramp reads fresh from sky blue to violet. The website's style map
 * writes the same number.
 */
export const EFFORT_FILL_LIGHTNESS = 0.68

/** Each effort level turns from sky blue, below the info hue, toward violet. */
export function getEffortHueShift(index: number, count: number) {
  if (count <= 1) return EFFORT_HUE_FROM
  const progress = index / (count - 1)
  return Math.round(
    EFFORT_HUE_FROM + progress * (EFFORT_HUE_TO - EFFORT_HUE_FROM)
  )
}

/** The level a key moves the effort slider to, or null for any other key. */
export function getEffortKeyIndex(key: string, index: number, count: number) {
  const last = count - 1
  if (key === "ArrowRight" || key === "ArrowUp")
    return Math.min(last, index + 1)
  if (key === "ArrowLeft" || key === "ArrowDown") return Math.max(0, index - 1)
  if (key === "Home") return 0
  if (key === "End") return last
  return null
}

/**
 * The level nearest a pointer on the track. The thumb sits inside the track's
 * ends, so the first and last level centres are half a thumb in.
 */
export function getEffortIndexAtPoint({
  x,
  left,
  width,
  thumb,
  count,
}: {
  x: number
  left: number
  width: number
  thumb: number
  count: number
}) {
  if (count <= 1) return 0
  const room = Math.max(1, width - thumb)
  const position = (x - left - thumb / 2) / room
  return Math.min(count - 1, Math.max(0, Math.round(position * (count - 1))))
}

/**
 * The level the slider shows: a drag's preview, else the chosen one, else the
 * middle, unchosen ("Default"). The top level of several peaks.
 */
export function getEffortState({
  count,
  chosenIndex,
  preview,
}: {
  count: number
  /** The value's level, or -1 without one. */
  chosenIndex: number
  preview: number | null
}) {
  const isChosen = chosenIndex >= 0 || preview !== null
  const index =
    preview ?? (chosenIndex >= 0 ? chosenIndex : Math.floor((count - 1) / 2))
  return {
    index,
    isChosen,
    isPeak: isChosen && count > 1 && index === count - 1,
  }
}

/**
 * From the track's start to the thumb's near edge at a level, which may be
 * fractional: the thumb stays inside the track's ends. The fill reaches a
 * thumb past it, and a level's step mark sits half a thumb past it.
 */
export function getEffortOffset({
  index,
  count,
  width,
  thumb,
}: {
  index: number
  count: number
  width: number
  thumb: number
}) {
  const steps = Math.max(1, count - 1)
  return Math.max(0, width - thumb) * (index / steps)
}
