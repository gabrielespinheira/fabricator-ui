// React Native has no mask, so a scroll area's fade is a gradient painted over
// the content. Its far stop is the same colour at no opacity: fading to plain
// `transparent` (black at zero) greys the middle of the gradient on iOS.

const HEX = /^#([0-9a-f]{3,8})$/i
const RGB = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i

function parseChannels(color: string) {
  const hex = HEX.exec(color)?.[1]
  if (hex) {
    const digits =
      hex.length < 6
        ? [...hex.slice(0, 3)].map((digit) => digit + digit).join("")
        : hex.slice(0, 6)
    return [0, 2, 4].map((start) =>
      Number.parseInt(digits.slice(start, start + 2), 16)
    )
  }
  const rgb = RGB.exec(color)
  return rgb ? [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])] : null
}

/** The colour at `alpha`, for the formats the theme writes. */
export function withAlpha(color: string, alpha: number) {
  const channels = parseChannels(color)
  return channels ? `rgba(${channels.join(", ")}, ${alpha})` : "transparent"
}

/** Grows with the distance to an edge, reaching full at the fade's size. */
export function getFadeOpacity(distance: number, size: number) {
  "worklet"
  return Math.min(1, Math.max(0, distance / size))
}

// Samples of the curve: enough that the fade shows no steps or a line where it ends.
const HEADER_FADE_SAMPLES = 8

/**
 * The fade behind a phone's status bar and header. It holds the page's colour
 * behind the clock and the island, keeps the header's row legible, and melts away
 * just past it, so a scrolling page dissolves instead of stopping at a line.
 */
export function getHeaderFade({
  color,
  insetTop,
  rowHeight,
}: {
  color: string
  insetTop: number
  rowHeight: number
}) {
  const solid = insetTop + rowHeight * 0.55
  const height = insetTop + rowHeight * 1.35
  const colors: [string, string, ...string[]] = [
    withAlpha(color, 1),
    withAlpha(color, 1),
  ]
  const locations: [number, number, ...number[]] = [0, solid / height]
  for (let sample = 1; sample <= HEADER_FADE_SAMPLES; sample += 1) {
    const progress = sample / HEADER_FADE_SAMPLES
    const eased = progress * progress * (3 - 2 * progress)
    colors.push(withAlpha(color, Number((1 - eased).toFixed(3))))
    locations.push((solid + (height - solid) * progress) / height)
  }
  return { height, colors, locations }
}
