import { describe, expect, it } from "vitest"

import { getDocsExplorerGroups } from "./docs-explorer"
import {
  getDocsOverviewGroups,
  getLatestRelease,
  MissingGroupSummaryError,
} from "./docs-overview"

const pages = [
  { url: "/docs", title: "Introduction" },
  { url: "/docs/components/base/button", title: "Button" },
  { url: "/docs/components/base/badge", title: "Badge" },
  { url: "/docs/components/base/input", title: "Input" },
  { url: "/docs/components/base/app-shell", title: "App Shell" },
  { url: "/docs/components/base/sidebar", title: "Sidebar" },
  { url: "/docs/app-shell/header", title: "Header" },
]

function getComponentItems() {
  return (
    getDocsExplorerGroups(pages, "base").find(({ id }) => id === "components")
      ?.items ?? []
  )
}

describe("docs overview", () => {
  it("links each component group to its first page with a summary and count", () => {
    expect(getDocsOverviewGroups(getComponentItems())).toEqual([
      expect.objectContaining({
        id: "group-basics",
        label: "Basics",
        href: "/docs/components/base/badge",
        count: "2 components",
        description: expect.any(String),
      }),
      expect.objectContaining({
        id: "group-app-shell",
        label: "App Shell",
        href: "/docs/components/base/app-shell",
        count: "2 pages",
      }),
      expect.objectContaining({
        id: "group-forms",
        href: "/docs/components/base/input",
        count: "1 component",
      }),
    ])
  })

  it("fails loudly when a new group has no summary", () => {
    expect(() =>
      getDocsOverviewGroups([
        { id: "group-new", label: "New", href: "/docs/components/base/new" },
      ])
    ).toThrow(MissingGroupSummaryError)
  })

  it("names the newest dated release and skips unreleased changes", () => {
    expect(
      getLatestRelease([
        { url: "/docs/changelog", title: "Changelog" },
        { url: "/docs/changelog/unreleased", title: "Unreleased" },
        {
          url: "/docs/changelog/v0-8-0",
          title: "Version 0.8.0",
          date: "2026-10-01",
        },
        {
          url: "/docs/changelog/v0-9-0",
          title: "Version 0.9.0",
          date: "2026-11-10",
        },
        { url: "/docs/button", title: "Button", date: "2026-12-01" },
      ])
    ).toEqual({ url: "/docs/changelog/v0-9-0", title: "Version 0.9.0" })
  })

  it("has no release before the first one ships", () => {
    expect(
      getLatestRelease([
        { url: "/docs/changelog/unreleased", title: "Unreleased" },
      ])
    ).toBeUndefined()
  })
})
