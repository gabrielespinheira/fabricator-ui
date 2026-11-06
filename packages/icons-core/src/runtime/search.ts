import type { CatalogEntry, IconSet } from "./types.js"

function normalize(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "")
}

function terms(entry: CatalogEntry) {
  return [
    entry.name,
    ...entry.aliases,
    ...entry.tags,
    ...(entry.set === "brands" ? [entry.title] : entry.categories),
  ]
}

/**
 * Matches names, aliases, tags, brand titles and outline categories, ignoring
 * case and punctuation. An empty query returns every entry of the set.
 */
export function searchCatalog<Entry extends CatalogEntry>(
  entries: Entry[],
  query: string,
  { set }: { set?: IconSet } = {}
): Entry[] {
  const inSet = set ? entries.filter((entry) => entry.set === set) : entries
  const normalized = normalize(query)
  if (!normalized) return inSet
  return inSet.filter((entry) =>
    terms(entry).some((term) => normalize(term).includes(normalized))
  )
}
