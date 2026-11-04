// The size rules react-resizable-panels has on the website. A layout is each
// panel's share of the group, in percent, and always adds up to 100.

export type PanelConstraints = {
  defaultSize?: number | string
  minSize?: number | string
  maxSize?: number | string
  disabled?: boolean
}

/**
 * A panel size as a percentage: numbers are pixels, a string without a unit is
 * a percentage. Pixels have no answer until the group is measured.
 */
export function parseSize(
  value: number | string | undefined,
  groupSize: number
) {
  if (value === undefined) return undefined
  const isPixels = typeof value === "number" || value.trim().endsWith("px")
  const amount = typeof value === "number" ? value : Number.parseFloat(value)
  if (Number.isNaN(amount)) return undefined
  if (!isPixels) return amount
  return groupSize > 0 ? (amount / groupSize) * 100 : undefined
}

function getBounds(panel: PanelConstraints, groupSize: number) {
  return {
    min: parseSize(panel.minSize, groupSize) ?? 0,
    max: parseSize(panel.maxSize, groupSize) ?? 100,
  }
}

const sum = (sizes: readonly number[]) =>
  sizes.reduce((total, size) => total + size, 0)

/** What each panel can still give (`min`) or take (`max`), in percent. */
function getRoom(
  layout: readonly number[],
  panels: readonly PanelConstraints[],
  index: number,
  groupSize: number,
  direction: "grow" | "shrink"
) {
  const size = layout[index] ?? 0
  const panel = panels[index] ?? {}
  if (panel.disabled) return 0
  const { min, max } = getBounds(panel, groupSize)
  return Math.max(0, direction === "grow" ? max - size : size - min)
}

function getTotalRoom(
  layout: readonly number[],
  panels: readonly PanelConstraints[],
  indexes: readonly number[],
  groupSize: number,
  direction: "grow" | "shrink"
) {
  return sum(
    indexes.map((index) => getRoom(layout, panels, index, groupSize, direction))
  )
}

/** Moves `amount` through `indexes`, nearest first, as far as each allows. */
function spread(
  layout: number[],
  panels: readonly PanelConstraints[],
  indexes: readonly number[],
  groupSize: number,
  amount: number,
  direction: "grow" | "shrink"
) {
  let left = amount
  for (const index of indexes) {
    if (left <= 0) break
    const moved = Math.min(
      left,
      getRoom(layout, panels, index, groupSize, direction)
    )
    layout[index] =
      (layout[index] ?? 0) + (direction === "grow" ? moved : -moved)
    left -= moved
  }
}

function getSides(count: number, handleIndex: number) {
  const before: number[] = []
  const after: number[] = []
  for (let index = handleIndex; index >= 0; index -= 1) before.push(index)
  for (let index = handleIndex + 1; index < count; index += 1) after.push(index)
  return { before, after }
}

export function getInitialLayout(
  panels: readonly PanelConstraints[],
  groupSize: number
) {
  if (panels.length === 0) return []
  const given = panels.map((panel) => parseSize(panel.defaultSize, groupSize))
  const unsized = given.filter((size) => size === undefined).length
  const taken = sum(given.map((size) => size ?? 0))
  const share = unsized > 0 ? Math.max(0, 100 - taken) / unsized : 0
  const sizes = given.map((size) => size ?? share)
  const total = sum(sizes)
  const scaled = total > 0 ? sizes.map((size) => (size / total) * 100) : sizes

  // Clamp, then let the panels with room absorb the difference.
  const layout = scaled.map((size, index) => {
    const { min, max } = getBounds(panels[index] ?? {}, groupSize)
    return Math.min(max, Math.max(min, size))
  })
  const indexes = panels.map((_, index) => index)
  const difference = 100 - sum(layout)
  if (difference !== 0) {
    spread(
      layout,
      panels,
      indexes,
      groupSize,
      Math.abs(difference),
      difference > 0 ? "grow" : "shrink"
    )
  }
  return layout
}

/**
 * The layout after moving the handle after `handleIndex` by `delta` percent.
 * The side it moves into shrinks, nearest panel first, and the other grows.
 */
export function resizeLayout(
  layout: readonly number[],
  panels: readonly PanelConstraints[],
  handleIndex: number,
  delta: number,
  groupSize: number
) {
  const { before, after } = getSides(layout.length, handleIndex)
  const growing = delta > 0 ? before : after
  const shrinking = delta > 0 ? after : before
  const amount = Math.min(
    Math.abs(delta),
    getTotalRoom(layout, panels, growing, groupSize, "grow"),
    getTotalRoom(layout, panels, shrinking, groupSize, "shrink")
  )
  const next = [...layout]
  spread(next, panels, growing, groupSize, amount, "grow")
  spread(next, panels, shrinking, groupSize, amount, "shrink")
  return next
}

/** Where the handle is and how far it can go, for the adjustable role. */
export function getHandleValue(
  layout: readonly number[],
  panels: readonly PanelConstraints[],
  handleIndex: number,
  groupSize: number
) {
  const { before, after } = getSides(layout.length, handleIndex)
  const now = sum(before.map((index) => layout[index] ?? 0))
  const down = Math.min(
    getTotalRoom(layout, panels, before, groupSize, "shrink"),
    getTotalRoom(layout, panels, after, groupSize, "grow")
  )
  const up = Math.min(
    getTotalRoom(layout, panels, before, groupSize, "grow"),
    getTotalRoom(layout, panels, after, groupSize, "shrink")
  )
  return { now, min: now - down, max: now + up }
}

export type Layout = { [id: string]: number }

export function layoutToMap(
  layout: readonly number[],
  ids: readonly string[]
): Layout {
  return Object.fromEntries(ids.map((id, index) => [id, layout[index] ?? 0]))
}

/** Undefined when the map doesn't name every panel. */
export function layoutFromMap(layout: Layout, ids: readonly string[]) {
  if (ids.some((id) => layout[id] === undefined)) return undefined
  return ids.map((id) => layout[id] ?? 0)
}
