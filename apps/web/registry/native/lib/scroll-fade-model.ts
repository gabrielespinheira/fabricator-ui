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
