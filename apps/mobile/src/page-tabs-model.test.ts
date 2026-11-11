import { describe, expect, it } from "vitest"

import {
  closeTabs,
  reopenClosedTab,
} from "../../web/registry/fabricator/shared/lib/app-shell-model"
import { createPageTabs, openPage, updatePageTabs } from "./page-tabs-model"

describe("mobile page tabs", () => {
  it("stays on Overview when there is no closed tab to reopen", () => {
    const state = createPageTabs()
    expect(updatePageTabs(state, reopenClosedTab(state.tabs), true)).toBe(state)
  })
  it("starts on Overview without adding it to the tab strip", () => {
    const state = createPageTabs()
    expect(state.pathname).toBe("/")
    expect(state.tabs.tabs).toEqual(["/components/button"])
    expect(state.tabs.pinned).toEqual([])
  })

  it("visits Overview without changing open documents or their preview", () => {
    const opened = openPage(createPageTabs(), "/components/badge")
    const overview = openPage(opened, "/")
    expect(overview.pathname).toBe("/")
    expect(overview.tabs).toBe(opened.tabs)
    expect(overview.tabs.tabs).not.toContain("/")
    expect(openPage(overview, "/components/badge").pathname).toBe(
      "/components/badge"
    )
  })

  it("replaces a blank tab with the page opened in it", () => {
    const blank = openPage(createPageTabs(), "new-1")
    const opened = openPage(blank, "/icons")
    expect(opened.pathname).toBe("/icons")
    expect(opened.tabs.tabs).toEqual(["/components/button", "/icons"])
  })

  it("returns to Overview when the last tab closes and can reopen it", () => {
    const opened = openPage(createPageTabs(), "/components/button")
    const closed = updatePageTabs(
      opened,
      closeTabs(opened.tabs, opened.tabs.tabs)
    )
    expect(closed.pathname).toBe("/")
    const reopened = updatePageTabs(closed, reopenClosedTab(closed.tabs), true)
    expect(reopened.pathname).toBe("/components/button")
  })

  it("keeps Overview visible when a background tab closes", () => {
    const state = createPageTabs()
    expect(
      updatePageTabs(state, closeTabs(state.tabs, state.tabs.tabs)).pathname
    ).toBe("/")
  })
})
