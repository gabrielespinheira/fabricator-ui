import path from "node:path"
import {
  autocompleteMultiselect,
  cancel,
  isCancel,
  multiselect,
  select,
} from "@clack/prompts"

import {
  getCatalogStyle,
  hasRegistry,
  readComponentsJson,
  type ComponentsJson,
} from "../utils/config"
import { highlight, logger } from "../utils/logger"
import { NAMESPACE, rewriteNames, toAbsoluteAddresses } from "../utils/names"
import { fabricatorCatalogUrl, getBaseUrl } from "../utils/urls"

export function resolveCwd(cwd: string | undefined): string {
  return path.resolve(cwd ?? process.cwd())
}

/** Reads components.json and exits with a helpful message when it is missing or broken. */
export function requireComponentsJson(cwd: string): ComponentsJson {
  const read = readComponentsJson(cwd)
  if (!read.exists) {
    logger.error(
      `No ${highlight.info("components.json")} found in ${highlight.info(cwd)}.`
    )
    logger.log(
      `  Run ${highlight.info("fabricator-ui init")} first, or pass ${highlight.info("-c <path>")}.`
    )
    process.exit(1)
  }
  if ("error" in read) {
    logger.error(`Could not parse ${highlight.info(read.path)}: ${read.error}`)
    process.exit(1)
  }
  return read.config
}

export function optionalComponentsJson(
  cwd: string
): ComponentsJson | undefined {
  const read = readComponentsJson(cwd)
  return read.exists && "config" in read ? read.config : undefined
}

export interface CatalogItem {
  name: string
  type: string
  title?: string
  description?: string
}

export async function fetchCatalog(
  baseUrl: string,
  style: string
): Promise<CatalogItem[]> {
  const url = fabricatorCatalogUrl(baseUrl, style)
  let response: Response
  try {
    response = await fetch(url, { headers: { accept: "application/json" } })
  } catch (error) {
    throw new Error(`Could not reach ${url}: ${(error as Error).message}`)
  }
  if (!response.ok) {
    throw new Error(
      `Could not fetch the Fabricator catalog (${response.status}) from ${url}.`
    )
  }
  const body = (await response.json()) as { items?: unknown }
  if (!Array.isArray(body.items)) {
    throw new Error(`Unexpected catalog format at ${url}: missing "items".`)
  }
  return body.items.filter(
    (item): item is CatalogItem =>
      !!item &&
      typeof item === "object" &&
      typeof (item as CatalogItem).name === "string"
  )
}

function isAnswered<T>(value: T): value is Exclude<T, symbol> {
  return !isCancel(value)
}

/** Ends the run the way pressing Ctrl+C does. */
export function exitIfCancelled<T>(value: T): Exclude<T, symbol> {
  if (isAnswered(value)) return value
  cancel("Cancelled.")
  process.exit(1)
}

export type PromptChoice<T extends string> = {
  title: string
  value: T
  description?: string
}

function toPromptOptions(choices: readonly PromptChoice<string>[]) {
  return choices.map(({ title, value, description }) => ({
    label: title,
    value,
    hint: description,
  }))
}

export async function promptSelect<T extends string>(
  message: string,
  choices: readonly PromptChoice<T>[]
): Promise<T> {
  const answer = exitIfCancelled(
    await select<string>({ message, options: toPromptOptions(choices) })
  )
  const chosen = choices.find(({ value }) => value === answer)
  if (!chosen) throw new Error(`Unknown choice: ${answer}`)
  return chosen.value
}

/** Any number of answers, none included; a long list wants promptMultiselect. */
export async function promptCheckboxes<T extends string>(
  message: string,
  choices: readonly PromptChoice<T>[]
): Promise<T[]> {
  const answers = exitIfCancelled(
    await multiselect<string>({
      message,
      required: false,
      options: toPromptOptions(choices),
    })
  )
  return choices
    .filter(({ value }) => answers.includes(value))
    .map(({ value }) => value)
}

export async function promptMultiselect(
  message: string,
  choices: { title: string; value: string; description?: string }[]
): Promise<string[]> {
  return exitIfCancelled(
    await autocompleteMultiselect<string>({
      message,
      required: true,
      options: toPromptOptions(choices),
    })
  )
}

export function fail(error: unknown): never {
  logger.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

/**
 * Addresses for read-only commands (`view`, `docs`, `diff`). When the project
 * has no `@fabricator` registry (or no components.json at all), Fabricator
 * items are addressed by absolute URL so nothing needs to be written.
 */
export function resolveReadAddresses(
  cwd: string,
  names: string[],
  options: { upstream?: boolean } = {}
): string[] {
  const addresses = rewriteNames(names, options)
  const config = optionalComponentsJson(cwd)
  if (hasRegistry(config, NAMESPACE)) return addresses
  return toAbsoluteAddresses(addresses, getBaseUrl(), getCatalogStyle(config))
}
