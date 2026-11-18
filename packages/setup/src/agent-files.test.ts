import { describe, expect, it } from "vitest"

import {
  getSkillDirectories,
  mergeAgentInstructions,
  mergeClaudeImport,
} from "./agent-files"

describe("getSkillDirectories", () => {
  it("goes where each assistant reads it", () => {
    expect(getSkillDirectories(["claude"])).toEqual([
      ".claude/skills/fabricator",
    ])
    expect(getSkillDirectories(["codex", "cursor"])).toEqual([
      ".agents/skills/fabricator",
    ])
    expect(getSkillDirectories(["claude", "opencode"])).toEqual([
      ".claude/skills/fabricator",
      ".agents/skills/fabricator",
    ])
  })
})

describe("mergeAgentInstructions", () => {
  const instructions = "Read DESIGN.md before changing a screen."

  it("writes the Fabricator block into a new AGENTS.md", () => {
    const text = mergeAgentInstructions(undefined, instructions)
    expect(text.startsWith("# AGENTS.md\n")).toBe(true)
    expect(text).toContain("<!-- BEGIN:fabricator-ui -->")
    expect(text).toContain(instructions)
  })

  it("keeps what the project already has and adds the block after it", () => {
    const nextBlock =
      "<!-- BEGIN:nextjs-agent-rules -->\nRead the Next.js docs.\n<!-- END:nextjs-agent-rules -->\n"
    const text = mergeAgentInstructions(nextBlock, instructions)
    expect(text.startsWith(nextBlock)).toBe(true)
    expect(text.indexOf("<!-- BEGIN:fabricator-ui -->")).toBeGreaterThan(
      nextBlock.length - 1
    )
  })

  it("replaces its own block in place, so running it again changes nothing", () => {
    const first = mergeAgentInstructions(
      "# Rules\n\nShip small.\n",
      instructions
    )
    const stale = first.replace("DESIGN.md", "OLD.md")
    const refreshed = mergeAgentInstructions(stale, instructions)
    expect(refreshed).toBe(first)
    expect(mergeAgentInstructions(first, instructions)).toBe(first)
  })
})

describe("mergeClaudeImport", () => {
  it("makes CLAUDE.md import AGENTS.md", () => {
    expect(mergeClaudeImport(undefined)).toBe("@AGENTS.md\n")
    expect(mergeClaudeImport("# Notes\n")).toBe("# Notes\n\n@AGENTS.md\n")
  })

  it("leaves a CLAUDE.md that already imports it", () => {
    expect(mergeClaudeImport("@AGENTS.md\n")).toBe("@AGENTS.md\n")
  })
})
