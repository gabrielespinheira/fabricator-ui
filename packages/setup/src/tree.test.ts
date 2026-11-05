import { describe, expect, it } from "vitest"

import { DEFAULT_PROJECT_SETUP, type ProjectSetup } from "./setup"
import { getProjectTree } from "./tree"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})

describe("getProjectTree", () => {
  it("is one folder for a single project", () => {
    const tree = getProjectTree(setup({ name: "acme", framework: "vite" }))
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
