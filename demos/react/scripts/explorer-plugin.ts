import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import ts from "typescript"
import { transformWithEsbuild, type Plugin } from "vite"
import { z } from "zod"

import { isFullPageSource } from "../src/explorer-model.ts"

const itemSchema = z.object({
  name: z.string(),
  title: z.string(),
  group: z.string(),
  type: z.string(),
})

const catalogSchema = z.object({
  schemaVersion: z.literal(1),
  items: z.array(itemSchema),
})

const registrySchema = z.object({
  files: z.array(
    z.object({ path: z.string(), type: z.string(), content: z.string() })
  ),
})

function readComponentExport(source: string, filename: string) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  )
  for (const statement of file.statements) {
    if (ts.isExportAssignment(statement)) return "default"
    if (!ts.canHaveModifiers(statement)) continue
    const modifiers = ts.getModifiers(statement) ?? []
    if (
      modifiers.some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword
      )
    )
      return "default"
    if (
      !modifiers.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword
      )
    )
      continue
    if (
      ts.isFunctionDeclaration(statement) &&
      statement.name &&
      /^[A-Z]/.test(statement.name.text)
    )
      return statement.name.text
    if (ts.isVariableStatement(statement)) {
      const name = statement.declarationList.declarations[0]?.name
      if (name && ts.isIdentifier(name) && /^[A-Z]/.test(name.text))
        return name.text
    }
  }
  return null
}

function formatTitle(name: string) {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function readExplorerCatalog(catalogPath: string) {
  try {
    return catalogSchema.parse(JSON.parse(readFileSync(catalogPath, "utf8")))
  } catch (cause) {
    throw new Error(
      "Could not load the explorer catalog. Run bun run registry:build at the repository root.",
      { cause }
    )
  }
}

/** Uses the built registry payloads unchanged; installation remains the CLI's job. */
export function createExplorerPlugin(webDirectory: string): Plugin {
  const catalogPath = path.join(webDirectory, "generated/explorer/catalog.json")
  const { items } = readExplorerCatalog(catalogPath)
  const families = items
    .filter((item) => item.type !== "registry:block")
    .toSorted((first, second) => second.name.length - first.name.length)
  const exampleDirectory = path.join(
    webDirectory,
    "examples/__styles__/base-fabricator"
  )
  const examples = readdirSync(exampleDirectory).filter(
    (filename) => filename.endsWith(".tsx") && !filename.includes("-rtl")
  )
  const demoSources = examples.flatMap((filename) => {
    const id = filename.slice(0, -4)
    const item = families.find(
      (family) => id === family.name || id.startsWith(`${family.name}-`)
    )
    if (!item) return []
    const filenamePath = path.join(exampleDirectory, filename)
    const source = readFileSync(filenamePath, "utf8")
    const componentExport = readComponentExport(source, filename)
    if (!componentExport) return []
    return [
      {
        id,
        item: item.name,
        title: formatTitle(id.slice(item.name.length + 1) || "example"),
        path: filenamePath,
        componentExport,
        isFullPage: isFullPageSource(source),
      },
    ]
  })
  const registrySources = new Map<string, string>()
  const blockSources = items
    .filter((item) => item.type === "registry:block")
    .map((item) => {
      const registryPath = path.join(
        webDirectory,
        `public/r/styles/icons-fabricator/base/${item.name}.json`
      )
      const { files } = registrySchema.parse(
        JSON.parse(readFileSync(registryPath, "utf8"))
      )
      for (const file of files)
        registrySources.set(`@/${file.path}`, file.content)
      const page =
        files.find((file) => file.type === "registry:page") ??
        files.find(
          (file) =>
            file.type === "registry:block" &&
            /\/(index|page)\.tsx$/.test(file.path)
        )
      if (!page)
        throw new Error(
          `Block ${item.name} has no built page. Run bun run registry:build.`
        )
      return {
        id: item.name,
        item: item.name,
        title: item.title,
        path: `@/${page.path}`,
        componentExport: "default",
        isFullPage: true,
      }
    })
  const writeLoader = (entry: {
    id: string
    item: string
    title: string
    path: string
    componentExport: string
    isFullPage: boolean
  }) =>
    `{id:${JSON.stringify(entry.id)},item:${JSON.stringify(entry.item)},title:${JSON.stringify(entry.title)},isFullPage:${entry.isFullPage},load:()=>import(${JSON.stringify(entry.path)}).then(module=>({default:module[${JSON.stringify(entry.componentExport)}]}))}`

  return {
    name: "fabricator-portable-explorer",
    enforce: "pre",
    resolveId(id) {
      if (id === "virtual:fabricator-explorer") return `\0${id}`
      const registryId = id.startsWith(`${webDirectory}/registry/`)
        ? `@/${path.relative(webDirectory, id)}`
        : id
      const resolvedId = [
        registryId,
        `${registryId}.tsx`,
        `${registryId}.ts`,
        `${registryId}/index.tsx`,
      ].find((candidate) => registrySources.has(candidate))
      if (resolvedId) return `\0fabricator:${resolvedId}.tsx`
      return null
    },
    async load(id) {
      if (id === "\0virtual:fabricator-explorer") {
        return `export const catalog=${JSON.stringify(items)};export const demos=[${demoSources.map(writeLoader).join(",")}];export const blocks=[${blockSources.map(writeLoader).join(",")}];`
      }
      if (!id.startsWith("\0fabricator:")) return null
      const source = registrySources.get(id.slice("\0fabricator:".length, -4))
      if (source === undefined) return null
      const result = await transformWithEsbuild(
        source,
        path.join(webDirectory, "registry/portable-block.tsx"),
        { loader: "tsx", jsx: "automatic", tsconfigRaw: {} }
      )
      return result.code
    },
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const pathname = new URL(request.url ?? "/", "http://localhost")
          .pathname
        if (
          !/^\/(images|media|examples)\//.test(pathname) &&
          pathname !== "/placeholder.svg"
        ) {
          next()
          return
        }
        const publicDirectory = path.join(webDirectory, "public")
        const filename = path.resolve(publicDirectory, `.${pathname}`)
        if (
          !filename.startsWith(`${publicDirectory}${path.sep}`) ||
          !existsSync(filename) ||
          !statSync(filename).isFile()
        ) {
          next()
          return
        }
        const mediaTypes: Record<string, string> = {
          ".svg": "image/svg+xml",
          ".png": "image/png",
          ".webp": "image/webp",
          ".jpg": "image/jpeg",
          ".jpeg": "image/jpeg",
          ".avif": "image/avif",
          ".mp3": "audio/mpeg",
          ".wav": "audio/wav",
          ".mp4": "video/mp4",
          ".webm": "video/webm",
        }
        response.setHeader(
          "Content-Type",
          mediaTypes[path.extname(filename)] ?? "application/octet-stream"
        )
        response.end(readFileSync(filename))
      })
    },
    generateBundle() {
      const publicDirectory = path.join(webDirectory, "public")
      const copyAssets = (directory: string) => {
        for (const entry of readdirSync(
          path.join(publicDirectory, directory)
        )) {
          const relative = path.join(directory, entry)
          const filename = path.join(publicDirectory, relative)
          if (statSync(filename).isDirectory()) copyAssets(relative)
          else
            this.emitFile({
              type: "asset",
              fileName: relative,
              source: readFileSync(filename),
            })
        }
      }
      // Website example screenshots are served from GitHub attachments.
      for (const directory of ["images", "media"]) copyAssets(directory)
      this.emitFile({
        type: "asset",
        fileName: "placeholder.svg",
        source: readFileSync(path.join(publicDirectory, "placeholder.svg")),
      })
      this.emitFile({
        type: "asset",
        fileName: "licenses/Inter.txt",
        source: readFileSync(
          path.join(
            webDirectory,
            "registry/fabricator/assets/fonts/LICENSE.txt"
          )
        ),
      })
      this.emitFile({
        type: "asset",
        fileName: "explorer-manifest.json",
        source: JSON.stringify(
          {
            catalog: items,
            scenarios: demoSources.map(({ id, item, title }) => ({
              id,
              item,
              title,
            })),
            blocks: blockSources.map(({ id, item, title }) => ({
              id,
              item,
              title,
            })),
          },
          null,
          2
        ),
      })
    },
  }
}
