// The agent skill and design guide, written straight into a project. The `skills` CLI would need
// Node 22.20 and sends telemetry, and the files only have two possible homes.

import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { getSkillDirectories, type Assistant } from "@fabricator-ui/setup"

/** Inside the published CLI it's in `dist`; in this repo, at its root. */
function getBundledPath(name: string) {
  const candidates = [
    new URL(`./${name}`, import.meta.url),
    new URL(`../../../../${name}`, import.meta.url),
  ].map((url) => fileURLToPath(url))
  const source = candidates.find((candidate) => existsSync(candidate))
  if (!source) throw new Error(`The CLI is missing its copy of ${name}.`)
  return source
}

export function writeSkill(cwd: string, assistants: Assistant[]) {
  const source = getBundledPath("skills/fabricator")
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

/** The library's design guide, which the skill reads from the project root. */
export function writeDesignGuide(cwd: string) {
  const target = path.join(cwd, "DESIGN.md")
  cpSync(getBundledPath("DESIGN.md"), target)
  return target
}
