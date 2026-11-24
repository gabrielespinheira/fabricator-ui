export type CatalogItem = {
  name: string
  title: string
  group: string
  type: string
}

export type ExplorerRoute =
  | { page: "overview" | "settings" | "services" | "icons" | "blocks" }
  | { page: "component"; name: string; scenario?: string }
  | { page: "block"; name: string }

const namePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function parseExplorerRoute(hash: string): ExplorerRoute {
  const [path = "", search = ""] = hash.replace(/^#/, "").split("?")
  const [root = "", name, extra] = path.split("/").filter(Boolean)
  if (extra) return { page: "overview" }
  if (root === "components" && name && namePattern.test(name)) {
    const scenario = new URLSearchParams(search).get("scenario")
    return scenario && namePattern.test(scenario)
      ? { page: "component", name, scenario }
      : { page: "component", name }
  }
  if (root === "blocks" && name && namePattern.test(name)) {
    return { page: "block", name }
  }
  if (name) return { page: "overview" }
  if (
    root === "settings" ||
    root === "services" ||
    root === "icons" ||
    root === "blocks"
  ) {
    return { page: root }
  }
  return { page: "overview" }
}

export function writeExplorerRoute(route: ExplorerRoute) {
  if (route.page === "overview") return "#/"
  if (route.page === "component") {
    const scenario = route.scenario
      ? `?scenario=${encodeURIComponent(route.scenario)}`
      : ""
    return `#/components/${route.name}${scenario}`
  }
  if (route.page === "block") return `#/blocks/${route.name}`
  return `#/${route.page}`
}

export type DemoPreview = { kind: "demo" | "block"; id: string }

/** The demo a frame shows alone. It lives in the query: demos own their hash. */
export function parsePreview(search: string): DemoPreview | null {
  const value = new URLSearchParams(search).get("preview") ?? ""
  const [kind, id = "", extra] = value.split("/")
  if (extra !== undefined || !namePattern.test(id)) return null
  return kind === "demo" || kind === "block" ? { kind, id } : null
}

export function writePreview({ kind, id }: DemoPreview) {
  return `?preview=${kind}/${id}`
}

/** Examples built on the page's own shell need the viewport to themselves. */
export function isFullPageSource(source: string) {
  return /\/ui\/(?:sidebar|app-shell)"/.test(source)
}

/** A saved or typed route, without the pages this host doesn't have. */
export function resolveExplorerRoute(
  route: ExplorerRoute,
  host: { hasServices: boolean }
): ExplorerRoute {
  return route.page === "services" && !host.hasServices
    ? { page: "overview" }
    : route
}

export function filterCatalog<TItem extends CatalogItem>(
  items: readonly TItem[],
  query: string
) {
  const term = query.trim().toLowerCase()
  return items
    .filter((item) =>
      [item.name, item.title, item.group].some((value) =>
        value.toLowerCase().includes(term)
      )
    )
    .toSorted((first, second) => first.title.localeCompare(second.title))
}

export function getKeyboardInset(
  windowHeight: number,
  viewportHeight: number,
  viewportOffset: number
) {
  return Math.max(0, Math.round(windowHeight - viewportHeight - viewportOffset))
}
