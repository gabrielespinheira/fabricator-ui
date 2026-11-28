import { UI_STROKE_WIDTH } from "./attributes.js"
import type { IconData, IconElement, IconWeight } from "./types.js"

export const SIDEBAR_TOGGLE_NAME = "sidebar-toggle"
export const SIDEBAR_TOGGLE_DURATION = 250
export const SIDEBAR_TOGGLE_EASING = [0.77, 0, 0.175, 1] as const

export const SIDEBAR_TOGGLE_FRAME =
  "M7.5 2.75H16.5C19.35 2.75 20.75 4.15 20.75 7V17C20.75 19.85 19.35 21.25 16.5 21.25H7.5C4.65 21.25 3.25 19.85 3.25 17V7C3.25 4.15 4.65 2.75 7.5 2.75Z"

function getSidebarToggleEdge(progress: number) {
  "worklet"
  return 9.5 + 3.75 * Math.max(0, Math.min(1, progress))
}

/** Keep the outer shoulders fixed while the panel edge slides. */
export function getSidebarTogglePanel(progress: number) {
  "worklet"
  const edge = getSidebarToggleEdge(progress)
  return `M7.5 3.875H${edge - 1.25}Q${edge} 3.875 ${edge} 5.125V18.875Q${edge} 20.125 ${edge - 1.25} 20.125H7.5C5.4 20.125 4.375 19.1 4.375 17V7C4.375 4.9 5.4 3.875 7.5 3.875Z`
}

export function getSidebarToggleDivider(progress: number) {
  "worklet"
  return `M${getSidebarToggleEdge(progress)} 2.75V21.25`
}

export function getSidebarToggleFill(progress: number) {
  "worklet"
  return `${SIDEBAR_TOGGLE_FRAME} ${getSidebarTogglePanel(progress)}`
}

export function getSidebarToggleDrawing(
  variant: IconWeight,
  progress = 0
): IconData {
  const name = SIDEBAR_TOGGLE_NAME
  const frame: IconElement = ["path", { d: SIDEBAR_TOGGLE_FRAME }]
  if (variant === "fill") {
    return {
      name,
      paint: "fill",
      node: [
        ["path", { d: getSidebarToggleFill(progress), "fill-rule": "evenodd" }],
        [
          "path",
          {
            ...frame[1],
            fill: "none",
            stroke: "currentColor",
            "stroke-width": String(UI_STROKE_WIDTH),
          },
        ],
      ],
    }
  }
  const node: IconElement[] = [
    frame,
    ["path", { d: getSidebarToggleDivider(progress) }],
  ]
  return variant === "duotone"
    ? {
        name,
        node,
        secondary: [["path", { d: getSidebarTogglePanel(progress) }]],
      }
    : { name, node }
}
