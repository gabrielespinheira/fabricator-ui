import { cp, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import { REACT_PACKAGE_COMPONENTS } from "@fabricator-ui/setup"
import { compile, optimize } from "@tailwindcss/node"
import { registryItemSchema } from "shadcn/schema"
import ts from "typescript"

import type { CssObject } from "@/registry/fabricator/css-object"
import {
  FABRICATOR_FOUNDATIONS,
  FABRICATOR_PALETTE,
} from "@/registry/fabricator/foundations"

import manifest from "../../../packages/react/package.json" with { type: "json" }
import {
  PACKAGE_CLASS_PREFIX,
  transformPackageSource,
} from "./react-package-source"

const web = path.resolve(import.meta.dirname, "..")
const repo = path.resolve(web, "../..")
const registry = path.join(web, "public/r/styles/icons-fabricator/base")
const packageRoot = path.join(repo, "packages/react")
const staged = path.join(packageRoot, ".dist-react-package")
const source = path.join(staged, "src")
const output = path.join(staged, "out")
const CSS_LAYER_ORDER = "@layer theme, base, components, utilities;"

function renderCss(object: CssObject): string {
  return Object.entries(object)
    .map(([key, value]) =>
      typeof value === "string"
        ? `${key}:${value};`
        : `${key}{${renderCss(value)}}`
    )
    .join("\n")
}

function variables(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [`--${key}`, value])
  )
}

async function buildStyles(candidates: string[]) {
  const { cssVars, css } = FABRICATOR_FOUNDATIONS
  const { "@layer base": base, ...foundations } = css
  const reducedMotion =
    typeof base === "object"
      ? base["@media (prefers-reduced-motion: reduce)"]
      : undefined
  const motion =
    typeof reducedMotion === "object"
      ? reducedMotion["*, ::before, ::after"]
      : undefined
  const scope = `:where([class^="${PACKAGE_CLASS_PREFIX}:"], [class*=" ${PACKAGE_CLASS_PREFIX}:"])`
  const theme = {
    ...Object.fromEntries(
      Object.keys(FABRICATOR_PALETTE.light)
        .filter((name) => name !== "radius")
        .map((name) => [`color-${name}`, `var(--${name})`])
    ),
    ...cssVars.theme,
    ...FABRICATOR_PALETTE.theme,
    "radius-sm": "calc(var(--radius) * 0.6)",
    "radius-md": "calc(var(--radius) * 0.8)",
    "radius-lg": "var(--radius)",
    "radius-xl": "calc(var(--radius) * 1.4)",
    "radius-2xl": "calc(var(--radius) * 1.8)",
    "radius-3xl": "calc(var(--radius) * 2.2)",
    "radius-4xl": "calc(var(--radius) * 2.6)",
  }
  const compiler = await compile(
    [
      CSS_LAYER_ORDER,
      `@import "tailwindcss/theme.css" layer(theme) prefix(${PACKAGE_CLASS_PREFIX});`,
      `@import "tailwindcss/utilities.css" layer(components) prefix(${PACKAGE_CLASS_PREFIX}) source(none);`,
      '@import "tw-animate-css";',
      '@import "shadcn/tailwind.css";',
      "@custom-variant dark (&:where(.dark, .dark *));",
      renderCss({
        "@theme inline": variables(theme),
        "@layer base": {
          ":where(:root)": variables({
            ...cssVars.light,
            ...FABRICATOR_PALETTE.light,
          }),
          ":where(.dark)": variables({
            ...cssVars.dark,
            ...FABRICATOR_PALETTE.dark,
          }),
          [scope]: {
            "box-sizing": "border-box",
            border: "0 solid var(--border)",
            "outline-color": "var(--ring)",
          },
          [`:where(button, input, textarea)${scope}`]: {
            font: "inherit",
            color: "inherit",
            margin: "0",
            padding: "0",
            background: "transparent",
          },
          ...(typeof motion === "object" && {
            "@media (prefers-reduced-motion: reduce)": {
              [`${scope}, ${scope}::before, ${scope}::after`]: motion,
            },
          }),
          ...Object.fromEntries(
            Object.entries(foundations).filter(
              ([key]) => !key.startsWith("@utility")
            )
          ),
        },
        ...Object.fromEntries(
          Object.entries(foundations).filter(([key]) =>
            key.startsWith("@utility")
          )
        ),
        "@utility cn-rtl-flip": { "&:dir(rtl)": { scale: "-1 1" } },
      }),
    ].join("\n"),
    { base: web, onDependency() {} }
  )
  const optimized = optimize(compiler.build(candidates), { minify: true }).code
  // Keep the layer order explicit for an app that compiles this CSS with Tailwind again.
  return `${CSS_LAYER_ORDER}\n${optimized}`
}

async function readFiles() {
  const files = new Map<string, string>()
  const visited = new Set<string>()
  const queue = [...REACT_PACKAGE_COMPONENTS, "index"]
  const prefix = "registry/base-fabricator/"
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

function emitTypeScript(entries: string[]) {
  const program = ts.createProgram(entries, {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.NodeNext,
    jsx: ts.JsxEmit.ReactJSX,
    declaration: true,
    rootDir: source,
    outDir: output,
    strict: true,
    skipLibCheck: true,
    verbatimModuleSyntax: true,
    noEmitOnError: true,
  })
  const result = program.emit()
  if (result.emitSkipped) {
    throw new Error(
      ts.formatDiagnosticsWithColorAndContext(result.diagnostics, {
        getCanonicalFileName: (name) => name,
        getCurrentDirectory: () => repo,
        getNewLine: () => "\n",
      })
    )
  }
}

await rm(staged, { recursive: true, force: true })
try {
  const files = await readFiles()
  const names = new Set(files.keys())
  const candidates = new Set<string>()
  const entries: string[] = []
  const usedDependencies = new Set<string>()
  const declaredDependencies = Object.keys(manifest.dependencies)
  for (const [filename, value] of files) {
    const transformed = transformPackageSource(filename, value, names)
    for (const dependency of transformed.dependencies) {
      if (Object.hasOwn(manifest.peerDependencies, dependency)) continue
      if (!declaredDependencies.includes(dependency))
        throw new Error(`Undeclared dependency ${dependency} in ${filename}`)
      usedDependencies.add(dependency)
    }
    transformed.candidates.forEach((candidate) => candidates.add(candidate))
    const entry = path.join(source, filename)
    await mkdir(path.dirname(entry), { recursive: true })
    await writeFile(entry, transformed.content)
    entries.push(entry)
  }
  for (const dependency of declaredDependencies) {
    if (!usedDependencies.has(dependency))
      throw new Error(`Unused dependency ${dependency}`)
  }
  const exports = Object.keys(manifest.exports)
    .filter((name) => name !== "./styles.css")
    .sort()
  if (
    exports.join() !==
    REACT_PACKAGE_COMPONENTS.map((name) => `./${name}`)
      .sort()
      .join()
  ) {
    throw new Error("React package exports and supported components differ")
  }
  emitTypeScript(entries)
  await writeFile(
    path.join(output, "styles.css"),
    await buildStyles([...candidates].sort())
  )
  for (const notice of ["LICENSE.md", "NOTICE.md"])
    await cp(path.join(repo, notice), path.join(output, notice))
  const dist = path.join(packageRoot, "dist")
  await rm(dist, { recursive: true, force: true })
  await rename(output, dist)
  console.log(`Built ${manifest.name} (${exports.length} components)`)
} finally {
  await rm(staged, { recursive: true, force: true })
}
