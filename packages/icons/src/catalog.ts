import {
  animatedCatalog,
  brandCatalog,
  fileCatalog,
  outlineCatalog,
  outlineCategories,
} from "./generated/catalog-data.js"
import { searchCatalog } from "./generated/runtime/search.js"
import type {
  CatalogEntry,
  IconSet,
  VariantCatalogEntry,
} from "./generated/runtime/types.js"

export const fillCatalog = outlineCatalog.map(
  (entry): VariantCatalogEntry => ({ ...entry, set: "fill" })
)
export const duotoneCatalog = outlineCatalog.map(
  (entry): VariantCatalogEntry => ({ ...entry, set: "duotone" })
)

/** Every icon and brand mark, with the metadata pickers and search need. */
export const catalog: CatalogEntry[] = [
  ...outlineCatalog,
  ...brandCatalog,
  ...animatedCatalog,
  ...fillCatalog,
  ...duotoneCatalog,
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
  VariantCatalogEntry,
} from "./generated/runtime/types.js"
