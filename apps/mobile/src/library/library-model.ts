/** `dropdown-menu` → `Dropdown Menu`. */
export function getComponentTitle(name: string) {
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
