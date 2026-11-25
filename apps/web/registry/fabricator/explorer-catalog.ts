import { getComponentGroup } from "@/lib/component-groups"

type RegistryEntry = { name: string; title?: string; type: string }
type ExplorerItem = {
  name: string
  title: string
  group: string
  type: "registry:ui" | "registry:component" | "registry:block" | "guide"
}

export function collectExplorerItems(entries: readonly RegistryEntry[]) {
  const items = new Map<string, ExplorerItem>()
  for (const entry of entries) {
    if (
      entry.type !== "registry:ui" &&
      entry.type !== "registry:component" &&
      entry.type !== "registry:block"
    )
      continue
    items.set(entry.name, {
      name: entry.name,
      title:
        entry.title ??
        entry.name
          .split("-")
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" "),
      group:
        entry.type === "registry:block"
          ? "Blocks"
          : getComponentGroup(entry.name),
      type: entry.type,
    })
  }
  items.set("typography", {
    name: "typography",
    title: "Typography",
    group: "Basics",
    type: "guide",
  })
  return [...items.values()].sort((left, right) =>
    left.name.localeCompare(right.name)
  )
}
