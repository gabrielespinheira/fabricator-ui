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
import { DEFAULT_PROJECT_SETUP, FRAMEWORK_VALUES } from "@fabricator-ui/setup"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { writeProjectDocs } from "./project-docs"

describe("scaffold documentation", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "fabricator-project-docs-"))
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  const read = (file: string) => readFileSync(path.join(root, file), "utf8")

  it.each(FRAMEWORK_VALUES)(
    "documents a standalone %s project",
    (framework) => {
      writeFileSync(path.join(root, "README.md"), "# Upstream template\n")
      writeFileSync(
        path.join(root, "components.json"),
        JSON.stringify({ aliases: { ui: "@/components/ui" } })
      )
      writeProjectDocs(
        root,
        {
          ...DEFAULT_PROJECT_SETUP,
          name: "atlas-app",
          project: "new",
          framework,
        },
        "npm"
      )

      const readme = read("README.md")
      expect(readme).toMatch(/^# atlas-app\n/)
      expect(readme).toContain("[DESIGN.md](DESIGN.md)")
      expect(readme).toContain("npx fabricator-ui@latest docs button")
      expect(readme).toContain(
        'import { Button } from "@/components/ui/button"'
      )
      expect(readme).toContain(
        framework === "laravel"
          ? "composer run dev"
          : framework === "expo"
            ? "npx expo run:android"
            : "npm run dev"
      )
      expect(readme).not.toContain("apps/web")
      expect(read("DESIGN.md")).toContain("name: Fabricator UI")
      expect(read("AGENTS.md")).toContain("[DESIGN.md](DESIGN.md)")
      expect(read("AGENTS.md")).not.toContain("`fabricator` skill")
      expect(existsSync(path.join(root, "CLAUDE.md"))).toBe(false)
    }
  )

  it("documents each app in a mixed workspace and keeps template instructions", () => {
    const setup = {
      ...DEFAULT_PROJECT_SETUP,
      name: "atlas-app",
      framework: "vite" as const,
      base: "radix" as const,
      assistants: ["claude" as const],
      mobile: true,
      desktop: "tauri" as const,
      runner: "vite-plus" as const,
    }
    for (const [directory, ui] of [
      ["apps/web", "@workspace/ui/components"],
      ["apps/mobile", "@/components/ui"],
    ] as const) {
      mkdirSync(path.join(root, directory), { recursive: true })
      writeFileSync(
        path.join(root, directory, "components.json"),
        JSON.stringify({ aliases: { ui } })
      )
    }
    const frameworkInstructions = "# Framework rules\n\nRead the local docs.\n"
    writeFileSync(path.join(root, "AGENTS.md"), frameworkInstructions)
    writeProjectDocs(root, setup, "pnpm")
    writeProjectDocs(root, setup, "pnpm")

    const readme = read("README.md")
    expect(readme).toContain("pnpm dev:mobile")
    expect(readme).toContain("pnpm dev:desktop")
    expect(readme).toContain("pnpm exec expo run:ios")
    expect(readme).toContain(
      "pnpm dlx fabricator-ui@latest add card --cwd apps/web"
    )
    expect(readme).toContain(
      "pnpm dlx fabricator-ui@latest docs button --cwd apps/mobile"
    )
    expect(readme).toContain(
      'import { Button } from "@workspace/ui/components/button"'
    )
    const agents = read("AGENTS.md")
    expect(agents.startsWith(frameworkInstructions)).toBe(true)
    expect(agents.match(/BEGIN:fabricator-ui/g)).toHaveLength(1)
    for (const label of [
      "atlas-app",
      "Expo",
      "Vite",
      "Radix",
      "Tauri",
      "pnpm",
      "Vite+",
    ]) {
      expect(agents).toContain(label)
    }
    expect(agents).toContain("`fabricator` skill")
    expect(agents).toContain("[README.md](README.md#fabricator-ui)")
    expect(read("CLAUDE.md")).toBe("@AGENTS.md\n")
  })

  it("explains how to configure Fabricator UI on Laravel's stock React starter", () => {
    writeFileSync(
      path.join(root, "components.json"),
      JSON.stringify({ style: "new-york", aliases: { ui: "@/components/ui" } })
    )
    writeProjectDocs(
      root,
      { ...DEFAULT_PROJECT_SETUP, project: "new", framework: "laravel" },
      "npm"
    )
    expect(read("README.md")).toContain("/docs/installation/laravel")
    expect(read("README.md")).toContain(
      "init --force --base radix --no-reinstall --yes"
    )
    expect(read("README.md")).not.toContain("Built with Fabricator UI.")
    expect(read("AGENTS.md")).toContain("Radix")
    expect(read("AGENTS.md")).toContain("Fabricator UI setup")
  })

  it("keeps web commands out of a mobile-only workspace", () => {
    writeProjectDocs(
      root,
      { ...DEFAULT_PROJECT_SETUP, web: false, mobile: true },
      "bun"
    )
    const readme = read("README.md")
    expect(readme).toContain("bun dev:mobile")
    expect(readme).toContain(
      "bunx --bun fabricator-ui@latest docs button --cwd apps/mobile"
    )
    expect(readme).not.toContain("apps/web")
    expect(readme).not.toContain("packages/ui")
  })

  it("shows the desktop command for a workspace without a website", () => {
    writeProjectDocs(
      root,
      { ...DEFAULT_PROJECT_SETUP, web: false, desktop: "electron" },
      "yarn"
    )
    const readme = read("README.md")
    expect(readme).toContain("yarn dev:desktop")
    expect(readme).toContain(
      "yarn dlx fabricator-ui@latest docs button --cwd apps/web"
    )
    expect(readme).toContain("Electron window")
    expect(readme).not.toMatch(/^yarn dev$/m)
  })

  it("keeps an existing project's root docs", () => {
    for (const file of ["README.md", "AGENTS.md", "DESIGN.md"]) {
      writeFileSync(path.join(root, file), `# Existing ${file}\n`)
    }
    writeProjectDocs(
      root,
      { ...DEFAULT_PROJECT_SETUP, project: "existing" },
      "npm"
    )
    for (const file of ["README.md", "AGENTS.md", "DESIGN.md"]) {
      expect(read(file)).toBe(`# Existing ${file}\n`)
    }
  })
})
