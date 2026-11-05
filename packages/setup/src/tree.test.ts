import { describe, expect, it } from "vitest"

import { DEFAULT_PROJECT_SETUP, type ProjectSetup } from "./setup"
import { getProjectTree } from "./tree"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})

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
    const apps = tree.children.find((node) => node.name === "apps")
    expect(apps?.children.map((node) => node.name)).toEqual([
      "web",
      "mobile",
      "desktop",
    ])
    expect(apps?.children.map((node) => node.mark)).toEqual([
      "next",
      "expo",
      "tauri",
    ])
    expect(
      tree.children.find((node) => node.name === "packages")?.children
    ).toEqual([expect.objectContaining({ name: "ui" })])
  })

  it("leaves out the apps it doesn't have", () => {
    const tree = getProjectTree(setup({ project: "monorepo" }))
    expect(
      tree.children
        .find((node) => node.name === "apps")
        ?.children.map((node) => node.name)
    ).toEqual(["web"])
  })

  it("has no tree of its own for an existing project", () => {
    expect(getProjectTree(setup({ project: "existing" })).name).toBe(
      "your project"
    )
  })
})

describe("the tree without a website", () => {
  it("says the web app is only the window's UI", () => {
    const tree = getProjectTree({
      ...DEFAULT_PROJECT_SETUP,
      web: false,
      desktop: "electron",
    })
    const web = tree.children[0]?.children[0]
    expect(web?.name).toBe("web")
    expect(web?.note).toContain("the window's UI")
  })

  it("shows a lone mobile app as one Expo project", () => {
    const tree = getProjectTree({
      ...DEFAULT_PROJECT_SETUP,
      web: false,
      mobile: true,
    })
    expect(tree.mark).toBe("expo")
    expect(tree.children).toEqual([])
  })
})
