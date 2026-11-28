import type { IconElement } from "./types.js"

export function resolveUiPaint(
  node: IconElement[],
  color: string | undefined
): IconElement[] {
  if (!color) return node
  return node.map(([tag, attrs]) => [
    tag,
    {
      ...attrs,
      ...(attrs.fill === "currentColor" && { fill: color }),
      ...(attrs.stroke === "currentColor" && { stroke: color }),
    },
  ])
}

/** White keeps the surface visible, and black removes the interior detail. */
export function getCutoutMask(
  node: IconElement[],
  area = { x: "0", y: "0", width: "24", height: "24" }
): IconElement[] {
  return [
    [
      "rect",
      {
        ...area,
        fill: "white",
        stroke: "none",
      },
    ],
    ...resolveUiPaint(node, "black"),
  ]
}
