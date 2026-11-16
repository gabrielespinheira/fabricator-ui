import { describe, expect, it } from "vitest"

import { getSkillDirectories } from "./agent-files"

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
