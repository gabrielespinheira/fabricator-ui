import svgpath from "svgpath"

import { getBounds } from "./geometry"
import { parseSvg, type SvgGroup } from "./svg"
import type { BrandArt, IconElement } from "./types"

const ART_ATTRIBUTES = new Set([
  "d",
  "fill",
  "fill-opacity",
  "opacity",
  "fill-rule",
  "clip-rule",
  "cx",
  "cy",
  "r",
  "rx",
  "ry",
  "x",
  "y",
  "width",
  "height",
])

const COLOR_KEYWORDS: Record<string, string> = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
}

export class BrandArtError extends Error {
  override name = "BrandArtError"
}

function shift(value: string | undefined, by: number) {
  return String(Number((Number(value ?? 0) + by).toFixed(3)))
}

function translate(element: IconElement, x: number, y: number): IconElement {
  const [tag, attributes] = element
  switch (tag) {
    case "path":
      if (!attributes.d) throw new BrandArtError("a <path> has no d")
      return [
        tag,
        {
          ...attributes,
          d: svgpath(attributes.d).translate(x, y).round(3).toString(),
        },
      ]
    case "circle":
    case "ellipse":
      return [
        tag,
        {
          ...attributes,
          cx: shift(attributes.cx, x),
          cy: shift(attributes.cy, y),
        },
      ]
    case "rect":
      return [
        tag,
        { ...attributes, x: shift(attributes.x, x), y: shift(attributes.y, y) },
      ]
    default:
      throw new BrandArtError(`a transformed <${tag}> can't be flattened`)
  }
}

function flatten(group: SvgGroup) {
  const { transform, ...rest } = group.attributes
  if (Object.keys(rest).length > 0) {
    throw new BrandArtError(
      `<g> has ${Object.keys(rest).join(", ")}, which can't be flattened`
    )
  }
  const match = transform?.match(
    /^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/
  )
  if (!match)
    throw new BrandArtError(
      `<g transform="${transform}"> is not a plain translate`
    )
  return group.node.map((element) =>
    translate(element, Number(match[1]), Number(match[2]))
  )
}

function parseMatrix(transform: string) {
  const translate = transform.match(
    /^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/
  )
  if (translate) return [1, 0, 0, 1, Number(translate[1]), Number(translate[2])]
  const matrix = transform.match(/^matrix\(([^)]+)\)$/)
  const values = matrix?.[1]
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  if (!values || values.length !== 6 || values.some(Number.isNaN)) {
    throw new BrandArtError(
      `transform="${transform}" is not a translate or a matrix`
    )
  }
  return values
}

/** Applies an element's own transform to its geometry, so no transform ships. */
function applyTransform(element: IconElement): IconElement {
  const [tag, { transform, ...attributes }] = element
  if (!transform) return element
  if (tag === "path" && attributes.d) {
    return [
      tag,
      {
        ...attributes,
        d: svgpath(attributes.d).transform(transform).round(3).toString(),
      },
    ]
  }
  if (tag === "circle") {
    const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = parseMatrix(transform)
    // Only rotations, reflections and uniform scales keep a circle a circle.
    const isSimilarity =
      Math.abs(a * a + b * b - (c * c + d * d)) < 1e-9 &&
      Math.abs(a * c + b * d) < 1e-9
    if (!isSimilarity)
      throw new BrandArtError(
        `transform="${transform}" turns a circle into an ellipse`
      )
    const cx = Number(attributes.cx ?? 0)
    const cy = Number(attributes.cy ?? 0)
    const round = (value: number) => String(Number(value.toFixed(3)))
    return [
      tag,
      {
        ...attributes,
        cx: round(a * cx + c * cy + e),
        cy: round(b * cx + d * cy + f),
        r: round(Number(attributes.r ?? 0) * Math.sqrt(a * a + b * b)),
      },
    ]
  }
  throw new BrandArtError(`a transformed <${tag}> can't be flattened`)
}

export type BrandArtOptions = {
  /**
   * The paint for shapes without a fill. The logos set means black there;
   * art drawn for Fabricator leaves a shape unfilled to follow currentColor.
   */
  unfilled?: string
  /** Outdated colours mapped to the brand's current ones (keys lowercase). */
  recolor?: Record<string, string>
}

/**
 * Turns an artwork body into plain elements, in paint order: groups with a
 * translate are flattened into their shapes, colour keywords become hex, and
 * anything that could collide or vanish (gradients, defs, ids, other
 * transforms) is refused.
 */
export function parseBrandArt(
  body: string,
  width: number,
  height: number,
  { unfilled, recolor = {} }: BrandArtOptions = {}
): IconElement[] {
  const parsed = parseSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`
  )
  const node = parsed.ordered
    .flatMap((child) => ("node" in child ? flatten(child) : [child]))
    .map(applyTransform)
  return node.map(([tag, attributes]) => {
    for (const name of Object.keys(attributes)) {
      if (!ART_ATTRIBUTES.has(name))
        throw new BrandArtError(`<${tag}> has a ${name} attribute`)
    }
    const keyword = attributes.fill
      ? (COLOR_KEYWORDS[attributes.fill] ?? attributes.fill)
      : unfilled
    const fill = keyword
      ? (recolor[keyword.toLowerCase()] ?? keyword)
      : undefined
    return [tag, fill ? { ...attributes, fill } : attributes]
  })
}

/**
 * Art for a one-colour mark whose details are cut-outs that the brand fills
 * white (Facebook's "f"): a white shape under the brand's current path, so the
 * geometry stays the brand's own. The underlay is inset 1 unit, so it never
 * shows past the mark's edge.
 */
export function buildUnderlayArt(
  d: string,
  hex: string,
  shape: "circle" | "square"
): BrandArt {
  const bounds = getBounds([["path", { d }]])
  const round = (value: number) => String(Number(value.toFixed(3)))
  const width = bounds.maxX - bounds.minX
  const height = bounds.maxY - bounds.minY
  const underlay: IconElement =
    shape === "circle"
      ? [
          "circle",
          {
            cx: round(bounds.minX + width / 2),
            cy: round(bounds.minY + height / 2),
            r: round(Math.min(width, height) / 2 - 1),
            fill: "#ffffff",
          },
        ]
      : [
          "rect",
          {
            x: round(bounds.minX + 1),
            y: round(bounds.minY + 1),
            width: round(width - 2),
            height: round(height - 2),
            fill: "#ffffff",
          },
        ]
  return { width: 24, height: 24, node: [underlay, ["path", { d, fill: hex }]] }
}

/** Rescales single-path art onto the 24 × 24 box of a one-colour mark. */
export function toMonoPath(node: IconElement[], width: number, height: number) {
  const [first, ...others] = node
  if (!first || others.length > 0 || first[0] !== "path" || !first[1].d) {
    throw new BrandArtError("only single-path art can become a one-colour mark")
  }
  const scale = 24 / Math.max(width, height)
  return svgpath(first[1].d)
    .translate(
      (Math.max(width, height) - width) / 2,
      (Math.max(width, height) - height) / 2
    )
    .scale(scale)
    .round(3)
    .toString()
}
