import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import {
  definePropertyType,
  PropertyAdd,
  PropertyList,
  PropertyManager,
  PropertyTypesProvider,
  type PropertyDefinition,
} from "@/registry/native/ui/properties"

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

function PropertiesExample() {
  const [properties, setProperties] = React.useState(initialProperties)
  const [visibleIds, setVisibleIds] = React.useState(["stage", "owner"])
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
  return (
    <ExampleWrapper>
      <Example title="Account">
        <PropertyList
          properties={properties}
          onPropertiesChange={setProperties}
          getValue={(id) => values[id]}
          onValueChange={(id, value) =>
            setValues((previous) => ({ ...previous, [id]: value }))
          }
        />
        <PropertyAdd
          onPropertyAdd={(property) =>
            setProperties((list) => [...list, property])
          }
        />
      </Example>
      <Example title="Types">
        <TypesExample />
      </Example>
      <Example title="Read only">
        <PropertyList properties={properties} getValue={(id) => values[id]} />
      </Example>
      <Example title="Manager">
        <PropertyManager
          properties={properties}
          onPropertiesChange={setProperties}
          visibleIds={visibleIds}
          onVisibleIdsChange={setVisibleIds}
          conversion={{
            getValues: (id) => [{ recordId: "acme", value: values[id] }],
            onConvert: ({ property }) =>
              setProperties((list) =>
                list.map((entry) =>
                  entry.id === property.id ? property : entry
                )
              ),
          }}
        />
      </Example>
    </ExampleWrapper>
  )
}

export { PropertiesExample }

const steps = [1, 2, 3, 5, 8, 13]

const storyPoints = definePropertyType({
  type: "story-points",
  name: "Story points",
  description: "1 to 13",
  filterAs: "number",
  placement: "meta",
  format: (value) => (typeof value === "number" ? `${value} points` : ""),
  renderEditor: ({ value, onValueChange }) => (
    <View className="flex-row flex-wrap items-center">
      {steps.map((step) => (
        <Button
          key={step}
          size="icon-sm"
          variant={value === step ? "secondary" : "ghost"}
          accessibilityState={{ selected: value === step }}
          onPress={() => onValueChange(value === step ? null : step)}
        >
          {step}
        </Button>
      ))}
    </View>
  ),
})

// Outside the component, so it is the same list on every render.
const types = [storyPoints]

const typedProperties: PropertyDefinition[] = [
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
  { id: "contact", name: "Contact", type: "email", required: true },
  { id: "files", name: "Files", type: "files" },
]

function TypesExample() {
  const [properties, setProperties] = React.useState(typedProperties)
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
        id: "floor",
        name: "Shop floor.jpg",
        type: "image/jpeg",
        url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&auto=format&fit=crop&q=70",
      },
    ],
  })
  return (
    <PropertyTypesProvider types={types}>
      <PropertyList
        properties={properties}
        onPropertiesChange={setProperties}
        getValue={(id) => values[id]}
        onValueChange={(id, value) =>
          setValues((previous) => ({ ...previous, [id]: value }))
        }
      />
    </PropertyTypesProvider>
  )
}
