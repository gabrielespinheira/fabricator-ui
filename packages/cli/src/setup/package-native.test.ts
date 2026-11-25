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
import {
  DEFAULT_PROJECT_SETUP,
  EXPO_SDK,
  REACT_NATIVE_PACKAGE,
} from "@fabricator-ui/setup"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { configureNativePackage } from "./package-native"
import type { SetupContext } from "./steps"

let root: string
let context: SetupContext

beforeEach(() => {
  root = mkdtempSync(path.join(tmpdir(), "fabricator-native-package-"))
  context = {
    setup: {
      ...DEFAULT_PROJECT_SETUP,
      distribution: "package",
      web: false,
      mobile: true,
    },
    cwd: root,
    root,
    webDir: path.join(root, "apps/web"),
    mobileDir: root,
    desktopDir: path.join(root, "apps/desktop"),
    baseUrl: "http://localhost:4000",
    packageManager: "bun",
    logFile: path.join(root, "log"),
    stream: false,
    force: false,
    notes: [],
  }
  mkdirSync(path.join(root, "src/app"), { recursive: true })
  writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({ dependencies: { expo: `~${EXPO_SDK}.0.0` } })
  )
})
afterEach(() => rmSync(root, { recursive: true, force: true }))

describe("Expo package setup", () => {
  it("wires a clean app to imports and resumes without generating source copies", async () => {
    const layout = path.join(root, "src/app/_layout.tsx")
    const stylesheet = path.join(root, "src/global.css")
    writeFileSync(
      layout,
      'import AppTabs from "@/components/app-tabs"\nexport default function Layout() { return <AppTabs /> }\n'
    )
    await configureNativePackage(context, root, true)
    const files = [layout, stylesheet, path.join(root, "package.json")]
    const firstPass = files.map((file) => readFileSync(file, "utf8"))
    const page = path.join(root, "src/app/index.tsx")
    expect(readFileSync(page, "utf8")).toContain(
      `${REACT_NATIVE_PACKAGE}/button`
    )
    expect(firstPass[0]).toContain(`${REACT_NATIVE_PACKAGE}/fabricator-root`)
    expect(firstPass[1]).toContain(`${REACT_NATIVE_PACKAGE}/styles.css`)
    expect(firstPass[2]).toContain(REACT_NATIVE_PACKAGE)
    expect(
      readFileSync(path.join(root, "src/uniwind-types.d.ts"), "utf8")
    ).toContain('import "uniwind/types"')
    expect(existsSync(path.join(root, "components.json"))).toBe(false)
    writeFileSync(page, "// application changes\n")
    await configureNativePackage(context, root, true)
    expect(files.map((file) => readFileSync(file, "utf8"))).toEqual(firstPass)
    expect(readFileSync(page, "utf8")).toBe("// application changes\n")
  })

  it("preserves custom Expo Router layouts and Metro configuration", async () => {
    const layout =
      'import AppTabs from "@/components/app-tabs"\nexport default function Layout() { return <Providers><AppTabs /></Providers> }\n'
    const metro = "module.exports = createCustomMetroConfig()\n"
    writeFileSync(path.join(root, "src/app/_layout.tsx"), layout)
    writeFileSync(path.join(root, "metro.config.js"), metro)
    await configureNativePackage(context, root, false)
    expect(readFileSync(path.join(root, "src/app/_layout.tsx"), "utf8")).toBe(
      layout
    )
    expect(readFileSync(path.join(root, "metro.config.js"), "utf8")).toBe(metro)
    expect(context.notes).toHaveLength(2)
  })
})
