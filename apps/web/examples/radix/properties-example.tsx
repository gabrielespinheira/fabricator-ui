"use client"

import * as React from "react"

import {
  PropertyAdd,
  PropertyList,
  type PropertyDefinition,
} from "@/styles/radix-fabricator/ui/properties"

const initialProperties: PropertyDefinition[] = [
  {
    id: "stage",
    name: "Stage",
    type: "status",
    options: [
      { value: "lead", label: "Lead", group: "todo", color: "gray" },
      { value: "trial", label: "On trial", group: "inProgress", color: "blue" },
      { value: "won", label: "Customer", group: "complete", color: "green" },
    ],
  },
  {
    id: "owner",
    name: "Owner",
    type: "person",
    options: [
      { value: "maya", label: "Maya Chen" },
      { value: "daniel", label: "Daniel Okafor" },
      { value: "nora", label: "Nora Ahmed" },
    ],
  },
  {
    id: "interests",
    name: "Interests",
    type: "multi-select",
    options: [
      { value: "api", label: "API", color: "teal" },
      { value: "security", label: "Security", color: "red" },
      { value: "mobile", label: "Mobile", color: "purple" },
    ],
  },
  { id: "renewal", name: "Renewal", type: "date" },
  { id: "seats", name: "Seats", type: "number", settings: { unit: "people" } },
  { id: "fit", name: "Fit", type: "rating" },
  { id: "website", name: "Website", type: "url" },
  { id: "isPartner", name: "Partner", type: "checkbox" },
  { id: "notes", name: "Notes", type: "text" },
]

export function PropertiesExample() {
  const [properties, setProperties] = React.useState(initialProperties)
  const [values, setValues] = React.useState<Record<string, unknown>>({
    stage: "trial",
    owner: "maya",
    interests: ["api", "security"],
    renewal: "2027-03-31",
    seats: 48,
    fit: 4,
    website: "https://acme.com",
    isPartner: true,
  })

  function createOption(property: PropertyDefinition, label: string) {
    const value = label.toLowerCase()
    setProperties((list) =>
      list.map((entry) =>
        entry.id === property.id
          ? {
              ...entry,
              options: [
                ...(entry.options ?? []),
                { value, label, color: "cyan" },
              ],
            }
          : entry
      )
    )
    return value
  }

  return (
    <div className="flex w-full max-w-md flex-col">
      <PropertyList
        properties={properties}
        onPropertiesChange={setProperties}
        getValue={(id) => values[id]}
        onValueChange={(id, value) =>
          setValues((previous) => ({ ...previous, [id]: value }))
        }
        onOptionCreate={createOption}
      />
      <PropertyAdd
        onPropertyAdd={(property) =>
          setProperties((list) => [...list, property])
        }
      />
    </div>
  )
}
