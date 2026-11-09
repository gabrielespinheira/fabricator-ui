export const COMPONENTS_HREF = "/components"
export const BLOCKS_HREF = "/blocks"

/** The demo a path opens, or null on the list and everywhere else. */
export function getDemoName(pathname: string) {
  return pathname.startsWith(`${COMPONENTS_HREF}/`)
    ? pathname.slice(COMPONENTS_HREF.length + 1)
    : null
}

/** The block a path opens, full screen, if it opens one. */
export function getBlockName(pathname: string) {
  return pathname.startsWith(`${BLOCKS_HREF}/`)
    ? pathname.slice(BLOCKS_HREF.length + 1)
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

/** Names matching a search, by name or title, in alphabetical order. */
export function filterComponents(names: string[], query: string) {
  const term = query.trim().toLowerCase()
  return [...names]
    .filter(
      (name) =>
        term === "" ||
        name.includes(term) ||
        getComponentTitle(name).toLowerCase().includes(term)
    )
    .sort()
}

const DEEP_LINK =
  /^fabricator-ui:\/\/((?:components|blocks)(?:\/[a-z0-9-]+)?)\/?(?:\?.*)?$/

/** The path a `fabricator-ui://components/<name>` link opens, if it is one. */
export function getPathFromUrl(url: string | null | undefined) {
  const match = url ? DEEP_LINK.exec(url) : null
  return match ? `/${match[1]}` : null
}
