import { parseSync, type INode } from "svgson"

import { ICON_TAGS, type IconElement, type IconTag } from "./types"

export type SvgGroup = {
  attributes: Record<string, string>
  node: IconElement[]
}

export type ParsedSvg = {
  attributes: Record<string, string>
  node: IconElement[]
  groups: SvgGroup[]
  /** Shapes and groups in document order, for art where paint order matters. */
  ordered: (IconElement | SvgGroup)[]
}

export class SvgParseError extends Error {
  override name = "SvgParseError"
}

function isIconTag(name: string): name is IconTag {
  return (ICON_TAGS as readonly string[]).includes(name)
}

function toElement(child: INode): IconElement {
  if (!isIconTag(child.name)) {
    throw new SvgParseError(`<${child.name}> is not an allowed element`)
  }
  if (child.children.some((grandchild) => grandchild.type === "element")) {
    throw new SvgParseError(`<${child.name}> must not have child elements`)
  }
  return [child.name, { ...child.attributes }]
}

/** Parses an icon SVG into root attributes, shape elements and `<g>` groups. */
export function parseSvg(source: string): ParsedSvg {
  const root = parseSync(source)
  if (root.name !== "svg") {
    throw new SvgParseError(`The root element is <${root.name}>, not <svg>`)
  }

  const node: IconElement[] = []
  const groups: SvgGroup[] = []
  const ordered: (IconElement | SvgGroup)[] = []
  for (const child of root.children) {
    if (child.type !== "element") continue
    if (child.name === "g") {
      const group = {
        attributes: { ...child.attributes },
        node: child.children
          .filter((grandchild) => grandchild.type === "element")
          .map(toElement),
      }
      groups.push(group)
      ordered.push(group)
      continue
    }
    const element = toElement(child)
    node.push(element)
    ordered.push(element)
  }

  return { attributes: { ...root.attributes }, node, groups, ordered }
}

function renderAttributes(attributes: Record<string, string>) {
  return Object.entries(attributes)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
}

/** Prints an SVG the way Lucide's source files are formatted. */
export function renderSvg(
  attributes: Record<string, string>,
  node: IconElement[]
) {
  const root = Object.entries(attributes)
    .map(([name, value]) => `  ${name}="${value}"`)
    .join("\n")
  const children = node
    .map(
      ([tag, childAttributes]) =>
        `  <${tag} ${renderAttributes(childAttributes)} />`
    )
    .join("\n")
  return `<svg\n${root}\n>\n${children}\n</svg>\n`
}

/** Prints an SVG on one line, for strings, sprites and data URIs. */
export function renderSvgInline(
  attributes: Record<string, string>,
  node: IconElement[]
) {
  const children = node
    .map(
      ([tag, childAttributes]) =>
        `<${tag} ${renderAttributes(childAttributes)}/>`
    )
    .join("")
  return `<svg ${renderAttributes(attributes)}>${children}</svg>`
}
