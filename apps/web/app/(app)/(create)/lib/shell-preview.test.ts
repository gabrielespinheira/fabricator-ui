import { describe, expect, it } from "vitest"

import { DEFAULT_PLAYGROUND_OPTIONS } from "@/app/(view)/app-shell/_lib/options"

import {
  createShellOptionsMessage,
  getShellPreviewQuery,
  isShellPreviewReady,
  loadShellPreviewOptions as loadWithRuntime,
  readShellOptionsMessage,
  SHELL_PREVIEW_READY,
} from "./shell-preview"

/** The options alone; the runtime has its own test. */
function loadShellPreviewOptions(query: string) {
  const { desktop: _desktop, ...options } = loadWithRuntime(query)
  return options
}

describe("the preview's address", () => {
  it("carries the desktop runtime", () => {
    const query = getShellPreviewQuery(DEFAULT_PLAYGROUND_OPTIONS, "tauri")
    expect(query).toBe("?desktop=tauri")
    expect(loadWithRuntime(query).desktop).toBe("tauri")
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
