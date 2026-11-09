import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { parseArgs } from "node:util"

import { fileMetadataSchema, loadFileIcons } from "../src/file-icons"
import { readLock, writeLock } from "../src/lock"
import { FILE_SOURCES } from "../src/paths"

const REPOSITORY = "https://github.com/littensy/charmed-icons.git"
const TAG = "v0.10.0"
const SHA = "4b004b21601b367726e6472bd22bbb66e4db79f4"
const { values } = parseArgs({
  options: {
    ref: { type: "string", default: TAG },
    source: { type: "string" },
  },
})
if (values.ref !== TAG)
  throw new Error(
    `Update the reviewed Charmed pin before importing ${values.ref}`
  )
const scratch = values.source
  ? undefined
  : fs.mkdtempSync(path.join(os.tmpdir(), "charmed-icons-"))
const source = values.source
  ? path.resolve(values.source)
  : path.join(scratch ?? "", "source")
const git = (args: string[]) =>
  execFileSync("git", args, { encoding: "utf8" }).trim()
const normalizeName = (name: string) =>
  name.startsWith("_")
    ? `default-${name.slice(1).replaceAll("_", "-")}`
    : name.startsWith("folder_")
      ? name.replaceAll("_", "-")
      : `file-${name}`
const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)

try {
  if (scratch)
    git([
      "clone",
      "--quiet",
      "--depth",
      "1",
      "--branch",
      TAG,
      REPOSITORY,
      source,
    ])
  const sha = git(["-C", source, "rev-parse", "HEAD"])
  if (sha !== SHA) throw new Error(`Expected Charmed ${SHA}, found ${sha}`)
  git([
    "-C",
    source,
    "diff",
    "--exit-code",
    "HEAD",
    "--",
    "icons",
    "src/defaults",
    "scripts/palettes.ts",
    "LICENSE.md",
  ])
  const fileModule: unknown = await import(
    pathToFileURL(path.join(source, "src/defaults/file-icons.ts")).href
  )
  const folderModule: unknown = await import(
    pathToFileURL(path.join(source, "src/defaults/folder-icons.ts")).href
  )
  const paletteModule: unknown = await import(
    pathToFileURL(path.join(source, "scripts/palettes.ts")).href
  )
  // Validate imported upstream data before writing our source tree.
  const { z } = await import("zod")
  const map = z.record(z.string(), z.string())
  const files = z
    .object({ fileNames: map, fileExtensions: map })
    .parse(fileModule)
  const folders = z.object({ folderNames: map }).parse(folderModule)
  const colors = z
    .object({ basePalette: map, lightPalette: map })
    .parse(paletteModule)
  const normalizeMap = (entries: Record<string, string>) =>
    Object.fromEntries(
      Object.entries(entries)
        .map(([key, value]) => [key.toLowerCase(), normalizeName(value)])
        .sort(([a = ""], [b = ""]) => a.localeCompare(b))
    )
  // These paints occur in the artwork but are absent from upstream's palette.
  const extra = {
    "brown-dark": "#372118",
    brown: "#B46138",
    sand: "#F2C57E",
    brick: "#AE3B3B",
  }
  const palette = Object.fromEntries([
    ...Object.entries(colors.basePalette).map(([name, dark]) => [
      kebab(name),
      { dark, light: colors.lightPalette[name] ?? dark },
    ]),
    ...Object.entries(extra).map(([name, dark]) => [
      name,
      { dark, light: dark },
    ]),
  ])
  const metadata = fileMetadataSchema.parse({
    palette,
    ...Object.fromEntries(
      Object.entries(files).map(([key, value]) => [key, normalizeMap(value)])
    ),
    folderNames: normalizeMap(folders.folderNames),
  })
  fs.mkdirSync(path.join(FILE_SOURCES, "icons"), { recursive: true })
  for (const file of fs
    .readdirSync(path.join(source, "icons"))
    .filter((file) => file.endsWith(".svg"))) {
    fs.copyFileSync(
      path.join(source, "icons", file),
      path.join(
        FILE_SOURCES,
        "icons",
        `${normalizeName(file.slice(0, -4))}.svg`
      )
    )
  }
  fs.copyFileSync(
    path.join(source, "LICENSE.md"),
    path.join(FILE_SOURCES, "LICENSE")
  )
  fs.writeFileSync(
    path.join(FILE_SOURCES, "metadata.json"),
    `${JSON.stringify(metadata, null, 2)}\n`
  )
  const { icons } = loadFileIcons()
  writeLock({
    ...readLock(),
    files: {
      repository: REPOSITORY,
      tag: TAG,
      sha,
      syncedAt: new Date().toISOString().slice(0, 10),
    },
  })
  console.log(`Charmed ${TAG}: ${icons.length} file and folder icons`)
} finally {
  if (scratch) fs.rmSync(scratch, { recursive: true, force: true })
}
