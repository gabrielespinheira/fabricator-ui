import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  buildMetroConfig,
  buildNativeComponentsJson,
  ensureCssImports,
  findCssEntry,
  isExpoProject,
  isReactNativeProject,
  registryTemplateFor,
  usesNativeRegistry,
  writeNativeSetup,
} from "./native"

describe("project detection", () => {
  it("knows Expo and bare React Native", () => {
    expect(isExpoProject({ dependencies: { expo: "~58.0.0" } })).toBe(true)
    expect(isReactNativeProject({ dependencies: { expo: "~58.0.0" } })).toBe(
      true
    )
    expect(
      isReactNativeProject({ dependencies: { "react-native": "0.88.1" } })
    ).toBe(true)
    expect(isExpoProject({ dependencies: { "react-native": "0.88.1" } })).toBe(
      false
    )
  })

  it("leaves web projects alone", () => {
    expect(isReactNativeProject({ dependencies: { next: "16.0.0" } })).toBe(
      false
    )
    expect(isReactNativeProject(undefined)).toBe(false)
  })

  it("reads the platform from the registry URL", () => {
    expect(
      usesNativeRegistry({
        registries: {
          "@fabricator": "https://x.dev/r/fabricator/native/{name}.json",
        },
      })
    ).toBe(true)
    expect(
      usesNativeRegistry({
        registries: {
          "@fabricator": "https://x.dev/r/fabricator/{style}/{name}.json",
        },
      })
    ).toBe(false)
  })
})

describe("findCssEntry", () => {
  const having =
    (...files: string[]) =>
    (file: string) =>
      files.includes(file)

  it("uses a stylesheet the project already has", () => {
    expect(findCssEntry(having("src/global.css", "src"))).toBe("src/global.css")
    expect(findCssEntry(having("global.css"))).toBe("global.css")
  })

  it("puts a new one next to the code", () => {
    expect(findCssEntry(having("src"))).toBe("src/global.css")
    expect(findCssEntry(having())).toBe("global.css")
  })
})

describe("ensureCssImports", () => {
  it("adds both imports to a new file", () => {
    expect(ensureCssImports("")).toBe(
      '@import "tailwindcss";\n@import "uniwind";\n'
    )
  })

  it("keeps what the stylesheet had, after the imports", () => {
    expect(ensureCssImports(":root { --a: 1; }\n")).toBe(
      '@import "tailwindcss";\n@import "uniwind";\n\n:root { --a: 1; }\n'
    )
  })

  it("adds only what's missing, in either quote style", () => {
    expect(ensureCssImports("@import 'tailwindcss';\n")).toBe(
      "@import \"uniwind\";\n\n@import 'tailwindcss';\n"
    )
  })

  it("changes nothing when both are there", () => {
    const css = '@import "tailwindcss";\n@import "uniwind";\n'
    expect(ensureCssImports(css)).toBe(css)
  })
})

describe("buildMetroConfig", () => {
  it("wraps the config in Uniwind, with typings beside the stylesheet", () => {
    const config = buildMetroConfig("src/global.css")
    expect(config).toContain('cssEntryFile: "./src/global.css"')
    expect(config).toContain('dtsFile: "./src/uniwind-types.d.ts"')
    expect(buildMetroConfig("global.css")).toContain(
      'dtsFile: "./uniwind-types.d.ts"'
    )
  })
})

describe("buildNativeComponentsJson", () => {
  const config = buildNativeComponentsJson(
    "src/global.css",
    "https://fabricator-ui.vercel.app"
  )

  it("keeps a valid upstream style id that leaves asChild alone", () => {
    expect(config.style).toBe("radix-nova")
  })

  it("points at the native registry", () => {
    expect(usesNativeRegistry(config)).toBe(true)
  })

  it("has no Server Components", () => {
    expect(config.rsc).toBe(false)
  })
})

describe("files", () => {
  let cwd: string

  beforeEach(() => {
    cwd = mkdtempSync(path.join(tmpdir(), "fabricator-native-"))
  })

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true })
  })

  const file = (relative: string) => path.join(cwd, relative)

  it("sets up a fresh Expo project", () => {
    mkdirSync(file("src"))
    writeFileSync(file("src/global.css"), ":root { --a: 1; }\n")
    const result = writeNativeSetup(cwd, "https://x.dev")
    expect(result.cssEntry).toBe("src/global.css")
    expect(result.hasCustomMetro).toBe(false)
    expect(result.changes.map((change) => change.file)).toEqual([
      "src/global.css",
      "metro.config.js",
      "components.json",
    ])
    expect(readFileSync(file("src/global.css"), "utf8")).toContain(
      '@import "uniwind";'
    )
    expect(
      JSON.parse(readFileSync(file("components.json"), "utf8")).registries[
        "@fabricator"
      ]
    ).toBe("https://x.dev/r/fabricator/native/{name}.json")
  })

  it("never overwrites a project's Metro config or components.json", () => {
    writeFileSync(file("metro.config.js"), "module.exports = {}\n")
    writeFileSync(file("components.json"), '{"style":"base-nova"}\n')
    const result = writeNativeSetup(cwd, "https://x.dev")
    expect(result.hasCustomMetro).toBe(true)
    expect(readFileSync(file("metro.config.js"), "utf8")).toBe(
      "module.exports = {}\n"
    )
    expect(readFileSync(file("components.json"), "utf8")).toBe(
      '{"style":"base-nova"}\n'
    )
  })

  it("is safe to run twice", () => {
    writeNativeSetup(cwd, "https://x.dev")
    expect(writeNativeSetup(cwd, "https://x.dev").changes).toEqual([])
    expect(existsSync(file("global.css"))).toBe(true)
  })

  it("picks the registry by what the project is", () => {
    writeFileSync(
      file("package.json"),
      JSON.stringify({ dependencies: { expo: "~58.0.0" } })
    )
    expect(registryTemplateFor(cwd, "https://x.dev")).toBe(
      "https://x.dev/r/fabricator/native/{name}.json"
    )
    writeFileSync(
      file("package.json"),
      JSON.stringify({ dependencies: { next: "16.0.0" } })
    )
    expect(registryTemplateFor(cwd, "https://x.dev")).toBe(
      "https://x.dev/r/fabricator/{style}/{name}.json"
    )
  })
})
