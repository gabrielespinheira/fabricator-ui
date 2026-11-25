import { readdirSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

// The agent skill teaches the App Shell by its parts, so the parts it names
// must exist and every documented part must be taught.

const PART_DOCS_DIRECTORY = path.join(
  import.meta.dirname,
  "../content/docs/app-shell"
)
const SHELL_SOURCE_PATH = path.join(
  import.meta.dirname,
  "../registry/fabricator/base/ui/app-shell.tsx"
)
const SKILL_DIRECTORY = path.join(
  import.meta.dirname,
  "../../../skills/fabricator"
)
const SHELL_PART = /\bAppShell[A-Z]\w*/g
/** Parts a custom frame composes; the rest of the docs cover them alone. */
const UNTAUGHT_PARTS = ["IconSlot"]

function readSkill(file: string) {
  return readFileSync(path.join(SKILL_DIRECTORY, file), "utf8")
}

const taught = readSkill("app-shell.md") + readSkill("recipes/app-shell.md")
const exported = readFileSync(SHELL_SOURCE_PATH, "utf8")
  .split("\nexport {")
  .at(-1)

describe("the agent skill's App Shell reference", () => {
  it("names only parts the App Shell exports", () => {
    const named = new Set(taught.match(SHELL_PART))
    expect([...named].filter((part) => !exported?.includes(part))).toEqual([])
  })

  it("teaches every documented part", () => {
    const documented = readdirSync(PART_DOCS_DIRECTORY)
      .filter((file) => file.endsWith(".mdx"))
      .flatMap(
        (file) =>
          readFileSync(path.join(PART_DOCS_DIRECTORY, file), "utf8").match(
            /^title: (\w+)/m
          )?.[1] ?? []
      )
    expect(
      documented.filter(
        (part) => !taught.includes(part) && !UNTAUGHT_PARTS.includes(part)
      )
    ).toEqual([])
  })
})
