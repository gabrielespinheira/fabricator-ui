import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildPackage } from "@fabricator-ui/icons-core"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
await buildPackage(root)
fs.chmodSync(path.join(root, "dist/esm/cli.js"), 0o755)
console.log("Built @fabricator-ui/icons-static")
