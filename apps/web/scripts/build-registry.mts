import { spawn } from "child_process"
import { createHash } from "crypto"
import { promises as fs } from "fs"
import { createRequire } from "module"
import { availableParallelism } from "os"
import path from "path"
import { fileURLToPath } from "url"
import { parseArgs } from "util"
import prettier from "prettier"
import { rimraf } from "rimraf"
import { registrySchema, type RegistryItem } from "shadcn/schema"
import {
  createStyleMap,
  transformDirection,
  transformIcons,
  transformStyle,
} from "shadcn/utils"
import { Project, ScriptKind } from "ts-morph"

import { legacyStyles } from "@/registry/_legacy-styles"
import { BASE_COLORS } from "@/registry/base-colors"
import { BASES, type Base } from "@/registry/bases"
import { PRESETS } from "@/registry/config"
import { toFabricatorStylesheet } from "@/registry/fabricator/foundations"
import {
  FABRICATOR_REQUIRED_ITEMS,
  fabricatorItems,
  fabricatorOverrides,
} from "@/registry/fabricator/registry"
import {
  FABRICATOR_NAMESPACE,
  FABRICATOR_REGISTRY,
  FABRICATOR_STYLES,
  getFabricatorSiteUrl,
  isFabricatorStyleName,
} from "@/registry/fabricator"
import { fonts } from "@/registry/fonts"
import { STYLES } from "@/registry/styles"

/*
 * build-registry.mts is the single v4 registry pipeline.
 *
 * Source of truth:
 * - Authored raw component/registry source lives in registry/bases/base and
 *   registry/bases/radix.
 * - Authored demo source lives in examples/base and examples/radix.
 * - Style tokens live in registry/styles/style-*.css.
 *
 * Persistent outputs:
 * - registry/bases/__index__.tsx
 * - registry/__index__.tsx
 * - examples/__index__.tsx
 * - styles/<base-style>/ui/*
 * - styles/<base-style>/ui-rtl/* for base-nova and radix-nova only
 * - public/r/*
 *
 * Temporary outputs:
 * - registry/<base-style>/*
 * - registry-<style>.json
 *
 * Execution order:
 * 1. Build registry/bases/__index__.tsx from the authored base registries.
 * 2. Build temporary styled registries under registry/<base-style>.
 * 3. Build registry/__index__.tsx for runtime lookup across legacy styles and
 *    generated base-style combinations.
 * 4. Build examples/__index__.tsx from authored demos.
 * 5. Export public/r/* for every style through the shadcn CLI.
 * 6. Copy compiled ui/* from the temporary registries into styles/<style>/ui.
 * 7. Build styles/<style>/ui-rtl for base-nova and radix-nova only.
 * 8. Format the generated persistent outputs.
 * 9. Clean up the temporary registry/<base-style> trees and registry-*.json.
 *
 * Targeted modes (see parseBuildOptions):
 * - --examples rebuilds examples/__index__.tsx only.
 * - --indexes rebuilds the runtime registry indexes only.
 * - --style <style|all> rebuilds local styles/<style>/ui (+ ui-rtl).
 * - --registry <style|all> rebuilds installable public/r/styles/<style>.
 * Running with no options performs the full build described above.
 */

const UPSTREAM_ITEM_SCHEMA_URL =
  "https://ui.shadcn.com/schema/registry-item.json"
const FABRICATOR_ITEM_SCHEMA_URL = `${FABRICATOR_REGISTRY.homepage}/schema/registry-item.json`

// Fabricator-only files that compiled components import (lib/fluid-hover…),
// copied next to the compiled ui for the website (see copyUIToStyles).
const FABRICATOR_SITE_FILES = (fabricatorItems as RegistryItem[])
  .flatMap((item) => item.files ?? [])
  .map((file) => file.path)
  .filter((filePath) => !filePath.startsWith("ui/"))

// Fabricator-style copies of the demos (see buildStyledExamples).
const STYLED_EXAMPLES_DIR = "examples/__styles__"

// Upstream styles plus Fabricator styles, compiled by the same pipeline.
const REGISTRY_STYLES: ReadonlyArray<{ name: string; title: string }> = [
  ...STYLES,
  ...FABRICATOR_STYLES,
]

const STYLE_COMBINATIONS = Array.from(BASES).flatMap((base) =>
  REGISTRY_STYLES.map((style) => ({
    base,
    style,
    name: `${base.name}-${style.name}`,
    title: `${base.title} ${style.title}`,
  }))
)

const CPU_COUNT = availableParallelism()
const STYLE_BUILD_CONCURRENCY = Math.max(1, Math.min(CPU_COUNT, 4))
const FILE_BUILD_CONCURRENCY = Math.max(4, Math.min(CPU_COUNT, 8))
const COPY_CONCURRENCY = Math.max(4, Math.min(CPU_COUNT, 8))
const CLI_BUILD_CONCURRENCY = Math.max(
  1,
  Math.min(Math.floor(CPU_COUNT / 2), 4)
)
const TRANSFORM_CACHE_VERSION = "3"
const CACHE_ROOT = path.join(
  process.cwd(),
  "node_modules/.cache/build-registry"
)
const TRANSFORM_CACHE_ROOT = path.join(CACHE_ROOT, "transforms")
const TRANSFORM_CACHE_MANIFEST_PATH = path.join(
  CACHE_ROOT,
  "transform-manifest.json"
)
const GENERATED_REGISTRY_CACHE_PATHS = new Set([
  "registry/__blocks__.json",
  "registry/__index__.tsx",
  "registry/bases/__index__.tsx",
])

// Sharded component maps live in directories (one shard per style plus an
// index.tsx dispatcher), so exclusion is by prefix rather than exact path.
const GENERATED_REGISTRY_CACHE_PREFIXES = [
  "registry/__components__/",
  "registry/bases/__components__/",
]

type TransformCacheManifestEntry = {
  inputHash: string
  outputHash: string
}

const transformCacheManifest = new Map<string, TransformCacheManifestEntry>()
let transformCacheDirty = false
let prettierConfigPromise: Promise<prettier.Options | null> | null = null

// Generated output is prettier-formatted in the full (prod) build. Targeted dev
// builds skip formatting for speed; the next full build re-canonicalizes
// everything. The transform cache always stores formatted content (see
// getCachedStyledContent), so a full build never reads an unformatted entry.
let shouldFormatOutput = true
const resolveFromScript = createRequire(import.meta.url).resolve
// The shadcn CLI from npm builds each style's registry.json into public/r.
// `shadcn/package.json` is not exported, so resolve a public entry and walk up
// from `<pkg>/dist/utils/index.js` to the package root.
const SHADCN_CLI_PATH = path.join(
  resolveFromScript("shadcn/utils").replace(/[\\/]dist[\\/].*$/, ""),
  "dist/index.js"
)

const iconProject = new Project({
  compilerOptions: {},
})

function getStylesToBuild() {
  const stylesToBuild = new Map<string, { name: string; title: string }>()

  for (const style of legacyStyles) {
    stylesToBuild.set(style.name, style)
  }

  for (const style of STYLE_COMBINATIONS) {
    stylesToBuild.set(style.name, {
      name: style.name,
      title: style.title,
    })
  }

  return Array.from(stylesToBuild.values())
}

function getStyleCombination(styleName: string) {
  return STYLE_COMBINATIONS.find((style) => style.name === styleName) ?? null
}

type BuildOptions = {
  examples: boolean
  indexes: boolean
  style: "all" | string | null
  registry: "all" | string | null
}

const USAGE = `Usage: registry:build [options]

Run with no options for a full registry build, or target a single artifact:

  --examples              Rebuild examples/__index__.tsx only.
  --indexes               Rebuild the runtime registry indexes only.
  --style <style|all>     Rebuild local generated style files under styles/<style>/ui.
  --registry <style|all>  Rebuild installable registry JSON under public/r/styles/<style>.

<style> must be "all" or a known final style id (e.g. base-nova, radix-nova, base-sera, new-york-v4).
Flags can be combined, e.g. --style base-nova --registry base-nova.`

function getKnownStyleNames() {
  return new Set(getStylesToBuild().map((style) => style.name))
}

function assertKnownTarget(flag: "--style" | "--registry", target: string) {
  if (target === "all") {
    return
  }

  const knownStyleNames = getKnownStyleNames()
  if (!knownStyleNames.has(target)) {
    const valid = ["all", ...Array.from(knownStyleNames)].join(", ")
    throw new Error(
      `Unknown ${flag} target "${target}". Valid targets: ${valid}.\n\n${USAGE}`
    )
  }
}

function parseBuildOptions(argv: string[]): BuildOptions {
  let values: {
    examples?: boolean
    indexes?: boolean
    style?: string
    registry?: string
  }

  try {
    ;({ values } = parseArgs({
      args: argv,
      options: {
        examples: { type: "boolean" },
        indexes: { type: "boolean" },
        style: { type: "string" },
        registry: { type: "string" },
      },
      allowPositionals: false,
      strict: true,
    }))
  } catch (error) {
    throw new Error(`${(error as Error).message}\n\n${USAGE}`)
  }

  if (values.style !== undefined) {
    assertKnownTarget("--style", values.style)
  }
  if (values.registry !== undefined) {
    assertKnownTarget("--registry", values.registry)
  }

  return {
    examples: values.examples ?? false,
    indexes: values.indexes ?? false,
    style: values.style ?? null,
    registry: values.registry ?? null,
  }
}

function isFullBuild(options: BuildOptions) {
  return (
    !options.examples &&
    !options.indexes &&
    options.style === null &&
    options.registry === null
  )
}

function getTargetStyles(target: "all" | string | null) {
  const stylesToBuild = getStylesToBuild()

  if (target === "all") {
    return stylesToBuild
  }

  return stylesToBuild.filter((style) => style.name === target)
}

function stripFileExtension(filePath: string) {
  return filePath.replace(/\.(tsx|ts|json|mdx)$/, "")
}

// Emits the React.lazy() expression used in the generated __components__ files.
// Components live in their own index, separate from registry metadata, so that
// metadata-only consumers (docs, registry JSON, llm/md routes) don't pull all
// component dynamic imports into their module graph — which previously inflated
// dev-server memory.
function lazyComponentExpression(componentPath: string, name: string) {
  return `React.lazy(async () => {
        const mod = await import("${componentPath}")
        const exportName = Object.keys(mod).find(key => typeof mod[key] === 'function' || typeof mod[key] === 'object') || "${name}"
        return { default: mod.default || mod[exportName] }
      })`
}

type ComponentShard = {
  key: string
  entries: string
  names: string[]
}

// Writes a sharded component map: one <key>.tsx per style/base holding that
// style's React.lazy entries, plus an index.tsx dispatcher that loads shards
// on demand. A single flat map put every style's dynamic-import edges into
// every consumer's module graph (~3,800 edges on a docs page), which made the
// dev server compile the whole registry universe per route.
async function writeComponentShards(
  outputDir: string,
  shards: ComponentShard[]
) {
  const header = `// @ts-nocheck
// This file is autogenerated by scripts/build-registry.mts
// Do not edit this file directly.
import "server-only"

import * as React from "react"
`

  // Remove the legacy single-file map so the "@/…/__components__" specifier
  // resolves to the directory's index.tsx.
  await fs.rm(`${outputDir}.tsx`, { force: true })
  await fs.mkdir(outputDir, { recursive: true })

  for (const shard of shards) {
    const source = `${header}
export const Components: Record<string, any> = {${shard.entries}
}
`
    const shardPath = path.join(outputDir, `${shard.key}.tsx`)
    await writeIfChanged(
      shardPath,
      await formatGeneratedSource(source, shardPath)
    )
  }

  let dispatcher = `${header}
const shards: Record<
  string,
  { load: () => Promise<{ Components: Record<string, any> }>; names: Set<string> }
> = {`

  for (const shard of shards) {
    dispatcher += `
  "${shard.key}": {
    load: () => import("./${shard.key}"),
    names: new Set(${JSON.stringify(shard.names)}),
  },`
  }

  dispatcher += `
}

const cache = new Map<string, any>()

// Sync existence check via the names set; the shard module (and with it the
// component's dynamic-import subtree) only loads when the component renders.
export function getComponent(styleName: string, name: string) {
  const shard = shards[styleName]
  if (!shard?.names.has(name)) {
    return undefined
  }

  const cacheKey = \`\${styleName}:\${name}\`
  let component = cache.get(cacheKey)
  if (!component) {
    component = React.lazy(async () => {
      const { Components } = await shard.load()
      return { default: Components[name] }
    })
    cache.set(cacheKey, component)
  }

  return component
}
`

  const indexPath = path.join(outputDir, "index.tsx")
  await writeIfChanged(
    indexPath,
    await formatGeneratedSource(dispatcher, indexPath)
  )

  // Drop shards for styles that no longer exist.
  const expectedFiles = new Set([
    ...shards.map((shard) => `${shard.key}.tsx`),
    "index.tsx",
  ])
  for (const entry of await fs.readdir(outputDir)) {
    if (!expectedFiles.has(entry)) {
      await fs.rm(path.join(outputDir, entry), { force: true })
    }
  }
}

function normalizeRegistryFiles(item: RegistryItem): Array<{
  path: string
  type: string
  target?: string
}> {
  return (
    item.files?.map((file) => ({
      path: typeof file === "string" ? file : file.path,
      type: typeof file === "string" ? item.type : file.type,
      target: typeof file === "string" ? undefined : file.target,
    })) ?? []
  )
}

function shouldGenerateRtlStyles(styleName: string) {
  return (
    styleName === "base-nova" ||
    styleName === "radix-nova" ||
    styleName === "aria-nova" ||
    // The docs render RTL demos in the Fabricator style too (lib/site-style.ts).
    isFabricatorStyleName(styleName)
  )
}

function isStyledOutputFile(filePath: string) {
  return filePath.startsWith("ui/")
}

function shouldIncludeStyledRegistryItem(item: RegistryItem) {
  return item.type === "registry:ui"
}

function getTemporaryRegistryRoot(styleName: string) {
  return path.join(process.cwd(), `registry/${styleName}`)
}

function getPersistentStyleRoot(styleName: string) {
  return path.join(process.cwd(), "styles", styleName)
}

function hashContent(...parts: string[]) {
  const hash = createHash("sha256")

  for (const part of parts) {
    hash.update(part)
    hash.update("\0")
  }

  return hash.digest("hex")
}

async function getTransformCacheHash() {
  const [implementationHash, registryHash] = await Promise.all([
    getTransformImplementationHash(),
    getAuthoredRegistryHash(),
  ])

  return hashContent(implementationHash, registryHash)
}

async function getTransformImplementationHash() {
  const dependencyFiles = [
    fileURLToPath(import.meta.url),
    resolveFromScript("shadcn/utils"),
    path.resolve(process.cwd(), "../../bun.lock"),
  ]
  const dependencyContent = await Promise.all(
    dependencyFiles.map(async (filePath) => {
      const content = await readFileIfExists(filePath)
      const relativePath = toPosixPath(path.relative(process.cwd(), filePath))

      return `${relativePath}\0${content ?? "missing"}`
    })
  )

  return hashContent(...dependencyContent)
}

async function getAuthoredRegistryHash() {
  const registryRoot = path.join(process.cwd(), "registry")
  const filePaths = await getCacheableRegistryFiles(registryRoot)
  const fileContent = await Promise.all(
    filePaths.map(async (filePath) => {
      const relativePath = toPosixPath(path.relative(process.cwd(), filePath))
      const content = await fs.readFile(filePath, "utf8")

      return `${relativePath}\0${content}`
    })
  )

  return hashContent(...fileContent)
}

async function getCacheableRegistryFiles(dirPath: string): Promise<string[]> {
  const entries = await readDirectoryEntries(dirPath)
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name)
      const relativePath = toPosixPath(path.relative(process.cwd(), entryPath))

      if (shouldSkipRegistryCachePath(relativePath)) {
        return []
      }

      if (entry.isDirectory()) {
        return getCacheableRegistryFiles(entryPath)
      }

      if (!entry.isFile()) {
        return []
      }

      return [entryPath]
    })
  )

  return files.flat().sort((a, b) => a.localeCompare(b))
}

function shouldSkipRegistryCachePath(relativePath: string) {
  if (GENERATED_REGISTRY_CACHE_PATHS.has(relativePath)) {
    return true
  }

  if (
    GENERATED_REGISTRY_CACHE_PREFIXES.some((prefix) =>
      relativePath.startsWith(prefix)
    )
  ) {
    return true
  }

  return STYLE_COMBINATIONS.some((style) =>
    relativePath.startsWith(`registry/${style.name}/`)
  )
}

function toPosixPath(filePath: string) {
  return filePath.split(path.sep).join("/")
}

async function readFileIfExists(filePath: string) {
  try {
    return await fs.readFile(filePath, "utf8")
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null
    }

    throw error
  }
}

async function writeIfChanged(filePath: string, content: string) {
  const existingContent = await readFileIfExists(filePath)
  if (existingContent === content) {
    return false
  }

  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)

  return true
}

async function formatSource(content: string, filePath: string) {
  prettierConfigPromise ??= prettier.resolveConfig(
    path.join(process.cwd(), "package.json")
  )

  const prettierConfig = (await prettierConfigPromise) ?? {}

  return prettier.format(content, {
    ...prettierConfig,
    filepath: filePath,
  })
}

async function formatGeneratedSource(content: string, filePath: string) {
  if (!shouldFormatOutput) {
    return content
  }

  return formatSource(content, filePath)
}

async function formatGeneratedJson(value: unknown, filePath: string) {
  return formatGeneratedSource(JSON.stringify(value, null, 2), filePath)
}

async function loadTransformCache() {
  const existingManifest = await readFileIfExists(TRANSFORM_CACHE_MANIFEST_PATH)
  if (!existingManifest) {
    return
  }

  const payload = JSON.parse(existingManifest) as Record<string, unknown>

  for (const [key, value] of Object.entries(payload)) {
    if (isTransformCacheManifestEntry(value)) {
      transformCacheManifest.set(key, value)
    }
  }
}

function isTransformCacheManifestEntry(
  value: unknown
): value is TransformCacheManifestEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    "inputHash" in value &&
    "outputHash" in value &&
    typeof value.inputHash === "string" &&
    typeof value.outputHash === "string"
  )
}

async function saveTransformCache() {
  if (!transformCacheDirty) {
    return
  }

  await fs.mkdir(CACHE_ROOT, { recursive: true })

  const payload = Object.fromEntries(
    Array.from(transformCacheManifest.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    )
  )

  await fs.writeFile(
    TRANSFORM_CACHE_MANIFEST_PATH,
    JSON.stringify(payload, null, 2)
  )

  transformCacheDirty = false
}

async function getCachedStyledContent({
  styleName,
  baseName,
  filePath,
  source,
  styleHash,
  transformCacheHash,
  styleMap,
}: {
  styleName: string
  baseName: string
  filePath: string
  source: string
  styleHash: string
  transformCacheHash: string
  styleMap: Record<string, string>
}) {
  const cacheKey = `${styleName}:${filePath}`
  const cachePath = path.join(TRANSFORM_CACHE_ROOT, styleName, filePath)
  const inputHash = hashContent(
    TRANSFORM_CACHE_VERSION,
    styleName,
    baseName,
    filePath,
    transformCacheHash,
    styleHash,
    source
  )

  const cachedEntry = transformCacheManifest.get(cacheKey)
  if (cachedEntry?.inputHash === inputHash) {
    const cachedContent = await readFileIfExists(cachePath)
    if (
      cachedContent !== null &&
      hashContent(cachedContent) === cachedEntry.outputHash
    ) {
      return cachedContent
    }
  }

  let transformedContent = await transformStyle(source, { styleMap })
  transformedContent = transformedContent.replace(
    new RegExp(`@/registry/bases/${baseName}/`, "g"),
    `@/registry/${styleName}/`
  )
  // Always format cached content so a later full build never reads an
  // unformatted entry produced by a targeted dev build.
  transformedContent = await formatSource(
    transformedContent,
    path.join(getTemporaryRegistryRoot(styleName), filePath)
  )

  await fs.mkdir(path.dirname(cachePath), { recursive: true })
  await fs.writeFile(cachePath, transformedContent)

  const outputHash = hashContent(transformedContent)
  const nextEntry = { inputHash, outputHash }
  if (
    cachedEntry?.inputHash !== nextEntry.inputHash ||
    cachedEntry?.outputHash !== nextEntry.outputHash
  ) {
    transformCacheManifest.set(cacheKey, nextEntry)
    transformCacheDirty = true
  }

  return transformedContent
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
) {
  const results = new Array<R>(items.length)
  let currentIndex = 0

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (true) {
        const index = currentIndex++
        if (index >= items.length) {
          return
        }

        results[index] = await worker(items[index], index)
      }
    })
  )

  return results
}

try {
  const totalStart = performance.now()
  const options = parseBuildOptions(process.argv.slice(2))

  // Cheap, and later steps read their output, so they run on every build.
  await buildFabricatorStylesheet()
  await buildFabricatorStyleMap()

  if (isFullBuild(options)) {
    await runFullBuild()
  } else {
    await runTargetedBuild(options)
  }

  const elapsed = ((performance.now() - totalStart) / 1000).toFixed(2)
  console.log(`\n✅ Build complete in ${elapsed}s!`)
} catch (error) {
  await saveTransformCache().catch(console.error)
  console.error(error)
  process.exit(1)
}

async function runFullBuild() {
  await loadTransformCache()

  console.log("\n🏗️ Building bases...")
  await buildBasesIndex(Array.from(BASES))
  await buildBases(Array.from(BASES))

  const stylesToBuild = getStylesToBuild()

  console.log("\n📦 Building registry/__index__.tsx...")
  await buildRegistryIndex(stylesToBuild)

  console.log("\n📋 Building examples/__index__.tsx...")
  await buildExamplesIndex()

  console.log("\n💅 Building styles...")
  await runWithConcurrency(
    stylesToBuild,
    CLI_BUILD_CONCURRENCY,
    async (style) => {
      await buildRegistryJsonFile(style.name)
      await buildRegistry(style.name)

      console.log(`   ✅ ${style.name}`)
    }
  )

  console.log("\n🗂️ Building registry/__blocks__.json...")
  await buildBlocksIndex()

  console.log("\n⚙️ Building public/r/config.json...")
  await buildConfig()

  console.log("\n📦 Building public/r/index.json...")
  await buildIndex()

  console.log("\n🎨 Building public/r/colors...")
  await buildColors()

  console.log("\n📋 Copying compiled ui to styles...")
  await copyUIToStyles()

  console.log("\n🔄 Building RTL styles...")
  await buildRtlStyles()

  console.log("\n🧹 Cleaning up...")
  await cleanUpTemporaryFiles(stylesToBuild.map((style) => style.name))
  await saveTransformCache()
}

async function runTargetedBuild(options: BuildOptions) {
  // Targeted builds are for quick dev iteration: skip prettier on generated
  // output. The full (prod) build re-formats everything to its canonical state.
  shouldFormatOutput = false

  await loadTransformCache()

  // Phases run in dependency-safe order: indexes and examples write the runtime
  // lookup files first, the targeted style build copies compiled ui into
  // styles/<style>, and the targeted registry build exports public/r last.
  if (options.indexes) {
    await runIndexesBuild()
  }

  if (options.examples) {
    await runExamplesBuild()
  }

  if (options.style !== null) {
    await runTargetedStyleBuild(options.style)
  }

  if (options.registry !== null) {
    await runTargetedRegistryBuild(options.registry)
  }

  await saveTransformCache()
}

async function runIndexesBuild() {
  console.log("🏗️ Building registry/bases/__index__.tsx...")
  await buildBasesIndex(Array.from(BASES))

  console.log("\n📦 Building registry/__index__.tsx...")
  await buildRegistryIndex(getStylesToBuild())

  console.log("\n🗂️ Building registry/__blocks__.json...")
  await buildBlocksIndex()

  console.log("\n📦 Building public/r/index.json...")
  await buildIndex()
}

async function runExamplesBuild() {
  console.log("📋 Building examples/__index__.tsx...")
  await buildExamplesIndex()
}

async function runTargetedStyleBuild(target: "all" | string) {
  if (target !== "all" && !getStyleCombination(target)) {
    throw new Error(
      `--style ${target} is not supported because it is a legacy source registry. Use --registry ${target}.`
    )
  }

  // styles/<style>/ui only exists for generated base/style combinations, so we
  // skip legacy source styles (e.g. new-york-v4) when targeting "all".
  const targetStyles = getTargetStyles(target).filter((style) =>
    getStyleCombination(style.name)
  )
  const targetStyleNames = new Set(targetStyles.map((style) => style.name))

  if (targetStyleNames.size === 0) {
    console.log("   No generated styles to build.")
    return
  }

  console.log("💅 Building styles...")
  await buildBases(Array.from(BASES), targetStyleNames)

  console.log("\n📋 Copying compiled ui to styles...")
  await copyUIToStyles(targetStyleNames)

  console.log("\n🔄 Building RTL styles...")
  await buildRtlStyles(targetStyleNames)

  console.log("\n🧹 Cleaning up...")
  await cleanUpTemporaryFiles(Array.from(targetStyleNames))
}

async function runTargetedRegistryBuild(target: "all" | string) {
  const targetStyles = getTargetStyles(target)
  const comboStyleNames = new Set(
    targetStyles
      .filter((style) => getStyleCombination(style.name))
      .map((style) => style.name)
  )

  // Only generated base/style combinations need a temporary registry/<style>
  // tree. Legacy source styles (e.g. new-york-v4) already ship registry.ts.
  if (comboStyleNames.size > 0) {
    console.log("🏗️ Building bases...")
    await buildBases(Array.from(BASES), comboStyleNames)
  }

  console.log("\n💅 Building registry...")
  await runWithConcurrency(
    targetStyles,
    CLI_BUILD_CONCURRENCY,
    async (style) => {
      await buildRegistryJsonFile(style.name)
      await buildRegistry(style.name)
      console.log(`   ✅ ${style.name}`)
    }
  )

  console.log("\n🧹 Cleaning up...")
  await cleanUpTemporaryFiles(targetStyles.map((style) => style.name))
}

async function buildBasesIndex(bases: Base[]) {
  const registryImports = await Promise.all(
    bases.map(async (base) => {
      const { registry: importedRegistry } = await import(
        `../registry/bases/${base.name}/registry.ts`
      )
      return { base, importedRegistry }
    })
  )

  let index = `// @ts-nocheck
// This file is autogenerated by scripts/build-registry.ts
// Do not edit this file directly.
import "server-only"

export const Index: Record<string, Record<string, any>> = {`

  const componentShards: ComponentShard[] = []

  for (const { base, importedRegistry } of registryImports) {
    const parseResult = registrySchema.safeParse(importedRegistry)
    if (!parseResult.success) {
      console.error(`❌ Registry validation failed for ${base.name}:`)
      console.error(parseResult.error.format())
      throw new Error(`Invalid registry schema for ${base.name}`)
    }

    const registry = parseResult.data

    index += `
  "${base.name}": {`
    const shard: ComponentShard = { key: base.name, entries: "", names: [] }

    for (const item of registry.items) {
      if (item.type === "registry:internal") {
        continue
      }

      const files = normalizeRegistryFiles(item)

      if (files.length === 0) {
        continue
      }

      const componentPath = files[0]?.path
        ? `@/registry/bases/${base.name}/${stripFileExtension(files[0].path)}`
        : ""

      index += `
    "${item.name}": {
      name: "${item.name}",
      title: "${item.title}",
      description: "${item.description ?? ""}",
      type: "${item.type}",
      registryDependencies: ${JSON.stringify(item.registryDependencies)},
      files: [${files.map((file) => {
        const filePath = `registry/bases/${base.name}/${file.path}`
        return `{
        path: "${filePath}",
        type: "${file.type}",
        target: "${file.target ?? ""}"
      }`
      })}],
      categories: ${JSON.stringify(item.categories)},
      meta: ${JSON.stringify(item.meta)},
    },`

      if (componentPath) {
        shard.entries += `
  "${item.name}": ${lazyComponentExpression(componentPath, item.name)},`
        shard.names.push(item.name)
      }
    }

    index += `
  },`
    componentShards.push(shard)
  }

  index += `
}`

  const outputPath = path.join(process.cwd(), "registry/bases/__index__.tsx")
  await writeIfChanged(
    outputPath,
    await formatGeneratedSource(index, outputPath)
  )

  await writeComponentShards(
    path.join(process.cwd(), "registry/bases/__components__"),
    componentShards
  )
}

async function buildBases(bases: Base[], targetStyleNames?: Set<string>) {
  // For targeted builds, only load bases that contribute a requested
  // combination. Otherwise a single-base target (e.g. --style base-nova) would
  // still import and read every source file for the other base.
  const basesToBuild = targetStyleNames
    ? bases.filter((base) =>
        REGISTRY_STYLES.some((style) =>
          targetStyleNames.has(`${base.name}-${style.name}`)
        )
      )
    : bases

  const [baseImports, styleMaps, transformCacheHash] = await Promise.all([
    Promise.all(
      basesToBuild.map(async (base) => {
        const { registry: baseRegistry } = await import(
          `../registry/bases/${base.name}/registry.ts`
        )
        const result = registrySchema.safeParse(baseRegistry)
        if (!result.success) {
          console.error(`❌ Registry validation failed for ${base.name}:`)
          console.error(result.error.format())
          throw new Error(`Invalid registry schema for ${base.name}`)
        }

        const registryItems = result.data.items.filter(
          (item) => item.type !== "registry:internal"
        )

        const sourceFilePaths = Array.from(
          new Set(
            registryItems.flatMap((item) =>
              normalizeRegistryFiles(item).map((file) => file.path)
            )
          )
        )

        const sourceFiles = new Map(
          await Promise.all(
            sourceFilePaths.map(
              async (filePath): Promise<readonly [string, string]> =>
                [
                  filePath,
                  await fs.readFile(
                    path.join(
                      process.cwd(),
                      `registry/bases/${base.name}/${filePath}`
                    ),
                    "utf8"
                  ),
                ] as const
            )
          )
        )

        return {
          base,
          baseRegistry,
          registryItems,
          sourceFiles,
          fabricatorOverlay: await loadFabricatorOverlay(base.name),
        }
      })
    ),
    Promise.all(
      REGISTRY_STYLES.map(async (style) => {
        const styleContent = await fs.readFile(
          path.join(process.cwd(), `registry/styles/style-${style.name}.css`),
          "utf8"
        )
        return {
          style,
          styleHash: hashContent(styleContent),
          styleMap: createStyleMap(styleContent),
        }
      })
    ),
    getTransformCacheHash(),
  ])

  const combinations: Array<{
    base: Base
    style: (typeof REGISTRY_STYLES)[number]
    baseRegistry: (typeof baseImports)[number]["baseRegistry"]
    registryItems: (typeof baseImports)[number]["registryItems"]
    sourceFiles: (typeof baseImports)[number]["sourceFiles"]
    styleHash: string
    transformCacheHash: string
    styleMap: Record<string, string>
  }> = []

  for (const {
    base,
    baseRegistry,
    registryItems,
    sourceFiles,
    fabricatorOverlay,
  } of baseImports) {
    for (const { style, styleHash, styleMap } of styleMaps) {
      const styleName = `${base.name}-${style.name}`
      if (targetStyleNames && !targetStyleNames.has(styleName)) {
        continue
      }

      // Fabricator styles compile the base sources plus the Fabricator
      // overlay; upstream styles compile the base sources unchanged.
      const isFabricator = isFabricatorStyleName(styleName)

      combinations.push({
        base,
        style,
        baseRegistry,
        registryItems: isFabricator
          ? withFabricatorItems(registryItems, fabricatorOverlay)
          : registryItems,
        sourceFiles: isFabricator
          ? new Map([...sourceFiles, ...fabricatorOverlay])
          : sourceFiles,
        styleHash,
        transformCacheHash,
        styleMap,
      })
    }
  }

  await runWithConcurrency(
    combinations,
    STYLE_BUILD_CONCURRENCY,
    async ({
      base,
      style,
      baseRegistry,
      registryItems,
      sourceFiles,
      styleHash,
      transformCacheHash,
      styleMap,
    }) => {
      const styleName = `${base.name}-${style.name}`
      const styleOutputDir = getTemporaryRegistryRoot(styleName)

      console.log(`   ✅ ${styleName}...`)

      await rimraf(styleOutputDir)
      await fs.mkdir(styleOutputDir, { recursive: true })

      const styleRegistry = { ...baseRegistry, items: registryItems }
      const registryTs = `export const registry = ${JSON.stringify(styleRegistry, null, 2)}\n`
      await fs.writeFile(path.join(styleOutputDir, "registry.ts"), registryTs)

      const filesToBuild = registryItems.flatMap((registryItem) =>
        normalizeRegistryFiles(registryItem)
      )

      await runWithConcurrency(
        filesToBuild,
        FILE_BUILD_CONCURRENCY,
        async (file) => {
          const source = sourceFiles.get(file.path)
          if (typeof source !== "string") {
            throw new Error(
              `Missing cached source for ${base.name}/${file.path}`
            )
          }

          const fileExtension = path.extname(file.path)
          const shouldTransform =
            fileExtension === ".tsx" || fileExtension === ".ts"

          const transformedContent = shouldTransform
            ? await getCachedStyledContent({
                styleName,
                baseName: base.name,
                filePath: file.path,
                source,
                styleHash,
                transformCacheHash,
                styleMap,
              })
            : source

          const outputPath = path.join(styleOutputDir, file.path)
          await fs.mkdir(path.dirname(outputPath), { recursive: true })
          await fs.writeFile(outputPath, transformedContent)
        }
      )
    }
  )
}

// The Fabricator style map is authored as one file per component in
// registry/styles/fabricator/ and assembled into style-fabricator.css (the
// file the style-map compiler and the website read). Fails when a placeholder
// that the upstream components use has no Fabricator rule.
async function buildFabricatorStyleMap() {
  const partsDir = path.join(process.cwd(), "registry/styles/fabricator")
  const files = (await fs.readdir(partsDir))
    .filter((file) => file.endsWith(".css"))
    .sort()
  const parts = await Promise.all(
    files.map((file) => fs.readFile(path.join(partsDir, file), "utf8"))
  )
  const content = [
    "/* Generated from registry/styles/fabricator/*.css by scripts/build-registry.mts. Do not edit. */",
    `.style-fabricator {\n${parts.map((part) => part.trimEnd()).join("\n\n")}\n}`,
    "",
  ].join("\n")
  await writeIfChanged(
    path.join(process.cwd(), "registry/styles/style-fabricator.css"),
    content
  )

  const reference = createStyleMap(
    await fs.readFile(
      path.join(process.cwd(), "registry/styles/style-nova.css"),
      "utf8"
    )
  )
  const fabricator = createStyleMap(content)
  const missing = Object.keys(reference).filter((key) => !(key in fabricator))
  if (missing.length > 0) {
    throw new Error(
      `style-fabricator is missing rules for ${missing.length} placeholders (add them under registry/styles/fabricator/): ${missing.join(", ")}`
    )
  }
}

async function buildFabricatorStylesheet() {
  const outputPath = path.join(process.cwd(), "app/fabricator.css")
  await writeIfChanged(outputPath, toFabricatorStylesheet())
}

// Overlay files for Fabricator styles: shared first, then per-base, keyed by
// their path relative to the base root (e.g. "ui/dropdown-menu.tsx").
async function loadFabricatorOverlay(baseName: string) {
  const files = new Map<string, string>()
  for (const dir of ["shared", baseName]) {
    const root = path.join(process.cwd(), "registry/fabricator", dir)
    let entries: string[]
    try {
      entries = (await fs.readdir(root, { recursive: true })) as string[]
    } catch {
      continue
    }
    for (const entry of entries) {
      if (!/\.(ts|tsx)$/.test(entry)) continue
      const content = await fs.readFile(path.join(root, entry), "utf8")
      files.set(
        toPosixPath(entry),
        content.replaceAll(
          "@/registry/bases/__base__/",
          `@/registry/bases/${baseName}/`
        )
      )
    }
  }
  return files
}

function withFabricatorItems(
  items: RegistryItem[],
  overlay: Map<string, string>
): RegistryItem[] {
  const unique = (values: string[]) => Array.from(new Set(values))
  const overridden = items.map((item) => {
    const override = fabricatorOverrides[item.name]
    // Extra dependencies only apply where this base has an override file.
    const hasOverrideFile = normalizeRegistryFiles(item).some((file) =>
      overlay.has(file.path)
    )
    if (!override || !hasOverrideFile) return item
    return {
      ...item,
      dependencies: unique([
        ...(item.dependencies ?? []),
        ...(override.dependencies ?? []),
      ]),
      registryDependencies: unique([
        ...(item.registryDependencies ?? []),
        ...(override.registryDependencies ?? []),
      ]),
    }
  })
  const names = new Set(items.map((item) => item.name))
  return [
    ...overridden,
    ...(fabricatorItems as RegistryItem[]).filter((item) => !names.has(item.name)),
  ]
}

async function buildExamplesIndex() {
  const examplesDir = path.join(process.cwd(), "examples")

  const baseResults = await Promise.all(
    Array.from(BASES).map(async (base) => {
      const baseDir = path.join(examplesDir, base.name)

      try {
        await fs.access(baseDir)
      } catch {
        console.log(`   Skipping ${base.name} - directory does not exist`)
        return null
      }

      const files = await collectExampleFiles(baseDir)

      console.log(`   Found ${files.length} demos for ${base.name}`)

      return { baseName: base.name, files, dir: `examples/${base.name}` }
    })
  )

  let index = `// @ts-nocheck
// This file is autogenerated by scripts/build-registry.mts
// Do not edit this file directly.
import "server-only"

export const ExamplesIndex: Record<string, Record<string, any>> = {`

  const componentShards: ComponentShard[] = []

  // Fabricator styles get their own copy of every demo, rewritten to import
  // the compiled <base>-<fabricator style> components, so the docs can render
  // the Fabricator look. Lookups fall back to the base set (lib/registry.ts).
  const styledResults = await buildStyledExamples(
    baseResults.filter((result) => result !== null)
  )

  for (const result of [...baseResults, ...styledResults]) {
    if (!result) continue

    const { baseName, files } = result

    index += `
  "${baseName}": {`
    const shard: ComponentShard = { key: baseName, entries: "", names: [] }

    for (const file of files) {
      const name = file.replace(/\.tsx$/, "")

      index += `
    "${name}": {
      name: "${name}",
      filePath: "${result.dir}/${file}",
    },`

      shard.entries += `
  "${name}": ${lazyComponentExpression(`@/${result.dir}/${stripFileExtension(file)}`, name)},`
      shard.names.push(name)
    }

    index += `
  },`
    componentShards.push(shard)
  }

  index += `
}
`

  const outputPath = path.join(examplesDir, "__index__.tsx")
  await writeIfChanged(
    outputPath,
    await formatGeneratedSource(index, outputPath)
  )

  await writeComponentShards(
    path.join(examplesDir, "__components__"),
    componentShards
  )
}

async function buildStyledExamples(
  baseResults: Array<{ baseName: string; files: string[] }>
) {
  const examplesDir = path.join(process.cwd(), "examples")
  const results: Array<{ baseName: string; files: string[]; dir: string }> = []

  for (const { baseName, files } of baseResults) {
    for (const style of FABRICATOR_STYLES) {
      const key = `${baseName}-${style.name}`
      const dir = `${STYLED_EXAMPLES_DIR}/${key}`
      const outputDir = path.join(process.cwd(), dir)
      await fs.mkdir(outputDir, { recursive: true })

      await runWithConcurrency(files, FILE_BUILD_CONCURRENCY, async (file) => {
        const source = await fs.readFile(
          path.join(examplesDir, baseName, file),
          "utf8"
        )
        await writeIfChanged(
          path.join(outputDir, file),
          // No header comment: the docs show this file's source to readers.
          source.replace(
            /@\/styles\/(base|radix|aria)-[a-z0-9]+\//g,
            `@/styles/$1-${style.name}/`
          )
        )
      })

      // Drop copies of demos that were removed or renamed.
      const expected = new Set(files)
      for (const existing of await collectExampleFiles(outputDir)) {
        if (!expected.has(existing)) {
          await fs.rm(path.join(outputDir, existing))
        }
      }

      results.push({ baseName: key, files, dir })
      console.log(`   Generated ${files.length} ${key} demos`)
    }
  }

  return results
}

async function collectExampleFiles(
  dirPath: string,
  rootDir = dirPath
): Promise<string[]> {
  const entries = await readDirectoryEntries(dirPath)
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dirPath, entry.name)

      if (entry.isDirectory()) {
        return collectExampleFiles(entryPath, rootDir)
      }

      if (!entry.isFile() || !entry.name.endsWith(".tsx")) {
        return []
      }

      return [toPosixPath(path.relative(rootDir, entryPath))]
    })
  )

  return files.flat().sort((a, b) => a.localeCompare(b))
}

async function buildRegistryIndex(styles: { name: string; title: string }[]) {
  let index = `// @ts-nocheck
// This file is autogenerated by scripts/build-registry.ts
// Do not edit this file directly.
import "server-only"

export const Index: Record<string, Record<string, any>> = {`

  const componentShards: ComponentShard[] = []

  for (const style of styles) {
    const styleCombination = getStyleCombination(style.name)
    const { registry: importedRegistry } = styleCombination
      ? await import(
          `../registry/bases/${styleCombination.base.name}/registry.ts`
        )
      : await import(`../registry/${style.name}/registry.ts`)

    const parseResult = registrySchema.safeParse(importedRegistry)
    if (!parseResult.success) {
      console.error(`❌ Registry validation failed for ${style.name}:`)
      console.error(parseResult.error.format())
      throw new Error(`Invalid registry schema for ${style.name}`)
    }

    const registry = parseResult.data

    index += `
  "${style.name}": {`
    const shard: ComponentShard = { key: style.name, entries: "", names: [] }

    for (const item of registry.items) {
      if (item.type === "registry:internal") {
        continue
      }

      if (styleCombination && !shouldIncludeStyledRegistryItem(item)) {
        continue
      }

      const files = normalizeRegistryFiles(item)

      if (files.length === 0) {
        continue
      }

      const resolvedFiles = styleCombination
        ? files.map((file) => ({
            ...file,
            path: isStyledOutputFile(file.path)
              ? `styles/${style.name}/${file.path}`
              : `registry/bases/${styleCombination.base.name}/${file.path}`,
          }))
        : files.map((file) => ({
            ...file,
            path: `registry/${style.name}/${file.path}`,
          }))

      const componentPath = files[0]?.path
        ? styleCombination
          ? isStyledOutputFile(files[0].path)
            ? `@/styles/${style.name}/${stripFileExtension(files[0].path)}`
            : `@/registry/bases/${styleCombination.base.name}/${stripFileExtension(files[0].path)}`
          : `@/registry/${style.name}/${stripFileExtension(files[0].path)}`
        : ""

      index += `
    "${item.name}": {
      name: "${item.name}",
      title: "${item.title}",
      description: "${item.description ?? ""}",
      type: "${item.type}",
      registryDependencies: ${JSON.stringify(item.registryDependencies)},
      files: [${resolvedFiles.map((file) => {
        return `{
        path: "${file.path}",
        type: "${file.type}",
        target: "${file.target ?? ""}"
      }`
      })}],
      categories: ${JSON.stringify(item.categories)},
      meta: ${JSON.stringify(item.meta)},
    },`

      if (componentPath) {
        shard.entries += `
  "${item.name}": ${lazyComponentExpression(componentPath, item.name)},`
        shard.names.push(item.name)
      }
    }

    index += `
  },`
    componentShards.push(shard)
  }

  index += `
}`

  const outputPath = path.join(process.cwd(), "registry/__index__.tsx")
  await writeIfChanged(
    outputPath,
    await formatGeneratedSource(index, outputPath)
  )

  await writeComponentShards(
    path.join(process.cwd(), "registry/__components__"),
    componentShards
  )
}

async function buildRegistryJsonFile(styleName: string) {
  const { registry: importedRegistry } = await import(
    `../registry/${styleName}/registry.ts`
  )

  const parseResult = registrySchema.safeParse(importedRegistry)
  if (!parseResult.success) {
    console.error(`❌ Registry validation failed for ${styleName}:`)
    console.error(parseResult.error.format())
    throw new Error(`Invalid registry schema for ${styleName}`)
  }

  const registry = parseResult.data

  // Legacy source styles (e.g. new-york-v4) don't author font items. Inject
  // the shared registry fonts so the shadcn CLI emits font-*.json for them,
  // matching the generated base/style combinations (which spread the same
  // fonts in their base registries). Font items have no files, so they pass
  // through every transform stage untouched.
  const registryItems = getStyleCombination(styleName)
    ? registry.items
    : [
        ...registry.items,
        ...fonts.filter(
          (font) => !registry.items.some((item) => item.name === font.name)
        ),
      ]

  const fixedRegistry = {
    ...registry,
    ...FABRICATOR_REGISTRY,
    items: await Promise.all(
      registryItems.map(async (item) => {
        const files = normalizeRegistryFiles(item).map((file) => ({
          ...file,
          path: `registry/${styleName}/${file.path}`,
        }))
        if (files.length === 0) {
          return item
        }
        const dependencies = await getItemDependencies(item, files)
        return { ...item, files, ...(dependencies && { dependencies }) }
      })
    ).then((items) =>
      // Files keep the authored item shape; only paths and deps changed.
      items.map((item) => toFabricatorItem(item as RegistryItem, styleName))
    ),
  }

  const outputDir = path.join(process.cwd(), `public/r/styles/${styleName}`)
  await rimraf(outputDir)
  await fs.mkdir(outputDir, { recursive: true })

  const registryJsonPath = path.join(outputDir, "registry.json")
  const fixedRegistryJson = await formatGeneratedJson(
    fixedRegistry,
    registryJsonPath
  )
  await writeIfChanged(registryJsonPath, fixedRegistryJson)

  const tempRegistryPath = path.join(
    process.cwd(),
    `registry-${styleName}.json`
  )
  await fs.writeFile(tempRegistryPath, fixedRegistryJson)
}

// Point docs/examples links at the site being built (production links are
// authored in source) and, for Fabricator styles, namespace
// registryDependencies so they resolve against @fabricator instead of the
// built-in @shadcn registry (bare names always resolve to ui.shadcn.com).
function toFabricatorItem(item: RegistryItem, styleName: string): RegistryItem {
  const siteUrl = getFabricatorSiteUrl()
  const links = item.meta?.links as Record<string, unknown> | undefined
  const meta =
    links && siteUrl !== FABRICATOR_REGISTRY.homepage
      ? {
          ...item.meta,
          links: JSON.parse(
            JSON.stringify(links).replaceAll(
              `${FABRICATOR_REGISTRY.homepage}/`,
              `${siteUrl}/`
            )
          ),
        }
      : item.meta

  if (!isFabricatorStyleName(styleName)) {
    return { ...item, ...(meta && { meta }) }
  }

  const needsFoundations =
    ["registry:ui", "registry:component", "registry:block"].includes(item.type) &&
    !FABRICATOR_REQUIRED_ITEMS.includes(item.name)
  const registryDependencies = [
    ...(item.registryDependencies ?? []),
    ...(needsFoundations ? FABRICATOR_REQUIRED_ITEMS : []),
  ].map((dependency) =>
    isBareRegistryName(dependency)
      ? `${FABRICATOR_NAMESPACE}/${dependency}`
      : dependency
  )

  return {
    ...item,
    ...(meta && { meta }),
    ...(registryDependencies.length > 0 && { registryDependencies }),
  }
}

function isBareRegistryName(name: string) {
  return !name.startsWith("@") && !name.includes("/") && !name.endsWith(".json")
}

// Components import cn directly, so every item that uses it declares the
// package. Projects initialized before cn existed rely on this to install it.
async function getItemDependencies(
  item: RegistryItem,
  files: Array<{ path: string }>
) {
  const dependencies = item.dependencies ?? []
  if (dependencies.includes("cn")) {
    return dependencies
  }

  for (const file of files) {
    const content = await readFileIfExists(path.join(process.cwd(), file.path))
    if (content && /from ["']cn["']/.test(content)) {
      return ["cn", ...dependencies]
    }
  }

  return item.dependencies
}

async function buildRegistry(styleName: string) {
  const outputPath = `public/r/styles/${styleName}`
  const registryPath = `registry-${styleName}.json`

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(
      "node",
      [SHADCN_CLI_PATH, "build", registryPath, "--output", outputPath],
      { cwd: process.cwd(), stdio: "pipe" }
    )
    let stderr = ""
    proc.stderr?.on("data", (data) => (stderr += data))
    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Process exited with code ${code}: ${stderr}`))
      } else {
        resolve()
      }
    })
    proc.on("error", reject)
  })

  // `shadcn build` stamps its own schema URL on every item; point it at the
  // identical copy this site hosts (public/schema/registry-item.json).
  const files = (await fs.readdir(outputPath, { recursive: true })).filter(
    (file) => file.endsWith(".json")
  )
  await runWithConcurrency(files, FILE_BUILD_CONCURRENCY, async (file) => {
    const filePath = path.join(outputPath, file)
    const content = await fs.readFile(filePath, "utf8")
    if (content.includes(UPSTREAM_ITEM_SCHEMA_URL)) {
      await fs.writeFile(
        filePath,
        content.replaceAll(UPSTREAM_ITEM_SCHEMA_URL, FABRICATOR_ITEM_SCHEMA_URL)
      )
    }
  })
}

async function buildBlocksIndex() {
  // Read blocks straight from the authored base registries. Blocks
  // (registry:block) only live there; the generated registry/__index__ adds
  // nothing but registry:ui items, and importing it would pull in its
  // `import "server-only"` guard, which throws outside an RSC graph.
  const blocks = new Map<
    string,
    { name: string; description?: string; categories?: string[] }
  >()

  for (const base of BASES) {
    const { registry: baseRegistry } = await import(
      `../registry/bases/${base.name}/registry.ts`
    )

    const parseResult = registrySchema.safeParse(baseRegistry)
    if (!parseResult.success) {
      console.error(`❌ Registry validation failed for ${base.name}:`)
      console.error(parseResult.error.format())
      throw new Error(`Invalid registry schema for ${base.name}`)
    }

    for (const item of parseResult.data.items) {
      if (item.type !== "registry:block" || item.name.startsWith("chart-")) {
        continue
      }

      blocks.set(item.name, {
        name: item.name,
        description: item.description,
        categories: item.categories,
      })
    }
  }

  const payload = Array.from(blocks.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const blocksJsonPath = path.join(process.cwd(), "registry/__blocks__.json")
  await writeIfChanged(
    blocksJsonPath,
    await formatGeneratedJson(payload, blocksJsonPath)
  )
}

async function cleanUpTemporaryFiles(styleNames: string[]) {
  const cleanupTasks: Promise<boolean>[] = []

  for (const styleName of styleNames) {
    cleanupTasks.push(
      rimraf(path.join(process.cwd(), `registry-${styleName}.json`))
    )

    // Only generated combinations have a temporary registry/<style> tree.
    // Legacy source styles (e.g. new-york-v4) own registry/<style> and must
    // never be removed.
    if (getStyleCombination(styleName)) {
      console.log(`   🗑️ registry/${styleName}`)
      cleanupTasks.push(rimraf(getTemporaryRegistryRoot(styleName)))
    }
  }

  await Promise.all(cleanupTasks)
}

async function buildConfig() {
  const config = { presets: PRESETS }
  const outputPath = path.join(process.cwd(), "public/r/config.json")
  await writeIfChanged(
    outputPath,
    await formatGeneratedJson(config, outputPath)
  )
}

async function applyIconTransform(content: string, filename: string) {
  if (!content.includes("IconPlaceholder")) {
    return content
  }

  const sourceFile = iconProject.createSourceFile(filename, content, {
    scriptKind: ScriptKind.TSX,
    overwrite: true,
  })

  type TransformIconsConfig = Parameters<typeof transformIcons>[0]["config"]
  type IconTransformInput = {
    filename: string
    raw: string
    sourceFile: typeof sourceFile
    config: TransformIconsConfig
  }
  const config = { iconLibrary: "lucide" } as TransformIconsConfig

  await (transformIcons as (opts: IconTransformInput) => Promise<unknown>)({
    filename,
    raw: content,
    sourceFile,
    config,
  })

  return sourceFile.getText()
}

async function copyUIToStyles(targetStyleNames?: Set<string>) {
  const styleCombinations = targetStyleNames
    ? STYLE_COMBINATIONS.filter((style) => targetStyleNames.has(style.name))
    : STYLE_COMBINATIONS

  await runWithConcurrency(
    styleCombinations,
    COPY_CONCURRENCY,
    async ({ name: styleName }) => {
      const sourceDir = path.join(getTemporaryRegistryRoot(styleName), "ui")
      const styleRoot = getPersistentStyleRoot(styleName)
      const targetDir = path.join(styleRoot, "ui")

      try {
        await fs.access(sourceDir)
      } catch {
        console.log(`   ⚠️ registry/${styleName}/ui not found, skipping`)
        return
      }

      await syncDirectory({
        fromDir: sourceDir,
        toDir: targetDir,
        transformContent: async (content, filePath, targetPath) => {
          let nextContent = rewriteRegistryUiImportsToStyle(content, styleName)

          if (filePath.endsWith(".tsx")) {
            nextContent = await applyIconTransform(
              nextContent,
              path.basename(filePath)
            )
          }

          if (targetPath.endsWith(".ts") || targetPath.endsWith(".tsx")) {
            return formatGeneratedSource(nextContent, targetPath)
          }

          return nextContent
        },
      })

      if (isFabricatorStyleName(styleName)) {
        for (const filePath of FABRICATOR_SITE_FILES) {
          const source = path.join(getTemporaryRegistryRoot(styleName), filePath)
          const target = path.join(styleRoot, filePath)
          await fs.mkdir(path.dirname(target), { recursive: true })
          await writeIfChanged(
            target,
            await formatGeneratedSource(
              rewriteRegistryImportsToStyle(
                await fs.readFile(source, "utf8"),
                styleName
              ),
              target
            )
          )
        }
      }

      if (!shouldGenerateRtlStyles(styleName)) {
        await rimraf(path.join(styleRoot, "ui-rtl"))
      }

      console.log(`   ✅ registry/${styleName}/ui → styles/${styleName}/ui`)
    }
  )
}

async function buildRtlStyles(targetStyleNames?: Set<string>) {
  await runWithConcurrency(
    STYLE_COMBINATIONS.filter(
      (style) =>
        shouldGenerateRtlStyles(style.name) &&
        (!targetStyleNames || targetStyleNames.has(style.name))
    ),
    COPY_CONCURRENCY,
    async ({ name: styleName }) => {
      const sourceDir = path.join(getPersistentStyleRoot(styleName), "ui")
      const targetDir = path.join(getPersistentStyleRoot(styleName), "ui-rtl")

      try {
        await fs.access(sourceDir)
      } catch {
        console.log(`   ⚠️ styles/${styleName}/ui not found, skipping`)
        return
      }

      await syncDirectory({
        fromDir: sourceDir,
        toDir: targetDir,
        transformContent: async (content, filePath, targetPath) => {
          if (!filePath.endsWith(".ts") && !filePath.endsWith(".tsx")) {
            return content
          }

          return formatGeneratedSource(
            rewriteStyleDirectionImports(
              await transformDirection(content, true),
              styleName
            ),
            targetPath
          )
        },
      })

      console.log(`   ✅ styles/${styleName}/ui-rtl`)
    }
  )
}

async function buildIndex() {
  const baseUiRegistries = await Promise.all(
    Array.from(BASES).map(async (base) => {
      const { ui } = await import(
        `../registry/bases/${base.name}/ui/_registry.ts`
      )
      return { baseName: base.name, items: ui as RegistryItem[] }
    })
  )

  type IndexItem = Omit<RegistryItem, "meta"> & {
    meta?: { links?: Record<string, RegistryItem["meta"]> }
  }

  const componentMap = new Map<string, IndexItem>()
  for (const { baseName, items } of baseUiRegistries) {
    for (const item of items) {
      if (!componentMap.has(item.name)) {
        const { meta, ...rest } = item
        componentMap.set(item.name, {
          ...rest,
          ...(meta?.links
            ? { meta: { links: { [baseName]: meta.links } } }
            : {}),
        })
      } else if (item.meta?.links) {
        const existing = componentMap.get(item.name)!
        existing.meta = existing.meta || {}
        existing.meta.links = existing.meta.links || {}
        existing.meta.links[baseName] = item.meta.links
      }
    }
  }

  const index = Array.from(componentMap.values()).sort((a, b) =>
    a.name.localeCompare(b.name)
  )

  const outputPath = path.join(process.cwd(), "public/r/index.json")
  await writeIfChanged(outputPath, await formatGeneratedJson(index, outputPath))
}

async function readDirectoryEntries(dirPath: string) {
  try {
    return await fs.readdir(dirPath, { withFileTypes: true })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return []
    }

    throw error
  }
}

async function syncDirectory({
  fromDir,
  toDir,
  transformContent,
}: {
  fromDir: string
  toDir: string
  transformContent?: (
    content: string,
    filePath: string,
    targetPath: string
  ) => Promise<string>
}): Promise<string[]> {
  await fs.mkdir(toDir, { recursive: true })

  const [sourceEntries, targetEntries] = await Promise.all([
    fs.readdir(fromDir, { withFileTypes: true }),
    readDirectoryEntries(toDir),
  ])

  const targetEntriesByName = new Map(
    targetEntries.map((entry) => [entry.name, entry])
  )
  const sourceNames = new Set(sourceEntries.map((entry) => entry.name))

  await Promise.all(
    targetEntries.map(async (entry) => {
      if (!sourceNames.has(entry.name)) {
        await rimraf(path.join(toDir, entry.name))
      }
    })
  )

  const changedPaths: string[][] = await runWithConcurrency(
    sourceEntries,
    COPY_CONCURRENCY,
    async (entry) => {
      const sourcePath = path.join(fromDir, entry.name)
      const targetPath = path.join(toDir, entry.name)
      const existingTargetEntry = targetEntriesByName.get(entry.name)

      if (entry.isDirectory()) {
        if (existingTargetEntry && !existingTargetEntry.isDirectory()) {
          await rimraf(targetPath)
        }

        return await syncDirectory({
          fromDir: sourcePath,
          toDir: targetPath,
          transformContent,
        })
      }

      if (existingTargetEntry?.isDirectory()) {
        await rimraf(targetPath)
      }

      let content = await fs.readFile(sourcePath, "utf8")

      if (transformContent) {
        content = await transformContent(content, sourcePath, targetPath)
      }

      return (await writeIfChanged(targetPath, content)) ? [targetPath] : []
    }
  )

  return changedPaths.flat()
}

function rewriteRegistryUiImportsToStyle(content: string, styleName: string) {
  return rewriteRegistryImportsToStyle(content, styleName)
}

// Fabricator-only files that compiled components import (lib/fluid-hover…).
// The site has no copy of them in @/lib or @/hooks, so they are copied next
// to the compiled ui and imported from there.
// (FABRICATOR_SITE_FILES is defined with the other constants at the top.)

function rewriteFabricatorImportsToStyle(content: string, styleName: string) {
  if (!isFabricatorStyleName(styleName)) return content
  return FABRICATOR_SITE_FILES.reduce((result, filePath) => {
    const specifier = stripFileExtension(filePath)
    return result.replaceAll(
      `@/registry/${styleName}/${specifier}"`,
      `@/styles/${styleName}/${specifier}"`
    )
  }, content)
}

function rewriteRegistryImportsToStyle(content: string, styleName: string) {
  return rewriteFabricatorImportsToStyle(content, styleName)
    .replaceAll(`@/registry/${styleName}/ui/`, `@/styles/${styleName}/ui/`)
    .replaceAll(`@/registry/${styleName}/lib/utils`, `@/lib/utils`)
    .replaceAll(
      `@/registry/${styleName}/hooks/use-mobile`,
      `@/hooks/use-mobile`
    )
    .replaceAll(`@/registry/${styleName}/lib/`, `@/lib/`)
    .replaceAll(`@/registry/${styleName}/hooks/`, `@/hooks/`)
}

function rewriteStyleDirectionImports(content: string, styleName: string) {
  return content.replaceAll(
    `@/styles/${styleName}/ui/`,
    `@/styles/${styleName}/ui-rtl/`
  )
}

async function buildColors() {
  const colorsTargetPath = path.join(process.cwd(), "public/r/colors")
  await fs.mkdir(colorsTargetPath, { recursive: true })

  await Promise.all(
    BASE_COLORS.map(async (baseColor) => {
      const light = (baseColor.cssVars?.light ?? {}) as Record<string, string>
      const dark = (baseColor.cssVars?.dark ?? {}) as Record<string, string>

      const cssVarKeys = Object.keys(light).filter(
        (key) => !key.startsWith("sidebar")
      )

      const rootVars = cssVarKeys
        .map((key) => `    --${key}: ${light[key]};`)
        .join("\n")
      const darkVars = cssVarKeys
        .filter((key) => dark[key])
        .map((key) => `    --${key}: ${dark[key]};`)
        .join("\n")

      const payload = {
        inlineColors: { light, dark },
        cssVars: { light, dark },
        cssVarsV4: baseColor.cssVars,
        inlineColorsTemplate:
          "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n  ",
        cssVarsTemplate: `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n@layer base {\n  :root {\n${rootVars}\n  }\n\n  .dark {\n${darkVars}\n  }\n}\n\n@layer base {\n  * {\n    @apply border-border;\n  }\n  body {\n    @apply bg-background text-foreground;\n  }\n}`,
      }

      const outputPath = path.join(colorsTargetPath, `${baseColor.name}.json`)
      await writeIfChanged(
        outputPath,
        await formatGeneratedJson(payload, outputPath)
      )
      console.log(`   ✅ ${baseColor.name}.json`)
    })
  )
}
