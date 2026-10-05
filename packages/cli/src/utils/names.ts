import { fabricatorItemUrl, isUrl } from "./urls"

export const NAMESPACE = "@fabricator"

/**
 * A bare name is a plain item name such as `button`: no namespace, no path
 * separators, not a URL and not a local `.json` file. shadcn resolves bare
 * names against the upstream `@shadcn` registry, so we rewrite them.
 */
export function isBareName(value: string): boolean {
  if (!value || value.startsWith("@") || value.startsWith("-")) return false
  if (value.includes("/") || value.includes("\\")) return false
  if (isUrl(value)) return false
  if (value.endsWith(".json")) return false
  return true
}

export interface RewriteOptions {
  /** Keep bare names as-is so they install from upstream shadcn. */
  upstream?: boolean
}

export function toFabricatorAddress(
  value: string,
  options: RewriteOptions = {}
): string {
  if (options.upstream || !isBareName(value)) return value
  return `${NAMESPACE}/${value}`
}

export function rewriteNames(
  values: string[],
  options: RewriteOptions = {}
): string[] {
  return values.map((value) => toFabricatorAddress(value, options))
}

/** `@fabricator/button` → `button`; anything else → undefined. */
export function fabricatorItemName(address: string): string | undefined {
  const prefix = `${NAMESPACE}/`
  return address.startsWith(prefix) ? address.slice(prefix.length) : undefined
}

/**
 * For read-only commands in projects without a configured `@fabricator`
 * registry: turn `@fabricator/<name>` addresses into absolute item URLs.
 */
export function toAbsoluteAddresses(
  addresses: string[],
  baseUrl: string,
  style: string
): string[] {
  return addresses.map((address) => {
    const name = fabricatorItemName(address)
    return name ? fabricatorItemUrl(baseUrl, style, name) : address
  })
}

export function usesFabricator(addresses: string[]): boolean {
  return addresses.some((address) => fabricatorItemName(address) !== undefined)
}
