import { describe, expect, it } from "vitest"

import {
  toFabricatorIconsDocument,
  toFabricatorIconsImports,
} from "./fabricator-icons"

const resolvePlaceholders = async (code: string) =>
  code.replace(
    '<IconPlaceholder lucide="XIcon" />',
    '<XIcon />\nimport { XIcon } from "lucide-react"'
  )

describe("toFabricatorIconsImports", () => {
  it("moves Lucide imports to the Fabricator package, and nothing else", () => {
    expect(
      toFabricatorIconsImports(
        `import { XIcon } from "lucide-react"\nimport x from 'lucide-react'\nconst note = "lucide-react"`
      )
    ).toBe(
      `import { XIcon } from "@fabricator-ui/icons"\nimport x from '@fabricator-ui/icons'\nconst note = "lucide-react"`
    )
  })
})

describe("toFabricatorIconsDocument", () => {
  it("resolves an item's placeholders to Fabricator imports", async () => {
    const item = await toFabricatorIconsDocument(
      {
        name: "dialog",
        dependencies: ["cn"],
        files: [
          {
            path: "ui/dialog.tsx",
            content: '<IconPlaceholder lucide="XIcon" />',
          },
        ],
      },
      resolvePlaceholders
    )
    expect(item.files?.[0]?.content).toContain(
      'import { XIcon } from "@fabricator-ui/icons"'
    )
    expect(item.files?.[0]?.content).not.toContain("IconPlaceholder")
    expect(item.dependencies).toEqual(["cn", "@fabricator-ui/icons"])
  })

  it("replaces a declared Lucide dependency once", async () => {
    const item = await toFabricatorIconsDocument(
      {
        name: "style",
        dependencies: ["lucide-react", "@fabricator-ui/icons", "cn"],
      },
      resolvePlaceholders
    )
    expect(item.dependencies).toEqual(["@fabricator-ui/icons", "cn"])
  })

  it("leaves an item without icons as it was", async () => {
    const button = {
      name: "utils",
      dependencies: ["cn"],
      files: [{ path: "lib/utils.ts", content: 'export { cn } from "cn"' }],
    }
    expect(
      await toFabricatorIconsDocument(button, resolvePlaceholders)
    ).toEqual(button)
  })

  it("doesn't touch a file that only talks about Lucide", async () => {
    const docs = {
      name: "notes",
      files: [
        { path: "notes.md", content: 'import { XIcon } from "lucide-react"' },
      ],
    }
    expect(await toFabricatorIconsDocument(docs, resolvePlaceholders)).toEqual(
      docs
    )
  })

  it("walks catalogs, which list items", async () => {
    const list = await toFabricatorIconsDocument(
      [{ name: "style", dependencies: ["lucide-react"] }],
      resolvePlaceholders
    )
    expect(list).toEqual([
      { name: "style", dependencies: ["@fabricator-ui/icons"] },
    ])
    const registry = await toFabricatorIconsDocument(
      {
        name: "fabricator",
        items: [{ name: "style", dependencies: ["lucide-react"] }],
      },
      resolvePlaceholders
    )
    expect(registry.items?.[0]?.dependencies).toEqual(["@fabricator-ui/icons"])
  })
})
