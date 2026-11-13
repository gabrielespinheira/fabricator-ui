import { describe, expect, it } from "vitest"

import { isFabricatorExcludedDemo } from "@/registry/fabricator/registry"

describe("isFabricatorExcludedDemo", () => {
  it("drops the demos of an excluded item", () => {
    expect(isFabricatorExcludedDemo("native-select-demo.tsx")).toBe(true)
    expect(isFabricatorExcludedDemo("chart-tooltip.tsx")).toBe(true)
  })

  it("keeps demos of other items", () => {
    expect(isFabricatorExcludedDemo("select-demo.tsx")).toBe(false)
    expect(isFabricatorExcludedDemo("button-demo.tsx")).toBe(false)
  })

  it("keeps the demos of an item whose name starts with an excluded one", () => {
    // `preview` is an excluded showcase block; Preview Rail is not.
    expect(isFabricatorExcludedDemo("preview-rail-demo.tsx")).toBe(false)
    expect(isFabricatorExcludedDemo("preview-rail-chapters.tsx")).toBe(false)
  })
})
