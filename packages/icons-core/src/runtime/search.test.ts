import { describe, expect, it } from "vitest"

import { searchCatalog } from "./search"
import type { CatalogEntry } from "./types"

const entries: CatalogEntry[] = [
  {
    name: "house",
    set: "outline",
    aliases: ["home"],
    categories: ["buildings"],
    tags: ["living"],
  },
  {
    name: "x",
    set: "outline",
    aliases: [],
    categories: ["math"],
    tags: ["close", "cancel"],
  },
  {
    name: "x",
    set: "brands",
    title: "X",
    group: "Social",
    aliases: [],
    tags: ["twitter", "social"],
    hex: "#000000",
    source: "Simple Icons",
    license: "CC0-1.0",
  },
  {
    name: "google-calendar",
    set: "brands",
    title: "Google Calendar",
    group: "Marketing & commerce",
    aliases: ["googlecalendar"],
    tags: ["gcal"],
    hex: "#4285F4",
    source: "Simple Icons",
    license: "CC0-1.0",
  },
]

describe("searchCatalog", () => {
  it("returns the whole set for an empty query", () => {
    expect(searchCatalog(entries, "", { set: "brands" })).toHaveLength(2)
  })

  it("finds a platform by its former name", () => {
    expect(searchCatalog(entries, "twitter").map((entry) => entry.set)).toEqual(
      ["brands"]
    )
  })

  it("finds by alias, ignoring case and punctuation", () => {
    expect(searchCatalog(entries, "G-Cal")[0]?.name).toBe("google-calendar")
    expect(searchCatalog(entries, "Home")[0]?.name).toBe("house")
  })

  it("keeps to one set when asked", () => {
    expect(searchCatalog(entries, "x", { set: "outline" })).toHaveLength(1)
  })
})
