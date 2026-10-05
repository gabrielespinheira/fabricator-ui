// Fabricator UI registry configuration.
//
// Upstream styles live in registry/styles.tsx (vega, nova, …). Fabricator
// styles are compiled by the same pipeline from registry/styles/style-<name>.css
// and served in "Fabricator mode" at /r/fabricator/{style}/{name}.json.

export const FABRICATOR_STYLES = [
  {
    name: "fabricator",
    title: "Fabricator",
    description: "The Fabricator UI design language.",
  },
] as const

export type FabricatorStyle = (typeof FABRICATOR_STYLES)[number]

export const FABRICATOR_NAMESPACE = "@fabricator"

export const FABRICATOR_REGISTRY = {
  name: "fabricator",
  homepage: "https://fabricator-ui.com",
} as const

export function getFabricatorSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ?? FABRICATOR_REGISTRY.homepage
  ).replace(/\/$/, "")
}

// Fabricator-mode registry URL template written into components.json by /init.
export function getFabricatorRegistryUrl(siteUrl = getFabricatorSiteUrl()) {
  return `${siteUrl}/r/fabricator/{style}/{name}.json`
}

// Blend-mode registry URL template: items compiled in the project's own style.
export function getBlendRegistryUrl(siteUrl = getFabricatorSiteUrl()) {
  return `${siteUrl}/r/{style}/{name}.json`
}

export function isFabricatorStyleName(styleName: string) {
  return FABRICATOR_STYLES.some((style) => styleName.endsWith(`-${style.name}`))
}
