import {
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
  alignWorkspaceAliases,
  exportTsxLibs,
  findWorkspaceRoot,
  getUiPackageDir,
  listWorkspaceApps,
  removeUnusedScaffoldLucide,
  shareIconDependency,
} from "./workspace"

describe("workspace helpers", () => {
  let root: string
  const write = (file: string, value: unknown) => {
    const full = path.join(root, file)
    mkdirSync(path.dirname(full), { recursive: true })
    writeFileSync(
      full,
      typeof value === "string" ? value : JSON.stringify(value)
    )
  }
  const read = (file: string) =>
    JSON.parse(readFileSync(path.join(root, file), "utf8"))

  beforeEach(() => {
    root = mkdtempSync(path.join(tmpdir(), "fabricator-workspace-"))
    write("package.json", { name: "app", workspaces: ["apps/*", "packages/*"] })
    write("apps/web/package.json", { name: "web", dependencies: {} })
    write("apps/web/components.json", {
      style: "base-nova",
      aliases: {
        components: "@/components",
        hooks: "@/hooks",
        lib: "@/lib",
        utils: "@workspace/ui/lib/utils",
        ui: "@workspace/ui/components",
      },
    })
    write("packages/ui/package.json", {
      name: "@workspace/ui",
      dependencies: { "@fabricator-ui/icons": "^1.0.0" },
      exports: {
        "./lib/*": "./src/lib/*.ts",
        "./components/*": "./src/components/*.tsx",
      },
    })
    write("packages/ui/components.json", { aliases: {} })
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  describe("findWorkspaceRoot", () => {
    it("walks up to the package.json that declares workspaces", () => {
      expect(findWorkspaceRoot(path.join(root, "apps/web"))).toBe(root)
      expect(findWorkspaceRoot(root)).toBe(root)
    })

    it("reads pnpm-workspace.yaml", () => {
      write("package.json", { name: "app" })
      write("pnpm-workspace.yaml", 'packages:\n  - "apps/*"\n')
      expect(findWorkspaceRoot(path.join(root, "apps/web"))).toBe(root)
    })

    it("is undefined outside a workspace", () => {
      const lone = mkdtempSync(path.join(tmpdir(), "fabricator-lone-"))
      writeFileSync(path.join(lone, "package.json"), "{}")
      expect(findWorkspaceRoot(lone)).toBeUndefined()
      rmSync(lone, { recursive: true, force: true })
    })
  })

  describe("listWorkspaceApps", () => {
    it("lists the apps with a components.json, not the shared package", () => {
      write("apps/mobile/package.json", {
        name: "mobile",
        dependencies: { expo: "58" },
      })
      write("apps/mobile/components.json", {})
      write("apps/desktop/package.json", { name: "desktop" })
      expect(
        listWorkspaceApps(root).map(({ name, isNative }) => ({
          name,
          isNative,
        }))
      ).toEqual([
        { name: "mobile", isNative: true },
        { name: "web", isNative: false },
      ])
    })
  })

  describe("alignWorkspaceAliases", () => {
    it("points libs and hooks at the shared package", () => {
      expect(alignWorkspaceAliases(path.join(root, "apps/web"))).toBe(true)
      const { aliases } = read("apps/web/components.json")
      expect(aliases.lib).toBe("@workspace/ui/lib")
      expect(aliases.hooks).toBe("@workspace/ui/hooks")
      expect(aliases.components).toBe("@/components")
    })

    it("does nothing the second time", () => {
      alignWorkspaceAliases(path.join(root, "apps/web"))
      expect(alignWorkspaceAliases(path.join(root, "apps/web"))).toBe(false)
    })

    it("leaves a project without a shared package alone", () => {
      write("solo/components.json", {
        aliases: { ui: "@/components/ui", lib: "@/lib", hooks: "@/hooks" },
      })
      expect(alignWorkspaceAliases(path.join(root, "solo"))).toBe(false)
      expect(read("solo/components.json").aliases.lib).toBe("@/lib")
    })
  })

  describe("exportTsxLibs", () => {
    it("adds an export for each .tsx lib, ahead of the pattern", () => {
      write("packages/ui/src/lib/fluid-hover.tsx", "")
      write("packages/ui/src/lib/utils.ts", "")
      expect(exportTsxLibs(path.join(root, "packages/ui"))).toBe(true)
      const { exports } = read("packages/ui/package.json")
      expect(exports["./lib/fluid-hover"]).toBe("./src/lib/fluid-hover.tsx")
      expect(exports["./lib/utils"]).toBeUndefined()
      const keys = Object.keys(exports)
      expect(keys.indexOf("./lib/fluid-hover")).toBeLessThan(
        keys.indexOf("./lib/*")
      )
      expect(exportTsxLibs(path.join(root, "packages/ui"))).toBe(false)
    })
  })

  describe("shareIconDependency", () => {
    it("gives the app the icon package at the shared package's version", () => {
      const web = path.join(root, "apps/web")
      write(
        "apps/web/components/app-shell-layout.tsx",
        'import { HomeIcon } from "@fabricator-ui/icons"'
      )
      expect(shareIconDependency(web, path.join(root, "packages/ui"))).toBe(
        true
      )
      expect(read("apps/web/package.json").dependencies).toEqual({
        "@fabricator-ui/icons": "^1.0.0",
      })
      expect(shareIconDependency(web, path.join(root, "packages/ui"))).toBe(
        false
      )
    })
  })

  describe("removeUnusedScaffoldLucide", () => {
    const lucide = { "lucide-react": "^1.76.0" }

    function selectFabricatorIcons() {
      const config = read("apps/web/components.json")
      write("apps/web/components.json", {
        ...config,
        iconLibrary: "lucide",
        registries: {
          "@fabricator": { params: { icons: "fabricator" } },
        },
      })
    }

    beforeEach(() => {
      for (const workspace of ["apps/web", "packages/ui"]) {
        const file = `${workspace}/package.json`
        const pkg = read(file)
        write(file, {
          ...pkg,
          dependencies: { ...pkg.dependencies, ...lucide },
        })
      }
    })

    it("removes unused Lucide from both workspace manifests", () => {
      selectFabricatorIcons()
      const web = path.join(root, "apps/web")
      expect(removeUnusedScaffoldLucide(web)).toBe(true)
      expect(read("apps/web/package.json").dependencies).toEqual({})
      expect(read("packages/ui/package.json").dependencies).toEqual({
        "@fabricator-ui/icons": "^1.0.0",
      })
      expect(removeUnusedScaffoldLucide(web)).toBe(false)
    })

    it("keeps Lucide in the workspace that imports it", () => {
      selectFabricatorIcons()
      write(
        "packages/ui/src/components/example.tsx",
        "import { Check } from 'lucide-react'"
      )
      expect(removeUnusedScaffoldLucide(path.join(root, "apps/web"))).toBe(true)
      expect(read("apps/web/package.json").dependencies).toEqual({})
      expect(read("packages/ui/package.json").dependencies).toMatchObject(
        lucide
      )
    })

    it("keeps explicit Lucide dependencies", () => {
      expect(removeUnusedScaffoldLucide(path.join(root, "apps/web"))).toBe(
        false
      )
      expect(read("apps/web/package.json").dependencies).toEqual(lucide)
      expect(read("packages/ui/package.json").dependencies).toMatchObject(
        lucide
      )
    })
  })

  describe("getUiPackageDir", () => {
    it("finds the shared package from its alias", () => {
      expect(getUiPackageDir(path.join(root, "apps/web"))).toBe(
        path.join(root, "packages/ui")
      )
    })
  })
})
