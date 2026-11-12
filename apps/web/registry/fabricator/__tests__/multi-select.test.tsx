import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import * as AriaMultiSelect from "@/registry/fabricator/aria/ui/multi-select"
import * as BaseMultiSelect from "@/registry/fabricator/base/ui/multi-select"
import * as RadixMultiSelect from "@/registry/fabricator/radix/ui/multi-select"

// The site's icon placeholder reads its settings from the URL (nuqs); the CLI
// replaces it with the project's icon library at install time.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg data-icon-placeholder="" />,
}))

const design = { value: "design", label: "Design" }
const engineering = { value: "engineering", label: "Engineering" }
const teams = [design, engineering, { value: "product", label: "Product" }]

const EXPORTS = [
  "MultiSelect",
  "MultiSelectTrigger",
  "MultiSelectValue",
  "MultiSelectInput",
  "MultiSelectContent",
  "MultiSelectList",
  "MultiSelectItem",
  "MultiSelectGroup",
  "MultiSelectLabel",
  "MultiSelectCollection",
  "MultiSelectEmpty",
  "MultiSelectSeparator",
]

function renderWebField(
  parts: typeof BaseMultiSelect,
  props: { defaultValue?: typeof teams; disabled?: boolean }
) {
  const {
    MultiSelect,
    MultiSelectTrigger,
    MultiSelectValue,
    MultiSelectInput,
  } = parts
  return renderToStaticMarkup(
    <MultiSelect items={teams} {...props}>
      <MultiSelectTrigger>
        <MultiSelectValue />
        <MultiSelectInput aria-label="Teams" placeholder="Choose teams" />
      </MultiSelectTrigger>
    </MultiSelect>
  )
}

function renderAriaField(props: {
  defaultValue?: string[]
  isDisabled?: boolean
}) {
  const {
    MultiSelect,
    MultiSelectTrigger,
    MultiSelectValue,
    MultiSelectInput,
    MultiSelectContent,
    MultiSelectList,
    MultiSelectItem,
  } = AriaMultiSelect
  return renderToStaticMarkup(
    <MultiSelect aria-label="Teams" {...props}>
      <MultiSelectTrigger>
        <MultiSelectValue />
        <MultiSelectInput placeholder="Choose teams" />
      </MultiSelectTrigger>
      <MultiSelectContent>
        <MultiSelectList items={teams}>
          {(team) => (
            <MultiSelectItem id={team.value} value={team}>
              {team.label}
            </MultiSelectItem>
          )}
        </MultiSelectList>
      </MultiSelectContent>
    </MultiSelect>
  )
}

const FIELDS = [
  [
    "base",
    (value?: typeof teams) =>
      renderWebField(BaseMultiSelect, { defaultValue: value }),
  ],
  [
    "radix",
    (value?: typeof teams) =>
      renderWebField(RadixMultiSelect, { defaultValue: value }),
  ],
  [
    "aria",
    (value?: typeof teams) =>
      renderAriaField({ defaultValue: value?.map((team) => team.value) }),
  ],
] as const

const getChips = (html: string) =>
  html.match(/data-slot="multi-select-chip"/g) ?? []

describe.each([
  ["base", BaseMultiSelect],
  ["radix", RadixMultiSelect],
  ["aria", AriaMultiSelect],
] as const)("%s multi select exports", (_, parts) => {
  it("has every part", () => {
    for (const name of EXPORTS) expect(parts).toHaveProperty(name)
  })
})

describe.each(FIELDS)("%s multi select", (_, render) => {
  it("draws a chip with a remove button for each selected option", () => {
    const html = render([design, engineering])

    expect(getChips(html)).toHaveLength(2)
    expect(html).toContain(">Design<")
    expect(html).toContain(">Engineering<")
    expect(html).toContain('aria-label="Remove Design"')
    expect(html).toContain('data-slot="multi-select-chip-remove"')
  })

  it("is a field with a combobox input and a chevron", () => {
    const html = render()

    expect(html).toContain('data-slot="multi-select-trigger"')
    expect(html).toContain('data-slot="multi-select-input"')
    expect(html).toMatch(/<input[^>]*role="combobox"/)
    expect(html).toContain('data-slot="multi-select-icon"')
  })

  it("shows the placeholder only while nothing is selected", () => {
    expect(render()).toContain('placeholder="Choose teams"')
    expect(render([design])).not.toContain('placeholder="Choose teams"')
  })

  it("draws no chips while nothing is selected", () => {
    expect(getChips(render())).toHaveLength(0)
  })
})
