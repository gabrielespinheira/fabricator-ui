/**
 * Compares a Lucide tag with the frozen import:
 *   bun run icons:compare --ref 1.73.0
 *
 * The checkout is temporary. The report leaves Fabricator's catalog and the
 * import snapshot untouched.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { parseArgs } from "node:util"

import { diffIconSets, type IconSnapshot } from "../src/icon-set-diff"
import { LUCIDE_SOURCES } from "../src/paths"
import { iconMetadataSchema, readJson } from "../src/schemas"

const REPOSITORY = "https://github.com/lucide-icons/lucide.git"

function snapshot(directory: string) {
  const icons = new Map<string, IconSnapshot>()
  const iconsDirectory = path.join(directory, "icons")
  if (!fs.existsSync(iconsDirectory)) return icons
  for (const file of fs.readdirSync(iconsDirectory)) {
    if (!file.endsWith(".svg")) continue
    const name = file.slice(0, -4)
    const metadataFile = path.join(iconsDirectory, `${name}.json`)
    const metadata = fs.existsSync(metadataFile)
      ? readJson(metadataFile, iconMetadataSchema)
      : { aliases: [] }
    icons.set(name, {
      svg: fs.readFileSync(path.join(iconsDirectory, file), "utf8"),
      aliases: (metadata.aliases ?? []).map((alias) => alias.name),
    })
  }
  return icons
}

function git(args: string[], cwd?: string) {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim()
}

const { values } = parseArgs({ options: { ref: { type: "string" } } })
if (!values.ref) {
  console.error("Usage: bun run icons:compare --ref <tag>")
  process.exit(1)
}

const checkout = fs.mkdtempSync(path.join(os.tmpdir(), "lucide-"))
try {
  git([
    "-c",
    "advice.detachedHead=false",
    "clone",
    "--quiet",
    "--depth",
    "1",
    "--branch",
    values.ref,
    "--filter=blob:none",
    "--sparse",
    REPOSITORY,
    checkout,
  ])
  git(["sparse-checkout", "set", "icons"], checkout)
  const sha = git(["rev-parse", "HEAD"], checkout)

  const before = snapshot(LUCIDE_SOURCES)
  const after = snapshot(checkout)
  const diff = diffIconSets(before, after)
  console.log(
    `Lucide ${values.ref} (${sha.slice(0, 7)}) vs. the frozen import: ${after.size} icons`
  )
  for (const [label, names] of Object.entries(diff)) {
    if (names.length === 0) continue
    const list =
      names.length > 40
        ? `${names.slice(0, 40).join(", ")}, …`
        : names.join(", ")
    console.log(`  ${label} (${names.length}): ${list}`)
  }
} finally {
  fs.rmSync(checkout, { recursive: true, force: true })
}
