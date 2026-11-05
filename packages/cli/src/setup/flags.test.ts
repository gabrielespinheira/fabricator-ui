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
  { framework: "laravel" },
  { base: "radix" },
  { project: "monorepo" },
  { project: "monorepo", mobile: true },
  { project: "monorepo", desktop: "tauri" },
  {
    project: "monorepo",
    framework: "astro",
    mobile: true,
    desktop: "electron",
  },
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
    expect(setupFromCreateFlags(name, flags)).toEqual(expected)
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

  it("makes a project a monorepo when it names an app", () => {
    expect(setupFromCreateFlags(undefined, { mobile: true }).project).toBe(
      "monorepo"
    )
    expect(setupFromCreateFlags(undefined, { desktop: "tauri" }).project).toBe(
      "monorepo"
    )
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
