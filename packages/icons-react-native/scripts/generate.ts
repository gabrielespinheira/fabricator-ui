/** Writes src/generated/: the same icon and brand modules as @fabricator-ui/icons. */
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

const { files } = buildComponentSources({ dynamic: false, catalog: false })
writeGeneratedDirectory(GENERATED, files)

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
writeGeneratedFile(path.join(packageRoot, "LICENSE.md"), licenseText())
writeGeneratedFile(path.join(packageRoot, "BRANDS.md"), brandsText())
