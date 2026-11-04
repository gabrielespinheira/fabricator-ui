// The positions Embla works out on the website. A position is how far the
// content has moved along its axis, so 0 is the start and it grows forwards.

export type CarouselLayout = {
  offsets: readonly number[]
  sizes: readonly number[]
  viewport: number
}

export type CarouselSnapOptions = {
  align?: "start" | "center" | "end"
  containScroll?: "trimSnaps" | "keepSnaps" | false
  slidesToScroll?: number | "auto"
}

export function getMaxScroll({ offsets, sizes, viewport }: CarouselLayout) {
  const last = offsets.length - 1
  if (last < 0) return 0
  return Math.max(0, (offsets[last] ?? 0) + (sizes[last] ?? 0) - viewport)
}

export function getScrollSnaps(
  layout: CarouselLayout,
  {
    align = "center",
    containScroll = "trimSnaps",
    slidesToScroll = 1,
  }: CarouselSnapOptions = {}
) {
  const { offsets, sizes, viewport } = layout
  const step = typeof slidesToScroll === "number" ? slidesToScroll : 1
  const aligned = offsets
    .map((offset, index) => {
      const size = sizes[index] ?? 0
      if (align === "start") return offset
      if (align === "end") return offset + size - viewport
      return offset + size / 2 - viewport / 2
    })
    .filter((_, index) => index % step === 0)
  if (containScroll === false) return aligned

  const max = getMaxScroll(layout)
  const clamped = aligned.map((snap) => Math.min(max, Math.max(0, snap)))
  if (containScroll === "keepSnaps") return clamped
  return clamped.filter((snap, index) => snap !== clamped[index - 1])
}

export function getNearestSnap(snaps: readonly number[], position: number) {
  let nearest = 0
  snaps.forEach((snap, index) => {
    const distance = Math.abs(snap - position)
    if (distance < Math.abs((snaps[nearest] ?? 0) - position)) nearest = index
  })
  return nearest
}

export function canGoNext(index: number, count: number, loop = false) {
  return count > 1 && (loop || index < count - 1)
}

export function canGoPrevious(index: number, count: number, loop = false) {
  return count > 1 && (loop || index > 0)
}

export function getNextIndex(index: number, count: number, loop = false) {
  if (index < count - 1) return index + 1
  return loop ? 0 : index
}

export function getPreviousIndex(index: number, count: number, loop = false) {
  if (index > 0) return index - 1
  return loop ? count - 1 : index
}

const FLICK_VELOCITY = 300

/**
 * Where a drag lands: the next snap on a flick or past halfway, otherwise back
 * where it started. `skipSnaps` lets a throw land on any of them.
 */
export function getReleaseIndex({
  snaps,
  index,
  position,
  velocity,
  loop = false,
  skipSnaps = false,
}: {
  snaps: readonly number[]
  index: number
  position: number
  /** In position units per second: positive is forwards. */
  velocity: number
  loop?: boolean
  skipSnaps?: boolean
}) {
  if (skipSnaps) return getNearestSnap(snaps, position + velocity * 0.2)
  const delta = position - (snaps[index] ?? 0)
  const direction =
    Math.abs(velocity) > FLICK_VELOCITY ? Math.sign(velocity) : Math.sign(delta)
  if (direction === 0) return index
  const neighbour =
    direction > 0
      ? getNextIndex(index, snaps.length, loop)
      : getPreviousIndex(index, snaps.length, loop)
  if (neighbour === index) return index
  if (Math.abs(velocity) > FLICK_VELOCITY) return neighbour
  // A wrap has no distance to compare against: the end of the travel is enough.
  const isWrap = direction > 0 ? neighbour < index : neighbour > index
  if (isWrap) return index
  const distance = Math.abs((snaps[neighbour] ?? 0) - (snaps[index] ?? 0))
  return Math.abs(delta) > distance / 2 ? neighbour : index
}

export function getSlidesInView(layout: CarouselLayout, position: number) {
  const end = position + layout.viewport
  const inView: number[] = []
  layout.offsets.forEach((offset, index) => {
    if (offset + (layout.sizes[index] ?? 0) > position && offset < end) {
      inView.push(index)
    }
  })
  return inView
}
