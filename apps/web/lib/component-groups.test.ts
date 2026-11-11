import { readdirSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  COMPONENT_GROUPS,
  getComponentGroup,
  groupComponentPages,
} from "@/lib/component-groups"

const BASES = ["base", "radix", "aria", "native"]

function getComponentSlugs(base: string) {
  return readdirSync(path.join(process.cwd(), "content/docs/components", base))
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""))
}

describe("getComponentGroup", () => {
  it("uses the six single-word groups in the existing order", () => {
    expect(COMPONENT_GROUPS).toEqual([
      "Basics",
      "Forms",
      "Overlays",
      "Structure",
      "Content",
      "Chat",
    ])
  })

  it.each([
    ["checkbox", "Basics"],
    ["spinner", "Basics"],
    ["button-group", "Forms"],
    ["dropdown-menu", "Overlays"],
    ["app-shell", "Structure"],
    ["file-tree", "Structure"],
    ["alert", "Content"],
    ["attachment", "Chat"],
    ["bot-face", "Chat"],
  ])("keeps %s in its existing category", (slug, group) => {
    expect(getComponentGroup(slug)).toBe(group)
  })

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
        group: "Overlays",
        pages: [{ url: "/docs/components/base/dialog" }],
      },
      {
        group: "Chat",
        pages: [
          { url: "/docs/components/base/message" },
          { url: "/docs/components/base/bubble" },
        ],
      },
    ])
  })
})
