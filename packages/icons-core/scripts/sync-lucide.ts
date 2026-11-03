/**
 * Vendors Lucide's icon sources at a tag:
 *   bun run icons:sync --ref 1.66.0
 *
 * Copies icons/, categories/, LICENSE and brand-stopwords.json into sources/lucide/, records the tag
 * and commit in icons.lock.json, and prints what changed since the last sync.
 * The vendored files are never edited by hand.
 */
import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { parseArgs } from "node:util"

import { diffIconSets, type IconSnapshot } from "../src/icon-set-diff"
import { readLock, writeLock } from "../src/lock"
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
  console.error("Usage: bun run icons:sync --ref <tag>")
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
  git(["sparse-checkout", "set", "icons", "categories"], checkout)
  const sha = git(["rev-parse", "HEAD"], checkout)

  const before = snapshot(LUCIDE_SOURCES)
  fs.rmSync(LUCIDE_SOURCES, { recursive: true, force: true })
  fs.mkdirSync(LUCIDE_SOURCES, { recursive: true })
  for (const entry of ["icons", "categories"]) {
    fs.cpSync(path.join(checkout, entry), path.join(LUCIDE_SOURCES, entry), {
      recursive: true,
    })
  }
  for (const file of ["LICENSE", "brand-stopwords.json"]) {
    fs.copyFileSync(path.join(checkout, file), path.join(LUCIDE_SOURCES, file))
  }
  const after = snapshot(LUCIDE_SOURCES)

  writeLock({
    ...readLock(),
    lucide: {
      tag: values.ref,
      sha,
      syncedAt: new Date().toISOString().slice(0, 10),
    },
  })

  const diff = diffIconSets(before, after)
  console.log(`Lucide ${values.ref} (${sha.slice(0, 7)}): ${after.size} icons`)
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
