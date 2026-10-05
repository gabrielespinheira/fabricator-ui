import { Command } from "commander"

import { getBaseFromStyle } from "../utils/config"
import { highlight, logger } from "../utils/logger"
import { captureShadcn, exitLike, runShadcn } from "../utils/shadcn"
import { isBase, type Base } from "../utils/urls"
import {
  fail,
  optionalComponentsJson,
  resolveCwd,
  resolveReadAddresses,
} from "./shared"

export interface DocsOptions {
  base?: string
  json?: boolean
  cwd?: string
  upstream?: boolean
}

type Links = Record<string, string>

/**
 * Doc links from an item's `meta.links`. Accepts the upstream per-base shape
 * (`{ base: { docs, api } }`) and the flat Fabricator shape (`{ docs, examples }`).
 */
export function extractDocLinks(item: unknown, base: Base): Links {
  const links = (item as { meta?: { links?: unknown } } | undefined)?.meta
    ?.links
  if (!links || typeof links !== "object") return {}
  const perBase = (links as Record<string, unknown>)[base]
  const source =
    perBase && typeof perBase === "object"
      ? (perBase as Record<string, unknown>)
      : (links as Record<string, unknown>)
  return Object.fromEntries(
    Object.entries(source).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  )
}

/** `@fabricator/button`, `button`, `https://…/button.json` → `button`. */
export function itemNameOf(address: string): string {
  const path = address.split(/[?#]/)[0] ?? address
  return (path.split("/").pop() ?? path).replace(/\.json$/, "")
}

export async function docs(
  components: string[],
  rawOptions: DocsOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  if (rawOptions.upstream) {
    const args = [
      "docs",
      ...components,
      ...(rawOptions.base ? ["--base", rawOptions.base] : []),
      ...(rawOptions.json ? ["--json"] : []),
      "--cwd",
      cwd,
    ]
    return exitLike(await runShadcn(args, { echo: !rawOptions.json }))
  }

  const base =
    rawOptions.base ??
    getBaseFromStyle(optionalComponentsJson(cwd)?.style) ??
    "base"
  if (!isBase(base))
    fail(`Invalid base: ${base}. Use one of: base, radix, aria.`)

  // Resolution stays in shadcn: `shadcn view` fetches the items, we only read their links.
  const addresses = resolveReadAddresses(cwd, components)
  const result = await captureShadcn(["view", ...addresses, "--cwd", cwd])
  if (result.code !== 0 || result.signal) {
    process.stderr.write(result.stdout + result.stderr)
    return exitLike(result)
  }

  let items: unknown[]
  try {
    items = JSON.parse(result.stdout) as unknown[]
  } catch {
    fail("Could not read the registry response from shadcn view.")
  }

  const byName = new Map(
    items.map((item) => [(item as { name?: unknown } | null)?.name, item])
  )
  const results = components.map((component, index) => ({
    component,
    base,
    links: extractDocLinks(
      byName.get(itemNameOf(component)) ?? items[index],
      base
    ),
  }))

  if (rawOptions.json) {
    console.log(JSON.stringify({ base, results }, null, 2))
    return
  }
  for (const { component, links } of results) {
    const entries = Object.entries(links)
    if (entries.length === 0) {
      logger.warn(
        `No documentation links available for ${highlight.info(component)}.`
      )
      continue
    }
    const width = Math.max(...entries.map(([key]) => key.length))
    logger.log(highlight.info(component))
    for (const [key, url] of entries)
      logger.log(`  - ${key.padEnd(width + 2)}${url}`)
    logger.break()
  }
}

export function createDocsCommand(): Command {
  return new Command("docs")
    .description(
      "get docs, API references and usage examples for Fabricator components"
    )
    .argument("<components...>", "component names or addresses")
    .option(
      "-b, --base <base>",
      "the base to use: base, radix or aria (default: the project's base)"
    )
    .option("--json", "output as JSON")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .option("--upstream", "show the upstream shadcn/ui docs instead")
    .action(async (components: string[], options: DocsOptions) => {
      try {
        await docs(components, options)
      } catch (error) {
        fail(error)
      }
    })
}
