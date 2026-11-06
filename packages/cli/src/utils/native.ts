import { existsSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { getRegistryUrl, type ComponentsJson } from "./config"
import { fabricatorRegistryTemplate } from "./urls"

/** The registry template for React Native projects. */
export function nativeRegistryTemplate(baseUrl: string): string {
  return `${baseUrl}/r/fabricator/native/{name}.json`
}

export type ProjectPackageJson = {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
}

export function readPackageJson(cwd: string): ProjectPackageJson | undefined {
  const file = path.join(cwd, "package.json")
  if (!existsSync(file)) return undefined
  return JSON.parse(readFileSync(file, "utf8")) as ProjectPackageJson
}

function hasDependency(pkg: ProjectPackageJson | undefined, name: string) {
  return Boolean(pkg?.dependencies?.[name] ?? pkg?.devDependencies?.[name])
}

export function isExpoProject(pkg: ProjectPackageJson | undefined) {
  return hasDependency(pkg, "expo")
}

export function isReactNativeProject(pkg: ProjectPackageJson | undefined) {
  return isExpoProject(pkg) || hasDependency(pkg, "react-native")
}

/** Whether `components.json` points at the React Native registry. */
export function usesNativeRegistry(config: ComponentsJson | undefined) {
  return Boolean(getRegistryUrl(config)?.includes("/r/fabricator/native/"))
}

/** The registry a project needs, by what it is. */
export function registryTemplateFor(cwd: string, baseUrl: string) {
  return isReactNativeProject(readPackageJson(cwd))
    ? nativeRegistryTemplate(baseUrl)
    : fabricatorRegistryTemplate(baseUrl)
}

const CSS_CANDIDATES = ["src/global.css", "global.css", "app/global.css"]

/**
 * The stylesheet Uniwind reads. It decides where Tailwind scans from, so a new
 * one goes in `src` when the project keeps its code there.
 */
export function findCssEntry(exists: (relative: string) => boolean) {
  return (
    CSS_CANDIDATES.find(exists) ??
    (exists("src") ? "src/global.css" : "global.css")
  )
}

const REQUIRED_CSS_IMPORTS = ['@import "tailwindcss";', '@import "uniwind";']

/** The stylesheet with Tailwind and Uniwind imported first, once each. */
export function ensureCssImports(css: string) {
  const isImported = (statement: string) => {
    const name = /"([^"]+)"/.exec(statement)?.[1]
    return new RegExp(`@import\\s+["']${name}["']`).test(css)
  }
  const missing = REQUIRED_CSS_IMPORTS.filter(
    (statement) => !isImported(statement)
  )
  if (missing.length === 0) return css
  return `${missing.join("\n")}\n${css.trim() ? `\n${css.trimStart()}` : ""}`
}

export function buildMetroConfig(cssEntry: string) {
  return `const { getDefaultConfig } = require("expo/metro-config")
const { withUniwindConfig } = require("uniwind/metro")

const config = getDefaultConfig(__dirname)

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./${cssEntry}",
  dtsFile: "./${path.posix.dirname(cssEntry) === "." ? "" : `${path.posix.dirname(cssEntry)}/`}uniwind-types.d.ts",
})
`
}

export function buildNativeComponentsJson(
  cssEntry: string,
  baseUrl: string
): ComponentsJson {
  return {
    $schema: "https://fabricator-ui.vercel.app/schema.json",
    // A valid upstream style id: the React Native source comes from the
    // registry URL, never from this field. Not base-*: for those, shadcn rewrites
    // `asChild` to Base UI's `render` at install, and the native primitives only
    // know `asChild`.
    style: "radix-nova",
    rsc: false,
    tsx: true,
    tailwind: { css: cssEntry, baseColor: "neutral", cssVariables: true },
    iconLibrary: "lucide",
    aliases: {
      components: "@/components",
      utils: "@/lib/utils",
      ui: "@/components/ui",
      lib: "@/lib",
      hooks: "@/hooks",
    },
    registries: { "@fabricator": nativeRegistryTemplate(baseUrl) },
  }
}

export type SetupChange = { file: string; action: "created" | "updated" }

/** Writes what `shadcn add` needs before it can run in an Expo project. */
export function writeNativeSetup(
  cwd: string,
  baseUrl: string
): { cssEntry: string; changes: SetupChange[]; hasCustomMetro: boolean } {
  const resolve = (relative: string) => path.join(cwd, relative)
  const changes: SetupChange[] = []
  const cssEntry = findCssEntry((relative) => existsSync(resolve(relative)))

  const hadCss = existsSync(resolve(cssEntry))
  const css = hadCss ? readFileSync(resolve(cssEntry), "utf8") : ""
  const nextCss = ensureCssImports(css)
  if (!hadCss || nextCss !== css) {
    writeFileSync(resolve(cssEntry), nextCss)
    changes.push({ file: cssEntry, action: hadCss ? "updated" : "created" })
  }

  const metroPath = resolve("metro.config.js")
  const hasMetro = existsSync(metroPath)
  if (!hasMetro) {
    writeFileSync(metroPath, buildMetroConfig(cssEntry))
    changes.push({ file: "metro.config.js", action: "created" })
  }
  const hasCustomMetro =
    hasMetro && !readFileSync(metroPath, "utf8").includes("withUniwindConfig")

  const componentsPath = resolve("components.json")
  if (!existsSync(componentsPath)) {
    writeFileSync(
      componentsPath,
      `${JSON.stringify(buildNativeComponentsJson(cssEntry, baseUrl), null, 2)}\n`
    )
    changes.push({ file: "components.json", action: "created" })
  }
  return { cssEntry, changes, hasCustomMetro }
}
