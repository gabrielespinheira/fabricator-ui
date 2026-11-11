import { createLoader } from "nuqs"
import { describe, expect, it } from "vitest"

import { getShellOptionSections } from "@/registry/fabricator/app-shell-options"

import {
  countChangedOptions,
  DEFAULT_PLAYGROUND_OPTIONS,
  getPlaygroundWindow,
  getPreviewSize,
  getShellOptionNotes,
  getTabsPlacement,
  playgroundParsers,
} from "./options"

const load = (query: string) =>
  createLoader(playgroundParsers)(new URLSearchParams(query))

describe("playground options", () => {
  it("starts from an inset sidebar with a panel and no tabs", () => {
    expect(DEFAULT_PLAYGROUND_OPTIONS).toMatchObject({
      variant: "inset",
      collapse: "offcanvas",
      bottomNavStyle: "glass",
      switcher: "menu",
      account: "footer",
      tabs: "none",
      panel: true,
      window: "web",
    })
  })

  it("leaves density to the site's settings", () => {
    expect(load("density=compact")).not.toHaveProperty("density")
  })

  it("reads the options from the URL", () => {
    expect(load("variant=floating&tabs=titlebar&panel=false")).toMatchObject({
      variant: "floating",
      tabs: "titlebar",
      panel: false,
    })
  })

  it("falls back to the default for unknown values", () => {
    expect(load("variant=wide&window=linux").variant).toBe("inset")
    expect(load("variant=wide&window=linux").window).toBe("web")
  })

  it("counts the options that differ from the defaults", () => {
    expect(countChangedOptions(DEFAULT_PLAYGROUND_OPTIONS)).toBe(0)
    expect(countChangedOptions(load("tabs=main&status=false"))).toBe(2)
  })

  it("reveals the phone sidebar unless asked for a sheet", () => {
    expect(DEFAULT_PLAYGROUND_OPTIONS.mobileSidebar).toBe("reveal")
    expect(load("mobileSidebar=sheet").mobileSidebar).toBe("sheet")
    expect(load("mobileSidebar=drawer").mobileSidebar).toBe("reveal")
  })

  it("counts against the defaults it is given", () => {
    const defaults = load("collapse=icon")
    expect(countChangedOptions(defaults, defaults)).toBe(0)
    expect(countChangedOptions(DEFAULT_PLAYGROUND_OPTIONS, defaults)).toBe(1)
  })

  it("puts tabs in the header when nothing else needs it", () => {
    expect(getTabsPlacement(load("tabs=none"))).toBe("none")
    expect(getTabsPlacement(load("tabs=titlebar"))).toBe("titlebar")
    expect(getTabsPlacement(load("tabs=main"))).toBe("row")
    expect(getTabsPlacement(load("tabs=main&breadcrumb=false"))).toBe("row")
    expect(getTabsPlacement(load("tabs=main&actions=false"))).toBe("row")
    expect(
      getTabsPlacement(load("tabs=main&breadcrumb=false&actions=false"))
    ).toBe("header")
  })
})

describe("getPlaygroundWindow", () => {
  it("has no native window on the web", () => {
    expect(getPlaygroundWindow(DEFAULT_PLAYGROUND_OPTIONS)).toBeUndefined()
  })

  it("places traffic lights for macOS, over a translucent window", () => {
    expect(getPlaygroundWindow(load("window=macos"))).toEqual({
      controls: "macos",
      isFullscreen: false,
      trafficLights: { x: 16, y: 23 },
      isTranslucent: true,
    })
  })

  it("centres the lights in a titlebar row", () => {
    expect(
      getPlaygroundWindow(load("window=macos&tabs=titlebar"))?.trafficLights
    ).toEqual({ x: 16, y: 13 })
  })

  it("starts the content at the middle width, and any of the three can be linked", () => {
    expect(DEFAULT_PLAYGROUND_OPTIONS.contentSize).toBe("md")
    expect(load("contentSize=sm").contentSize).toBe("sm")
    expect(load("contentSize=lg").contentSize).toBe("lg")
    expect(load("contentSize=huge").contentSize).toBe("md")
  })

  it("counts a changed content width for Reset", () => {
    expect(countChangedOptions(load("contentSize=lg"))).toBe(1)
  })

  it("reserves the window buttons for Windows", () => {
    expect(getPlaygroundWindow(load("window=windows&fullscreen=true"))).toEqual(
      {
        controls: "overlay",
        isFullscreen: true,
        overlayWidth: 138,
        isTranslucent: true,
      }
    )
  })

  it("paints an opaque window without glass", () => {
    expect(
      getPlaygroundWindow(load("window=macos&glass=false"))?.isTranslucent
    ).toBe(false)
  })
})

describe("what a project's shell offers", () => {
  const web = { hasWeb: true, hasDesktop: false, hasMobile: false }
  const desktop = { hasWeb: true, hasDesktop: true, hasMobile: false }
  const mobile = { hasWeb: true, hasDesktop: false, hasMobile: true }
  const both = { hasWeb: true, hasDesktop: true, hasMobile: true }
  const expo = { hasWeb: false, hasDesktop: false, hasMobile: true }

  it("gives every option a place in the cards", () => {
    const keys = getShellOptionSections({
      options: DEFAULT_PLAYGROUND_OPTIONS,
      project: both,
    }).flatMap(({ groups }) =>
      groups.flatMap(({ rows }) => rows.map(({ key }) => key))
    )
    expect(keys.sort()).toEqual(Object.keys(DEFAULT_PLAYGROUND_OPTIONS).sort())
  })

  it("says when an option doesn't reach every app", () => {
    expect(getShellOptionNotes(web)).toEqual({})
    expect(getShellOptionNotes(mobile).peek).toBe("Web and desktop only.")
    expect(getShellOptionNotes(desktop).glass).toBe("macOS only.")
    expect(getShellOptionNotes(expo).peek).toBeUndefined()
    expect(getShellOptionNotes(desktop).bottomNavStyle).toBeUndefined()
    expect(getShellOptionNotes(mobile).bottomNavStyle).toMatch(/React Native/)
    expect(getShellOptionNotes(expo).bottomNavStyle).toMatch(/React Native/)
  })

  it("previews the app a project leads with", () => {
    expect(getPreviewSize(web)).toBe("browser")
    expect(getPreviewSize(mobile)).toBe("browser")
    expect(getPreviewSize(desktop)).toBe("macos")
    expect(getPreviewSize(both)).toBe("macos")
    expect(getPreviewSize(expo)).toBe("phone")
  })
})

describe("the window a runtime draws", () => {
  const pick = (query: string) => load(query)

  it("keeps Electron's row short and Tauri's tall", () => {
    const options = pick("window=macos&tabs=titlebar")
    expect(getPlaygroundWindow(options, "electron")?.trafficLights?.y).toBe(13)
    expect(getPlaygroundWindow(options, "tauri")?.trafficLights?.y).toBe(23)
  })

  it("leaves Windows' title bar to Tauri", () => {
    const options = pick("window=windows")
    expect(getPlaygroundWindow(options, "electron")?.controls).toBe("overlay")
    expect(getPlaygroundWindow(options, "tauri")).toBeUndefined()
  })
})

describe("the Windows window in the preview", () => {
  const windows = {
    ...DEFAULT_PLAYGROUND_OPTIONS,
    window: "windows",
    glass: true,
  } as const

  it("has no glass in a project's Electron app, which sets no material there", () => {
    expect(getPlaygroundWindow(windows, "electron")?.isTranslucent).toBe(false)
  })

  it("keeps it on the App Shell's own page, where any app can add Mica", () => {
    expect(getPlaygroundWindow(windows)?.isTranslucent).toBe(true)
  })
})
