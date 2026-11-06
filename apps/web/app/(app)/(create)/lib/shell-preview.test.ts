import { describe, expect, it } from "vitest"

import { DEFAULT_PLAYGROUND_OPTIONS } from "@/app/(view)/app-shell/_lib/options"

import {
  createShellOptionsMessage,
  getPreviewLayout,
  getShellPreviewQuery,
  isShellPreviewReady,
  loadShellPreviewOptions as loadWithRuntime,
  readShellOptionsMessage,
  SHELL_PREVIEW_READY,
} from "./shell-preview"

/** The options alone; the runtime has its own test. */
function loadShellPreviewOptions(query: string) {
  const {
    desktop: _desktop,
    nativeTabBar: _nativeTabBar,
    ...options
  } = loadWithRuntime(query)
  return options
}

describe("the preview's address", () => {
  it("carries the desktop runtime", () => {
    const query = getShellPreviewQuery(DEFAULT_PLAYGROUND_OPTIONS, "tauri")
    expect(query).toBe("?desktop=tauri")
    expect(loadWithRuntime(query).desktop).toBe("tauri")
  })

  it("says when the tab bar stands for a React Native app's", () => {
    const query = getShellPreviewQuery(DEFAULT_PLAYGROUND_OPTIONS, null, true)
    expect(query).toBe("?nativeTabBar=true")
    expect(loadWithRuntime(query).nativeTabBar).toBe(true)
    expect(loadWithRuntime("").nativeTabBar).toBe(false)
  })

  it("is empty for the default options", () => {
    expect(getShellPreviewQuery(DEFAULT_PLAYGROUND_OPTIONS)).toBe("")
  })

  it("holds only what differs", () => {
    expect(
      getShellPreviewQuery({
        ...DEFAULT_PLAYGROUND_OPTIONS,
        variant: "floating",
        panel: false,
      })
    ).toBe("?variant=floating&panel=false")
  })

  it("reads back what it writes", () => {
    const options = {
      ...DEFAULT_PLAYGROUND_OPTIONS,
      collapse: "offcanvas" as const,
      tabs: "titlebar" as const,
    }
    expect(loadShellPreviewOptions(getShellPreviewQuery(options))).toEqual(
      options
    )
  })

  it("keeps the default for a value it doesn't know", () => {
    expect(loadShellPreviewOptions("?variant=square")).toEqual(
      DEFAULT_PLAYGROUND_OPTIONS
    )
  })
})

describe("the messages between the page and the preview", () => {
  it("carries the options as a query", () => {
    expect(
      readShellOptionsMessage(createShellOptionsMessage("?tabs=main"))
    ).toBe("?tabs=main")
  })

  it("carries the default options as an empty query", () => {
    expect(readShellOptionsMessage(createShellOptionsMessage(""))).toBe("")
  })

  it("ignores anything else that reaches the window", () => {
    expect(readShellOptionsMessage(null)).toBeNull()
    expect(readShellOptionsMessage("?tabs=main")).toBeNull()
    expect(readShellOptionsMessage({ type: "other", query: "" })).toBeNull()
    expect(readShellOptionsMessage(SHELL_PREVIEW_READY)).toBeNull()
  })

  it("recognises the preview saying it is ready", () => {
    expect(isShellPreviewReady(SHELL_PREVIEW_READY)).toBe(true)
    expect(isShellPreviewReady(createShellOptionsMessage(""))).toBe(false)
    expect(isShellPreviewReady(undefined)).toBe(false)
  })
})

describe("getPreviewLayout", () => {
  const stage = { width: 825, height: 625 }

  it("fills the stage in a browser, at full size", () => {
    expect(getPreviewLayout("browser", stage)).toEqual({
      frame: stage,
      scale: 1,
    })
  })

  it("draws a window at a desktop's width, scaled to the stage", () => {
    const { frame, scale } = getPreviewLayout("macos", stage)
    expect(frame.width).toBe(1100)
    expect(frame.width * scale).toBeCloseTo(801)
    expect(frame.height * scale).toBeCloseTo(601)
    expect(getPreviewLayout("windows", stage)).toEqual({ frame, scale })
  })

  it("never scales a window past its real size", () => {
    expect(getPreviewLayout("macos", { width: 1500, height: 900 })).toEqual({
      frame: { width: 1476, height: 876 },
      scale: 1,
    })
  })

  it("keeps a device's real size and fits it in the stage", () => {
    const tablet = getPreviewLayout("tablet", stage)
    expect(tablet.frame).toEqual({ width: 1204, height: 844 })
    expect(tablet.frame.width * tablet.scale).toBeCloseTo(stage.width)

    const phone = getPreviewLayout("phone", stage)
    expect(phone.frame).toEqual({ width: 410, height: 864 })
    expect(phone.frame.height * phone.scale).toBeCloseTo(stage.height)
  })

  it("never enlarges a device", () => {
    expect(getPreviewLayout("phone", { width: 2000, height: 1400 }).scale).toBe(
      1
    )
  })

  it("stays at full size until the stage is measured", () => {
    expect(getPreviewLayout("tablet", { width: 0, height: 0 }).scale).toBe(1)
    expect(getPreviewLayout("macos", { width: 0, height: 0 }).scale).toBe(1)
  })
})
