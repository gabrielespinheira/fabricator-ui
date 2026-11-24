import { createRequire } from "node:module"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { openDesktop } from "../../scripts/open-desktop"

const directory = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
// In Node, the electron package exports the path to its binary.
const binary: unknown = createRequire(import.meta.url)("electron")
if (typeof binary !== "string") {
  throw new Error("The electron package didn't resolve to its binary.")
}

await openDesktop([binary, path.join(directory, "main.mjs")], directory)
