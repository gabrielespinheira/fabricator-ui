import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { writeAgentInstructions, writeDesignGuide, writeSkill } from "./skill"

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

  it("points AGENTS.md at the design guide, beside what is already there", () => {
    writeFileSync(path.join(dir, "AGENTS.md"), "# AGENTS.md\n\nShip small.\n")
    writeAgentInstructions(dir, ["codex"], "pnpm")
    const agents = readFileSync(path.join(dir, "AGENTS.md"), "utf8")
    expect(agents).toContain("Ship small.")
    expect(agents).toContain("`DESIGN.md`")
    expect(agents).toContain("pnpm dlx fabricator-ui@latest add <name>")
    expect(existsSync(path.join(dir, "CLAUDE.md"))).toBe(false)
  })

  it("makes CLAUDE.md import AGENTS.md for Claude Code", () => {
    writeAgentInstructions(dir, ["claude"], "bun")
    writeAgentInstructions(dir, ["claude"], "bun")
    expect(readFileSync(path.join(dir, "CLAUDE.md"), "utf8")).toBe(
      "@AGENTS.md\n"
    )
    const agents = readFileSync(path.join(dir, "AGENTS.md"), "utf8")
    expect(agents.match(/BEGIN:fabricator-ui/g)).toHaveLength(1)
  })
})
