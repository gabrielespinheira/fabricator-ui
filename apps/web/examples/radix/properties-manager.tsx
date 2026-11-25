"use client"

import * as React from "react"

import {
  PropertyManager,
  type PropertyDefinition,
} from "@/styles/radix-fabricator/ui/properties"

const initialProperties: PropertyDefinition[] = [
  { id: "title", name: "Name", type: "title", isSystem: true },
  {
    id: "priority",
    name: "Priority",
    type: "select",
    options: [
      { value: "high", label: "High", color: "red" },
      { value: "medium", label: "Medium", color: "yellow" },
      { value: "low", label: "Low", color: "blue" },
    ],
  },
  { id: "due", name: "Due date", type: "date" },
  { id: "estimate", name: "Estimate", type: "text" },
]

const estimates = [
  { recordId: "one", value: "3" },
  { recordId: "two", value: "5" },
  { recordId: "three", value: "a lot" },
]

export function PropertiesManager() {
  const [properties, setProperties] = React.useState(initialProperties)
  const [visibleIds, setVisibleIds] = React.useState(["priority", "due"])

  return (
    <PropertyManager
      className="w-full max-w-sm"
      properties={properties}
      onPropertiesChange={setProperties}
      visibleIds={visibleIds}
      onVisibleIdsChange={setVisibleIds}
      conversion={{
        getValues: (id) => (id === "estimate" ? estimates : []),
        onConvert: ({ property }) =>
          setProperties((list) =>
            list.map((entry) => (entry.id === property.id ? property : entry))
          ),
      }}
    />
  )
}
