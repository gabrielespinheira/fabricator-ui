import { describe, expect, it } from "vitest"

import { getAddCommand, groupBlocks } from "./blocks"

const block = (name: string, categories: string[]) => ({
  name,
  title: name,
  description: "",
  categories,
  route: "/",
})

describe("groupBlocks", () => {
  it("groups blocks by their first category, in the gallery's order, leaving App Shell starters out", () => {
    const groups = groupBlocks([
      block("app-shell-01", ["app-shell", "dashboard"]),
      block("finance-01", ["dashboard"]),
      block("sign-in-01", ["authentication"]),
      block("sign-up-01", ["authentication"]),
    ])

    expect(
      groups.map((group) => [group.id, group.blocks.map(({ name }) => name)])
    ).toEqual([
      ["authentication", ["sign-in-01", "sign-up-01"]],
      ["dashboard", ["finance-01"]],
    ])
  })

  it("leaves out categories with no blocks and blocks with no known category", () => {
    const groups = groupBlocks([block("odd-01", ["unknown"])])
    expect(groups).toEqual([])
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
