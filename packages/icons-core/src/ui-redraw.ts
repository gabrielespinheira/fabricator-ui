import type { IconElement, OutlineIcon } from "./types"
import { roundOutline } from "./ui-geometry"
import { drawUiGlyph } from "./ui-glyphs"
import { drawRoundedBox, fitUiGrid, gridNumber } from "./ui-grid"

function drawOval(cx: number, cy: number, rx: number, ry: number) {
  const horizontal = rx * 0.59
  const vertical = ry * 0.59
  const command = (letter: string, ...values: number[]) =>
    letter + values.map(gridNumber).join(" ")
  return [
    command("M", cx, cy - ry),
    command("C", cx + horizontal, cy - ry, cx + rx, cy - vertical, cx + rx, cy),
    command("C", cx + rx, cy + vertical, cx + horizontal, cy + ry, cx, cy + ry),
    command("C", cx - horizontal, cy + ry, cx - rx, cy + vertical, cx - rx, cy),
    command("C", cx - rx, cy - vertical, cx - horizontal, cy - ry, cx, cy - ry),
    "Z",
  ].join("")
}

function redrawPrimitive([tag, attributes]: IconElement): IconElement {
  const value = (name: string) => Number(attributes[name] ?? 0)
  const paint: Record<string, string> = attributes.fill
    ? { fill: attributes.fill }
    : {}
  if (tag === "rect") {
    const left = value("x")
    const top = value("y")
    const width = value("width")
    const height = value("height")
    const edge = Math.min(width, height)
    const radius = Math.max(edge * 0.23, value("rx") * 1.2, value("ry") * 1.2)
    return [
      "path",
      {
        ...paint,
        d: drawRoundedBox([left, top, left + width, top + height], radius),
      },
    ]
  }
  if (tag === "circle" || tag === "ellipse") {
    const cx = value("cx")
    const cy = value("cy")
    const rx = Number(attributes.r ?? attributes.rx)
    const ry = Number(attributes.r ?? attributes.ry)
    // A small lens, pivot or dot reads more cleanly as a true ellipse.
    if (Math.min(rx, ry) < 2) return [tag, attributes]
    return ["path", { ...paint, d: drawOval(cx, cy, rx, ry) }]
  }
  return [tag, attributes]
}

/** Compose a family drawing or rebuild its contours on the shared grid. */
export function redrawUiOutline(
  icon: Pick<OutlineIcon, "name" | "categories" | "node">
) {
  const drawing = drawUiGlyph(icon.name)
  if (drawing) return drawing
  const contours = roundOutline(icon.node).map(redrawPrimitive)
  return fitUiGrid(icon, contours)(contours)
}
