import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// The agent skill's catalogue is how an assistant learns a component exists.

const DOCS_DIRECTORY = path.join(
  import.meta.dirname,
  "../content/docs/components/base"
)
const CATALOG_PATH = path.join(
  import.meta.dirname,
  "../../../skills/fabricator/components.md"
)

const documentedComponents = readdirSync(DOCS_DIRECTORY)
  .filter((file) => file.endsWith(".mdx"))
  .map((file) => path.basename(file, ".mdx"))

describe("the agent skill's component catalogue", () => {
  it("names every documented component", () => {
    const catalog = readFileSync(CATALOG_PATH, "utf8")
    const named = new Set(
      [...catalog.matchAll(/`([a-z][a-z-]*)(?: [^`]*)?`/g)].map(
        ([, name]) => name
      )
    )

    expect(documentedComponents.filter((name) => !named.has(name))).toEqual([])
  })
})
