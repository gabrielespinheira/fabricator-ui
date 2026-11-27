import svgpath from "svgpath"

import { getBounds } from "./geometry"
import type { IconElement, OutlineIcon } from "./types"
import { roundOutline } from "./ui-geometry"
import { drawUiGlyph } from "./ui-glyphs"

type Point = [number, number]
type Proportion = {
  width: number
  height: number
  shoulder: number
  corner: number
}

const proportions = {
  direction: { width: 0.94, height: 0.89, shoulder: 0.02, corner: 0.63 },
  control: { width: 0.92, height: 0.92, shoulder: 0.035, corner: 0.64 },
  panel: { width: 1.01, height: 0.92, shoulder: 0.045, corner: 0.66 },
  portrait: { width: 1.025, height: 0.94, shoulder: 0.055, corner: 0.61 },
  object: { width: 0.985, height: 0.925, shoulder: 0.045, corner: 0.64 },
} satisfies Record<string, Proportion>

function chooseProportion(icon: Pick<OutlineIcon, "name" | "categories">) {
  const categories = new Set(icon.categories)
  if (/^(arrow|chevron|move|corner|navigation)(-|$)/.test(icon.name))
    return proportions.direction
  if (
    categories.has("layout") ||
    categories.has("devices") ||
    categories.has("mail")
  )
    return proportions.panel
  if (
    categories.has("people") ||
    categories.has("animals") ||
    categories.has("emoji")
  )
    return proportions.portrait
  if (
    categories.has("shapes") ||
    categories.has("math") ||
    categories.has("letters-digits")
  )
    return proportions.control
  return proportions.object
}

function coordinate(value: number) {
  return String(Number(value.toFixed(3)))
}

function points(...pairs: Point[]) {
  return pairs.flat().map(coordinate).join(" ")
}

function axis(center: number, scale: number, shoulder: number) {
  const shift = Math.max(-0.45, Math.min(0.45, (12 - center) * 0.24))
  return (value: number) => {
    const distance = value - center
    const spread = 1 - (distance / 12) ** 2
    return center + shift + distance * (scale + shoulder * spread)
  }
}

function oval(cx: number, cy: number, rx: number, ry: number, reach: number) {
  const horizontal = rx * reach
  const vertical = ry * reach
  return [
    "M" + points([cx, cy - ry]),
    "C" +
      points(
        [cx + horizontal, cy - ry],
        [cx + rx, cy - vertical],
        [cx + rx, cy]
      ),
    "C" +
      points(
        [cx + rx, cy + vertical],
        [cx + horizontal, cy + ry],
        [cx, cy + ry]
      ),
    "C" +
      points(
        [cx - horizontal, cy + ry],
        [cx - rx, cy + vertical],
        [cx - rx, cy]
      ),
    "C" +
      points(
        [cx - rx, cy - vertical],
        [cx - horizontal, cy - ry],
        [cx, cy - ry]
      ),
    "Z",
  ].join("")
}

function enclosure(
  left: number,
  top: number,
  right: number,
  bottom: number,
  rx: number,
  ry: number,
  reach: number
) {
  const horizontal = rx * (1 - reach)
  const vertical = ry * (1 - reach)
  return [
    "M" + points([left + rx, top]),
    "L" + points([right - rx, top]),
    "C" +
      points(
        [right - horizontal, top],
        [right, top + vertical],
        [right, top + ry]
      ),
    "L" + points([right, bottom - ry]),
    "C" +
      points(
        [right, bottom - vertical],
        [right - horizontal, bottom],
        [right - rx, bottom]
      ),
    "L" + points([left + rx, bottom]),
    "C" +
      points(
        [left + horizontal, bottom],
        [left, bottom - vertical],
        [left, bottom - ry]
      ),
    "L" + points([left, top + ry]),
    "C" +
      points(
        [left, top + vertical],
        [left + horizontal, top],
        [left + rx, top]
      ),
    "Z",
  ].join("")
}

function warpPath(
  drawing: string,
  x: (value: number) => number,
  y: (value: number) => number
) {
  const path: string[] = []
  svgpath(drawing)
    .abs()
    .unarc()
    .unshort()
    .iterate(([command, ...values]) => {
      path.push(
        command +
          values
            .map((value, index) =>
              coordinate(
                command === "V" || (command !== "H" && index % 2 === 1)
                  ? y(value)
                  : x(value)
              )
            )
            .join(" ")
      )
    })
  return svgpath(path.join("")).rel().round(3).toString()
}

function redrawShape(
  [tag, attrs]: IconElement,
  x: (value: number) => number,
  y: (value: number) => number,
  proportion: Proportion
): IconElement {
  if (tag === "path" && attrs.d)
    return [tag, { ...attrs, d: warpPath(attrs.d, x, y) }]
  const number = (key: string) => Number(attrs[key] ?? 0)
  const painted: Record<string, string> = attrs.fill ? { fill: attrs.fill } : {}
  if (tag === "circle" || tag === "ellipse") {
    const centerX = number("cx")
    const centerY = number("cy")
    const sourceX = Number(attrs.r ?? attrs.rx)
    const sourceY = Number(attrs.r ?? attrs.ry)
    const left = x(centerX - sourceX)
    const right = x(centerX + sourceX)
    const top = y(centerY - sourceY)
    const bottom = y(centerY + sourceY)
    const cx = (left + right) / 2
    const cy = (top + bottom) / 2
    const rx = (right - left) / 2
    const ry = (bottom - top) / 2
    if (Math.min(rx, ry) < 1.25) {
      return [
        "ellipse",
        {
          ...painted,
          cx: coordinate(cx),
          cy: coordinate(cy),
          rx: coordinate(rx),
          ry: coordinate(ry),
        },
      ]
    }
    return ["path", { ...painted, d: oval(cx, cy, rx, ry, proportion.corner) }]
  }
  if (tag === "rect") {
    const left = x(number("x"))
    const top = y(number("y"))
    const right = x(number("x") + number("width"))
    const bottom = y(number("y") + number("height"))
    const sourceX = Number(attrs.rx ?? attrs.ry ?? 0)
    const sourceY = Number(attrs.ry ?? attrs.rx ?? 0)
    const edge = Math.min(right - left, bottom - top)
    const rx = Math.min(
      (right - left) / 2,
      Math.max(edge * 0.16, sourceX * 1.13)
    )
    const ry = Math.min(
      (bottom - top) / 2,
      Math.max(edge * 0.16, sourceY * 1.13)
    )
    return [
      "path",
      {
        ...painted,
        d: enclosure(left, top, right, bottom, rx, ry, proportion.corner),
      },
    ]
  }
  if (tag === "line") {
    return [
      tag,
      {
        ...attrs,
        x1: coordinate(x(number("x1"))),
        x2: coordinate(x(number("x2"))),
        y1: coordinate(y(number("y1"))),
        y2: coordinate(y(number("y2"))),
      },
    ]
  }
  return [tag, attrs]
}

/** Fits the shared silhouettes, continuous shoulders and detail grid to an icon family. */
export function redrawUiOutline(
  icon: Pick<OutlineIcon, "name" | "categories" | "node">
) {
  const glyph = drawUiGlyph(icon.name)
  if (glyph) return glyph
  const proportion = chooseProportion(icon)
  const rounded = roundOutline(icon.node)
  const bounds = getBounds(rounded)
  const x = axis(
    (bounds.minX + bounds.maxX) / 2,
    proportion.width,
    proportion.shoulder
  )
  const y = axis(
    (bounds.minY + bounds.maxY) / 2,
    proportion.height,
    proportion.shoulder
  )
  return rounded.map((shape) => redrawShape(shape, x, y, proportion))
}
