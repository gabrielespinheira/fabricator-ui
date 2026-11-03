// Ported from SharpOS (@sharp/core-brand-icons 3.0.1) so both products
// resolve brand colours the same way.
import type { BrandColors } from "./types"

/** Fabricator's dark `--surface-1` at zero chroma, and SharpOS's dark surface. */
export const DARK_SURFACE = "#171717"

/**
 * Two thresholds on purpose. A brand is only lifted once it falls below WCAG's
 * 3:1 for graphics, which keeps well-known colours exact; once it fails, it is
 * lifted to a comfortable 4.5:1, since marks render as small as 14px.
 */
const LIFT_BELOW = 3
const LIFT_TARGET = 4.5

/** Below this saturation a colour carries no recognisable hue. */
const ACHROMATIC_SATURATION = 0.15

type Rgb = { r: number; g: number; b: number }
type Hsl = { h: number; s: number; l: number }

function hexToRgb(hex: string): Rgb {
  const value = hex.replace("#", "")
  const full =
    value.length === 3
      ? value
          .split("")
          .map((character) => character + character)
          .join("")
      : value
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  }
}

function toHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.round(Math.min(255, Math.max(0, value)))
      .toString(16)
      .padStart(2, "0")
  return `#${channel(r)}${channel(g)}${channel(b)}`
}

/** WCAG relative luminance. */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const linear = (channel: number) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** WCAG contrast ratio between two hex colours. */
export function contrast(a: string, b: string): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05)
}

function rgbToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex)
  const [red, green, blue] = [r / 255, g / 255, b / 255]
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const l = (max + min) / 2

  if (delta === 0) return { h: 0, s: 0, l }

  const s = delta / (1 - Math.abs(2 * l - 1))
  let h: number
  if (max === red) h = ((green - blue) / delta) % 6
  else if (max === green) h = (blue - red) / delta + 2
  else h = (red - green) / delta + 4

  return { h: (h * 60 + 360) % 360, s, l }
}

function hslToHex({ h, s, l }: Hsl): string {
  const chroma = (1 - Math.abs(2 * l - 1)) * s
  const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - chroma / 2
  const [r, g, b] =
    h < 60
      ? [chroma, x, 0]
      : h < 120
        ? [x, chroma, 0]
        : h < 180
          ? [0, chroma, x]
          : h < 240
            ? [0, x, chroma]
            : h < 300
              ? [x, 0, chroma]
              : [chroma, 0, x]
  return toHex({ r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 })
}

/** Steps lightness away from the surface until the pair clears LIFT_TARGET. */
function liftAgainst(hex: string, surface: string): string {
  if (contrast(hex, surface) >= LIFT_BELOW) return hex

  const hsl = rgbToHsl(hex)
  const surfaceIsDark = luminance(surface) < 0.5

  for (let step = 1; step <= 100; step++) {
    const l = surfaceIsDark
      ? Math.min(1, hsl.l + step / 100)
      : Math.max(0, hsl.l - step / 100)
    const candidate = hslToHex({ ...hsl, l })
    if (contrast(candidate, surface) >= LIFT_TARGET) return candidate
    if (surfaceIsDark ? l >= 1 : l <= 0) break
  }

  return surfaceIsDark ? "#ffffff" : "#000000"
}

/**
 * Light keeps the official hex: guidelines are written against white, and
 * forcing contrast there muddies bright marks. Dark lifts any hex that would
 * vanish on the dark surface. Achromatic marks (X, GitHub, Apple) follow
 * `currentColor`, because a desaturated colour has no hue to lift toward.
 */
export function resolveBrandColors(hex: string): BrandColors {
  if (rgbToHsl(hex).s < ACHROMATIC_SATURATION) {
    return { inherit: true, light: hex, dark: hex }
  }
  return { inherit: false, light: hex, dark: liftAgainst(hex, DARK_SURFACE) }
}
