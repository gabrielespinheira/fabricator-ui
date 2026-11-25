import { describe, expect, it } from "vitest"

import {
  createPropertyTypes,
  definePropertyType,
  formatSetting,
  getCreatableTypes,
  getPropertySettings,
  getPropertySwatches,
  getPropertyType,
  getPropertyTypeName,
  groupPropertyTypes,
  readNumberSetting,
  readSetting,
  readSwitchSetting,
  resolveProperty,
  writeSetting,
  type PropertyDefinition,
} from "./property-types"

const budget: PropertyDefinition = {
  id: "budget",
  name: "Budget",
  type: "number",
}

const fieldOf = (property: PropertyDefinition, id: string) => {
  const field = getPropertyType(property.type).settings?.find(
    (entry) => entry.id === id
  )
  if (!field) throw new Error(`No setting ${id}`)
  return field
}

describe("property settings", () => {
  it("reads a type's default until one is set", () => {
    expect(readSetting(budget, "numberFormat")).toBe("comma")
    expect(
      readSetting(
        { ...budget, settings: { numberFormat: "percent" } },
        "numberFormat"
      )
    ).toBe("percent")
    expect(readNumberSetting({ ...budget, type: "rating" }, "steps")).toBe(5)
    expect(
      readSwitchSetting({ ...budget, type: "relation" }, "isMultiple")
    ).toBe(true)
    expect(readSetting(budget, "nothing")).toBeUndefined()
  })

  it("keeps only what differs from the default", () => {
    const format = fieldOf(budget, "numberFormat")
    const changed = writeSetting(budget, format, "currency")
    expect(changed.settings).toEqual({ numberFormat: "currency" })
    expect(writeSetting(changed, format, "comma").settings).toBeUndefined()
    expect(
      writeSetting(
        { ...budget, settings: { unit: "h" } },
        fieldOf(budget, "unit"),
        ""
      ).settings
    ).toBeUndefined()
  })

  it("leaves out settings that have no effect", () => {
    const ids = (property: PropertyDefinition) =>
      getPropertySettings(property).map(({ id }) => id)
    expect(ids(budget)).not.toContain("currency")
    const money = { ...budget, settings: { numberFormat: "currency" } }
    expect(ids(money)).toContain("currency")
    expect(ids(money)).not.toContain("unit")
    expect(ids({ ...budget, type: "date" })).not.toContain("hourCycle")
  })

  it("offers default colors, or the property's own", () => {
    const color: PropertyDefinition = { id: "c", name: "C", type: "color" }
    expect(getPropertySwatches(color)).toContainEqual({
      color: "#e5484d",
      label: "Red",
    })
    expect(
      getPropertySwatches({
        ...color,
        options: [
          { value: "#123456", label: "Brand" },
          { value: "#654321", label: "Old", isArchived: true },
        ],
      })
    ).toEqual([{ color: "#123456", label: "Brand" }])
  })

  it("says what a setting is", () => {
    expect(formatSetting(fieldOf(budget, "numberFormat"), "comma")).toBe(
      "Number"
    )
    expect(formatSetting(fieldOf(budget, "maximum"), undefined)).toBe("Any")
    expect(formatSetting(fieldOf(budget, "maximum"), 40)).toBe("40")
  })
})

describe("property types", () => {
  const point = definePropertyType({
    type: "story-points",
    name: "Story points",
    filterAs: "number",
    settings: [
      {
        id: "scale",
        label: "Scale",
        kind: "choice",
        choices: [],
        defaultValue: "fibonacci",
      },
    ],
  })

  it("adds an app's types after the built-in ones", () => {
    const types = createPropertyTypes([point])
    expect(getPropertyTypeName("story-points", types)).toBe("Story points")
    expect(getCreatableTypes(types).at(-1)).toBe(point)
    expect(
      readSetting({ ...budget, type: "story-points" }, "scale", types)
    ).toBe("fibonacci")
    expect(groupPropertyTypes(getCreatableTypes(types)).at(-1)).toMatchObject({
      name: "Custom",
      items: [point],
    })
  })

  it("lets an app replace part of a built-in type", () => {
    const types = createPropertyTypes([{ type: "select", name: "Choice" }])
    expect(types.get("select")).toMatchObject({
      name: "Choice",
      hasOptions: true,
    })
  })

  it("offers only the types people can fill in", () => {
    const offered = getCreatableTypes().map(({ type }) => type)
    expect(offered).toContain("files")
    for (const type of ["title", "key", "formula", "created-time"])
      expect(offered).not.toContain(type)
  })

  it("reads an unknown type as its own name", () => {
    expect(getPropertyType("mystery")).toEqual({
      type: "mystery",
      name: "mystery",
    })
  })

  it("reads a formula as the type of its result", () => {
    expect(
      resolveProperty({
        ...budget,
        type: "formula",
        settings: { result: "date" },
      })
    ).toMatchObject({ type: "date", isReadOnly: true })
    expect(resolveProperty({ ...budget, type: "formula" }).type).toBe("text")
  })
})
