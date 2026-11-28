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

/**
 * The colour a painted fade takes: one passed in, else the surface the area
 * sits on (a Card provides it), else the page. A fade in the page's colour
 * inside a card reads as a dark band.
 */
export function pickFadeColor({
  explicit,
  surface,
  theme,
}: {
  explicit?: string
  surface?: string
  theme: unknown
}) {
  return (
    explicit ?? surface ?? (typeof theme === "string" ? theme : "transparent")
  )
}

/** Grows with the distance to an edge, reaching full at the fade's size. */
export function getFadeOpacity(distance: number, size: number) {
  "worklet"
  return Math.min(1, Math.max(0, distance / size))
}

// Samples of the curve: enough that the fade shows no steps or a line where it ends.
const HEADER_FADE_SAMPLES = 8

// Flat at both ends, so a fade shows no line where it starts or stops. The
// website's scroll-fade mask samples the same curve.
function smoothstep(progress: number) {
  return progress * progress * (3 - 2 * progress)
}

/**
 * A scroll area's edge fade, painted over the content in the colour behind
 * it: solid at the edge, eased to clear. Drawn along the axis, so the end
 * edge runs the other way.
 */
export function getEdgeFade({
  color,
  edge,
}: {
  color: string
  edge: "start" | "end"
}) {
  // Solid at the edge: the start edge sits at 0, the end edge at 1.
  const alphaAt = (location: number) =>
    Number(
      (edge === "start"
        ? 1 - smoothstep(location)
        : smoothstep(location)
      ).toFixed(3)
    )
  const colors: [string, string, ...string[]] = [
    withAlpha(color, alphaAt(0)),
    withAlpha(color, alphaAt(1 / HEADER_FADE_SAMPLES)),
  ]
  const locations: [number, number, ...number[]] = [0, 1 / HEADER_FADE_SAMPLES]
  for (let sample = 2; sample <= HEADER_FADE_SAMPLES; sample += 1) {
    const location = sample / HEADER_FADE_SAMPLES
    colors.push(withAlpha(color, alphaAt(location)))
    locations.push(location)
  }
  return { colors, locations }
}

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
    const eased = smoothstep(progress)
    colors.push(withAlpha(color, Number((1 - eased).toFixed(3))))
    locations.push((solid + (height - solid) * progress) / height)
  }
  return { height, colors, locations }
}

// How much of the page shows through under a floating tab bar: enough for the
// glass to bend, too little to read against the labels.
const BOTTOM_NAV_FADE_HOLD = 0.85

/**
 * The fade under a phone's floating tab bar, as Apple's scroll edge effect: the
 * page quiets from half a bar above the capsule to the bar's middle, then holds
 * to the screen's edge. Drawn top to bottom.
 */
export function getBottomNavFade({
  color,
  clearance,
  barHeight,
}: {
  color: string
  /** From the screen's bottom edge to the capsule's top. */
  clearance: number
  barHeight: number
}) {
  const height = clearance + barHeight * 0.5
  const middle = height - (clearance - barHeight * 0.5)
  const ramp = Array.from({ length: HEADER_FADE_SAMPLES - 1 }, (_, index) => {
    const progress = (index + 1) / HEADER_FADE_SAMPLES
    const eased = smoothstep(progress)
    return {
      color: withAlpha(
        color,
        Number((BOTTOM_NAV_FADE_HOLD * eased).toFixed(3))
      ),
      location: (middle * progress) / height,
    }
  })
  // The clear top and the held middle, with the ramp between them.
  const colors: [string, string, ...string[]] = [
    withAlpha(color, 0),
    withAlpha(color, BOTTOM_NAV_FADE_HOLD),
    withAlpha(color, BOTTOM_NAV_FADE_HOLD),
  ]
  const locations: [number, number, ...number[]] = [0, middle / height, 1]
  colors.splice(1, 0, ...ramp.map((stop) => stop.color))
  locations.splice(1, 0, ...ramp.map((stop) => stop.location))
  return { height, colors, locations }
}
