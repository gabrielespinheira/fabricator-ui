import { describe, expect, it } from "vitest"

import {
  getAccordionItemOrder,
  getAccordionItemShape,
} from "@/registry/fabricator/shared/lib/accordion-model"

const ITEMS = ["a", "b", "c", "d"]

describe("getAccordionItemShape", () => {
  it("joins closed items into one card", () => {
    expect(getAccordionItemShape(ITEMS, [], "a")).toEqual({
      hasGap: false,
      isTopRound: true,
      isBottomRound: false,
    })
    expect(getAccordionItemShape(ITEMS, [], "b")).toEqual({
      hasGap: false,
      isTopRound: false,
      isBottomRound: false,
    })
    expect(getAccordionItemShape(ITEMS, [], "d")).toEqual({
      hasGap: false,
      isTopRound: false,
      isBottomRound: true,
    })
  })

  it("parts an open item from both neighbours", () => {
    expect(getAccordionItemShape(ITEMS, ["b"], "a")).toEqual({
      hasGap: false,
      isTopRound: true,
      isBottomRound: true,
    })
    expect(getAccordionItemShape(ITEMS, ["b"], "b")).toEqual({
      hasGap: true,
      isTopRound: true,
      isBottomRound: true,
    })
    expect(getAccordionItemShape(ITEMS, ["b"], "c")).toEqual({
      hasGap: true,
      isTopRound: true,
      isBottomRound: false,
    })
  })

  it("adds no gap above an open first item", () => {
    expect(getAccordionItemShape(ITEMS, ["a"], "a").hasGap).toBe(false)
    expect(getAccordionItemShape(ITEMS, ["a"], "b").hasGap).toBe(true)
  })

  it("keeps two open neighbours apart", () => {
    expect(getAccordionItemShape(ITEMS, ["b", "c"], "c")).toEqual({
      hasGap: true,
      isTopRound: true,
      isBottomRound: true,
    })
  })

  it("rounds an item it can't place", () => {
    expect(getAccordionItemShape(ITEMS, [], "z")).toEqual({
      hasGap: false,
      isTopRound: true,
      isBottomRound: true,
    })
  })
})

describe("getAccordionItemOrder", () => {
  it("orders items from the top down, wherever they render", () => {
    expect(
      getAccordionItemOrder(
        new Map([
          ["c", 92],
          ["a", 0],
          ["b", 46],
        ])
      )
    ).toEqual(["a", "b", "c"])
  })

  it("is empty before any item reports", () => {
    expect(getAccordionItemOrder(new Map())).toEqual([])
  })
})
