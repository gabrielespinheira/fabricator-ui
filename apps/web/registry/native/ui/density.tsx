import * as React from "react"
import { ScopedVariables, useCSSVariable } from "uniwind"

import { getDensityVariables } from "@/registry/fabricator/density-variables"
import {
  getDensityName,
  getDensityTokens,
  getSizeDensity,
  getXsSize,
  type SizeDensity,
} from "@/registry/native/lib/density-scale"
import { parseNumber } from "@/registry/native/lib/motion-tokens"

type Density = SizeDensity

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
    () =>
      density ? getDensityVariables(getDensityTokens(density)) : undefined,
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

/**
 * What a control's `size` makes of the density around it: the density to pin it to,
 * if any, and the height of a control there. Call it outside the control's own scope.
 */
function useControlSize(size?: string | null) {
  const around = getDensityName(parseNumber(useCSSVariable("--density-36"), 36))
  const density = getSizeDensity(size, around)
  return {
    density,
    height: getDensityTokens(density ?? around).space[36],
    xs: getXsSize(around),
  }
}

export {
  DensityProvider,
  DensityScope,
  useControlSize,
  useDensity,
  type Density,
}
