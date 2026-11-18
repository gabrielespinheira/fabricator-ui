import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { z } from "zod"

const root = resolve(fileURLToPath(new URL("../../..", import.meta.url)))
const entrySchema = z.object({
  name: z.string(),
  files: z.array(z.object({ path: z.string(), target: z.string() })),
  dependencies: z.array(z.string()),
})
const manifest = z
  .object({ items: z.array(entrySchema) })
  .parse(
    JSON.parse(
      await readFile(
        resolve(root, "apps/web/registry/compose/manifest.json"),
        "utf8"
      )
    )
  )
const contract = z
  .object({
    items: z.array(z.object({ name: z.string(), type: z.string() })),
    icons: z.array(z.object({ name: z.string() })),
  })
  .parse(
    JSON.parse(
      await readFile(
        resolve(root, "apps/web/generated/platforms/contract.json"),
        "utf8"
      )
    )
  )
const authoredRoot = resolve(root, "apps/web/registry/compose")
const errors: string[] = []
const itemMap = new Map(manifest.items.map((item) => [item.name, item]))
const gallery = await readFile(
  resolve(
    root,
    "apps/kotlin/gallery/src/commonMain/kotlin/dev/fabricator/gallery/gallery.kt"
  ),
  "utf8"
)
for (const item of contract.items) {
  if (!itemMap.has(item.name))
    errors.push(`Missing manifest item: ${item.name}`)
  if (item.type !== "registry:block" && !gallery.includes(`"${item.name}"`))
    errors.push(`Missing gallery route: ${item.name}`)
}
for (const item of manifest.items) {
  for (const source of item.files) {
    if (!existsSync(resolve(authoredRoot, source.path)))
      errors.push(`Missing ${item.name} source: ${source.path}`)
    if (
      source.target.startsWith("/") ||
      source.target.split("/").includes("..")
    )
      errors.push(`Invalid consumer target: ${source.target}`)
  }
  for (const dependency of item.dependencies)
    if (!itemMap.has(dependency.replace("@fabricator/", "")))
      errors.push(`Unknown dependency ${dependency} for ${item.name}`)
}
const visited = new Set<string>()
function visit(name: string, path: Set<string>) {
  if (path.has(name)) {
    errors.push(`Dependency cycle at ${name}`)
    return
  }
  if (visited.has(name)) return
  const item = itemMap.get(name)
  if (!item) return
  const next = new Set(path).add(name)
  item.dependencies.forEach((dependency) =>
    visit(dependency.replace("@fabricator/", ""), next)
  )
  visited.add(name)
}
manifest.items.forEach((item) => visit(item.name, new Set()))
const sources = [
  ...new Set(
    manifest.items.flatMap((item) =>
      item.files
        .filter((file) => file.path.endsWith(".kt"))
        .map((file) => resolve(authoredRoot, file.path))
    )
  ),
]
const iconNames = new Set(contract.icons.map((icon) => icon.name))
const sourceContents = new Map<string, string>()
for (const source of sources) {
  const content = await readFile(source, "utf8")
  sourceContents.set(source, content)
  for (const match of content.matchAll(/FabricatorIcon\("([a-z][a-z0-9-]+)"/g))
    if (!iconNames.has(match[1] ?? ""))
      errors.push(`Unknown canonical icon ${match[1]} in ${source}`)
}
for (const item of manifest.items) {
  const closure = new Set<string>()
  function collect(name: string) {
    if (closure.has(name)) return
    closure.add(name)
    itemMap
      .get(name)
      ?.dependencies.forEach((dependency) =>
        collect(dependency.replace("@fabricator/", ""))
      )
  }
  collect(item.name)
  const files = [
    ...new Set(
      [...closure].flatMap(
        (name) =>
          itemMap
            .get(name)
            ?.files.filter((file) => file.path.endsWith(".kt"))
            .map((file) => resolve(authoredRoot, file.path)) ?? []
      )
    ),
  ]
  const combined = files
    .map((file) => sourceContents.get(file) ?? "")
    .join("\n")
  const definitions = new Set(
    [
      ...combined.matchAll(
        /(?:class|object|interface|fun)\s+(?:<[^>]+>\s*)?(Fabricator\w+)/g
      ),
    ].map((match) => match[1])
  )
  const references = new Set(
    [...combined.matchAll(/\b(Fabricator\w+)\s*(?:\(|\.|<)/g)].map(
      (match) => match[1]
    )
  )
  for (const reference of references)
    if (reference && !definitions.has(reference))
      errors.push(
        `Unresolved Fabricator symbol ${reference} in ${item.name} installation closure`
      )
}
if (errors.length) {
  process.stderr.write(errors.join("\n") + "\n")
  process.exit(1)
}
process.stdout.write(
  `Compose source inventory: ${contract.items.length} routes, ${manifest.items.length} registry items, all files and dependencies resolved. Native compilation is a separate check.\n`
)
