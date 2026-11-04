import { describe, expect, it } from "vitest"

import {
  getDesktopWindow,
  getExplorerNavGroups,
  getPlatform,
  isFullscreenWindow,
  readDesktopRuntime,
} from "./desktop"

describe("getPlatform", () => {
  it("reads the platform from the user agent", () => {
    expect(getPlatform("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)")).toBe(
      "mac"
    )
    expect(getPlatform("Mozilla/5.0 (Windows NT 10.0; Win64; x64)")).toBe(
      "windows"
    )
    expect(getPlatform("Mozilla/5.0 (X11; Linux x86_64)")).toBe("linux")
  })
})

describe("readDesktopRuntime", () => {
  const mac = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"

  it("finds the Electron bridge and its platform", () => {
    expect(
      readDesktopRuntime(
        {
          fabricatorDesktop: {
            runtime: "electron",
            platform: "win32",
            setAppearance: () => {},
          },
        },
        mac
      )
    ).toEqual({ runtime: "electron", platform: "windows" })
  })

  it("finds Tauri by its internals", () => {
    expect(readDesktopRuntime({ __TAURI_INTERNALS__: {} }, mac)).toEqual({
      runtime: "tauri",
      platform: "mac",
    })
  })

  it("is a browser otherwise", () => {
    expect(readDesktopRuntime({}, mac)).toEqual({
      runtime: "browser",
      platform: "mac",
    })
    expect(
      readDesktopRuntime({ fabricatorDesktop: { runtime: "other" } }, mac)
        .runtime
    ).toBe("browser")
  })
})

describe("getDesktopWindow", () => {
  it("has no window chrome in a browser", () => {
    expect(
      getDesktopWindow({
        runtime: "browser",
        platform: "mac",
        isFullscreen: false,
      })
    ).toBeUndefined()
  })

  it("lays out around the traffic lights over glass on macOS", () => {
    const expected = {
      controls: "macos",
      isFullscreen: true,
      trafficLights: { x: 16, y: 23 },
      isTranslucent: true,
    }
    expect(
      getDesktopWindow({
        runtime: "electron",
        platform: "mac",
        isFullscreen: true,
      })
    ).toEqual(expected)
    expect(
      getDesktopWindow({
        runtime: "tauri",
        platform: "mac",
        isFullscreen: true,
      })
    ).toEqual(expected)
  })

  it("clears Electron's window buttons on Windows and Linux", () => {
    expect(
      getDesktopWindow({
        runtime: "electron",
        platform: "linux",
        isFullscreen: false,
      })
    ).toEqual({ controls: "overlay", isFullscreen: false })
  })

  it("leaves Tauri's native title bar alone off macOS", () => {
    expect(
      getDesktopWindow({
        runtime: "tauri",
        platform: "windows",
        isFullscreen: false,
      })
    ).toBeUndefined()
  })
})

describe("isFullscreenWindow", () => {
  it("is fullscreen when the page fills the screen", () => {
    expect(
      isFullscreenWindow({
        innerWidth: 1512,
        innerHeight: 982,
        screenWidth: 1512,
        screenHeight: 982,
      })
    ).toBe(true)
    expect(
      isFullscreenWindow({
        innerWidth: 1512,
        innerHeight: 945,
        screenWidth: 1512,
        screenHeight: 982,
      })
    ).toBe(false)
  })
})

describe("getExplorerNavGroups", () => {
  it("lists an overview, then one row per component group holding its components", () => {
    const groups = getExplorerNavGroups(
      [
        { slug: "tooltip", title: "Tooltip", group: "Overlays & Menus" },
        { slug: "button", title: "Button", group: "Basics" },
        { slug: "dialog", title: "Dialog", group: "Overlays & Menus" },
      ],
      {
        overview: "home",
        groups: { Basics: "box", "Overlays & Menus": "layers" },
      }
    )
    expect(groups.map((group) => group.label)).toEqual([
      undefined,
      "Components",
    ])
    expect(groups[0]?.items).toEqual([
      { id: "overview", label: "Overview", href: "/", icon: "home" },
    ])
    expect(
      groups[1]?.items.map((item) => [
        item.label,
        item.icon,
        item.badge,
        item.children?.map((child) => child.href),
      ])
    ).toEqual([
      ["Basics", "box", 1, ["/components/button"]],
      [
        "Overlays & Menus",
        "layers",
        2,
        ["/components/dialog", "/components/tooltip"],
      ],
    ])
  })
})
