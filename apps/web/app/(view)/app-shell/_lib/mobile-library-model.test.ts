import { describe, expect, it } from "vitest"

import {
  BLOCKS_HREF,
  COMPONENTS_HREF,
  getBlockName,
  getComponentDocsUrl,
  getComponentInstallCommand,
  getComponentTitle,
  getDemoName,
  getExplorerComponents,
} from "../../../../../mobile/src/library/library-model"

describe("the React Native example's library paths", () => {
  it("finds the demo a path opens", () => {
    expect(getDemoName(`${COMPONENTS_HREF}/avatar`)).toBe("avatar")
  })

  it("has no demo on the list or anywhere else", () => {
    expect(getDemoName(COMPONENTS_HREF)).toBeNull()
    expect(getDemoName("/")).toBeNull()
    expect(getDemoName("/components-extra/avatar")).toBeNull()
  })

  it("finds the block a path opens", () => {
    expect(getBlockName(`${BLOCKS_HREF}/login-01`)).toBe("login-01")
    expect(getBlockName(BLOCKS_HREF)).toBeNull()
  })
})

describe("the React Native example's component titles", () => {
  it("titles a component from its name", () => {
    expect(getComponentTitle("dropdown-menu")).toBe("Dropdown Menu")
    expect(getComponentTitle("input-otp")).toBe("Input OTP")
  })

  it("uses the registry's title where it says more", () => {
    expect(getComponentTitle("editor")).toBe("Rich Text Editor")
  })
})

describe("the React Native example's explorer", () => {
  it("lists each demo under its title and the website's group", () => {
    expect(getExplorerComponents(["editor", "text"])).toEqual([
      { slug: "editor", title: "Rich Text Editor", group: "Forms" },
      { slug: "text", title: "Text", group: "Basics" },
    ])
  })
})

describe("the React Native example's details panel", () => {
  it("installs a component with the CLI", () => {
    expect(getComponentInstallCommand("button")).toBe(
      "npx fabricator-ui@latest add button"
    )
  })

  it("links to the component's React Native docs", () => {
    expect(getComponentDocsUrl("dropdown-menu")).toBe(
      "https://fabricator-ui.vercel.app/docs/components/native/dropdown-menu"
    )
  })
})
