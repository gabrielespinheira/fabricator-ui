"use client"

import * as React from "react"
import { cn } from "cn"

type Density = "compact" | "default" | "spacious"

const DensityContext = React.createContext<Density | undefined>(undefined)

/**
 * Sets the density for everything inside it. It renders a `display: contents`
 * wrapper with `data-density`, so the components inside resize through CSS,
 * and passes the density through React context, which reaches the menus,
 * popovers, tooltips, dialogs and sheets they open in portals. Pass a
 * className to make the wrapper a real box.
 */
function DensityProvider({
  density,
  className,
  ...props
}: React.ComponentProps<"div"> & { density: Density }) {
  return (
    <DensityContext value={density}>
      <div
        data-slot="density-provider"
        data-density={density}
        className={cn("contents", className)}
        {...props}
      />
    </DensityContext>
  )
}

/** The nearest DensityProvider's density; undefined outside one. */
function useDensity() {
  return React.use(DensityContext)
}

export { DensityProvider, useDensity, type Density }
