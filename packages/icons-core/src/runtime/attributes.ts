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

/** Lucide's absoluteStrokeWidth: the stroke keeps its pixel width at any size. */
export function getStrokeWidth({
  strokeWidth = UI_STROKE_WIDTH,
  absoluteStrokeWidth = false,
  size = ICON_SIZE,
  opticalScale = 1,
}: {
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  size?: number | string
  opticalScale?: number
}) {
  if (!absoluteStrokeWidth) return strokeWidth
  return (Number(strokeWidth) * ICON_SIZE) / (Number(size) * opticalScale)
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
