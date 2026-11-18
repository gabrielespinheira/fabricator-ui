// A new monorepo's linter and formatter. shadcn's templates ship ESLint and
// Prettier (React Router's only Prettier); Biome and Vite+ replace both and run
// once from the root. Versions are the ones this CLI was tested with.

import path from "node:path"
import type { Runner, Tooling } from "@fabricator-ui/setup"

export const TOOLING_VERSIONS = {
  biome: "2.6.8",
  vitePlus: "1.6.0",
  prettier: "3.10.1",
  eslint: "10.15.0",
  /** eslint-config-expo's React plugin doesn't load in ESLint 10 yet. */
  expoEslint: "9.39.5",
  eslintJs: "10.0.1",
  eslintConfigExpo: "58.0.4",
  eslintPluginReactHooks: "7.1.1",
  eslintPluginReactRefresh: "0.5.8",
  globals: "17.14.0",
  typescriptEslint: "8.72.2",
} as const

export type PackageJson = Record<string, unknown> & {
  scripts?: Record<string, string>
  devDependencies?: Record<string, string>
}

type TurboJson = Record<string, unknown> & {
  tasks?: Record<string, unknown>
}

/** ESLint, Prettier and the packages that exist only for them. */
function isLintOrFormatPackage(name: string) {
  return (
    name.includes("eslint") || name.includes("prettier") || name === "globals"
  )
}

/** A workspace package without the template's ESLint and Prettier. */
export function stripEslintAndPrettier(pkg: PackageJson): PackageJson {
  const { scripts, devDependencies, ...rest } = pkg
  const next: PackageJson = { ...rest }
  if (scripts) {
    const { lint: _lint, format: _format, ...kept } = scripts
    next.scripts = kept
  }
  if (devDependencies) {
    next.devDependencies = Object.fromEntries(
      Object.entries(devDependencies).filter(
        ([name]) => !isLintOrFormatPackage(name)
      )
    )
  }
  return next
}

/** Lint and format run once from the root, so Turborepo no longer fans them out. */
export function withoutTurboTasks(turbo: TurboJson): TurboJson {
  if (!turbo.tasks) return turbo
  const { lint: _lint, format: _format, ...tasks } = turbo.tasks
  return { ...turbo, tasks }
}

/** `turbo build` → `vp run -r build`: the same task in every package, in order. */
export function toViteTaskScripts(
  scripts: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(scripts).map(([name, command]) => {
      const task = /^turbo (?:run )?([\w:-]+)$/.exec(command)?.[1]
      return [name, task ? `vp run -r ${task}` : command]
    })
  )
}

export const VITE_PLUS_DEPENDENCY = { "vite-plus": TOOLING_VERSIONS.vitePlus }

/** The root scripts that start apps, written for the monorepo's task runner. */
export function buildDevScripts(
  runner: Runner,
  { hasDesktop }: { hasDesktop: boolean }
) {
  if (runner === "vite-plus") {
    return {
      dev: "vp run --filter web dev",
      ...(hasDesktop
        ? {
            "dev:desktop":
              "vp run --parallel --filter web --filter desktop dev",
          }
        : {}),
    }
  }
  return {
    // A plain `turbo dev` would launch Expo and a window too.
    dev: "turbo run dev --filter=web",
    ...(hasDesktop
      ? { "dev:desktop": "turbo run dev --filter=web --filter=desktop" }
      : {}),
  }
}

/** React Router's template has no lint task; ESLint adds one. */
export function withTurboLintTask(turbo: TurboJson): TurboJson {
  return { ...turbo, tasks: { ...turbo.tasks, lint: { dependsOn: ["^lint"] } } }
}

export function buildRootToolingScripts(
  tooling: Exclude<Tooling, "eslint-prettier">
) {
  if (tooling === "biome") {
    return {
      lint: "biome lint .",
      format: "biome format --write .",
      check: "biome check .",
    }
  }
  return { lint: "vp lint", format: "vp fmt", check: "vp check" }
}

/** What each toolchain fixes on its own: formatting, imports, safe lint fixes. */
export function buildFixCommand(
  tooling: Exclude<Tooling, "eslint-prettier">,
  root: string
) {
  const bin = path.join(root, "node_modules/.bin")
  return tooling === "biome"
    ? { command: path.join(bin, "biome"), args: ["check", "--write", "."] }
    : { command: path.join(bin, "vp"), args: ["check", "--fix"] }
}

export function getRootToolingDevDependencies(
  tooling: Exclude<Tooling, "eslint-prettier">
): Record<string, string> {
  return tooling === "biome"
    ? { "@biomejs/biome": TOOLING_VERSIONS.biome }
    : VITE_PLUS_DEPENDENCY
}

/** Build output, generated and native folders no tool should read. */
const IGNORED_FOLDERS = [
  ".astro",
  ".expo",
  ".next",
  ".output",
  ".react-router",
  ".tanstack",
  ".turbo",
  "*.icon",
  "android",
  "build",
  "dist",
  "ios",
]

/** The template's Prettier style, in Biome, with Tailwind's CSS understood. */
export function buildBiomeConfig() {
  const config = {
    $schema: `https://biomejs.dev/schemas/${TOOLING_VERSIONS.biome}/schema.json`,
    vcs: { enabled: true, clientKind: "git", useIgnoreFile: true },
    files: {
      includes: ["**", ...IGNORED_FOLDERS.map((folder) => `!**/${folder}`)],
    },
    formatter: {
      enabled: true,
      indentStyle: "space",
      indentWidth: 2,
      lineWidth: 80,
      lineEnding: "lf",
    },
    javascript: {
      formatter: {
        quoteStyle: "double",
        semicolons: "asNeeded",
        trailingCommas: "es5",
      },
    },
    css: { parser: { tailwindDirectives: true } },
    linter: { enabled: true },
    assist: { actions: { source: { organizeImports: "on" } } },
  }
  return `${JSON.stringify(config, null, 2)}\n`
}

/** The template's Prettier style in Oxfmt, and Oxlint with type checks. */
export function buildViteConfig({ hasWebApp }: { hasWebApp: boolean }) {
  const ignorePatterns = JSON.stringify(
    IGNORED_FOLDERS.map((folder) => `**/${folder}/**`)
  )
  const tailwind = hasWebApp
    ? `
    sortTailwindcss: {
      stylesheet: "packages/ui/src/styles/globals.css",
      functions: ["cn", "cva"],
    },`
    : ""
  return `import { defineConfig } from "vite-plus"

export default defineConfig({
  fmt: {
    ignorePatterns: ${ignorePatterns},
    semi: false,
    singleQuote: false,
    trailingComma: "es5",
    printWidth: 80,${tailwind}
  },
  lint: {
    ignorePatterns: ${ignorePatterns},
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
})
`
}

/** What `expo lint` would write: Expo's flat config. */
export const EXPO_ESLINT_CONFIG = `// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require("eslint/config")
const expoConfig = require("eslint-config-expo/flat")

module.exports = defineConfig([expoConfig, { ignores: ["dist/*"] }])
`

export const EXPO_ESLINT_DEPENDENCIES = {
  eslint: TOOLING_VERSIONS.expoEslint,
  "eslint-config-expo": TOOLING_VERSIONS.eslintConfigExpo,
}

/** The Vite template's ESLint config, for React Router, which ships none. */
export function buildReactEslintConfig(ignores: string[]) {
  return `import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(${JSON.stringify(ignores)}),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
])
`
}

export const REACT_ESLINT_DEPENDENCIES = {
  "@eslint/js": TOOLING_VERSIONS.eslintJs,
  eslint: TOOLING_VERSIONS.eslint,
  "eslint-plugin-react-hooks": TOOLING_VERSIONS.eslintPluginReactHooks,
  "eslint-plugin-react-refresh": TOOLING_VERSIONS.eslintPluginReactRefresh,
  globals: TOOLING_VERSIONS.globals,
  "typescript-eslint": TOOLING_VERSIONS.typescriptEslint,
}

/** The template's Prettier style, for a monorepo that has no template. */
export const PRETTIER_CONFIG = `${JSON.stringify(
  {
    endOfLine: "lf",
    semi: false,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 80,
  },
  null,
  2
)}\n`

export const PRETTIER_IGNORE = `${IGNORED_FOLDERS.map((folder) => `${folder}/`).join("\n")}\nnode_modules/\n`
