import { describe, expect, it } from "vitest"

import { ROLE_DEFAULTS } from "@/registry/fabricator/color-roles"
import { DEFAULT_LOOK } from "@/registry/fabricator/look"
import { DEFAULT_PLAYGROUND_OPTIONS } from "@/app/(view)/app-shell/_lib/options"

import {
  buildInitUrl,
  buildSetupCommands,
  DEFAULT_SETUP,
  parseSetupParams,
  setupToParams,
  type PackageManager,
  type Setup,
} from "./setup"

const SITE = "https://fabricator-ui.vercel.app"

function commands(
  setup: Partial<Setup>,
  packageManager: PackageManager = "npm"
) {
  // Tests of the other steps read better without the shell's command.
  return buildSetupCommands(
    { ...DEFAULT_SETUP, appShell: false, ...setup },
    { siteUrl: SITE, packageManager }
  )
}

function codes(setup: Partial<Setup>, packageManager: PackageManager = "npm") {
  return commands(setup, packageManager).map((command) => command.code)
}

describe("the App Shell", () => {
  const appShell = true
  const shellCommand = (setup: Partial<Setup>) =>
    commands({ appShell, ...setup }).find(
      (command) => command.id === "app-shell"
    )?.code

  it("is part of the default setup, between init and the dev server", () => {
    expect(DEFAULT_SETUP.appShell).toBe(true)
    expect(codes({ appShell })).toEqual([
      "npx fabricator-ui@latest init -t next -n my-app --no-monorepo",
      "cd my-app",
      `npx fabricator-ui@latest add app-shell "${SITE}/init/app-shell"`,
      "npm run dev",
    ])
  })

  it("carries the choices in its URL", () => {
    expect(
      shellCommand({
        shell: {
          ...DEFAULT_PLAYGROUND_OPTIONS,
          variant: "floating",
          tabs: "main",
        },
      })
    ).toBe(
      `npx fabricator-ui@latest add app-shell "${SITE}/init/app-shell?variant=floating&tabs=main"`
    )
  })

  it("carries an icon library other than the default", () => {
    expect(shellCommand({ iconLibrary: "lucide" })).toBe(
      `npx fabricator-ui@latest add app-shell "${SITE}/init/app-shell?iconLibrary=lucide"`
    )
  })

  it("targets the app in a monorepo", () => {
    expect(shellCommand({ monorepo: true })).toBe(
      `npx fabricator-ui@latest add app-shell "${SITE}/init/app-shell" -c apps/web`
    )
  })

  it("is left out when turned off", () => {
    expect(shellCommand({ appShell: false })).toBeUndefined()
  })

  it("is left out for React Native, which has no App Shell yet", () => {
    expect(shellCommand({ framework: "expo" })).toBeUndefined()
  })

  it("follows the package manager", () => {
    expect(codes({ appShell }, "bun")).toContain(
      `bunx --bun fabricator-ui@latest add app-shell "${SITE}/init/app-shell"`
    )
  })
})

describe("Expo", () => {
  const expo = { framework: "expo" as const }

  it("creates the app, then installs Fabricator UI in it", () => {
    expect(codes(expo)).toEqual(
      expect.arrayContaining([
        "npx create-expo-app@latest my-app",
        "cd my-app",
        "npx fabricator-ui@latest init",
        "npx expo run:ios",
      ])
    )
  })

  it("names the project", () => {
    expect(codes({ ...expo, name: "acme" })).toContain(
      "npx create-expo-app@latest acme"
    )
  })

  it("skips creating an app that exists", () => {
    const list = codes({ ...expo, project: "existing" })
    expect(list.join(" ")).not.toContain("create-expo-app")
    expect(list).toContain("npx fabricator-ui@latest init")
  })

  it("carries the look in a native init URL", () => {
    const init = codes({
      ...expo,
      look: { ...DEFAULT_LOOK, radius: "pill" },
    }).find((code) => code.includes("fabricator-ui@latest init"))
    expect(init).toBe(
      `npx fabricator-ui@latest init -p "${SITE}/init?platform=native&shape=pill"`
    )
  })

  it("shows how to wrap the root layout", () => {
    const wrap = commands(expo).find((command) => command.id === "root")
    expect(wrap?.language).toBe("tsx")
    expect(wrap?.code).toContain("<FabricatorRoot>")
  })

  it("adds every component and turns on feedback when asked", () => {
    const list = codes({ ...expo, components: "all", sound: true })
    expect(list).toContain("npx fabricator-ui@latest add --all")
    expect(list).toContain("npx fabricator-ui@latest add sounds")
  })

  it("follows the package manager", () => {
    expect(codes(expo, "bun")).toContain(
      "bunx --bun create-expo-app@latest my-app"
    )
  })

  it("keeps the assistant steps", () => {
    expect(
      codes({ ...expo, assistant: "claude", skill: true, mcp: false }).join(" ")
    ).toContain("npx skills add")
  })
})

describe("buildInitUrl", () => {
  it("is undefined when everything is the default", () => {
    expect(buildInitUrl(DEFAULT_SETUP, SITE)).toBeUndefined()
  })

  it("carries the base, icons and look", () => {
    const url = buildInitUrl(
      {
        ...DEFAULT_SETUP,
        base: "radix",
        iconLibrary: "tabler",
        look: { ...DEFAULT_LOOK, radius: "pill" },
      },
      SITE
    )
    expect(url).toBe(
      `${SITE}/init?base=radix&template=next&iconLibrary=tabler&shape=pill`
    )
  })

  it("names the template, monorepo included", () => {
    const url = buildInitUrl(
      {
        ...DEFAULT_SETUP,
        framework: "vite",
        monorepo: true,
        look: { ...DEFAULT_LOOK, motion: "snappy" },
      },
      SITE
    )
    expect(url).toBe(
      `${SITE}/init?base=base&template=vite-monorepo&motion=snappy`
    )
  })
})

describe("buildInitUrl with a density", () => {
  it("writes the density into the init URL", () => {
    const url = buildInitUrl(
      { ...DEFAULT_SETUP, look: { ...DEFAULT_LOOK, density: "spacious" } },
      SITE
    )
    expect(url).toBe(`${SITE}/init?base=base&template=next&density=spacious`)
  })
})

describe("buildSetupCommands", () => {
  it("creates a Next.js app with the defaults", () => {
    expect(codes({})).toEqual([
      "npx fabricator-ui@latest init -t next -n my-app --no-monorepo",
      "cd my-app",
      "npm run dev",
    ])
  })

  it("passes the base and the look's init URL", () => {
    const [init] = codes({
      base: "aria",
      look: {
        ...DEFAULT_LOOK,
        colors: { ...ROLE_DEFAULTS, primary: { hue: 260, chroma: 0.15 } },
      },
    })
    expect(init).toBe(
      `npx fabricator-ui@latest init -t next -n my-app -b aria --no-monorepo -p "${SITE}/init?base=aria&template=next&primary=260_0.15"`
    )
  })

  it("scaffolds a monorepo and adds components to its app", () => {
    expect(codes({ monorepo: true, components: "all" })).toEqual([
      "npx fabricator-ui@latest init -t next -n my-app --monorepo",
      "cd my-app",
      "npx fabricator-ui@latest add --all -c apps/web",
      "npm run dev",
    ])
  })

  it("installs sounds and shows where to mount them", () => {
    const steps = commands({ sound: true })
    expect(steps.map((step) => step.code)).toContain(
      "npx fabricator-ui@latest add sounds"
    )
    expect(steps.find((step) => step.language === "tsx")?.code).toContain(
      "<SoundEffects />"
    )
  })

  it("installs the agent skill and MCP server for the assistant", () => {
    expect(codes({ assistant: "cursor", skill: true, mcp: true })).toEqual([
      "npx fabricator-ui@latest init -t next -n my-app --no-monorepo",
      "cd my-app",
      "npx skills add gabrielespinheira/fabricator-ui --skill fabricator --agent cursor --yes",
      "npx fabricator-ui@latest mcp init --client cursor",
      "npm run dev",
    ])
  })

  it("skips the skill and MCP server without an assistant", () => {
    expect(codes({ assistant: "none", skill: true, mcp: true })).toHaveLength(3)
  })

  it("creates a Laravel app with the installer first", () => {
    expect(codes({ framework: "laravel" })).toEqual([
      "laravel new my-app",
      "cd my-app",
      "npx fabricator-ui@latest init",
      "composer run dev",
    ])
  })

  it("sets up an existing project in place", () => {
    expect(
      codes({ project: "existing", look: { ...DEFAULT_LOOK, radius: "pill" } })
    ).toEqual([
      `npx fabricator-ui@latest init -p "${SITE}/init?base=base&shape=pill"`,
    ])
  })

  it("writes every command for the package manager", () => {
    expect(codes({ components: "all" }, "bun")).toEqual([
      "bunx --bun fabricator-ui@latest init -t next -n my-app --no-monorepo",
      "cd my-app",
      "bunx --bun fabricator-ui@latest add --all",
      "bun dev",
    ])
    expect(codes({}, "pnpm")[0]).toBe(
      "pnpm dlx fabricator-ui@latest init -t next -n my-app --no-monorepo"
    )
    expect(codes({}, "yarn").at(-1)).toBe("yarn dev")
  })

  it("falls back to the default name for a blank one", () => {
    expect(codes({ name: "  " })[1]).toBe("cd my-app")
  })
})

describe("setup params", () => {
  it("writes nothing for the default setup", () => {
    expect(setupToParams(DEFAULT_SETUP).toString()).toBe("")
  })

  it("reads back what it writes", () => {
    const setup: Setup = {
      project: "existing",
      framework: "astro",
      name: "studio-site",
      monorepo: true,
      base: "radix",
      iconLibrary: "phosphor",
      look: { ...DEFAULT_LOOK, surface: { hue: 145, chroma: 0.022 } },
      sound: true,
      components: "all",
      assistant: "claude",
      skill: false,
      mcp: true,
      appShell: false,
      shell: {
        ...DEFAULT_PLAYGROUND_OPTIONS,
        variant: "floating",
        tabs: "main",
      },
    }
    expect(parseSetupParams(setupToParams(setup))).toEqual(setup)
  })

  it("ignores values it doesn't know", () => {
    expect(
      parseSetupParams(new URLSearchParams("framework=rails&shape=square"))
    ).toEqual(DEFAULT_SETUP)
  })
})

describe("the default icon pack", () => {
  it("is Fabricator, which needs no flag", () => {
    expect(DEFAULT_SETUP.iconLibrary).toBe("fabricator")
    expect(buildInitUrl(DEFAULT_SETUP, SITE)).toBeUndefined()
    expect(setupToParams(DEFAULT_SETUP).has("iconLibrary")).toBe(false)
  })

  it("asks for Lucide by name", () => {
    expect(
      buildInitUrl({ ...DEFAULT_SETUP, iconLibrary: "lucide" }, SITE)
    ).toBe(`${SITE}/init?base=base&template=next&iconLibrary=lucide`)
  })

  it("reads Fabricator and Lucide from a share link", () => {
    expect(
      parseSetupParams(new URLSearchParams("iconLibrary=lucide")).iconLibrary
    ).toBe("lucide")
    expect(
      parseSetupParams(new URLSearchParams("iconLibrary=fabricator"))
        .iconLibrary
    ).toBe("fabricator")
    expect(parseSetupParams(new URLSearchParams()).iconLibrary).toBe(
      "fabricator"
    )
  })
})
