import { describe, expect, it } from "vitest"

import {
  getCellColumns,
  getSpanWidth,
  pickTextClasses,
  reportColumnWidth,
  resolveColumnWidths,
} from "@/registry/native/lib/table-model"

describe("reportColumnWidth", () => {
  it("records the widest cell of a column", () => {
    const first = reportColumnWidth([], [], 1, 80)
    expect(first).toEqual([0, 80])
    expect(reportColumnWidth(first, [], 1, 120)).toEqual([0, 120])
    expect(reportColumnWidth(first, [], 1, 40)).toBe(first)
  })

  it("ignores the extra width a stretched cell reports", () => {
    expect(reportColumnWidth([80], [100], 0, 100)).toEqual([80])
  })

  it("takes a cell that outgrew its stretched column", () => {
    expect(reportColumnWidth([80], [100], 0, 140)).toEqual([140])
  })

  it("returns the same list when nothing changes", () => {
    const natural = [80]
    expect(reportColumnWidth(natural, [80], 0, 80)).toBe(natural)
  })
})

describe("resolveColumnWidths", () => {
  it("shares spare room by width, so the table fills its container", () => {
    expect(resolveColumnWidths([100, 300], 800)).toEqual([200, 600])
  })

  it("keeps natural widths when the table is wider than its container", () => {
    expect(resolveColumnWidths([100, 300], 200)).toEqual([100, 300])
  })

  it("leaves unmeasured tables alone", () => {
    expect(resolveColumnWidths([100, 300], 0)).toEqual([100, 300])
    expect(resolveColumnWidths([], 300)).toEqual([])
  })
})

describe("getCellColumns", () => {
  it("places cells by their spans", () => {
    expect(getCellColumns([1, 1, 1])).toEqual([0, 1, 2])
    expect(getCellColumns([3, 1])).toEqual([0, 3])
    expect(getCellColumns([1, 2, 1])).toEqual([0, 1, 3])
  })
})

describe("getSpanWidth", () => {
  it("adds the spanned columns", () => {
    expect(getSpanWidth([10, 20, 30, 40], 0, 3)).toBe(60)
    expect(getSpanWidth([10, 20, 30, 40], 3, 1)).toBe(40)
  })

  it("is undefined until the columns are known", () => {
    expect(getSpanWidth([], 0, 1)).toBeUndefined()
    expect(getSpanWidth([10], 0, 2)).toBeUndefined()
  })
})

describe("pickTextClasses", () => {
  it("keeps what styles text, and drops the rest", () => {
    expect(pickTextClasses("w-[100px] text-right font-medium")).toBe(
      "text-right font-medium"
    )
    expect(pickTextClasses("w-[100px] px-2")).toBeUndefined()
    expect(pickTextClasses(undefined)).toBeUndefined()
  })

  it("keeps text classes behind a variant", () => {
    expect(pickTextClasses("sm:text-right dark:text-muted-foreground")).toBe(
      "sm:text-right dark:text-muted-foreground"
    )
  })
})
