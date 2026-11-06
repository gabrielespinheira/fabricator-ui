import { describe, expect, it } from "vitest"

import {
  getSelectLabel,
  getSelectPresentation,
  isSelectValueEmpty,
  isValueSelected,
  toggleSelectValue,
} from "@/registry/native/lib/select-model"

describe("getSelectPresentation", () => {
  it("opens as a sheet on phones", () => {
    expect(getSelectPresentation(390)).toBe("sheet")
    expect(getSelectPresentation(639)).toBe("sheet")
  })

  it("opens as a popover from the sm breakpoint up", () => {
    expect(getSelectPresentation(640)).toBe("popover")
    expect(getSelectPresentation(1024)).toBe("popover")
  })
})

describe("toggleSelectValue", () => {
  it("replaces the value of a single select", () => {
    expect(toggleSelectValue("apple", "banana", false)).toBe("banana")
    expect(toggleSelectValue("apple", "apple", false)).toBe("apple")
  })

  it("adds and removes from a multiple select", () => {
    expect(toggleSelectValue(["apple"], "banana", true)).toEqual([
      "apple",
      "banana",
    ])
    expect(toggleSelectValue(["apple", "banana"], "apple", true)).toEqual([
      "banana",
    ])
  })

  it("starts a multiple select from nothing", () => {
    expect(toggleSelectValue(null, "apple", true)).toEqual(["apple"])
    expect(toggleSelectValue(undefined, "apple", true)).toEqual(["apple"])
  })
})

describe("isValueSelected", () => {
  it("compares a single value", () => {
    expect(isValueSelected("apple", "apple", false)).toBe(true)
    expect(isValueSelected("apple", "pear", false)).toBe(false)
    expect(isValueSelected(null, "apple", false)).toBe(false)
  })

  it("looks inside a multiple value", () => {
    expect(isValueSelected(["apple"], "apple", true)).toBe(true)
    expect(isValueSelected(["apple"], "pear", true)).toBe(false)
    expect(isValueSelected(null, "pear", true)).toBe(false)
  })
})

describe("isSelectValueEmpty", () => {
  it("treats no value and an empty list as empty", () => {
    expect(isSelectValueEmpty(null)).toBe(true)
    expect(isSelectValueEmpty(undefined)).toBe(true)
    expect(isSelectValueEmpty([])).toBe(true)
    expect(isSelectValueEmpty("apple")).toBe(false)
    expect(isSelectValueEmpty(["apple"])).toBe(false)
    expect(isSelectValueEmpty("")).toBe(false)
  })
})

describe("getSelectLabel", () => {
  const list = [
    { label: "Select a fruit", value: null },
    { label: "Apple", value: "apple" },
    { label: "Banana", value: "banana" },
  ]

  it("finds a label in a list of items", () => {
    expect(getSelectLabel(list, "banana")).toBe("Banana")
  })

  it("uses a null item as the placeholder", () => {
    expect(getSelectLabel(list, null)).toBe("Select a fruit")
    expect(getSelectLabel(list, undefined)).toBe("Select a fruit")
  })

  it("finds a label in a record", () => {
    const record = { sans: "Sans-serif", serif: "Serif" }
    expect(getSelectLabel(record, "serif")).toBe("Serif")
  })

  it("finds a label inside groups", () => {
    const groups = [
      { value: "Fruits", items: [{ label: "Apple", value: "apple" }] },
      { value: "Greens", items: [{ label: "Kale", value: "kale" }] },
    ]
    expect(getSelectLabel(groups, "kale")).toBe("Kale")
  })

  it("joins the labels of a multiple value", () => {
    expect(getSelectLabel(list, ["apple", "banana"])).toBe("Apple, Banana")
  })

  it("has no label for what it doesn't know", () => {
    expect(getSelectLabel(list, "kiwi")).toBeUndefined()
    expect(getSelectLabel(undefined, "kiwi")).toBeUndefined()
  })
})
