// The agent skill, written straight into a project. The `skills` CLI would need
// Node 22.20 and sends telemetry, and the files only have two possible homes.

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { Assistant } from "@fabricator-ui/setup"

const CLAUDE_DIR = ".claude/skills/fabricator"
const SHARED_DIR = ".agents/skills/fabricator"

/** Claude Code reads its own folder; the others share `.agents/skills`. */
export function getSkillDirectories(assistants: Assistant[]) {
  return [
    ...(assistants.includes("claude") ? [CLAUDE_DIR] : []),
    ...(assistants.some((assistant) => assistant !== "claude")
      ? [SHARED_DIR]
      : []),
  ]
}

/** Inside the published CLI it's in `dist`; in this repo, at its root. */
function getSkillSource() {
  const candidates = [
    new URL("./skills/fabricator", import.meta.url),
    new URL("../../../../skills/fabricator", import.meta.url),
  ].map((url) => fileURLToPath(url))
  const source = candidates.find((dir) => existsSync(dir))
  if (!source)
    throw new Error("The CLI is missing its copy of the agent skill.")
  return source
}

export function writeSkill(cwd: string, assistants: Assistant[]) {
  const source = getSkillSource()
  const directories = getSkillDirectories(assistants)
  for (const directory of directories) {
    const target = path.join(cwd, directory)
    rmSync(target, { recursive: true, force: true })
    mkdirSync(target, { recursive: true })
    cpSync(source, target, {
      recursive: true,
      filter: (file) => path.basename(file) !== "evals",
    })
  }
  return directories
}
