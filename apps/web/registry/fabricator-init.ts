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
  FABRICATOR_ICON_LIBRARY,
  FABRICATOR_ICONS_PACKAGE,
  FABRICATOR_ICONS_PARAMS,
  FABRICATOR_NAMESPACE,
  FABRICATOR_REGISTRY,
  getFabricatorRegistryUrl,
  getFabricatorSiteUrl,
  LUCIDE_ICONS_PACKAGE,
} from "@/registry/fabricator"
import { FABRICATOR_PALETTE } from "@/registry/fabricator/foundations"
import {
  DEFAULT_LOOK,
  lookCssVars,
  type FabricatorLook,
} from "@/registry/fabricator/look"
import { FABRICATOR_REQUIRED_ITEMS } from "@/registry/fabricator/registry"

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

  // shadcn's schema has no Fabricator library: the preset fills in its "lucide",
  // and usesFabricatorIcons decides what the project gets.
  if (params.get("iconLibrary") === FABRICATOR_ICON_LIBRARY) {
    params.delete("iconLibrary")
  }

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

/**
 * Fabricator's icons are the default. An explicit library or a shadcn preset
 * code, which carries its own, opts out.
 */
export function usesFabricatorIcons(searchParams: URLSearchParams) {
  const preset = searchParams.get("preset")
  if (preset && isPresetCode(preset)) return false
  const library = searchParams.get("iconLibrary")
  return library === null || library === FABRICATOR_ICON_LIBRARY
}

type RegistryBase = {
  config?: Record<string, unknown>
  dependencies?: string[]
  registryDependencies?: string[]
  cssVars?: {
    theme?: Record<string, string>
    light?: Record<string, string>
    dark?: Record<string, string>
  }
  docs?: string
  [key: string]: unknown
}

/** True when the request asks for a Fabricator preset (or none), as opposed
 *  to a shadcn preset code, which keeps its own colours. */
export function usesFabricatorPalette(searchParams: URLSearchParams) {
  const preset = searchParams.get("preset")
  return preset === null || preset in FABRICATOR_PRESETS
}

export function toFabricatorRegistryBase<T extends RegistryBase>(
  registryBase: T,
  {
    config,
    palette = false,
    look = DEFAULT_LOOK,
    icons = false,
    isPartial = false,
    siteUrl = getFabricatorSiteUrl(),
  }: {
    config: Pick<DesignSystemConfig, "base" | "style">
    /** Apply the Fabricator palette to the shadcn token names. */
    palette?: boolean
    /** The setup page's settings, applied on top of the palette. */
    look?: FabricatorLook
    /** Install Fabricator's icons: see usesFabricatorIcons. */
    icons?: boolean
    /** A partial payload (`only=theme`) leaves the project's registry entry alone. */
    isPartial?: boolean
    siteUrl?: string
  }
): T {
  const registryUrl = getFabricatorRegistryUrl(siteUrl)
  const styleId = `${config.base}-${config.style}`

  // registryDependencies resolve before the payload's own config is merged,
  // so @fabricator is not configured yet. Use absolute URLs instead.
  // Install the foundations (surfaces, interaction tokens, motion,
  // scrollbars) that every Fabricator component builds on.
  const dependencyNames = registryBase.registryDependencies
    ? [...registryBase.registryDependencies, ...FABRICATOR_REQUIRED_ITEMS]
    : undefined
  const iconsQuery = icons
    ? `?${new URLSearchParams(FABRICATOR_ICONS_PARAMS)}`
    : ""
  const registryDependencies = dependencyNames?.map((dependency) =>
    dependency.startsWith("@") || dependency.includes("://")
      ? dependency
      : `${registryUrl.replace("{style}", styleId).replace("{name}", dependency)}${iconsQuery}`
  )

  // The look's variables override the foundations' defaults: shadcn merges
  // an item's cssVars after its registryDependencies'.
  const lookVars = lookCssVars(look)
  const cssVars =
    palette && registryBase.cssVars
      ? {
          ...registryBase.cssVars,
          theme: {
            ...registryBase.cssVars.theme,
            ...FABRICATOR_PALETTE.theme,
          },
          light: {
            ...registryBase.cssVars.light,
            ...FABRICATOR_PALETTE.light,
            ...lookVars.light,
          },
          dark: {
            ...registryBase.cssVars.dark,
            ...FABRICATOR_PALETTE.dark,
            ...lookVars.dark,
          },
        }
      : registryBase.cssVars

  const dependencies =
    icons &&
    registryBase.dependencies?.map((dependency) =>
      dependency === LUCIDE_ICONS_PACKAGE
        ? FABRICATOR_ICONS_PACKAGE
        : dependency
    )

  return {
    ...registryBase,
    $schema: `${FABRICATOR_REGISTRY.homepage}/schema/registry-item.json`,
    config: {
      $schema: `${FABRICATOR_REGISTRY.homepage}/schema.json`,
      ...registryBase.config,
      ...(!isPartial && {
        registries: {
          [FABRICATOR_NAMESPACE]: icons
            ? { url: registryUrl, params: FABRICATOR_ICONS_PARAMS }
            : registryUrl,
        },
      }),
    },
    ...(dependencies && { dependencies }),
    ...(registryDependencies && { registryDependencies }),
    ...(cssVars && { cssVars }),
    ...(registryBase.docs && {
      docs: registryBase.docs.replaceAll(
        "https://ui.shadcn.com/docs",
        `${siteUrl}/docs`
      ),
    }),
  }
}
