import { describe, expect, it } from "vitest"

import {
  ALL_BLOCKS,
  filterBlocks,
  getAddCommand,
  getBlockFilters,
  getBlockNeighbours,
  getBlockSummary,
  getComponentLinks,
  getHashHref,
  isBlockFilter,
  orderBlocks,
} from "./blocks"

const block = (name: string, categories: string[]) => ({ name, categories })

const BLOCKS = [
  block("sign-in-01", ["authentication"]),
  block("finance-01", ["dashboard"]),
  block("settings-01", ["settings"]),
  block("mail-01", ["mail"]),
  block("sign-up-01", ["authentication"]),
  block("assistant-01", ["chat"]),
]

const namesOf = (blocks: ReadonlyArray<{ name: string }>) =>
  blocks.map(({ name }) => name)

describe("orderBlocks", () => {
  it("puts blocks in the gallery's order of categories, keeping theirs within one", () => {
    expect(namesOf(orderBlocks(BLOCKS))).toEqual([
      "finance-01",
      "assistant-01",
      "mail-01",
      "settings-01",
      "sign-in-01",
      "sign-up-01",
    ])
  })

  it("goes by the first category, leaving out App Shell starters and unknown ones", () => {
    const ordered = orderBlocks([
      block("app-shell-01", ["app-shell", "dashboard"]),
      block("odd-01", ["unknown"]),
      block("none-01", []),
      block("finance-01", ["dashboard"]),
    ])
    expect(namesOf(ordered)).toEqual(["finance-01"])
  })
})

describe("getBlockFilters", () => {
  it("offers everything, then each category that has a block", () => {
    expect(getBlockFilters(BLOCKS)).toEqual([
      { id: "all", title: "All" },
      { id: "dashboard", title: "Dashboards" },
      { id: "chat", title: "Chat" },
      { id: "mail", title: "Email" },
      { id: "settings", title: "Settings and team" },
      { id: "authentication", title: "Authentication" },
    ])
  })
})

describe("isBlockFilter", () => {
  it("knows the categories and the filter for all of them", () => {
    expect(isBlockFilter(ALL_BLOCKS)).toBe(true)
    expect(isBlockFilter("onboarding")).toBe(true)
    expect(isBlockFilter("app-shell")).toBe(false)
    expect(isBlockFilter(null)).toBe(false)
  })
})

describe("filterBlocks", () => {
  it("keeps one category, or all of them", () => {
    expect(namesOf(filterBlocks(BLOCKS, "authentication"))).toEqual([
      "sign-in-01",
      "sign-up-01",
    ])
    expect(filterBlocks(BLOCKS, ALL_BLOCKS)).toEqual(BLOCKS)
  })
})

describe("getHashHref", () => {
  it("sends an old block link to the block's page", () => {
    expect(getHashHref("#finance-01", BLOCKS)).toBe("/blocks/finance-01")
  })

  it("sends an old category link to its filter", () => {
    expect(getHashHref("#authentication", BLOCKS)).toBe(
      "/blocks?category=authentication"
    )
  })

  it("leaves every other hash alone", () => {
    expect(getHashHref("", BLOCKS)).toBeNull()
    expect(getHashHref("#", BLOCKS)).toBeNull()
    expect(getHashHref("#app-shell-01", BLOCKS)).toBeNull()
    expect(getHashHref("#all", BLOCKS)).toBeNull()
    expect(getHashHref("#../docs", BLOCKS)).toBeNull()
  })
})

describe("getBlockNeighbours", () => {
  it("gives the blocks before and after, with nothing past either end", () => {
    const [signIn, finance, settings] = BLOCKS
    expect(getBlockNeighbours(BLOCKS, "finance-01")).toEqual({
      previous: signIn,
      next: settings,
    })
    expect(getBlockNeighbours(BLOCKS, "sign-in-01")).toEqual({
      previous: null,
      next: finance,
    })
    expect(getBlockNeighbours(BLOCKS, "assistant-01").next).toBeNull()
  })

  it("has none for an unknown block", () => {
    expect(getBlockNeighbours(BLOCKS, "odd-01")).toEqual({
      previous: null,
      next: null,
    })
  })
})

describe("getComponentLinks", () => {
  const titles: Record<string, string> = {
    button: "Button",
    "app-shell": "App Shell",
    card: "Card",
  }
  const getTitle = (slug: string) => titles[slug]

  it("links the dependencies that have a docs page, by title", () => {
    expect(
      getComponentLinks(
        ["card", "fluid-hover", "button", "app-shell"],
        getTitle
      )
    ).toEqual([
      { title: "App Shell", href: "/docs/components/base/app-shell" },
      { title: "Button", href: "/docs/components/base/button" },
      { title: "Card", href: "/docs/components/base/card" },
    ])
  })

  it("lists a component once", () => {
    expect(getComponentLinks(["card", "card"], getTitle)).toHaveLength(1)
  })
})

describe("getBlockSummary", () => {
  it("says in one line what a block on the gallery is for", () => {
    expect(getBlockSummary("finance-01", "Anything.")).toBe(
      "Cash, runway and the payments waiting for approval."
    )
  })

  it("falls back to the opening of a new block's description", () => {
    expect(
      getBlockSummary("new-01", "A help desk: tickets, replies and macros.")
    ).toBe("A help desk.")
    expect(getBlockSummary("new-01", "A help desk.")).toBe("A help desk.")
  })
})

describe("getAddCommand", () => {
  it("runs the CLI with the reader's package manager", () => {
    expect(getAddCommand("npm", "sign-in-01")).toBe(
      "npx fabricator-ui@latest add sign-in-01"
    )
    expect(getAddCommand("bun", "sign-in-01")).toBe(
      "bunx --bun fabricator-ui@latest add sign-in-01"
    )
    expect(getAddCommand("pnpm", "sign-in-01")).toBe(
      "pnpm dlx fabricator-ui@latest add sign-in-01"
    )
    expect(getAddCommand("yarn", "sign-in-01")).toBe(
      "yarn dlx fabricator-ui@latest add sign-in-01"
    )
  })
})
