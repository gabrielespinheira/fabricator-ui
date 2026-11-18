"use client"

import * as React from "react"

import { FinanceAccountsCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-accounts-card"
import { FinanceApprovalsCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-approvals-card"
import { FinanceCashCard } from "@/registry/bases/__base__/blocks/finance-01/components/finance-cash-card"
import {
  FinancePageMenu,
  FinancePeriodToggle,
  FinanceRefreshButton,
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
  type FinanceTransaction,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-data"
import {
  formatMoney,
  getComparisonLabel,
  getFinanceOverview,
  type FinancePeriod,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import {
  Alert,
  AlertAction,
  AlertDescription,
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

// A business banking home. A finance lead checks cash and runway, approves
// what is waiting and sees where money went. Keep the period in the URL
// (with your router or nuqs) so a shared link opens the same view.

const REFRESH_TIME = 900

const noop = () => {}

export default function FinanceDashboardPage() {
  const [period, setPeriod] = React.useState<FinancePeriod>("30d")
  const [isComparing, setComparing] = React.useState(true)
  const [isRefreshing, setRefreshing] = React.useState(false)
  const [updatedLabel, setUpdatedLabel] = React.useState("Updated 2 min ago")
  const [approvals, setApprovals] = React.useState(FINANCE_APPROVALS)
  const [transactions, setTransactions] = React.useState(FINANCE_TRANSACTIONS)
  const refreshTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined)
  const overview = React.useMemo(() => getFinanceOverview(period), [period])
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

  const retryPayment = (id: string) =>
    setTransactions((current) =>
      current.map(
        (transaction): FinanceTransaction =>
          transaction.id === id
            ? { ...transaction, status: "pending" }
            : transaction
      )
    )

  return (
    <AppShell storageKey="finance-01">
      <FinanceSidebar waitingCount={approvals.length} />
      <AppShellMain>
        <AppShellHeader>
          <AppShellBreadcrumb
            items={[{ label: "Acme Inc", href: "/" }, { label: "Home" }]}
          />
          <AppShellHeaderActions
            actions={[
              {
                id: "transfer",
                label: "Transfer between accounts",
                onSelect: noop,
                icon: (
                  <IconPlaceholder
                    lucide="ArrowLeftRightIcon"
                    tabler="IconArrowsLeftRight"
                    hugeicons="ArrowDataTransferHorizontalIcon"
                    phosphor="ArrowsLeftRightIcon"
                    remixicon="RiArrowLeftRightLine"
                  />
                ),
              },
              {
                id: "request",
                label: "Request payment",
                onSelect: noop,
                icon: (
                  <IconPlaceholder
                    lucide="ReceiptTextIcon"
                    tabler="IconReceipt"
                    hugeicons="Invoice01Icon"
                    phosphor="ReceiptIcon"
                    remixicon="RiBillLine"
                  />
                ),
              },
            ]}
            primaryAction={{
              id: "send",
              label: "Send money",
              onSelect: noop,
              icon: (
                <IconPlaceholder
                  lucide="SendIcon"
                  tabler="IconSend"
                  hugeicons="SentIcon"
                  phosphor="PaperPlaneTiltIcon"
                  remixicon="RiSendPlaneLine"
                />
              ),
            }}
            menuLabel="Home options"
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
          <div className="@container flex flex-col gap-(--density-24)">
            <div className="flex flex-col gap-(--density-4)">
              <AppShellPageTitle>Home</AppShellPageTitle>
              <p className="text-[15px] text-pretty text-muted-foreground">
                Cash, runway and what needs you today.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-(--density-8)">
              <FinancePeriodToggle value={period} onValueChange={setPeriod} />
              <span className="text-(length:--density-text-12) text-muted-foreground">
                {getComparisonLabel(period)}
              </span>
              <div className="ms-auto flex items-center gap-(--density-4) text-(length:--density-text-12) text-muted-foreground">
                <span aria-live="polite">
                  {isRefreshing ? "Updating…" : updatedLabel}
                </span>
                <FinanceRefreshButton
                  isRefreshing={isRefreshing}
                  onRefresh={refresh}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-(--density-16) @4xl:grid-cols-12">
              {declined && (
                <Alert variant="error" className="@4xl:col-span-12">
                  <IconPlaceholder
                    lucide="CircleAlertIcon"
                    tabler="IconAlertCircle"
                    hugeicons="AlertCircleIcon"
                    phosphor="WarningCircleIcon"
                    remixicon="RiErrorWarningLine"
                  />
                  <AlertTitle>A card payment was declined</AlertTitle>
                  <AlertDescription>
                    {declined.payee.name} declined{" "}
                    {formatMoney(Math.abs(declined.amount), { cents: true })} on
                    the corporate card. Retry it, or update the card&apos;s
                    billing address.
                  </AlertDescription>
                  <AlertAction>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryPayment(declined.id)}
                    >
                      Retry
                    </Button>
                  </AlertAction>
                </Alert>
              )}
              <FinanceKpiRow
                metrics={overview.metrics}
                className="@4xl:col-span-12"
              />
              <FinanceCashCard
                cash={overview.cash}
                balance={overview.balance}
                change={overview.cashChange}
                grain={overview.grain}
                isComparing={isComparing}
                isLoading={isRefreshing}
                className="@4xl:col-span-12"
              />
              <FinanceApprovalsCard
                approvals={approvals}
                onApprove={(id) =>
                  setApprovals((current) =>
                    current.filter((approval) => approval.id !== id)
                  )
                }
                className="@4xl:col-span-6"
              />
              <FinanceAccountsCard
                accounts={FINANCE_ACCOUNTS}
                card={FINANCE_CARD}
                className="@4xl:col-span-6"
              />
              <FinanceSpendingCard
                spending={overview.spending}
                isLoading={isRefreshing}
                className="@4xl:col-span-6"
              />
              <FinanceTransactionsCard
                transactions={transactions}
                className="@4xl:col-span-6"
              />
            </div>
          </div>
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
