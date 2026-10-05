import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { buildAddFlags } from "./add"
import { buildApplyArgs, buildReinstallArgs } from "./apply"
import { extractDocLinks, itemNameOf } from "./docs"
import { collectChecks, majorVersion } from "./doctor"
import { buildInitArgs, buildStarterButtonArgs, findProjectDir } from "./init"
import { buildSearchArgs } from "./search"

const INIT_URL =
  "https://fabricator-ui.com/init?base=base&preset=fabricator&template=next"

describe("buildInitArgs", () => {
  it("puts the init URL first, rewrites components and forwards flags", () => {
    expect(
      buildInitArgs(INIT_URL, ["button", "@shadcn/card"], {
        cwd: "/work",
        base: "base",
        template: "next",
        monorepo: false,
        rtl: true,
        yes: true,
        name: "app",
        cssVariables: false,
      })
    ).toEqual([
      "init",
      INIT_URL,
      "@fabricator/button",
      "@shadcn/card",
      "--template",
      "next",
      "--base",
      "base",
      "--no-monorepo",
      "--rtl",
      "--yes",
      "--cwd",
      "/work",
      "--name",
      "app",
      "--no-css-variables",
    ])
  })

  it("omits flags the user did not set", () => {
    expect(buildInitArgs(INIT_URL, [], { cwd: "/w", base: "radix" })).toEqual([
      "init",
      INIT_URL,
      "--base",
      "radix",
      "--cwd",
      "/w",
    ])
  })

  it("builds the starter button follow-up", () => {
    expect(buildStarterButtonArgs("/w/next-app")).toEqual([
      "add",
      "@fabricator/button",
      "--overwrite",
      "--yes",
      "--cwd",
      "/w/next-app",
    ])
  })
})

describe("findProjectDir", () => {
  let dir: string
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "fabricator-init-"))
  })
  afterEach(() => rmSync(dir, { recursive: true, force: true }))

  const project = (rel: string) => {
    mkdirSync(path.join(dir, rel), { recursive: true })
    writeFileSync(path.join(dir, rel, "package.json"), "{}")
    writeFileSync(path.join(dir, rel, "components.json"), "{}")
  }

  it("uses cwd when it already had a package.json", () => {
    writeFileSync(path.join(dir, "components.json"), "{}")
    expect(
      findProjectDir({ cwd: dir, hadPackageJson: true, before: new Set() })
    ).toBe(dir)
  })

  it("uses --name", () => {
    project("my-app")
    expect(
      findProjectDir({
        cwd: dir,
        hadPackageJson: false,
        before: new Set(),
        name: "my-app",
      })
    ).toBe(path.join(dir, "my-app"))
  })

  it("finds the single new project directory", () => {
    mkdirSync(path.join(dir, "existing"))
    project("picked-name")
    expect(
      findProjectDir({
        cwd: dir,
        hadPackageJson: false,
        before: new Set(["existing"]),
        template: "vite",
      })
    ).toBe(path.join(dir, "picked-name"))
  })

  it("targets apps/web in a monorepo", () => {
    mkdirSync(path.join(dir, "mono"))
    writeFileSync(path.join(dir, "mono", "package.json"), "{}")
    project("mono/apps/web")
    expect(
      findProjectDir({
        cwd: dir,
        hadPackageJson: false,
        before: new Set(),
        name: "mono",
      })
    ).toBe(path.join(dir, "mono", "apps", "web"))
  })

  it("gives up when it cannot tell", () => {
    project("a")
    project("b")
    expect(
      findProjectDir({
        cwd: dir,
        hadPackageJson: false,
        before: new Set(),
        template: "next",
      })
    ).toBeUndefined()
  })
})

describe("pass-through flags", () => {
  it("forwards add flags, including optional --diff/--view values", () => {
    expect(
      buildAddFlags({
        cwd: "/w",
        yes: true,
        overwrite: true,
        path: "src/ui",
        silent: true,
        dryRun: true,
      })
    ).toEqual([
      "--yes",
      "--overwrite",
      "--cwd",
      "/w",
      "--path",
      "src/ui",
      "--silent",
      "--dry-run",
    ])
    expect(buildAddFlags({ cwd: "/w", diff: true })).toEqual([
      "--cwd",
      "/w",
      "--diff",
    ])
    expect(buildAddFlags({ cwd: "/w", view: "button.tsx" })).toEqual([
      "--cwd",
      "/w",
      "--view",
      "button.tsx",
    ])
  })

  it("re-adds installed components from @fabricator after apply", () => {
    expect(buildReinstallArgs([], { cwd: "/w" })).toBeUndefined()
    expect(buildReinstallArgs(["button", "dialog"], { cwd: "/w" })).toEqual([
      "add",
      "@fabricator/button",
      "@fabricator/dialog",
      "--overwrite",
      "--yes",
      "--cwd",
      "/w",
    ])
  })

  it("builds apply and search arguments", () => {
    expect(
      buildApplyArgs("U", { cwd: "/w", only: "theme", yes: true })
    ).toEqual([
      "apply",
      "--preset",
      "U",
      "--only",
      "theme",
      "--yes",
      "--cwd",
      "/w",
    ])
    expect(
      buildSearchArgs("@fabricator", "date", {
        cwd: "/w",
        type: "ui",
        limit: "5",
        json: true,
      })
    ).toEqual([
      "search",
      "@fabricator",
      "--query",
      "date",
      "--type",
      "ui",
      "--limit",
      "5",
      "--json",
      "--cwd",
      "/w",
    ])
  })
})

describe("docs helpers", () => {
  it("reads flat and per-base links", () => {
    expect(
      extractDocLinks({ meta: { links: { docs: "d", examples: "e" } } }, "base")
    ).toEqual({ docs: "d", examples: "e" })
    expect(
      extractDocLinks(
        { meta: { links: { radix: { docs: "r" }, base: { docs: "b" } } } },
        "radix"
      )
    ).toEqual({
      docs: "r",
    })
    expect(extractDocLinks({}, "base")).toEqual({})
  })

  it("derives item names from addresses", () => {
    expect(itemNameOf("@fabricator/button")).toBe("button")
    expect(
      itemNameOf("https://x.dev/r/fabricator/base-nova/card.json?x=1")
    ).toBe("card")
    expect(itemNameOf("dialog")).toBe("dialog")
  })
})

describe("doctor", () => {
  const baseUrl = "https://fabricator-ui.com"
  const healthy = {
    style: "base-nova",
    tailwind: { config: "", css: "app/globals.css" },
    registries: {
      "@fabricator": `${baseUrl}/r/fabricator/{style}/{name}.json`,
    },
  }

  it("parses major versions", () => {
    expect(majorVersion("^19.2.0")).toBe(19)
    expect(majorVersion(">=18")).toBe(18)
    expect(majorVersion("latest")).toBeUndefined()
  })

  it("passes a healthy project", () => {
    const checks = collectChecks({
      baseUrl,
      componentsJson: {
        exists: true,
        path: "/w/components.json",
        raw: "",
        config: healthy,
      },
      info: { project: { tailwindVersion: "v4" } },
      packageJson: { dependencies: { react: "19.2.0", cn: "^1.0.0" } },
      css: '@import "tailwindcss";\n@import "shadcn/tailwind.css";\n',
      cssPath: "app/globals.css",
    })
    expect(checks.filter((c) => c.status !== "pass")).toEqual([])
  })

  it("flags the usual problems", () => {
    const checks = collectChecks({
      baseUrl,
      componentsJson: {
        exists: true,
        path: "/w/components.json",
        raw: "",
        config: {
          style: "new-york",
          tailwind: { config: "tailwind.config.ts", css: "src/index.css" },
        },
      },
      info: { project: { tailwindVersion: "v3" } },
      packageJson: { dependencies: { react: "^18.3.1" } },
      css: "@tailwind base;",
      cssPath: "src/index.css",
    })
    const byStatus = (status: string) =>
      checks.filter((c) => c.status === status).map((c) => c.label)
    expect(byStatus("warn")).toEqual(
      expect.arrayContaining([
        expect.stringContaining("legacy"),
        expect.stringContaining("cn"),
      ])
    )
    expect(byStatus("fail")).toEqual([
      "@fabricator registry not configured",
      "Tailwind CSS v3 detected (tailwind.config is set)",
      "React 18 detected",
      "src/index.css does not import shadcn/tailwind.css",
    ])
  })

  it("fails without components.json", () => {
    const checks = collectChecks({
      baseUrl,
      componentsJson: { exists: false, path: "/w/components.json" },
    })
    expect(checks.map((c) => c.status)).toEqual(["fail", "fail"])
  })
})
