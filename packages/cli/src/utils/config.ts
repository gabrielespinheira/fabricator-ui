import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { NAMESPACE } from "./names"
import { DEFAULT_STYLE, isBase, type Base } from "./urls"

export const COMPONENTS_JSON = "components.json"

export const STYLE_PATTERN =
  /^(base|radix|aria)-(nova|vega|maia|lyra|mira|luma|sera|rhea)$/
export const LEGACY_STYLES = ["new-york", "default"]

export type ComponentsJson = Record<string, unknown> & {
  style?: unknown
  registries?: Record<string, unknown>
  tailwind?: { config?: unknown; css?: unknown } & Record<string, unknown>
}

export type ReadResult =
  | { exists: false; path: string }
  | { exists: true; path: string; raw: string; config: ComponentsJson }
  | { exists: true; path: string; raw: string; error: string }

export function componentsJsonPath(cwd: string): string {
  return path.resolve(cwd, COMPONENTS_JSON)
}

export function readComponentsJson(cwd: string): ReadResult {
  const file = componentsJsonPath(cwd)
  if (!existsSync(file)) return { exists: false, path: file }
  const raw = readFileSync(file, "utf8")
  try {
    const config: unknown = JSON.parse(raw)
    if (!config || typeof config !== "object" || Array.isArray(config)) {
      return {
        exists: true,
        path: file,
        raw,
        error: "components.json is not a JSON object.",
      }
    }
    return { exists: true, path: file, raw, config: config as ComponentsJson }
  } catch (error) {
    return { exists: true, path: file, raw, error: (error as Error).message }
  }
}

export function getRegistryUrl(
  config: ComponentsJson | undefined,
  namespace = NAMESPACE
): string | undefined {
  const entry = config?.registries?.[namespace]
  if (typeof entry === "string") return entry
  if (
    entry &&
    typeof entry === "object" &&
    typeof (entry as { url?: unknown }).url === "string"
  ) {
    return (entry as { url: string }).url
  }
  return undefined
}

export function hasRegistry(
  config: ComponentsJson | undefined,
  namespace = NAMESPACE
): boolean {
  return config?.registries?.[namespace] !== undefined
}

/** The project's style when it is a valid `<base>-<style>` id, else the default. */
export function getCatalogStyle(config: ComponentsJson | undefined): string {
  const style = config?.style
  return typeof style === "string" && STYLE_PATTERN.test(style)
    ? style
    : DEFAULT_STYLE
}

/** `base-nova` → `base`; legacy `new-york`/`default` → `radix`. */
export function getBaseFromStyle(style: unknown): Base | undefined {
  if (typeof style !== "string") return undefined
  const prefix = style.split("-")[0]
  if (isBase(prefix)) return prefix
  if (LEGACY_STYLES.includes(style)) return "radix"
  return undefined
}

/** Returns a copy of `config` with the registry added, unless it already exists. */
export function withRegistry(
  config: ComponentsJson,
  url: string,
  namespace = NAMESPACE
): { config: ComponentsJson; changed: boolean } {
  if (hasRegistry(config, namespace)) return { config, changed: false }
  const registries = { ...(config.registries ?? {}), [namespace]: url }
  return { config: { ...config, registries }, changed: true }
}

export function serialize(config: ComponentsJson): string {
  return `${JSON.stringify(config, null, 2)}\n`
}

export type EnsureResult =
  | { status: "added"; raw: string }
  | { status: "exists"; url: string | undefined }
  | { status: "missing" }
  | { status: "invalid"; error: string }

/**
 * Adds `namespace` to `components.json` registries if it is absent. Existing
 * entries and every other key are left untouched.
 */
export function ensureRegistry(
  cwd: string,
  url: string,
  namespace = NAMESPACE
): EnsureResult {
  const read = readComponentsJson(cwd)
  if (!read.exists) return { status: "missing" }
  if ("error" in read) return { status: "invalid", error: read.error }
  const { config, changed } = withRegistry(read.config, url, namespace)
  if (!changed)
    return { status: "exists", url: getRegistryUrl(read.config, namespace) }
  writeFileSync(read.path, serialize(config), "utf8")
  return { status: "added", raw: read.raw }
}

/**
 * Adds the registry for the duration of `fn` and restores the original
 * `components.json` afterwards. Used by read-only commands such as dry runs.
 */
export async function withTemporaryRegistry<T>(
  cwd: string,
  url: string,
  fn: () => Promise<T>,
  namespace = NAMESPACE
): Promise<T> {
  const result = ensureRegistry(cwd, url, namespace)
  if (result.status !== "added") return fn()
  const restore = () =>
    writeFileSync(componentsJsonPath(cwd), result.raw, "utf8")
  process.once("exit", restore)
  try {
    return await fn()
  } finally {
    process.removeListener("exit", restore)
    restore()
  }
}
