import { Command } from "commander"

import {
  getCatalogStyle,
  hasRegistry,
  withTemporaryRegistry,
} from "../utils/config"
import { NAMESPACE } from "../utils/names"
import { exitLike, runShadcn } from "../utils/shadcn"
import {
  fabricatorCatalogUrl,
  fabricatorRegistryTemplate,
  getBaseUrl,
} from "../utils/urls"
import { fail, optionalComponentsJson, resolveCwd } from "./shared"

export interface SearchOptions {
  query?: string
  type?: string
  limit?: string
  offset?: string
  json?: boolean
  cwd?: string
}

export function buildSearchArgs(
  registry: string,
  query: string | undefined,
  options: SearchOptions & { cwd: string }
): string[] {
  const args = ["search", registry]
  if (query) args.push("--query", query)
  if (options.type) args.push("--type", options.type)
  if (options.limit) args.push("--limit", options.limit)
  if (options.offset) args.push("--offset", options.offset)
  if (options.json) args.push("--json")
  args.push("--cwd", options.cwd)
  return args
}

export async function search(
  query: string | undefined,
  rawOptions: SearchOptions
): Promise<void> {
  const cwd = resolveCwd(rawOptions.cwd)
  const config = optionalComponentsJson(cwd)
  const options = { ...rawOptions, cwd }
  const q = query ?? rawOptions.query
  if (hasRegistry(config, NAMESPACE)) {
    return exitLike(await runShadcn(buildSearchArgs(NAMESPACE, q, options)))
  }
  const baseUrl = getBaseUrl()
  if (config) {
    // Configure @fabricator for this run only so results read as @fabricator/<name>.
    const result = await withTemporaryRegistry(
      cwd,
      fabricatorRegistryTemplate(baseUrl),
      () => runShadcn(buildSearchArgs(NAMESPACE, q, options))
    )
    return exitLike(result)
  }
  const catalog = fabricatorCatalogUrl(baseUrl, getCatalogStyle(config))
  exitLike(await runShadcn(buildSearchArgs(catalog, q, options)))
}

export function createSearchCommand(): Command {
  return new Command("search")
    .alias("list")
    .description("search Fabricator UI items")
    .argument("[query]", "query string")
    .option("-q, --query <query>", "query string")
    .option(
      "-t, --type <type>",
      "filter by item type, e.g. ui, block, hook (comma-separated)"
    )
    .option("-l, --limit <number>", "maximum number of items to display")
    .option("-o, --offset <number>", "number of items to skip")
    .option("--json", "output as JSON")
    .option(
      "-c, --cwd <cwd>",
      "the working directory (default: current directory)"
    )
    .action(async (query: string | undefined, options: SearchOptions) => {
      try {
        await search(query, options)
      } catch (error) {
        fail(error)
      }
    })
}
