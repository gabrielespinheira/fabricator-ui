import { readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  COMPONENT_GROUPS,
  getComponentGroup,
  groupComponentPages,
} from "@/lib/component-groups"

const BASES = ["base", "radix", "aria"]

function getComponentSlugs(base: string) {
  return readdirSync(path.join(process.cwd(), "content/docs/components", base))
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""))
}

describe("getComponentGroup", () => {
  it.each(BASES)("groups every %s component page", (base) => {
    for (const slug of getComponentSlugs(base)) {
      expect(COMPONENT_GROUPS).toContain(getComponentGroup(slug))
    }
  })

  it("throws for a component without a group", () => {
    expect(() => getComponentGroup("not-a-component")).toThrow(
      /not-a-component/
    )
  })
})

describe("groupComponentPages", () => {
  it("returns groups in the fixed order, keeping page order inside each", () => {
    const pages = [
      { url: "/docs/components/base/message" },
      { url: "/docs/components/base/dialog" },
      { url: "/docs/components/base/button" },
      { url: "/docs/components/base/bubble" },
    ]

    expect(groupComponentPages(pages)).toEqual([
      { group: "Basics", pages: [{ url: "/docs/components/base/button" }] },
      {
        group: "Overlays & Menus",
        pages: [{ url: "/docs/components/base/dialog" }],
      },
      {
        group: "AI & Chat",
        pages: [
          { url: "/docs/components/base/message" },
          { url: "/docs/components/base/bubble" },
        ],
      },
    ])
  })
})
