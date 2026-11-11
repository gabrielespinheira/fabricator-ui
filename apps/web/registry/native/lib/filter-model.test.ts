import * as React from "react"
import { describe, expect, it, vi } from "vitest"

import {
  createCommandStore,
  filterItems,
  getChildrenText,
  getItemLabel,
  isItemSelected,
  matchesQuery,
  removeItem,
  scoreCommand,
  selectItem,
} from "@/registry/native/lib/filter-model"

describe("getItemLabel", () => {
  it("reads strings, numbers and objects the way Base UI does", () => {
    expect(getItemLabel("Remix")).toBe("Remix")
    expect(getItemLabel(3)).toBe("3")
    expect(getItemLabel({ label: "Brazil", value: "br" })).toBe("Brazil")
    expect(getItemLabel({ value: "br" })).toBe("br")
    expect(getItemLabel(null)).toBe("")
  })

  it("prefers the caller's function", () => {
    expect(
      getItemLabel({ name: "Paris" }, (item: { name: string }) => item.name)
    ).toBe("Paris")
  })
})

describe("matchesQuery", () => {
  it("ignores case, accents and surrounding space", () => {
    expect(matchesQuery("São Paulo", "sao")).toBe(true)
    expect(matchesQuery("Next.js", "  NEXT ")).toBe(true)
    expect(matchesQuery("Remix", "astro")).toBe(false)
  })

  it("matches everything for an empty query", () => {
    expect(matchesQuery("Remix", "")).toBe(true)
  })
})

describe("filterItems", () => {
  const frameworks = ["Next.js", "SvelteKit", "Nuxt.js"]

  it("filters a flat list and keeps its order", () => {
    expect(filterItems(frameworks, "t")).toEqual([
      "Next.js",
      "SvelteKit",
      "Nuxt.js",
    ])
    expect(filterItems(frameworks, "nu")).toEqual(["Nuxt.js"])
  })

  it("filters inside groups and drops empty ones", () => {
    const groups = [
      { value: "Americas", items: ["New York", "Toronto"] },
      { value: "Europe", items: ["Paris"] },
    ]
    expect(filterItems(groups, "paris")).toEqual([
      { value: "Europe", items: ["Paris"] },
    ])
  })

  it("uses the label for object items", () => {
    const items = [
      { value: "br", label: "Brazil" },
      { value: "fr", label: "France" },
    ]
    expect(filterItems(items, "fra")).toEqual([items[1]])
  })

  it("takes a custom filter, and null turns filtering off", () => {
    expect(
      filterItems(frameworks, "x", { filter: (item) => item === "SvelteKit" })
    ).toEqual(["SvelteKit"])
    expect(filterItems(frameworks, "x", { filter: null })).toEqual(frameworks)
  })
})

describe("selection", () => {
  it("replaces in single selection", () => {
    expect(selectItem(["a"], "b", { multiple: false })).toEqual(["b"])
  })

  it("toggles in multiple selection", () => {
    expect(selectItem(["a"], "b", { multiple: true })).toEqual(["a", "b"])
    expect(selectItem(["a", "b"], "a", { multiple: true })).toEqual(["b"])
  })

  it("compares with the caller's equality", () => {
    const isEqual = (a: { id: number }, b: { id: number }) => a.id === b.id
    expect(isItemSelected([{ id: 1 }], { id: 1 }, isEqual)).toBe(true)
    expect(isItemSelected([{ id: 1 }], { id: 2 }, isEqual)).toBe(false)
    expect(removeItem([{ id: 1 }, { id: 2 }], { id: 1 }, isEqual)).toEqual([
      { id: 2 },
    ])
  })
})

describe("scoreCommand", () => {
  it("ranks exact over prefix over word start over contains over fuzzy", () => {
    const exact = scoreCommand("calendar", "calendar")
    const prefix = scoreCommand("calendar view", "cal")
    const word = scoreCommand("my calendar", "cal")
    const contains = scoreCommand("recall", "cal")
    const fuzzy = scoreCommand("create label", "cel")
    expect(exact).toBeGreaterThan(prefix)
    expect(prefix).toBeGreaterThan(word)
    expect(word).toBeGreaterThan(contains)
    expect(contains).toBeGreaterThan(fuzzy)
    expect(fuzzy).toBeGreaterThan(0)
  })

  it("is zero without a match", () => {
    expect(scoreCommand("calendar", "xyz")).toBe(0)
  })

  it("scores keywords below the value", () => {
    const keyword = scoreCommand("Profile", "account", ["account"])
    expect(keyword).toBeGreaterThan(0)
    expect(keyword).toBeLessThan(scoreCommand("account", "account"))
  })

  it("matches everything for an empty query", () => {
    expect(scoreCommand("anything", "")).toBe(1)
  })
})

describe("getChildrenText", () => {
  it("collects text through nested elements", () => {
    const children = [
      React.createElement("icon"),
      React.createElement("span", null, "Calendar ", 3),
    ]
    expect(getChildrenText(children)).toBe("Calendar 3")
  })
})

describe("createCommandStore", () => {
  it("replaces an entry atomically and ignores its old cleanup", () => {
    const store = createCommandStore()
    const removeOld = store.register({
      id: "a",
      value: "Alpha",
      groupId: "old",
    })
    const counts: number[] = []
    store.subscribe(() => counts.push(store.getSnapshot().count))
    store.register({ id: "a", value: "Beta", groupId: "new" })
    removeOld()
    expect(counts).toEqual([1])
    expect(store.getSnapshot().groupCounts.get("old")).toBeUndefined()
    expect(store.getSnapshot().groupCounts.get("new")).toBe(1)
  })

  it("scores only the changed registration while searching", () => {
    const store = createCommandStore()
    const filter = vi.fn(() => 1)
    store.configure({ filter })
    store.setQuery("a")
    const unregister = Array.from({ length: 100 }, (_, index) =>
      store.register({
        id: String(index),
        value: `Action ${index}`,
        groupId: "a",
      })
    )
    expect(store.getSnapshot().count).toBe(100)
    for (let index = 0; index < 100; index += 1) {
      expect(store.isItemVisible(String(index))).toBe(true)
    }
    expect(filter).toHaveBeenCalledTimes(100)
    filter.mockClear()
    unregister.forEach((remove) => remove())
    expect(store.getSnapshot().count).toBe(0)
    expect(filter).not.toHaveBeenCalled()
  })

  it("notifies when a new filter swaps matches with the same counts", () => {
    const store = createCommandStore()
    store.register({ id: "a", value: "Alpha", groupId: "group" })
    store.register({ id: "b", value: "Beta", groupId: "group" })
    store.setQuery("search")
    store.configure({ filter: (value) => Number(value === "Alpha") })
    const previous = store.getSnapshot()
    const listener = vi.fn()
    store.subscribe(listener)
    store.configure({ filter: (value) => Number(value === "Beta") })
    expect(store.getSnapshot().count).toBe(1)
    expect(store.getSnapshot().groupCounts.get("group")).toBe(1)
    expect(store.isItemVisible("a")).toBe(false)
    expect(store.isItemVisible("b")).toBe(true)
    expect(store.getSnapshot()).not.toBe(previous)
    expect(listener).toHaveBeenCalledOnce()
  })

  it("restores the default filter when a custom filter is removed", () => {
    const store = createCommandStore()
    store.register({ id: "a", value: "Alpha" })
    store.configure({ filter: () => 0 })
    store.setQuery("alpha")
    expect(store.getSnapshot().count).toBe(0)
    store.configure({ filter: undefined })
    expect(store.getSnapshot().count).toBe(1)
  })

  it("keeps old snapshots unchanged when entries mount or unmount", () => {
    const store = createCommandStore()
    const remove = store.register({ id: "a", value: "Alpha", groupId: "group" })
    const previous = store.getSnapshot()
    store.register({ id: "b", value: "Beta", groupId: "group" })
    remove()
    expect(previous.count).toBe(1)
    expect(previous.groupCounts.get("group")).toBe(1)
  })

  it("counts the items a query keeps, overall and per group", () => {
    const store = createCommandStore()
    store.register({ id: "1", value: "Calendar", groupId: "a" })
    store.register({ id: "2", value: "Calculator", groupId: "a" })
    store.register({ id: "3", value: "Profile", groupId: "b" })
    expect(store.getSnapshot().count).toBe(3)

    store.setQuery("calc")
    expect(store.getSnapshot()).toMatchObject({ query: "calc", count: 1 })
    expect(store.getSnapshot().groupCounts.get("a")).toBe(1)
    expect(store.getSnapshot().groupCounts.get("b") ?? 0).toBe(0)
  })

  it("forgets an item when it unregisters", () => {
    const store = createCommandStore()
    const unregister = store.register({ id: "1", value: "Calendar" })
    unregister()
    expect(store.getSnapshot().count).toBe(0)
  })

  it("keeps the snapshot identity until something changes", () => {
    const store = createCommandStore()
    const first = store.getSnapshot()
    expect(store.getSnapshot()).toBe(first)
    store.setQuery("")
    expect(store.getSnapshot()).toBe(first)
    store.setQuery("a")
    expect(store.getSnapshot()).not.toBe(first)
  })

  it("notifies subscribers and stops after unsubscribing", () => {
    const store = createCommandStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.setQuery("a")
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.setQuery("b")
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("counts every item when filtering is off", () => {
    const store = createCommandStore()
    store.register({ id: "1", value: "Calendar" })
    store.configure({ shouldFilter: false })
    store.setQuery("zzz")
    expect(store.getSnapshot().count).toBe(1)
    expect(store.isVisible("Calendar")).toBe(true)
  })

  it("takes a custom filter", () => {
    const store = createCommandStore()
    store.register({ id: "1", value: "Calendar" })
    store.configure({ filter: (value) => (value === "Calendar" ? 0 : 1) })
    store.setQuery("cal")
    expect(store.getSnapshot().count).toBe(0)
  })
})
