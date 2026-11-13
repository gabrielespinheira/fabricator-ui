// Multi Select: the chips' presence and layout, as pure functions.
//
// A removed chip stays where it was while it leaves, so the field never jumps
// under the pointer; the chips after it glide over once it is gone.

export type ChipPresence<TItem> = {
  key: string
  item: TItem
  isExiting: boolean
}

export type ChipPoint = { x: number; y: number }

// A chip that moved less than this since the last layout stays put.
const SHIFT_THRESHOLD = 0.5

/**
 * The chips to draw for `items`: every selected item in selection order, with
 * the ones that left kept in their last place and marked as exiting. Returns
 * `previous` itself when nothing changed.
 */
export function reconcileChips<TItem>(
  previous: readonly ChipPresence<TItem>[],
  items: readonly TItem[],
  getKey: (item: TItem) => string
): readonly ChipPresence<TItem>[] {
  const current = items.map((item) => ({ key: getKey(item), item }))
  const currentKeys = new Set(current.map((entry) => entry.key))
  const emitted = new Set<string>()
  const next: ChipPresence<TItem>[] = []
  let cursor = 0

  const emitUntil = (key?: string) => {
    while (cursor < current.length) {
      const entry = current[cursor]
      cursor += 1
      if (!entry || emitted.has(entry.key)) continue
      emitted.add(entry.key)
      next.push({ key: entry.key, item: entry.item, isExiting: false })
      if (entry.key === key) return
    }
  }

  for (const chip of previous) {
    if (currentKeys.has(chip.key)) {
      if (!emitted.has(chip.key)) emitUntil(chip.key)
      continue
    }
    next.push(chip.isExiting ? chip : { ...chip, isExiting: true })
  }
  emitUntil()

  const isUnchanged =
    next.length === previous.length &&
    next.every((chip, index) => {
      const before = previous[index]
      return (
        before?.key === chip.key &&
        before.isExiting === chip.isExiting &&
        before.item === chip.item
      )
    })
  return isUnchanged ? previous : next
}

/** Drops the chip `key` once it has finished leaving. */
export function removeExitedChip<TItem>(
  chips: readonly ChipPresence<TItem>[],
  key: string
): readonly ChipPresence<TItem>[] {
  const isLeaving = chips.some((chip) => chip.key === key && chip.isExiting)
  if (!isLeaving) return chips
  return chips.filter((chip) => !(chip.key === key && chip.isExiting))
}

function isRecord(item: unknown): item is Record<string, unknown> {
  return typeof item === "object" && item !== null
}

/** What a chip says: the item's `label`, its `value`, or the item itself. */
export function getMultiSelectItemLabel(item: unknown): string {
  if (isRecord(item)) {
    if (item.label != null) return String(item.label)
    if (item.value != null) return String(item.value)
    return JSON.stringify(item)
  }
  return String(item)
}

/** A stable key for an item: its `value`, or its text. */
export function getMultiSelectItemKey(item: unknown): string {
  if (isRecord(item)) {
    if (item.value != null) return String(item.value)
    return JSON.stringify(item)
  }
  return String(item)
}

function parseTimes(list: string): number[] {
  return list
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) =>
      part.endsWith("ms")
        ? Number.parseFloat(part)
        : Number.parseFloat(part) * 1000
    )
    .map((time) => (Number.isFinite(time) ? time : 0))
}

/**
 * How long a transition runs, in milliseconds, from computed
 * `transition-property`, `transition-duration` and `transition-delay`. The
 * shorter list repeats, as in CSS; `none` (`transition-none`) is no time
 * whatever its duration.
 */
export function getTransitionTime(
  properties: string,
  durations: string,
  delays: string
): number {
  if (properties.trim() === "none") return 0
  const durationTimes = parseTimes(durations)
  const delayTimes = parseTimes(delays)
  if (durationTimes.length === 0) return 0
  const count = Math.max(durationTimes.length, delayTimes.length)
  let longest = 0
  for (let index = 0; index < count; index += 1) {
    const duration = durationTimes[index % durationTimes.length] ?? 0
    const delay = delayTimes.length
      ? (delayTimes[index % delayTimes.length] ?? 0)
      : 0
    if (duration > 0) longest = Math.max(longest, duration + delay)
  }
  return longest
}

/** How far a chip has to be pulled back to where it was, or null. */
export function getChipShift(
  before: ChipPoint | undefined,
  after: ChipPoint
): ChipPoint | null {
  if (!before) return null
  const x = before.x - after.x
  const y = before.y - after.y
  if (Math.abs(x) < SHIFT_THRESHOLD && Math.abs(y) < SHIFT_THRESHOLD) {
    return null
  }
  return { x, y }
}

/** A computed `translate` (`"12px -4px"`, `"8px"` or `"none"`) as a point. */
export function parseTranslate(value: string): ChipPoint {
  const [x = 0, y = 0] = value
    .split(" ")
    .map((part) => Number.parseFloat(part))
    .map((part) => (Number.isFinite(part) ? part : 0))
  return { x, y }
}
