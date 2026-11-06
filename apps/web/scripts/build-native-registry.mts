import { existsSync, promises as fs } from "fs"
import path from "path"
import { pathToFileURL } from "url"
import { registryItemSchema, type RegistryItem } from "shadcn/schema"
import { createStyleMap, transformStyle } from "shadcn/utils"

import { FABRICATOR_REGISTRY } from "@/registry/fabricator"
import { toNativeStylesheet } from "@/registry/fabricator/native-theme"
import { nativeItems } from "@/registry/native/_registry"

import {
  assembleNativeStyleMap,
  findPlaceholders,
  findUnstyledPlaceholders,
  getNativeSourcePath,
  getPublishedPath,
  rewriteSharedImports,
} from "./native-registry"

/*
 * The React Native registry. It uses the same placeholder compiler as the
 * website's items, from its own source tree and style map:
 *
 * - registry/native/ and registry/styles/native/ are authored.
 * - registry/styles/style-native.css is generated and committed.
 * - styles/native/ (compiled components the example app runs) and public/r/native/
 *   (what `add` installs) are generated and gitignored.
 *
 * Fails when a compiled file still has a placeholder: it has no rule, or it
 * sits where the compiler can't reach (a ternary, a variable).
 */

const ROOT = process.cwd()
const COMPILED_DIR = path.join(ROOT, "styles/native")
const PUBLISHED_DIR = path.join(ROOT, "public/r/native")
const ITEM_SCHEMA = `${FABRICATOR_REGISTRY.homepage}/schema/registry-item.json`

// Metro watches the compiled folder: deleting it mid-session breaks its map, and
// rewriting an unchanged file reloads the app for nothing.
async function writeIfChanged(filePath: string, content: string) {
  const current = await fs.readFile(filePath, "utf8").catch(() => null)
  if (current === content) return
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  await fs.writeFile(filePath, content)
}

async function removeStaleFiles(dir: string, keep: Set<string>) {
  const entries = await fs.readdir(dir, {
    recursive: true,
    withFileTypes: true,
  })
  await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => path.join(entry.parentPath, entry.name))
      .filter((file) => !keep.has(path.relative(dir, file)))
      .map((file) => fs.rm(file))
  )
}

async function buildStyleMap() {
  const partsDir = path.join(ROOT, "registry/styles/native")
  const files = (await fs.readdir(partsDir))
    .filter((file) => file.endsWith(".css"))
    .sort()
  const parts = await Promise.all(
    files.map((file) => fs.readFile(path.join(partsDir, file), "utf8"))
  )
  const content = assembleNativeStyleMap(parts)
  if (!process.argv.includes("--check")) {
    await fs.writeFile(
      path.join(ROOT, "registry/styles/style-native.css"),
      content
    )
  }
  return createStyleMap(content)
}

async function compileFile(
  filePath: string,
  styleMap: ReturnType<typeof createStyleMap>
) {
  const source = await fs.readFile(
    path.join(ROOT, getNativeSourcePath(filePath)),
    "utf8"
  )
  const rewritten = rewriteSharedImports(source)
  const unstyled = filePath.endsWith(".tsx")
    ? findUnstyledPlaceholders(rewritten, styleMap)
    : []
  if (unstyled.length > 0) {
    throw new Error(`${filePath} has no rule for: ${unstyled.join(", ")}`)
  }
  const compiled = filePath.endsWith(".tsx")
    ? await transformStyle(rewritten, { styleMap })
    : rewritten
  const unreached = filePath.endsWith(".tsx") ? findPlaceholders(compiled) : []
  if (unreached.length > 0) {
    throw new Error(
      `${filePath} has placeholders out of the compiler's reach (a ternary, a variable): ${unreached.join(", ")}`
    )
  }
  await writeIfChanged(path.join(COMPILED_DIR, filePath), compiled)
  return compiled
}

function getThemeItem(content: string): RegistryItem {
  return {
    name: "theme",
    type: "registry:item",
    title: "Theme",
    description: "Fabricator's tokens for React Native.",
    files: [
      {
        path: "registry/native/fabricator.css",
        type: "registry:file",
        target: "fabricator.css",
        content,
      },
    ],
    css: { '@import "./fabricator.css"': {} },
  }
}

// Static imports for the example app: Metro can't resolve dynamic paths.
async function buildExamplesIndex() {
  const dir = path.join(ROOT, "examples/native")
  const files = (await fs.readdir(dir))
    .filter((file) => file.endsWith("-example.tsx"))
    .sort()
  const examples = await Promise.all(
    files.map(async (file) => {
      const source = await fs.readFile(path.join(dir, file), "utf8")
      const match = /function (\w+Example)\(/.exec(source)
      if (!match) throw new Error(`${file} has no *Example component.`)
      const name = file.replace(/-example\.tsx$/, "")
      return `  ${JSON.stringify(name)}: () => require("@/examples/native/${file.replace(/\.tsx$/, "")}").${match[1]},`
    })
  )
  const blocksDir = path.join(ROOT, "registry/native/blocks")
  const blockFiles = existsSync(blocksDir)
    ? (await fs.readdir(blocksDir))
        .filter((file) => file.endsWith(".tsx"))
        // A block only compiles once it's declared, and the index points at the compiled copy.
        .filter((file) =>
          (nativeItems as RegistryItem[]).some(
            (item) => item.name === file.replace(/\.tsx$/, "")
          )
        )
        .sort()
    : []
  const blocks = await Promise.all(
    blockFiles.map(async (file) => {
      const name = file.replace(/\.tsx$/, "")
      const component = name
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
      const source = await fs.readFile(path.join(blocksDir, file), "utf8")
      if (!new RegExp(`function ${component}\\b`).test(source)) {
        throw new Error(`${file} has no function ${component}.`)
      }
      return `  ${JSON.stringify(name)}: () => require("@/registry/native/blocks/${name}").${component},`
    })
  )
  await writeIfChanged(
    path.join(dir, "__index__.ts"),
    [
      "// Generated by scripts/build-native-registry.mts. Do not edit.",
      'import type * as React from "react"',
      "",
      "export const NATIVE_EXAMPLES: Record<string, () => React.ComponentType> = {",
      ...examples,
      "}",
      "",
      "export const NATIVE_BLOCKS: Record<string, () => React.ComponentType> = {",
      ...blocks,
      "}",
      "",
    ].join("\n")
  )
}

export async function buildNativeRegistry() {
  const styleMap = await buildStyleMap()
  await fs.mkdir(PUBLISHED_DIR, { recursive: true })
  await fs.mkdir(COMPILED_DIR, { recursive: true })

  const compiled = new Map<string, string>()
  const compile = async (filePath: string) => {
    const existing = compiled.get(filePath)
    if (existing !== undefined) return existing
    const content = await compileFile(filePath, styleMap)
    compiled.set(filePath, content)
    return content
  }

  const theme = toNativeStylesheet()
  await writeIfChanged(path.join(COMPILED_DIR, "fabricator.css"), theme)

  const items = [...nativeItems, getThemeItem(theme)] as RegistryItem[]
  const published: RegistryItem[] = []
  for (const item of items) {
    const files = await Promise.all(
      (item.files ?? []).map(async (file) =>
        "content" in file && file.content
          ? file
          : {
              ...file,
              path: getPublishedPath(file.path),
              content: await compile(file.path),
            }
      )
    )
    const document = registryItemSchema.parse({
      $schema: ITEM_SCHEMA,
      ...item,
      files,
    })
    published.push(document)
    await writeIfChanged(
      path.join(PUBLISHED_DIR, `${item.name}.json`),
      `${JSON.stringify(document, null, 2)}\n`
    )
  }

  await writeIfChanged(
    path.join(PUBLISHED_DIR, "registry.json"),
    `${JSON.stringify(
      {
        name: FABRICATOR_REGISTRY.name,
        homepage: FABRICATOR_REGISTRY.homepage,
        items: published.map(({ files, ...item }) => ({
          ...item,
          files: files?.map(({ content: _content, ...file }) => file),
        })),
      },
      null,
      2
    )}\n`
  )
  await removeStaleFiles(
    COMPILED_DIR,
    new Set(["fabricator.css", ...compiled.keys()])
  )
  await removeStaleFiles(
    PUBLISHED_DIR,
    new Set([
      "registry.json",
      "parity.json",
      ...published.map((item) => `${item.name}.json`),
    ])
  )
  await buildExamplesIndex()
  return { items: published.length, files: compiled.size }
}

/**
 * Compiles a few items without writing anything, so several people can check
 * their work at once: `--check button,card`.
 */
async function checkItems(names: string[]) {
  const styleMap = await buildStyleMap()
  const items = (nativeItems as RegistryItem[]).filter((item) =>
    names.includes(item.name)
  )
  const unknown = names.filter(
    (name) => !items.some((item) => item.name === name)
  )
  if (unknown.length > 0)
    throw new Error(`Unknown items: ${unknown.join(", ")}`)
  for (const item of items) {
    for (const file of item.files ?? []) {
      if (!file.path.endsWith(".tsx")) continue
      const source = await fs.readFile(
        path.join(ROOT, getNativeSourcePath(file.path)),
        "utf8"
      )
      const rewritten = rewriteSharedImports(source)
      const unstyled = findUnstyledPlaceholders(rewritten, styleMap)
      if (unstyled.length > 0) {
        throw new Error(`${file.path}: no rule for ${unstyled.join(", ")}`)
      }
      const unreached = findPlaceholders(
        await transformStyle(rewritten, { styleMap })
      )
      if (unreached.length > 0) {
        throw new Error(
          `${file.path}: out of the compiler's reach: ${unreached.join(", ")}`
        )
      }
    }
  }
  console.log(`✅ ${items.length} items compile`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const checkIndex = process.argv.indexOf("--check")
  if (checkIndex !== -1) {
    await checkItems((process.argv[checkIndex + 1] ?? "").split(","))
  } else {
    const { items, files } = await buildNativeRegistry()
    console.log(`✅ Native registry: ${items} items, ${files} files`)
  }
}
