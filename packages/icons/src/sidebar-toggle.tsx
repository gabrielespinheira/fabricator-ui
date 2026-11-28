"use client"

import { UI_STROKE_WIDTH } from "./generated/runtime/attributes.js"
import { getSidebarToggleDrawing } from "./generated/runtime/sidebar-toggle.js"
import type { IconElement } from "./generated/runtime/types.js"
import { renderIcon } from "./icon.js"
import { usePanelMotion, type AnimatedPanelIconProps } from "./panel-motion.js"

export type SidebarToggleIconProps = AnimatedPanelIconProps & {
  side?: "left" | "right"
}

function toReactShape([tag, attrs]: IconElement): IconElement {
  return [
    tag,
    Object.fromEntries(
      Object.entries(attrs).map(([name, value]) => [
        name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase()),
        value,
      ])
    ),
  ]
}

export function SidebarToggleIcon({
  open,
  side = "left",
  variant = "outline",
  loop,
  ref,
  onMouseEnter,
  onMouseLeave,
  ...props
}: SidebarToggleIconProps) {
  const { progress, svg, startPreview, finishPreview } = usePanelMotion(
    open,
    loop,
    ref
  )
  const { node, ...drawing } = getSidebarToggleDrawing(variant, progress)
  return renderIcon(
    { ...drawing, node: node.map(toReactShape), strokeWidth: UI_STROKE_WIDTH },
    {
      ...props,
      ref: svg,
      onMouseEnter(event) {
        if (!ref) startPreview()
        onMouseEnter?.(event)
      },
      onMouseLeave(event) {
        if (!ref) finishPreview()
        onMouseLeave?.(event)
      },
    },
    {
      wrapArtwork: (artwork) => (
        <g
          transform={
            side === "right" ? "translate(24 0) scale(-1 1)" : undefined
          }
        >
          {artwork}
        </g>
      ),
    }
  )
}
