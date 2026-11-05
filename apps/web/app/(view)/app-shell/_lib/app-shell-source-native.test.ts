import ts from "typescript"
import { describe, expect, it } from "vitest"

import { GET } from "@/app/(app)/(create)/init/app-shell/route"

import {
  buildNativeAppShellItem,
  buildNativeAppShellSource,
  getNativeAppShellDependencies,
} from "./app-shell-source-native"
import { DEFAULT_PLAYGROUND_OPTIONS, type PlaygroundOptions } from "./options"

const pick = (changes: Partial<PlaygroundOptions> = {}): PlaygroundOptions => ({
  ...DEFAULT_PLAYGROUND_OPTIONS,
  ...changes,
})
const source = (changes: Partial<PlaygroundOptions> = {}) =>
  buildNativeAppShellSource(pick(changes))

const everyCombination = (): PlaygroundOptions[] => {
  const combinations: PlaygroundOptions[] = []
  for (const tabs of ["none", "main"] as const) {
    for (const flags of [true, false]) {
      for (const account of ["footer", "header", "none"] as const) {
        for (const switcher of ["menu", "command", "none"] as const) {
          combinations.push(
            pick({
              tabs,
              account,
              switcher,
              breadcrumb: flags,
              actions: flags,
              status: flags,
              panel: flags,
              reorder: flags,
              customize: !flags,
              bottomNav: !flags,
              bottomNavStyle: flags ? "floating" : "glass",
              collapse: flags ? "icon" : "offcanvas",
            })
          )
        }
      }
    }
  }
  return combinations
}

describe("buildNativeAppShellSource", () => {
  it("draws with React Native and the native icons", () => {
    const code = source()
    expect(code).toContain('from "@fabricator-ui/icons-react-native"')
    expect(code).toContain("@/registry/native/ui/app-shell")
    expect(code).not.toContain("<div")
    expect(code).not.toContain("<span")
    expect(code).not.toContain("<a ")
  })

  it("navigates through onNavigate", () => {
    expect(source()).toContain("onNavigate={onNavigate}")
    expect(source()).not.toContain("renderLink")
  })

  it("follows the shared options", () => {
    expect(source({ variant: "floating", collapse: "offcanvas" })).toContain(
      '<Sidebar variant="floating" collapsible="offcanvas">'
    )
    expect(source({ mobileSidebar: "sheet" })).toContain(
      'mobileSidebar="sheet"'
    )
    expect(source({ panelMobile: "swap" })).toContain('mobile="swap"')
    expect(source({ contentSize: "lg" })).toContain('size="lg"')
    expect(source({ switcher: "none" })).not.toContain("WorkspaceSwitcher")
    expect(source({ account: "none" })).not.toContain("UserMenu")
    expect(source({ panel: false })).not.toContain("AppShellPanel")
    expect(source({ status: false })).not.toContain("AppShellStatusBar")
    expect(source({ customize: true })).toContain("<AppNavCustomize")
  })

  it("gives the tab bar items", () => {
    const code = source({ bottomNav: true })
    expect(code).toContain("<AppNavBottomBar")
    expect(code.match(/mobile: "tab"/g)?.length).toBe(3)
  })

  it("draws the tab bar in its style", () => {
    const flat = source({ bottomNav: true })
    expect(flat).not.toContain('variant="floating"')
    expect(flat).not.toContain("expo-glass-effect")

    const floating = source({ bottomNav: true, bottomNavStyle: "floating" })
    expect(floating).toContain('variant="floating"')
    expect(floating).not.toContain("GlassView")

    const glass = source({ bottomNav: true, bottomNavStyle: "glass" })
    expect(glass).toContain('variant="floating"')
    expect(glass).toContain('from "expo-glass-effect"')
    // Without Liquid Glass, a GlassView is a see-through View.
    expect(glass).toContain(
      "capsule={isLiquidGlassAvailable() ? <GlassView isInteractive /> : undefined}"
    )
  })

  it("installs the glass module only for the glass tab bar", () => {
    const dependencies = (changes: Partial<PlaygroundOptions>) =>
      buildNativeAppShellItem(pick(changes)).dependencies
    expect(
      dependencies({ bottomNav: true, bottomNavStyle: "glass" })
    ).toContain("expo-glass-effect")
    expect(
      dependencies({ bottomNav: false, bottomNavStyle: "glass" })
    ).not.toContain("expo-glass-effect")
    expect(dependencies({ bottomNav: true })).not.toContain("expo-glass-effect")
  })

  it("ignores what needs a pointer or a window", () => {
    expect(source({ collapse: "offcanvas", peek: "hover" })).not.toContain(
      "peek="
    )
    expect(source({ window: "macos" })).not.toContain("window=")
    expect(source({ tabs: "titlebar" })).not.toContain("AppShellTitlebar")
    expect(source({ tabs: "titlebar" })).toContain("<TabStrip")
  })

  it(
    "is valid TSX with no unused imports, in every combination",
    { timeout: 60_000 },
    () => {
      for (const options of everyCombination()) {
        const code = buildNativeAppShellSource(options)
        const { diagnostics } = ts.transpileModule(code, {
          fileName: "app-shell-layout.tsx",
          reportDiagnostics: true,
          compilerOptions: { jsx: ts.JsxEmit.Preserve },
        })
        expect(diagnostics?.map((entry) => entry.messageText)).toEqual([])
        const body = code.slice(code.lastIndexOf(' from "') + 1)
        for (const match of code.matchAll(/import \{([^}]+)\} from/g)) {
          for (const raw of match[1]?.split(",") ?? []) {
            const name = raw.replace("type ", "").trim()
            if (name) {
              expect(body, `${name} in ${JSON.stringify(options)}`).toMatch(
                new RegExp(`\\b${name}\\b`)
              )
            }
          }
        }
      }
    }
  )
})

describe("getNativeAppShellDependencies", () => {
  it("is namespaced, and only what the choices need", () => {
    const base = getNativeAppShellDependencies(pick())
    expect(base.every((name) => name.startsWith("@fabricator/"))).toBe(true)
    expect(base).toContain("@fabricator/app-shell")
    expect(base).toContain("@fabricator/text")
    expect(base).not.toContain("@fabricator/tab-strip")
    expect(getNativeAppShellDependencies(pick({ tabs: "main" }))).toContain(
      "@fabricator/tab-strip"
    )
  })
})

describe("buildNativeAppShellItem", () => {
  it("writes the layout and the Expo Router adapter", () => {
    const item = buildNativeAppShellItem(pick())
    expect(item.files.map((file) => file.path)).toEqual([
      "registry/native/blocks/app-shell-layout/app-shell-layout.tsx",
      "registry/native/blocks/app-shell-layout/app-shell-root.tsx",
    ])
    expect(item.dependencies).toEqual(["@fabricator-ui/icons-react-native"])
    expect(item.files[1]?.content).toContain("usePathname")
    expect(item.files[1]?.content).toContain("expo-router")
  })
})

describe("GET /init/app-shell?platform=native", () => {
  it("serves the native item", async () => {
    const response = await GET({
      nextUrl: new URL(
        "http://localhost:4000/init/app-shell?platform=native&variant=floating"
      ),
    } as Parameters<typeof GET>[0])
    expect(response.status).toBe(200)
    const item = await response.json()
    expect(item.files[0].content).toContain('variant="floating"')
    expect(item.files[0].content).toContain("icons-react-native")
  })
})
