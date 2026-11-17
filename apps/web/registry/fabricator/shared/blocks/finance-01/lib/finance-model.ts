// The numbers behind the finance home: periods, the cash line, the headline
// metrics and spending, and how money and changes are written. Pure, so the
// page only wires them to the components. Replace `PERIOD_FLOWS` and
// `BALANCE` with your ledger's totals.

export type FinancePeriod = "7d" | "30d" | "90d" | "12m"

export const FINANCE_PERIODS = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "12m", label: "12 months" },
] as const satisfies ReadonlyArray<{ value: FinancePeriod; label: string }>

export type DeltaUnit = "%" | " mo"

export type DeltaTone = "success" | "destructive" | "neutral"

export type FinanceMetric = {
  id: "cash" | "in" | "out" | "runway"
  label: string
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
  /** How often the cash line has a point: "Daily", "Weekly", "Monthly". */
  grain: string
  balance: number
  cashChange: number
  metrics: FinanceMetric[]
  cash: CashPoint[]
  spending: SpendingCategory[]
}

type Flow = { current: number; previous: number }

type PeriodFlows = {
  days: number
  points: number
  step: "day" | "week" | "month"
  moneyIn: Flow
  moneyOut: Flow
}

const GRAINS = { day: "Daily", week: "Weekly", month: "Monthly" } as const

const MINUS = "−"
const DAYS_PER_MONTH = 30.44
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

/** The balance across every account today, and the day the data ends. */
const BALANCE = 1_284_310
const TODAY = Date.UTC(2026, 10, 17)

const PERIOD_FLOWS: Record<FinancePeriod, PeriodFlows> = {
  "7d": {
    days: 7,
    points: 7,
    step: "day",
    moneyIn: { current: 64_200, previous: 57_900 },
    moneyOut: { current: 89_400, previous: 93_100 },
  },
  "30d": {
    days: 30,
    points: 30,
    step: "day",
    moneyIn: { current: 268_400, previous: 238_800 },
    moneyOut: { current: 391_200, previous: 403_700 },
  },
  "90d": {
    days: 90,
    points: 13,
    step: "week",
    moneyIn: { current: 772_600, previous: 671_300 },
    moneyOut: { current: 1_186_500, previous: 1_152_900 },
  },
  "12m": {
    days: 365,
    points: 12,
    step: "month",
    moneyIn: { current: 2_846_000, previous: 1_912_000 },
    moneyOut: { current: 4_512_000, previous: 3_388_000 },
  },
}

// Shares of money out, smallest last; the long tail is folded into "Other".
const SPENDING_SHARES = [
  { category: "Payroll", share: 0.58 },
  { category: "Cloud", share: 0.11 },
  { category: "Software", share: 0.09 },
  { category: "Office", share: 0.07 },
  { category: "Marketing", share: 0.06 },
  { category: "Contractors", share: 0.05 },
  { category: "Other", share: 0.04 },
]

export function isFinancePeriod(value: unknown): value is FinancePeriod {
  return FINANCE_PERIODS.some((period) => period.value === value)
}

export function getComparisonLabel(period: FinancePeriod) {
  const label = FINANCE_PERIODS.find(({ value }) => value === period)?.label
  return `Compared with the previous ${label}`
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

/** Months of cash left at the period's average monthly net burn. */
export function getRunwayMonths(
  cash: number,
  moneyIn: number,
  moneyOut: number,
  days: number
) {
  const monthlyBurn = ((moneyOut - moneyIn) / days) * DAYS_PER_MONTH
  if (monthlyBurn <= 0) return Infinity
  return cash / monthlyBurn
}

/** Short enough for a stat card two across on a phone. */
export function formatRunway(months: number) {
  if (!Number.isFinite(months)) return "No burn"
  return `${months.toFixed(1)} mo`
}

function formatDay(time: number) {
  const date = new Date(time)
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`
}

function getPointLabel(step: PeriodFlows["step"], stepsBack: number) {
  if (step === "month") {
    const month = new Date(TODAY).getUTCMonth() - stepsBack
    return MONTHS[(month + 12 * 2) % 12]
  }
  const days = step === "week" ? stepsBack * 7 : stepsBack
  return formatDay(TODAY - days * 86_400_000)
}

// A steady wobble that is the same on the server and in the browser, and
// zero at both ends so the line starts and ends on the real balances.
function getWobble(index: number, points: number, seed: number) {
  const t = index / (points - 1)
  const noise = Math.sin(index * 12.9898 + seed * 78.233) * 43_758.5453
  const fraction = noise - Math.floor(noise) - 0.5
  return fraction * Math.sin(Math.PI * t)
}

function getLine(
  start: number,
  end: number,
  points: number,
  seed: number
): number[] {
  const amplitude = Math.max(Math.abs(end - start), end * 0.04) * 0.35
  return Array.from({ length: points }, (_, index) => {
    const t = index / (points - 1)
    const value = start + (end - start) * t
    return Math.round(value + getWobble(index, points, seed) * amplitude)
  })
}

function getSpending(moneyOut: number): SpendingCategory[] {
  const rounded = SPENDING_SHARES.map(({ category, share }) => ({
    category,
    amount: Math.round(moneyOut * share),
  }))
  // Rounding leaves a few dollars over or under; the largest takes them.
  const remainder =
    moneyOut - rounded.reduce((sum, { amount }) => sum + amount, 0)
  rounded[0].amount += remainder
  return rounded.sort((a, b) => b.amount - a.amount)
}

export function getFinanceOverview(period: FinancePeriod): FinanceOverview {
  const { days, points, step, moneyIn, moneyOut } = PERIOD_FLOWS[period]
  const start = BALANCE - moneyIn.current + moneyOut.current
  const previousStart = start - moneyIn.previous + moneyOut.previous
  const current = getLine(start, BALANCE, points, 1)
  const previous = getLine(previousStart, start, points, 2)
  const cash = current.map((value, index) => ({
    date: getPointLabel(step, points - 1 - index),
    current: value,
    previous: previous[index],
  }))

  const runway = getRunwayMonths(
    BALANCE,
    moneyIn.current,
    moneyOut.current,
    days
  )
  const previousRunway = getRunwayMonths(
    start,
    moneyIn.previous,
    moneyOut.previous,
    days
  )
  const runwayChange =
    Number.isFinite(runway) && Number.isFinite(previousRunway)
      ? roundToTenth(runway - previousRunway)
      : 0
  const cashChange = getChange(BALANCE, start)

  return {
    grain: GRAINS[step],
    balance: BALANCE,
    cashChange,
    cash,
    spending: getSpending(moneyOut.current),
    metrics: [
      {
        id: "cash",
        label: "Total cash",
        value: formatMoneyCompact(BALANCE),
        previous: formatMoneyCompact(start),
        change: cashChange,
        unit: "%",
        isGoodWhenUp: true,
      },
      {
        id: "in",
        label: "Money in",
        value: formatMoneyCompact(moneyIn.current),
        previous: formatMoneyCompact(moneyIn.previous),
        change: getChange(moneyIn.current, moneyIn.previous),
        unit: "%",
        isGoodWhenUp: true,
      },
      {
        id: "out",
        label: "Money out",
        value: formatMoneyCompact(moneyOut.current),
        previous: formatMoneyCompact(moneyOut.previous),
        change: getChange(moneyOut.current, moneyOut.previous),
        unit: "%",
        isGoodWhenUp: false,
      },
      {
        id: "runway",
        label: "Runway",
        value: formatRunway(runway),
        previous: formatRunway(previousRunway),
        change: runwayChange,
        unit: " mo",
        isGoodWhenUp: true,
      },
    ],
  }
}

export function getApprovalSummary(
  approvals: ReadonlyArray<{ amount: number }>
) {
  if (approvals.length === 0) return "Nothing waiting"
  const total = approvals.reduce((sum, { amount }) => sum + amount, 0)
  return `${approvals.length} waiting, ${formatMoney(total, { cents: true })} in total`
}
