// The brand colour's contrast: which text sits on it, and the shade of it
// that stays readable as a link. Ratios follow WCAG 2.

type Rgb = [number, number, number]

const AA = 4.5

function toRgb(hex: string): Rgb | null {
  const match =
    /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})(?:[0-9a-f]{2})?$/i.exec(hex)
  if (!match) return null
  const [, red = "0", green = "0", blue = "0"] = match
  return [parseInt(red, 16), parseInt(green, 16), parseInt(blue, 16)]
}

function toHex(rgb: Rgb) {
  return `#${rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`
}

function getLuminance(rgb: Rgb) {
  const [red, green, blue] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * (red ?? 0) + 0.7152 * (green ?? 0) + 0.0722 * (blue ?? 0)
}

/** 1 to 21, or 1 for a colour that doesn't parse. */
export function getContrast(first: string, second: string) {
  const a = toRgb(first)
  const b = toRgb(second)
  if (!a || !b) return 1
  const [light, dark] = [getLuminance(a), getLuminance(b)].toSorted(
    (x, y) => y - x
  )
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05)
}

/** Black or white, whichever reads better on the colour. */
export function getTextOn(color: string) {
  return getContrast(color, "#ffffff") >= getContrast(color, "#000000")
    ? "#ffffff"
    : "#000000"
}

function mix(from: Rgb, to: Rgb, share: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * share,
    from[1] + (to[1] - from[1]) * share,
    from[2] + (to[2] - from[2]) * share,
  ]
}

/** The colour itself, or the nearest shade that reads on the background. */
export function getReadableShade(color: string, background: string) {
  const rgb = toRgb(color)
  const surface = toRgb(background)
  if (!rgb || !surface) return color
  const target: Rgb = getLuminance(surface) > 0.18 ? [0, 0, 0] : [255, 255, 255]
  for (let share = 0; share <= 1; share += 0.04) {
    const shade = toHex(mix(rgb, target, share))
    if (getContrast(shade, background) >= AA) return shade
  }
  return toHex(target)
}

export type BrandReport = {
  textOn: string
  ratio: number
  /** The link's shade had to move away from the brand colour. */
  isLinkAdjusted: boolean
  linkOnLight: string
  linkOnDark: string
}

const LIGHT = "#ffffff"
const DARK = "#1c1c1c"

export function getBrandReport(color: string): BrandReport {
  const textOn = getTextOn(color)
  const linkOnLight = getReadableShade(color, LIGHT)
  const linkOnDark = getReadableShade(color, DARK)
  return {
    textOn,
    ratio: Math.floor(getContrast(color, textOn) * 10) / 10,
    isLinkAdjusted: linkOnLight !== color.toLowerCase().slice(0, 7),
    linkOnLight,
    linkOnDark,
  }
}
