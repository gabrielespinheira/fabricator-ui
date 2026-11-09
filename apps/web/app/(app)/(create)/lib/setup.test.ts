import { describe, expect, it } from "vitest"

import { DEFAULT_LOOK } from "@/registry/fabricator/look"
import { DEFAULT_PLAYGROUND_OPTIONS } from "@/app/(view)/app-shell/_lib/options"

import {
  buildSetupCommand,
  DEFAULT_SETUP,
  getCommandParts,
  getSetupPlan,
  getShellProject,
  parseSetupParams,
  setupToParams,
  toProjectSetup,
  type Setup,
} from "./setup"

const setup = (changes: Partial<Setup> = {}): Setup => ({
  ...DEFAULT_SETUP,
  ...changes,
})

describe("the defaults", () => {
  it("turn the sounds and the App Shell on", () => {
    expect(DEFAULT_SETUP.sound).toBe(true)
    expect(DEFAULT_SETUP.appShell).toBe(true)
  })

  it("start a new project, with no assistants", () => {
    expect(DEFAULT_SETUP.project).toBe("monorepo")
    expect(DEFAULT_SETUP.web).toBe(true)
    expect(DEFAULT_SETUP.assistants).toEqual([])
  })
})

describe("buildSetupCommand", () => {
  it("is one command for the default project", () => {
    expect(buildSetupCommand(DEFAULT_SETUP, "npm")).toBe(
      "npx fabricator-ui@latest create my-app --yes"
    )
  })

  it("follows the package manager", () => {
    expect(buildSetupCommand(DEFAULT_SETUP, "bun")).toBe(
      "bunx --bun fabricator-ui@latest create my-app --yes"
    )
  })

  it("carries the whole project", () => {
    expect(
      buildSetupCommand(
        setup({
          project: "monorepo",
          name: "acme",
          framework: "vite",
          mobile: true,
          desktop: "tauri",
          assistants: ["claude", "codex"],
          look: { ...DEFAULT_LOOK, radius: "pill" },
          shell: { ...DEFAULT_PLAYGROUND_OPTIONS, variant: "floating" },
        }),
        "npm"
      )
    ).toBe(
      'npx fabricator-ui@latest create acme -t vite --mobile --desktop tauri --look "shape=pill" --shell "variant=floating" --agents "claude,codex" --yes'
    )
  })

  it("names what an existing project should change", () => {
    expect(buildSetupCommand(setup({ project: "existing" }), "npm")).toBe(
      "npx fabricator-ui@latest init --shell --sounds --yes"
    )
  })

  it("leaves out what only the preview uses", () => {
    expect(
      buildSetupCommand(
        setup({
          shell: {
            ...DEFAULT_PLAYGROUND_OPTIONS,
            window: "macos",
            fullscreen: true,
          },
        }),
        "npm"
      )
    ).toBe("npx fabricator-ui@latest create my-app --yes")
  })

  it("keeps glass only with a desktop app", () => {
    const shell = { ...DEFAULT_PLAYGROUND_OPTIONS, glass: false }
    expect(buildSetupCommand(setup({ shell }), "npm")).not.toContain("glass")
    expect(
      buildSetupCommand(
        setup({ project: "monorepo", desktop: "electron", shell }),
        "npm"
      )
    ).toContain('--shell "glass=false"')
  })
})

describe("the apps in the command", () => {
  it("is a monorepo with no flags by default", () => {
    expect(buildSetupCommand(DEFAULT_SETUP, "npm")).toBe(
      "npx fabricator-ui@latest create my-app --yes"
    )
  })

  it("writes a lone mobile app as the Expo template", () => {
    expect(buildSetupCommand(setup({ web: false, mobile: true }), "npm")).toBe(
      "npx fabricator-ui@latest create my-app -t expo --yes"
    )
  })

  it("writes a lone desktop app without a website", () => {
    expect(
      buildSetupCommand(setup({ web: false, desktop: "tauri" }), "npm")
    ).toBe(
      "npx fabricator-ui@latest create my-app --no-web --desktop tauri --yes"
    )
  })

  it("names a single project", () => {
    expect(buildSetupCommand(setup({ project: "new" }), "npm")).toBe(
      "npx fabricator-ui@latest create my-app --no-monorepo --yes"
    )
  })
})

describe("getCommandParts", () => {
  const command =
    'bunx --bun fabricator-ui@latest create my-app -t vite --mobile --desktop tauri --look "surface=260_0.02,primary=260_0.2" --yes'

  it("keeps the command whole, and each flag with its value", () => {
    expect(getCommandParts(command)).toEqual([
      "bunx --bun fabricator-ui@latest create my-app",
      "-t vite",
      "--mobile",
      "--desktop tauri",
      '--look "surface=260_0.02,primary=260_0.2"',
      "--yes",
    ])
  })

  it("adds up to the command people copy", () => {
    expect(getCommandParts(command).join(" ")).toBe(command)
  })

  it("has no flags to split when there are none", () => {
    expect(getCommandParts("npx fabricator-ui@latest init")).toEqual([
      "npx fabricator-ui@latest init",
    ])
  })
})

describe("getSetupPlan", () => {
  it("says what the command does", () => {
    expect(
      getSetupPlan(setup({ project: "new" })).map((step) => step.id)
    ).toEqual(["scaffold-web", "mount", "first-commit"])
  })
})

describe("toProjectSetup", () => {
  it("writes only what differs from the defaults", () => {
    expect(toProjectSetup(DEFAULT_SETUP)).toMatchObject({
      look: {},
      shell: {},
    })
  })
})

describe("getShellProject", () => {
  it("is web by default", () => {
    expect(getShellProject(DEFAULT_SETUP)).toEqual({
      hasWeb: true,
      hasDesktop: false,
      hasMobile: false,
    })
  })

  it("is mobile only for a lone mobile app", () => {
    expect(getShellProject(setup({ web: false, mobile: true }))).toEqual({
      hasWeb: false,
      hasDesktop: false,
      hasMobile: true,
    })
  })

  it("has no website for a lone desktop app", () => {
    expect(getShellProject(setup({ web: false, desktop: "tauri" }))).toEqual({
      hasWeb: false,
      hasDesktop: true,
      hasMobile: false,
    })
  })

  it("is mobile only for Expo", () => {
    expect(getShellProject(setup({ framework: "expo" }))).toEqual({
      hasWeb: false,
      hasDesktop: false,
      hasMobile: true,
    })
  })

  it("follows a monorepo's apps", () => {
    expect(
      getShellProject(
        setup({ project: "monorepo", mobile: true, desktop: "tauri" })
      )
    ).toEqual({ hasWeb: true, hasDesktop: true, hasMobile: true })
  })

  it("treats an existing project as web, since the page can't see it", () => {
    expect(
      getShellProject(setup({ project: "existing", framework: "expo" }))
    ).toEqual({ hasWeb: true, hasDesktop: false, hasMobile: false })
  })
})

describe("setup params", () => {
  it("writes nothing for the default setup", () => {
    expect(setupToParams(DEFAULT_SETUP).toString()).toBe("")
  })

  it("reads back what it writes", () => {
    const written: Setup = {
      project: "monorepo",
      framework: "astro",
      name: "studio-site",
      web: false,
      mobile: true,
      desktop: "tauri",
      base: "radix",
      iconLibrary: "phosphor",
      spinner: "ripple",
      look: { ...DEFAULT_LOOK, surface: { hue: 145, chroma: 0.022 } },
      sound: false,
      components: "all",
      assistants: ["claude", "codex"],
      skill: false,
      mcp: true,
      appShell: false,
      shell: {
        ...DEFAULT_PLAYGROUND_OPTIONS,
        variant: "floating",
        tabs: "main",
      },
    }
    expect(parseSetupParams(setupToParams(written))).toEqual(written)
  })

  it("ignores values it doesn't know", () => {
    expect(
      parseSetupParams(new URLSearchParams("framework=rails&shape=square"))
    ).toEqual(DEFAULT_SETUP)
  })
})

describe("old share links", () => {
  const read = (query: string) => parseSetupParams(new URLSearchParams(query))

  it("read a monorepo switch as the starting point", () => {
    expect(read("monorepo=true").project).toBe("monorepo")
    expect(read("project=existing&monorepo=true").project).toBe("existing")
  })

  it("read one assistant into the list", () => {
    expect(read("assistant=claude").assistants).toEqual(["claude"])
    expect(read("assistant=none").assistants).toEqual([])
    expect(read("assistant=claude&assistants=codex").assistants).toEqual([
      "codex",
    ])
  })
})

describe("the default icon pack", () => {
  it("is Fabricator, which needs no flag", () => {
    expect(DEFAULT_SETUP.iconLibrary).toBe("fabricator")
    expect(setupToParams(DEFAULT_SETUP).has("iconLibrary")).toBe(false)
  })

  it("reads Fabricator and Lucide from a share link", () => {
    expect(
      parseSetupParams(new URLSearchParams("iconLibrary=lucide")).iconLibrary
    ).toBe("lucide")
    expect(parseSetupParams(new URLSearchParams()).iconLibrary).toBe(
      "fabricator"
    )
  })

  it("asks for another library by name", () => {
    expect(
      buildSetupCommand(setup({ iconLibrary: "lucide" }), "npm")
    ).toContain("--icons lucide")
  })
})

it("shares a spinner and installs the same selection", () => {
  const selected = setup({ spinner: "braid" })
  expect(parseSetupParams(setupToParams(selected)).spinner).toBe("braid")
  expect(buildSetupCommand(selected, "bun")).toContain("--spinner braid")
})
