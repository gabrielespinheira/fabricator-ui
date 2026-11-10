import { describe, expect, it } from "vitest"

import { getIconImport, getIconPage, getIconSets } from "./icon-explorer"

describe("cross-platform icon explorer", () => {
  it("offers native families without advertising web-only animations", () => {
    expect(getIconSets("native")).toEqual(["outline", "brands", "files"])
    expect(getIconSets("web")).toContain("animated")
  })
  it("uses the platform's package and the same component name", () => {
    expect(
      getIconImport({ name: "arrow-right", set: "outline" }, "native")
    ).toBe('import { ArrowRightIcon } from "@fabricator-ui/icons-react-native"')
    expect(
      getIconImport({ name: "file-typescript", set: "files" }, "native")
    ).toContain("@fabricator-ui/icons-react-native/files")
  })
  it("clamps a page after filtering and never drops results", () => {
    expect(getIconPage([1, 2, 3, 4, 5], 9, 2)).toEqual({
      items: [5],
      page: 2,
      pages: 3,
    })
    expect(getIconPage([], 0, 48)).toEqual({ items: [], page: 0, pages: 0 })
  })
})
