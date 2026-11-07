"use client"

import * as React from "react"
import { cn } from "cn"
import { HoverCard as HoverCardPrimitive } from "radix-ui"

import { useDensity } from "@/registry/radix-fabricator/ui/density"

// Fabricator override of the upstream hover card: the content takes the density
// of the nearest DensityProvider, which its portal would otherwise lose
// (registry/fabricator/density.ts).

function HoverCard({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Root>) {
  return <HoverCardPrimitive.Root data-slot="hover-card" {...props} />
}

function HoverCardTrigger({
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Trigger>) {
  return (
    <HoverCardPrimitive.Trigger data-slot="hover-card-trigger" {...props} />
  )
}

function HoverCardContent({
  className,
  align = "center",
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof HoverCardPrimitive.Content>) {
  const density = useDensity()

  return (
    <HoverCardPrimitive.Portal data-slot="hover-card-portal">
      <HoverCardPrimitive.Content
        data-slot="hover-card-content"
        data-density={density}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 w-64 origin-(--radix-hover-card-content-transform-origin) rounded-xl bg-surface-3 p-(--density-12) text-(length:--density-text-13) text-popover-foreground shadow-surface-3 outline-hidden motion-popup data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
          className
        )}
        {...props}
      />
    </HoverCardPrimitive.Portal>
  )
}

export { HoverCard, HoverCardTrigger, HoverCardContent }
