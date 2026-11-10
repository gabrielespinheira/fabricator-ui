import { describe, expect, it } from "vitest"

import { getDocsExplorerGroups } from "./docs-explorer"

describe("docs explorer", () => {
  it("keeps guide links and groups only the selected platform's components", () => {
    const groups = getDocsExplorerGroups(
      [
        { url: "/docs", title: "Introduction" },
        { url: "/docs/components", title: "Components" },
        { url: "/docs/installation", title: "Installation" },
        { url: "/docs/javascript", title: "JavaScript" },
        { url: "/docs/components/base/button", title: "Button" },
        { url: "/docs/components/native/button", title: "Button" },
      ],
      "native"
    )
    expect(groups[0]?.items.map((item) => item.label)).toEqual(["Overview"])
    expect(groups[1]?.items[0]?.children?.[0]?.href).toBe(
      "/docs/components/native/button"
    )
    expect(
      groups[2]?.items.flatMap(
        (item) => item.children?.map((child) => child.href) ?? []
      )
    ).toEqual(["/docs/installation", "/docs/javascript"])
  })
})
