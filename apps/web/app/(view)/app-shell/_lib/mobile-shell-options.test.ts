import { describe, expect, it } from "vitest"

import { getShellOptionSections } from "@/registry/fabricator/app-shell-options"

import {
  buildInstallCommand,
  countChangedOptions,
  getDefaultShellOptions,
  getOptionNotes,
  getTabBarStyleChoices,
  getUnseenSection,
  NATIVE_HIDDEN_OPTIONS,
  NATIVE_PROJECT,
  type ShellOptions,
} from "../../../../../mobile/src/shell-options-model"
import { parseAppShellParams } from "./app-shell-source"
import { DEFAULT_PLAYGROUND_OPTIONS } from "./options"

const defaults = getDefaultShellOptions({ hasGlass: true })

function parseCommand(options: ShellOptions) {
  const url = buildInstallCommand(options).match(/"(.+)"/)?.[1]
  if (!url) throw new Error("The command has no URL")
  return new URL(url).searchParams
}

describe("the React Native App Shell card", () => {
  it("starts on Liquid Glass where it can be drawn, and flat where it can't", () => {
    expect(defaults.bottomNavStyle).toBe("glass")
    expect(getDefaultShellOptions({ hasGlass: false }).bottomNavStyle).toBe(
      "flat"
    )
  })

  it("always offers Glass, disabled when it can't be drawn", () => {
    expect(getTabBarStyleChoices({ hasGlass: true })).toEqual([
      { value: "flat", label: "Flat", disabled: false },
      { value: "glass", label: "Glass", disabled: false },
      { value: "floating", label: "Floating", disabled: false },
    ])
    expect(getTabBarStyleChoices({ hasGlass: false })[1]).toEqual({
      value: "glass",
      label: "Glass",
      disabled: true,
    })
  })

  it("counts what differs from the defaults", () => {
    expect(countChangedOptions(defaults, defaults)).toBe(0)
    expect(
      countChangedOptions(
        { ...defaults, tabs: "main", customize: true },
        defaults
      )
    ).toBe(2)
  })

  it("starts from the website's defaults, with a tab bar", () => {
    expect(getDefaultShellOptions({ hasGlass: false })).toEqual({
      ...DEFAULT_PLAYGROUND_OPTIONS,
      bottomNav: true,
    })
  })

  it("lays out what a React Native project can honour, phones first", () => {
    const sections = getShellOptionSections({
      options: defaults,
      project: NATIVE_PROJECT,
      hidden: NATIVE_HIDDEN_OPTIONS,
    })
    expect(sections.map(({ title }) => title)).toEqual([
      "All platforms",
      "Phones",
      "Tablets",
    ])
    const keys = sections.flatMap(({ groups }) =>
      groups.flatMap(({ rows }) => rows.map(({ key }) => key))
    )
    for (const missing of ["peek", "window", "fullscreen", "glass"] as const) {
      expect(keys).not.toContain(missing)
    }
  })

  it("marks the section this device can't show", () => {
    expect(getUnseenSection({ isPhone: true })).toBe("desktop")
    expect(getUnseenSection({ isPhone: false })).toBe("mobile")
  })

  it("explains what this device or build can't draw", () => {
    expect(getOptionNotes({ isPhone: true, hasGlass: true })).toEqual({
      actions: expect.stringContaining("tablets"),
    })
    expect(getOptionNotes({ isPhone: false, hasGlass: true })).toEqual({})
    expect(getOptionNotes({ isPhone: false, hasGlass: false })).toEqual({
      bottomNavStyle: expect.stringContaining("Glass"),
    })
  })
})

describe("the card's install command", () => {
  it("asks for the React Native version with `app-shell` named", () => {
    const command = buildInstallCommand(defaults)
    expect(command).toContain("npx fabricator-ui@latest add app-shell")
    expect(parseCommand(defaults).get("platform")).toBe("native")
  })

  it("carries only what differs from the website's defaults", () => {
    const params = parseCommand(defaults)
    expect([...params.keys()].sort()).toEqual([
      "bottomNav",
      "bottomNavStyle",
      "platform",
    ])
  })

  it("leaves out what a switched-off part would ignore", () => {
    const params = parseCommand({
      ...defaults,
      bottomNav: false,
      bottomNavStyle: "floating",
      panel: false,
      panelMobile: "swap",
    })
    expect(params.has("bottomNavStyle")).toBe(false)
    expect(params.has("panelMobile")).toBe(false)
  })

  it("is read back by the endpoint as the same choices", () => {
    const options: ShellOptions = {
      ...defaults,
      variant: "floating",
      collapse: "offcanvas",
      mobileSidebar: "sheet",
      switcher: "command",
      account: "header",
      reorder: false,
      customize: true,
      tabs: "main",
      contentSize: "lg",
      breadcrumb: false,
      actions: false,
      status: false,
      bottomNavStyle: "floating",
      panelMobile: "swap",
    }
    expect(parseAppShellParams(parseCommand(options))).toMatchObject(options)
    expect(parseAppShellParams(parseCommand(defaults))).toMatchObject(defaults)
  })
})
