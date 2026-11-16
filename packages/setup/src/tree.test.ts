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
    expect(find(tree, "apps")).toBeUndefined()
  })
})

describe("the tree's assistants", () => {
  it("adds nothing for assistants until one is picked", () => {
    const tree = getProjectTree(setup())
    expect(find(tree, ".claude")).toBeUndefined()
    expect(find(tree, ".mcp.json")).toBeUndefined()
  })

  it("writes the skill to Claude Code's folder and the shared one", () => {
    const tree = getProjectTree(setup({ assistants: ["claude", "codex"] }))
    expect(find(tree, ".claude/skills/fabricator/SKILL.md")).toBeDefined()
    expect(find(tree, ".agents/skills/fabricator/SKILL.md")).toBeDefined()
  })

  it("configures the MCP server where each assistant reads it", () => {
    const tree = getProjectTree(
      setup({ assistants: ["claude", "cursor", "vscode", "codex", "opencode"] })
    )
    for (const config of [
      ".mcp.json",
      ".cursor/mcp.json",
      ".vscode/mcp.json",
      ".codex/config.toml",
      "opencode.json",
    ]) {
      expect(find(tree, config)).toBeDefined()
    }
  })

  it("leaves out the skill or the MCP server when they're off", () => {
    const withoutSkill = getProjectTree(
      setup({ assistants: ["claude"], skill: false })
    )
    expect(find(withoutSkill, ".claude")).toBeUndefined()
    expect(find(withoutSkill, ".mcp.json")).toBeDefined()

    const withoutMcp = getProjectTree(
      setup({ assistants: ["cursor"], mcp: false })
    )
    expect(find(withoutMcp, ".cursor")).toBeUndefined()
    expect(find(withoutMcp, ".agents/skills/fabricator/SKILL.md")).toBeDefined()
  })

  it("shows an existing project's assistant files, and no design guide", () => {
    const tree = getProjectTree(
      setup({ project: "existing", assistants: ["claude"] })
    )
    expect(names(tree)).toEqual([".claude", ".mcp.json"])
  })

  it("adds them to the Expo template's root", () => {
    const tree = getProjectTree(
      setup({ framework: "expo", assistants: ["opencode"] })
    )
    expect(find(tree, "opencode.json")).toBeDefined()
    expect(find(tree, "DESIGN.md")).toBeDefined()
  })
})

describe("the tree's components", () => {
  it("puts the starter components in packages/ui", () => {
    const tree = getProjectTree(setup({ appShell: false, sound: false }))
    expect(names(find(tree, "packages/ui/src/components"))).toEqual([
      "button.tsx",
      "spinner.tsx",
    ])
    expect(find(tree, "packages/ui/src/lib")).toBeUndefined()
    expect(find(tree, "apps/web/components")).toBeUndefined()
  })

  it("stands in for every other component with one quiet row", () => {
    const tree = getProjectTree(setup({ components: "all" }))
    const rest = find(tree, "packages/ui/src/components")?.children?.at(-1)
    expect(rest?.name).toBe("every other component")
    expect(rest?.muted).toBe(true)
  })

  it("adds the App Shell and its layout to the web app", () => {
    const tree = getProjectTree(setup({ sound: false }))
    expect(find(tree, "packages/ui/src/components/app-shell.tsx")).toBeDefined()
    expect(names(find(tree, "apps/web/components"))).toEqual([
      "app-shell-layout.tsx",
      "app-shell-root.tsx",
    ])
  })

  it("follows each template's components folder", () => {
    const tree = (framework: ProjectSetup["framework"]) =>
      getProjectTree(setup({ framework, sound: false }))
    expect(
      find(tree("vite"), "apps/web/src/components/app-shell-root.tsx")
    ).toBeDefined()
    expect(
      find(tree("react-router"), "apps/web/app/components/app-shell-root.tsx")
    ).toBeDefined()
    // Astro renders the shell as an island, without a root of its own.
    expect(names(find(tree("astro"), "apps/web/src/components"))).toEqual([
      "app-shell-layout.tsx",
    ])
  })

  it("adds the sounds' libs and their component", () => {
    const tree = getProjectTree(setup({ appShell: false }))
    expect(names(find(tree, "packages/ui/src/lib"))).toEqual([
      "sound-recipes.ts",
      "sounds.ts",
    ])
    expect(names(find(tree, "apps/web/components"))).toEqual([
      "sound-effects.tsx",
    ])
  })

  it("installs the mobile app's own components", () => {
    const tree = getProjectTree(setup({ mobile: true, components: "all" }))
    expect(names(find(tree, "apps/mobile/src/components/ui"))).toEqual([
      "app-shell.tsx",
      "button.tsx",
      "fabricator-root.tsx",
      "spinner.tsx",
      "every other component",
    ])
    expect(names(find(tree, "apps/mobile/src/components"))).toEqual([
      "ui",
      "app-shell-layout.tsx",
      "app-shell-root.tsx",
      "sound-effects.tsx",
    ])
    expect(find(tree, "apps/mobile/src/lib/sounds.ts")).toBeDefined()
  })

  it("lays out the Expo template's files", () => {
    const tree = getProjectTree(setup({ framework: "expo", appShell: false }))
    expect(names(tree)).toEqual([
      "src",
      "app.json",
      "components.json",
      "package.json",
    ])
    expect(find(tree, "src/components/ui/button.tsx")).toBeDefined()
  })
})
