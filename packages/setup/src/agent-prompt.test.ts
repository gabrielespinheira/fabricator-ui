import { describe, expect, it } from "vitest"

import { getAgentPrompt } from "./agent-prompt"
import { formatCommand, toCliArgs } from "./cli-args"
import {
  DEFAULT_PROJECT_SETUP,
  type PackageManager,
  type ProjectSetup,
} from "./setup"

const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})
const prompt = (
  changes: Partial<ProjectSetup> = {},
  packageManager: PackageManager = "bun"
) => getAgentPrompt(setup(changes), packageManager)

const MONOREPO: Partial<ProjectSetup> = {
  project: "monorepo",
  name: "shop",
  mobile: true,
  desktop: "tauri",
}

describe("getAgentPrompt", () => {
  it("runs the exact command the page shows, on its own line", () => {
    for (const changes of [{}, MONOREPO, { project: "existing" as const }]) {
      const command = formatCommand(toCliArgs(setup(changes)), "bun")
      expect(prompt(changes).split("\n")).toContain(command)
    }
  })

  it("writes every command for the package manager", () => {
    const npm = prompt({}, "npm")
    expect(npm).toContain("`npx fabricator-ui@latest doctor`")
    expect(npm).toContain("`npm run build`")
    expect(npm).toContain("`npm run dev`")
    expect(npm).not.toContain("bun")

    const pnpm = prompt({}, "pnpm")
    expect(pnpm).toContain("`pnpm dlx fabricator-ui@latest doctor`")
    expect(pnpm).toContain("`pnpm run build`")
    expect(pnpm).toContain("`pnpm dev`")

    // `bun build` is Bun's bundler, not the project's script.
    const bun = prompt({}, "bun")
    expect(bun).toContain("`bun run build`")
    expect(bun).toContain("`bun dev`")
  })

  it("tells it how to recover from a failed step", () => {
    expect(prompt()).toContain("run the same command again")
  })

  it("has it finish what the CLI couldn't edit itself", () => {
    expect(prompt()).toContain("printed a snippet")
  })

  it("starts a new project in the projects folder, and checks it from inside", () => {
    expect(prompt()).toContain("From the folder I keep my projects in")
    expect(prompt({ name: "shop" })).toContain("In `shop`")
  })

  it("protects uncommitted work in an existing project", () => {
    const existing = prompt({ project: "existing" })
    expect(existing).toContain("From this project's root")
    expect(existing).toContain("uncommitted")
    expect(existing).not.toContain("projects in")
    expect(existing).not.toContain("In `")
  })

  it("names what the setup needs, and won't install it unasked", () => {
    const monorepo = prompt(MONOREPO)
    expect(monorepo).toContain("Rust")
    expect(monorepo).toContain("Xcode or Android Studio")
    expect(monorepo).toContain("Don't install anything without asking me")
    expect(prompt()).not.toContain("without asking")
  })

  it("lists how to start every app, without the cd", () => {
    const monorepo = prompt(MONOREPO)
    expect(monorepo).toContain("`bun dev`")
    expect(monorepo).toContain("`bun dev:mobile`")
    expect(monorepo).toContain("`bun dev:desktop`")
    expect(monorepo).not.toContain("cd shop")
  })

  it("uses the skill the command installs", () => {
    expect(prompt({ assistants: ["claude"] })).toContain("skill")
    expect(prompt({ assistants: ["claude"] })).not.toContain("agents add")
  })

  it("has an agent the setup doesn't name add itself", () => {
    const unnamed = prompt({ assistants: [] })
    expect(unnamed).toContain(
      "`bunx --bun fabricator-ui@latest agents add <you>`"
    )
    for (const assistant of [
      "claude",
      "cursor",
      "vscode",
      "codex",
      "opencode",
    ]) {
      expect(unnamed).toContain(assistant)
    }
  })

  it("skips the skill when the setup turned it off", () => {
    const skipped = prompt({ assistants: ["claude"], skill: false })
    expect(skipped).not.toContain("Fabricator skill")
    expect(skipped).toContain("llms.txt")
  })

  it("adds a theme toggle from the framework's guide, as markdown", () => {
    expect(prompt()).toContain(
      "https://fabricator-ui.vercel.app/docs/dark-mode/next.md"
    )
    expect(prompt({ framework: "vite" })).toContain("/docs/dark-mode/vite.md")
    expect(prompt({ project: "existing" })).toContain("/docs/dark-mode.md")
  })

  it("has no website to add a toggle to in a desktop-only project", () => {
    const desktopOnly = prompt({ web: false, desktop: "electron" })
    expect(desktopOnly).toContain("Add a theme toggle to the app")
    expect(desktopOnly).not.toContain("Start the web app")
  })

  it("covers Expo with its own checks, and no web theme guide", () => {
    const expo = prompt({ framework: "expo" })
    expect(expo).toContain("`bunx --bun expo-doctor`")
    expect(expo).toContain("`bunx --bun expo run:ios`")
    // dlx would download Expo instead of using the project's own.
    expect(prompt({ framework: "expo" }, "pnpm")).toContain(
      "`pnpm exec expo run:ios`"
    )
    expect(expo).not.toContain("run build")
    expect(expo).not.toContain("dark-mode")
  })

  it("starts Laravel its own way", () => {
    expect(prompt({ project: "new", framework: "laravel" })).toContain(
      "`composer run dev`"
    )
  })

  it("replaces the sample nav only when there is an App Shell", () => {
    expect(prompt()).toContain("App Shell's sample navigation")
    expect(prompt({ appShell: false })).not.toContain("App Shell")
  })

  it("asks what a new app is for, and reads an existing one instead", () => {
    expect(prompt()).toContain("Ask me what the app is for")
    expect(prompt({ project: "existing" })).not.toContain("Ask me what")
  })

  it("opens with what it's setting up", () => {
    expect(prompt()).toMatch(/^Set up my Fabricator UI project\./)
    expect(prompt({ project: "existing" })).toMatch(
      /^Set up Fabricator UI in this project\./
    )
  })

  it("points at the docs for agents", () => {
    expect(prompt()).toContain("https://fabricator-ui.vercel.app/llms.txt")
  })

  it("numbers its steps in order, whichever ones apply", () => {
    for (const changes of [{}, MONOREPO, { framework: "expo" as const }]) {
      const numbers = prompt(changes)
        .split("\n")
        .flatMap((line) => line.match(/^(\d+)\. /)?.[1] ?? [])
        .map(Number)
      expect(numbers).toEqual(numbers.map((_, index) => index + 1))
      expect(numbers.length).toBeGreaterThan(3)
    }
  })

  it("keeps to the brand's words", () => {
    for (const changes of [{}, MONOREPO, { project: "existing" as const }]) {
      expect(prompt(changes)).not.toMatch(/shadcn|—/)
    }
  })
})
