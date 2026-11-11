import ts from "typescript"
import { describe, expect, it } from "vitest"

import { DEFAULT_SITE_SETTINGS } from "@/lib/site-settings"
import { GET } from "@/app/(app)/(create)/init/app-shell/route"
import { DEFAULT_SETUP, toProjectSetup } from "@/app/(app)/(create)/lib/setup"

import {
  buildAppShellInstallUrl,
  buildAppShellItem,
  buildAppShellSource,
  getAppShellDependencies,
  normalizeInstallOptions,
  parseAppShellParams,
  parseAppShellTarget,
  type AppShellTarget,
} from "./app-shell-source"
import { buildNativeAppShellSource } from "./app-shell-source-native"
import {
  buildAppShellCommand,
  buildSettingsCommands,
  getWindowOption,
} from "./install"
import { DEFAULT_PLAYGROUND_OPTIONS, type PlaygroundOptions } from "./options"

const SITE = "https://fabricator-ui.vercel.app"
const pick = (changes: Partial<PlaygroundOptions>): PlaygroundOptions => ({
  ...DEFAULT_PLAYGROUND_OPTIONS,
  ...changes,
})
const source = (changes: Partial<PlaygroundOptions> = {}) =>
  buildAppShellSource(pick(changes))

describe("document tab defaults", () => {
  it.each(["web", "native"])("does not seed a Home tab on %s", (platform) => {
    const content =
      platform === "native"
        ? buildNativeAppShellSource(pick({ tabs: "main" }))
        : source({ tabs: "main" })
    expect(content).not.toContain('tabs: ["home"]')
    expect(content).not.toContain('recent: ["home"]')
    expect(content).not.toContain('home: "Home"')
    expect(content).toContain("useTabStripState()")
  })
})

describe("buildAppShellInstallUrl", () => {
  it("has no query at the defaults", () => {
    expect(buildAppShellInstallUrl(DEFAULT_PLAYGROUND_OPTIONS, SITE)).toBe(
      `${SITE}/init/app-shell`
    )
  })

  it("carries only what differs", () => {
    const url = new URL(
      buildAppShellInstallUrl(pick({ variant: "floating", tabs: "main" }), SITE)
    )
    expect([...url.searchParams]).toEqual([
      ["variant", "floating"],
      ["tabs", "main"],
    ])
  })

  it("leaves out what the preview alone uses or the choices rule out", () => {
    const url = buildAppShellInstallUrl(
      pick({
        collapse: "icon",
        fullscreen: true,
        glass: false,
        peek: "hover",
        panel: false,
        panelMobile: "swap",
      }),
      SITE
    )
    expect(url).toBe(`${SITE}/init/app-shell?collapse=icon&panel=false`)
  })

  it("round-trips through the endpoint's parser", () => {
    const options = pick({
      variant: "sidebar",
      collapse: "offcanvas",
      peek: "click",
      tabs: "titlebar",
      contentSize: "lg",
      window: "macos",
      glass: false,
    })
    const url = new URL(buildAppShellInstallUrl(options, SITE))
    expect(parseAppShellParams(url.searchParams)).toEqual(options)
  })
})

describe("buildAppShellCommand", () => {
  it("names a Fabricator item, so the CLI sets up the registry too", () => {
    expect(
      buildAppShellCommand(pick({ tabs: "main" }), {
        siteUrl: SITE,
        packageManager: "npm",
      })
    ).toBe(
      `npx fabricator-ui@latest add app-shell "${SITE}/init/app-shell?tabs=main"`
    )
  })

  it("follows the package manager", () => {
    expect(
      buildAppShellCommand(DEFAULT_PLAYGROUND_OPTIONS, {
        siteUrl: SITE,
        packageManager: "bun",
      })
    ).toBe(
      `bunx --bun fabricator-ui@latest add app-shell "${SITE}/init/app-shell"`
    )
  })
})

describe("buildSettingsCommands", () => {
  it("is one init with the sounds at the defaults", () => {
    expect(buildSettingsCommands(DEFAULT_SITE_SETTINGS, "npm")).toEqual([
      "npx fabricator-ui@latest init --sounds --yes",
    ])
  })

  it("leaves the sounds out when they're off", () => {
    expect(
      buildSettingsCommands({ ...DEFAULT_SITE_SETTINGS, sound: false }, "npm")
    ).toEqual(["npx fabricator-ui@latest init --yes"])
  })

  it("carries the look and the icons", () => {
    const [init] = buildSettingsCommands(
      {
        ...DEFAULT_SITE_SETTINGS,
        sound: false,
        iconLibrary: "phosphor",
        radius: "pill",
        density: "compact",
        motion: "snappy",
      },
      "npm"
    )
    expect(init).toContain("--icons phosphor")
    expect(init).toContain("shape=pill")
    expect(init).toContain("density=compact")
    expect(init).toContain("motion=snappy")
  })
})

describe("getWindowOption", () => {
  it("reads the option from the real window", () => {
    expect(getWindowOption(undefined)).toBe("web")
    expect(getWindowOption({ controls: "macos" })).toBe("macos")
    expect(getWindowOption({ controls: "overlay" })).toBe("windows")
    expect(getWindowOption({ controls: "none" })).toBe("web")
  })
})

describe("normalizeInstallOptions", () => {
  it("drops peek without the off-canvas collapse", () => {
    expect(
      normalizeInstallOptions(pick({ collapse: "icon", peek: "hover" })).peek
    ).toBe("none")
    expect(
      normalizeInstallOptions(pick({ collapse: "offcanvas", peek: "hover" }))
        .peek
    ).toBe("hover")
  })

  it("drops the tab bar's style without a tab bar", () => {
    expect(
      normalizeInstallOptions(
        pick({ bottomNav: false, bottomNavStyle: "floating" })
      ).bottomNavStyle
    ).toBe("glass")
    expect(
      normalizeInstallOptions(
        pick({ bottomNav: true, bottomNavStyle: "floating" })
      ).bottomNavStyle
    ).toBe("floating")
  })
})

describe("toProjectSetup", () => {
  it("carries the tab bar's style into the setup command", () => {
    const { shell } = toProjectSetup({
      ...DEFAULT_SETUP,
      mobile: true,
      shell: {
        ...DEFAULT_SETUP.shell,
        bottomNav: true,
        bottomNavStyle: "floating",
      },
    })
    expect(shell).toMatchObject({
      bottomNav: "true",
      bottomNavStyle: "floating",
    })
  })
})

describe("buildAppShellSource", () => {
  it("writes the sidebar's style and collapse", () => {
    expect(source({ variant: "floating", collapse: "offcanvas" })).toContain(
      '<Sidebar variant="floating" collapsible="offcanvas">'
    )
  })

  it("writes the peek and the phone sidebar only when they aren't the default", () => {
    expect(source()).not.toContain("peek=")
    expect(source()).not.toContain("mobileSidebar=")
    expect(source({ collapse: "offcanvas", peek: "click" })).toContain(
      'peek="click"'
    )
    expect(source({ mobileSidebar: "sheet" })).toContain(
      'mobileSidebar="sheet"'
    )
  })

  it("adds the rail only when the sidebar collapses", () => {
    expect(source()).toContain("<SidebarRail />")
    expect(source({ collapse: "none" })).not.toContain("SidebarRail")
  })

  it("follows the workspaces choice", () => {
    expect(source()).toContain('variant="menu"')
    expect(source({ switcher: "command" })).toContain('variant="command"')
    expect(source({ switcher: "none" })).not.toContain("WorkspaceSwitcher")
  })

  it("puts the account where it was asked for", () => {
    expect(source()).toContain("<SidebarFooter>")
    expect(source()).toContain("<UserMenu user={user}>")
    expect(source({ account: "header" })).toContain('variant="mark"')
    expect(source({ account: "header" })).not.toContain("<SidebarFooter>")
    expect(source({ account: "none" })).not.toContain("UserMenu")
  })

  it("follows drag to reorder and customize", () => {
    expect(source()).toContain("reorderable: true")
    expect(source({ reorder: false })).not.toContain("reorderable")
    expect(source()).not.toContain("AppNavCustomize")
    expect(source({ customize: true })).toContain("<AppNavCustomize")
    expect(source({ customize: true })).toContain("customizable")
  })

  it("gives the content the chosen width", () => {
    expect(source()).toContain('<AppShellContent size="md">')
    expect(source({ contentSize: "lg" })).toContain(
      '<AppShellContent size="lg">'
    )
  })

  it("follows the breadcrumb, the actions and the status bar", () => {
    expect(source()).toContain("<AppShellBreadcrumb")
    expect(source({ breadcrumb: false })).not.toContain("AppShellBreadcrumb")
    expect(source()).toContain("<AppShellHeaderActions")
    expect(source({ actions: false })).not.toContain("AppShellHeaderActions")
    expect(source()).toContain("<AppShellStatusBar>")
    expect(source({ status: false })).not.toContain("AppShellStatusBar")
  })

  it("has no tabs by default", () => {
    expect(source()).not.toContain("TabStrip")
    expect(source()).not.toContain("AppShellTitlebar")
  })

  it("gives page tabs their own row, with the panel's toggle", () => {
    const code = source({ tabs: "main" })
    expect(code).toContain("<TabRow>")
    expect(code.indexOf("<AppShellPanelTrigger")).toBeLessThan(
      code.indexOf("<AppShellHeader")
    )
    expect(code).toContain("<TabStripNew />")
  })

  it("makes page tabs the header when it would hold nothing else", () => {
    const code = source({ tabs: "main", breadcrumb: false, actions: false })
    expect(code).not.toContain("<TabRow>")
    expect(code).toMatch(/<AppShellHeader>\s*<DocumentTabs \/>/)
  })

  it("puts titlebar tabs above everything", () => {
    expect(source({ tabs: "titlebar" })).toContain(
      "titlebar={\n        <AppShellTitlebar>"
    )
  })

  it("follows the panel and how it opens on phones", () => {
    expect(source()).toContain("<AppShellPanel")
    expect(source()).not.toContain("mobile=")
    expect(source({ panelMobile: "swap" })).toContain('mobile="swap"')
    const off = source({ panel: false })
    expect(off).not.toContain("AppShellPanel")
  })

  it("adds the phone tab bar only when asked", () => {
    expect(source()).not.toContain("AppNavBottomBar")
    expect(source({ bottomNav: true })).toContain("<AppNavBottomBar")
  })

  it("lays out around a macOS window, with lights that fit its titlebar", () => {
    const code = source({ window: "macos" })
    expect(code).toContain('controls: "macos"')
    expect(code).toContain("y: 23")
    expect(code).toContain("isTranslucent: true")
    expect(source({ window: "macos", tabs: "titlebar" })).toContain("y: 13")
    expect(source({ window: "macos", glass: false })).not.toContain(
      "isTranslucent"
    )
  })

  it("lays out around Windows' controls", () => {
    expect(source({ window: "windows" })).toContain('controls: "overlay"')
  })

  it("keeps the sidebar's own toggle out of a desktop window's header", () => {
    expect(source()).toContain("<SidebarTrigger")
    expect(source({ window: "macos" })).not.toContain("SidebarTrigger")
    expect(source({ collapse: "none" })).not.toContain("SidebarTrigger")
  })

  it("saves a desktop window's layout in local storage", () => {
    expect(source()).not.toContain("createLocalStorage")
    expect(source({ window: "macos" })).toContain(
      "storage={createLocalStorage()}"
    )
  })

  const everyCombination = (): PlaygroundOptions[] => {
    const combinations: PlaygroundOptions[] = []
    for (const tabs of ["none", "main", "titlebar"] as const) {
      for (const flags of [true, false]) {
        for (const window of ["web", "macos", "windows"] as const) {
          for (const account of ["footer", "header", "none"] as const) {
            for (const switcher of ["menu", "command", "none"] as const) {
              combinations.push(
                pick({
                  tabs,
                  window,
                  account,
                  switcher,
                  breadcrumb: flags,
                  actions: flags,
                  status: flags,
                  panel: flags,
                  reorder: flags,
                  customize: !flags,
                  bottomNav: !flags,
                  collapse: flags ? "icon" : "offcanvas",
                  peek: flags ? "none" : "hover",
                })
              )
            }
          }
        }
      }
    }
    return combinations
  }

  it(
    "is valid TSX with no unused imports, in every combination",
    { timeout: 60_000 },
    () => {
      for (const options of everyCombination()) {
        const code = buildAppShellSource(options)
        const { diagnostics } = ts.transpileModule(code, {
          fileName: "app-shell-layout.tsx",
          reportDiagnostics: true,
          compilerOptions: { jsx: ts.JsxEmit.Preserve },
        })
        expect(diagnostics?.map((entry) => entry.messageText)).toEqual([])
        const body = code.slice(code.lastIndexOf(' from "') + 1)
        const imported = [...code.matchAll(/import \{([^}]+)\} from/g)]
          .flatMap((match) => match[1]?.split(",") ?? [])
          .map((name) => name.replace("type ", "").trim())
          .filter(Boolean)
        for (const name of imported) {
          expect(body, `${name} unused in ${JSON.stringify(options)}`).toMatch(
            new RegExp(`\\b${name}\\b`)
          )
        }
      }
    }
  )

  it(
    "imports everything it uses from the library, in every combination",
    { timeout: 60_000 },
    () => {
      for (const options of everyCombination()) {
        const code = buildAppShellSource(options)
        const imported = new Set(
          [...code.matchAll(/import \{([^}]+)\} from/g)]
            .flatMap((match) => match[1]?.split(",") ?? [])
            .map((name) => name.replace("type ", "").trim())
        )
        const used = [...code.matchAll(/<([A-Z][A-Za-z]+)[\s/>]/g)].map(
          (match) => match[1] ?? ""
        )
        const local = new Set(["TabRow", "DocumentTabs", "UserMenuItems"])
        for (const name of used) {
          if (local.has(name)) continue
          expect(
            imported.has(name),
            `${name} in ${JSON.stringify(options)}`
          ).toBe(true)
        }
      }
    }
  )
})

describe("the tab bar", () => {
  it("has items to show when it's on", () => {
    const code = source({ bottomNav: true })
    expect(code.match(/mobile: "tab"/g)?.length).toBe(3)
    expect(source()).not.toContain('mobile: "tab"')
  })
})

describe("the panel", () => {
  it("starts closed, as the preview does", () => {
    expect(source()).not.toContain("defaultOpen")
  })
})

describe("a project's framework", () => {
  const files = (framework: AppShellTarget["framework"]) =>
    buildAppShellItem(DEFAULT_PLAYGROUND_OPTIONS, { framework }).files

  it("adds an adapter that passes the router's path and link", () => {
    const next = files("next")
    expect(next).toHaveLength(2)
    expect(next[1]?.path).toMatch(/app-shell-root\.tsx$/)
    expect(next[1]?.content).toContain("usePathname")
    expect(next[1]?.content).toContain('from "next/link"')
    expect(files("react-router")[1]?.content).toContain("useLocation")
    expect(files("start")[1]?.content).toContain("@tanstack/react-router")
    expect(files("vite")[1]?.content).toContain("pushState")
  })

  it("has no adapter where it can't be mounted yet", () => {
    expect(files("astro")).toHaveLength(1)
    expect(files("laravel")).toHaveLength(1)
    expect(files(undefined)).toHaveLength(1)
  })

  it("saves in local storage where there's no server", () => {
    const code = (framework: AppShellTarget["framework"]) =>
      buildAppShellSource(DEFAULT_PLAYGROUND_OPTIONS, { framework })
    expect(code("vite")).toContain("storage={createLocalStorage()}")
    expect(code("astro")).toContain("storage={createLocalStorage()}")
    expect(code("next")).not.toContain("createLocalStorage")
  })

  it("writes valid TSX in every adapter", () => {
    for (const framework of [
      "next",
      "vite",
      "start",
      "react-router",
    ] as const) {
      const { diagnostics } = ts.transpileModule(
        files(framework)[1]?.content ?? "",
        {
          fileName: "app-shell-root.tsx",
          reportDiagnostics: true,
          compilerOptions: { jsx: ts.JsxEmit.Preserve },
        }
      )
      expect(diagnostics?.map((entry) => entry.messageText)).toEqual([])
    }
  })
})

describe("a project with a desktop app", () => {
  const code = (changes: Partial<PlaygroundOptions> = {}) =>
    buildAppShellSource(pick(changes), { desktop: "tauri" })

  it("finds its window at runtime, whatever the preview showed", () => {
    expect(code({ window: "macos" })).toContain("window={shellWindow}")
    expect(code({ window: "macos" })).not.toContain('controls: "macos"')
    expect(code()).toContain("useDesktopWindow")
    expect(code()).toContain("storage={createLocalStorage()}")
  })

  it("keeps the sidebar's toggle outside a window only", () => {
    expect(code()).toContain("{!shellWindow && (")
    expect(code()).toContain("<SidebarTrigger")
    expect(code({ collapse: "none" })).not.toContain("SidebarTrigger")
  })

  it("passes the titlebar and the glass", () => {
    expect(code()).toContain("isTranslucent: true")
    expect(code({ glass: false })).toContain("isTranslucent: false")
    expect(code({ tabs: "titlebar" })).toContain("hasTitlebar: true")
  })

  it("depends on the item", () => {
    expect(
      getAppShellDependencies(pick({}), { desktop: "electron" })
    ).toContain("@fabricator/desktop-window")
    expect(getAppShellDependencies(pick({}))).not.toContain(
      "@fabricator/desktop-window"
    )
  })

  it("is valid TSX with no unused imports", () => {
    for (const options of [
      pick({}),
      pick({ tabs: "titlebar", glass: false }),
      pick({ tabs: "main", collapse: "none" }),
      pick({ account: "header", switcher: "none" }),
    ]) {
      const written = buildAppShellSource(options, { desktop: "electron" })
      const { diagnostics } = ts.transpileModule(written, {
        fileName: "app-shell-layout.tsx",
        reportDiagnostics: true,
        compilerOptions: { jsx: ts.JsxEmit.Preserve },
      })
      expect(diagnostics?.map((entry) => entry.messageText)).toEqual([])
      const body = written.slice(written.lastIndexOf(' from "') + 1)
      for (const match of written.matchAll(/import \{([^}]+)\} from/g)) {
        for (const raw of match[1]?.split(",") ?? []) {
          const name = raw.replace("type ", "").trim()
          if (name) expect(body, name).toMatch(new RegExp(`\\b${name}\\b`))
        }
      }
    }
  })
})

describe("the install URL for a target", () => {
  it("carries the framework and the desktop runtime", () => {
    expect(
      buildAppShellInstallUrl(pick({}), SITE, "fabricator", {
        framework: "next",
        desktop: "tauri",
      })
    ).toBe(`${SITE}/init/app-shell?framework=next&desktop=tauri`)
  })

  it("is read back by the endpoint", () => {
    expect(
      parseAppShellTarget(
        new URLSearchParams("framework=vite&desktop=electron")
      )
    ).toEqual({ framework: "vite", desktop: "electron" })
    expect(
      parseAppShellTarget(new URLSearchParams("framework=rails&desktop=qt"))
    ).toEqual({})
  })

  it("serves the adapter and the runtime window", async () => {
    const response = await GET({
      nextUrl: new URL(`${SITE}/init/app-shell?framework=next&desktop=tauri`),
    } as Parameters<typeof GET>[0])
    const item = await response.json()
    expect(item.files).toHaveLength(2)
    expect(item.files[0].content).toContain("window={shellWindow}")
    expect(item.registryDependencies).toContain("@fabricator/desktop-window")
  })
})

describe("getAppShellDependencies", () => {
  it("is namespaced, and only what the choices need", () => {
    const base = getAppShellDependencies(DEFAULT_PLAYGROUND_OPTIONS)
    expect(base.every((name) => name.startsWith("@fabricator/"))).toBe(true)
    expect(base).toContain("@fabricator/app-shell")
    expect(base).toContain("@fabricator/app-nav")
    expect(base).toContain("@fabricator/user-menu")
    expect(base).toContain("@fabricator/workspace-switcher")
    expect(base).not.toContain("@fabricator/tab-strip")

    const minimal = getAppShellDependencies(
      pick({ account: "none", switcher: "none" })
    )
    expect(minimal).not.toContain("@fabricator/user-menu")
    expect(minimal).not.toContain("@fabricator/workspace-switcher")
    expect(getAppShellDependencies(pick({ tabs: "main" }))).toContain(
      "@fabricator/tab-strip"
    )
  })
})

describe("buildAppShellItem", () => {
  it("is one component file, with what to do next", () => {
    const item = buildAppShellItem(DEFAULT_PLAYGROUND_OPTIONS)
    expect(item.name).toBe("app-shell-layout")
    expect(item.files).toHaveLength(1)
    expect(item.files[0]?.type).toBe("registry:component")
    expect(item.files[0]?.path).toMatch(/app-shell-layout\.tsx$/)
    expect(item.docs).toContain("AppShellLayout")
  })
})

describe("GET /init/app-shell", () => {
  const request = (search = "") =>
    ({
      nextUrl: new URL(`http://localhost:4000/init/app-shell${search}`),
    }) as Parameters<typeof GET>[0]

  it("returns a valid registry item for the choices", async () => {
    const response = await GET(request("?variant=floating&contentSize=lg"))
    expect(response.status).toBe(200)
    const item = await response.json()
    expect(item.type).toBe("registry:block")
    expect(item.files[0].content).toContain('variant="floating"')
    expect(item.files[0].content).toContain('size="lg"')
  })

  it("falls back to the defaults for values it doesn't know", async () => {
    const response = await GET(request("?variant=nope"))
    expect(response.status).toBe(200)
    const item = await response.json()
    expect(item.files[0].content).toContain('variant="inset"')
  })
})

describe("the icons in the written file", () => {
  it("come from Fabricator's package by default", () => {
    const item = buildAppShellItem(DEFAULT_PLAYGROUND_OPTIONS)
    const content = item.files[0]?.content ?? ""
    expect(item.dependencies).toEqual(["@fabricator-ui/icons"])
    expect(content).not.toContain("IconPlaceholder")
    expect(content).toMatch(
      /import \{[^}]*\bHomeIcon\b[^}]*\} from "@fabricator-ui\/icons"/
    )
    expect(content).toContain("<HomeIcon />")
  })

  it("stay placeholders for another library, which the project resolves", () => {
    const item = buildAppShellItem(DEFAULT_PLAYGROUND_OPTIONS, { icons: false })
    expect(item.dependencies).toBeUndefined()
    expect(item.files[0]?.content).toContain("<IconPlaceholder")
  })

  it("follow the URL at the endpoint", async () => {
    const read = async (query: string) => {
      const response = await GET({
        nextUrl: new URL(`${SITE}/init/app-shell${query}`),
      } as Parameters<typeof GET>[0])
      return (await response.json()).files[0].content as string
    }
    expect(await read("")).toContain('"@fabricator-ui/icons"')
    expect(await read("?iconLibrary=lucide")).toContain("<IconPlaceholder")
  })

  it("are named in the command when the site's setting isn't the default", () => {
    const context = { siteUrl: SITE, packageManager: "npm" as const }
    expect(buildAppShellCommand(DEFAULT_PLAYGROUND_OPTIONS, context)).toBe(
      `npx fabricator-ui@latest add app-shell "${SITE}/init/app-shell"`
    )
    expect(
      buildAppShellCommand(DEFAULT_PLAYGROUND_OPTIONS, {
        ...context,
        iconLibrary: "lucide",
      })
    ).toBe(
      `npx fabricator-ui@latest add app-shell "${SITE}/init/app-shell?iconLibrary=lucide"`
    )
    expect(
      buildAppShellInstallUrl(pick({ variant: "floating" }), SITE, "tabler")
    ).toBe(`${SITE}/init/app-shell?variant=floating&iconLibrary=tabler`)
  })
})

it("installs the selected spinner when copying the App Shell command alone", async () => {
  const command = buildAppShellCommand(DEFAULT_PLAYGROUND_OPTIONS, {
    siteUrl: SITE,
    packageManager: "npm",
    spinner: "pulse",
  })
  expect(command).toContain("spinner=pulse")
  const response = await GET({
    nextUrl: new URL(`${SITE}/init/app-shell?spinner=pulse`),
  } as Parameters<typeof GET>[0])
  const item = await response.json()
  expect(item.cssVars.light["spinner-pulse"]).toBe("inline")
  expect(item.cssVars.light["spinner-orbit"]).toBe("none")
})
