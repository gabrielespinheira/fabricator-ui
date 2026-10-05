import { describe, expect, it } from "vitest"

import {
  isBareName,
  rewriteNames,
  toAbsoluteAddresses,
  toFabricatorAddress,
  usesFabricator,
} from "./names"

describe("isBareName", () => {
  it.each(["button", "dropdown-menu", "login-01", "use-mobile"])(
    "treats %s as bare",
    (name) => {
      expect(isBareName(name)).toBe(true)
    }
  )

  it.each([
    "@shadcn/button",
    "@fabricator/button",
    "@acme/thing",
    "owner/repo/item",
    "https://example.com/r/button.json",
    "http://localhost:4000/r/x.json",
    "./local.json",
    "../registry/item.json",
    "item.json",
    "C:\\items\\x.json",
    "",
  ])("leaves %s alone", (value) => {
    expect(isBareName(value)).toBe(false)
  })
})

describe("rewriteNames", () => {
  it("prefixes bare names with @fabricator and keeps everything else", () => {
    expect(
      rewriteNames([
        "button",
        "@shadcn/card",
        "owner/repo/item",
        "https://x.dev/r/a.json",
        "./local.json",
      ])
    ).toEqual([
      "@fabricator/button",
      "@shadcn/card",
      "owner/repo/item",
      "https://x.dev/r/a.json",
      "./local.json",
    ])
  })

  it("keeps bare names upstream with --shadcn", () => {
    expect(
      rewriteNames(["button", "@fabricator/card"], { upstream: true })
    ).toEqual(["button", "@fabricator/card"])
    expect(toFabricatorAddress("button", { upstream: true })).toBe("button")
  })
})

describe("toAbsoluteAddresses", () => {
  it("turns @fabricator addresses into item URLs", () => {
    expect(
      toAbsoluteAddresses(
        ["@fabricator/button", "@shadcn/card"],
        "http://localhost:4000",
        "radix-vega"
      )
    ).toEqual([
      "http://localhost:4000/r/fabricator/radix-vega/button.json",
      "@shadcn/card",
    ])
  })
})

describe("usesFabricator", () => {
  it("detects @fabricator addresses", () => {
    expect(usesFabricator(["@shadcn/card", "@fabricator/button"])).toBe(true)
    expect(usesFabricator(["@shadcn/card", "button"])).toBe(false)
  })
})
