// Turns upstream's `registry:base` init payload into a Fabricator one.
//
// `npx shadcn init <site>/init?...` merges the payload's `config` into the
// user's components.json, so this is where the @fabricator registry gets
// configured. The `style` field always stays a valid shadcn style id (e.g.
// base-nova): bare names like `button` resolve against ui.shadcn.com, and a
// custom style id would 404 there (AGENTS.md, contract item 2).

import { isPresetCode } from "shadcn/preset"

import { DEFAULT_CONFIG, type DesignSystemConfig } from "@/registry/config"
import {
  FABRICATOR_NAMESPACE,
  FABRICATOR_REGISTRY,
  getBlendRegistryUrl,
  getFabricatorRegistryUrl,
  getFabricatorSiteUrl,
} from "@/registry/fabricator"

export type FabricatorRegistryMode = "fabricator" | "blend"

// Named presets accepted by `?preset=<name>`. Values fill any design-system
// param the request leaves out; explicit params always win.
export const FABRICATOR_PRESETS: Record<
  string,
  Partial<Omit<DesignSystemConfig, "template" | "item">>
> = {
  fabricator: {
    base: DEFAULT_CONFIG.base,
    style: DEFAULT_CONFIG.style,
    baseColor: DEFAULT_CONFIG.baseColor,
    theme: DEFAULT_CONFIG.theme,
    chartColor: DEFAULT_CONFIG.chartColor,
    iconLibrary: DEFAULT_CONFIG.iconLibrary,
    font: DEFAULT_CONFIG.font,
    fontHeading: DEFAULT_CONFIG.fontHeading,
    menuAccent: DEFAULT_CONFIG.menuAccent,
    menuColor: DEFAULT_CONFIG.menuColor,
    radius: DEFAULT_CONFIG.radius,
  },
}

export const DEFAULT_FABRICATOR_PRESET = "fabricator"

const PRESET_FIELDS = Object.keys(
  FABRICATOR_PRESETS[DEFAULT_FABRICATOR_PRESET]
) as Array<keyof (typeof FABRICATOR_PRESETS)[string]>

// Resolves `?preset=<fabricator preset name>` and fills missing params with
// the default Fabricator preset. Shadcn preset codes (e.g. `b0`) pass through
// untouched; upstream's parser decodes them.
export function resolveFabricatorSearchParams(searchParams: URLSearchParams) {
  const params = new URLSearchParams(searchParams)
  const preset = params.get("preset")

  if (preset && isPresetCode(preset)) {
    return { success: true as const, params }
  }

  const presetName = preset ?? DEFAULT_FABRICATOR_PRESET
  const presetConfig = FABRICATOR_PRESETS[presetName]
  if (!presetConfig) {
    return {
      success: false as const,
      error: `Unknown preset "${presetName}". Use one of: ${Object.keys(FABRICATOR_PRESETS).join(", ")}, or a preset code.`,
    }
  }

  params.delete("preset")
  for (const field of PRESET_FIELDS) {
    const value = presetConfig[field]
    if (!params.has(field) && value !== undefined) {
      params.set(field, String(value))
    }
  }

  return { success: true as const, params }
}

export function parseRegistryMode(value: string | null) {
  if (value === null || value === "fabricator") {
    return { success: true as const, mode: "fabricator" as const }
  }
  if (value === "blend") {
    return { success: true as const, mode: "blend" as const }
  }
  return {
    success: false as const,
    error: 'Invalid registry value. Use "fabricator" or "blend".',
  }
}

type RegistryBase = {
  config?: Record<string, unknown>
  registryDependencies?: string[]
  docs?: string
  [key: string]: unknown
}

export function toFabricatorRegistryBase<T extends RegistryBase>(
  registryBase: T,
  {
    config,
    mode,
    siteUrl = getFabricatorSiteUrl(),
  }: {
    config: Pick<DesignSystemConfig, "base" | "style">
    mode: FabricatorRegistryMode
    siteUrl?: string
  }
): T {
  const registryUrl =
    mode === "fabricator"
      ? getFabricatorRegistryUrl(siteUrl)
      : getBlendRegistryUrl(siteUrl)
  const styleId = `${config.base}-${config.style}`

  // registryDependencies resolve before the payload's own config is merged,
  // so @fabricator is not configured yet. Use absolute URLs instead.
  const registryDependencies = registryBase.registryDependencies?.map(
    (dependency) =>
      dependency.startsWith("@") || dependency.includes("://")
        ? dependency
        : registryUrl.replace("{style}", styleId).replace("{name}", dependency)
  )

  return {
    ...registryBase,
    $schema: `${FABRICATOR_REGISTRY.homepage}/schema/registry-item.json`,
    config: {
      $schema: `${FABRICATOR_REGISTRY.homepage}/schema.json`,
      ...registryBase.config,
      registries: {
        [FABRICATOR_NAMESPACE]: registryUrl,
      },
    },
    ...(registryDependencies && { registryDependencies }),
    ...(registryBase.docs && {
      docs: registryBase.docs.replaceAll(
        "https://ui.shadcn.com/docs",
        `${siteUrl}/docs`
      ),
    }),
  }
}
