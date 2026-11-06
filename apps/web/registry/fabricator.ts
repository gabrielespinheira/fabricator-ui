// Fabricator UI registry configuration.
//
// Upstream styles live in registry/styles.tsx (vega, nova, …). Fabricator
// styles are compiled by the same pipeline from registry/styles/style-<name>.css
// and served at /r/fabricator/{style}/{name}.json. Upstream styles are only
// compiled for the parity check.

export const FABRICATOR_STYLES = [
  {
    name: "fabricator",
    title: "Fabricator",
    description: "The Fabricator UI design language.",
  },
] as const

export type FabricatorStyle = (typeof FABRICATOR_STYLES)[number]

export const FABRICATOR_NAMESPACE = "@fabricator"

// Fabricator Icons is the default icon pack, and shadcn only knows five icon
// libraries. So `iconLibrary` stays "lucide", which keeps bare upstream items
// installable, and this registry param asks for the items that import the
// Fabricator package instead (next.config.mjs serves them).
export const FABRICATOR_ICON_LIBRARY = "fabricator"
export const FABRICATOR_ICONS_PACKAGE = "@fabricator-ui/icons"
export const LUCIDE_ICONS_PACKAGE = "lucide-react"
export const FABRICATOR_ICONS_PARAMS = { icons: FABRICATOR_ICON_LIBRARY }

export const FABRICATOR_REGISTRY = {
  name: "fabricator",
  homepage: "https://fabricator-ui.vercel.app",
} as const

export function getFabricatorSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? FABRICATOR_REGISTRY.homepage
  ).replace(/\/$/, "")
}

// Registry URL template written into components.json by /init.
export function getFabricatorRegistryUrl(siteUrl = getFabricatorSiteUrl()) {
  return `${siteUrl}/r/fabricator/{style}/{name}.json`
}

export function isFabricatorStyleName(styleName: string) {
  return FABRICATOR_STYLES.some((style) => styleName.endsWith(`-${style.name}`))
}
