import { oklchToLinearRgb } from "@/registry/fabricator/surface-tint"

// WCAG relative luminance of an opaque oklch() colour, via linear sRGB.
export function luminance(color: string) {
  const match = color.match(/oklch\(([\d.]+) ([\d.]+) ([\d.]+)/)
  if (!match) throw new Error(`Not an opaque oklch() colour: ${color}`)
  const [l, c, h] = match.slice(1).map(Number)
  const clamp = (v: number) => Math.min(1, Math.max(0, v))
  const [r, g, b] = oklchToLinearRgb(l, c, h).map(clamp)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
