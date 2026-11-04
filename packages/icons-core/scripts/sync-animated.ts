/**
 * Vendors the animated icons of lucide-animated (pqoqubbw/icons) at a commit:
 *   bun run icons:animated --ref <sha|branch>
 *
 * Copies icons/*.tsx and LICENSE into sources/animated/ and records the commit
 * in icons.lock.json. The vendored files are never edited by hand: the
 * generator rewrites each icon's shell when it builds the package.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { parseArgs } from "node:util"

import { readLock, writeLock } from "../src/lock"
import { ANIMATED_SOURCES } from "../src/paths"

const REPOSITORY = "https://github.com/pqoqubbw/icons.git"

function git(args: string[], cwd?: string) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

const { values } = parseArgs({ options: { ref: { type: "string" } } })
if (!values.ref) {
  console.error("Usage: bun run icons:animated --ref <sha|branch>")
  process.exit(1)
}

const checkout = fs.mkdtempSync(path.join(os.tmpdir(), "lucide-animated-"))
try {
  git(["init", "--quiet"], checkout)
  git(["remote", "add", "origin", REPOSITORY], checkout)
  git(["fetch", "--quiet", "--depth", "1", "origin", values.ref], checkout)
  git(
    ["-c", "advice.detachedHead=false", "checkout", "--quiet", "FETCH_HEAD"],
    checkout
  )
  const sha = git(["rev-parse", "HEAD"], checkout)

  const before = new Set(
    fs.existsSync(ANIMATED_SOURCES) ? fs.readdirSync(ANIMATED_SOURCES) : []
  )
  fs.rmSync(ANIMATED_SOURCES, { recursive: true, force: true })
  fs.mkdirSync(ANIMATED_SOURCES, { recursive: true })
  const icons = fs
    .readdirSync(path.join(checkout, "icons"))
    .filter((file) => file.endsWith(".tsx"))
  for (const file of icons) {
    fs.copyFileSync(
      path.join(checkout, "icons", file),
      path.join(ANIMATED_SOURCES, file)
    )
  }
  fs.copyFileSync(
    path.join(checkout, "LICENSE"),
    path.join(ANIMATED_SOURCES, "LICENSE")
  )

  writeLock({
    ...readLock(),
    animated: {
      repository: REPOSITORY,
      sha,
      syncedAt: new Date().toISOString().slice(0, 10),
    },
  })

  const added = icons.filter((file) => !before.has(file))
  console.log(`lucide-animated ${sha.slice(0, 7)}: ${icons.length} icons`)
  if (before.size > 0 && added.length > 0)
    console.log(`  added (${added.length}): ${added.join(", ")}`)
} finally {
  fs.rmSync(checkout, { recursive: true, force: true })
}
