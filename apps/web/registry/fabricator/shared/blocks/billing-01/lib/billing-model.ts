// Every amount is in cents and every date is read in UTC, so a sum on screen
// is the sum that is charged. Pure: pass `now` in.

export type BillingPlanId = "starter" | "team" | "business"
export type BillingInterval = "month" | "year"
export type BillingStatus = "active" | "trial" | "past-due" | "canceled"
/** What happens to automations at the plan's limit. */
export type BillingExtraRuns = "continue" | "pause"
export type BillingCountry = "IE" | "DE" | "NL" | "PT" | "US"

export type BillingPlan = {
  id: BillingPlanId
  name: string
  summary: string
  /** Cents for a seat, per interval. */
  seatPrice: Record<BillingInterval, number>
  limits: { seats: number | null; runs: number; storage: number }
  history: string
  signIn: string
  support: string
}

export type BillingSelection = {
  planId: BillingPlanId
  interval: BillingInterval
  seats: number
}

export type BillingDetails = {
  company: string
  address: string
  country: BillingCountry
  vatId: string
  email: string
}

export type BillingAccount = BillingSelection & {
  status: BillingStatus
  /** People who hold a seat. */
  people: number
  periodStart: Date
  periodEnd: Date
  extraRuns: BillingExtraRuns
  runsUsed: number
  /** The average of the last seven days. */
  runsPerDay: number
  storageUsed: number
  credit: { label: string; detail: string; amount: number } | null
  /** Seats added in this period, whose days left are still to be charged. */
  addedSeats: number
  /** A change that waits for the renewal. */
  scheduled: BillingSelection | null
  details: BillingDetails
}

export type BillingLine = {
  id: string
  label: string
  detail: string
  amount: number
}

export type BillingTax = {
  rate: number
  detail: string
  /** A VAT ID would take the tax off. */
  canDrop: boolean
}

export type BillingInvoiceSum = {
  lines: BillingLine[]
  subtotal: number
  tax: BillingTax & { amount: number }
  total: number
}

export type BillingForecast = {
  percent: number
  level: "ok" | "warning" | "near" | "full"
  /** Null when the period ends first. */
  reachesOn: Date | null
  atReset: number
}

const DAY = 86_400_000
const EXTRA_RUNS_PRICE = 400
const EXTRA_RUNS_UNIT = 1000

export const BILLING_PLANS: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    summary: "Try it with a small group",
    seatPrice: { month: 0, year: 0 },
    limits: { seats: 3, runs: 1000, storage: 5 },
    history: "7 days of history",
    signIn: "Email sign-in",
    support: "Community help",
  },
  {
    id: "team",
    name: "Team",
    summary: "Run one team's work",
    seatPrice: { month: 1600, year: 16_000 },
    limits: { seats: 50, runs: 10_000, storage: 100 },
    history: "90 days of history",
    signIn: "Google sign-in",
    support: "Email help in a day",
  },
  {
    id: "business",
    name: "Business",
    summary: "Several teams, with controls",
    seatPrice: { month: 2800, year: 28_000 },
    limits: { seats: null, runs: 50_000, storage: 1000 },
    history: "2 years of history",
    signIn: "SAML sign-in",
    support: "Chat help in an hour",
  },
]

export const BILLING_INTERVALS: { value: BillingInterval; label: string }[] = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
]

type CountryRule = {
  name: string
  adjective: string
  rate: number
  inEu: boolean
  vatPattern: RegExp | null
  vatExample: string
}

const COUNTRY_RULES: Record<BillingCountry, CountryRule> = {
  IE: {
    name: "Ireland",
    adjective: "An Irish",
    rate: 23,
    inEu: true,
    vatPattern: /^IE\d{7}[A-Z]{1,2}$/,
    vatExample: "IE6388047V",
  },
  DE: {
    name: "Germany",
    adjective: "A German",
    rate: 19,
    inEu: true,
    vatPattern: /^DE\d{9}$/,
    vatExample: "DE811907980",
  },
  NL: {
    name: "Netherlands",
    adjective: "A Dutch",
    rate: 21,
    inEu: true,
    vatPattern: /^NL\d{9}B\d{2}$/,
    vatExample: "NL004495445B01",
  },
  PT: {
    name: "Portugal",
    adjective: "A Portuguese",
    rate: 23,
    inEu: true,
    vatPattern: /^PT\d{9}$/,
    vatExample: "PT517204318",
  },
  US: {
    name: "United States",
    adjective: "A US",
    rate: 0,
    inEu: false,
    vatPattern: null,
    vatExample: "",
  },
}

// Where the seller is: a company there always pays local VAT.
const HOME_COUNTRY: BillingCountry = "IE"

export const BILLING_COUNTRIES = (
  ["DE", "IE", "NL", "PT", "US"] satisfies BillingCountry[]
).map((value) => ({ value, label: COUNTRY_RULES[value].name }))

export function isBillingInterval(value: unknown): value is BillingInterval {
  return value === "month" || value === "year"
}

export function isBillingCountry(value: unknown): value is BillingCountry {
  return BILLING_COUNTRIES.some((country) => country.value === value)
}

export function isBillingPlanId(value: unknown): value is BillingPlanId {
  return BILLING_PLANS.some((plan) => plan.id === value)
}

export function isBillingExtraRuns(value: unknown): value is BillingExtraRuns {
  return value === "continue" || value === "pause"
}

export function getPlan(id: BillingPlanId) {
  return BILLING_PLANS.find((plan) => plan.id === id) ?? BILLING_PLANS[0]
}

export function getCountryName(country: BillingCountry) {
  return COUNTRY_RULES[country].name
}

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
})
const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
})
const counts = new Intl.NumberFormat("en-US")

export function formatMoney(
  cents: number,
  { isWhole = false }: { isWhole?: boolean } = {}
) {
  const value = Math.abs(cents) / 100
  const format = isWhole && cents % 100 === 0 ? wholeDollars : dollars
  return `${cents < 0 ? "−" : ""}${format.format(value)}`
}

export function formatSignedMoney(cents: number) {
  return cents > 0 ? `+${formatMoney(cents)}` : formatMoney(cents)
}

export function formatCount(value: number) {
  return counts.format(value)
}

export function formatDay(date: Date, now: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "UTC",
    ...(date.getUTCFullYear() !== now.getUTCFullYear() && { year: "numeric" }),
  }).format(date)
}

export function formatWeekday(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(date)
}

/** "1 seat", "15 seats". */
export function formatQuantity(value: number, one: string, many: string) {
  return `${formatCount(value)} ${value === 1 ? one : many}`
}

export function formatStorage(gigabytes: number) {
  return gigabytes >= 1000 ? `${gigabytes / 1000} TB` : `${gigabytes} GB`
}

/** What one interval costs before tax. */
export function getCharge({ planId, interval, seats }: BillingSelection) {
  return getPlan(planId).seatPrice[interval] * seats
}

export function getYearlySaving(planId: BillingPlanId, seats: number) {
  return (
    getCharge({ planId, interval: "month", seats }) * 12 -
    getCharge({ planId, interval: "year", seats })
  )
}

function startOfDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

/** Days left in the period, today included, as a charge counts them. */
export function getProration(
  { periodStart, periodEnd }: Pick<BillingAccount, "periodStart" | "periodEnd">,
  now: Date
) {
  const daysTotal = Math.round(
    (periodEnd.getTime() - periodStart.getTime()) / DAY
  )
  const daysLeft = Math.round((periodEnd.getTime() - startOfDay(now)) / DAY)
  return { daysTotal, daysLeft: Math.min(daysTotal, Math.max(0, daysLeft)) }
}

function prorate(amount: number, account: BillingAccount, now: Date) {
  const { daysLeft, daysTotal } = getProration(account, now)
  return Math.round((amount * daysLeft) / daysTotal)
}

export function getExtraRunsCost(runs: number) {
  if (runs <= 0) return 0
  return Math.round((runs / EXTRA_RUNS_UNIT) * EXTRA_RUNS_PRICE)
}

export function getExtraRunsRate() {
  return `${formatMoney(EXTRA_RUNS_PRICE, { isWhole: true })} per ${formatCount(EXTRA_RUNS_UNIT)}`
}

/** Usage starts over on the first of the month, whatever the interval. */
export function getUsageReset(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
}

export function getUsageForecast({
  used,
  limit,
  perDay,
  now,
  resetsOn,
}: {
  used: number
  limit: number
  perDay: number
  now: Date
  resetsOn: Date
}): BillingForecast {
  const share = (used / limit) * 100
  const percent = Math.min(100, share >= 100 ? 100 : Math.floor(share))
  const daysToReset = Math.max(0, (resetsOn.getTime() - now.getTime()) / DAY)
  const reachesAt =
    perDay > 0 && used < limit
      ? now.getTime() + ((limit - used) / perDay) * DAY
      : null
  const reachesOn =
    reachesAt !== null && reachesAt < resetsOn.getTime()
      ? new Date(reachesAt)
      : null
  return {
    percent,
    level:
      share >= 100
        ? "full"
        : share >= 95
          ? "near"
          : share >= 80
            ? "warning"
            : "ok",
    reachesOn,
    atReset: Math.round(used + perDay * daysToReset),
  }
}

function normalizeVatId(vatId: string) {
  return vatId.replace(/[\s.-]/g, "").toUpperCase()
}

export function isVatIdValid(country: BillingCountry, vatId: string) {
  return COUNTRY_RULES[country].vatPattern?.test(normalizeVatId(vatId)) ?? false
}

export function canHaveVatId(country: BillingCountry) {
  return COUNTRY_RULES[country].vatPattern !== null
}

export function getVatIdExample(country: BillingCountry) {
  return COUNTRY_RULES[country].vatExample
}

export function getVatIdError(country: BillingCountry, vatId: string) {
  if (vatId.trim() === "" || !canHaveVatId(country)) return undefined
  if (isVatIdValid(country, vatId)) return undefined
  const { adjective, vatExample } = COUNTRY_RULES[country]
  return `${adjective} VAT ID looks like ${vatExample}.`
}

export function getTax({
  country,
  vatId,
}: Pick<BillingDetails, "country" | "vatId">): BillingTax {
  const rule = COUNTRY_RULES[country]
  if (!rule.inEu) {
    return { rate: 0, detail: `None in the ${rule.name}`, canDrop: false }
  }
  if (country === HOME_COUNTRY) {
    return {
      rate: rule.rate,
      detail: `${rule.rate}%, ${rule.name}`,
      canDrop: false,
    }
  }
  if (isVatIdValid(country, vatId)) {
    return {
      rate: 0,
      detail: `Reverse charge, ${normalizeVatId(vatId)}`,
      canDrop: false,
    }
  }
  return {
    rate: rule.rate,
    detail: `${rule.rate}%, ${rule.name}, no VAT ID`,
    canDrop: true,
  }
}

/** Lines, tax and total. A credit covers the charges and no more. */
export function getInvoice({
  lines,
  details,
}: {
  lines: BillingLine[]
  details: Pick<BillingDetails, "country" | "vatId">
}): BillingInvoiceSum {
  let left = lines.reduce((sum, { amount }) => sum + Math.max(0, amount), 0)
  const clamped = lines.map((line) => {
    if (line.amount >= 0) return line
    const amount = Math.max(-left, line.amount)
    left += amount
    return { ...line, amount }
  })
  const subtotal = left
  const tax = getTax(details)
  const amount = Math.round((subtotal * tax.rate) / 100)
  return {
    lines: clamped,
    subtotal,
    tax: { ...tax, amount },
    total: subtotal + amount,
  }
}

/** A yearly plan still gets a monthly invoice for what it used. */
export function getInvoiceDate(account: BillingAccount, now: Date) {
  const reset = getUsageReset(now)
  if (account.status === "trial") return account.periodEnd
  return account.periodEnd < reset ? account.periodEnd : reset
}

export function getNextInvoice(
  account: BillingAccount,
  now: Date
): BillingInvoiceSum {
  const isEnding = account.status === "canceled"
  const invoiceDate = getInvoiceDate(account, now)
  const isRenewal = invoiceDate.getTime() === account.periodEnd.getTime()
  const renewal = account.scheduled ?? account
  const plan = getPlan(renewal.planId)
  const lines: BillingLine[] = []

  const seatsAmount = getCharge(renewal)
  if (isRenewal && !isEnding && seatsAmount > 0) {
    lines.push({
      id: "seats",
      label: `${plan.name} seats`,
      detail: `${renewal.seats} × ${formatMoney(plan.seatPrice[renewal.interval])}`,
      amount: seatsAmount,
    })
  }

  if (account.addedSeats > 0) {
    const { daysLeft, daysTotal } = getProration(account, now)
    lines.push({
      id: "added",
      label: `${formatQuantity(account.addedSeats, "seat", "seats")} added`,
      detail: `${daysLeft} of ${daysTotal} days left`,
      amount: prorate(
        getCharge({ ...account, seats: account.addedSeats }),
        account,
        now
      ),
    })
  }

  const { limits } = getPlan(account.planId)
  const forecast = getUsageForecast({
    used: account.runsUsed,
    limit: limits.runs,
    perDay: account.runsPerDay,
    now,
    resetsOn: invoiceDate,
  })
  const extraRuns = forecast.atReset - limits.runs
  if (account.extraRuns === "continue" && extraRuns > 0) {
    lines.push({
      id: "runs",
      label: "Extra runs",
      detail: `About ${formatCount(extraRuns)}, ${getExtraRunsRate()}`,
      amount: getExtraRunsCost(extraRuns),
    })
  }

  if (account.credit) {
    const { label, detail, amount } = account.credit
    lines.push({ id: "credit", label, detail, amount: -amount })
  }

  return getInvoice({ lines, details: account.details })
}

export type BillingEstimate = Pick<BillingAccount, "seats" | "extraRuns">

/** What the next invoice becomes if these choices are kept. */
export function toEstimateDiff(
  account: BillingAccount,
  draft: BillingEstimate,
  now: Date
) {
  const current = getNextInvoice(account, now)
  const seatsAdded = draft.seats - account.seats
  const next = getNextInvoice(
    {
      ...account,
      ...draft,
      addedSeats: Math.max(0, account.addedSeats + seatsAdded),
    },
    now
  )
  return {
    current,
    next,
    seatsAdded,
    addedNow:
      seatsAdded > 0
        ? prorate(getCharge({ ...account, seats: seatsAdded }), account, now)
        : 0,
    change: next.total - current.total,
    hasChanged: seatsAdded !== 0 || draft.extraRuns !== account.extraRuns,
  }
}

export type BillingWaterfallStep = {
  id: string
  label: string
  detail: string
  amount: number
  /** Percent of the widest point. */
  start: number
  end: number
  /** Where the running sum stands before and after it. */
  before: number
  after: number
  isCredit: boolean
  isTotal: boolean
}

/** The lines, with the ones a change took away kept in place at nothing. */
function keepRemovedLines(lines: BillingLine[], before: BillingLine[]) {
  return before.reduce<BillingLine[]>((kept, line, index) => {
    if (kept.some(({ id }) => id === line.id)) return kept
    const previous = before[index - 1]?.id
    const at = kept.findIndex(({ id }) => id === previous) + 1
    const gone = { ...line, detail: "None", amount: 0 }
    return [...kept.slice(0, at), gone, ...kept.slice(at)]
  }, lines)
}

/** Each line as a bar that starts where the one above it ended. */
export function getWaterfall(
  { lines, tax, total }: BillingInvoiceSum,
  before?: BillingInvoiceSum
): BillingWaterfallStep[] {
  const rows = [
    ...keepRemovedLines(lines, before?.lines ?? []),
    { id: "tax", label: "VAT", detail: tax.detail, amount: tax.amount },
  ]
  let running = 0
  const spans = rows.map((row) => {
    const from = running
    running += row.amount
    return { row, from, to: running }
  })
  const widest = Math.max(total, ...spans.flatMap(({ from, to }) => [from, to]))
  const toPercent = (value: number) => (widest > 0 ? (value / widest) * 100 : 0)
  const steps = spans.map(({ row, from, to }) => ({
    ...row,
    start: toPercent(Math.min(from, to)),
    end: toPercent(Math.max(from, to)),
    before: toPercent(from),
    after: toPercent(to),
    isCredit: row.amount < 0,
    isTotal: false,
  }))
  return [
    ...steps,
    {
      id: "total",
      label: "Total",
      detail: "",
      amount: total,
      start: 0,
      end: toPercent(total),
      before: toPercent(total),
      after: toPercent(total),
      isCredit: false,
      isTotal: true,
    },
  ]
}

export type BillingDifference = {
  id: string
  label: string
  from: string
  to: string
  direction: "more" | "less" | "same"
}

const DIFFERENCE_ROWS: {
  id: string
  label: string
  write: (plan: BillingPlan) => string
  rank: (plan: BillingPlan) => number
}[] = [
  {
    id: "seats",
    label: "Seats",
    write: ({ limits }) =>
      limits.seats === null
        ? "Any number of seats"
        : `Up to ${limits.seats} seats`,
    rank: ({ limits }) => limits.seats ?? Number.POSITIVE_INFINITY,
  },
  {
    id: "runs",
    label: "Automation runs",
    write: ({ limits }) => `${formatCount(limits.runs)} runs a month`,
    rank: ({ limits }) => limits.runs,
  },
  {
    id: "storage",
    label: "Storage",
    write: ({ limits }) => `${formatStorage(limits.storage)} of files`,
    rank: ({ limits }) => limits.storage,
  },
  {
    id: "history",
    label: "History",
    write: ({ history }) => history,
    rank: (plan) => BILLING_PLANS.indexOf(plan),
  },
  {
    id: "sign-in",
    label: "Sign-in",
    write: ({ signIn }) => signIn,
    rank: (plan) => BILLING_PLANS.indexOf(plan),
  },
  {
    id: "support",
    label: "Support",
    write: ({ support }) => support,
    rank: (plan) => BILLING_PLANS.indexOf(plan),
  },
]

export function getPlanDifferences(
  fromId: BillingPlanId,
  toId: BillingPlanId
): BillingDifference[] {
  const from = getPlan(fromId)
  const to = getPlan(toId)
  return DIFFERENCE_ROWS.map(({ id, label, write, rank }) => ({
    id,
    label,
    from: write(from),
    to: write(to),
    direction:
      rank(to) === rank(from)
        ? "same"
        : rank(to) > rank(from)
          ? "more"
          : "less",
  }))
}

export type BillingBlocker = { id: string; title: string; detail: string }

/** What the new plan has no room for. */
export function getBlockers(
  account: BillingAccount,
  { planId, seats }: BillingSelection
): BillingBlocker[] {
  const { name, limits } = getPlan(planId)
  const room = Math.min(seats, limits.seats ?? seats)
  const blockers: BillingBlocker[] = []
  if (account.people > room) {
    const extra = account.people - room
    blockers.push({
      id: "people",
      title: `Remove ${formatQuantity(extra, "person", "people")}`,
      detail: `${account.people} people have a seat, and there would be ${room}.`,
    })
  }
  if (account.storageUsed > limits.storage) {
    blockers.push({
      id: "storage",
      title: `Remove ${formatStorage(account.storageUsed - limits.storage)} of files`,
      detail: `${formatStorage(account.storageUsed)} are stored, and ${name} holds ${formatStorage(limits.storage)}.`,
    })
  }
  return blockers
}

export type BillingPlanChange = {
  kind: "none" | "upgrade" | "downgrade" | "yearly" | "monthly" | "seats"
  timing: "now" | "renewal"
  today: BillingInvoiceSum
  /** One interval on the new terms, tax included. */
  recurring: BillingInvoiceSum
  renewsOn: Date
  /** Yearly over monthly, when that is the change. */
  saving: number
  blockers: BillingBlocker[]
  losses: BillingDifference[]
}

function getChangeKind(
  from: BillingSelection,
  to: BillingSelection
): BillingPlanChange["kind"] {
  const fromRank = BILLING_PLANS.findIndex(({ id }) => id === from.planId)
  const toRank = BILLING_PLANS.findIndex(({ id }) => id === to.planId)
  if (toRank > fromRank) return "upgrade"
  if (toRank < fromRank) return "downgrade"
  if (from.interval !== to.interval) {
    return to.interval === "year" ? "yearly" : "monthly"
  }
  return from.seats === to.seats ? "none" : "seats"
}

function addYear(date: Date) {
  const start = new Date(startOfDay(date))
  start.setUTCFullYear(start.getUTCFullYear() + 1)
  return start
}

function getLinesToday(
  account: BillingAccount,
  to: BillingSelection,
  now: Date,
  isNewPeriod: boolean
): BillingLine[] {
  const { daysLeft, daysTotal } = getProration(account, now)
  const days = `${daysLeft} of ${daysTotal} days`
  const plan = getPlan(to.planId)
  const seats = formatQuantity(to.seats, "seat", "seats")
  const isSamePlan = to.planId === account.planId
  if (isSamePlan && to.interval === account.interval) {
    const added = to.seats - account.seats
    return [
      {
        id: "seats",
        label: `${formatQuantity(added, "seat", "seats")} more`,
        detail: days,
        amount: prorate(getCharge({ ...to, seats: added }), account, now),
      },
    ]
  }
  const charge: BillingLine = isNewPeriod
    ? {
        id: "charge",
        label: `${plan.name}, ${seats}`,
        detail: "One year from today",
        amount: getCharge(to),
      }
    : {
        id: "charge",
        label: `${plan.name}, ${seats}`,
        detail: days,
        amount: prorate(getCharge(to), account, now),
      }
  const unused =
    account.status === "trial" ? 0 : prorate(getCharge(account), account, now)
  if (unused === 0) return [charge]
  return [
    charge,
    {
      id: "unused",
      label: `Unused ${getPlan(account.planId).name} time`,
      detail: days,
      amount: -unused,
    },
  ]
}

/** What a change costs today, what it costs after, and what stands in its way. */
export function getPlanChange(
  account: BillingAccount,
  to: BillingSelection,
  now: Date
): BillingPlanChange {
  const kind = getChangeKind(account, to)
  const isFewerSeats = to.seats < account.seats
  const timing =
    kind === "downgrade" ||
    kind === "monthly" ||
    kind === "none" ||
    (kind === "seats" && isFewerSeats)
      ? "renewal"
      : "now"
  const isNewPeriod =
    timing === "now" && to.interval === "year" && account.interval === "month"
  const plan = getPlan(to.planId)
  return {
    kind,
    timing,
    today: getInvoice({
      lines:
        timing === "now" ? getLinesToday(account, to, now, isNewPeriod) : [],
      details: account.details,
    }),
    recurring: getInvoice({
      lines: [
        {
          id: "seats",
          label: plan.name,
          detail: formatQuantity(to.seats, "seat", "seats"),
          amount: getCharge(to),
        },
      ],
      details: account.details,
    }),
    renewsOn: isNewPeriod ? addYear(now) : account.periodEnd,
    saving: to.interval === "year" ? getYearlySaving(to.planId, to.seats) : 0,
    blockers: kind === "none" ? [] : getBlockers(account, to),
    losses: getPlanDifferences(account.planId, to.planId).filter(
      ({ direction }) => direction === "less"
    ),
  }
}

export function getBillingLead(account: BillingAccount, now: Date) {
  const { name } = getPlan(account.planId)
  const ends = formatDay(account.periodEnd, now)
  if (account.status === "canceled") {
    return `${name} plan until ${ends}, then nothing more to pay.`
  }
  if (account.status === "trial") return `${name} trial, free until ${ends}.`
  const { total } = getNextInvoice(account, now)
  const date = formatDay(getInvoiceDate(account, now), now)
  return `${name} plan, ${formatMoney(total)} on ${date}.`
}
