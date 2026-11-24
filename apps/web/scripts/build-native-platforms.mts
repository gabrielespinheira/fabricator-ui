import { execFile } from "node:child_process"
import { promises as fs } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { promisify } from "node:util"
import { z } from "zod"

import {
  NATIVE_LANGUAGE_RENDERERS,
  nativeFileItemSchema,
  resolveNativeItems,
  type NativeLanguageRenderer,
} from "../../../packages/cli/src/utils/native-files"
import { buildPlatformContract } from "./build-platform-contract.mjs"
import { getNativeApiName, hasNativeDeclaration } from "./native-platforms"

const manifestFileSchema = z.union([
  z.string(),
  z.object({ path: z.string(), target: z.string() }),
])
const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  renderer: z.enum(["swiftui", "compose"]),
  items: z.array(
    z.object({
      name: z.string(),
      title: z.string().optional(),
      files: z.array(manifestFileSchema),
      dependencies: z.array(z.string()).default([]),
    })
  ),
})

async function writeIfChanged(file: string, content: string) {
  if ((await fs.readFile(file, "utf8").catch(() => null)) === content) return
  await fs.mkdir(path.dirname(file), { recursive: true })
  await fs.writeFile(file, content)
}

export async function buildNativePlatforms(
  renderers: readonly NativeLanguageRenderer[] = NATIVE_LANGUAGE_RENDERERS
) {
  const contract = await buildPlatformContract()
  const root = process.cwd()
  const repository = path.resolve(root, "../..")
  for (const renderer of renderers) {
    const adapter =
      renderer === "swiftui"
        ? "apps/web/scripts/swiftui/sync-contract.ts"
        : "apps/web/scripts/compose/generate-contract.ts"
    await promisify(execFile)(
      process.execPath,
      ["run", path.join(repository, adapter)],
      { cwd: repository }
    )
    const metadata =
      renderer === "swiftui"
        ? "apps/web/scripts/swiftui/build-manifest.ts"
        : "apps/web/scripts/compose/generate-manifest.ts"
    await promisify(execFile)(
      process.execPath,
      ["run", path.join(repository, metadata)],
      { cwd: repository }
    )
    const source = path.join(root, "registry", renderer)
    const manifest = manifestSchema.parse(
      JSON.parse(await fs.readFile(path.join(source, "manifest.json"), "utf8"))
    )
    if (manifest.renderer !== renderer)
      throw new Error(`Native manifest renderer mismatch: ${renderer}`)
    const names = new Set(manifest.items.map(({ name }) => name))
    if (names.size !== manifest.items.length)
      throw new Error(`Duplicate ${renderer} registry owners.`)
    const missing = contract.items.filter(({ name }) => !names.has(name))
    if (missing.length)
      throw new Error(
        `${renderer} is missing registry ownership: ${missing.map(({ name }) => name).join(", ")}`
      )
    const published: z.output<typeof nativeFileItemSchema>[] = []
    for (const item of manifest.items) {
      for (const dependency of item.dependencies) {
        if (!names.has(dependency.replace(/^@fabricator\//, "")))
          throw new Error(
            `${renderer}/${item.name} has no dependency owner for ${dependency}`
          )
      }
      const files = []
      for (const entry of item.files) {
        const file =
          typeof entry === "string" ? { path: entry, target: entry } : entry
        const absolute = path.resolve(source, file.path)
        if (path.relative(repository, absolute).startsWith(".."))
          throw new Error(`Native source outside repository: ${file.path}`)
        const buffer = await fs.readFile(absolute)
        const encoding = /\.(bin|ttf|otf|wav|mp3|mp4|png|jpg)$/.test(
          file.target
        )
          ? "base64"
          : "utf8"
        files.push({
          path: file.target,
          target: file.target,
          content: buffer.toString(encoding),
          encoding,
        })
      }
      const payload = nativeFileItemSchema.parse({
        schemaVersion: 1,
        renderer,
        name: item.name,
        title:
          item.title ??
          contract.items.find(({ name }) => name === item.name)?.title ??
          item.name,
        registryDependencies: item.dependencies,
        files,
      })
      published.push(payload)
      await writeIfChanged(
        path.join(root, "public/r", renderer, `${item.name}.json`),
        `${JSON.stringify(payload, null, 2)}\n`
      )
    }
    await resolveNativeItems([...names], renderer, async (name) =>
      published.find((item) => item.name === name)
    )
    for (const item of contract.items.filter(
      ({ type }) => type !== "registry:block"
    )) {
      const closure = await resolveNativeItems(
        [item.name],
        renderer,
        async (name) => published.find((candidate) => candidate.name === name)
      )
      const api = getNativeApiName(item.name, renderer)
      const sources = closure.flatMap(({ files }) =>
        files
          .filter(({ path: filePath }) => /\.(swift|kt)$/.test(filePath))
          .map(({ content }) => content)
      )
      if (!hasNativeDeclaration(api, sources))
        throw new Error(
          `${renderer}/${item.name} has no declared ${api} API in its source dependency closure.`
        )
    }
    await writeIfChanged(
      path.join(root, "public/r", renderer, "registry.json"),
      `${JSON.stringify({ schemaVersion: 1, renderer, items: published.map(({ files: _files, ...item }) => item) }, null, 2)}\n`
    )
    console.info(
      `${renderer}: ${published.length} registry owners, ${contract.items.length} catalog entries accounted for.`
    )
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const requested = process.argv.indexOf("--renderer")
  const renderers =
    requested < 0
      ? NATIVE_LANGUAGE_RENDERERS
      : [z.enum(NATIVE_LANGUAGE_RENDERERS).parse(process.argv[requested + 1])]
  await buildNativePlatforms(renderers)
}
