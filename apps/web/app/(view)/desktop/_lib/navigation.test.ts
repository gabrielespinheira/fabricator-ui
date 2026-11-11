import { describe, expect, it } from "vitest"

import {
  closeTabs,
  getActiveTab,
  openTab,
  reopenClosedTab,
} from "@/registry/fabricator/shared/lib/app-shell-model"

import {
  createDesktopTabs,
  getDesktopHref,
  getDesktopLink,
  getDesktopTabId,
  openDesktopTab,
} from "./navigation"

describe("desktop documentation navigation", () => {
  it.each(["button", "kbd", "app-shell", "typography"])(
    "opens %s directly without an overview tab",
    (id) => {
      const state = createDesktopTabs(id)
      expect(getActiveTab(state)).toBe(id)
      expect(state.pinned).toEqual([])
      expect(state.tabs).not.toContain("overview")
      expect(getDesktopTabId(getDesktopHref(id))).toBe(id)
    }
  )

  it("keeps Overview outside the tab strip without closing open documents", () => {
    const state = createDesktopTabs("kbd")
    expect(openDesktopTab(state, "overview")).toBe(state)
    expect(createDesktopTabs("overview").tabs).toEqual(["button"])
  })

  it("returns to Overview after the final document closes", () => {
    const state = createDesktopTabs("button")
    expect(getDesktopHref(getActiveTab(closeTabs(state, state.tabs)))).toBe(
      "/desktop"
    )
  })

  it.each(["overview", "icons", "new-1"])("routes the %s tab", (id) => {
    expect(getDesktopTabId(getDesktopHref(id))).toBe(id)
  })

  it("keeps shell settings when switching, closing and reopening tabs", () => {
    const initial = createDesktopTabs("kbd")
    const opened = openTab(initial, "button", { preview: true })
    const closed = closeTabs(opened, ["button"])
    expect(getActiveTab(closed)).toBe("kbd")
    expect(
      getDesktopHref(getActiveTab(closed), "density=compact&panel=false")
    ).toBe("/desktop/components/kbd?density=compact&panel=false")
    expect(getDesktopHref(getActiveTab(reopenClosedTab(closed)))).toBe(
      "/desktop/components/button"
    )
  })

  it("keeps component cross-links and anchors inside the desktop app", () => {
    expect(
      getDesktopLink(
        "/docs/components/base/button-group#usage",
        "tabs=titlebar"
      )
    ).toBe("/desktop/components/button-group?tabs=titlebar#usage")
    expect(getDesktopLink("#api-reference", "tabs=titlebar")).toBe(
      "#api-reference"
    )
  })

  it("leaves other documentation, external URLs and demo links intact", () => {
    for (const href of [
      "/docs/installation",
      "https://base-ui.com",
      "/docs/components/aria/button",
      "/example",
      "mailto:hello@example.com",
    ]) {
      expect(getDesktopLink(href, "panel=false")).toBe(href)
    }
  })

  it("does not mistake other routes for desktop component tabs", () => {
    expect(getDesktopTabId("/desktop/preview/button-demo")).toBeNull()
    expect(getDesktopTabId("/desktop/components/button/extra")).toBeNull()
  })
})
