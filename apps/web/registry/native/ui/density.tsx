import * as React from "react"
import { ScopedVariables } from "uniwind"

import { DENSITIES, type DensityName } from "@/registry/fabricator/density"
import { getDensityVariables } from "@/registry/fabricator/density-variables"

type Density = DensityName

const DensityContext = React.createContext<Density | undefined>(undefined)

/** A density's tokens for everything inside it, without changing the context. */
function DensityScope({
  density,
  children,
}: {
  density?: Density
  children?: React.ReactNode
}) {
  const variables = React.useMemo(
    () => (density ? getDensityVariables(DENSITIES[density]) : undefined),
    [density]
  )
  if (!variables) return children
  return <ScopedVariables variables={variables}>{children}</ScopedVariables>
}

/**
 * Sets the density for everything inside it, including the menus, popovers and
 * sheets it opens: those leave the React tree, so they read `useDensity()` and
 * set their own scope.
 */
function DensityProvider({
  density,
  children,
}: {
  density: Density
  children?: React.ReactNode
}) {
  return (
    <DensityContext value={density}>
      <DensityScope density={density}>{children}</DensityScope>
    </DensityContext>
  )
}

/** The nearest DensityProvider's density; undefined outside one. */
function useDensity() {
  return React.use(DensityContext)
}

export { DensityProvider, DensityScope, useDensity, type Density }
