import { describe, expect, it } from "vitest"

import { formatCommand, toCliArgs } from "./cli-args"
import { DEFAULT_PROJECT_SETUP, type ProjectSetup } from "./setup"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})

describe("toCliArgs", () => {
  it("needs only a name for the default project", () => {
    expect(toCliArgs(DEFAULT_PROJECT_SETUP)).toEqual([
      "create",
      "my-app",
      "--yes",
    ])
  })

  it("writes only what differs from the defaults", () => {
    expect(
      toCliArgs(
        setup({
          name: "acme",
          framework: "vite",
          base: "radix",
          iconLibrary: "lucide",
          look: { primary: "260_0.2", shape: "pill" },
          shell: { variant: "floating" },
          sound: false,
          components: "all",
          assistants: ["claude", "codex"],
        })
      )
    ).toEqual([
      "create",
      "acme",
      "-t",
      "vite",
      "-b",
      "radix",
      "--icons",
      "lucide",
      "--look",
      "primary=260_0.2,shape=pill",
      "--shell",
      "variant=floating",
      "--no-sounds",
      "--all",
      "--agents",
      "claude,codex",
      "--yes",
    ])
  })

  it("names a monorepo's apps", () => {
    expect(toCliArgs(setup({ mobile: true, desktop: "tauri" }))).toEqual([
      "create",
      "my-app",
      "--mobile",
      "--desktop",
      "tauri",
      "--yes",
    ])
  })

  it("turns the shell off", () => {
    expect(toCliArgs(setup({ appShell: false }))).toContain("--no-shell")
  })

  it("narrows the assistants' setup", () => {
    expect(
      toCliArgs(setup({ assistants: ["cursor"], skill: false, mcp: false }))
    ).toEqual(
      expect.arrayContaining(["--agents", "cursor", "--no-skill", "--no-mcp"])
    )
    expect(toCliArgs(setup({ skill: false }))).not.toContain("--no-skill")
  })

  it("names what an existing project should change", () => {
    expect(toCliArgs(setup({ project: "existing" }))).toEqual([
      "init",
      "--shell",
      "--sounds",
      "--yes",
    ])
    expect(
      toCliArgs(
        setup({
          project: "existing",
          appShell: false,
          sound: false,
          look: { shape: "pill" },
          shell: { variant: "floating" },
        })
      )
    ).toEqual(["init", "--look", "shape=pill", "--yes"])
    expect(
      toCliArgs(setup({ project: "existing", shell: { variant: "floating" } }))
    ).toEqual(["init", "--shell", "variant=floating", "--sounds", "--yes"])
  })

  it("normalizes first, so the preview's choices never reach the command", () => {
    expect(
      toCliArgs(setup({ shell: { window: "macos", fullscreen: "true" } }))
    ).toEqual(["create", "my-app", "--yes"])
  })

  it("keeps Expo's template", () => {
    expect(toCliArgs(setup({ framework: "expo" }))).toEqual([
      "create",
      "my-app",
      "-t",
      "expo",
      "--yes",
    ])
  })
})

describe("formatCommand", () => {
  const args = ["create", "my-app", "--look", "primary=260_0.2,shape=pill"]

  it("writes it for each package manager, quoting what needs it", () => {
    expect(formatCommand(args, "npm")).toBe(
      'npx fabricator-ui@latest create my-app --look "primary=260_0.2,shape=pill"'
    )
    expect(formatCommand(args, "pnpm")).toContain(
      "pnpm dlx fabricator-ui@latest"
    )
    expect(formatCommand(args, "yarn")).toContain(
      "yarn dlx fabricator-ui@latest"
    )
    expect(formatCommand(args, "bun")).toContain(
      "bunx --bun fabricator-ui@latest"
    )
  })
})

describe("the apps in the command", () => {
  const args = (changes: Partial<ProjectSetup>) =>
    toCliArgs({ ...DEFAULT_PROJECT_SETUP, ...changes })

  it("needs no flag for the default monorepo", () => {
    expect(args({})).toEqual(["create", "my-app", "--yes"])
  })

  it("names a single project", () => {
    expect(args({ project: "new" })).toEqual([
      "create",
      "my-app",
      "--no-monorepo",
      "--yes",
    ])
  })

  it("needs no flag where the template can only be a single project", () => {
    expect(args({ framework: "expo" })).toEqual([
      "create",
      "my-app",
      "-t",
      "expo",
      "--yes",
    ])
    expect(args({ project: "new", framework: "laravel" })).toEqual([
      "create",
      "my-app",
      "-t",
      "laravel",
      "--yes",
    ])
  })

  it("writes a lone mobile app as the Expo template", () => {
    expect(args({ web: false, mobile: true })).toEqual(
      args({ framework: "expo" })
    )
  })

  it("says when there's no website", () => {
    expect(args({ web: false, desktop: "electron" })).toEqual([
      "create",
      "my-app",
      "--no-web",
      "--desktop",
      "electron",
      "--yes",
    ])
    expect(args({ web: false, mobile: true, desktop: "tauri" })).toEqual([
      "create",
      "my-app",
      "--no-web",
      "--mobile",
      "--desktop",
      "tauri",
      "--yes",
    ])
  })
})
