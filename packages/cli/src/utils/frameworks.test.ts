import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { detectFramework } from "./frameworks"

describe("detectFramework", () => {
  let dir: string
  const dependencies = (deps: Record<string, string>) =>
    writeFileSync(
      path.join(dir, "package.json"),
      JSON.stringify({ devDependencies: deps })
    )
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "fabricator-framework-"))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  it.each([
    ["next", "next"],
    ["expo", "expo"],
    ["astro", "astro"],
    ["@react-router/dev", "react-router"],
    ["@tanstack/react-start", "start"],
    ["vite", "vite"],
  ])("reads %s as %s", (dependency, framework) => {
    dependencies({ [dependency]: "1" })
    expect(detectFramework(dir)).toBe(framework)
  })

  it("prefers the framework over the bundler under it", () => {
    dependencies({ vite: "1", "@react-router/dev": "1" })
    expect(detectFramework(dir)).toBe("react-router")
  })

  it("knows Laravel by its artisan file, though it uses Vite", () => {
    dependencies({ vite: "1" })
    writeFileSync(path.join(dir, "artisan"), "")
    expect(detectFramework(dir)).toBe("laravel")
  })

  it("is undefined for anything else", () => {
    expect(detectFramework(dir)).toBeUndefined()
    dependencies({ left: "1" })
    expect(detectFramework(dir)).toBeUndefined()
  })
})
