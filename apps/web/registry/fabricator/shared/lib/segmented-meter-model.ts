// Segmented meter: parts of one total (storage by kind, a budget by team),
// each a share of the bar. Shares never add up past the bar: a part that
// would overflow is cut to the room left.

export type MeterSegment = { value: number }

/** Each segment's share of the bar, from 0 to 100, in order. */
export function getMeterShares(segments: MeterSegment[], max: number) {
  let left = 100
  return segments.map(({ value }) => {
    const share = max > 0 ? (Math.max(value, 0) / max) * 100 : 0
    const fitted = Math.min(share, left)
    left -= fitted
    return Math.round(fitted * 100) / 100
  })
}

/** The sum of the segments, and what is left of max. */
export function getMeterTotals(segments: MeterSegment[], max: number) {
  const used = segments.reduce((sum, { value }) => sum + Math.max(value, 0), 0)
  return { used, free: Math.max(max - used, 0) }
}
