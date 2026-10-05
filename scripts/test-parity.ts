/**
 * Upstream parity check.
 *
 * Compares the installable registry JSON we build (apps/web/public/r/styles)
 * with what ui.shadcn.com serves for the same <base>-<style> combination.
 * Everything that affects an install must match: type, files (path, type,
 * target, content), dependencies, registryDependencies, cssVars, css, envVars.
 * `meta` (docs links) is ours and is ignored.
 *
 * Usage:
 *   bun run test:parity                      # base-nova, radix-nova, aria-nova
 *   bun run test:parity --styles all         # every generated combination
 *   bun run test:parity --styles base-vega,radix-luma --types registry:ui
 */
import fs from "node:fs/promises"
import path from "node:path"
import * as prettier from "prettier"

import { rebrandCode } from "./rebrand"

const ROOT = path.resolve(import.meta.dirname, "..")
const OUTPUT_DIR = path.join(ROOT, "apps/web/public/r/styles")
const UPSTREAM_URL =
  process.env.UPSTREAM_REGISTRY_URL ?? "https://ui.shadcn.com/r"
const CONCURRENCY = 16

const COMPARED_FIELDS = [
  "type",
  "files",
  "dependencies",
  "devDependencies",
  "registryDependencies",
  "cssVars",
  "css",
  "envVars",
  "font",
  "config",
] as const

type Item = Record<string, unknown> & { name: string; type: string }

// Intentional divergences (upstream bug fixes). See parity-exceptions.json.
const { exceptions } = JSON.parse(
  await fs.readFile(
    path.join(import.meta.dirname, "parity-exceptions.json"),
    "utf8"
  )
) as { exceptions: Array<{ item: string; bases: string[]; reason: string }> }

function getException(style: string, name: string) {
  return exceptions.find(
    (exception) =>
      exception.item === name &&
      exception.bases.some((base) => style.startsWith(`${base}-`))
  )
}

function getArg(name: string) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

async function getStyles() {
  const arg = getArg("--styles") ?? "base-nova,radix-nova,aria-nova"
  if (arg !== "all") {
    return arg.split(",")
  }
  const entries = await fs.readdir(OUTPUT_DIR, { withFileTypes: true })
  return (
    entries
      // Upstream combinations only: *-fabricator styles do not exist upstream.
      .filter(
        (entry) =>
          entry.isDirectory() &&
          /^(base|radix|aria)-/.test(entry.name) &&
          !entry.name.endsWith("-fabricator")
      )
      .map((entry) => entry.name)
  )
}

function normalize(item: Item) {
  const picked: Record<string, unknown> = {}
  for (const field of COMPARED_FIELDS) {
    const value = item[field]
    if (value === undefined) continue
    if (Array.isArray(value) && value.length === 0) continue
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue
    }
    picked[field] = value
  }
  return JSON.stringify(picked, null, 2)
}

async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>
) {
  let index = 0
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (index < items.length) {
        await fn(items[index++])
      }
    })
  )
}

const typesArg = getArg("--types")
const types = typesArg ? new Set(typesArg.split(",")) : undefined
const failures: string[] = []
const missingUpstream: string[] = []
const divergences = new Set<string>()
let rebranded = 0

const PRETTIER_ROOT = path.join(ROOT, "apps/web/registry")

async function rebrandItem(item: Item): Promise<Item> {
  const files = item.files as Array<{ path: string; content?: string }> | undefined
  if (!files) return item
  return {
    ...item,
    files: await Promise.all(
      files.map(async (file) => {
        if (!file.content) return file
        const content = rebrandCode(file.content)
        if (content === file.content) return file
        const filepath = path.join(PRETTIER_ROOT, path.basename(file.path))
        const options = await prettier.resolveConfig(filepath)
        return {
          ...file,
          content: await prettier.format(content, { ...options, filepath }),
        }
      })
    ),
  }
}
let compared = 0

for (const style of await getStyles()) {
  const catalogPath = path.join(OUTPUT_DIR, style, "registry.json")
  const catalog = JSON.parse(await fs.readFile(catalogPath, "utf8")) as {
    items: Item[]
  }
  const names = catalog.items
    .filter((item) => !types || types.has(item.type))
    .map((item) => item.name)

  await runWithConcurrency(names, async (name) => {
    const ours = JSON.parse(
      await fs.readFile(path.join(OUTPUT_DIR, style, `${name}.json`), "utf8")
    ) as Item
    const response = await fetch(`${UPSTREAM_URL}/styles/${style}/${name}.json`)
    if (response.status === 404) {
      missingUpstream.push(`${style}/${name}`)
      return
    }
    if (!response.ok) {
      failures.push(`${style}/${name}: upstream HTTP ${response.status}`)
      return
    }
    const upstream = (await response.json()) as Item
    compared++
    if (normalize(ours) === normalize(upstream)) {
      return
    }
    // Demo content is rebranded on purpose (scripts/rebrand.ts). Apply the
    // same rules to upstream and compare again.
    if (normalize(ours) === normalize(await rebrandItem(upstream))) {
      rebranded++
      return
    }
    const exception = getException(style, name)
    if (exception) {
      divergences.add(
        `${exception.bases.join(",")}/${name}: ${exception.reason}`
      )
      return
    }
    failures.push(`${style}/${name}`)
  })
  console.log(`✔ ${style}: ${names.length} items checked`)
}

console.log(`\nCompared ${compared} items against ${UPSTREAM_URL}.`)
if (rebranded) {
  console.log(`ℹ ${rebranded} items match after rebranding demo content (scripts/rebrand.ts).`)
}
if (missingUpstream.length) {
  console.log(
    `ℹ ${missingUpstream.length} items are not published upstream (Fabricator-only or upstream-internal):\n  ${missingUpstream.slice(0, 20).join("\n  ")}`
  )
}
if (divergences.size) {
  console.log(
    `ℹ Intentional divergences (scripts/parity-exceptions.json):\n  ${[...divergences].join("\n  ")}`
  )
}
if (failures.length) {
  console.error(
    `\n✖ ${failures.length} items differ from upstream:\n  ${failures.join("\n  ")}`
  )
  process.exit(1)
}
console.log("\n✅ Parity: every compared item matches upstream.")
