import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { z } from "zod"

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  ".."
)
const distribution = path.join(directory, "dist")
const config = z
  .object({ build: z.object({ frontendDist: z.string() }) })
  .parse(
    JSON.parse(
      readFileSync(path.join(directory, "src-tauri/tauri.conf.json"), "utf8")
    )
  )
if (
  path.resolve(directory, "src-tauri", config.build.frontendDist) !==
  distribution
)
  throw new Error("Production must embed the local dist directory.")

const html = readFileSync(path.join(distribution, "index.html"), "utf8")
const entrypoints = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].flatMap(
  (match) => (match[1] ? [match[1]] : [])
)
if (entrypoints.length === 0)
  throw new Error("The built frontend has no local entrypoints.")
const entrypointSizes = entrypoints.map((entrypoint) => {
  if (/^(?:https?:)?\/\//.test(entrypoint))
    throw new Error(`Remote production entrypoint: ${entrypoint}`)
  const filename = path.resolve(distribution, `.${entrypoint}`)
  if (
    !filename.startsWith(`${distribution}${path.sep}`) ||
    !existsSync(filename)
  )
    throw new Error(`Missing bundled entrypoint: ${entrypoint}`)
  const source = readFileSync(filename)
  return {
    path: entrypoint,
    bytes: source.length,
    gzipBytes: gzipSync(source).length,
  }
})

let files = 0
let bytes = 0
function countAssets(directory: string) {
  for (const name of readdirSync(directory)) {
    const filename = path.join(directory, name)
    const metadata = statSync(filename)
    if (metadata.isDirectory()) countAssets(filename)
    else {
      files += 1
      bytes += metadata.size
    }
  }
}
countAssets(distribution)
if (!existsSync(path.join(distribution, "licenses/Inter.txt")))
  throw new Error("The bundled Inter license is missing.")
for (const fixture of [
  "image-compare-before.webp",
  "image-compare-after.webp",
]) {
  if (!existsSync(path.join(distribution, "media", fixture)))
    throw new Error(`Missing offline media fixture: ${fixture}`)
}
mkdirSync(path.join(directory, "build"), { recursive: true })
writeFileSync(
  path.join(directory, "build/asset-report.json"),
  JSON.stringify(
    {
      frontendDist: config.build.frontendDist,
      files,
      bytes,
      entrypoints: entrypointSizes,
    },
    null,
    2
  )
)
process.stdout.write(
  `Bundled frontend verified: ${files} files, ${bytes} bytes. Entry assets are local.\n`
)
