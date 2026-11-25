import {
  type FinanceAccountId,
  type FinanceCategory,
  type FinanceEntry,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"

// The sample's past: two years of a company's account, with the rhythm of a
// real one (customer payouts twice a week, payroll on the last business day,
// rent and cloud bills early in the month). The same on the server and in the
// browser. Replace it with your ledger's entries.

const DAY = 86_400_000
const DAYS_PER_MONTH = 30.44

type Payment = {
  category: FinanceCategory
  accountId: FinanceAccountId
  amount: number
}

/** Paid on that day of the month. */
const MONTHLY: Record<number, Payment[]> = {
  1: [{ category: "Office", accountId: "checking", amount: 34_000 }],
  17: [{ category: "Cloud", accountId: "checking", amount: 26_000 }],
  18: [{ category: "Other", accountId: "checking", amount: 23_000 }],
  19: [{ category: "Contractors", accountId: "checking", amount: 25_000 }],
  28: [{ category: "Cloud", accountId: "checking", amount: 58_000 }],
}

/** Paid on that day of the week, Sunday first. */
const WEEKLY: Record<number, Payment[]> = {
  1: [{ category: "Marketing", accountId: "card", amount: 7_400 }],
  3: [{ category: "Software", accountId: "card", amount: 11_800 }],
  4: [{ category: "Marketing", accountId: "card", amount: 6_900 }],
}

const PAYROLL = 770_000
const PAYOUT = 97_000
const WIRE = 130_000
const WIRE_DAY = 9
const PAYOUT_WEEKDAYS = [2, 5]

/** A steady wobble of up to 6% either way. */
function getWobble(day: number, seed: number) {
  const noise = Math.sin(day * 12.9898 + seed * 78.233) * 43_758.5453
  return 1 + (noise - Math.floor(noise) - 0.5) * 0.12
}

function isPayday(date: Date) {
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)
  )
  const weekday = lastDay.getUTCDay()
  const weekend = weekday === 0 ? 2 : weekday === 6 ? 1 : 0
  return date.getUTCDate() === lastDay.getUTCDate() - weekend
}

function getEntriesOfDay(day: number, today: number): FinanceEntry[] {
  const date = new Date(day * DAY)
  const months = (today - day) / DAYS_PER_MONTH
  // The company grows: both were smaller the further back it goes.
  const revenue = 1 / (1 + 0.0225 * months)
  const costs = 1 / (1 + 0.0235 * months)
  const toEntry = (
    amount: number,
    category: FinanceCategory,
    accountId: FinanceAccountId = "checking"
  ): FinanceEntry => ({
    date: date.toISOString().slice(0, 10),
    amount: Math.round(amount),
    category,
    accountId,
    status: "completed",
  })

  const spent = [
    ...(MONTHLY[date.getUTCDate()] ?? []),
    ...(WEEKLY[date.getUTCDay()] ?? []),
  ].map(({ category, accountId, amount }, index) =>
    toEntry(-amount * costs * getWobble(day, index), category, accountId)
  )
  return [
    ...spent,
    ...(isPayday(date) ? [toEntry(-PAYROLL * costs, "Payroll")] : []),
    ...(PAYOUT_WEEKDAYS.includes(date.getUTCDay())
      ? [toEntry(PAYOUT * revenue * getWobble(day, 7), "Revenue")]
      : []),
    ...(date.getUTCDate() === WIRE_DAY
      ? [toEntry(WIRE * revenue * getWobble(day, 8), "Revenue")]
      : []),
  ]
}

/** Every entry from `from` days before `now` back to `to` days before it. */
export function getLedgerHistory({
  now,
  from,
  to,
}: {
  now: number
  from: number
  to: number
}): FinanceEntry[] {
  const today = Math.floor(now / DAY)
  return Array.from({ length: to - from + 1 }, (_, index) =>
    getEntriesOfDay(today - from - index, today)
  ).flat()
}
