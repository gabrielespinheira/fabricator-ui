import {
  getExplorerInstallNames,
  type ExplorerComponent,
} from "@/lib/component-explorer"
import { getComponentGroup } from "@/lib/component-groups"

export const COMPONENTS_HREF = "/components"

/** The demo a path opens, or null for a page without a component. */
export function getDemoName(pathname: string) {
  return pathname.startsWith(`${COMPONENTS_HREF}/`)
    ? pathname.slice(COMPONENTS_HREF.length + 1)
    : null
}

// Components whose title says more than their name, as their registry
// items and the website's docs call them.
const TITLES: Readonly<Record<string, string>> = {
  editor: "Rich Text Editor",
}

/** `dropdown-menu` → `Dropdown Menu`; `editor` → `Rich Text Editor`. */
export function getComponentTitle(name: string) {
  const title = TITLES[name]
  if (title) return title
  return name
    .split("-")
    .map((word) =>
      word === "otp" ? "OTP" : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ")
}

/** The demos as the explorer lists them: titled, in the website's groups. */
export function getExplorerComponents(names: string[]): ExplorerComponent[] {
  return names.map((slug) => ({
    slug,
    title: getComponentTitle(slug),
    group: getComponentGroup(slug),
  }))
}

const SITE_URL = "https://fabricator-ui.vercel.app"

/** What adds a component to a React Native project. */
export function getComponentInstallCommand(slug: string) {
  return `npx fabricator-ui@latest add ${getExplorerInstallNames(slug, true).join(" ")}`
}

export function getComponentDocsUrl(slug: string) {
  const component =
    slug === "data-table" ? "table" : slug === "typography" ? "text" : slug
  return `${SITE_URL}/docs/components/native/${component}`
}

const DEEP_LINK =
  /^fabricator-ui:\/\/((?:components|blocks)(?:\/[a-z0-9-]+)?|icons)\/?(?:\?.*)?$/

/** The path a `fabricator-ui://components/<name>` link opens, if it is one. */
export function getPathFromUrl(url: string | null | undefined) {
  const match = url ? DEEP_LINK.exec(url) : null
  if (!match) return null
  return match[1] === "components" || match[1].split("/")[0] === "blocks"
    ? "/"
    : `/${match[1]}`
}
