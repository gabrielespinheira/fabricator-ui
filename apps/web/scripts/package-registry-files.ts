import { readFile } from "node:fs/promises"
import path from "node:path"
import { registryItemSchema } from "shadcn/schema"

export async function readPackageRegistryFiles(
  registry: string,
  prefix: string,
  items: readonly string[]
) {
  const files = new Map<string, string>()
  const visited = new Set<string>()
  const queue = [...items]
  for (const name of queue) {
    if (visited.has(name)) continue
    visited.add(name)
    const item = registryItemSchema.parse(
      JSON.parse(await readFile(path.join(registry, `${name}.json`), "utf8"))
    )
    for (const dependency of item.registryDependencies ?? []) {
      const dependencyName = /^@fabricator\/([a-z0-9-]+)$/.exec(dependency)?.[1]
      if (!dependencyName)
        throw new Error(
          `Unsupported registry dependency ${dependency} for ${name}`
        )
      queue.push(dependencyName)
    }
    for (const file of item.files ?? []) {
      const filename = file.path.slice(prefix.length)
      if (
        !file.path.startsWith(prefix) ||
        !file.content ||
        !/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.tsx?$/.test(filename)
      ) {
        throw new Error(`Unsupported package file ${file.path} for ${name}`)
      }
      const previous = files.get(filename)
      if (previous !== undefined && previous !== file.content)
        throw new Error(`Conflicting registry file ${filename}`)
      files.set(filename, file.content)
    }
  }
  return files
}
