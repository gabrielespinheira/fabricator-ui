import { type BrandIconComponent } from "@fabricator-ui/icons/brands"

// The numbers behind the overview: every one is worked out from the accounts
// and the ledger's entries, so they always add up. Pure, so the page only
// wires them to the components.

export type FinancePeriod = "7d" | "30d" | "90d" | "12m"

export const FINANCE_PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
] as const satisfies ReadonlyArray<{ value: FinancePeriod; label: string }>

export type FinanceCounterparty =
  | { kind: "brand"; name: string; logo: BrandIconComponent }
  | { kind: "initials"; name: string; initials: string }

export type FinanceAccountId = "checking" | "treasury" | "savings" | "card"

export type FinanceCategory =
  | "Revenue"
  | "Interest"
  | "Payroll"
  | "Cloud"
  | "Software"
  | "Marketing"
  | "Contractors"
  | "Office"
  | "Other"

export type FinanceStatus = "completed" | "pending" | "declined"

/** One movement of money. Only completed ones have moved the balance. */
export type FinanceEntry = {
  /** The day it happened, as YYYY-MM-DD. */
  date: string
  /** In is positive, out is negative. */
  amount: number
  accountId: FinanceAccountId
  category: FinanceCategory
  status: FinanceStatus
}

export type FinanceTransaction = FinanceEntry & {
  id: string
  payee: FinanceCounterparty
}

export type FinanceApproval = {
  id: string
  payee: FinanceCounterparty
  detail: string
  /** A reimbursement has no due date. */
  due: string | null
  submitted: string
  amount: number
  category: FinanceCategory
}

export type FinanceAccount = {
  id: Exclude<FinanceAccountId, "card">
  name: string
  detail: string
  balance: number
}

export type FinanceCard = {
  id: "card"
  name: string
  number: string
  detail: string
  limit: number
}

export type DeltaUnit = "%" | " mo"

export type DeltaTone = "success" | "destructive" | "neutral"

export type FinanceMetric = {
  id: "in" | "out" | "runway"
  label: string
  /** What the number is worked out from, when the period doesn't say. */
  scope?: string
  value: string
  previous: string
  change: number
  unit: DeltaUnit
  isGoodWhenUp: boolean
}

export type CashPoint = {
  date: string
  current: number
  previous: number
}

export type SpendingCategory = {
  category: string
  amount: number
}

export type FinanceOverview = {
  /** How often the cash line has a point. */
  grain: "Daily" | "Weekly"
  /** The balance when the period started. */
  previousCash: number
  cashChange: number
  moneyIn: number
  moneyOut: number
  /** Part of money out that `spending` leaves out. */
  payroll: number
  metrics: FinanceMetric[]
  cash: CashPoint[]
  spending: SpendingCategory[]
}

const MINUS = "−"
const DAY = 86_400_000
const DAYS_PER_MONTH = 30.44
/** Whole weeks and three payrolls, so every day of the week weighs the same. */
const RUNWAY_WEEKS = 13
const RUNWAY_DAYS = RUNWAY_WEEKS * 7

const PERIOD_LENGTHS: Record<
  FinancePeriod,
  { days: number; step: number; grain: FinanceOverview["grain"] }
> = {
  "7d": { days: 7, step: 1, grain: "Daily" },
  "30d": { days: 30, step: 1, grain: "Daily" },
  "90d": { days: 90, step: 1, grain: "Daily" },
  "12m": { days: 365, step: 7, grain: "Weekly" },
}

const MONTHS = [
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
  "Dec",
]

export function isFinancePeriod(value: unknown): value is FinancePeriod {
  return FINANCE_PERIODS.some((period) => period.value === value)
}

export function getComparisonLabel(period: FinancePeriod) {
  const label = FINANCE_PERIODS.find(({ value }) => value === period)?.label
  return `vs the previous ${label}`
}

export function formatMoney(
  value: number,
  { cents = false, signed = false }: { cents?: boolean; signed?: boolean } = {}
) {
  const digits = cents ? 2 : 0
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Math.abs(value))
  if (value < 0) return `${MINUS}${amount}`
  return signed && value > 0 ? `+${amount}` : amount
}

function trimZeros(text: string) {
  return text.replace(/\.?0+$/, "")
}

/** Stats and axes: in full under $10,000, then $412.3K and $1.28M. */
export function formatMoneyCompact(value: number) {
  const size = Math.abs(value)
  const sign = value < 0 ? MINUS : ""
  if (size < 10_000) return formatMoney(value)
  const thousands = Number((size / 1_000).toFixed(1))
  if (thousands < 1_000) return `${sign}$${trimZeros(thousands.toFixed(1))}K`
  return `${sign}$${trimZeros((size / 1_000_000).toFixed(2))}M`
}

function formatDay(day: number) {
  const date = new Date(day * DAY)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`
}

export function formatDate(date: string) {
  return formatDay(getDay(Date.parse(date)))
}

function getDay(time: number) {
  return Math.floor(time / DAY)
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10
}

/** The percent change from `previous`, to one decimal. */
export function getChange(current: number, previous: number) {
  if (previous === 0) return 0
  return roundToTenth(((current - previous) / Math.abs(previous)) * 100)
}

export function formatDelta(change: number, unit: DeltaUnit) {
  if (change === 0) return `0${unit}`
  const sign = change > 0 ? "+" : MINUS
  return `${sign}${Math.abs(change).toFixed(1)}${unit}`
}

/** Green when a number moves the way it should, red when it doesn't. */
export function getDeltaTone(change: number, isGoodWhenUp: boolean): DeltaTone {
  if (change === 0) return "neutral"
  return change > 0 === isGoodWhenUp ? "success" : "destructive"
}

/** Short enough for a stat card two across on a phone. */
export function formatRunway(months: number) {
  if (!Number.isFinite(months)) return "No burn"
  return `${months.toFixed(1)} mo`
}

export function getTotalCash(accounts: ReadonlyArray<{ balance: number }>) {
  return accounts.reduce((sum, { balance }) => sum + balance, 0)
}

/**
 * Each account's whole percent of the cash. The largest remainders round up,
 * so the percents make exactly 100.
 */
export function getAccountShares(
  accounts: ReadonlyArray<{ id: string; balance: number }>
): Record<string, number> {
  const total = getTotalCash(accounts)
  const shares = accounts.map(({ id, balance }) => {
    const exact = total > 0 ? (balance / total) * 100 : 0
    return { id, whole: Math.floor(exact), rest: exact - Math.floor(exact) }
  })
  const floored = shares.reduce((sum, { whole }) => sum + whole, 0)
  const missing = total > 0 ? 100 - floored : 0
  const roundedUp = new Set(
    [...shares]
      .sort((a, b) => b.rest - a.rest)
      .slice(0, missing)
      .map(({ id }) => id)
  )
  return Object.fromEntries(
    shares.map(({ id, whole }) => [id, roundedUp.has(id) ? whole + 1 : whole])
  )
}

/** What this month's card payments take of its limit, pending included. */
export function getCardSpent(entries: readonly FinanceEntry[], now: number) {
  const month = new Date(now).toISOString().slice(0, 7)
  return entries
    .filter(
      ({ accountId, status, date }) =>
        accountId === "card" && status !== "declined" && date.startsWith(month)
    )
    .reduce((sum, { amount }) => sum - amount, 0)
}

type Flows = { moneyIn: number; moneyOut: number }

function getFlows(entries: readonly FinanceEntry[]): Flows {
  return entries.reduce(
    (flows, { amount }) => ({
      moneyIn: flows.moneyIn + Math.max(0, amount),
      moneyOut: flows.moneyOut + Math.max(0, -amount),
    }),
    { moneyIn: 0, moneyOut: 0 }
  )
}

/** Months of cash left at the monthly net burn of those `days`. */
function getRunwayMonths(cash: number, flows: Flows, days: number) {
  const monthlyBurn = ((flows.moneyOut - flows.moneyIn) / days) * DAYS_PER_MONTH
  if (monthlyBurn <= 0) return Infinity
  return cash / monthlyBurn
}

/** Largest first, with "Other" last whatever it holds. */
function getSpending(entries: readonly FinanceEntry[]): SpendingCategory[] {
  const amounts = new Map<string, number>()
  for (const { amount, category } of entries) {
    if (amount >= 0 || category === "Payroll") continue
    amounts.set(category, (amounts.get(category) ?? 0) - amount)
  }
  return [...amounts]
    .map(([category, amount]) => ({ category, amount }))
    .sort(
      (a, b) =>
        Number(a.category === "Other") - Number(b.category === "Other") ||
        b.amount - a.amount
    )
}

/** Completed entries, with how many days before `now` they happened. */
function getLedger(entries: readonly FinanceEntry[], now: number) {
  const today = getDay(now)
  const dated = entries
    .filter(({ status }) => status === "completed")
    .map((entry) => ({ entry, age: today - getDay(Date.parse(entry.date)) }))
  return {
    /** The entries of `days` days, the last of them `offset` days ago. */
    getWindow: (days: number, offset = 0) =>
      dated
        .filter(({ age }) => age >= offset && age < offset + days)
        .map(({ entry }) => entry),
    /** Closing balances by age: today's first, one per day back to `days`. */
    getBalances: (balance: number, days: number) => {
      const nets = new Map<number, number>()
      for (const { entry, age } of dated) {
        nets.set(age, (nets.get(age) ?? 0) + entry.amount)
      }
      const balances = [balance]
      for (let age = 0; age < days; age++) {
        balances.push(balances[age] - (nets.get(age) ?? 0))
      }
      return balances
    },
  }
}

export function getFinanceOverview({
  period,
  entries,
  balance,
  now,
}: {
  period: FinancePeriod
  entries: readonly FinanceEntry[]
  /** The cash across every account today. */
  balance: number
  now: number
}): FinanceOverview {
  const { days, step, grain } = PERIOD_LENGTHS[period]
  const today = getDay(now)
  const ledger = getLedger(entries, now)
  const balances = ledger.getBalances(balance, days * 2)
  const points = Math.floor((days - 1) / step) + 1

  const cash = Array.from({ length: points }, (_, index): CashPoint => {
    const age = (points - 1 - index) * step
    return {
      date: formatDay(today - age),
      current: balances[age],
      previous: balances[age + days],
    }
  })

  const current = ledger.getWindow(days)
  const flows = getFlows(current)
  const previousFlows = getFlows(ledger.getWindow(days, days))
  const previousCash = balances[days]
  const payroll = getFlows(
    current.filter(({ category }) => category === "Payroll")
  ).moneyOut

  const runway = getRunwayMonths(
    balance,
    getFlows(ledger.getWindow(RUNWAY_DAYS)),
    RUNWAY_DAYS
  )
  const previousRunway = getRunwayMonths(
    previousCash,
    getFlows(ledger.getWindow(RUNWAY_DAYS, days)),
    RUNWAY_DAYS
  )
  const runwayChange =
    Number.isFinite(runway) && Number.isFinite(previousRunway)
      ? roundToTenth(runway - previousRunway)
      : 0

  return {
    grain,
    cash,
    previousCash,
    cashChange: getChange(balance, previousCash),
    moneyIn: flows.moneyIn,
    moneyOut: flows.moneyOut,
    payroll,
    spending: getSpending(current),
    metrics: [
      {
        id: "in",
        label: "Money in",
        value: formatMoneyCompact(flows.moneyIn),
        previous: formatMoneyCompact(previousFlows.moneyIn),
        change: getChange(flows.moneyIn, previousFlows.moneyIn),
        unit: "%",
        isGoodWhenUp: true,
      },
      {
        id: "out",
        label: "Money out",
        value: formatMoneyCompact(flows.moneyOut),
        previous: formatMoneyCompact(previousFlows.moneyOut),
        change: getChange(flows.moneyOut, previousFlows.moneyOut),
        unit: "%",
        isGoodWhenUp: false,
      },
      {
        id: "runway",
        label: "Runway",
        scope: `at ${RUNWAY_WEEKS}-week burn`,
        value: formatRunway(runway),
        previous: formatRunway(previousRunway),
        change: runwayChange,
        unit: " mo",
        isGoodWhenUp: true,
      },
    ],
  }
}

export function getSpendingScope(payroll: number) {
  if (payroll === 0) return "No payroll in this period"
  return `Without ${formatMoneyCompact(payroll)} of payroll`
}

/** What still waits, due soonest first and undated last. */
export function getWaitingApprovals(
  approvals: readonly FinanceApproval[],
  approvedIds: readonly string[]
) {
  return approvals
    .filter(({ id }) => !approvedIds.includes(id))
    .sort((a, b) => {
      if (a.due === b.due) return a.submitted.localeCompare(b.submitted)
      if (a.due === null) return 1
      if (b.due === null) return -1
      return a.due.localeCompare(b.due)
    })
}

export function getApprovalsLead(approvals: ReadonlyArray<{ amount: number }>) {
  const total = approvals.reduce((sum, { amount }) => sum + amount, 0)
  if (approvals.length === 0) return "No payments wait for you."
  if (approvals.length === 1) {
    return `1 payment waits for you, ${formatMoney(total)}.`
  }
  return `${approvals.length} payments wait for you, ${formatMoney(total)} in total.`
}

export function getDueStatus(
  { due, submitted }: Pick<FinanceApproval, "due" | "submitted">,
  now: number
) {
  if (due === null) {
    return { label: `Submitted ${formatDate(submitted)}`, isLate: false }
  }
  const daysLeft = getDay(Date.parse(due)) - getDay(now)
  if (daysLeft === 0) return { label: "Due today", isLate: false }
  const label = `Due ${formatDate(due)}`
  if (daysLeft > 0) return { label, isLate: false }
  const late = -daysLeft === 1 ? "1 day" : `${-daysLeft} days`
  return { label: `${label}, ${late} late`, isLate: true }
}

/** The payment an approval sends: pending today, until the bank posts it. */
export function toPayment(
  approval: FinanceApproval,
  now: number
): FinanceTransaction {
  return {
    id: `payment-${approval.id}`,
    payee: approval.payee,
    date: new Date(now).toISOString().slice(0, 10),
    amount: -approval.amount,
    accountId: "checking",
    category: approval.category,
    status: "pending",
  }
}

/** Newest first; payments just approved come before the rest of their day. */
export function getRecentTransactions({
  transactions,
  payments,
  count,
}: {
  transactions: readonly FinanceTransaction[]
  payments: readonly FinanceTransaction[]
  count: number
}) {
  return [...payments, ...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, count)
}
