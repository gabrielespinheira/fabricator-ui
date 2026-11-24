// The gallery compiles the registry's own source: this copies it, and the
// generated assets beside it, into the Gradle module.
import { copyFile, mkdir, readFile } from "node:fs/promises"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const root = resolve(fileURLToPath(new URL("..", import.meta.url)))
const web = resolve(root, "../../apps/web")
const registry = resolve(web, "registry/compose")
const fonts = resolve(web, "registry/fabricator/assets/fonts")
const generated = resolve(web, "generated/platforms/compose")
const resources = resolve(root, "ui/src/commonMain/composeResources")

const manifest = z
  .object({
    items: z.array(
      z.object({
        files: z.array(z.object({ path: z.string(), target: z.string() })),
      })
    ),
  })
  .parse(JSON.parse(await readFile(resolve(registry, "manifest.json"), "utf8")))
const sources = new Map(
  manifest.items.flatMap((item) =>
    item.files
      .filter((file) => file.target.endsWith(".kt"))
      .map((file) => [file.target, file.path])
  )
)
const copies: [string, string][] = [
  [
    resolve(generated, "fabricator-bot-face.bin"),
    resolve(resources, "files/fabricator-bot-face.bin"),
  ],
  [
    resolve(fonts, "LICENSE.txt"),
    resolve(resources, "files/inter-license.txt"),
  ],
  [
    resolve(fonts, "InterVariable.ttf"),
    resolve(resources, "font/inter_variable.ttf"),
  ],
  [
    resolve(fonts, "InterVariable-Italic.ttf"),
    resolve(resources, "font/inter_variable_italic.ttf"),
  ],
  ...[...sources].map(([target, path]): [string, string] => [
    resolve(registry, path),
    resolve(root, "ui/build/generated/registry", target.replace(/^src\//, "")),
  ]),
]
for (const [source, target] of copies) {
  await mkdir(dirname(target), { recursive: true })
  await copyFile(source, target)
}
process.stdout.write(`Copied ${sources.size} Compose sources.\n`)
