import svgpath from "svgpath"

import { getBounds } from "./geometry"
import type { IconElement, OutlineIcon } from "./types"

export type UiBox = readonly [
  left: number,
  top: number,
  right: number,
  bottom: number,
]
type UiSubject = Pick<OutlineIcon, "name" | "categories">

const CENTER = 12

export function gridNumber(value: number) {
  return String(Number(value.toFixed(3)))
}

export function drawPaths(paths: readonly string[]): IconElement[] {
  return paths.map((d) => ["path", { d }])
}

/** Short, tangent Béziers give wide and square faces the same shoulders. */
export function drawRoundedBox(
  [left, top, right, bottom]: UiBox,
  radius: number
) {
  const corner = Math.min(radius, (right - left) / 2, (bottom - top) / 2)
  const gap = corner * 0.36
  const command = (letter: string, ...values: number[]) =>
    letter + values.map(gridNumber).join(" ")
  return [
    command("M", left + corner, top),
    command("H", right - corner),
    command("C", right - gap, top, right, top + gap, right, top + corner),
    command("V", bottom - corner),
    command(
      "C",
      right,
      bottom - gap,
      right - gap,
      bottom,
      right - corner,
      bottom
    ),
    command("H", left + corner),
    command("C", left + gap, bottom, left, bottom - gap, left, bottom - corner),
    command("V", top + corner),
    command("C", left, top + gap, left + gap, top, left + corner, top),
    "Z",
  ].join("")
}

function targetSpan({ name, categories }: UiSubject, span: number) {
  // A dot, punctuation or a short connector needs room around its stroke.
  if (span < 9) return Math.min(9, span * 1.12)
  if (/^(arrow|chevron|chevrons|move|corner)-/.test(name))
    return Math.min(20.25, span * 1.22)
  if (categories.includes("layout") || categories.includes("devices")) return 20
  if (categories.includes("letters-digits")) return Math.min(19, span * 1.19)
  if (categories.includes("shapes") || categories.includes("math"))
    return Math.min(19.5, span * 1.25)
  return Math.min(20.5, span * 1.33)
}

const xCoordinates = new Set(["x", "cx", "x1", "x2"])
const yCoordinates = new Set(["y", "cy", "y1", "y2"])
const distances = new Set(["width", "height", "r", "rx", "ry", "stroke-width"])

/**
 * Fit the longest axis to its optical keyline. Use the same affine mapping
 * for all parts, including authored Fill and secondary paint.
 */
export function fitUiGrid(subject: UiSubject, reference: IconElement[]) {
  const { minX, minY, maxX, maxY } = getBounds(reference)
  const span = Math.max(maxX - minX, maxY - minY)
  if (!(span > 0)) return (node: IconElement[]) => node

  const scale = targetSpan(subject, span) / span
  const translateX = CENTER - ((minX + maxX) / 2) * scale
  const translateY = CENTER - ((minY + maxY) / 2) * scale
  return (node: IconElement[]): IconElement[] =>
    node.map(([tag, attributes]) => {
      const transformed = { ...attributes }
      for (const [name, value] of Object.entries(attributes)) {
        if (name === "d") {
          transformed.d = svgpath(value)
            .scale(scale)
            .translate(translateX, translateY)
            .round(3)
            .toString()
        } else if (xCoordinates.has(name)) {
          transformed[name] = gridNumber(Number(value) * scale + translateX)
        } else if (yCoordinates.has(name)) {
          transformed[name] = gridNumber(Number(value) * scale + translateY)
        } else if (distances.has(name)) {
          transformed[name] = gridNumber(Number(value) * scale)
        } else if (name === "points") {
          transformed.points = value
            .trim()
            .split(/[\s,]+/)
            .map((coordinate, index) =>
              gridNumber(
                Number(coordinate) * scale +
                  (index % 2 === 0 ? translateX : translateY)
              )
            )
            .join(" ")
        }
      }
      return [tag, transformed]
    })
}
