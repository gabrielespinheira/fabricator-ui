// The registry's second copy of every Fabricator item: the same files, with
// icons imported from Fabricator's package. `scripts/build-registry.mts` writes
// it, and next.config.mjs serves it to projects whose registry entry carries
// the `icons` param.

import {
  FABRICATOR_ICONS_PACKAGE,
  LUCIDE_ICONS_PACKAGE,
} from "@/registry/fabricator"

type RegistryFile = { path: string; content?: string }

type RegistryDocument = {
  dependencies?: string[]
  files?: RegistryFile[]
  items?: RegistryDocument[]
  [key: string]: unknown
}

/** The icon pack's names and props are Lucide's, so only the path changes. */
export function toFabricatorIconsImports(code: string) {
  return code.replace(
    new RegExp(`(\\bfrom\\s*)(["'])${LUCIDE_ICONS_PACKAGE}\\2`, "g"),
    `$1$2${FABRICATOR_ICONS_PACKAGE}$2`
  )
}

const SOURCE_FILE = /\.tsx?$/

/** `resolvePlaceholders` turns `IconPlaceholder` into Lucide imports. */
async function toFabricatorIconsItem(
  item: RegistryDocument,
  resolvePlaceholders: (code: string, file: string) => Promise<string>
): Promise<RegistryDocument> {
  const files = await Promise.all(
    (item.files ?? []).map(async (file) => {
      if (!file.content || !SOURCE_FILE.test(file.path)) return file
      const resolved = file.content.includes("IconPlaceholder")
        ? await resolvePlaceholders(file.content, file.path)
        : file.content
      return { ...file, content: toFabricatorIconsImports(resolved) }
    })
  )
  const importsIcons = files.some((file) =>
    file.content?.includes(`"${FABRICATOR_ICONS_PACKAGE}"`)
  )
  const dependencies = [
    ...new Set([
      ...(item.dependencies ?? []).map((dependency) =>
        dependency === LUCIDE_ICONS_PACKAGE
          ? FABRICATOR_ICONS_PACKAGE
          : dependency
      ),
      ...(importsIcons ? [FABRICATOR_ICONS_PACKAGE] : []),
    ]),
  ]
  const items =
    item.items &&
    (await Promise.all(
      item.items.map((each) => toFabricatorIconsItem(each, resolvePlaceholders))
    ))
  return {
    ...item,
    ...(item.files && { files }),
    ...(dependencies.length > 0 && { dependencies }),
    ...(items && { items }),
  }
}

/** One JSON file of the built registry: an item, a catalog, or a list of items. */
export async function toFabricatorIconsDocument(
  document: RegistryDocument[],
  resolvePlaceholders: (code: string, file: string) => Promise<string>
): Promise<RegistryDocument[]>
export async function toFabricatorIconsDocument(
  document: RegistryDocument,
  resolvePlaceholders: (code: string, file: string) => Promise<string>
): Promise<RegistryDocument>
export async function toFabricatorIconsDocument(
  document: RegistryDocument | RegistryDocument[],
  resolvePlaceholders: (code: string, file: string) => Promise<string>
) {
  return Array.isArray(document)
    ? Promise.all(
        document.map((item) => toFabricatorIconsItem(item, resolvePlaceholders))
      )
    : toFabricatorIconsItem(document, resolvePlaceholders)
}
