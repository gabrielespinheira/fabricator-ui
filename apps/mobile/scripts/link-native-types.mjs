// The library's React Native source lives in apps/web, where `react-native`
// doesn't resolve: the website doesn't install it. TypeScript finds packages by
// walking up from each file, so the source folders get a link to this app's
// node_modules. The links are gitignored, like any node_modules.
import { existsSync, lstatSync, rmSync, symlinkSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const web = path.resolve(root, "../web")

for (const folder of ["registry/native", "examples/native"]) {
  const link = path.join(web, folder, "node_modules")
  if (existsSync(link) && !lstatSync(link).isSymbolicLink()) {
    throw new Error(`${link} exists and isn't a link.`)
  }
  rmSync(link, { force: true })
  symlinkSync(path.join(root, "node_modules"), link, "dir")
}
