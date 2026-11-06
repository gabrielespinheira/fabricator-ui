import type { BrandGradient, IconElement } from "./types.js"

/** Points `url(#g0)` fills at prefixed ids, so copies on one page never share gradients. */
export function prefixGradientFills(
  node: IconElement[],
  prefix: string
): IconElement[] {
  if (!prefix) return node
  return node.map(([tag, attributes]) => [
    tag,
    attributes.fill?.startsWith("url(#")
      ? {
          ...attributes,
          fill: attributes.fill.replace("url(#", `url(#${prefix}`),
        }
      : attributes,
  ])
}

function attributeString(values: Record<string, string>) {
  return Object.entries(values)
    .map(([name, value]) => `${name}="${value}"`)
    .join(" ")
}

/** Gradient definitions as SVG markup, ids prefixed: `<defs>…</defs>`, or "" for none. */
export function renderGradientMarkup(
  gradients: BrandGradient[] | undefined,
  prefix = ""
) {
  if (!gradients || gradients.length === 0) return ""
  const definitions = gradients.map((gradient) => {
    const stops = gradient.stops
      .map(
        (stop) =>
          `<stop ${attributeString({
            offset: stop.offset,
            "stop-color": stop.color,
            ...(stop.opacity !== undefined && { "stop-opacity": stop.opacity }),
          })}/>`
      )
      .join("")
    return `<${gradient.type} ${attributeString({ id: `${prefix}${gradient.id}`, ...gradient.attributes })}>${stops}</${gradient.type}>`
  })
  return `<defs>${definitions.join("")}</defs>`
}
