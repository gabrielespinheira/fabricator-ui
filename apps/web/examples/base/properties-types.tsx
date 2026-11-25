"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import {
  definePropertyType,
  PropertyAdd,
  PropertyList,
  PropertyTypesProvider,
  type PropertyDefinition,
  type PropertyFile,
} from "@/styles/base-fabricator/ui/properties"

const steps = [1, 2, 3, 5, 8, 13]

const storyPoints = definePropertyType({
  type: "story-points",
  name: "Story points",
  description: "1 to 13",
  filterAs: "number",
  placement: "meta",
  settings: [
    {
      id: "isShort",
      label: "Short label",
      kind: "switch",
      defaultValue: false,
    },
  ],
  format: (value, property) =>
    typeof value === "number"
      ? `${value} ${property.settings?.isShort ? "pt" : "points"}`
      : "",
  validate: (value) =>
    typeof value === "number" && !steps.includes(value)
      ? "Pick a number from the scale."
      : null,
  renderEditor: ({ property, value, onValueChange }) => (
    <div
      role="group"
      aria-label={property.name}
      className="flex flex-wrap items-center gap-px ps-1"
    >
      {steps.map((step) => (
        <Button
          key={step}
          size="icon-sm"
          variant={value === step ? "secondary" : "ghost"}
          aria-pressed={value === step}
          onClick={() => onValueChange(value === step ? null : step)}
        >
          {step}
        </Button>
      ))}
    </div>
  ),
})

// Outside the component, so it is the same list on every render.
const types = [storyPoints]

const initialProperties: PropertyDefinition[] = [
  { id: "points", name: "Points", type: "story-points" },
  {
    id: "dates",
    name: "Dates",
    type: "date",
    settings: { hasRange: true, isDue: false },
  },
  {
    id: "budget",
    name: "Budget",
    type: "number",
    description: "Approved for the quarter.",
    settings: { numberFormat: "currency", minimum: 0, maximum: 20_000 },
  },
  {
    id: "spent",
    name: "Spent",
    type: "number",
    settings: { numberFormat: "percent", display: "bar" },
  },
  { id: "effort", name: "Effort", type: "duration" },
  { id: "color", name: "Color", type: "color" },
  { id: "venue", name: "Venue", type: "location", visibility: "hide-empty" },
  { id: "contact", name: "Contact", type: "email", required: true },
  { id: "files", name: "Files", type: "files" },
]

/** A real app uploads here and returns the stored address. */
async function storeFiles(files: File[]): Promise<PropertyFile[]> {
  await new Promise((resolve) => setTimeout(resolve, 900))
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
  }))
}

export function PropertiesTypes() {
  const [properties, setProperties] = React.useState(initialProperties)
  const [values, setValues] = React.useState<Record<string, unknown>>({
    points: 5,
    dates: { start: "2026-12-01", end: "2026-12-11" },
    budget: 12_000,
    spent: 64,
    effort: 150,
    color: "#3e63dd",
    contact: "maya@example.com",
    files: [
      {
        id: "cover",
        name: "Shop floor.jpg",
        type: "image/jpeg",
        url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&auto=format&fit=crop&q=80",
      },
      {
        id: "brief",
        name: "Brief.pdf",
        size: 482_000,
        url: "/files/brief.pdf",
      },
    ],
  })

  return (
    <PropertyTypesProvider types={types}>
      <div className="flex w-full max-w-md flex-col">
        <PropertyList
          properties={properties}
          onPropertiesChange={setProperties}
          getValue={(id) => values[id]}
          onValueChange={(id, value) =>
            setValues((previous) => ({ ...previous, [id]: value }))
          }
          onFilesAdd={(_, files) => storeFiles(files)}
        />
        <PropertyAdd
          onPropertyAdd={(property) =>
            setProperties((list) => [...list, property])
          }
        />
      </div>
    </PropertyTypesProvider>
  )
}
