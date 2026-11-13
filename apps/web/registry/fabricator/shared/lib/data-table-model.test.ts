import { describe, expect, it } from "vitest"

import {
  compareCellValues,
  countOptionValues,
  formatDataTableAggregate,
  formatDataTableValue,
  getAggregateOptions,
  getAggregateValue,
  getColumnTypeDefaults,
  getDatePresetRange,
  getDefaultOperator,
  getEditText,
  getFilterKind,
  getOperators,
  getPageRange,
  getPageRowRange,
  getRangeSelection,
  getWindowsToCancel,
  getWindowsToLoad,
  indexWindows,
  isFilterActive,
  matchesFilter,
  matchesSearch,
  needsFilterValue,
  parseEditText,
  queryRows,
  shouldLoadMore,
  summarizeRows,
  toPixels,
  toSearchText,
} from "./data-table-model"

const NOW = new Date(2026, 10, 12, 15, 30).getTime()

function day(month: number, date: number, hour = 12) {
  return new Date(2026, month, date, hour).getTime()
}

describe("getFilterKind", () => {
  it("maps each column type to its filter", () => {
    expect(getFilterKind("text")).toBe("text")
    expect(getFilterKind("email")).toBe("text")
    expect(getFilterKind("link")).toBe("text")
    expect(getFilterKind("number")).toBe("number")
    expect(getFilterKind("currency")).toBe("number")
    expect(getFilterKind("percent")).toBe("number")
    expect(getFilterKind("progress")).toBe("number")
    expect(getFilterKind("date")).toBe("date")
    expect(getFilterKind("status")).toBe("option")
    expect(getFilterKind("person")).toBe("option")
    expect(getFilterKind("tags")).toBe("multi")
    expect(getFilterKind("boolean")).toBe("boolean")
  })
})

describe("operators", () => {
  it("lists the conditions each kind offers, the default first", () => {
    const values = (kind: Parameters<typeof getOperators>[0]) =>
      getOperators(kind).map((option) => option.value)
    expect(values("text")).toEqual([
      "contains",
      "notContains",
      "is",
      "isNot",
      "startsWith",
      "endsWith",
      "empty",
      "notEmpty",
    ])
    expect(values("number")).toEqual([
      "eq",
      "neq",
      "gt",
      "gte",
      "lt",
      "lte",
      "between",
      "empty",
      "notEmpty",
    ])
    expect(values("date")).toEqual([
      "within",
      "on",
      "before",
      "after",
      "onOrBefore",
      "onOrAfter",
      "between",
      "empty",
      "notEmpty",
    ])
    expect(values("option")).toEqual(["anyOf", "noneOf", "empty", "notEmpty"])
    expect(values("multi")).toEqual([
      "hasAny",
      "hasAll",
      "hasNone",
      "empty",
      "notEmpty",
    ])
    expect(values("boolean")).toEqual(["checked", "unchecked"])
    expect(getDefaultOperator("number")).toBe("eq")
    expect(getDefaultOperator("multi")).toBe("hasAny")
  })

  it("knows which conditions need a value", () => {
    expect(needsFilterValue("contains")).toBe(true)
    expect(needsFilterValue("within")).toBe(true)
    expect(needsFilterValue("empty")).toBe(false)
    expect(needsFilterValue("checked")).toBe(false)
  })
})

describe("matchesFilter: text", () => {
  const text = (operator: string, value: string, cell: unknown) =>
    matchesFilter("text", cell, { operator, value })

  it("compares ignoring case and surrounding space", () => {
    expect(text("contains", "  ACME ", "Acme Corp")).toBe(true)
    expect(text("notContains", "acme", "Acme Corp")).toBe(false)
    expect(text("notContains", "acme", "Globex")).toBe(true)
    expect(text("is", "acme", "Acme")).toBe(true)
    expect(text("isNot", "acme", "Acme")).toBe(false)
    expect(text("startsWith", "acm", "Acme Corp")).toBe(true)
    expect(text("endsWith", "corp", "Acme Corp")).toBe(true)
    expect(text("endsWith", "acme", "Acme Corp")).toBe(false)
  })

  it("checks emptiness without a value", () => {
    expect(text("empty", "", "")).toBe(true)
    expect(text("empty", "", null)).toBe(true)
    expect(text("notEmpty", "", "Acme")).toBe(true)
    expect(text("notEmpty", "", undefined)).toBe(false)
  })

  it("reads numbers and lists as text", () => {
    expect(text("contains", "124", 612400)).toBe(true)
    expect(text("contains", "whole", ["Gelato", "Wholesale"])).toBe(true)
  })
})

describe("matchesFilter: number", () => {
  const number = (
    operator: string,
    cell: unknown,
    value?: number,
    to?: number
  ) => matchesFilter("number", cell, { operator, value, to })

  it("compares with each operator", () => {
    expect(number("eq", 10, 10)).toBe(true)
    expect(number("neq", 10, 10)).toBe(false)
    expect(number("gt", 11, 10)).toBe(true)
    expect(number("gt", 10, 10)).toBe(false)
    expect(number("gte", 10, 10)).toBe(true)
    expect(number("lt", 9, 10)).toBe(true)
    expect(number("lte", 10, 10)).toBe(true)
  })

  it("keeps values between the bounds, either one open", () => {
    expect(number("between", 15, 10, 20)).toBe(true)
    expect(number("between", 20, 10, 20)).toBe(true)
    expect(number("between", 21, 10, 20)).toBe(false)
    expect(number("between", 1_000, 10)).toBe(true)
    expect(number("between", 5, undefined, 0)).toBe(false)
  })

  it("drops rows without a number, except for not equal and empty", () => {
    expect(number("gt", null, 0)).toBe(false)
    expect(number("neq", null, 3)).toBe(true)
    expect(number("empty", null)).toBe(true)
    expect(number("notEmpty", 0)).toBe(true)
  })
})

describe("matchesFilter: date", () => {
  const date = (operator: string, cell: unknown, value?: number, to?: number) =>
    matchesFilter("date", cell, { operator, value, to }, NOW)

  it("compares whole local days", () => {
    expect(date("on", day(10, 3, 23), day(10, 3, 1))).toBe(true)
    expect(date("on", day(10, 4, 0), day(10, 3))).toBe(false)
    expect(date("before", day(10, 2, 23), day(10, 3))).toBe(true)
    expect(date("before", day(10, 3, 0), day(10, 3))).toBe(false)
    expect(date("after", day(10, 4, 0), day(10, 3))).toBe(true)
    expect(date("after", day(10, 3, 23), day(10, 3))).toBe(false)
    expect(date("onOrBefore", day(10, 3, 23), day(10, 3))).toBe(true)
    expect(date("onOrAfter", day(10, 3, 0), day(10, 3))).toBe(true)
    expect(date("between", day(10, 5), day(10, 1), day(10, 10))).toBe(true)
    expect(date("between", day(10, 11), day(10, 1), day(10, 10))).toBe(false)
  })

  it("reads Dates, timestamps and ISO strings", () => {
    expect(date("on", new Date(day(10, 3)), day(10, 3))).toBe(true)
    expect(date("on", new Date(day(10, 3)).toISOString(), day(10, 3))).toBe(
      true
    )
    expect(date("on", null, day(10, 3))).toBe(false)
  })

  it("matches a relative range against now", () => {
    const within = (preset: string, cell: number) =>
      matchesFilter("date", cell, { operator: "within", preset }, NOW)
    expect(within("today", day(10, 12, 1))).toBe(true)
    expect(within("yesterday", day(10, 11))).toBe(true)
    expect(within("pastWeek", day(10, 6))).toBe(true)
    expect(within("pastWeek", day(10, 5))).toBe(false)
    expect(within("nextWeek", day(10, 18))).toBe(true)
    expect(within("thisYear", day(0, 1, 0))).toBe(true)
  })
})

describe("matchesFilter: options", () => {
  it("keeps a value that is, or isn't, one of the picked ones", () => {
    const filter = (operator: string) => ({ operator, value: ["won", "lost"] })
    expect(matchesFilter("option", "won", filter("anyOf"))).toBe(true)
    expect(matchesFilter("option", "open", filter("anyOf"))).toBe(false)
    expect(matchesFilter("option", "open", filter("noneOf"))).toBe(true)
    expect(matchesFilter("option", null, filter("noneOf"))).toBe(true)
    expect(matchesFilter("option", null, { operator: "empty" })).toBe(true)
  })

  it("matches lists by any, all or none of the picked values", () => {
    const filter = (operator: string) => ({ operator, value: ["b2b", "cafe"] })
    expect(matchesFilter("multi", ["cafe"], filter("hasAny"))).toBe(true)
    expect(matchesFilter("multi", ["cafe"], filter("hasAll"))).toBe(false)
    expect(matchesFilter("multi", ["cafe", "b2b", "x"], filter("hasAll"))).toBe(
      true
    )
    expect(matchesFilter("multi", ["x"], filter("hasNone"))).toBe(true)
    expect(matchesFilter("multi", [], { operator: "empty" })).toBe(true)
    expect(matchesFilter("multi", ["x"], { operator: "notEmpty" })).toBe(true)
  })
})

describe("matchesFilter: boolean", () => {
  it("checks the box", () => {
    expect(matchesFilter("boolean", true, { operator: "checked" })).toBe(true)
    expect(matchesFilter("boolean", null, { operator: "unchecked" })).toBe(true)
    expect(matchesFilter("boolean", true, { operator: "unchecked" })).toBe(
      false
    )
  })
})

describe("isFilterActive", () => {
  it("is false for conditions still missing their value", () => {
    expect(isFilterActive("text", { operator: "contains", value: " " })).toBe(
      false
    )
    expect(isFilterActive("text", { operator: "empty" })).toBe(true)
    expect(isFilterActive("number", { operator: "gt" })).toBe(false)
    expect(isFilterActive("number", { operator: "gt", value: 0 })).toBe(true)
    expect(isFilterActive("number", { operator: "between", to: 3 })).toBe(true)
    expect(isFilterActive("date", { operator: "within" })).toBe(false)
    expect(
      isFilterActive("date", { operator: "within", preset: "today" })
    ).toBe(true)
    expect(isFilterActive("option", { operator: "anyOf", value: [] })).toBe(
      false
    )
    expect(isFilterActive("multi", { operator: "hasAll", value: ["a"] })).toBe(
      true
    )
    expect(isFilterActive("boolean", { operator: "checked" })).toBe(true)
  })

  it("is false for a condition of another kind, or no filter", () => {
    expect(isFilterActive("number", { operator: "contains", value: "a" })).toBe(
      false
    )
    expect(isFilterActive("text", undefined)).toBe(false)
    expect(isFilterActive("option", ["a"])).toBe(false)
  })
})

describe("getDatePresetRange", () => {
  it("covers whole local days", () => {
    expect(getDatePresetRange("today", NOW)).toEqual({
      from: new Date(2026, 10, 12).getTime(),
      to: new Date(2026, 10, 12, 23, 59, 59, 999).getTime(),
    })
    expect(getDatePresetRange("yesterday", NOW).from).toBe(
      new Date(2026, 10, 11).getTime()
    )
    expect(getDatePresetRange("pastWeek", NOW).from).toBe(
      new Date(2026, 10, 6).getTime()
    )
    expect(getDatePresetRange("pastMonth", NOW).from).toBe(
      new Date(2026, 9, 12).getTime()
    )
    expect(getDatePresetRange("nextMonth", NOW).to).toBe(
      new Date(2026, 11, 12, 23, 59, 59, 999).getTime()
    )
    expect(getDatePresetRange("thisMonth", NOW).from).toBe(
      new Date(2026, 10, 1).getTime()
    )
  })
})

describe("editing", () => {
  it("gives the text an editor starts from", () => {
    expect(getEditText("percent", 0.42)).toBe("42")
    expect(getEditText("currency", 1200.5)).toBe("1200.5")
    expect(getEditText("text", "Acme")).toBe("Acme")
    expect(getEditText("number", null)).toBe("")
  })

  it("reads what was typed back as the column's value", () => {
    expect(parseEditText("percent", "42")).toBe(0.42)
    expect(parseEditText("currency", "$1,200.50")).toBe(1200.5)
    expect(parseEditText("number", " 7 ")).toBe(7)
    expect(parseEditText("number", "")).toBeNull()
    expect(parseEditText("number", "seven")).toBeNull()
    expect(parseEditText("progress", "140")).toBe(100)
    expect(parseEditText("text", "  Acme ")).toBe("Acme")
    expect(parseEditText("email", "")).toBeNull()
  })
})

describe("compareCellValues", () => {
  it("compares by type, with blanks first", () => {
    expect(compareCellValues(2, 10, { type: "number" })).toBeLessThan(0)
    expect(
      compareCellValues("item 2", "item 10", { type: "text" })
    ).toBeLessThan(0)
    expect(
      compareCellValues(new Date(day(10, 1)).toISOString(), day(10, 2), {
        type: "date",
      })
    ).toBeLessThan(0)
    expect(compareCellValues(null, 1, { type: "number" })).toBeLessThan(0)
  })

  it("orders statuses as their options list them", () => {
    const options = [
      { value: "lead", label: "Lead" },
      { value: "won", label: "Won" },
    ]
    expect(
      compareCellValues("won", "lead", { type: "status", options })
    ).toBeGreaterThan(0)
  })
})

describe("queryRows", () => {
  type Row = { name: string; stage: string; value: number }
  const rows: Row[] = [
    { name: "Acme", stage: "won", value: 30 },
    { name: "Globex", stage: "lead", value: 10 },
    { name: "Initech", stage: "won", value: 20 },
  ]
  const columns = {
    name: { type: "text" as const },
    stage: {
      type: "status" as const,
      options: [
        { value: "lead", label: "Lead" },
        { value: "won", label: "Won" },
      ],
    },
    value: { type: "number" as const },
  }
  const read = (row: Row, id: string) =>
    id === "name" ? row.name : id === "stage" ? row.stage : row.value

  it("filters, searches and sorts the way the table does", () => {
    const result = queryRows(
      rows,
      {
        filters: [
          { id: "stage", value: { operator: "anyOf", value: ["won"] } },
        ],
        sorting: [{ id: "value", desc: false }],
      },
      columns,
      read
    )
    expect(result.map((row) => row.name)).toEqual(["Initech", "Acme"])
    expect(
      queryRows(rows, { search: "glo" }, columns, read).map((row) => row.name)
    ).toEqual(["Globex"])
    expect(
      queryRows(rows, { search: "won" }, columns, read).map((row) => row.name)
    ).toEqual(["Acme", "Initech"])
  })
})

describe("formatDataTableValue", () => {
  it("formats numbers, money and shares in a fixed locale", () => {
    expect(formatDataTableValue("number", 1234.5)).toBe("1,234.5")
    expect(formatDataTableValue("currency", 612400)).toBe("$612,400.00")
    expect(
      formatDataTableValue("currency", 612400, {
        currency: "EUR",
        fractionDigits: 0,
      })
    ).toBe("€612,400")
    expect(formatDataTableValue("currency", 1_250_000, { compact: true })).toBe(
      "$1.3M"
    )
    expect(formatDataTableValue("percent", 0.842)).toBe("84%")
    expect(formatDataTableValue("progress", 42)).toBe("42%")
  })

  it("formats dates, absolute or relative to now", () => {
    expect(formatDataTableValue("date", day(10, 3))).toBe("Nov 3, 2026")
    const relative = (time: number) =>
      formatDataTableValue("date", time, { relative: true, now: NOW })
    expect(relative(day(10, 12, 9))).toBe("7 hours ago")
    expect(relative(NOW - 12 * 60_000)).toBe("12 minutes ago")
    expect(relative(NOW - 20_000)).toBe("now")
    expect(relative(day(10, 11))).toBe("yesterday")
    expect(relative(day(10, 8))).toBe("4 days ago")
    expect(relative(day(9, 20))).toBe("3 weeks ago")
    expect(relative(day(4, 1))).toBe("6 months ago")
    expect(relative(new Date(2024, 1, 1).getTime())).toBe("2 years ago")
  })

  it("formats the rest as text, and nothing as empty", () => {
    expect(formatDataTableValue("boolean", true)).toBe("Yes")
    expect(formatDataTableValue("tags", ["a", "b"])).toBe("a, b")
    expect(formatDataTableValue("text", null)).toBe("")
    expect(formatDataTableValue("currency", undefined)).toBe("")
  })
})

describe("aggregates", () => {
  const values = [10, null, 30, 20, 20]

  it("offers what fits the type", () => {
    expect(getAggregateOptions("currency")).toEqual([
      "count",
      "filled",
      "empty",
      "unique",
      "sum",
      "average",
      "median",
      "min",
      "max",
    ])
    expect(getAggregateOptions("status")).toEqual([
      "count",
      "filled",
      "empty",
      "unique",
    ])
    expect(getAggregateOptions("date")).toEqual([
      "count",
      "filled",
      "empty",
      "min",
      "max",
    ])
    expect(getAggregateOptions("boolean")).toEqual([
      "count",
      "checked",
      "unchecked",
    ])
  })

  it("calculates over the values", () => {
    expect(getAggregateValue("count", values)).toBe(5)
    expect(getAggregateValue("filled", values)).toBe(4)
    expect(getAggregateValue("empty", ["", null, "a", []])).toBe(3)
    expect(getAggregateValue("unique", values)).toBe(3)
    expect(getAggregateValue("unique", [["a", "b"], ["b"], null])).toBe(2)
    expect(getAggregateValue("sum", values)).toBe(80)
    expect(getAggregateValue("average", values)).toBe(20)
    expect(getAggregateValue("median", values)).toBe(20)
    expect(getAggregateValue("median", [1, 2, 3, 4])).toBe(2.5)
    expect(getAggregateValue("min", values)).toBe(10)
    expect(getAggregateValue("max", values)).toBe(30)
    expect(getAggregateValue("checked", [true, false, true, null])).toBe(2)
    expect(getAggregateValue("unchecked", [true, false, true, null])).toBe(2)
  })

  it("reads dates for min and max, ISO strings in date columns", () => {
    expect(getAggregateValue("min", [new Date(day(10, 3)), day(10, 1)])).toBe(
      day(10, 1)
    )
    const iso = new Date(day(10, 3)).toISOString()
    expect(getAggregateValue("max", [iso, null, day(10, 1)], "date")).toBe(
      day(10, 3)
    )
    expect(getAggregateValue("max", ["12", 3], "number")).toBe(3)
  })

  it("has no value for sums of nothing", () => {
    expect(getAggregateValue("average", [null, null])).toBeNull()
    expect(getAggregateValue("max", [])).toBeNull()
  })

  it("formats in the column's format, counts as counts, dates absolute", () => {
    expect(formatDataTableAggregate("currency", "sum", 80_000)).toBe(
      "$80,000.00"
    )
    expect(formatDataTableAggregate("currency", "unique", 3)).toBe("3")
    expect(formatDataTableAggregate("percent", "average", 0.5)).toBe("50%")
    expect(
      formatDataTableAggregate("date", "max", NOW, { relative: true, now: NOW })
    ).toBe("Nov 12, 2026")
    expect(formatDataTableAggregate("number", "sum", null)).toBe("–")
  })
})

describe("getPageRange", () => {
  it("lists every page when they fit", () => {
    expect(getPageRange(0, 5)).toEqual([0, 1, 2, 3, 4])
    expect(getPageRange(0, 7)).toEqual([0, 1, 2, 3, 4, 5, 6])
  })

  it("keeps the ends and the pages around the current one", () => {
    expect(getPageRange(0, 20)).toEqual([0, 1, 2, 3, 4, "end", 19])
    expect(getPageRange(10, 20)).toEqual([0, "start", 9, 10, 11, "end", 19])
    expect(getPageRange(19, 20)).toEqual([0, "start", 15, 16, 17, 18, 19])
    expect(getPageRange(3, 20)).toEqual([0, 1, 2, 3, 4, "end", 19])
    expect(getPageRange(4, 20)).toEqual([0, "start", 3, 4, 5, "end", 19])
  })

  it("is empty without pages", () => {
    expect(getPageRange(0, 0)).toEqual([])
  })
})

describe("getPageRowRange", () => {
  it("gives the first and last row shown, from one", () => {
    expect(getPageRowRange(0, 50, 10_000)).toEqual({ start: 1, end: 50 })
    expect(getPageRowRange(2, 50, 120)).toEqual({ start: 101, end: 120 })
    expect(getPageRowRange(0, 50, 0)).toEqual({ start: 0, end: 0 })
  })
})

describe("shouldLoadMore", () => {
  const base = { rowCount: 100, threshold: 10, hasMore: true, loading: false }

  it("asks for more near the end, never while loading or at the end", () => {
    expect(shouldLoadMore({ ...base, lastIndex: 89 })).toBe(true)
    expect(shouldLoadMore({ ...base, lastIndex: 88 })).toBe(false)
    expect(shouldLoadMore({ ...base, lastIndex: 99, loading: true })).toBe(
      false
    )
    expect(shouldLoadMore({ ...base, lastIndex: 99, hasMore: false })).toBe(
      false
    )
  })
})

describe("getRangeSelection", () => {
  const ids = ["a", "b", "c", "d", "e"]

  it("selects every row between the anchor and the target", () => {
    expect(getRangeSelection(ids, "b", "d")).toEqual(["b", "c", "d"])
    expect(getRangeSelection(ids, "d", "b")).toEqual(["b", "c", "d"])
    expect(getRangeSelection(ids, "z", "c")).toEqual(["c"])
  })
})

describe("getColumnTypeDefaults", () => {
  it("aligns numbers to the end and starts them descending", () => {
    expect(getColumnTypeDefaults("currency")).toMatchObject({
      align: "end",
      sortDescFirst: true,
    })
    expect(getColumnTypeDefaults("text").align).toBe("start")
    expect(getColumnTypeDefaults("boolean").align).toBe("center")
  })
})

describe("matchesSearch and countOptionValues", () => {
  it("finds the query in text, numbers and lists", () => {
    expect(matchesSearch("Acme Corp", "acme")).toBe(true)
    expect(matchesSearch(612400, "612")).toBe(true)
    expect(matchesSearch(["Gelato", "B2B"], "b2b")).toBe(true)
    expect(matchesSearch(null, "a")).toBe(false)
    expect(matchesSearch("anything", "  ")).toBe(true)
  })

  it("counts each value, and each item of a list", () => {
    const counts = countOptionValues(["won", "won", null, ["b2b", "cafe"]])
    expect(Object.fromEntries(counts)).toEqual({ won: 2, b2b: 1, cafe: 1 })
  })
})

describe("toPixels", () => {
  it("reads px and rem lengths, and nothing else", () => {
    expect(toPixels("40px", 16)).toBe(40)
    expect(toPixels(" 2.5rem", 16)).toBe(40)
    expect(toPixels("auto", 16)).toBeNull()
  })
})

describe("summarizeRows", () => {
  const rows = [
    { amount: 10, paid: true, due: "2026-11-01" },
    { amount: 30, paid: false, due: "2026-11-20" },
    { amount: null, paid: true, due: null },
  ]
  const columns = {
    amount: { type: "currency" },
    paid: { type: "boolean" },
    due: { type: "date" },
  } as const
  const read = (row: (typeof rows)[number], id: string) =>
    id === "amount" ? row.amount : id === "paid" ? row.paid : row.due

  it("works out every calculation each column offers", () => {
    const summary = summarizeRows(rows, columns, read)
    expect(summary.amount).toMatchObject({
      count: 3,
      sum: 40,
      average: 20,
      min: 10,
      max: 30,
      empty: 1,
    })
    expect(summary.paid).toEqual({ count: 3, checked: 2, unchecked: 1 })
    expect(summary.due?.max).toBe(Date.parse("2026-11-20"))
  })
})

describe("toSearchText", () => {
  it("lowercases a cell's label-aware text once, for repeated searches", () => {
    const options = [{ value: "won", label: "Closed Won" }]
    expect(toSearchText("won", options)).toBe("closed won")
    expect(toSearchText(["won", "B2B"], options)).toBe("closed won b2b")
    expect(toSearchText(612400)).toBe("612400")
  })

  it("leaves blanks empty, so no query finds them", () => {
    expect(toSearchText(null)).toBe("")
    expect(toSearchText("")).toBe("")
    expect(toSearchText([])).toBe("")
  })
})

describe("windowed rows", () => {
  it("lays loaded windows out by position, with gaps for the rest", () => {
    const windows = new Map([
      [2, ["e", "f"]],
      [0, ["a", "b"]],
    ])
    const index = indexWindows(windows, 2)
    expect(index.rows).toEqual(["a", "b", "e", "f"])
    expect(index.rowIndexAt(1)).toBe(1)
    expect(index.rowIndexAt(2)).toBeUndefined()
    expect(index.rowIndexAt(4)).toBe(2)
    expect(index.positionOf(3)).toBe(5)
  })

  it("finds nothing past a short last window", () => {
    const index = indexWindows(
      new Map([
        [0, ["a", "b"]],
        [1, ["c"]],
      ]),
      2
    )
    expect(index.rowIndexAt(2)).toBe(2)
    expect(index.rowIndexAt(3)).toBeUndefined()
  })

  it("asks for the windows in view that aren't loaded, out or failed", () => {
    const base = {
      size: 100,
      total: 1000,
      loaded: new Set([1]),
      pending: new Set([3]),
      failed: new Set([2]),
    }
    expect(getWindowsToLoad({ ...base, start: 150, end: 450 })).toEqual([4])
    expect(getWindowsToLoad({ ...base, start: 0, end: 120 })).toEqual([0])
  })

  it("stops at the last row there is", () => {
    expect(
      getWindowsToLoad({
        start: 980,
        end: 1100,
        size: 100,
        total: 1000,
        loaded: new Set(),
        pending: new Set(),
        failed: new Set(),
      })
    ).toEqual([9])
  })

  it("drops requests the scroll has left behind, keeping a window either side", () => {
    expect(getWindowsToCancel(new Set([0, 3, 5, 9]), 4, 5)).toEqual([0, 9])
  })
})
