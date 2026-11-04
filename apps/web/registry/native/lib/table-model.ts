// What table layout does for free on the website: columns as wide as their
// widest cell, spare room shared between them, and cells that span columns.

// Layout widths are fractions of a pixel: a stretched cell can report a hair
// over what it was given.
const LAYOUT_EPSILON = 0.5

/**
 * Natural widths after a cell reports its own. A cell in a stretched column
 * reports the stretched width, which says nothing about its content, so only a
 * cell wider than its column counts.
 */
export function reportColumnWidth(
  natural: readonly number[],
  resolved: readonly number[],
  column: number,
  width: number
) {
  const current = natural[column] ?? 0
  const limit = Math.max(current, resolved[column] ?? 0)
  if (width <= limit + LAYOUT_EPSILON) return natural
  const length = Math.max(natural.length, column + 1)
  return Array.from({ length }, (_, index) =>
    index === column ? width : (natural[index] ?? 0)
  )
}

/** Fills the container by width, as `w-full` does; never squeezes a column. */
export function resolveColumnWidths(
  natural: readonly number[],
  available: number
) {
  const total = natural.reduce((sum, width) => sum + width, 0)
  if (available <= 0 || total === 0 || total >= available) return natural
  return natural.map((width) => (width * available) / total)
}

/** The first column each cell of a row sits in. */
export function getCellColumns(spans: readonly number[]) {
  let column = 0
  return spans.map((span) => {
    const start = column
    column += span
    return start
  })
}

/** The width of `span` columns from `start`; undefined until all are known. */
export function getSpanWidth(
  widths: readonly number[],
  start: number,
  span: number
) {
  let total = 0
  for (let column = start; column < start + span; column += 1) {
    const width = widths[column]
    if (width === undefined) return undefined
    total += width
  }
  return total
}

const TEXT_CLASS =
  /^(?:!?[\w-]+(?:\[[^\]]*\])?:)*!?(?:text-|font-|leading-|tracking-|uppercase$|lowercase$|capitalize$|normal-case$|italic$|not-italic$|underline$|line-through$|no-underline$|tabular-nums$)/

/**
 * The text classes in a cell's `className`. A `View` ignores them, and a width
 * on the `Text` would add to the cell's, so a cell passes down only these.
 */
export function pickTextClasses(className: string | undefined) {
  const picked = className
    ?.split(/\s+/)
    .filter((name) => TEXT_CLASS.test(name))
    .join(" ")
  return picked || undefined
}
