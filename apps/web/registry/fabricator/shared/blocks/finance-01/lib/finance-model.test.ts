import { describe, expect, it } from "vitest"

import {
  formatDelta,
  formatMoney,
  formatMoneyCompact,
  formatRunway,
  getAccountShares,
  getApprovalsLead,
  getCardSpent,
  getChange,
  getComparisonLabel,
  getDeltaTone,
  getDueStatus,
  getFinanceOverview,
  getRecentTransactions,
  getSpendingScope,
  getTotalCash,
  getWaitingApprovals,
  isFinancePeriod,
  toPayment,
  type FinanceApproval,
  type FinanceEntry,
  type FinanceTransaction,
} from "@/registry/fabricator/shared/blocks/finance-01/lib/finance-model"

const NOW = Date.UTC(2026, 10, 24, 9, 41)

function entry(
  date: string,
  amount: number,
  fields: Partial<FinanceEntry> = {}
): FinanceEntry {
  return {
    date,
    amount,
    accountId: "checking",
    category: amount > 0 ? "Revenue" : "Cloud",
    status: "completed",
    ...fields,
  }
}

function transaction(
  id: string,
  date: string,
  fields: Partial<FinanceTransaction> = {}
): FinanceTransaction {
  return {
    ...entry(date, -100),
    id,
    payee: { kind: "initials", name: id, initials: "X" },
    ...fields,
  }
}

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

describe("periods", () => {
  it("accepts only the presets", () => {
    expect(isFinancePeriod("30d")).toBe(true)
    expect(isFinancePeriod("1y")).toBe(false)
  })

  it("names the previous period", () => {
    expect(getComparisonLabel("30d")).toBe("vs the previous 30 days")
    expect(getComparisonLabel("12m")).toBe("vs the previous 12 months")
  })
})

describe("accounts", () => {
  it("add up to the cash balance", () => {
    expect(getTotalCash([{ balance: 842_190 }, { balance: 62_120 }])).toBe(
      904_310
    )
  })

  it("share the balance in whole percents that make 100", () => {
    expect(
      getAccountShares([
        { id: "checking", balance: 842_190 },
        { id: "treasury", balance: 380_000 },
        { id: "savings", balance: 62_120 },
      ])
    ).toEqual({ checking: 65, treasury: 30, savings: 5 })
  })

  it("share nothing when there is no cash", () => {
    expect(getAccountShares([{ id: "checking", balance: 0 }])).toEqual({
      checking: 0,
    })
  })
})

describe("getCardSpent", () => {
  it("adds this month's card payments, with what is still pending", () => {
    const entries = [
      entry("2026-11-02", -1_000, { accountId: "card" }),
      entry("2026-11-24", -250.5, { accountId: "card", status: "pending" }),
    ]
    expect(getCardSpent(entries, NOW)).toBe(1_250.5)
  })

  it("leaves out declined payments, other accounts and last month", () => {
    const entries = [
      entry("2026-11-23", -412.2, { accountId: "card", status: "declined" }),
      entry("2026-11-23", -900),
      entry("2026-10-31", -700, { accountId: "card" }),
    ]
    expect(getCardSpent(entries, NOW)).toBe(0)
  })
})

describe("getFinanceOverview", () => {
  // $1,000 today, after $300 in and $80 out this week and $500 of payroll
  // before that.
  const entries = [
    entry("2026-11-24", 300),
    entry("2026-11-20", -50, { category: "Software" }),
    entry("2026-11-18", -30, { category: "Cloud" }),
    entry("2026-11-17", -500, { category: "Payroll" }),
    entry("2026-11-12", 200),
    entry("2026-11-11", -60),
    entry("2026-11-24", -999, { status: "pending" }),
    entry("2026-11-23", -999, { status: "declined" }),
  ]
  const getOverview = (period: "7d" | "30d" | "90d" | "12m") =>
    getFinanceOverview({ period, entries, balance: 1_000, now: NOW })

  it("draws a point per day, and per week over 12 months", () => {
    expect(getOverview("7d").cash).toHaveLength(7)
    expect(getOverview("30d").cash).toHaveLength(30)
    expect(getOverview("90d").cash).toHaveLength(90)
    expect(getOverview("12m").cash).toHaveLength(53)
    expect(getOverview("90d").grain).toBe("Daily")
    expect(getOverview("12m").grain).toBe("Weekly")
  })

  it("walks the closing balances back from today's", () => {
    expect(
      getOverview("7d").cash.map(({ date, current }) => [date, current])
    ).toEqual([
      ["Nov 18", 750],
      ["Nov 19", 750],
      ["Nov 20", 700],
      ["Nov 21", 700],
      ["Nov 22", 700],
      ["Nov 23", 700],
      ["Nov 24", 1_000],
    ])
  })

  it("ends the previous period where this one starts", () => {
    const overview = getOverview("7d")
    expect(overview.cash.at(-1)?.previous).toBe(780)
    expect(overview.previousCash).toBe(780)
    expect(overview.cashChange).toBe(28.2)
  })

  it("counts only completed money, against the previous period", () => {
    const [moneyIn, moneyOut] = getOverview("7d").metrics
    expect([moneyIn.value, moneyIn.previous, moneyIn.change]).toEqual([
      "$300",
      "$200",
      50,
    ])
    expect([moneyOut.value, moneyOut.previous, moneyOut.change]).toEqual([
      "$80",
      "$560",
      -85.7,
    ])
    expect(moneyOut.isGoodWhenUp).toBe(false)
  })

  it("ranks spending without payroll, and the two make money out", () => {
    const { spending, payroll, moneyOut } = getOverview("30d")
    expect(spending).toEqual([
      { category: "Cloud", amount: 90 },
      { category: "Software", amount: 50 },
    ])
    expect(payroll).toBe(500)
    expect(moneyOut).toBe(640)
  })

  it("keeps Other last, however much it holds", () => {
    const { spending } = getFinanceOverview({
      period: "7d",
      entries: [
        entry("2026-11-20", -900, { category: "Other" }),
        entry("2026-11-20", -10, { category: "Office" }),
      ],
      balance: 1_000,
      now: NOW,
    })
    expect(spending.map(({ category }) => category)).toEqual([
      "Office",
      "Other",
    ])
  })

  it("measures runway on the last 13 weeks in every period", () => {
    const runways = (["7d", "30d", "90d", "12m"] as const).map(
      (period) => getOverview(period).metrics[2].value
    )
    // $140 burned in 91 days is $46.83 a month.
    expect(runways).toEqual(["21.4 mo", "21.4 mo", "21.4 mo", "21.4 mo"])
  })

  it("says when money in covers money out", () => {
    const overview = getFinanceOverview({
      period: "30d",
      entries: [entry("2026-11-20", 400)],
      balance: 1_000,
      now: NOW,
    })
    expect(overview.metrics[2]).toMatchObject({ value: "No burn", change: 0 })
    expect(formatRunway(10.31)).toBe("10.3 mo")
  })
})

describe("getSpendingScope", () => {
  it("says how much payroll it leaves out", () => {
    expect(getSpendingScope(480_000)).toBe("Without $480K of payroll")
  })

  it("says when the period has none", () => {
    expect(getSpendingScope(0)).toBe("No payroll in this period")
  })
})

describe("approvals", () => {
  const approvals: FinanceApproval[] = [
    {
      id: "a",
      payee: { kind: "initials", name: "Priya Raman", initials: "PR" },
      detail: "Team offsite travel",
      due: null,
      submitted: "2026-11-20",
      amount: 1_186.4,
      category: "Other",
    },
    {
      id: "b",
      payee: { kind: "initials", name: "Figma", initials: "F" },
      detail: "Annual renewal, 42 seats",
      due: "2026-11-30",
      submitted: "2026-11-10",
      amount: 18_900,
      category: "Software",
    },
    {
      id: "c",
      payee: { kind: "initials", name: "Vercel", initials: "V" },
      detail: "Invoice INV-2291",
      due: "2026-11-24",
      submitted: "2026-11-12",
      amount: 2_340,
      category: "Cloud",
    },
  ]

  it("wait in the order they are due, undated last", () => {
    const ids = getWaitingApprovals(approvals, []).map(({ id }) => id)
    expect(ids).toEqual(["c", "b", "a"])
  })

  it("leave when approved, and return to their place with Undo", () => {
    const waiting = getWaitingApprovals(approvals, ["b"])
    expect(waiting.map(({ id }) => id)).toEqual(["c", "a"])
    expect(getWaitingApprovals(approvals, [])).toHaveLength(3)
  })

  it("add up to the lead", () => {
    expect(getApprovalsLead(approvals)).toBe(
      "3 payments wait for you, $22,426 in total."
    )
    expect(getApprovalsLead(approvals.slice(0, 1))).toBe(
      "1 payment waits for you, $1,186."
    )
    expect(getApprovalsLead([])).toBe("No payments wait for you.")
  })

  it("become a pending payment today, from Checking", () => {
    expect(toPayment(approvals[1], NOW)).toMatchObject({
      date: "2026-11-24",
      amount: -18_900,
      accountId: "checking",
      category: "Software",
      status: "pending",
    })
  })
})

describe("getDueStatus", () => {
  const due = (date: string | null) =>
    getDueStatus({ due: date, submitted: "2026-11-20" }, NOW)

  it("says the date, today, or since when it is late", () => {
    expect(due("2026-11-30")).toEqual({ label: "Due Nov 30", isLate: false })
    expect(due("2026-11-24")).toEqual({ label: "Due today", isLate: false })
    expect(due("2026-11-21")).toEqual({
      label: "Due Nov 21, 3 days late",
      isLate: true,
    })
    expect(due("2026-11-23").label).toBe("Due Nov 23, 1 day late")
  })

  it("says when an undated one was submitted", () => {
    expect(due(null)).toEqual({ label: "Submitted Nov 20", isLate: false })
  })
})

describe("getRecentTransactions", () => {
  it("is newest first, with payments just approved on top", () => {
    const recent = getRecentTransactions({
      transactions: [
        transaction("old", "2026-11-18"),
        transaction("new", "2026-11-24"),
        transaction("middle", "2026-11-20"),
      ],
      payments: [transaction("approved", "2026-11-24")],
      count: 3,
    })
    expect(recent.map(({ id }) => id)).toEqual(["approved", "new", "middle"])
  })
})
