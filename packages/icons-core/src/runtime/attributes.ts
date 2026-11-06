export const ICON_SIZE = 24
export const ICON_STROKE_WIDTH = 2

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
  strokeWidth = ICON_STROKE_WIDTH,
  absoluteStrokeWidth = false,
  size = ICON_SIZE,
}: {
  strokeWidth?: number | string
  absoluteStrokeWidth?: boolean
  size?: number | string
}) {
  if (!absoluteStrokeWidth) return strokeWidth
  return (Number(strokeWidth) * ICON_SIZE) / Number(size)
}

/** Widens the viewBox around its centre: a scale below 1 shrinks the mark and can never clip it. */
export function getBrandViewBox(width: number, height: number, scale = 1) {
  if (scale === 1) return `0 0 ${width} ${height}`
  const round = (value: number) => Number(value.toFixed(3))
  const boxWidth = width / scale
  const boxHeight = height / scale
  return [
    round((width - boxWidth) / 2),
    round((height - boxHeight) / 2),
    round(boxWidth),
    round(boxHeight),
  ].join(" ")
}
