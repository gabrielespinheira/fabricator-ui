// The Preview Rail's logic, shared by the website and React Native: how far
// each tick swells, which item is lit, and where a finger lands on the rail.

type PreviewRailEntry = {
  value: string
  label: string
  disabled?: boolean
}

/** Who is pointing at an item: a finger scrubbing, the pointer, or focus. */
type PreviewRailPointing = {
  pressed: string | null
  hovered: string | null
  focused: string | null
}

/** A tick's length, as a share of the longest, by its distance from the lit one. */
const PREVIEW_RAIL_SWELL = [1, 0.75, 0.6] as const
const PREVIEW_RAIL_REST_SCALE = 0.45

function getPreviewRailTickScale(index: number, litIndex: number) {
  if (litIndex < 0) return PREVIEW_RAIL_REST_SCALE
  return (
    PREVIEW_RAIL_SWELL[Math.abs(index - litIndex)] ?? PREVIEW_RAIL_REST_SCALE
  )
}

function isPreviewRailEnabled(item: PreviewRailEntry | undefined) {
  return item !== undefined && !item.disabled
}

/** The current item: the value given, or the first enabled item. */
function getPreviewRailValue(
  items: readonly PreviewRailEntry[],
  value: string | undefined
) {
  const named = items.find((item) => item.value === value)
  if (isPreviewRailEnabled(named)) return value
  return items.find((item) => !item.disabled)?.value
}

/**
 * The lit tick and the card to show. A finger beats the pointer, which beats
 * focus; with none of them on an enabled item, the swell rests on the current
 * item and no card shows.
 */
function getPreviewRailLit(
  items: readonly PreviewRailEntry[],
  { pressed, hovered, focused }: PreviewRailPointing,
  value: string | undefined
) {
  const preview = [pressed, hovered, focused].find((candidate) =>
    isPreviewRailEnabled(items.find((item) => item.value === candidate))
  )
  const litValue = preview ?? getPreviewRailValue(items, value)
  return {
    litIndex: items.findIndex((item) => item.value === litValue),
    preview: preview ?? null,
  }
}

/**
 * The enabled tick nearest a point along the rail, `offset` from its start,
 * with every tick `step` long. -1 when no tick can be lit.
 */
function getPreviewRailIndexAtPoint(
  items: readonly PreviewRailEntry[],
  offset: number,
  step: number
) {
  let nearest = -1
  let nearestDistance = Number.POSITIVE_INFINITY
  items.forEach((item, index) => {
    if (item.disabled) return
    const distance = Math.abs(offset - (index + 0.5) * step)
    if (distance < nearestDistance) {
      nearest = index
      nearestDistance = distance
    }
  })
  return nearest
}

/**
 * Whether a point along the rail lies on a disabled tick's own step. A finger
 * lifted there chooses nothing, though the light snapped to a neighbour.
 */
function isPreviewRailDisabledAt(
  items: readonly PreviewRailEntry[],
  offset: number,
  step: number
) {
  return Boolean(items[Math.floor(offset / step)]?.disabled)
}

/** Whether a finger lifted on the rail, or close enough to count as on it. */
function isPreviewRailReleaseInside(
  point: { x: number; y: number },
  rail: { width: number; height: number },
  slack: number
) {
  return (
    point.x >= -slack &&
    point.x <= rail.width + slack &&
    point.y >= -slack &&
    point.y <= rail.height + slack
  )
}

/**
 * Where the card starts along the rail: centred on its tick, but never past
 * the rail's ends. A card longer than the rail overhangs both ends instead,
 * as little as its tick allows.
 */
function getPreviewRailCardOffset({
  index,
  step,
  count,
  cardLength,
}: {
  index: number
  step: number
  count: number
  cardLength: number
}) {
  const slack = count * step - cardLength
  const centred = (index + 0.5) * step - cardLength / 2
  return Math.min(Math.max(centred, Math.min(0, slack)), Math.max(0, slack))
}

/** Whether an href is a URL an app can open, rather than a place on a page. */
function isPreviewRailExternalHref(href: string) {
  return /^[a-z][a-z\d+.-]*:/i.test(href)
}

export {
  getPreviewRailCardOffset,
  getPreviewRailIndexAtPoint,
  getPreviewRailLit,
  getPreviewRailTickScale,
  getPreviewRailValue,
  isPreviewRailDisabledAt,
  isPreviewRailExternalHref,
  isPreviewRailReleaseInside,
  PREVIEW_RAIL_REST_SCALE,
  type PreviewRailEntry,
  type PreviewRailPointing,
}
