import { describe, expect, it } from "vitest"

import {
  filterCatalog,
  getKeyboardInset,
  isFullPageSource,
  parseExplorerRoute,
  parsePreview,
  resolveExplorerRoute,
  writeExplorerRoute,
  writePreview,
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

describe("host pages", () => {
  it("opens the native services page only in a host that has one", () => {
    const route = parseExplorerRoute("#/services")
    expect(resolveExplorerRoute(route, { hasServices: true })).toEqual({
      page: "services",
    })
    expect(resolveExplorerRoute(route, { hasServices: false })).toEqual({
      page: "overview",
    })
  })

  it("leaves every other route to the explorer", () => {
    const route = parseExplorerRoute("#/components/button")
    expect(resolveExplorerRoute(route, { hasServices: false })).toEqual(route)
  })
})

describe("framed previews", () => {
  it("keeps the previewed demo in the query, out of reach of its own hash links", () => {
    for (const preview of [
      { kind: "block", id: "mail-01" },
      { kind: "demo", id: "sidebar-right" },
    ] as const) {
      expect(parsePreview(writePreview(preview))).toEqual(preview)
    }
  })

  it("opens the explorer for anything that isn't a preview", () => {
    for (const search of [
      "",
      "?preview=",
      "?preview=page/x",
      "?preview=block/",
    ])
      expect(parsePreview(search)).toBeNull()
    expect(parsePreview("?preview=block/../../x")).toBeNull()
  })

  it("frames examples that draw a whole page", () => {
    expect(
      isFullPageSource(
        'import { Sidebar } from "@/styles/base-fabricator/ui/sidebar"'
      )
    ).toBe(true)
    expect(
      isFullPageSource(
        'import { AppShell } from "@/styles/base-fabricator/ui/app-shell"'
      )
    ).toBe(true)
    expect(
      isFullPageSource(
        'import { Button } from "@/styles/base-fabricator/ui/button"'
      )
    ).toBe(false)
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
