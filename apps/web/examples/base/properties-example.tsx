"use client"

import { useState } from "react"

import {
  PropertyList,
  type PropertyDefinition,
} from "@/styles/base-fabricator/ui/properties"

const issueProperties: PropertyDefinition[] = [
  { id: "team", name: "Team", type: "text" },
  { id: "estimate", name: "Estimate", type: "number" },
]

export function PropertiesExample() {
  const [values, setValues] = useState<Record<string, unknown>>({
    team: "Engineering",
    estimate: 3,
  })
  return (
    <PropertyList
      properties={issueProperties}
      getValue={(id) => values[id]}
      onValueChange={(id, value) =>
        setValues((previous) => ({ ...previous, [id]: value }))
      }
    />
  )
}
