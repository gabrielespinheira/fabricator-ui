import {
  CloudflareIcon,
  DatadogIcon,
  FigmaIcon,
  GithubIcon,
  GoogleAdsIcon,
  GoogleIcon,
  HubspotIcon,
  OpenaiIcon,
  StripeIcon,
  VercelIcon,
} from "@fabricator-ui/icons/brands"

import { getLedgerHistory } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-ledger"
import {
  type FinanceAccount,
  type FinanceApproval,
  type FinanceCard,
  type FinanceEntry,
  type FinanceTransaction,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"

// Sample records for the overview. Replace them with your ledger's accounts,
// approvals and transactions. The sample has a fixed "now", so the page the
// server renders reads the same as the browser's.

export const SAMPLE_NOW = Date.UTC(2026, 10, 24, 9, 41)

/** How many days the transactions below cover, today included. */
const LISTED_DAYS = 7
/** Two years, for 12 months against the 12 before them. */
const HISTORY_DAYS = 735

export const FINANCE_USER = {
  name: "Ada Lovelace",
  email: "ada@acme.com",
  avatarUrl:
    "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=160&h=160&fit=crop&auto=format&q=80",
}

export const FINANCE_ACCOUNTS: FinanceAccount[] = [
  {
    id: "checking",
    name: "Checking",
    detail: "Operating ••4821",
    balance: 842_190,
  },
  {
    id: "treasury",
    name: "Treasury",
    detail: "T-bills, 4.1% yield",
    balance: 380_000,
  },
  {
    id: "savings",
    name: "Savings",
    detail: "Reserve ••7730",
    balance: 62_120,
  },
]

/** Settles from Checking each day, so its payments are money out too. */
export const FINANCE_CARD: FinanceCard = {
  id: "card",
  name: "Corporate card",
  number: "••1047",
  detail: "••1047, resets Dec 1",
  limit: 120_000,
}

export const FINANCE_APPROVALS: FinanceApproval[] = [
  {
    id: "approval-figma",
    payee: { kind: "brand", name: "Figma", logo: FigmaIcon },
    detail: "Annual renewal, 42 seats",
    due: "2026-11-21",
    submitted: "2026-11-09",
    amount: 18_900,
    category: "Software",
  },
  {
    id: "approval-vercel",
    payee: { kind: "brand", name: "Vercel", logo: VercelIcon },
    detail: "Invoice INV-2291",
    due: "2026-11-24",
    submitted: "2026-11-10",
    amount: 2_340,
    category: "Cloud",
  },
  {
    id: "approval-github",
    payee: { kind: "brand", name: "GitHub", logo: GithubIcon },
    detail: "Enterprise seats",
    due: "2026-11-30",
    submitted: "2026-11-16",
    amount: 2_100,
    category: "Software",
  },
  {
    id: "approval-priya",
    payee: { kind: "initials", name: "Priya Raman", initials: "PR" },
    detail: "Team offsite travel",
    due: null,
    submitted: "2026-11-22",
    amount: 1_186.4,
    category: "Other",
  },
]

export const FINANCE_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: "txn-stripe-24",
    payee: { kind: "brand", name: "Stripe payout", logo: StripeIcon },
    date: "2026-11-24",
    amount: 104_420.55,
    accountId: "checking",
    category: "Revenue",
    status: "completed",
  },
  {
    id: "txn-openai",
    payee: { kind: "brand", name: "OpenAI", logo: OpenaiIcon },
    date: "2026-11-24",
    amount: -3_412.8,
    accountId: "card",
    category: "Software",
    status: "pending",
  },
  {
    id: "txn-cloudflare",
    payee: { kind: "brand", name: "Cloudflare", logo: CloudflareIcon },
    date: "2026-11-23",
    amount: -412.2,
    accountId: "card",
    category: "Cloud",
    status: "declined",
  },
  {
    id: "txn-google-ads",
    payee: { kind: "brand", name: "Google Ads", logo: GoogleAdsIcon },
    date: "2026-11-23",
    amount: -6_840,
    accountId: "card",
    category: "Marketing",
    status: "completed",
  },
  {
    id: "txn-interest",
    payee: { kind: "initials", name: "T-bill interest", initials: "TI" },
    date: "2026-11-23",
    amount: 1_298.36,
    accountId: "treasury",
    category: "Interest",
    status: "completed",
  },
  {
    id: "txn-harrow",
    payee: {
      kind: "initials",
      name: "Harrow & Finch Chartered Accountants",
      initials: "HF",
    },
    date: "2026-11-20",
    amount: -9_600,
    accountId: "checking",
    category: "Contractors",
    status: "completed",
  },
  {
    id: "txn-stripe-20",
    payee: { kind: "brand", name: "Stripe payout", logo: StripeIcon },
    date: "2026-11-20",
    amount: 97_905.2,
    accountId: "checking",
    category: "Revenue",
    status: "completed",
  },
  {
    id: "txn-datadog",
    payee: { kind: "brand", name: "Datadog", logo: DatadogIcon },
    date: "2026-11-19",
    amount: -7_980,
    accountId: "card",
    category: "Cloud",
    status: "completed",
  },
  {
    id: "txn-lumen",
    payee: { kind: "initials", name: "Lumen Studio", initials: "LS" },
    date: "2026-11-19",
    amount: -14_500,
    accountId: "checking",
    category: "Contractors",
    status: "completed",
  },
  {
    id: "txn-hubspot",
    payee: { kind: "brand", name: "HubSpot", logo: HubspotIcon },
    date: "2026-11-18",
    amount: -4_860,
    accountId: "card",
    category: "Marketing",
    status: "completed",
  },
  {
    id: "txn-google",
    payee: { kind: "brand", name: "Google Workspace", logo: GoogleIcon },
    date: "2026-11-18",
    amount: -1_152,
    accountId: "card",
    category: "Software",
    status: "completed",
  },
  {
    id: "txn-insurance",
    payee: { kind: "initials", name: "Beacon Insurance", initials: "BI" },
    date: "2026-11-18",
    amount: -22_640,
    accountId: "checking",
    category: "Other",
    status: "completed",
  },
]

/** The ledger before the transactions above. */
const FINANCE_HISTORY = getLedgerHistory({
  now: SAMPLE_NOW,
  from: LISTED_DAYS,
  to: HISTORY_DAYS,
})

/** Every movement of money, from the listed transactions back two years. */
export function getFinanceEntries(
  transactions: readonly FinanceTransaction[]
): FinanceEntry[] {
  return [...transactions, ...FINANCE_HISTORY]
}

export const FINANCE_ENTRIES = getFinanceEntries(FINANCE_TRANSACTIONS)
