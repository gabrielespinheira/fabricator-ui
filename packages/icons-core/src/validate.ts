import { getBounds } from "./geometry"
import type { ParsedSvg } from "./svg"
import type { IconElement, IconTag } from "./types"

/** Lucide's root attributes, as written in its source SVGs. */
export const OUTLINE_ROOT_ATTRIBUTES: Record<string, string> = {
  xmlns: "http://www.w3.org/2000/svg",
  width: "24",
  height: "24",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": "2",
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
}

const SHAPE_ATTRIBUTES: Record<IconTag, string[]> = {
  path: ["d"],
  circle: ["cx", "cy", "r"],
  ellipse: ["cx", "cy", "rx", "ry"],
  rect: ["x", "y", "width", "height", "rx", "ry"],
  line: ["x1", "y1", "x2", "y2"],
  polyline: ["points"],
  polygon: ["points"],
}

const STROKE_WIDTH = 2
const SAFE_ZONE = { min: 1, max: 23 }
/** Lucide's own shapes overshoot by up to 0.03; originals reuse them unchanged. */
const SAFE_ZONE_TOLERANCE = 0.05
const DECIMALS = /\d\.\d{4,}/

export type ValidateOptions = {
  /** Spec rules for Fabricator-authored icons: precision and safe zone. */
  strict: boolean
}

export function validateElements(
  node: IconElement[],
  extraAttributes: string[] = []
) {
  const errors: string[] = []
  for (const [tag, attributes] of node) {
    const allowed = [...SHAPE_ATTRIBUTES[tag], ...extraAttributes]
    for (const name of Object.keys(attributes)) {
      if (name === "fill" && attributes.fill === "currentColor") continue
      if (!allowed.includes(name)) {
        errors.push(`<${tag}> has a ${name} attribute, which is not allowed`)
      }
    }
  }
  return errors
}

export function validatePrecision(node: IconElement[]) {
  const errors: string[] = []
  for (const [tag, attributes] of node) {
    for (const [name, value] of Object.entries(attributes)) {
      if (DECIMALS.test(value))
        errors.push(`<${tag}> ${name} has more than 3 decimals`)
    }
  }
  return errors
}

export function validateOutlineSvg(
  parsed: ParsedSvg,
  { strict }: ValidateOptions
) {
  const errors: string[] = []

  for (const [name, expected] of Object.entries(OUTLINE_ROOT_ATTRIBUTES)) {
    const actual = parsed.attributes[name]
    if (actual !== expected) {
      errors.push(
        `root attribute ${name} is ${actual === undefined ? "missing" : `"${actual}"`}, expected "${expected}"`
      )
    }
  }
  for (const name of Object.keys(parsed.attributes)) {
    if (!(name in OUTLINE_ROOT_ATTRIBUTES))
      errors.push(`root attribute ${name} is not allowed`)
  }
  if (parsed.groups.length > 0) errors.push("groups (<g>) are not allowed")
  if (parsed.node.length === 0) errors.push("the icon has no shapes")
  errors.push(...validateElements(parsed.node))

  if (strict && parsed.node.length > 0) {
    errors.push(...validatePrecision(parsed.node))
    const bounds = getBounds(parsed.node)
    const half = STROKE_WIDTH / 2
    const stroked = {
      minX: bounds.minX - half,
      minY: bounds.minY - half,
      maxX: bounds.maxX + half,
      maxY: bounds.maxY + half,
    }
    if (
      stroked.minX < SAFE_ZONE.min - SAFE_ZONE_TOLERANCE ||
      stroked.minY < SAFE_ZONE.min - SAFE_ZONE_TOLERANCE ||
      stroked.maxX > SAFE_ZONE.max + SAFE_ZONE_TOLERANCE ||
      stroked.maxY > SAFE_ZONE.max + SAFE_ZONE_TOLERANCE
    ) {
      errors.push(
        `the stroke reaches x ${stroked.minX} to ${stroked.maxX}, y ${stroked.minY} to ${stroked.maxY}; keep it inside ${SAFE_ZONE.min} to ${SAFE_ZONE.max}`
      )
    }
  }

  return errors
}
