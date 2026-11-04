import { createLoader } from "nuqs"
import { describe, expect, it } from "vitest"

import {
  countChangedOptions,
  DEFAULT_PLAYGROUND_OPTIONS,
  getPlaygroundWindow,
  isPeekAvailable,
  playgroundParsers,
} from "./options"

const load = (query: string) =>
  createLoader(playgroundParsers)(new URLSearchParams(query))

describe("playground options", () => {
  it("starts from an inset sidebar with a panel and no tabs", () => {
    expect(DEFAULT_PLAYGROUND_OPTIONS).toMatchObject({
      variant: "inset",
      collapse: "icon",
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

  it("offers peek only for an off-canvas sidebar", () => {
    expect(isPeekAvailable(load("collapse=offcanvas"))).toBe(true)
    expect(isPeekAvailable(load("collapse=icon"))).toBe(false)
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
