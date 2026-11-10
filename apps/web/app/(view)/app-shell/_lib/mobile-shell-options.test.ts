import { describe, expect, it } from "vitest"

import { getShellOptionSections } from "@/registry/fabricator/app-shell-options"

import {
  buildInstallCommand,
  countChangedOptions,
  getDefaultShellOptions,
  getNativeHiddenOptions,
  getOptionNotes,
  getTabBarStyleChoices,
  NATIVE_HIDDEN_OPTIONS,
  NATIVE_PROJECT,
  type ShellOptions,
} from "../../../../../mobile/src/shell-options-model"
import { DEFAULT_EXPLORER_OPTIONS } from "../../desktop/_lib/explorer-options"
import { parseAppShellParams } from "./app-shell-source"

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
        { ...defaults, tabs: "none", customize: true },
        defaults
      )
    ).toBe(2)
  })

  it("starts from the desktop example's shell, with a tab bar", () => {
    expect(getDefaultShellOptions({ hasGlass: true })).toEqual({
      ...DEFAULT_EXPLORER_OPTIONS,
      bottomNav: true,
      bottomNavStyle: "glass",
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

  it("offers a tablet everything it can draw", () => {
    expect(getNativeHiddenOptions({ isPhone: false })).toEqual(
      NATIVE_HIDDEN_OPTIONS
    )
  })

  it("leaves out header actions on a phone, where this example has none", () => {
    expect(getNativeHiddenOptions({ isPhone: true }).has("actions")).toBe(true)
    expect(getNativeHiddenOptions({ isPhone: false }).has("actions")).toBe(
      false
    )
  })

  it("explains what this build can't draw", () => {
    expect(getOptionNotes({ hasGlass: true })).toEqual({})
    expect(getOptionNotes({ hasGlass: false })).toEqual({
      bottomNavStyle: expect.stringContaining("Glass"),
    })
  })
})
