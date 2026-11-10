export type ExplorerIconSet = "outline" | "brands" | "files" | "animated"
export type IconPlatform = "web" | "native"

export const ICONS_HREF = "/icons"

export function getIconSets(platform: IconPlatform): ExplorerIconSet[] {
  return platform === "native"
    ? ["outline", "brands", "files"]
    : ["outline", "brands", "files", "animated"]
}

export function getIconImport(
  entry: { name: string; set: ExplorerIconSet },
  platform: IconPlatform
) {
  const component =
    entry.name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("") + "Icon"
  const root =
    platform === "native"
      ? "@fabricator-ui/icons-react-native"
      : "@fabricator-ui/icons"
  return `import { ${component} } from "${root}${entry.set === "outline" ? "" : `/${entry.set}`}"`
}

export function getIconPage<T>(entries: T[], requested: number, size: number) {
  const pages = Math.ceil(entries.length / size)
  const page = Math.max(0, Math.min(requested, pages - 1))
  return { items: entries.slice(page * size, (page + 1) * size), page, pages }
}
