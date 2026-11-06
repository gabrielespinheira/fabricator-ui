/**
 * Writes src/generated/ from the icon sources in @fabricator-ui/icons-core:
 * one module per icon and brand, the barrels, the lazy-import map, the
 * catalog, and the shared runtime helpers.
 */
import path from "node:path"
import { fileURLToPath } from "node:url"
import {
  brandsText,
  buildComponentSources,
  licenseText,
  writeGeneratedDirectory,
  writeGeneratedFile,
} from "@fabricator-ui/icons-core"

const GENERATED = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/generated"
)

const { files, icons, brands, animated } = buildComponentSources({
  dynamic: true,
  catalog: true,
  animated: true,
})
const { written, removed } = writeGeneratedDirectory(GENERATED, files)
if (written > 0 || removed > 0) {
  console.log(
    `@fabricator-ui/icons: ${icons.length} icons, ${brands.length} brands, ${animated.length} animated (${written} files written, ${removed} removed)`
  )
}

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
writeGeneratedFile(
  path.join(packageRoot, "LICENSE.md"),
  licenseText({ animated: true })
)
writeGeneratedFile(path.join(packageRoot, "BRANDS.md"), brandsText())
