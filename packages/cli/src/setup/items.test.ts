import { DEFAULT_PROJECT_SETUP, type ProjectSetup } from "@fabricator-ui/setup"
import { describe, expect, it } from "vitest"

import {
  buildNativeSetupInitUrl,
  buildSetupInitUrl,
  buildShellUrl,
  getNativeItems,
  getWebItems,
} from "./items"

const SITE = "https://fabricator-ui.vercel.app"
const setup = (changes: Partial<ProjectSetup> = {}): ProjectSetup => ({
  ...DEFAULT_PROJECT_SETUP,
  ...changes,
})

describe("buildSetupInitUrl", () => {
  it("names the template and the base", () => {
    const url = new URL(
      buildSetupInitUrl(setup({ project: "new", framework: "vite" }), SITE)
    )
    expect(url.pathname).toBe("/init")
    expect(url.searchParams.get("template")).toBe("vite")
    expect(url.searchParams.get("base")).toBe("base")
  })

  it("names a monorepo's template", () => {
    const url = new URL(buildSetupInitUrl(setup({ project: "monorepo" }), SITE))
    expect(url.searchParams.get("template")).toBe("next-monorepo")
  })

  it("carries the look, and icons other than the default", () => {
    const url = new URL(
      buildSetupInitUrl(
        setup({ look: { shape: "pill" }, iconLibrary: "lucide" }),
        SITE
      )
    )
    expect(url.searchParams.get("shape")).toBe("pill")
    expect(url.searchParams.get("iconLibrary")).toBe("lucide")
    expect(
      new URL(buildSetupInitUrl(setup(), SITE)).searchParams.has("iconLibrary")
    ).toBe(false)
  })

  it("has no template for an existing project", () => {
    expect(
      new URL(
        buildSetupInitUrl(setup({ project: "existing" }), SITE)
      ).searchParams.has("template")
    ).toBe(false)
  })
})

describe("buildNativeSetupInitUrl", () => {
  it("asks for native, with the look", () => {
    const url = new URL(
      buildNativeSetupInitUrl(setup({ look: { shape: "pill" } }), SITE)
    )
    expect(url.searchParams.get("platform")).toBe("native")
    expect(url.searchParams.get("shape")).toBe("pill")
  })
})

describe("buildShellUrl", () => {
  it("names the framework and the desktop runtime", () => {
    const url = new URL(
      buildShellUrl(
        setup({
          project: "monorepo",
          desktop: "tauri",
          shell: { variant: "floating" },
        }),
        SITE,
        "next"
      )
    )
    expect(url.pathname).toBe("/init/app-shell")
    expect(url.searchParams.get("variant")).toBe("floating")
    expect(url.searchParams.get("framework")).toBe("next")
    expect(url.searchParams.get("desktop")).toBe("tauri")
  })

  it("asks for the native file", () => {
    const url = new URL(
      buildShellUrl(setup({ shell: { variant: "floating" } }), SITE, "expo")
    )
    expect(url.searchParams.get("platform")).toBe("native")
    expect(url.searchParams.get("variant")).toBe("floating")
    expect(url.searchParams.has("framework")).toBe(false)
  })

  it("carries icons other than the default", () => {
    expect(
      new URL(
        buildShellUrl(setup({ iconLibrary: "tabler" }), SITE, "vite")
      ).searchParams.get("iconLibrary")
    ).toBe("tabler")
  })
})

describe("the items a setup installs", () => {
  it("lists the web items, button first so it replaces the template's", () => {
    const [button, sounds, shell, url] = getWebItems(setup(), SITE, "next", [])
    expect([button, sounds, shell]).toEqual([
      "@fabricator/button",
      "@fabricator/sounds",
      "@fabricator/app-shell",
    ])
    expect(url).toContain("/init/app-shell")
  })

  it("leaves out what's off, and adds every component", () => {
    expect(
      getWebItems(setup({ appShell: false, sound: false }), SITE, "next", [
        "card",
      ])
    ).toEqual(["@fabricator/button", "@fabricator/card"])
  })

  it("lists the native items", () => {
    const items = getNativeItems(setup(), SITE, [])
    expect(items).toContain("@fabricator/fabricator-root")
    expect(items).toContain("@fabricator/sounds")
    expect(items.at(-1)).toContain("platform=native")
    expect(
      getNativeItems(setup({ appShell: false, sound: false }), SITE, [])
    ).toEqual(["@fabricator/fabricator-root", "@fabricator/button"])
  })
})
