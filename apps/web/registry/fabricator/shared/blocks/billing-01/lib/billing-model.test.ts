import { describe, expect, it } from "vitest"

import {
  BILLING_PLANS,
  formatCount,
  formatDay,
  formatMoney,
  formatSignedMoney,
  getBillingLead,
  getCharge,
  getExtraRunsCost,
  getInvoice,
  getNextInvoice,
  getPlanChange,
  getPlanDifferences,
  getProration,
  getTax,
  getUsageForecast,
  getVatIdError,
  getWaterfall,
  getYearlySaving,
  isBillingInterval,
  isVatIdValid,
  toEstimateDiff,
  type BillingAccount,
} from "@/registry/fabricator/shared/blocks/billing-01/lib/billing-model"

const NOW = new Date("2026-11-24T15:00:00Z")

const account: BillingAccount = {
  status: "active",
  planId: "team",
  interval: "month",
  seats: 15,
  people: 11,
  periodStart: new Date("2026-11-01T00:00:00Z"),
  periodEnd: new Date("2026-12-01T00:00:00Z"),
  extraRuns: "continue",
  runsUsed: 8240,
  runsPerDay: 800,
  storageUsed: 61,
  credit: { label: "Credit", detail: "October 14 outage", amount: 2400 },
  addedSeats: 0,
  scheduled: null,
  details: {
    company: "Acme Inc",
    address: "8 Hanover Quay, Dublin",
    country: "IE",
    vatId: "IE6388047V",
    email: "billing@acme.com",
  },
}

const details = account.details

describe("formatting", () => {
  it("writes cents in full", () => {
    expect(formatMoney(28211)).toBe("$282.11")
    expect(formatMoney(-2400)).toBe("−$24.00")
    expect(formatMoney(240_000)).toBe("$2,400.00")
  })

  it("drops cents only when asked and when there are none", () => {
    expect(formatMoney(48_000, { isWhole: true })).toBe("$480")
    expect(formatMoney(48_050, { isWhole: true })).toBe("$480.50")
  })

  it("signs a change", () => {
    expect(formatSignedMoney(1600)).toBe("+$16.00")
    expect(formatSignedMoney(-1600)).toBe("−$16.00")
    expect(formatSignedMoney(0)).toBe("$0.00")
  })

  it("writes dates in UTC, with the year only when it differs", () => {
    expect(formatDay(new Date("2026-12-01T00:00:00Z"), NOW)).toBe("December 1")
    expect(formatDay(new Date("2027-11-24T00:00:00Z"), NOW)).toBe(
      "November 24, 2027"
    )
  })

  it("groups counts", () => {
    expect(formatCount(8240)).toBe("8,240")
  })
})

describe("getProration", () => {
  it("counts today among the days left", () => {
    expect(getProration(account, NOW)).toEqual({ daysLeft: 7, daysTotal: 30 })
  })

  it("never goes below zero or over the period", () => {
    expect(getProration(account, new Date("2026-12-05T00:00:00Z"))).toEqual({
      daysLeft: 0,
      daysTotal: 30,
    })
    expect(getProration(account, new Date("2026-10-05T00:00:00Z"))).toEqual({
      daysLeft: 30,
      daysTotal: 30,
    })
  })
})

describe("getYearlySaving", () => {
  it("compares twelve months with one year", () => {
    expect(getYearlySaving("team", 15)).toBe(48_000)
    expect(getYearlySaving("starter", 3)).toBe(0)
  })
})

describe("getExtraRunsCost", () => {
  it("charges per thousand, rounded to the cent", () => {
    expect(getExtraRunsCost(3340)).toBe(1336)
    expect(getExtraRunsCost(0)).toBe(0)
    expect(getExtraRunsCost(-10)).toBe(0)
    expect(getExtraRunsCost(1)).toBe(0)
  })
})

describe("getUsageForecast", () => {
  it("finds the day the limit is reached and the total at the reset", () => {
    const forecast = getUsageForecast({
      used: 8240,
      limit: 10_000,
      perDay: 800,
      now: NOW,
      resetsOn: account.periodEnd,
    })
    expect(forecast.percent).toBe(82)
    expect(forecast.level).toBe("warning")
    expect(forecast.reachesOn?.toISOString()).toBe("2026-11-26T19:48:00.000Z")
    expect(forecast.atReset).toBe(13_340)
  })

  it("has no date when the period ends first or nothing is used", () => {
    const base = { limit: 10_000, now: NOW, resetsOn: account.periodEnd }
    expect(
      getUsageForecast({ ...base, used: 5000, perDay: 100 }).reachesOn
    ).toBeNull()
    expect(
      getUsageForecast({ ...base, used: 9000, perDay: 0 }).reachesOn
    ).toBeNull()
  })

  it("grades how close it is", () => {
    const base = { limit: 100, perDay: 0, now: NOW, resetsOn: NOW }
    expect(getUsageForecast({ ...base, used: 79 }).level).toBe("ok")
    expect(getUsageForecast({ ...base, used: 80 }).level).toBe("warning")
    expect(getUsageForecast({ ...base, used: 95 }).level).toBe("near")
    expect(getUsageForecast({ ...base, used: 100 }).level).toBe("full")
    expect(getUsageForecast({ ...base, used: 130 }).percent).toBe(100)
  })

  it("never rounds up to a full limit", () => {
    const base = { limit: 10_000, perDay: 0, now: NOW, resetsOn: NOW }
    expect(getUsageForecast({ ...base, used: 9999 }).percent).toBe(99)
  })
})

describe("getTax", () => {
  it("charges local VAT at home, with or without an ID", () => {
    expect(getTax(details).rate).toBe(23)
    expect(getTax({ ...details, vatId: "" }).rate).toBe(23)
  })

  it("reverses the charge for a company elsewhere in the EU", () => {
    const tax = getTax({ ...details, country: "DE", vatId: "DE811907980" })
    expect(tax.rate).toBe(0)
    expect(tax.detail).toBe("Reverse charge, DE811907980")
  })

  it("charges the local rate until the ID is there", () => {
    const tax = getTax({ ...details, country: "DE", vatId: "" })
    expect(tax.rate).toBe(19)
    expect(tax.canDrop).toBe(true)
  })

  it("charges nothing outside the EU", () => {
    expect(getTax({ ...details, country: "US", vatId: "" }).rate).toBe(0)
  })
})

describe("VAT ids", () => {
  it("reads the country's format, spaces and case aside", () => {
    expect(isVatIdValid("IE", "ie 6388047 v")).toBe(true)
    expect(isVatIdValid("DE", "DE811907980")).toBe(true)
    expect(isVatIdValid("DE", "DE8119079")).toBe(false)
    expect(isVatIdValid("DE", "IE6388047V")).toBe(false)
  })

  it("is optional, and says what one looks like", () => {
    expect(getVatIdError("DE", "")).toBeUndefined()
    expect(getVatIdError("DE", "123")).toBe(
      "A German VAT ID looks like DE811907980."
    )
  })
})

describe("getInvoice", () => {
  it("adds up: lines, tax and total", () => {
    const invoice = getInvoice({
      lines: [
        { id: "seats", label: "Team", detail: "", amount: 24_000 },
        { id: "credit", label: "Credit", detail: "", amount: -2400 },
      ],
      details,
    })
    expect(invoice.subtotal).toBe(21_600)
    expect(invoice.tax.amount).toBe(4968)
    expect(invoice.total).toBe(26_568)
  })

  it("never taxes or charges below zero", () => {
    const invoice = getInvoice({
      lines: [
        { id: "seats", label: "Team", detail: "", amount: 1000 },
        { id: "credit", label: "Credit", detail: "", amount: -2400 },
      ],
      details,
    })
    expect(invoice.total).toBe(0)
    expect(invoice.lines.reduce((sum, line) => sum + line.amount, 0)).toBe(0)
  })
})

describe("getNextInvoice", () => {
  it("takes next month's seats, this month's extra runs, credit and tax", () => {
    const invoice = getNextInvoice(account, NOW)
    expect(invoice.lines.map(({ id, amount }) => [id, amount])).toEqual([
      ["seats", 24_000],
      ["runs", 1336],
      ["credit", -2400],
    ])
    expect(invoice.tax.amount).toBe(5275)
    expect(invoice.total).toBe(28_211)
  })

  it("leaves extra runs out when they pause at the limit", () => {
    const invoice = getNextInvoice({ ...account, extraRuns: "pause" }, NOW)
    expect(invoice.lines.map(({ id }) => id)).toEqual(["seats", "credit"])
    expect(invoice.total).toBe(26_568)
  })

  it("adds the days left of a seat added now", () => {
    const invoice = getNextInvoice(
      { ...account, seats: 17, addedSeats: 2 },
      NOW
    )
    expect(invoice.lines.find(({ id }) => id === "added")?.amount).toBe(747)
    expect(invoice.lines.find(({ id }) => id === "seats")?.amount).toBe(27_200)
  })

  it("follows a scheduled change", () => {
    const invoice = getNextInvoice(
      {
        ...account,
        scheduled: { planId: "starter", interval: "month", seats: 3 },
      },
      NOW
    )
    expect(invoice.lines.find(({ id }) => id === "seats")).toBeUndefined()
  })
})

describe("toEstimateDiff", () => {
  it("compares the draft with what would be charged", () => {
    const diff = toEstimateDiff(account, { seats: 17, extraRuns: "pause" }, NOW)
    expect(diff.hasChanged).toBe(true)
    expect(diff.seatsAdded).toBe(2)
    expect(diff.addedNow).toBe(747)
    expect(diff.change).toBe(diff.next.total - diff.current.total)
  })

  it("charges nothing for the days left when seats go", () => {
    const diff = toEstimateDiff(
      account,
      { seats: 12, extraRuns: "continue" },
      NOW
    )
    expect(diff.seatsAdded).toBe(-3)
    expect(diff.addedNow).toBe(0)
    expect(diff.next.lines.find(({ id }) => id === "added")).toBeUndefined()
  })

  it("is empty without a change", () => {
    const diff = toEstimateDiff(
      account,
      { seats: 15, extraRuns: "continue" },
      NOW
    )
    expect(diff).toMatchObject({ hasChanged: false, change: 0 })
  })
})

describe("getWaterfall", () => {
  it("carries each amount from where the last one ended", () => {
    const invoice = getNextInvoice(account, NOW)
    const steps = getWaterfall(invoice)
    expect(steps.map(({ id }) => id)).toEqual([
      "seats",
      "runs",
      "credit",
      "tax",
      "total",
    ])
    expect(steps[0]).toMatchObject({ start: 0 })
    expect(steps[1].start).toBeCloseTo(steps[0].end)
    expect(steps[2].isCredit).toBe(true)
    expect(steps[2].end).toBeCloseTo(steps[1].end)
    expect(steps[3].start).toBeCloseTo(steps[2].start)
    expect(steps[4]).toMatchObject({ start: 0, end: 100 })
    for (const [index, step] of steps.slice(1).entries()) {
      expect(step.before).toBeCloseTo(steps[index].after)
    }
    expect(Math.max(...steps.map(({ end }) => end))).toBeLessThanOrEqual(100)
  })

  it("has no bars for an invoice of nothing", () => {
    const steps = getWaterfall(getInvoice({ lines: [], details }))
    expect(steps.every(({ start, end }) => start === 0 && end === 0)).toBe(true)
  })
})

describe("getPlanChange", () => {
  it("is nothing when nothing differs", () => {
    const change = getPlanChange(
      account,
      { planId: "team", interval: "month", seats: 15 },
      NOW
    )
    expect(change.kind).toBe("none")
  })

  it("charges the difference for the days left on an upgrade", () => {
    const change = getPlanChange(
      account,
      { planId: "business", interval: "month", seats: 15 },
      NOW
    )
    expect(change.kind).toBe("upgrade")
    expect(change.timing).toBe("now")
    expect(change.today.lines.map(({ amount }) => amount)).toEqual([
      9800, -5600,
    ])
    expect(change.today.subtotal).toBe(4200)
    expect(change.today.total).toBe(5166)
    expect(change.recurring.total).toBe(51_660)
    expect(change.renewsOn.toISOString()).toBe("2026-12-01T00:00:00.000Z")
    expect(
      change.today.lines.reduce((sum, line) => sum + line.amount, 0) +
        change.today.tax.amount
    ).toBe(change.today.total)
  })

  it("starts a new year today when moving to yearly", () => {
    const change = getPlanChange(
      account,
      { planId: "team", interval: "year", seats: 15 },
      NOW
    )
    expect(change.kind).toBe("yearly")
    expect(change.timing).toBe("now")
    expect(change.today.lines.map(({ amount }) => amount)).toEqual([
      240_000, -5600,
    ])
    expect(change.renewsOn.toISOString()).toBe("2027-11-24T00:00:00.000Z")
    expect(change.saving).toBe(48_000)
  })

  it("waits for the renewal to go down, and lists what must go first", () => {
    const change = getPlanChange(
      account,
      { planId: "starter", interval: "month", seats: 3 },
      NOW
    )
    expect(change.kind).toBe("downgrade")
    expect(change.timing).toBe("renewal")
    expect(change.today.total).toBe(0)
    expect(change.blockers.map(({ id }) => id)).toEqual(["people", "storage"])
    expect(change.blockers[0].title).toBe("Remove 8 people")
    expect(change.blockers[1].title).toBe("Remove 56 GB of files")
    expect(change.losses.length).toBeGreaterThan(0)
  })

  it("blocks fewer seats than people", () => {
    const change = getPlanChange(
      account,
      { planId: "team", interval: "month", seats: 9 },
      NOW
    )
    expect(change.kind).toBe("seats")
    expect(change.timing).toBe("renewal")
    expect(change.blockers.map(({ id }) => id)).toEqual(["people"])
  })

  it("charges the days left for more seats", () => {
    const change = getPlanChange(
      account,
      { planId: "team", interval: "month", seats: 20 },
      NOW
    )
    expect(change).toMatchObject({ kind: "seats", timing: "now" })
    expect(change.today.subtotal).toBe(1867)
  })

  it("waits for the renewal to leave yearly", () => {
    const yearly: BillingAccount = {
      ...account,
      interval: "year",
      periodStart: new Date("2026-03-01T00:00:00Z"),
      periodEnd: new Date("2027-03-01T00:00:00Z"),
    }
    const change = getPlanChange(
      yearly,
      { planId: "team", interval: "month", seats: 15 },
      NOW
    )
    expect(change).toMatchObject({ kind: "monthly", timing: "renewal" })
    expect(change.today.total).toBe(0)
  })
})

describe("getPlanDifferences", () => {
  it("marks each row as more, less or the same", () => {
    const rows = getPlanDifferences("team", "business")
    expect(rows.find(({ id }) => id === "runs")).toMatchObject({
      from: "10,000 runs a month",
      to: "50,000 runs a month",
      direction: "more",
    })
    expect(
      getPlanDifferences("team", "starter").find(({ id }) => id === "storage")
        ?.direction
    ).toBe("less")
    expect(
      getPlanDifferences("team", "team").every(
        ({ direction }) => direction === "same"
      )
    ).toBe(true)
  })
})

describe("getCharge", () => {
  it("is the price times the seats", () => {
    expect(getCharge({ planId: "team", interval: "year", seats: 15 })).toBe(
      240_000
    )
  })
})

describe("getBillingLead", () => {
  it("says what is true now", () => {
    expect(getBillingLead(account, NOW)).toBe(
      "Team plan, $282.11 on December 1."
    )
    expect(getBillingLead({ ...account, status: "canceled" }, NOW)).toBe(
      "Team plan until December 1, then nothing more to pay."
    )
    expect(
      getBillingLead(
        {
          ...account,
          status: "trial",
          periodEnd: new Date("2026-11-27T00:00:00Z"),
          credit: null,
          runsUsed: 1200,
          runsPerDay: 90,
        },
        NOW
      )
    ).toBe("Team trial, free until November 27.")
  })
})

describe("isBillingInterval", () => {
  it("guards a value from a control", () => {
    expect(isBillingInterval("year")).toBe(true)
    expect(isBillingInterval("week")).toBe(false)
  })
})

describe("BILLING_PLANS", () => {
  it("gets bigger as it gets dearer", () => {
    const prices = BILLING_PLANS.map(({ seatPrice }) => seatPrice.month)
    const runs = BILLING_PLANS.map(({ limits }) => limits.runs)
    expect(prices).toEqual([...prices].sort((a, b) => a - b))
    expect(runs).toEqual([...runs].sort((a, b) => a - b))
  })
})
