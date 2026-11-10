import { createLoader } from "nuqs"
import { describe, expect, it } from "vitest"

import { countChangedOptions } from "../../app-shell/_lib/options"
import {
  DEFAULT_EXPLORER_OPTIONS,
  explorerParsers,
  getHiddenExplorerOptions,
} from "./explorer-options"

const load = (query: string) =>
  createLoader(explorerParsers)(new URLSearchParams(query))

describe("explorer options", () => {
  it("starts from the window the explorer has always been", () => {
    expect(DEFAULT_EXPLORER_OPTIONS).toMatchObject({
      variant: "inset",
      collapse: "offcanvas",
      switcher: "none",
      account: "none",
      reorder: false,
      breadcrumb: false,
      actions: false,
      tabs: "main",
      panel: true,
      status: true,
      bottomNav: true,
    })
    expect(
      countChangedOptions(DEFAULT_EXPLORER_OPTIONS, DEFAULT_EXPLORER_OPTIONS)
    ).toBe(0)
  })

  it("reads changes from the URL", () => {
    expect(load("variant=floating&breadcrumb=true")).toMatchObject({
      variant: "floating",
      breadcrumb: true,
    })
  })

  it("hides runtime choices and native bottom navigation materials", () => {
    const hidden = getHiddenExplorerOptions({ hasGlass: true })
    expect([...hidden].sort()).toEqual([
      "bottomNavStyle",
      "fullscreen",
      "window",
    ])
  })

  it("hides glass where the window has none", () => {
    expect(getHiddenExplorerOptions({ hasGlass: false }).has("glass")).toBe(
      true
    )
  })
})
