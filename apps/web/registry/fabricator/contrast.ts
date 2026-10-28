// WCAG 2 contrast for oklch() colours, translucent ones composited the way a
// browser paints them. Used by the colour tests and the Colors page.

import { oklchToLinearRgb } from "@/registry/fabricator/surface-tint"

/** Gamma-encoded sRGB, each channel 0 to 1. */
export type Rgb = readonly [number, number, number]

const OKLCH = /oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)/

export function parseOklch(color: string) {
  const match = color.match(OKLCH)
  if (!match) throw new Error(`Not an oklch() colour: ${color}`)
  const [l, c, h] = match.slice(1, 4).map(Number)
  return { l, c, h, alpha: match[4] === undefined ? 1 : Number(match[4]) }
}

const encode = (v: number) =>
  v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
const decode = (v: number) =>
  v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4

/** The colour's opaque part as sRGB, clipped the way screens clip it. */
function toRgb(color: string): Rgb {
  const { l, c, h } = parseOklch(color)
  const [r, g, b] = oklchToLinearRgb(l, c, h).map((v) =>
    encode(Math.min(1, Math.max(0, v)))
  )
  return [r, g, b]
}

const asRgb = (color: string | Rgb) =>
  typeof color === "string" ? toRgb(color) : color

/**
 * A colour painted over an opaque one, as the browser composites it: its own
 * alpha times `opacity` (a Tailwind modifier such as `bg-primary/90`).
 */
export function layer(color: string, below: string | Rgb, opacity = 1): Rgb {
  const alpha = parseOklch(color).alpha * opacity
  const top = toRgb(color)
  const bottom = asRgb(below)
  const mix = (index: 0 | 1 | 2) =>
    top[index] * alpha + bottom[index] * (1 - alpha)
  return [mix(0), mix(1), mix(2)]
}

// WCAG relative luminance of an opaque colour.
export function luminance(color: string | Rgb) {
  const [r, g, b] = asRgb(color).map(decode)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string | Rgb, b: string | Rgb) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
