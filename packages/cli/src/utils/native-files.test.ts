import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { describe, expect, it } from "vitest"

import {
  createNativeLanguageConfig,
  installNativeFiles,
  nativeLanguageConfigSchema,
  planNativeFiles,
  resolveNativeItems,
  type NativeFileItem,
} from "./native-files"

const item = (name: string, dependencies: string[] = []): NativeFileItem => ({
  schemaVersion: 1,
  renderer: "swiftui",
  name,
  title: name,
  registryDependencies: dependencies,
  files: [
    {
      path: `ui/${name}.swift`,
      target: `ui/${name}.swift`,
      content: `// ${name}\n`,
    },
  ],
})

describe("native language file installation", () => {
  it("initializes a native-only project without React, Tailwind or package.json", () => {
    const config = createNativeLanguageConfig(
      "swiftui",
      "https://fabricator-ui.vercel.app"
    )
    expect(config).toMatchObject({
      schemaVersion: 1,
      renderer: "swiftui",
      platforms: ["ios", "ipados", "macos"],
      sourceRoot: ".",
      installed: [],
    })
    expect(nativeLanguageConfigSchema.parse(config)).toEqual(config)
    expect(
      createNativeLanguageConfig("compose", "http://localhost:4000").platforms
    ).toEqual(["android", "macos", "windows", "linux"])
  })

  it("resolves namespaced dependencies once, in dependency order", async () => {
    const fetched: string[] = []
    const items = await resolveNativeItems(
      ["button", "@fabricator/input"],
      "swiftui",
      async (name) => {
        fetched.push(name)
        return item(
          name,
          name === "foundations" ? [] : ["@fabricator/foundations"]
        )
      }
    )
    expect(items.map(({ name }) => name)).toEqual([
      "foundations",
      "button",
      "input",
    ])
    expect(fetched.filter((name) => name === "foundations")).toHaveLength(1)
  })

  it("rejects dependency cycles, mismatched renderers and external dependency URLs", async () => {
    await expect(
      resolveNativeItems(["button"], "swiftui", async (name) =>
        item(name, ["@fabricator/button"])
      )
    ).rejects.toThrow(/cycle/i)
    await expect(
      resolveNativeItems(["button"], "compose", async (name) => item(name))
    ).rejects.toThrow(/renderer/i)
    await expect(
      resolveNativeItems(["button"], "swiftui", async (name) =>
        item(name, ["https://other.test/item.json"])
      )
    ).rejects.toThrow()
  })

  it("plans conflicts before writing, supports dry runs, and preserves edited source", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-native-"))
    const config = createNativeLanguageConfig(
      "swiftui",
      "https://fabricator-ui.vercel.app"
    )
    await mkdir(path.join(cwd, "ui"))
    await writeFile(path.join(cwd, "ui/button.swift"), "// consumer edit\n")
    const files = await planNativeFiles(cwd, config, [
      item("input"),
      item("button"),
    ])
    expect(files.map(({ status }) => status)).toEqual(["create", "conflict"])
    await expect(
      installNativeFiles(cwd, config, files, { dryRun: true })
    ).resolves.toMatchObject({ written: 0 })
    await expect(
      readFile(path.join(cwd, "ui/input.swift"))
    ).rejects.toMatchObject({ code: "ENOENT" })
    await expect(installNativeFiles(cwd, config, files)).rejects.toThrow(
      /button.swift/
    )
    expect(await readFile(path.join(cwd, "ui/button.swift"), "utf8")).toBe(
      "// consumer edit\n"
    )
    await expect(
      installNativeFiles(cwd, config, files, { overwrite: true })
    ).resolves.toMatchObject({ written: 2 })
    expect(await readFile(path.join(cwd, "ui/button.swift"), "utf8")).toBe(
      "// button\n"
    )
    expect(
      JSON.parse(await readFile(path.join(cwd, "fabricator.json"), "utf8"))
        .installed
    ).toEqual(["button", "input"])
  })

  it("rejects traversal, conflicting dependency output and paths escaping through symlinks", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-native-"))
    const outside = await mkdtemp(path.join(os.tmpdir(), "fabricator-outside-"))
    const config = createNativeLanguageConfig(
      "swiftui",
      "https://fabricator-ui.vercel.app"
    )
    await symlink(outside, path.join(cwd, "ui"))
    await expect(
      planNativeFiles(cwd, config, [item("button")])
    ).rejects.toThrow(/outside|symlink/i)
    await expect(
      planNativeFiles(cwd, config, [
        {
          ...item("button"),
          files: [
            { path: "bad.swift", target: "../bad.swift", content: "bad" },
          ],
        },
      ])
    ).rejects.toThrow(/path/i)
    await expect(
      planNativeFiles(cwd, config, [
        {
          ...item("button"),
          files: [
            { path: "bad.swift", target: "fabricator.json", content: "bad" },
          ],
        },
      ])
    ).rejects.toThrow(/reserved/i)
  })

  it("installs Kotlin source and binary assets with exact bytes", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "fabricator-compose-"))
    const config = createNativeLanguageConfig(
      "compose",
      "https://fabricator-ui.vercel.app"
    )
    const font = Buffer.from([0, 1, 0, 0, 255, 128, 17, 10])
    const kotlin = "package dev.fabricator.ui\n\nclass FabricatorButton\n"
    const items: NativeFileItem[] = [
      {
        schemaVersion: 1,
        renderer: "compose",
        name: "button",
        title: "Button",
        files: [
          {
            path: "button.kt",
            target: "src/commonMain/kotlin/dev/fabricator/ui/button.kt",
            content: kotlin,
          },
          {
            path: "inter.ttf",
            target: "src/commonMain/composeResources/font/inter.ttf",
            content: font.toString("base64"),
            encoding: "base64",
          },
        ],
      },
    ]
    await installNativeFiles(
      cwd,
      config,
      await planNativeFiles(cwd, config, items)
    )
    expect(
      await readFile(
        path.join(cwd, "src/commonMain/kotlin/dev/fabricator/ui/button.kt"),
        "utf8"
      )
    ).toBe(kotlin)
    expect(
      await readFile(
        path.join(cwd, "src/commonMain/composeResources/font/inter.ttf")
      )
    ).toEqual(font)
  })
})
