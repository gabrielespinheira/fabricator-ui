"use client"

import { cn } from "cn"
import {
  Popover as PopoverPrimitive,
  PreviewTrigger as PreviewTriggerPrimitive,
  type PopoverProps as PopoverPrimitiveProps,
  type PreviewTriggerProps,
} from "react-aria-components"

import { useDensity } from "@/registry/bases/aria/ui/density"

// Fabricator override of the upstream hover card: the content takes the density
// of the nearest DensityProvider, which its portal would otherwise lose
// (registry/fabricator/density.ts).

function HoverCardTrigger({ children, ...props }: PreviewTriggerProps) {
  return (
    <PreviewTriggerPrimitive data-slot="hover-card-trigger" {...props}>
      {children}
    </PreviewTriggerPrimitive>
  )
}

function HoverCard({
  className,
  placement = "bottom",
  offset = 4,
  crossOffset = 0,
  ...props
}: Omit<PopoverPrimitiveProps, "className"> & {
  className?: string
}) {
  const density = useDensity()

  return (
    <PopoverPrimitive
      data-slot="hover-card-content"
      data-density={density}
      placement={placement}
      offset={offset}
      crossOffset={crossOffset}
      className={cn(
        "cn-hover-card-content-aria z-50 origin-(--trigger-anchor-point) outline-hidden",
        className
      )}
      {...props}
    />
  )
}

export { HoverCard, HoverCardTrigger }
