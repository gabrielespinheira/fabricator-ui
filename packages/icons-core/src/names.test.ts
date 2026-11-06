import { describe, expect, it } from "vitest"

import { getExportNames, isKebabCase, toPascalCase } from "./names"

describe("toPascalCase", () => {
  it("joins kebab-case words the way lucide-react names its exports", () => {
    expect(toPascalCase("house")).toBe("House")
    expect(toPascalCase("a-arrow-down")).toBe("AArrowDown")
    expect(toPascalCase("arrow-up-0-1")).toBe("ArrowUp01")
    expect(toPascalCase("google-analytics")).toBe("GoogleAnalytics")
  })
})

describe("getExportNames", () => {
  it("exports the suffixed form first and the bare form second", () => {
    expect(getExportNames("badge-check")).toEqual([
      "BadgeCheckIcon",
      "BadgeCheck",
    ])
  })
})

describe("isKebabCase", () => {
  it("accepts lowercase words and digits joined by single hyphens", () => {
    expect(isKebabCase("arrow-up-0-1")).toBe(true)
    expect(isKebabCase("x")).toBe(true)
  })

  it("rejects other casing and separators", () => {
    expect(isKebabCase("ArrowUp")).toBe(false)
    expect(isKebabCase("arrow_up")).toBe(false)
    expect(isKebabCase("arrow--up")).toBe(false)
    expect(isKebabCase("-arrow")).toBe(false)
  })
})
