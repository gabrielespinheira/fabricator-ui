import {
  animatedCatalog,
  brandCatalog,
  fileCatalog,
  outlineCatalog,
  outlineCategories,
} from "./generated/catalog-data.js"
import { searchCatalog } from "./generated/runtime/search.js"
import type { CatalogEntry, IconSet } from "./generated/runtime/types.js"

/** Every icon and brand mark, with the metadata pickers and search need. */
export const catalog: CatalogEntry[] = [
  ...outlineCatalog,
  ...brandCatalog,
  ...animatedCatalog,
  ...fileCatalog,
]

/** Searches names, aliases, tags, brand titles and categories, ignoring case and punctuation. */
export function searchIcons(query: string, options: { set?: IconSet } = {}) {
  return searchCatalog(catalog, query, options)
}

/** Looks an icon up by name or alias within a set. */
export function getIconEntry(name: string, set: IconSet = "outline") {
  return catalog.find(
    (entry) =>
      entry.set === set && (entry.name === name || entry.aliases.includes(name))
  )
}

export {
  animatedCatalog,
  brandCatalog,
  fileCatalog,
  outlineCatalog,
  outlineCategories,
}
export type {
  AnimatedCatalogEntry,
  BrandCatalogEntry,
  FileCatalogEntry,
  CatalogEntry,
  IconCategory,
  IconSet,
  OutlineCatalogEntry,
} from "./generated/runtime/types.js"
