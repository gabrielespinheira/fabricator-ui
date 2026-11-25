"use client"

// The property types a tree knows: the built-in ones, and an app's own inside
// its provider. Every part of Properties and Kanban reads them from here.
import * as React from "react"

import {
  builtinPropertyTypes,
  createPropertyTypes,
  type PropertyTypeDefinition,
} from "@/registry/bases/__base__/lib/property-types"

const PropertyTypesContext = React.createContext(builtinPropertyTypes)

/** Adds an app's property types, or replaces part of a built-in one. */
function PropertyTypesProvider({
  types,
  children,
}: {
  /** Defined outside the component, so it is the same list every time. */
  types: readonly PropertyTypeDefinition[]
  children: React.ReactNode
}) {
  const value = React.useMemo(() => createPropertyTypes(types), [types])
  return React.createElement(PropertyTypesContext, { value }, children)
}

function usePropertyTypes() {
  return React.use(PropertyTypesContext)
}

export { PropertyTypesProvider, usePropertyTypes }
