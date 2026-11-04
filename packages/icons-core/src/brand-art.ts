import svgpath from "svgpath"
import { parseSync, stringify, type INode } from "svgson"

import { getBounds } from "./geometry"
import { prefixGradientFills, renderGradientMarkup } from "./runtime/gradients"
import { parseSvg, type SvgGroup } from "./svg"
import type {
  BrandArt,
  BrandGradient,
  GradientStop,
  IconElement,
} from "./types"

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
  /** Removes filters that only paint a shadow behind a shape; others stay refused. */
  dropShadows?: boolean
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

const SHADOW_STEPS = new Set([
  "feOffset",
  "feGaussianBlur",
  "feColorMatrix",
  "feMerge",
])

/** A filter that paints a shadow, then the untouched shape on top of it. */
function isDropShadow(filter: INode) {
  const steps = filter.children.filter((step) => step.type === "element")
  const last = steps.at(-1)
  return (
    steps.every((step) => SHADOW_STEPS.has(step.name)) &&
    last?.name === "feMerge" &&
    last.children.at(-1)?.attributes.in === "SourceGraphic"
  )
}

function removeFilters(element: INode, ids: Set<string>): INode {
  const { filter, ...others } = element.attributes
  const id = filter?.match(/^url\(#([^)]+)\)$/)?.[1]
  return {
    ...element,
    attributes: id && ids.has(id) ? others : element.attributes,
    children: element.children.map((child) => removeFilters(child, ids)),
  }
}

const TRANSLATE = /^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/

/** Splits nested translated groups out of a group, in paint order, adding their translates. */
function unnestGroups(element: INode): INode[] {
  const outer = element.attributes.transform?.match(TRANSLATE)
  if (element.name !== "g" || !outer) return [element]
  const pieces: INode[] = []
  let shapes: INode[] = []
  const closeRun = () => {
    if (shapes.length > 0) pieces.push({ ...element, children: shapes })
    shapes = []
  }
  for (const child of element.children) {
    const inner = child.attributes.transform?.match(TRANSLATE)
    if (child.name !== "g" || !inner) {
      shapes.push(child)
      continue
    }
    closeRun()
    const x = Number(outer[1]) + Number(inner[1])
    const y = Number(outer[2]) + Number(inner[2])
    pieces.push(
      ...unnestGroups({
        ...child,
        attributes: {
          ...child.attributes,
          transform: `translate(${Number(x.toFixed(3))} ${Number(y.toFixed(3))})`,
        },
      })
    )
  }
  closeRun()
  return pieces
}

const GRADIENT_TYPES = new Set(["linearGradient", "radialGradient"])
const GRADIENT_ATTRIBUTES = new Set([
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "fx",
  "fy",
  "fr",
  "gradientUnits",
  "gradientTransform",
  "spreadMethod",
])

function parseStop(stop: INode): GradientStop {
  const style = Object.fromEntries(
    (stop.attributes.style ?? "")
      .split(";")
      .map((declaration) => declaration.split(":").map((part) => part.trim()))
      .filter(
        (pair): pair is [string, string] =>
          pair.length === 2 && Boolean(pair[0])
      )
  )
  // SVG's default stop colour is black.
  const color =
    stop.attributes["stop-color"] ?? style["stop-color"] ?? "#000000"
  const opacity = stop.attributes["stop-opacity"] ?? style["stop-opacity"]
  return {
    offset: stop.attributes.offset ?? "0",
    color: COLOR_KEYWORDS[color] ?? color,
    ...(opacity !== undefined && { opacity }),
  }
}

function parseGradient(element: INode, id: string): BrandGradient {
  if (element.attributes.href || element.attributes["xlink:href"]) {
    throw new BrandArtError(
      `gradient ${element.attributes.id} inherits from another; inline it first`
    )
  }
  const attributes: Record<string, string> = {}
  for (const [name, value] of Object.entries(element.attributes)) {
    if (name === "id") continue
    if (!GRADIENT_ATTRIBUTES.has(name)) {
      throw new BrandArtError(`<${element.name}> has a ${name} attribute`)
    }
    attributes[name] = value
  }
  const stops = element.children.filter((child) => child.type === "element")
  if (stops.some((stop) => stop.name !== "stop")) {
    throw new BrandArtError(
      `<${element.name}> holds something other than stops`
    )
  }
  return {
    type:
      element.name === "linearGradient" ? "linearGradient" : "radialGradient",
    id,
    attributes,
    stops: stops.map(parseStop),
  }
}

/**
 * parseBrandArt for art that may use gradients. Gradients get short local ids
 * (g0, g1, …), which renderers prefix per instance so copies never collide;
 * masks, clip paths, `<use>` and filters are refused, apart from the drop
 * shadows `dropShadows` removes.
 */
export function parseBrandArtWithGradients(
  body: string,
  width: number,
  height: number,
  options: BrandArtOptions = {}
): { node: IconElement[]; gradients: BrandGradient[] } {
  const root = parseSync(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}">${body}</svg>`
  )
  const gradientElements: INode[] = []
  const shapes: INode[] = []
  const shadows = new Set<string>()
  for (const child of root.children) {
    if (child.type !== "element") continue
    if (child.name === "defs") {
      for (const definition of child.children) {
        if (definition.type !== "element") continue
        if (
          options.dropShadows &&
          definition.name === "filter" &&
          isDropShadow(definition)
        ) {
          shadows.add(definition.attributes.id ?? "")
          continue
        }
        if (!GRADIENT_TYPES.has(definition.name)) {
          throw new BrandArtError(
            `<${definition.name}> in <defs> can't be reproduced in every renderer`
          )
        }
        gradientElements.push(definition)
      }
      continue
    }
    if (GRADIENT_TYPES.has(child.name)) gradientElements.push(child)
    else shapes.push(child)
  }

  const ids = new Map(
    gradientElements.map((element, index) => [
      element.attributes.id ?? "",
      `g${index}`,
    ])
  )
  const gradients = gradientElements.map((element, index) =>
    parseGradient(element, `g${index}`)
  )
  const node = parseBrandArt(
    stringify({
      ...root,
      children: shapes
        .map((shape) => removeFilters(shape, shadows))
        .flatMap(unnestGroups),
    }).replace(/^<svg[^>]*>|<\/svg>$/g, ""),
    width,
    height,
    options
  ).map(([tag, attributes]): IconElement => {
    const reference = attributes.fill?.match(
      /^url\(\s*['"]?#([^'")]+)['"]?\s*\)$/
    )?.[1]
    if (reference === undefined) return [tag, attributes]
    const id = ids.get(reference)
    if (!id)
      throw new BrandArtError(
        `a fill points at gradient #${reference}, which the art doesn't define`
      )
    return [tag, { ...attributes, fill: `url(#${id})` }]
  })
  return { node, gradients }
}

function attributeString(values: Record<string, string>) {
  return Object.entries(values)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
}

export {
  prefixGradientFills,
  renderGradientMarkup as renderGradients,
} from "./runtime/gradients"

/** The inside of an art SVG: gradient definitions, then the shapes. */
export function renderArtBody(art: BrandArt, prefix = "") {
  const shapes = prefixGradientFills(art.node, prefix)
    .map(([tag, attributes]) => `<${tag} ${attributeString(attributes)}/>`)
    .join("")
  return `${renderGradientMarkup(art.gradients, prefix)}${shapes}`
}

/** Reads a whole art SVG file: its box from the viewBox, then shapes and gradients. */
export function parseArtDocument(
  source: string,
  options: BrandArtOptions = {}
): BrandArt {
  const root = parseSync(source)
  const [, , width, height] = (root.attributes.viewBox ?? "")
    .split(/\s+/)
    .map(Number)
  if (!width || !height) throw new BrandArtError("the art has no viewBox")
  const body = stringify(root).replace(/^<svg[^>]*>|<\/svg>$/g, "")
  const { node, gradients } = parseBrandArtWithGradients(
    body,
    width,
    height,
    options
  )
  return { width, height, node, ...(gradients.length > 0 && { gradients }) }
}
