import { describe, expect, it } from "vitest"

import {
  COMPONENT_PATH,
  filterExplorerComponents,
  getExplorerInstallNames,
  getExplorerNavGroups,
  getExplorerTabId,
  getNewTabId,
  isNewTab,
} from "./component-explorer"

describe("getExplorerTabId", () => {
  it("reads the tab a link opens", () => {
    expect(getExplorerTabId("/")).toBe("overview")
    expect(getExplorerTabId("/components")).toBe("library")
    expect(getExplorerTabId("/icons")).toBe("icons")
    expect(getExplorerTabId(`${COMPONENT_PATH}button`)).toBe("button")
  })

  it("has no tab for anything else", () => {
    expect(getExplorerTabId(undefined)).toBeNull()
    expect(getExplorerTabId("/docs")).toBeNull()
  })
})

describe("filterExplorerComponents", () => {
  it("searches names and titles without changing the inventory", () => {
    const components = [
      { slug: "switch", title: "Switch", group: "Basics" as const },
      { slug: "editor", title: "Rich Text Editor", group: "Forms" as const },
    ]
    expect(
      filterExplorerComponents(components, " RICH ").map((item) => item.slug)
    ).toEqual(["editor"])
    expect(filterExplorerComponents(components, "missing")).toEqual([])
    expect(components[0]?.slug).toBe("switch")
  })
})

describe("getNewTabId", () => {
  it("numbers new tabs from one", () => {
    expect(getNewTabId([])).toBe("new-1")
    expect(getNewTabId(["overview", "button"])).toBe("new-1")
  })

  it("takes the first number nothing uses", () => {
    expect(getNewTabId(["new-1", "button", "new-3"])).toBe("new-2")
  })

  it("is a new tab, and component tabs are not", () => {
    expect(isNewTab(getNewTabId([]))).toBe(true)
    expect(isNewTab("button")).toBe(false)
    expect(isNewTab("overview")).toBe(false)
    expect(isNewTab(null)).toBe(false)
  })
})

describe("composed example installation", () => {
  it("installs the parts of tutorial examples instead of nonexistent components", () => {
    expect(getExplorerInstallNames("data-table", false)).toEqual([
      "table",
      "button",
      "checkbox",
      "input",
    ])
    expect(getExplorerInstallNames("typography", false)).toEqual([])
    expect(getExplorerInstallNames("typography", true)).toEqual(["text"])
    expect(getExplorerInstallNames("button", true)).toEqual(["button"])
  })
})

describe("getExplorerNavGroups", () => {
  const icons = {
    overview: "home",
    groups: { Basics: "box", "Overlays & Menus": "layers" },
  }

  it("lists an overview, then one row per component group holding its components", () => {
    const groups = getExplorerNavGroups(
      [
        { slug: "tooltip", title: "Tooltip", group: "Overlays & Menus" },
        { slug: "button", title: "Button", group: "Basics" },
        { slug: "dialog", title: "Dialog", group: "Overlays & Menus" },
      ],
      icons
    )
    expect(groups.map((group) => group.label)).toEqual([
      undefined,
      "Components",
    ])
    expect(groups[0]?.items).toEqual([
      {
        id: "overview",
        label: "Overview",
        href: "/",
        icon: "home",
        mobile: "tab",
      },
    ])
    expect(
      groups[1]?.items.map((item) => [
        item.label,
        item.icon,
        item.badge,
        item.children?.map((child) => child.href),
      ])
    ).toEqual([
      ["Basics", "box", 1, ["/components/button"]],
      [
        "Overlays & Menus",
        "layers",
        2,
        ["/components/dialog", "/components/tooltip"],
      ],
    ])
  })

  it("puts an app's own pages after the overview", () => {
    const blocks = { id: "blocks", label: "Blocks", href: "/blocks" }
    const groups = getExplorerNavGroups([], icons, { pages: [blocks] })
    expect(groups[0]?.items.map((item) => item.id)).toEqual([
      "overview",
      "blocks",
    ])
  })

  it("keeps docs routes while using the same groups and ordering", () => {
    const groups = getExplorerNavGroups(
      [{ slug: "button", title: "Button", group: "Basics" }],
      icons,
      { overviewHref: "/docs", componentPath: "/docs/components/aria/" }
    )
    expect(groups[0]?.items[0]?.href).toBe("/docs")
    expect(groups[1]?.items[0]?.children?.[0]?.href).toBe(
      "/docs/components/aria/button"
    )
  })

  it("lets the components be dragged into a new order when asked", () => {
    expect(getExplorerNavGroups([], icons)[1]?.reorderable).toBe(false)
    expect(
      getExplorerNavGroups([], icons, { reorderable: true })[1]?.reorderable
    ).toBe(true)
  })
})
