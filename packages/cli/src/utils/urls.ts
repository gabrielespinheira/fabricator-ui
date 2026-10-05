export const DEFAULT_BASE_URL = "https://fabricator-ui.com"
export const REGISTRY_URL_ENV = "FABRICATOR_REGISTRY_URL"
export const DEFAULT_PRESET = "fabricator"
export const DEFAULT_STYLE = "base-nova"

export const BASES = ["base", "radix", "aria"] as const
export type Base = (typeof BASES)[number]

export function isBase(value: unknown): value is Base {
  return (
    typeof value === "string" && (BASES as readonly string[]).includes(value)
  )
}

export function isUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/**
 * The site base URL. `FABRICATOR_REGISTRY_URL` overrides the default
 * (for example `http://localhost:4000` while developing the registry).
 * Trailing slashes are stripped.
 */
export function getBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw = env[REGISTRY_URL_ENV]?.trim()
  const value = raw ? raw : DEFAULT_BASE_URL
  if (!isUrl(value)) {
    throw new Error(
      `Invalid ${REGISTRY_URL_ENV}: "${value}". Expected an http(s) URL such as http://localhost:4000.`
    )
  }
  return value.replace(/\/+$/, "")
}

/** Fabricator mode: items are compiled with the Fabricator style for the user's base. */
export function fabricatorRegistryTemplate(baseUrl: string): string {
  return `${baseUrl}/r/fabricator/{style}/{name}.json`
}

/** Blend mode: items are compiled with the user's own shadcn style. */
export function blendRegistryTemplate(baseUrl: string): string {
  return `${baseUrl}/r/{style}/{name}.json`
}

/** A single Fabricator-mode item URL for an explicit style. */
export function fabricatorItemUrl(
  baseUrl: string,
  style: string,
  name: string
): string {
  return `${baseUrl}/r/fabricator/${style}/${name}.json`
}

/** The Fabricator-mode catalog (`registry.json`) for a style. */
export function fabricatorCatalogUrl(baseUrl: string, style: string): string {
  return fabricatorItemUrl(baseUrl, style, "registry")
}

export interface InitUrlOptions {
  base?: string
  /** A Fabricator preset name (`fabricator`), a shadcn preset code (`b0`), or a full URL. */
  preset?: string
  style?: string
  baseColor?: string
  theme?: string
  chartColor?: string
  iconLibrary?: string
  font?: string
  fontHeading?: string
  radius?: string
  menuAccent?: string
  menuColor?: string
  rtl?: boolean
  pointer?: boolean
  template?: string
  monorepo?: boolean
  only?: string
  /** `blend` keeps the user's shadcn look and writes the blend-mode registry URL. */
  registry?: "blend"
}

const STRING_PARAMS = [
  "style",
  "baseColor",
  "theme",
  "chartColor",
  "iconLibrary",
  "font",
  "fontHeading",
  "radius",
  "menuAccent",
  "menuColor",
] as const

/**
 * Builds `${BASE}/init?...`. Only parameters that are set are written; the
 * server fills defaults for the rest. A preset that is already a URL is
 * returned untouched.
 */
export function buildInitUrl(
  options: InitUrlOptions = {},
  baseUrl: string = getBaseUrl()
): string {
  const preset = options.preset?.trim() || DEFAULT_PRESET
  if (isUrl(preset)) {
    return preset
  }

  const params = new URLSearchParams()
  params.set("base", options.base ?? "base")
  params.set("preset", preset)
  for (const key of STRING_PARAMS) {
    const value = options[key]
    if (value) params.set(key, value)
  }
  if (options.rtl !== undefined) params.set("rtl", String(options.rtl))
  if (options.pointer) params.set("pointer", "true")
  if (options.template) {
    params.set(
      "template",
      options.monorepo && !options.template.endsWith("-monorepo")
        ? `${options.template}-monorepo`
        : options.template
    )
  }
  if (options.only) params.set("only", options.only)
  if (options.registry) params.set("registry", options.registry)

  return `${baseUrl}/init?${params.toString()}`
}
