// Monorepos: finding their apps, and what a shared UI package needs.
//
// `shadcn add -c apps/web` writes UI files to packages/ui, and libs and hooks to
// whatever apps/web's aliases say. Fabricator's components import their libs
// (`@workspace/ui/lib/fluid-hover`), so those have to live beside them.

import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs"
import path from "node:path"
import { z } from "zod"

import { readComponentsJson, serialize, type ComponentsJson } from "./config"
import { isReactNativeProject, readPackageJson } from "./native"

export const ICONS_PACKAGE = "@fabricator-ui/icons"

// `exports` and `workspaces` take many shapes, and this reads any package.json
// above a project, so only what the code relies on is checked.
const packageJsonSchema = z.looseObject({
  dependencies: z.record(z.string(), z.string()).optional(),
  devDependencies: z.record(z.string(), z.string()).optional(),
  exports: z.unknown().optional(),
  workspaces: z.unknown().optional(),
})

const stringsSchema = z.record(z.string(), z.string())

function readJson(file: string) {
  return packageJsonSchema.parse(JSON.parse(readFileSync(file, "utf8")))
}

function readAliases(config: ComponentsJson) {
  return stringsSchema.safeParse(config.aliases).data ?? {}
}

function writeJson(file: string, value: unknown) {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}

function isWorkspaceRoot(dir: string) {
  if (existsSync(path.join(dir, "pnpm-workspace.yaml"))) return true
  const file = path.join(dir, "package.json")
  return existsSync(file) && Boolean(readJson(file).workspaces)
}

/** The monorepo around a folder, or undefined when it isn't in one. */
export function findWorkspaceRoot(cwd: string): string | undefined {
  let dir = path.resolve(cwd)
  while (true) {
    if (isWorkspaceRoot(dir)) return dir
    const parent = path.dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

export type WorkspaceApp = { name: string; dir: string; isNative: boolean }

/** The apps in `apps/*` that use the registry, sorted by name. */
export function listWorkspaceApps(root: string): WorkspaceApp[] {
  const appsDir = path.join(root, "apps")
  if (!existsSync(appsDir)) return []
  return readdirSync(appsDir)
    .sort()
    .map((name) => ({ name, dir: path.join(appsDir, name) }))
    .filter(
      ({ dir }) =>
        statSync(dir).isDirectory() &&
        existsSync(path.join(dir, "components.json"))
    )
    .map(({ name, dir }) => ({
      name,
      dir,
      isNative: isReactNativeProject(readPackageJson(dir)),
    }))
}

/** `@workspace/ui` from `@workspace/ui/components`; nothing for a local alias. */
function getSharedAlias(config: ComponentsJson) {
  const { ui } = readAliases(config)
  if (!ui || ui.startsWith("@/")) return undefined
  return ui.endsWith("/components")
    ? ui.slice(0, -"/components".length)
    : undefined
}

function readConfig(appDir: string) {
  const read = readComponentsJson(appDir)
  return read.exists && "config" in read ? read : undefined
}

/**
 * Points an app's `lib` and `hooks` at the shared package, so an `add` writes
 * them beside the components that import them. Run it before the first `add`.
 */
export function alignWorkspaceAliases(appDir: string) {
  const read = readConfig(appDir)
  if (!read) return false
  const shared = getSharedAlias(read.config)
  if (!shared) return false
  const aliases = readAliases(read.config)
  const next = {
    ...aliases,
    lib: `${shared}/lib`,
    hooks: `${shared}/hooks`,
  }
  if (aliases.lib === next.lib && aliases.hooks === next.hooks) return false
  writeFileSync(read.path, serialize({ ...read.config, aliases: next }))
  return true
}

/** Whether an app's `add` would write libs where the shared package can't reach. */
export function isWorkspaceAliasStale(appDir: string) {
  const read = readConfig(appDir)
  if (!read) return false
  const shared = getSharedAlias(read.config)
  if (!shared) return false
  const aliases = readAliases(read.config)
  return aliases.lib !== `${shared}/lib` || aliases.hooks !== `${shared}/hooks`
}

/** The shared UI package an app's alias names, when it's in this monorepo. */
export function getUiPackageDir(appDir: string): string | undefined {
  const read = readConfig(appDir)
  if (!read || !getSharedAlias(read.config)) return undefined
  const root = findWorkspaceRoot(appDir)
  if (!root) return undefined
  const dir = path.join(root, "packages/ui")
  return existsSync(path.join(dir, "package.json")) ? dir : undefined
}

/**
 * The template's `./lib/*` export only matches `.ts`, so `.tsx` libs each need
 * their own. A specific key wins over the pattern wherever it sits; they go first
 * only to read well.
 */
export function exportTsxLibs(uiDir: string) {
  const file = path.join(uiDir, "package.json")
  const pkg = readJson(file)
  const exports = z.record(z.string(), z.unknown()).safeParse(pkg.exports).data
  const libDir = path.join(uiDir, "src/lib")
  if (!exports || !existsSync(libDir)) return false
  const tsx = readdirSync(libDir).filter((name) => name.endsWith(".tsx"))
  const added = Object.fromEntries(
    tsx
      .map((name) => name.slice(0, -".tsx".length))
      .filter((name) => !exports[`./lib/${name}`])
      .map((name) => [`./lib/${name}`, `./src/lib/${name}.tsx`])
  )
  if (Object.keys(added).length === 0) return false
  writeJson(file, { ...pkg, exports: { ...added, ...exports } })
  return true
}

function usesIcons(dir: string): boolean {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (usesIcons(full)) return true
    } else if (
      /\.(tsx?|astro)$/.test(entry.name) &&
      readFileSync(full, "utf8").includes(`"${ICONS_PACKAGE}"`)
    ) {
      return true
    }
  }
  return false
}

/**
 * The CLI installs dependencies where the components go, so an app file that
 * imports the icons (the App Shell layout) can't resolve them under isolated
 * installs. Gives the app the shared package's version.
 */
export function shareIconDependency(appDir: string, uiDir: string) {
  const version = readJson(path.join(uiDir, "package.json")).dependencies?.[
    ICONS_PACKAGE
  ]
  const file = path.join(appDir, "package.json")
  const pkg = readJson(file)
  if (!version || pkg.dependencies?.[ICONS_PACKAGE] || !usesIcons(appDir)) {
    return false
  }
  writeJson(file, {
    ...pkg,
    dependencies: Object.fromEntries(
      Object.entries({ ...pkg.dependencies, [ICONS_PACKAGE]: version }).sort(
        ([a], [b]) => a.localeCompare(b)
      )
    ),
  })
  return true
}

/** What a monorepo's app needs after an `add`. Returns whether it changed files. */
export function syncWorkspaceAfterAdd(appDir: string) {
  const uiDir = getUiPackageDir(appDir)
  if (!uiDir) return false
  const exported = exportTsxLibs(uiDir)
  const shared = shareIconDependency(appDir, uiDir)
  return exported || shared
}
