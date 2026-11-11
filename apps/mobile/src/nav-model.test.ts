import { describe, expect, it } from "vitest"

import { getExplorerNavGroups } from "../../web/lib/component-explorer"
import { getMobileTabItems } from "../../web/registry/fabricator/shared/lib/app-shell-model"
import {
  getMobileActiveId,
  getMobilePages,
  getNativeTabIndex,
} from "./nav-model"

const groups = getExplorerNavGroups(
  [{ slug: "button", title: "Button", group: "Basics" }],
  { overview: "home", groups: {} },
  { pages: getMobilePages({ components: "boxes", icons: "sparkles" }) }
)

describe("mobile destinations", () => {
  const tabs = getMobileTabItems(groups)

  it("syncs a native tab with navigation from the sidebar or an open page", () => {
    expect(
      getNativeTabIndex(
        tabs,
        getMobileActiveId(groups, "/components/button"),
        0
      )
    ).toBe(1)
    expect(getNativeTabIndex(tabs, "icons", 1)).toBe(2)
    expect(getNativeTabIndex(tabs, "overview", 2)).toBe(0)
  })

  it("keeps the current native destination while a blank page is open", () => {
    expect(getNativeTabIndex(tabs, null, 1)).toBe(1)
  })
  it("has Overview, Components and Icons tabs with supplied icons", () => {
    expect(
      getMobileTabItems(groups).map(({ label, icon }) => ({ label, icon }))
    ).toEqual([
      { label: "Overview", icon: "home" },
      { label: "Components", icon: "boxes" },
      { label: "Icons", icon: "sparkles" },
    ])
  })

  it("keeps Components selected in the directory and on a component demo", () => {
    expect(getMobileActiveId(groups, "/components")).toBe("component-directory")
    expect(getMobileActiveId(groups, "/components/button")).toBe(
      "component-directory"
    )
  })

  it("selects the other destinations and leaves unrelated pages unselected", () => {
    expect(getMobileActiveId(groups, "/")).toBe("overview")
    expect(getMobileActiveId(groups, "/icons")).toBe("icons")
    expect(getMobileActiveId(groups, "/new")).toBeNull()
    expect(getMobileActiveId(groups, "/components-extra")).toBeNull()
  })
})
