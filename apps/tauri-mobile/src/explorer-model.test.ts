import { describe, expect, it } from "vitest"

import {
  filterCatalog,
  getKeyboardInset,
  parseExplorerRoute,
  writeExplorerRoute,
} from "./explorer-model"

describe("explorer routing", () => {
  it("keeps component scenarios in restorable hash routes", () => {
    const route = {
      page: "component",
      name: "button",
      scenario: "button-disabled",
    } as const
    expect(parseExplorerRoute(writeExplorerRoute(route))).toEqual(route)
  })

  it("rejects unknown or nested paths instead of opening arbitrary routes", () => {
    expect(parseExplorerRoute("#/components/../../settings")).toEqual({
      page: "overview",
    })
    expect(parseExplorerRoute("#/blocks/login-01")).toEqual({
      page: "block",
      name: "login-01",
    })
    expect(parseExplorerRoute("#/settings")).toEqual({ page: "settings" })
  })
})

describe("catalog filtering", () => {
  const items = [
    {
      name: "input-otp",
      title: "Input OTP",
      group: "Forms",
      type: "registry:ui",
    },
    { name: "button", title: "Button", group: "Basics", type: "registry:ui" },
  ]

  it("matches titles, stable slugs and groups without changing the catalog", () => {
    expect(filterCatalog(items, " OTP ").map((item) => item.name)).toEqual([
      "input-otp",
    ])
    expect(filterCatalog(items, "basics").map((item) => item.name)).toEqual([
      "button",
    ])
    expect(items[0]?.name).toBe("input-otp")
  })
})

describe("visual viewport keyboard insets", () => {
  it("does not double count the viewport offset or invent a negative inset", () => {
    expect(getKeyboardInset(844, 520, 24)).toBe(300)
    expect(getKeyboardInset(844, 844, 0)).toBe(0)
    expect(getKeyboardInset(500, 550, 0)).toBe(0)
  })
})
