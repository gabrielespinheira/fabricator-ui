import { describe, expect, it } from "vitest"

import {
  buildBiomeConfig,
  buildFixCommand,
  buildRootToolingScripts,
  buildViteConfig,
  stripEslintAndPrettier,
  toViteTaskScripts,
  withoutTurboTasks,
  withTurboLintTask,
} from "./tooling"

describe("stripEslintAndPrettier", () => {
  it("drops the template's ESLint and Prettier packages and scripts", () => {
    expect(
      stripEslintAndPrettier({
        name: "web",
        scripts: {
          dev: "next dev",
          lint: "eslint",
          format: 'prettier --write "**/*.{ts,tsx}"',
        },
        dependencies: { next: "16.4.5" },
        devDependencies: {
          "@eslint/js": "^10",
          "@next/eslint-plugin-next": "^16",
          "@workspace/eslint-config": "workspace:*",
          eslint: "^10",
          "eslint-plugin-react-hooks": "^7",
          globals: "^17",
          prettier: "^3",
          "prettier-plugin-tailwindcss": "^0.8",
          "typescript-eslint": "^8",
          "@tanstack/eslint-config": "^0.3",
          typescript: "^5",
        },
      })
    ).toEqual({
      name: "web",
      scripts: { dev: "next dev" },
      dependencies: { next: "16.4.5" },
      devDependencies: { typescript: "^5" },
    })
  })

  it("leaves a package without them alone", () => {
    const pkg = { name: "ui", devDependencies: { typescript: "^5" } }
    expect(stripEslintAndPrettier(pkg)).toEqual(pkg)
  })
})

describe("buildFixCommand", () => {
  it("fixes what each toolchain can, from the root's own binary", () => {
    expect(buildFixCommand("biome", "/app")).toEqual({
      command: "/app/node_modules/.bin/biome",
      args: ["check", "--write", "."],
    })
    expect(buildFixCommand("vite-plus", "/app")).toEqual({
      command: "/app/node_modules/.bin/vp",
      args: ["check", "--fix"],
    })
  })
})

describe("withoutTurboTasks", () => {
  it("removes the lint and format tasks the toolchain now runs from the root", () => {
    expect(
      withoutTurboTasks({
        tasks: {
          build: {},
          lint: { dependsOn: ["^lint"] },
          format: {},
          dev: {},
        },
      })
    ).toEqual({ tasks: { build: {}, dev: {} } })
  })
})

describe("toViteTaskScripts", () => {
  it("runs Turborepo's tasks with Vite+ instead, in every package", () => {
    expect(
      toViteTaskScripts({
        build: "turbo build",
        lint: "turbo lint",
        typecheck: "turbo run typecheck",
        dev: "vp run --filter web dev",
        check: "biome check .",
      })
    ).toEqual({
      build: "vp run -r build",
      lint: "vp run -r lint",
      typecheck: "vp run -r typecheck",
      dev: "vp run --filter web dev",
      check: "biome check .",
    })
  })
})

describe("withTurboLintTask", () => {
  it("adds a lint task beside the template's", () => {
    expect(withTurboLintTask({ tasks: { build: {} } })).toEqual({
      tasks: { build: {}, lint: { dependsOn: ["^lint"] } },
    })
  })
})

describe("buildRootToolingScripts", () => {
  it("runs Biome and Vite+ once, from the root", () => {
    expect(buildRootToolingScripts("biome")).toEqual({
      lint: "biome lint .",
      format: "biome format --write .",
      check: "biome check .",
    })
    expect(buildRootToolingScripts("vite-plus")).toEqual({
      lint: "vp lint",
      format: "vp fmt",
      check: "vp check",
    })
  })
})

describe("the toolchain configs", () => {
  it("keeps the template's Prettier style in Biome, and reads Tailwind's CSS", () => {
    const config = JSON.parse(buildBiomeConfig())
    expect(config.javascript.formatter).toMatchObject({
      semicolons: "asNeeded",
      quoteStyle: "double",
      trailingCommas: "es5",
    })
    expect(config.css.parser.tailwindDirectives).toBe(true)
    expect(config.vcs.useIgnoreFile).toBe(true)
    // Biome's preset is its recommended rules; `recommended` is deprecated.
    expect(config.linter).toEqual({ enabled: true })
  })

  it("sorts Tailwind classes against packages/ui's stylesheet in Vite+", () => {
    const config = buildViteConfig({ hasWebApp: true })
    expect(config).toContain('from "vite-plus"')
    expect(config).toContain("packages/ui/src/styles/globals.css")
    expect(buildViteConfig({ hasWebApp: false })).not.toContain(
      "sortTailwindcss"
    )
  })
})
