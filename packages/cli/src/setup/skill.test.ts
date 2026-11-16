import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { writeDesignGuide, writeSkill } from "./skill"

describe("the agent skill", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "fabricator-skill-"))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it("copies the skill, and not its evals", () => {
    writeSkill(dir, ["claude", "codex"])
    for (const root of [
      ".claude/skills/fabricator",
      ".agents/skills/fabricator",
    ]) {
      expect(readFileSync(path.join(dir, root, "SKILL.md"), "utf8")).toContain(
        "fabricator"
      )
      expect(existsSync(path.join(dir, root, "rules/composition.md"))).toBe(
        true
      )
      expect(existsSync(path.join(dir, root, "evals"))).toBe(false)
    }
  })

  it("copies the library's design guide to the project's root", () => {
    writeDesignGuide(dir)
    expect(readFileSync(path.join(dir, "DESIGN.md"), "utf8")).toContain(
      "name: Fabricator UI"
    )
  })
})
