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
