import svgpath from "svgpath"

import { parseSvg } from "./svg"
import type { IconElement } from "./types"

const ART_ATTRIBUTES = new Set([
  "d",
  "fill",
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

function translate(element: IconElement, x: number, y: number): IconElement {
  const [tag, attributes] = element
  if (tag !== "path" || !attributes.d) {
    throw new BrandArtError(`a transformed <${tag}> can't be flattened`)
  }
  return [
    tag,
    {
      ...attributes,
      d: svgpath(attributes.d).translate(x, y).round(3).toString(),
    },
  ]
}

/**
 * Turns an artwork body into plain elements: groups with a translate are
 * flattened into their paths, colour keywords become hex, and anything that
 * could collide or vanish (gradients, defs, ids, other transforms) is refused.
 */
export function parseBrandArt(
  body: string,
  width: number,
  height: number
): IconElement[] {
  const parsed = parseSvg(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`
  )
  const node = [...parsed.node]
  for (const group of parsed.groups) {
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
    node.push(
      ...group.node.map((element) =>
        translate(element, Number(match[1]), Number(match[2]))
      )
    )
  }
  return node.map(([tag, attributes]) => {
    for (const name of Object.keys(attributes)) {
      if (!ART_ATTRIBUTES.has(name))
        throw new BrandArtError(`<${tag}> has a ${name} attribute`)
    }
    const hex = attributes.fill ? COLOR_KEYWORDS[attributes.fill] : undefined
    return [tag, hex ? { ...attributes, fill: hex } : attributes]
  })
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
