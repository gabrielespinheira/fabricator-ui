import { describe, expect, it } from "vitest"

import { DEFAULT_PROJECT_SETUP, type ProjectSetup } from "./setup"
import { getProjectTree, type ProjectTreeNode } from "./tree"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})

function names(node: ProjectTreeNode | undefined) {
  return node?.children?.map((child) => child.name)
}

function find(node: ProjectTreeNode, path: string) {
  return path
    .split("/")
    .reduce<
      ProjectTreeNode | undefined
    >((parent, name) => parent?.children?.find((child) => child.name === name), node)
}

function allIds(node: ProjectTreeNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(allIds)]
}

describe("getProjectTree", () => {
  it("is one folder for a single project", () => {
    const tree = getProjectTree(
      setup({ project: "new", name: "acme", framework: "vite" })
    )
    expect(tree.name).toBe("acme")
    expect(tree.mark).toBe("vite")
    expect(tree.children).toEqual([])
  })

  it("lays out a monorepo's apps", () => {
    const tree = getProjectTree(
      setup({ project: "monorepo", mobile: true, desktop: "tauri" })
    )
    const apps = find(tree, "apps")
    expect(names(apps)).toEqual(["desktop", "mobile", "web"])
    expect(apps?.children?.map((node) => node.mark)).toEqual([
      "tauri",
      "expo",
      "next",
    ])
    expect(names(find(tree, "packages"))).toEqual([
      "eslint-config",
      "typescript-config",
      "ui",
    ])
  })

  it("leaves out the apps it doesn't have", () => {
    expect(names(find(getProjectTree(setup()), "apps"))).toEqual(["web"])
  })

  it("lists folders before files, and gives every node its path as id", () => {
    const tree = getProjectTree(setup({ name: "acme" }))
    expect(names(tree)).toEqual([
      "apps",
      "packages",
      ".prettierrc",
      "package.json",
      "turbo.json",
    ])
    expect(find(tree, "apps/web/package.json")?.id).toBe(
      "acme/apps/web/package.json"
    )
    const ids = allIds(tree)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("shows the design guide at the root when the skill comes with it", () => {
    expect(names(getProjectTree(setup({ assistants: ["claude"] })))).toContain(
      "DESIGN.md"
    )
    expect(
      names(getProjectTree(setup({ assistants: ["claude"], skill: false })))
    ).not.toContain("DESIGN.md")
  })

  it("has no tree of its own for an existing project", () => {
    expect(getProjectTree(setup({ project: "existing" })).name).toBe(
      "your project"
    )
  })
})

describe("the tree's tooling", () => {
  it("keeps the template's ESLint and Prettier by default", () => {
    const tree = getProjectTree(setup({ mobile: true }))
    expect(find(tree, ".prettierrc")).toBeDefined()
    expect(find(tree, "apps/web/eslint.config.js")).toBeDefined()
    expect(find(tree, "apps/mobile/eslint.config.js")).toBeDefined()
    expect(find(tree, "packages/ui/eslint.config.js")).toBeDefined()
  })

  it("swaps them for one biome.json", () => {
    const tree = getProjectTree(setup({ tooling: "biome", mobile: true }))
    expect(find(tree, "biome.json")).toBeDefined()
    expect(find(tree, ".prettierrc")).toBeUndefined()
    expect(find(tree, "packages/eslint-config")).toBeUndefined()
    expect(allIds(tree).some((id) => id.endsWith("eslint.config.js"))).toBe(
      false
    )
  })

  it("has no turbo.json when Vite+ runs the tasks", () => {
    expect(
      find(getProjectTree(setup({ runner: "vite-plus" })), "turbo.json")
    ).toBeUndefined()
    expect(find(getProjectTree(setup()), "turbo.json")).toBeDefined()
  })

  it("swaps them for a root vite.config.ts with Vite+", () => {
    const tree = getProjectTree(setup({ tooling: "vite-plus" }))
    expect(find(tree, "vite.config.ts")).toBeDefined()
    expect(find(tree, ".prettierrc")).toBeUndefined()
    expect(find(tree, "apps/web/eslint.config.js")).toBeUndefined()
  })
})

describe("the tree without a website", () => {
  it("says the web app is only the window's UI", () => {
    const tree = getProjectTree(setup({ web: false, desktop: "electron" }))
    expect(find(tree, "apps/web")?.note).toContain("the window's UI")
  })

  it("keeps a lone mobile app in apps/mobile, with no web packages", () => {
    const tree = getProjectTree(setup({ web: false, mobile: true }))
    expect(names(find(tree, "apps"))).toEqual(["mobile"])
    expect(find(tree, "apps/mobile")?.mark).toBe("expo")
    expect(find(tree, "packages")).toBeUndefined()
    expect(find(tree, "turbo.json")).toBeUndefined()
    expect(find(tree, ".prettierrc")).toBeDefined()
  })

  it("shows the Expo template as one Expo project", () => {
    const tree = getProjectTree(setup({ framework: "expo" }))
    expect(tree.mark).toBe("expo")
    expect(tree.children).toEqual([])
  })
})
