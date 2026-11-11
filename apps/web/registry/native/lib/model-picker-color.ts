// The Model Picker's effort tint. The website turns the info colour's hue with
// relative colour syntax (`oklch(from var(--info) 0.68 c calc(h + shift))`).
// React Native has none, so these do the same maths on the resolved colour.

import { EFFORT_FILL_LIGHTNESS } from "@/registry/fabricator/shared/lib/model-picker-model"
import { oklchToHex } from "@/registry/fabricator/surface-tint"

type Rgba = { r: number; g: number; b: number; a: number }

const HEX_PATTERN = /^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i
const RGB_PATTERN =
  /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+)\s*)?\)$/i

/** The channels (0–255) and alpha of a hex, rgb() or rgba() colour. */
export function parseColor(color: string): Rgba | null {
  const value = color.trim()
  const hex = HEX_PATTERN.exec(value)?.[1]
  if (hex) {
    const full =
      hex.length === 3 ? [...hex].map((digit) => digit + digit).join("") : hex
    const channel = (at: number) => Number.parseInt(full.slice(at, at + 2), 16)
    return {
      r: channel(0),
      g: channel(2),
      b: channel(4),
      a: full.length === 8 ? channel(6) / 255 : 1,
    }
  }
  const rgb = RGB_PATTERN.exec(value)
  if (!rgb) return null
  return {
    r: Number(rgb[1]),
    g: Number(rgb[2]),
    b: Number(rgb[3]),
    a: rgb[4] === undefined ? 1 : Number(rgb[4]),
  }
}

function formatColor({ r, g, b, a }: Rgba) {
  const channels = [r, g, b].map((value) =>
    Math.round(Math.min(255, Math.max(0, value)))
  )
  if (a >= 1) {
    return `#${channels.map((value) => value.toString(16).padStart(2, "0")).join("")}`
  }
  return `rgba(${channels.join(", ")}, ${a})`
}

function toLinear(channel: number) {
  const value = channel / 255
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
}

/** sRGB to OKLCH (Björn Ottosson), the inverse of surface-tint's oklchToHex. */
function toOklch({ r, g, b }: Rgba) {
  const [lr, lg, lb] = [toLinear(r), toLinear(g), toLinear(b)]
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const lightness = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const bAxis = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  return {
    l: lightness,
    c: Math.hypot(a, bAxis),
    h: (Math.atan2(bAxis, a) * 180) / Math.PI,
  }
}

/** The colour with its OKLCH hue turned by `degrees`, or null if unreadable. */
export function shiftHue(color: string, degrees: number) {
  const parsed = parseColor(color)
  if (!parsed) return null
  const { l, c, h } = toOklch(parsed)
  const shifted = parseColor(oklchToHex(l, c, h + degrees))
  if (!shifted) return null
  return formatColor({ ...shifted, a: parsed.a })
}

/** The effort fill: the info colour's chroma at the fill's lightness, its hue turned. */
export function toEffortFill(infoColor: string, degrees: number) {
  const parsed = parseColor(infoColor)
  if (!parsed) return null
  const { c, h } = toOklch(parsed)
  return oklchToHex(EFFORT_FILL_LIGHTNESS, c, h + degrees)
}
