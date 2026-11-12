import { describe, expect, it } from "vitest"

import {
  getChipShift,
  getMultiSelectItemKey,
  getMultiSelectItemLabel,
  getTransitionTime,
  parseTranslate,
  reconcileChips,
  removeExitedChip,
  type ChipPresence,
} from "./multi-select-model"

const key = (item: string) => item

function present(...items: string[]): readonly ChipPresence<string>[] {
  return items.map((item) => ({ key: item, item, isExiting: false }))
}

function summarize(chips: readonly ChipPresence<string>[]) {
  return chips.map((chip) => (chip.isExiting ? `-${chip.key}` : chip.key))
}

describe("reconcileChips", () => {
  it("shows every selected item in order on first render", () => {
    expect(summarize(reconcileChips([], ["a", "b"], key))).toEqual(["a", "b"])
  })

  it("appends a newly selected item", () => {
    expect(summarize(reconcileChips(present("a"), ["a", "b"], key))).toEqual([
      "a",
      "b",
    ])
  })

  it("keeps a removed item in its place while it leaves", () => {
    expect(
      summarize(reconcileChips(present("a", "b", "c"), ["a", "c"], key))
    ).toEqual(["a", "-b", "c"])
  })

  it("keeps the removed item's last value", () => {
    const [, removed] = reconcileChips(present("a", "b"), ["a"], key)
    expect(removed).toEqual({ key: "b", item: "b", isExiting: true })
  })

  it("keeps an item that is still leaving when another one leaves", () => {
    const leaving = reconcileChips(present("a", "b", "c"), ["a", "c"], key)
    expect(summarize(reconcileChips(leaving, ["c"], key))).toEqual([
      "-a",
      "-b",
      "c",
    ])
  })

  it("brings back an item selected again while it was leaving", () => {
    const leaving = reconcileChips(present("a", "b"), ["a"], key)
    expect(summarize(reconcileChips(leaving, ["a", "b"], key))).toEqual([
      "a",
      "b",
    ])
  })

  it("follows a new selection order", () => {
    expect(
      summarize(reconcileChips(present("a", "b", "c"), ["c", "a"], key))
    ).toEqual(["c", "a", "-b"])
  })

  it("leaves every chip when the selection is cleared", () => {
    expect(summarize(reconcileChips(present("a", "b"), [], key))).toEqual([
      "-a",
      "-b",
    ])
  })

  it("returns the previous list when nothing changed", () => {
    const previous = present("a", "b")
    expect(reconcileChips(previous, ["a", "b"], key)).toBe(previous)
  })

  it("takes the newest item for a key that stays", () => {
    const previous = [{ key: "a", item: { id: "a", n: 1 }, isExiting: false }]
    const next = reconcileChips(
      previous,
      [{ id: "a", n: 2 }],
      (item) => item.id
    )
    expect(next[0]?.item).toEqual({ id: "a", n: 2 })
  })
})

describe("removeExitedChip", () => {
  it("drops a chip that finished leaving", () => {
    const leaving = reconcileChips(present("a", "b"), ["a"], key)
    expect(summarize(removeExitedChip(leaving, "b"))).toEqual(["a"])
  })

  it("keeps a chip that was selected again", () => {
    const previous = present("a", "b")
    expect(removeExitedChip(previous, "b")).toBe(previous)
  })
})

describe("getMultiSelectItemLabel", () => {
  it("reads strings, labels and values", () => {
    expect(getMultiSelectItemLabel("Design")).toBe("Design")
    expect(getMultiSelectItemLabel({ value: "design", label: "Design" })).toBe(
      "Design"
    )
    expect(getMultiSelectItemLabel({ value: 7 })).toBe("7")
    expect(getMultiSelectItemLabel(3)).toBe("3")
  })
})

describe("getMultiSelectItemKey", () => {
  it("keys objects by their value and the rest by their text", () => {
    expect(getMultiSelectItemKey({ value: "design", label: "Design" })).toBe(
      "design"
    )
    expect(getMultiSelectItemKey("Design")).toBe("Design")
    expect(getMultiSelectItemKey({ id: 1 })).toBe('{"id":1}')
  })
})

describe("getTransitionTime", () => {
  it("is the longest duration plus its delay, in milliseconds", () => {
    expect(getTransitionTime("all", "0.2s, 150ms", "0s, 100ms")).toBe(250)
  })

  it("repeats the shorter list like CSS does", () => {
    expect(getTransitionTime("opacity, scale", "0.1s, 0.3s", "50ms")).toBe(350)
  })

  it("is zero when nothing transitions", () => {
    expect(getTransitionTime("all", "0s", "0s")).toBe(0)
    expect(getTransitionTime("all", "", "")).toBe(0)
  })

  it("is zero when transitions are off, whatever the duration", () => {
    expect(getTransitionTime("none", "0.3s", "0s")).toBe(0)
  })
})

describe("getChipShift", () => {
  it("is how far a chip moved since the last layout", () => {
    expect(getChipShift({ x: 80, y: 0 }, { x: 40, y: 0 })).toEqual({
      x: 40,
      y: 0,
    })
  })

  it("is nothing under half a pixel", () => {
    expect(getChipShift({ x: 10.2, y: 4 }, { x: 10, y: 4 })).toBeNull()
  })

  it("is nothing without a last layout", () => {
    expect(getChipShift(undefined, { x: 10, y: 4 })).toBeNull()
  })
})

describe("parseTranslate", () => {
  it("reads a computed translate", () => {
    expect(parseTranslate("12px -4.5px")).toEqual({ x: 12, y: -4.5 })
    expect(parseTranslate("8px")).toEqual({ x: 8, y: 0 })
  })

  it("is zero without one", () => {
    expect(parseTranslate("none")).toEqual({ x: 0, y: 0 })
    expect(parseTranslate("")).toEqual({ x: 0, y: 0 })
  })
})
