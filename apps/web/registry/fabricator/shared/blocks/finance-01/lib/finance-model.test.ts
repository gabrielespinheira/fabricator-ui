import { describe, expect, it } from "vitest"

import {
  formatDelta,
  formatMoney,
  formatMoneyCompact,
  formatRunway,
  getApprovalSummary,
  getChange,
  getComparisonLabel,
  getDeltaTone,
  getFinanceOverview,
  getRunwayMonths,
  isFinancePeriod,
} from "@/registry/fabricator/shared/blocks/finance-01/lib/finance-model"

describe("formatMoney", () => {
  it("writes whole dollars with grouping", () => {
    expect(formatMoney(1_284_310)).toBe("$1,284,310")
  })

  it("writes cents when asked, with a true minus sign", () => {
    expect(formatMoney(-2_340, { cents: true })).toBe("−$2,340.00")
  })

  it("signs both directions when asked", () => {
    expect(formatMoney(18_420.55, { cents: true, signed: true })).toBe(
      "+$18,420.55"
    )
    expect(formatMoney(-412.2, { cents: true, signed: true })).toBe("−$412.20")
  })
})

describe("formatMoneyCompact", () => {
  it("stays in full under ten thousand", () => {
    expect(formatMoneyCompact(9_812)).toBe("$9,812")
  })

  it("compacts thousands and millions", () => {
    expect(formatMoneyCompact(412_300)).toBe("$412.3K")
    expect(formatMoneyCompact(1_284_310)).toBe("$1.28M")
    expect(formatMoneyCompact(64_000)).toBe("$64K")
  })
})

describe("getChange", () => {
  it("is the percent change to one decimal", () => {
    expect(getChange(1_284_310, 1_407_110)).toBe(-8.7)
    expect(getChange(110, 100)).toBe(10)
  })

  it("is zero without a previous value", () => {
    expect(getChange(5, 0)).toBe(0)
  })
})

describe("formatDelta", () => {
  it("signs the change and keeps its unit", () => {
    expect(formatDelta(12.4, "%")).toBe("+12.4%")
    expect(formatDelta(-8.7, "%")).toBe("−8.7%")
    expect(formatDelta(1.9, " mo")).toBe("+1.9 mo")
  })

  it("writes no change as zero", () => {
    expect(formatDelta(0, "%")).toBe("0%")
  })
})

describe("getDeltaTone", () => {
  it("is good when a number moves the way it should", () => {
    expect(getDeltaTone(4, true)).toBe("success")
    expect(getDeltaTone(-3, false)).toBe("success")
  })

  it("is bad when it moves the other way, and neutral when still", () => {
    expect(getDeltaTone(7.7, false)).toBe("destructive")
    expect(getDeltaTone(0, true)).toBe("neutral")
  })
})

describe("runway", () => {
  it("divides cash by the monthly net burn", () => {
    // $122,800 burned in 30 days is $124,603 a month.
    expect(getRunwayMonths(1_284_310, 268_400, 391_200, 30)).toBeCloseTo(
      10.31,
      2
    )
  })

  it("is unlimited when money in covers money out", () => {
    expect(getRunwayMonths(500_000, 120_000, 90_000, 30)).toBe(Infinity)
    expect(formatRunway(Infinity)).toBe("No burn")
    expect(formatRunway(10.31)).toBe("10.3 mo")
  })
})

describe("isFinancePeriod", () => {
  it("accepts only the presets", () => {
    expect(isFinancePeriod("30d")).toBe(true)
    expect(isFinancePeriod("1y")).toBe(false)
  })
})

describe("getComparisonLabel", () => {
  it("names the previous period", () => {
    expect(getComparisonLabel("30d")).toBe("Compared with the previous 30 days")
    expect(getComparisonLabel("12m")).toBe(
      "Compared with the previous 12 months"
    )
  })
})

describe("getFinanceOverview", () => {
  it("draws one point per day, week or month of the period", () => {
    expect(getFinanceOverview("7d").cash).toHaveLength(7)
    expect(getFinanceOverview("30d").cash).toHaveLength(30)
    expect(getFinanceOverview("90d").cash).toHaveLength(13)
    expect(getFinanceOverview("12m").cash).toHaveLength(12)
  })

  it("ends the cash line on today's balance, and starts where money flowed from", () => {
    const { cash } = getFinanceOverview("30d")
    expect(cash.at(-1)).toMatchObject({ date: "Nov 17", current: 1_284_310 })
    // The balance before 30 days of $268,400 in and $391,200 out.
    expect(cash[0].current).toBe(1_407_110)
    // The previous period ends where this one starts.
    expect(cash.at(-1)?.previous).toBe(1_407_110)
  })

  it("names the grain of the cash line", () => {
    expect(getFinanceOverview("30d").grain).toBe("Daily")
    expect(getFinanceOverview("90d").grain).toBe("Weekly")
    expect(getFinanceOverview("12m").grain).toBe("Monthly")
  })

  it("labels weeks and months by their date", () => {
    expect(getFinanceOverview("90d").cash.at(-1)?.date).toBe("Nov 17")
    expect(getFinanceOverview("90d").cash.at(-2)?.date).toBe("Nov 10")
    expect(getFinanceOverview("12m").cash.map(({ date }) => date)).toEqual([
      "Dec",
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
    ])
  })

  it("reports the headline numbers with their direction", () => {
    const metrics = getFinanceOverview("30d").metrics
    expect(metrics.map(({ id, value, change }) => [id, value, change])).toEqual(
      [
        ["cash", "$1.28M", -8.7],
        ["in", "$268.4K", 12.4],
        ["out", "$391.2K", -3.1],
        ["runway", "10.3 mo", 1.9],
      ]
    )
    expect(metrics.find(({ id }) => id === "out")?.isGoodWhenUp).toBe(false)
  })

  it("ranks spending largest first and sums to money out", () => {
    const { spending } = getFinanceOverview("30d")
    const amounts = spending.map(({ amount }) => amount)
    expect(amounts).toEqual([...amounts].sort((a, b) => b - a))
    expect(amounts.reduce((sum, amount) => sum + amount, 0)).toBe(391_200)
  })
})

describe("getApprovalSummary", () => {
  it("counts what waits and its total", () => {
    expect(getApprovalSummary([{ amount: 2_340 }, { amount: 18_900.5 }])).toBe(
      "2 waiting, $21,240.50 in total"
    )
  })

  it("says when nothing waits", () => {
    expect(getApprovalSummary([])).toBe("Nothing waiting")
  })
})
