"use client"

import * as React from "react"

import { FinanceAccountsCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-accounts-card"
import { FinanceApprovalsCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-approvals-card"
import { FinanceCashCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-cash-card"
import {
  FinancePageMenu,
  FinancePeriodTabs,
  FinanceRefreshButton,
  notifyFinance,
} from "@/registry/bases/__base__/blocks/finance-01/components/finance-controls"
import { FinanceKpiRow } from "@/registry/bases/__base__/blocks/finance-01/components/finance-kpi-row"
import { FinanceSidebar } from "@/registry/bases/__base__/blocks/finance-01/components/finance-sidebar"
import { FinanceSpendingCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-spending-card"
import { FinanceTransactionsCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-transactions-card"
import {
  FINANCE_ACCOUNTS,
  FINANCE_APPROVALS,
  FINANCE_CARD,
  FINANCE_TRANSACTIONS,
  getFinanceEntries,
  SAMPLE_NOW,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-data"
import {
  formatMoney,
  getApprovalsLead,
  getCardSpent,
  getComparisonLabel,
  getFinanceOverview,
  getRecentTransactions,
  getTotalCash,
  getWaitingApprovals,
  toPayment,
  type FinanceAccountId,
  type FinanceApproval,
  type FinancePeriod,
  type FinanceTransaction,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import {
  Alert,
  AlertAction,
  AlertTitle,
} from "@/registry/bases/__base__/ui/alert"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A finance lead checks cash and runway, then clears the payments that wait
// for them. The signature is the cash line beside the accounts that add up to
// it, so it comes first. Every number is worked out from the accounts and the
// ledger (lib/finance-model). Keep the period in the URL (with your router or
// nuqs) so a shared link opens the same view, and mount your Toaster in the
// root layout: approving reports itself there, with Undo.

const REFRESH_TIME = 900
const RECENT_COUNT = 8

const BALANCE = getTotalCash(FINANCE_ACCOUNTS)

const ACCOUNT_NAMES: Record<FinanceAccountId, string> = {
  checking: "Checking",
  treasury: "Treasury",
  savings: "Savings",
  card: `Card ${FINANCE_CARD.number}`,
}

const noop = () => {}

const sendIcon = (
  <IconPlaceholder
    lucide="SendIcon"
    tabler="IconSend"
    hugeicons="SentIcon"
    phosphor="PaperPlaneTiltIcon"
    remixicon="RiSendPlaneLine"
  />
)

export default function FinanceDashboardPage() {
  const [period, setPeriod] = React.useState<FinancePeriod>("30d")
  const [isComparing, setComparing] = React.useState(true)
  const [isRefreshing, setRefreshing] = React.useState(false)
  const [updatedLabel, setUpdatedLabel] = React.useState("Updated 2 min ago")
  const [approvedIds, setApprovedIds] = React.useState<readonly string[]>([])
  const [transactions, setTransactions] = React.useState(FINANCE_TRANSACTIONS)
  const refreshTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  const entries = React.useMemo(
    () => getFinanceEntries(transactions),
    [transactions]
  )
  const overview = React.useMemo(
    () =>
      getFinanceOverview({
        period,
        entries,
        balance: BALANCE,
        now: SAMPLE_NOW,
      }),
    [period, entries]
  )
  const waiting = React.useMemo(
    () => getWaitingApprovals(FINANCE_APPROVALS, approvedIds),
    [approvedIds]
  )
  const recent = React.useMemo(() => {
    const payments = FINANCE_APPROVALS.filter(({ id }) =>
      approvedIds.includes(id)
    ).map((approval) => toPayment(approval, SAMPLE_NOW))
    return getRecentTransactions({
      transactions,
      payments,
      count: RECENT_COUNT,
    })
  }, [transactions, approvedIds])
  const declined = transactions.find(({ status }) => status === "declined")

  React.useEffect(() => () => clearTimeout(refreshTimer.current), [])

  // Swap the timer for your data refetch; the content stays on screen.
  const refresh = () => {
    setRefreshing(true)
    refreshTimer.current = setTimeout(() => {
      setRefreshing(false)
      setUpdatedLabel("Updated just now")
    }, REFRESH_TIME)
  }

  const approve = ({ id, payee, amount }: FinanceApproval) => {
    setApprovedIds((current) => [...current, id])
    notifyFinance(
      `Approved ${formatMoney(amount, { cents: true })} to ${payee.name}`,
      () =>
        setApprovedIds((current) =>
          current.filter((approvedId) => approvedId !== id)
        )
    )
  }

  const retryPayment = ({ id, payee, amount }: FinanceTransaction) => {
    setTransactions((current) =>
      current.map(
        (transaction): FinanceTransaction =>
          transaction.id === id
            ? { ...transaction, status: "pending" }
            : transaction
      )
    )
    // The alert leaves with its button, so focus goes to what it was about.
    bodyRef.current?.focus({ preventScroll: true })
    notifyFinance(
      `Retrying ${formatMoney(-amount, { cents: true })} to ${payee.name}`
    )
  }

  return (
    <AppShell storageKey="finance-01">
      <FinanceSidebar />
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb
            items={[{ label: "Acme Inc", href: "/" }, { label: "Overview" }]}
          />
          <Button
            size="sm"
            onClick={noop}
            className="ms-auto shrink-0 @max-[48rem]/app-shell:min-h-11"
          >
            {sendIcon}
            Send money
          </Button>
          <AppShellHeaderActions
            menuLabel="Overview options"
            menu={
              <FinancePageMenu
                isComparing={isComparing}
                onComparingChange={setComparing}
                onAction={noop}
              />
            }
          />
        </AppShellHeader>
        <AppShellContent size="lg">
          <div
            ref={bodyRef}
            tabIndex={-1}
            className="@container flex flex-col gap-(--density-24) outline-none"
          >
            <div className="flex flex-col gap-(--density-4)">
              <AppShellPageTitle>Overview</AppShellPageTitle>
              <p className="text-[15px] text-pretty text-muted-foreground">
                {getApprovalsLead(waiting)}
              </p>
            </div>
            <FinancePeriodTabs
              value={period}
              onValueChange={setPeriod}
              toolbar={
                // Wraps under the tabs as one row.
                <div className="flex flex-1 basis-72 items-center gap-(--density-4) text-(length:--density-text-12) text-muted-foreground">
                  {isComparing && <span>{getComparisonLabel(period)}</span>}
                  <span aria-live="polite" className="ms-auto">
                    {isRefreshing ? "Updating…" : updatedLabel}
                  </span>
                  <FinanceRefreshButton
                    isRefreshing={isRefreshing}
                    onRefresh={refresh}
                  />
                </div>
              }
            >
              <div className="grid grid-cols-1 gap-(--density-16) @2xl:grid-cols-12">
                {declined && (
                  <Alert variant="error" className="col-span-full">
                    <IconPlaceholder
                      lucide="CircleAlertIcon"
                      tabler="IconAlertCircle"
                      hugeicons="AlertCircleIcon"
                      phosphor="WarningCircleIcon"
                      remixicon="RiErrorWarningLine"
                    />
                    <AlertTitle className="text-balance">
                      {declined.payee.name} declined{" "}
                      {formatMoney(-declined.amount, { cents: true })} on card{" "}
                      {FINANCE_CARD.number}
                    </AlertTitle>
                    <AlertAction>
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`Retry ${declined.payee.name}`}
                        onClick={() => retryPayment(declined)}
                      >
                        Retry
                      </Button>
                    </AlertAction>
                  </Alert>
                )}
                <FinanceCashCard
                  overview={overview}
                  balance={BALANCE}
                  isComparing={isComparing}
                  isLoading={isRefreshing}
                  className="@2xl:col-span-7 @4xl:col-span-8"
                />
                <FinanceAccountsCard
                  accounts={FINANCE_ACCOUNTS}
                  card={FINANCE_CARD}
                  cardSpent={getCardSpent(entries, SAMPLE_NOW)}
                  className="@2xl:col-span-5 @4xl:col-span-4"
                />
                <FinanceKpiRow
                  metrics={overview.metrics}
                  isComparing={isComparing}
                  isLoading={isRefreshing}
                  className="col-span-full"
                />
                <FinanceApprovalsCard
                  approvals={waiting}
                  now={SAMPLE_NOW}
                  onApprove={approve}
                  className="col-span-full @4xl:col-span-8"
                />
                <FinanceSpendingCard
                  spending={overview.spending}
                  payroll={overview.payroll}
                  isLoading={isRefreshing}
                  className="col-span-full @4xl:col-span-4"
                />
                <FinanceTransactionsCard
                  transactions={recent}
                  accountNames={ACCOUNT_NAMES}
                  className="col-span-full"
                />
              </div>
            </FinancePeriodTabs>
          </div>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
