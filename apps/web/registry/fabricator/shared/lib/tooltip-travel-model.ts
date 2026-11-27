// One tooltip that travels: a tooltip opening while another is showing, or
// just after it closed, starts at the old one's place and size and moves to
// its own. The popup is placed for its final size, so while its width and
// height spring from the old ones, an offset that shrinks on the same curve
// keeps its centre on a straight path between the two.

export type TooltipBox = {
  left: number
  top: number
  width: number
  height: number
}

/** The last tooltip shown: still open (null), or when it closed. */
export type LastTooltip = { hiddenAt: number | null } | null

// Moving from one trigger to the next takes longer than a frame; past this
// the tooltip appears in place again.
const TRAVEL_WINDOW_MS = 300

export function shouldTooltipTravel(last: LastTooltip, now: number) {
  if (!last) return false
  return last.hiddenAt === null || now - last.hiddenAt < TRAVEL_WINDOW_MS
}

/**
 * Where the new tooltip starts: the offset from its own place and the size it
 * starts at. Both spring to zero offset and its own size together.
 */
export function getTooltipTravel(from: TooltipBox, to: TooltipBox) {
  const centre = (start: number, size: number) => start + size / 2
  return {
    x:
      centre(from.left, from.width) -
      centre(to.left, to.width) -
      (from.width - to.width) / 2,
    y:
      centre(from.top, from.height) -
      centre(to.top, to.height) -
      (from.height - to.height) / 2,
    width: from.width,
    height: from.height,
  }
}
