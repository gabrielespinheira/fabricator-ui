import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

import { findPackageStylesheet, wirePackageStyles } from "./package-install"

let root = ""
afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
})

function app() {
  root = mkdtempSync(path.join(tmpdir(), "fabricator-package-"))
  mkdirSync(path.join(root, "src"))
  return root
}

describe("package CSS setup", () => {
  it("wires the imported stylesheet once and preserves app CSS", () => {
    const root = app()
    const main = path.join(root, "src/main.tsx")
    const css = path.join(root, "src/index.css")
    writeFileSync(main, 'import "./index.css"\n')
    writeFileSync(
      css,
      '@charset "UTF-8";\n@import "tailwindcss";\nbody { color: red; }\n'
    )
    expect(findPackageStylesheet(root, "vite")).toBe(css)
    const look = ":root { --radius: 1.25rem; }\n"
    expect(wirePackageStyles(root, "vite", look)).toEqual([])
    const after = readFileSync(css, "utf8")
    expect(after).toBe(
      '@charset "UTF-8";\n@import "@fabricator-ui/react/styles.css";\n@import "./fabricator-theme.css";\n@import "tailwindcss";\nbody { color: red; }\n'
    )
    expect(
      readFileSync(path.join(root, "src/fabricator-theme.css"), "utf8")
    ).toBe(look)
    expect(wirePackageStyles(root, "vite", look)).toEqual([])
    expect(readFileSync(css, "utf8")).toBe(after)
  })

  it("prints the import when the entry and stylesheet are unknown", () => {
    const root = app()
    expect(wirePackageStyles(root, "next", "")).toEqual([
      'Add import "@fabricator-ui/react/styles.css" to your app entry or root layout.',
    ])
  })
})
