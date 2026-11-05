import { describe, expect, it } from "vitest"

import { getNextSteps, getPrerequisites, planSetup, type StepId } from "./plan"
import { DEFAULT_PROJECT_SETUP, type ProjectSetup } from "./setup"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})
const ids = (changes: Partial<ProjectSetup> = {}): StepId[] =>
  planSetup(setup(changes)).map((step) => step.id)

describe("planSetup", () => {
  it("scaffolds a web project and everything in one run", () => {
    expect(ids()).toEqual(["scaffold-web", "mount", "first-commit"])
  })

  it("has nothing to mount without the shell and sounds", () => {
    expect(ids({ appShell: false, sound: false })).toEqual([
      "scaffold-web",
      "first-commit",
    ])
  })

  it("sets up assistants only when there are any", () => {
    expect(ids({ assistants: ["claude"] })).toContain("agents")
    expect(
      ids({ assistants: ["claude"], skill: false, mcp: false })
    ).not.toContain("agents")
  })

  it("configures a monorepo before its first add, and installs once", () => {
    expect(
      ids({ project: "monorepo", mobile: true, desktop: "tauri" })
    ).toEqual([
      "scaffold-web",
      "configure-monorepo",
      "add-web-items",
      "scaffold-mobile",
      "scaffold-desktop",
      "configure-workspace",
      "install",
      "setup-mobile",
      "mount",
      "first-commit",
    ])
  })

  it("skips the apps a monorepo doesn't have", () => {
    expect(ids({ project: "monorepo" })).toEqual([
      "scaffold-web",
      "configure-monorepo",
      "add-web-items",
      "configure-workspace",
      "install",
      "mount",
      "first-commit",
    ])
  })

  it("creates an Expo app with its own tool", () => {
    expect(ids({ framework: "expo" })).toEqual([
      "scaffold-mobile",
      "setup-mobile",
      "mount",
      "first-commit",
    ])
  })

  it("creates a Laravel app with its installer", () => {
    expect(ids({ framework: "laravel" })[0]).toBe("scaffold-laravel")
  })

  it("changes an existing project in place", () => {
    expect(ids({ project: "existing" })).toEqual(["setup-existing", "mount"])
    expect(ids({ project: "existing", appShell: false, sound: false })).toEqual(
      ["setup-existing"]
    )
  })

  it("names every assistant it sets up", () => {
    const step = planSetup(setup({ assistants: ["claude", "codex"] })).find(
      (item) => item.id === "agents"
    )
    expect(step?.title).toContain("Claude Code")
    expect(step?.title).toContain("Codex")
  })

  it("names the desktop runtime", () => {
    const step = planSetup(
      setup({ project: "monorepo", desktop: "electron" })
    ).find((item) => item.id === "scaffold-desktop")
    expect(step?.title).toContain("Electron")
  })

  it("gives every step a title and a detail", () => {
    for (const step of planSetup(
      setup({
        project: "monorepo",
        mobile: true,
        desktop: "tauri",
        assistants: ["claude"],
      })
    )) {
      expect(step.title, step.id).toBeTruthy()
      expect(step.detail, step.id).toBeTruthy()
    }
  })

  it("doesn't name the upstream project", () => {
    const text = JSON.stringify(
      planSetup(setup({ project: "monorepo", mobile: true, desktop: "tauri" }))
    )
    expect(text.toLowerCase()).not.toContain("shadcn")
  })
})

describe("getNextSteps", () => {
  it("starts a web project", () => {
    expect(getNextSteps(setup(), "npm")).toEqual([
      { label: "Open the project", code: "cd my-app" },
      { label: "Start the app", code: "npm run dev" },
    ])
  })

  it("starts each app in a monorepo", () => {
    expect(
      getNextSteps(
        setup({ project: "monorepo", mobile: true, desktop: "tauri" }),
        "bun"
      ).map((step) => step.code)
    ).toEqual(["cd my-app", "bun dev", "bun dev:mobile", "bun dev:desktop"])
  })

  it("builds an Expo app", () => {
    expect(getNextSteps(setup({ framework: "expo" }), "npm").at(-1)?.code).toBe(
      "npx expo run:ios"
    )
  })

  it("starts Laravel with Composer", () => {
    expect(
      getNextSteps(setup({ framework: "laravel" }), "npm").at(-1)?.code
    ).toBe("composer run dev")
  })

  it("has nothing to do in an existing project", () => {
    expect(getNextSteps(setup({ project: "existing" }), "npm")).toEqual([])
  })
})

describe("getPrerequisites", () => {
  it("is empty for a web project", () => {
    expect(getPrerequisites(setup())).toEqual([])
  })

  it("names only what the choices need", () => {
    expect(
      getPrerequisites(setup({ project: "monorepo", desktop: "tauri" })).map(
        (item) => item.id
      )
    ).toEqual(["rust"])
    expect(
      getPrerequisites(setup({ project: "monorepo", mobile: true })).map(
        (item) => item.id
      )
    ).toEqual(["native-build"])
    expect(
      getPrerequisites(setup({ framework: "laravel" })).map((item) => item.id)
    ).toEqual(["laravel"])
  })
})
