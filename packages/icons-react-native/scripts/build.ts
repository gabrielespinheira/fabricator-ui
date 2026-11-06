import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildPackage } from "@fabricator-ui/icons-core"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
await buildPackage(root)
console.log("Built @fabricator-ui/icons-react-native")
