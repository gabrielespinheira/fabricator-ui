import { describe, expect, it } from "vitest"

import {
  FINANCE_ACCOUNTS,
  FINANCE_APPROVALS,
  FINANCE_CARD,
  FINANCE_ENTRIES,
  FINANCE_TRANSACTIONS,
  SAMPLE_NOW,
} from "@/registry/fabricator/shared/blocks/finance-01/lib/finance-data"
import {
  getApprovalsLead,
  getCardSpent,
  getFinanceOverview,
  getTotalCash,
  getWaitingApprovals,
  type FinancePeriod,
} from "@/registry/fabricator/shared/blocks/finance-01/lib/finance-model"

const PERIODS: FinancePeriod[] = ["7d", "30d", "90d", "12m"]
const balance = getTotalCash(FINANCE_ACCOUNTS)

function getOverview(period: FinancePeriod) {
  return getFinanceOverview({
    period,
    entries: FINANCE_ENTRIES,
    balance,
    now: SAMPLE_NOW,
  })
}

describe("the sample", () => {
  it("holds the accounts that make the headline", () => {
    expect(balance).toBe(1_284_310)
    expect(getOverview("30d").cash.at(-1)).toMatchObject({
      date: "Nov 24",
      current: balance,
    })
  })

  it.each(PERIODS)("balances over %s", (period) => {
    const { moneyIn, moneyOut, payroll, spending, previousCash } =
      getOverview(period)
    const spent = spending.reduce((sum, { amount }) => sum + amount, 0)
    expect(spent + payroll).toBeCloseTo(moneyOut, 2)
    expect(previousCash + moneyIn - moneyOut).toBeCloseTo(balance, 2)
  })

  it.each(PERIODS)("fills its plot from zero over %s", (period) => {
    const values = getOverview(period).cash.map(({ current }) => current)
    const top = Math.max(...values)
    expect(Math.min(...values)).toBeGreaterThan(0)
    if (period === "7d") return
    expect((top - Math.min(...values)) / top).toBeGreaterThan(0.2)
  })

  it("lists every transaction of the last 7 days that moved the balance", () => {
    const completed = FINANCE_TRANSACTIONS.filter(
      ({ status }) => status === "completed"
    )
    const { moneyIn, moneyOut } = getOverview("7d")
    const net = completed.reduce((sum, { amount }) => sum + amount, 0)
    expect(net).toBeCloseTo(moneyIn - moneyOut, 2)
  })

  it("moves money only through accounts it has", () => {
    const ids = new Set<string>([
      ...FINANCE_ACCOUNTS.map(({ id }) => id),
      FINANCE_CARD.id,
    ])
    expect(
      FINANCE_ENTRIES.filter(({ accountId }) => !ids.has(accountId))
    ).toEqual([])
  })

  it("keeps the card under its limit", () => {
    const spent = getCardSpent(FINANCE_ENTRIES, SAMPLE_NOW)
    expect(spent).toBeGreaterThan(FINANCE_CARD.limit * 0.4)
    expect(spent).toBeLessThan(FINANCE_CARD.limit)
  })

  it("leads with what waits", () => {
    expect(getApprovalsLead(getWaitingApprovals(FINANCE_APPROVALS, []))).toBe(
      "4 payments wait for you, $24,526 in total."
    )
  })
})
