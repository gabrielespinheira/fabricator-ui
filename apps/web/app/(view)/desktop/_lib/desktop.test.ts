import { describe, expect, it, vi } from "vitest"

import {
  getAppearanceSetter,
  getDesktopWindow,
  getPlatform,
  getTrafficLightsSetter,
  isFullscreenWindow,
  readDesktopRuntime,
  withGlass,
} from "./desktop"

describe("getAppearanceSetter", () => {
  it("sends the page theme to the Electron window", () => {
    const themes: string[] = []
    const setAppearance = getAppearanceSetter({
      fabricatorDesktop: {
        setAppearance: (theme: string) => themes.push(theme),
      },
    })

    setAppearance?.("dark")

    expect(themes).toEqual(["dark"])
  })

  it("sends light and dark to the Tauri window", async () => {
    const calls: unknown[] = []
    const setAppearance = getAppearanceSetter({
      __TAURI_INTERNALS__: {
        invoke(command: string, args: unknown) {
          calls.push([command, args])
          return Promise.resolve()
        },
      },
    })

    await setAppearance?.("dark")
    await setAppearance?.("light")

    expect(calls).toEqual([
      ["plugin:window|set_theme", { value: "dark" }],
      ["plugin:window|set_theme", { value: "light" }],
    ])
  })

  it("leaves appearance to the browser when there is no native bridge", () => {
    expect(getAppearanceSetter({})).toBeNull()
  })
})

describe("withGlass", () => {
  const glassWindow = { controls: "macos", isTranslucent: true } as const

  it("keeps the window's glass when asked", () => {
    expect(withGlass(glassWindow, true)?.isTranslucent).toBe(true)
  })

  it("paints the frame opaque when not", () => {
    expect(withGlass(glassWindow, false)?.isTranslucent).toBe(false)
  })

  it("leaves a browser without a window", () => {
    expect(withGlass(undefined, true)).toBeUndefined()
  })
})

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
  it("keeps desktop controls and theme IPC out of the Tauri mobile host", () => {
    const invoke = vi.fn()
    const host = {
      __TAURI_INTERNALS__: {
        metadata: { currentWindow: { label: "mobile" } },
        invoke,
      },
    }
    expect(
      readDesktopRuntime(host, "Mozilla/5.0 (Macintosh; Intel Mac OS X)")
        .runtime
    ).toBe("browser")
    expect(getAppearanceSetter(host)).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })
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
        hasTitlebar: false,
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
        hasTitlebar: false,
      })
    ).toEqual(expected)
    expect(
      getDesktopWindow({
        runtime: "tauri",
        platform: "mac",
        isFullscreen: true,
        hasTitlebar: false,
      })
    ).toEqual(expected)
  })

  it("centres Electron's lights in a titlebar row", () => {
    expect(
      getDesktopWindow({
        runtime: "electron",
        platform: "mac",
        isFullscreen: false,
        hasTitlebar: true,
      })?.trafficLights
    ).toEqual({ x: 16, y: 13 })
  })

  it("keeps Tauri's lights where the window was created with them", () => {
    expect(
      getDesktopWindow({
        runtime: "tauri",
        platform: "mac",
        isFullscreen: false,
        hasTitlebar: true,
      })?.trafficLights
    ).toEqual({ x: 16, y: 23 })
  })

  it("clears Electron's window buttons on Windows and Linux", () => {
    expect(
      getDesktopWindow({
        runtime: "electron",
        platform: "linux",
        isFullscreen: false,
        hasTitlebar: false,
      })
    ).toEqual({ controls: "overlay", isFullscreen: false })
  })

  it("leaves Tauri's native title bar alone off macOS", () => {
    expect(
      getDesktopWindow({
        runtime: "tauri",
        platform: "windows",
        isFullscreen: false,
        hasTitlebar: false,
      })
    ).toBeUndefined()
  })
})

describe("getTrafficLightsSetter", () => {
  it("moves the lights through the Electron bridge", () => {
    const moved: unknown[] = []
    const setter = getTrafficLightsSetter({
      fabricatorDesktop: {
        setTrafficLights: (position: unknown) => moved.push(position),
      },
    })
    setter?.({ x: 16, y: 13 })
    expect(moved).toEqual([{ x: 16, y: 13 }])
  })

  it("has nothing to call without the bridge", () => {
    expect(getTrafficLightsSetter({})).toBeNull()
    expect(getTrafficLightsSetter({ fabricatorDesktop: {} })).toBeNull()
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
