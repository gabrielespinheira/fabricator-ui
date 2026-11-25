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
import { DEFAULT_PROJECT_SETUP } from "@fabricator-ui/setup"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { STEPS, type SetupContext } from "./steps"

let context: SetupContext

beforeEach(() => {
  const root = mkdtempSync(path.join(tmpdir(), "fabricator-tauri-test-"))
  context = {
    setup: {
      ...DEFAULT_PROJECT_SETUP,
      framework: "vite",
      name: "12-acme",
      mobile: true,
      mobileRuntime: "tauri",
      desktop: "tauri",
    },
    cwd: root,
    root,
    webDir: path.join(root, "apps/web"),
    mobileDir: path.join(root, "apps/mobile"),
    desktopDir: path.join(root, "apps/desktop"),
    baseUrl: "http://localhost:4000",
    packageManager: "bun",
    logFile: path.join(root, "setup.log"),
    stream: false,
    force: false,
    notes: [],
  }
  mkdirSync(context.webDir, { recursive: true })
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      workspaces: ["apps/*"],
      scripts: { build: "turbo build" },
    })
  )
  writeFileSync(
    path.join(context.webDir, "package.json"),
    JSON.stringify({
      dependencies: { react: "19.3.1" },
      devDependencies: { vite: "8.3.8" },
      scripts: { dev: "vite", build: "vite build" },
    })
  )
  writeFileSync(
    path.join(context.webDir, "index.html"),
    "<!doctype html><title>Test renderer</title>"
  )
})

afterEach(() => rmSync(context.root, { recursive: true, force: true }))

describe("Tauri mobile host setup", () => {
  it("uses the same renderer as desktop with a separate native bundle", async () => {
    await STEPS["scaffold-tauri-mobile"](context)
    await STEPS["scaffold-desktop"](context)
    await STEPS["configure-workspace"](context)

    const mobileConfig = path.join(
      context.mobileDir,
      "src-tauri/tauri.conf.json"
    )
    const desktopConfig = path.join(
      context.desktopDir,
      "src-tauri/tauri.conf.json"
    )
    expect(JSON.parse(readFileSync(mobileConfig, "utf8"))).toMatchObject({
      identifier: "app.project12acme.mobile",
      build: {
        beforeDevCommand: {
          cwd: "../../web",
          script: "bun run dev:tauri-mobile",
        },
        beforeBuildCommand: {
          cwd: "../../web",
          script: "bun run build:tauri-mobile",
        },
        devUrl: "http://localhost:1422",
        frontendDist: "../dist",
      },
    })
    expect(JSON.parse(readFileSync(desktopConfig, "utf8"))).toMatchObject({
      identifier: "app.a12-acme.desktop",
      build: {
        frontendDist: "../../web/dist",
        devUrl: "http://localhost:5173",
      },
    })
    expect(
      JSON.parse(readFileSync(path.join(context.root, "package.json"), "utf8"))
        .scripts
    ).toMatchObject({
      "dev:mobile:ipad": "cd apps/mobile && bun run ipad",
      "init:mobile:android": "cd apps/mobile && bun run init:android",
      build: "turbo build",
    })
    expect(existsSync(path.join(context.root, "bunfig.toml"))).toBe(false)
    expect(
      existsSync(path.join(context.mobileDir, "src-tauri/src/note.rs"))
    ).toBe(false)
  })

  it("preserves local edits on retry and rejects a different app before writes", async () => {
    const webManifest = path.join(context.webDir, "package.json")
    const before = readFileSync(webManifest, "utf8")
    mkdirSync(context.mobileDir)
    const manifest = path.join(context.mobileDir, "package.json")
    writeFileSync(manifest, '{ "name": "expo" }')
    await expect(STEPS["scaffold-tauri-mobile"](context)).rejects.toThrow(
      "apps/mobile already exists"
    )
    expect(readFileSync(webManifest, "utf8")).toBe(before)

    rmSync(context.mobileDir, { recursive: true })
    await STEPS["scaffold-tauri-mobile"](context)
    const renderer = path.join(context.webDir, "vite.tauri-mobile.config.mjs")
    const edited = readFileSync(renderer, "utf8") + "\n// Local configuration\n"
    writeFileSync(renderer, edited)
    await STEPS["scaffold-tauri-mobile"](context)
    expect(readFileSync(renderer, "utf8")).toBe(edited)
  })
})
