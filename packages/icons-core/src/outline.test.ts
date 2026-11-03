import { describe, expect, it } from "vitest"

import { readLock } from "./lock"
import { loadOutlineIcons } from "./outline"

describe("loadOutlineIcons", () => {
  const icons = loadOutlineIcons()

  it("loads every vendored Lucide icon with its metadata", () => {
    expect(readLock().lucide?.tag).toBeDefined()
    expect(
      icons.filter((icon) => icon.origin === "lucide").length
    ).toBeGreaterThan(2000)
    const house = icons.find((icon) => icon.name === "house")
    expect(house?.aliases.map((alias) => alias.name)).toContain("home")
    expect(house?.categories).toContain("buildings")
  })

  it("returns icons sorted by name", () => {
    const names = icons.map((icon) => icon.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)))
  })
})
