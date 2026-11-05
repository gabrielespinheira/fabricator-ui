import {
  DEFAULT_PROJECT_SETUP,
  normalizeProjectSetup,
  toCliArgs,
  type ProjectSetup,
} from "@fabricator-ui/setup"
import { Command } from "commander"
import { describe, expect, it } from "vitest"

import { createCreateCommand } from "../commands/create"
import { createInitCommand } from "../commands/init"
import {
  hasSetupFlags,
  setupFromCreateFlags,
  setupFromInitFlags,
  type SetupFlags,
} from "./flags"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})

/** Parses a command with the real program, without running its action. */
function parse(command: Command, args: string[]) {
  let captured: { name?: string; flags: Record<string, unknown> } | undefined
  command.action((...actionArgs: unknown[]) => {
    const flags = actionArgs.find(
      (arg) => typeof arg === "object" && arg !== null && !Array.isArray(arg)
    ) as Record<string, unknown>
    const name = typeof actionArgs[0] === "string" ? actionArgs[0] : undefined
    captured = { name, flags }
  })
  command.exitOverride()
  command.parse(args, { from: "user" })
  if (!captured) throw new Error("The command didn't run.")
  return captured
}

const CREATE_SETUPS: Partial<ProjectSetup>[] = [
  {},
  { name: "acme" },
  { framework: "vite" },
  { framework: "expo" },
  { project: "new" },
  { project: "new", framework: "vite" },
  { project: "new", framework: "laravel" },
  { base: "radix" },
  { mobile: true },
  { desktop: "tauri" },
  { framework: "astro", mobile: true, desktop: "electron" },
  { web: false, mobile: true },
  { web: false, desktop: "tauri" },
  { web: false, mobile: true, desktop: "electron" },
  { iconLibrary: "lucide" },
  { look: { primary: "260_0.2", shape: "pill" } },
  { shell: { variant: "floating", tabs: "main" } },
  { appShell: false },
  { sound: false },
  { components: "all" },
  { assistants: ["claude", "codex"] },
  { assistants: ["cursor"], skill: false },
  { assistants: ["cursor"], mcp: false },
]

describe("the command the site writes", () => {
  it.each(CREATE_SETUPS)("parses back to the setup: %j", (changes) => {
    const expected = normalizeProjectSetup(
      setup({ name: "my-app", ...changes })
    )
    const [, ...args] = toCliArgs(expected)
    const { name, flags } = parse(createCreateCommand(), args)
    expect(normalizeProjectSetup(setupFromCreateFlags(name, flags))).toEqual(
      expected
    )
  })

  const INIT_SETUPS: Partial<ProjectSetup>[] = [
    {},
    { appShell: false },
    { sound: false },
    { appShell: false, sound: false, look: { shape: "pill" } },
    { shell: { variant: "floating" } },
    { assistants: ["codex"] },
    { components: "all" },
    { iconLibrary: "lucide" },
    { base: "aria" },
  ]

  it.each(INIT_SETUPS)("parses back for an existing project: %j", (changes) => {
    const expected = normalizeProjectSetup(
      setup({ project: "existing", ...changes })
    )
    const [, ...args] = toCliArgs(expected)
    const { flags } = parse(createInitCommand(), args)
    expect(setupFromInitFlags(flags)).toEqual({ ...expected, name: "" })
  })
})

describe("setupFromCreateFlags", () => {
  it("has everything on by default", () => {
    expect(setupFromCreateFlags("acme", {})).toEqual(setup({ name: "acme" }))
  })

  it("refuses values it doesn't know", () => {
    expect(() =>
      setupFromCreateFlags(undefined, { template: "rails" })
    ).toThrow()
    expect(() => setupFromCreateFlags(undefined, { desktop: "qt" })).toThrow()
    expect(() => setupFromCreateFlags(undefined, { agents: "emacs" })).toThrow()
    expect(() => setupFromCreateFlags(undefined, { look: "shape" })).toThrow()
  })
})

describe("hasSetupFlags", () => {
  it("is false for a plain init, which only sets up the registry", () => {
    expect(hasSetupFlags({})).toBe(false)
    expect(hasSetupFlags({ skill: true, mcp: true })).toBe(false)
    expect(hasSetupFlags({ shell: false })).toBe(false)
  })

  it("is true for anything an existing project would change", () => {
    expect(hasSetupFlags({ shell: true })).toBe(true)
    expect(hasSetupFlags({ sounds: true })).toBe(true)
    expect(hasSetupFlags({ agents: "codex" })).toBe(true)
    expect(hasSetupFlags({ look: "shape=pill" })).toBe(true)
  })
})

describe("create's starting point", () => {
  const apps = (flags: SetupFlags) => {
    const { project, framework, web, mobile, desktop } = normalizeProjectSetup(
      setupFromCreateFlags("shop", flags)
    )
    return { project, framework, web, mobile, desktop }
  }

  it("is a monorepo with a web app by default", () => {
    expect(apps({})).toEqual({
      project: "monorepo",
      framework: "next",
      web: true,
      mobile: false,
      desktop: "none",
    })
  })

  it("is a single project with --no-monorepo", () => {
    expect(apps({ monorepo: false }).project).toBe("new")
  })

  it("keeps a single project for the templates that can only be one", () => {
    expect(apps({ template: "laravel" })).toMatchObject({
      project: "new",
      framework: "laravel",
    })
    expect(apps({ template: "expo" })).toMatchObject({
      project: "new",
      framework: "expo",
    })
  })

  it("makes --mobile --no-web a plain Expo project", () => {
    expect(apps({ mobile: true, web: false })).toMatchObject({
      project: "new",
      framework: "expo",
    })
  })

  it("keeps --desktop --no-web a monorepo: the window renders a web app", () => {
    expect(apps({ desktop: "tauri", web: false })).toMatchObject({
      project: "monorepo",
      web: false,
      desktop: "tauri",
    })
  })
})
