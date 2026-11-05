import { describe, expect, it } from "vitest"

import {
  buildInstallCommand,
  countChangedOptions,
  getDefaultShellOptions,
  getOptionNotes,
  getTabBarStyleChoices,
  type ShellOptions,
} from "../../../../../mobile/src/shell-options-model"
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
      { value: "flat", label: "Flat" },
      { value: "glass", label: "Glass", disabled: false },
      { value: "floating", label: "Floating" },
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

  it("says where a row applies, by the kind of device", () => {
    expect(Object.keys(getOptionNotes({ isPhone: true })).sort()).toEqual([
      "actions",
      "collapse",
      "contentSize",
      "status",
      "variant",
    ])
    expect(Object.keys(getOptionNotes({ isPhone: false })).sort()).toEqual([
      "bottomNav",
      "bottomNavStyle",
      "mobileSidebar",
      "panelMobile",
    ])
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
