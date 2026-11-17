import {
  CloudflareIcon,
  DatadogIcon,
  FigmaIcon,
  GithubIcon,
  GoogleIcon,
  OpenaiIcon,
  StripeIcon,
  VercelIcon,
  type BrandIconComponent,
} from "@fabricator-ui/icons/brands"

// Sample records for the finance home. Replace them with your ledger's
// approvals, accounts and transactions.

export type FinanceCounterparty =
  | { kind: "company"; name: string; logo: BrandIconComponent }
  | { kind: "person"; name: string; initials: string }

export type FinanceApproval = {
  id: string
  payee: FinanceCounterparty
  detail: string
  amount: number
}

export type FinanceAccount = {
  id: string
  kind: "checking" | "savings" | "treasury"
  name: string
  detail: string
  balance: number
}

export type FinanceCard = {
  id: string
  name: string
  detail: string
  spent: number
  limit: number
}

export type FinanceTransactionStatus = "completed" | "pending" | "declined"

export type FinanceTransaction = {
  id: string
  payee: FinanceCounterparty
  date: string
  amount: number
  status: FinanceTransactionStatus
}

export const FINANCE_APPROVALS: FinanceApproval[] = [
  {
    id: "approval-figma",
    payee: { kind: "company", name: "Figma", logo: FigmaIcon },
    detail: "Annual renewal, 42 seats · Due Nov 21",
    amount: 18_900,
  },
  {
    id: "approval-vercel",
    payee: { kind: "company", name: "Vercel", logo: VercelIcon },
    detail: "Invoice INV-2291 · Due Nov 24",
    amount: 2_340,
  },
  {
    id: "approval-priya",
    payee: { kind: "person", name: "Priya Raman", initials: "PR" },
    detail: "Team offsite travel · Submitted Nov 15",
    amount: 1_186.4,
  },
  {
    id: "approval-github",
    payee: { kind: "company", name: "GitHub", logo: GithubIcon },
    detail: "Enterprise seats · Due Nov 30",
    amount: 2_100,
  },
]

export const FINANCE_ACCOUNTS: FinanceAccount[] = [
  {
    id: "checking",
    kind: "checking",
    name: "Checking",
    detail: "Operating ••4821",
    balance: 842_190,
  },
  {
    id: "treasury",
    kind: "treasury",
    name: "Treasury",
    detail: "T-bills, 4.1% yield",
    balance: 380_000,
  },
  {
    id: "savings",
    kind: "savings",
    name: "Savings",
    detail: "Reserve ••7730",
    balance: 62_120,
  },
]

export const FINANCE_CARD: FinanceCard = {
  id: "card",
  name: "Corporate card",
  detail: "••1047 · Resets Dec 1",
  spent: 31_240,
  limit: 50_000,
}

export const FINANCE_TRANSACTIONS: FinanceTransaction[] = [
  {
    id: "txn-stripe",
    payee: { kind: "company", name: "Stripe payout", logo: StripeIcon },
    date: "Nov 17",
    amount: 18_420.55,
    status: "completed",
  },
  {
    id: "txn-openai",
    payee: { kind: "company", name: "OpenAI", logo: OpenaiIcon },
    date: "Nov 16",
    amount: -3_412.8,
    status: "pending",
  },
  {
    id: "txn-cloudflare",
    payee: { kind: "company", name: "Cloudflare", logo: CloudflareIcon },
    date: "Nov 16",
    amount: -412.2,
    status: "declined",
  },
  {
    id: "txn-datadog",
    payee: { kind: "company", name: "Datadog", logo: DatadogIcon },
    date: "Nov 15",
    amount: -2_980,
    status: "completed",
  },
  {
    id: "txn-google",
    payee: { kind: "company", name: "Google Workspace", logo: GoogleIcon },
    date: "Nov 14",
    amount: -1_152,
    status: "completed",
  },
]
