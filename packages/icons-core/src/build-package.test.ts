import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { buildPackage } from "./build-package"

const directories: string[] = []

function createPackage(source: string) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "icons-build-"))
  directories.push(root)
  fs.mkdirSync(path.join(root, "src"))
  fs.writeFileSync(path.join(root, "src/index.ts"), source)
  fs.writeFileSync(
    path.join(root, "tsconfig.build.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        declaration: true,
        strict: true,
        rootDir: "src",
        outDir: "dist/esm",
        types: [],
      },
      include: ["src"],
    })
  )
  fs.writeFileSync(
    path.join(root, "tsconfig.cjs.json"),
    JSON.stringify({
      extends: "./tsconfig.build.json",
      compilerOptions: {
        module: "CommonJS",
        moduleResolution: "Bundler",
        outDir: "dist/cjs",
      },
    })
  )
  return root
}

function writePreviousBuild(root: string) {
  fs.mkdirSync(path.join(root, "dist/esm"), { recursive: true })
  fs.writeFileSync(path.join(root, "dist/esm/previous.js"), "")
}

function listLeftovers(root: string) {
  return fs.readdirSync(root).filter((name) => name.startsWith(".dist-"))
}

afterEach(() => {
  for (const directory of directories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true })
  }
})

describe("buildPackage", () => {
  it("writes ESM, CommonJS and declarations to dist", async () => {
    const root = createPackage("export const answer = 42\n")

    await buildPackage(root)

    expect(fs.existsSync(path.join(root, "dist/esm/index.js"))).toBe(true)
    expect(fs.existsSync(path.join(root, "dist/esm/index.d.ts"))).toBe(true)
    expect(fs.existsSync(path.join(root, "dist/cjs/index.js"))).toBe(true)
    expect(fs.existsSync(path.join(root, "dist/cjs/index.d.ts"))).toBe(true)
    expect(
      JSON.parse(
        fs.readFileSync(path.join(root, "dist/cjs/package.json"), "utf8")
      )
    ).toEqual({ type: "commonjs" })
    expect(listLeftovers(root)).toEqual([])
  })

  it("keeps the previous dist readable until the new one is ready", async () => {
    const root = createPackage("export const answer = 42\n")
    writePreviousBuild(root)

    let wasMissing = false
    const watcher = setInterval(() => {
      if (!fs.existsSync(path.join(root, "dist/esm"))) wasMissing = true
    }, 5)
    await buildPackage(root)
    clearInterval(watcher)

    expect(wasMissing).toBe(false)
    expect(fs.existsSync(path.join(root, "dist/esm/previous.js"))).toBe(false)
    expect(fs.existsSync(path.join(root, "dist/esm/index.js"))).toBe(true)
  })

  it("leaves the previous dist alone when the compile fails", async () => {
    const root = createPackage("export const answer: string = 42\n")
    writePreviousBuild(root)

    await expect(buildPackage(root)).rejects.toThrow(/tsc/)

    expect(fs.existsSync(path.join(root, "dist/esm/previous.js"))).toBe(true)
    expect(fs.existsSync(path.join(root, "dist/esm/index.js"))).toBe(false)
    expect(listLeftovers(root)).toEqual([])
  })

  it("clears builds abandoned by a killed process, not ones still running", async () => {
    const root = createPackage("export const answer = 42\n")
    const abandoned = path.join(root, ".dist-next-1")
    const running = path.join(root, ".dist-next-2")
    fs.mkdirSync(abandoned)
    fs.mkdirSync(running)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    fs.utimesSync(abandoned, yesterday, yesterday)

    await buildPackage(root)

    expect(listLeftovers(root)).toEqual([".dist-next-2"])
  })
})
