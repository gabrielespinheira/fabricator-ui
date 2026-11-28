"use client"

import { useId } from "react"

import type { IconData, IconWeight } from "./generated/runtime/types.js"
import { renderIcon } from "./icon.js"
import { usePanelMotion, type AnimatedPanelIconProps } from "./panel-motion.js"

export function AnimatedPanelArtwork({
  data,
  side,
  open,
  loop,
  ref,
  onMouseEnter,
  onMouseLeave,
  ...props
}: Omit<AnimatedPanelIconProps, "variant"> & {
  data: IconData
  side: "left" | "right"
}) {
  const { progress, svg, startPreview, finishPreview } = usePanelMotion(
    open,
    loop,
    ref
  )
  const maskId = useId()
  const distance = (side === "left" ? 3.6 : -3.6) * progress

  return renderIcon(
    data,
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
      maskId,
      wrapShape(shape, layer, index) {
        const isDivider =
          (layer === "primary" && index === 1) ||
          (layer === "cutout" && index === 0)
        if (!isDivider) return shape
        return (
          <g
            key={shape.key}
            transform={distance ? `translate(${distance} 0)` : undefined}
          >
            {shape}
          </g>
        )
      },
    }
  )
}

export function createAnimatedPanelIcon(
  drawings: Record<IconWeight, IconData>,
  side: "left" | "right"
) {
  return function AnimatedPanelIcon({
    variant = "outline",
    ...props
  }: AnimatedPanelIconProps) {
    return (
      <AnimatedPanelArtwork data={drawings[variant]} side={side} {...props} />
    )
  }
}
