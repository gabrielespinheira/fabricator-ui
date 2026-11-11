import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import { scanSiteIconNames } from "./site-icon-usage"

describe("site icon usage", () => {
  it("includes shared TypeScript modules, relative imports and preview placeholders", () => {
    const root = mkdtempSync(join(tmpdir(), "fabricator-site-icons-"))
    try {
      mkdirSync(join(root, "lib"))
      mkdirSync(join(root, "components"))
      writeFileSync(
        join(root, "lib/explorer-icons.ts"),
        'import { ChartColumnIcon, TextCursorInputIcon as InputIcon, type LucideIcon } from "./site-icons"'
      )
      writeFileSync(
        join(root, "components/example.tsx"),
        'import { HomeIcon } from "@/lib/site-icons"; import { BoxIcon } from "lucide-react"; <IconPlaceholder lucide="HomeIcon" />'
      )
      writeFileSync(
        join(root, "lib/templates.ts"),
        'const source = `import { FakeIcon } from "lucide-react"; <IconPlaceholder lucide="${name}" />`; import type { IconNode } from "lucide-react"'
      )
      expect(scanSiteIconNames(root, ["lib", "components", "missing"])).toEqual(
        ["BoxIcon", "ChartColumnIcon", "HomeIcon", "TextCursorInputIcon"]
      )
    } finally {
      rmSync(root, { recursive: true })
    }
  })
})
