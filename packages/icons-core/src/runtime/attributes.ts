import type { BrandArt, BrandIconData } from "./types.js"

export const ICON_SIZE = 24
export const UI_STROKE_WIDTH = 1.75

/** Joins class names, dropping empty and repeated ones. */
export function mergeClasses(
  ...classes: (string | undefined | null | false)[]
) {
  return classes
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim() !== ""
    )
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(" ")
    .trim()
}

/** True when the caller gave the icon an accessible name or role. */
export function hasA11yProp(props: object) {
  for (const prop in props) {
    if (prop.startsWith("aria-") || prop === "role" || prop === "title")
      return true
  }
  return false
}

/**
 * The stroke, in grid units, that draws `strokeWidth` (its width at 24px)
 * readably at `size` pixels. On screen the line grows in proportion to the
 * size plus 18px: 2.125 units at 16px and 2.5 at 12px for the 1.75 stroke,
 * about 1.4 and 1.25px instead of 1.17 and 0.875.
 */
export function getAutoStrokeWidth(strokeWidth: number, size: number) {
  // 24 / (24 + 18): the 24px grid keeps the drawn stroke.
  return (strokeWidth * 4 * (size + 18)) / (7 * size)
}

/**
 * The stroke to draw: the given `strokeWidth` as is; with none, the icon's
 * own `baseStrokeWidth` adjusted to a pixel size (16 or "16"; a size with a
 * unit keeps it), as getAutoStrokeWidth. Lucide's `absoluteStrokeWidth` keeps the stroke's
 * pixel width instead.
 */
export function getStrokeWidth({
  strokeWidth,
  baseStrokeWidth = UI_STROKE_WIDTH,
  absoluteStrokeWidth,
  size,
  opticalScale = 1,
}: {
  strokeWidth?: number | string
  baseStrokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  size?: number | string
  opticalScale?: number
}) {
  // NaN for "16px" or "1em", which keep the drawn stroke.
  const pixels = Number(size)
  const width = Number(strokeWidth ?? baseStrokeWidth)
  if (absoluteStrokeWidth)
    return (width * ICON_SIZE) / ((pixels || ICON_SIZE) * opticalScale)
  // getAutoStrokeWidth, inlined: it ships in every icon.
  return (
    strokeWidth ?? (pixels ? (width * 4 * (pixels + 18)) / (7 * pixels) : width)
  )
}

/** Scales artwork around the centre of its grid. */
export function getArtworkViewBox(width: number, height: number, scale = 1) {
  if (scale === 1) return `0 0 ${width} ${height}`
  const inset = (1 - 1 / scale) / 2
  return [width * inset, height * inset, width / scale, height / scale]
    .map((value) => Number(value.toFixed(3)))
    .join(" ")
}

export const getBrandViewBox = getArtworkViewBox

export function getBrandArtworkViewBox(
  data: Pick<BrandIconData, "opticalScale" | "scale">,
  art?: BrandArt
) {
  return getArtworkViewBox(
    art?.width ?? ICON_SIZE,
    art?.height ?? ICON_SIZE,
    art?.opticalScale ?? data.opticalScale ?? data.scale
  )
}
