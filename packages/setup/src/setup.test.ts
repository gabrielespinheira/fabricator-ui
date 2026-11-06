import { describe, expect, it } from "vitest"

import {
  DEFAULT_PROJECT_SETUP,
  isWebFramework,
  normalizeProjectSetup,
  parseKeyValues,
  projectName,
  writeKeyValues,
  type ProjectSetup,
} from "./setup"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})

describe("normalizeProjectSetup", () => {
  it("keeps the default as it is", () => {
    expect(normalizeProjectSetup(DEFAULT_PROJECT_SETUP)).toEqual(
      DEFAULT_PROJECT_SETUP
    )
  })

  it("moves Laravel out of a monorepo's web app", () => {
    expect(
      normalizeProjectSetup(
        setup({ project: "monorepo", framework: "laravel" })
      ).framework
    ).toBe("next")
  })

  it("clears the extra apps when the project isn't a monorepo", () => {
    expect(
      normalizeProjectSetup(setup({ project: "new", desktop: "tauri" }))
    ).toMatchObject({ mobile: false, desktop: "none" })
    expect(
      normalizeProjectSetup(
        setup({ project: "existing", mobile: true, desktop: "electron" })
      )
    ).toMatchObject({ mobile: false, desktop: "none" })
  })

  it("keeps the extra apps in a monorepo", () => {
    expect(
      normalizeProjectSetup(
        setup({ project: "monorepo", mobile: true, desktop: "tauri" })
      )
    ).toMatchObject({ mobile: true, desktop: "tauri" })
  })

  it("never installs what only the preview uses", () => {
    expect(
      normalizeProjectSetup(
        setup({
          shell: { window: "macos", fullscreen: "true", variant: "floating" },
        })
      ).shell
    ).toEqual({ variant: "floating" })
  })

  it("moves titlebar tabs to the page and drops glass without a window", () => {
    expect(
      normalizeProjectSetup(
        setup({ shell: { tabs: "titlebar", glass: "false" } })
      ).shell
    ).toEqual({ tabs: "main" })
  })

  it("keeps titlebar tabs and glass with Desktop", () => {
    expect(
      normalizeProjectSetup(
        setup({
          project: "monorepo",
          desktop: "tauri",
          shell: { tabs: "titlebar", glass: "false" },
        })
      ).shell
    ).toEqual({ tabs: "titlebar", glass: "false" })
  })

  it("leaves no primitives choice on Expo", () => {
    expect(
      normalizeProjectSetup(setup({ framework: "expo", base: "radix" })).base
    ).toBe("base")
  })

  it("lists each assistant once, in the page's order", () => {
    expect(
      normalizeProjectSetup(setup({ assistants: ["codex", "claude", "codex"] }))
        .assistants
    ).toEqual(["claude", "codex"])
  })
})

describe("projectName", () => {
  it("falls back for a blank name", () => {
    expect(projectName(setup({ name: "  " }))).toBe("my-app")
    expect(projectName(setup({ name: " acme " }))).toBe("acme")
  })
})

describe("key values", () => {
  it("reads and writes the flag format", () => {
    const values = { primary: "260_0.2", shape: "pill" }
    expect(writeKeyValues(values)).toBe("primary=260_0.2,shape=pill")
    expect(parseKeyValues("primary=260_0.2,shape=pill")).toEqual(values)
  })

  it("reads nothing from nothing", () => {
    expect(parseKeyValues("")).toEqual({})
  })

  it("refuses anything that isn't key=value", () => {
    expect(() => parseKeyValues("primary")).toThrow(/key=value/)
  })
})

describe("isWebFramework", () => {
  it("is false only for Expo", () => {
    expect(isWebFramework("next")).toBe(true)
    expect(isWebFramework("expo")).toBe(false)
  })
})

describe("the apps a setup chooses", () => {
  const apps = (changes: Partial<ProjectSetup>) => {
    const { project, framework, web, mobile, desktop } = normalizeProjectSetup({
      ...DEFAULT_PROJECT_SETUP,
      ...changes,
    })
    return { project, framework, web, mobile, desktop }
  }
  const EXPO_ONLY = {
    project: "new",
    framework: "expo",
    web: false,
    mobile: false,
    desktop: "none",
  }

  it("starts as a monorepo with a web app", () => {
    expect(apps({})).toEqual({
      project: "monorepo",
      framework: "next",
      web: true,
      mobile: false,
      desktop: "none",
    })
  })

  it("makes a lone mobile app a plain Expo project", () => {
    expect(apps({ web: false, mobile: true })).toEqual(EXPO_ONLY)
  })

  it("reads the Expo template as a lone mobile app, however it was asked for", () => {
    expect(apps({ framework: "expo" })).toEqual(EXPO_ONLY)
    expect(apps({ project: "new", framework: "expo" })).toEqual(EXPO_ONLY)
    expect(apps(EXPO_ONLY as Partial<ProjectSetup>)).toEqual(EXPO_ONLY)
  })

  it("keeps a lone desktop app in a monorepo: its window renders a web app", () => {
    expect(apps({ web: false, desktop: "tauri" })).toEqual({
      project: "monorepo",
      framework: "next",
      web: false,
      mobile: false,
      desktop: "tauri",
    })
  })

  it("allows mobile and desktop without a website", () => {
    expect(apps({ web: false, mobile: true, desktop: "electron" })).toEqual({
      project: "monorepo",
      framework: "next",
      web: false,
      mobile: true,
      desktop: "electron",
    })
  })

  it("never ends up with no apps", () => {
    expect(apps({ web: false }).web).toBe(true)
    expect(apps({ project: "new", web: false }).web).toBe(true)
  })

  it("makes a single project one app", () => {
    expect(apps({ project: "new", mobile: true })).toEqual(EXPO_ONLY)
    expect(apps({ project: "new", desktop: "tauri" })).toEqual({
      project: "new",
      framework: "next",
      web: true,
      mobile: false,
      desktop: "none",
    })
  })

  it("keeps a single project's framework, Laravel included", () => {
    expect(apps({ project: "new", framework: "laravel" }).framework).toBe(
      "laravel"
    )
    expect(apps({ framework: "laravel" }).framework).toBe("next")
  })

  it("leaves apps out of an existing project", () => {
    expect(
      apps({ project: "existing", web: false, mobile: true, desktop: "tauri" })
    ).toMatchObject({ web: true, mobile: false, desktop: "none" })
  })
})
