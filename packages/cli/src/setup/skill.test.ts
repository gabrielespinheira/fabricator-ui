import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { writeDesignGuide, writeSkill } from "./skill"

const FENCED_CODE = /```[\s\S]*?```/g
const LINK_TARGET = /\]\(([^)\s]+)\)/g

function getAnchors(markdown: string) {
  return new Set(
    [...markdown.replace(FENCED_CODE, "").matchAll(/^#+ (.+)$/gm)].map(
      ([, heading = ""]) =>
        heading
          .replace(/[`*]/g, "")
          .toLowerCase()
          .replace(/[^\w\- ]/g, "")
          .replaceAll(" ", "-")
    )
  )
}

/** The relative links of a skill's Markdown files that lead nowhere. */
function getBrokenLinks(root: string) {
  const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
    (file) => file.endsWith(".md")
  )
  return files.flatMap((file) => {
    const markdown = readFileSync(path.join(root, file), "utf8")
    const targets = [
      ...markdown.replace(FENCED_CODE, "").matchAll(LINK_TARGET),
    ].flatMap(([, target]) => target ?? [])
    return targets
      .filter((target) => !/^[a-z]+:/.test(target))
      .filter((target) => {
        const [linkedFile, anchor] = target.split("#")
        const linked = linkedFile
          ? path.join(root, path.dirname(file), linkedFile)
          : path.join(root, file)
        if (!existsSync(linked)) return true
        return (
          anchor !== undefined &&
          !getAnchors(readFileSync(linked, "utf8")).has(anchor)
        )
      })
      .map((target) => `${file}: ${target}`)
  })
}

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

  it("links only to files and headings it installs", () => {
    writeSkill(dir, ["claude"])
    expect(getBrokenLinks(path.join(dir, ".claude/skills/fabricator"))).toEqual(
      []
    )
  })

  it("copies the library's design guide to the project's root", () => {
    writeDesignGuide(dir)
    expect(readFileSync(path.join(dir, "DESIGN.md"), "utf8")).toContain(
      "name: Fabricator UI"
    )
  })
})
