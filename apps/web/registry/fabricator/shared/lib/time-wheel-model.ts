// Time Wheel: the drum a column's rows sit on. A column's position is a
// number of rows from its first: whole at rest, between rows while it turns.
// A looping column (hours, minutes, seconds) runs past either end into the
// next turn, so its position is unbounded and the row is the position modulo
// the count. Rows sit round a drum as tall as the wheel; under reduced motion
// they lie flat in a strip instead.

export type WheelGeometry = {
  rowHeight: number
  /** The drum's radius, half the wheel's height. */
  radius: number
  /** Degrees between neighbouring rows, so they touch on the drum. */
  rowAngle: number
  /**
   * Rows drawn either side of the band. Nearly edge-on, a row is a sliver,
   * so the drum stops short of a quarter turn.
   */
  reach: number
}

// A flick coasts this many seconds' worth of its release speed.
const COAST_SECONDS = 0.3
// How far past its ends a column that doesn't loop can be pulled, in rows.
const MAX_OVERSCROLL = 1
// The furthest a drawn row sits round the drum, in degrees.
const MAX_ROW_ANGLE = 75
// A coast counts as arrived within this many rows of its target.
const COAST_REST = 0.002

export function getWheelGeometry(
  height: number,
  rowHeight: number
): WheelGeometry {
  const radius = height / 2
  const rowAngle = (2 * Math.atan(rowHeight / 2 / radius) * 180) / Math.PI
  return {
    rowHeight,
    radius,
    rowAngle,
    reach: Math.max(1, Math.floor(MAX_ROW_ANGLE / rowAngle)),
  }
}

/** The row nearest a value: a time off the step lands on the closest. */
export function getWheelIndex(values: number[], value: number) {
  return values.reduce(
    (nearest, item, index) =>
      Math.abs(item - value) < Math.abs((values[nearest] ?? item) - value)
        ? index
        : nearest,
    0
  )
}

export function getLoopedIndex(position: number, count: number) {
  const index = Math.round(position) % count
  return index < 0 ? index + count : index + 0
}

/**
 * The position that shows `index`, nearest the current one: a looping
 * column takes the short way round.
 */
export function getNearestTurn(
  position: number,
  index: number,
  count: number,
  isLooping: boolean
) {
  if (!isLooping) return index
  const base = Math.round(position)
  let delta = index - getLoopedIndex(base, count)
  if (Math.abs(delta) > count / 2) delta -= Math.sign(delta) * count
  return base + delta
}

/** The positions to draw: the band's row and those within reach of it. */
export function getVisibleRows(
  center: number,
  reach: number,
  count: number,
  isLooping: boolean
) {
  const rows: number[] = []
  for (let row = center - reach; row <= center + reach; row++) {
    if (isLooping || (row >= 0 && row < count)) rows.push(row)
  }
  return rows
}

/**
 * A dragged position, eased past the ends of a column that doesn't loop: it
 * follows the pointer less and less, up to a row past the end.
 */
export function getWheelOverscroll(
  position: number,
  count: number,
  isLooping: boolean
) {
  if (isLooping) return position
  const damp = (distance: number) =>
    MAX_OVERSCROLL * (1 - Math.exp(-distance / MAX_OVERSCROLL))
  if (position < 0) return -damp(-position)
  if (position > count - 1) return count - 1 + damp(position - (count - 1))
  return position
}

export function clampWheelPosition(
  position: number,
  count: number,
  isLooping: boolean
) {
  return isLooping ? position : Math.min(Math.max(position, 0), count - 1)
}

/** Where a row sits on the drum. */
export function getRowTransform(
  row: number,
  { rowHeight, radius, rowAngle }: WheelGeometry,
  isFlat: boolean
) {
  return isFlat
    ? `translateY(${row * rowHeight}px)`
    : `rotateX(${-row * rowAngle}deg) translateZ(${radius}px)`
}

/** The drum turned so `position` faces the band. */
export function getDrumTransform(
  position: number,
  { rowHeight, radius, rowAngle }: WheelGeometry,
  isFlat: boolean
) {
  return isFlat
    ? `translateY(${-position * rowHeight}px)`
    : `translateZ(${-radius}px) rotateX(${position * rowAngle}deg)`
}

/**
 * How many rows from the band a press at `offsetY` (from the band's middle)
 * lands: on the drum, rows bunch up towards the edges.
 */
export function getTapRows(
  offsetY: number,
  { rowHeight, radius, rowAngle }: WheelGeometry,
  isFlat: boolean
) {
  if (isFlat) return Math.round(offsetY / rowHeight)
  const ratio = Math.max(-1, Math.min(1, offsetY / radius))
  return Math.round((Math.asin(ratio) * 180) / Math.PI / rowAngle)
}

/** The whole row a flick at `velocity` rows a second comes to rest on. */
export function getFlickTarget(
  position: number,
  velocity: number,
  count: number,
  isLooping: boolean
) {
  return clampWheelPosition(
    Math.round(position + velocity * COAST_SECONDS),
    count,
    isLooping
  )
}

/**
 * A flick slowing down: it leaves at its release speed and eases into the
 * target exponentially, like a scroll view's deceleration.
 */
export function getCoastPosition(
  from: number,
  target: number,
  velocity: number,
  elapsedSeconds: number
) {
  const distance = target - from
  // Heading the other way, or not moving: no coast, just the target.
  if (distance === 0 || distance * velocity <= 0) {
    return { position: target, isDone: true }
  }
  const timeConstant = distance / velocity
  const remaining = distance * Math.exp(-elapsedSeconds / timeConstant)
  if (Math.abs(remaining) < COAST_REST) {
    return { position: target, isDone: true }
  }
  return { position: target - remaining, isDone: false }
}

/**
 * The position a key moves a column to, as a spinbutton: up is the next
 * value. Home and End go to the first and last rows of the current turn.
 */
export function getKeyTarget(
  key: string,
  position: number,
  count: number,
  isLooping: boolean,
  pageSize: number
) {
  const index = Math.round(position)
  const turnStart = index - getLoopedIndex(index, count)
  const moves: Record<string, number> = {
    ArrowUp: 1,
    ArrowDown: -1,
    PageUp: pageSize,
    PageDown: -pageSize,
  }
  if (key === "Home") return turnStart
  if (key === "End") return turnStart + count - 1
  const move = moves[key]
  if (move === undefined) return null
  return clampWheelPosition(index + move, count, isLooping)
}

/**
 * A row laid out flat in a scroll view, moved onto the drum: `offsetRows`
 * from the band, it's pulled in towards the band, turned away and faded.
 * React Native draws its wheel this way, from the scroll position.
 */
export function getDrumRowLayout(
  offsetRows: number,
  { rowHeight, radius, rowAngle, reach }: WheelGeometry
) {
  "worklet"
  if (Math.abs(offsetRows) > reach + 0.5) {
    return { translateY: 0, rotateX: 0, opacity: 0 }
  }
  const angle = offsetRows * rowAngle
  const radians = (angle * Math.PI) / 180
  const facing = Math.cos(radians)
  return {
    translateY: radius * Math.sin(radians) - offsetRows * rowHeight + 0,
    rotateX: -angle + 0,
    opacity: facing * facing,
  }
}

// A native looping column repeats its rows to at least this many.
const MIN_LOOP_ROWS = 30

/**
 * How many times a native looping column repeats its rows: odd, so the
 * value sits in the middle turn with a turn's worth either side to flick
 * through, and enough that a short loop fills the drum.
 */
export function getLoopCycles(count: number) {
  const cycles = Math.max(3, Math.ceil(MIN_LOOP_ROWS / count))
  return cycles % 2 === 0 ? cycles + 1 : cycles
}

/** The row in the middle turn that shows the same value as `row`. */
export function getRecenteredRow(row: number, count: number, cycles: number) {
  return Math.floor(cycles / 2) * count + getLoopedIndex(row, count)
}
