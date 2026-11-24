import path from "node:path"
import { fileURLToPath } from "node:url"

import { openDesktop } from "../../scripts/open-desktop"

const directory = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const tauri = path.resolve(directory, "../../node_modules/.bin/tauri")

await openDesktop([tauri, "dev"], path.join(directory, "desktop"))
