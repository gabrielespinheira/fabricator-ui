import { type BillingCard } from "@/registry/bases/__base__/blocks/billing-01/lib/billing-card-model"
import {
  getInvoice,
  type BillingAccount,
  type BillingDetails,
  type BillingInvoiceSum,
  type BillingLine,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"

// Sample records. Replace them with what your billing provider returns.

/** Fixed, so the server and the browser agree. */
export const SAMPLE_NOW = new Date("2026-11-24T15:00:00Z")

export type BillingPerson = { name: string; photo?: string }

function getPhoto(id: string) {
  return `https://images.unsplash.com/photo-${id}?w=160&h=160&fit=crop&auto=format&q=80`
}

export const BILLING_USER = {
  name: "Ada Lovelace",
  email: "ada@acme.com",
  avatarUrl: getPhoto("1580489944761-15a19d654956"),
}

export const BILLING_OWNER: BillingPerson = {
  name: "Maya Chen",
  photo: getPhoto("1534528741775-53994a69daeb"),
}

export const BILLING_PEOPLE: BillingPerson[] = [
  { name: "Ada Lovelace", photo: BILLING_USER.avatarUrl },
  BILLING_OWNER,
  { name: "Lucas Ferreira", photo: getPhoto("1500648767791-00dcc994a43e") },
  { name: "Daniel Okafor", photo: getPhoto("1507003211169-0a1dd7228f2d") },
  { name: "Emma Lindqvist", photo: getPhoto("1438761681033-6461ffad8d80") },
]

export type BillingInvoiceStatus = "paid" | "processing" | "failed" | "refunded"

export type BillingInvoiceRecord = BillingInvoiceSum & {
  id: string
  date: Date
  status: BillingInvoiceStatus
}

export type BillingState = {
  role: "owner" | "member"
  isLoading: boolean
  account: BillingAccount
  card: BillingCard | null
  invoices: BillingInvoiceRecord[]
}

const DETAILS: BillingDetails = {
  company: "Acme Inc",
  address: "8 Hanover Quay, Dublin",
  country: "IE",
  vatId: "IE6388047V",
  email: "billing@acme.com",
}

const ACCOUNT: BillingAccount = {
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
  details: DETAILS,
}

const CARD: BillingCard = {
  brand: "mastercard",
  last4: "4448",
  month: 12,
  year: 2026,
}

function toSeatLine(seats: number): BillingLine {
  return {
    id: "seats",
    label: "Team seats",
    detail: `${seats} × $16.00`,
    amount: seats * 1600,
  }
}

function toRecord(
  id: string,
  date: string,
  status: BillingInvoiceStatus,
  lines: BillingLine[]
): BillingInvoiceRecord {
  return {
    id,
    date: new Date(`${date}T00:00:00Z`),
    status,
    ...getInvoice({ lines, details: DETAILS }),
  }
}

const INVOICES: BillingInvoiceRecord[] = [
  toRecord("AC-1041", "2026-11-01", "paid", [
    toSeatLine(15),
    {
      id: "runs",
      label: "Extra runs",
      detail: "1,900, $4 per 1,000",
      amount: 760,
    },
  ]),
  toRecord("AC-1036", "2026-10-01", "paid", [toSeatLine(13)]),
  toRecord("AC-1031", "2026-09-01", "paid", [toSeatLine(13)]),
  toRecord("AC-1027", "2026-08-01", "refunded", [toSeatLine(11)]),
  toRecord("AC-1024", "2026-07-01", "paid", [toSeatLine(11)]),
]

const STATE: BillingState = {
  role: "owner",
  isLoading: false,
  account: ACCOUNT,
  card: CARD,
  invoices: INVOICES,
}

/** The situations this page is made for. Delete them with the sample data. */
export const BILLING_SAMPLES = [
  { value: "active", label: "Team plan" },
  { value: "declined", label: "Card declined" },
  { value: "trial", label: "Trial ending" },
  { value: "limit", label: "At the limit" },
  { value: "canceled", label: "Canceled" },
  { value: "tax", label: "VAT ID missing" },
  { value: "member", label: "Not an owner" },
  { value: "loading", label: "Loading" },
] as const

export type BillingSample = (typeof BILLING_SAMPLES)[number]["value"]

export function isBillingSample(value: unknown): value is BillingSample {
  return BILLING_SAMPLES.some((sample) => sample.value === value)
}

export function getSampleState(sample: BillingSample): BillingState {
  const [latest, ...older] = INVOICES
  switch (sample) {
    case "declined":
      return {
        ...STATE,
        account: { ...ACCOUNT, status: "past-due" },
        invoices: latest ? [{ ...latest, status: "failed" }, ...older] : older,
      }
    case "trial":
      return {
        ...STATE,
        account: {
          ...ACCOUNT,
          status: "trial",
          seats: 11,
          runsUsed: 1240,
          runsPerDay: 90,
          storageUsed: 4,
          credit: null,
          periodStart: new Date("2026-11-13T00:00:00Z"),
          periodEnd: new Date("2026-11-27T00:00:00Z"),
        },
        card: null,
        invoices: [],
      }
    case "limit":
      return {
        ...STATE,
        account: {
          ...ACCOUNT,
          runsUsed: 10_000,
          runsPerDay: 1180,
          extraRuns: "pause",
        },
      }
    case "canceled":
      return {
        ...STATE,
        account: { ...ACCOUNT, status: "canceled", extraRuns: "pause" },
      }
    case "tax":
      return {
        ...STATE,
        account: {
          ...ACCOUNT,
          details: {
            ...DETAILS,
            address: "Torstraße 140, Berlin",
            country: "DE",
            vatId: "",
          },
        },
      }
    case "member":
      return { ...STATE, role: "member" }
    case "loading":
      return { ...STATE, isLoading: true }
    default:
      return STATE
  }
}
