import type { IconData, IconElement } from "./types.js"
import { getCutoutMask, resolveUiPaint } from "./ui-paint.js"

function attributes(values: Record<string, string>) {
  return Object.entries(values)
    .map(([key, value]) => `${key}="${value}"`)
    .join(" ")
}

function shapes(node: IconElement[]) {
  return node.map(([tag, values]) => `<${tag} ${attributes(values)}/>`).join("")
}

/** A standalone SVG, with the same paint and transparent detail as the components. */
export function renderUiSvg(
  data: IconData,
  {
    size = 24,
    strokeWidth = data.strokeWidth ?? 1.5,
    color = "currentColor",
  } = {}
) {
  const fill = data.paint === "fill"
  const secondary =
    data.secondary?.map(
      ([tag, attrs]): IconElement => [
        tag,
        attrs.stroke
          ? { ...attrs, fill: "none", stroke: color, "stroke-opacity": "0.2" }
          : { ...attrs, stroke: "none", fill: color, "fill-opacity": "0.2" },
      ]
    ) ?? []
  const body = shapes(secondary) + shapes(resolveUiPaint(data.node, color))
  const id = `fab-${data.name}-cutout`
  const artwork = data.cutout?.length
    ? `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">${shapes(getCutoutMask(data.cutout))}</mask><g mask="url(#${id})">${body}</g>`
    : body
  const root = {
    xmlns: "http://www.w3.org/2000/svg",
    width: String(size),
    height: String(size),
    viewBox: "0 0 24 24",
    fill: fill ? color : "none",
    stroke: fill ? "none" : color,
    "stroke-width": String(strokeWidth),
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  }
  return `<svg ${attributes(root)}>${artwork}</svg>`
}
