// The library's React Native source lives in apps/web, where `react-native`
// doesn't resolve: the website doesn't install it. The editor's native view,
// packages/editor-native, is the same: it imports `expo`, which only this app
// installs, and an install that links the package resolves it from its own
// folder. TypeScript finds packages by walking up from each file, so the source
// folders get a link to this app's node_modules. The links are gitignored, like
// any node_modules.
import { existsSync, lstatSync, rmSync, symlinkSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const sourceFolders = [
  "../web/registry/native",
  "../web/examples/native",
  "../../packages/editor-native",
]

for (const folder of sourceFolders) {
  const link = path.resolve(root, folder, "node_modules")
  if (existsSync(link) && !lstatSync(link).isSymbolicLink()) {
    throw new Error(`${link} exists and isn't a link.`)
  }
  rmSync(link, { force: true })
  symlinkSync(path.join(root, "node_modules"), link, "dir")
}
