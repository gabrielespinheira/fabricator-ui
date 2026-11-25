"use client"

import * as React from "react"

import { BillingAlert } from "@/registry/bases/__base__/blocks/billing-01/components/billing-alerts"
import { BillingCardDialog } from "@/registry/bases/__base__/blocks/billing-01/components/billing-card-dialog"
import {
  BillingConfirm,
  BillingPageMenu,
  notifyBilling,
} from "@/registry/bases/__base__/blocks/billing-01/components/billing-controls"
import { BillingDetailsCard } from "@/registry/bases/__base__/blocks/billing-01/components/billing-details-card"
import { BillingDetailsSheet } from "@/registry/bases/__base__/blocks/billing-01/components/billing-details-sheet"
import { BillingInvoiceDialog } from "@/registry/bases/__base__/blocks/billing-01/components/billing-invoice-dialog"
import { BillingInvoicesCard } from "@/registry/bases/__base__/blocks/billing-01/components/billing-invoices-card"
import { BillingNextInvoiceCard } from "@/registry/bases/__base__/blocks/billing-01/components/billing-next-invoice-card"
import { BillingPaymentCard } from "@/registry/bases/__base__/blocks/billing-01/components/billing-payment-card"
import { BillingPlanCard } from "@/registry/bases/__base__/blocks/billing-01/components/billing-plan-card"
import { BillingPlanPicker } from "@/registry/bases/__base__/blocks/billing-01/components/billing-plan-picker"
import { BillingSidebar } from "@/registry/bases/__base__/blocks/billing-01/components/billing-sidebar"
import { BillingUsageCards } from "@/registry/bases/__base__/blocks/billing-01/components/billing-usage-cards"
import { useBilling } from "@/registry/bases/__base__/blocks/billing-01/hooks/use-billing"
import {
  useBillingSample,
  useIsChangingPlan,
} from "@/registry/bases/__base__/blocks/billing-01/hooks/use-billing-view"
import {
  getSampleState,
  SAMPLE_NOW,
  type BillingInvoiceRecord,
  type BillingSample,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-data"
import {
  formatDay,
  formatMoney,
  getBillingLead,
  getPlan,
  toEstimateDiff,
  type BillingEstimate,
} from "@/registry/bases/__base__/blocks/billing-01/lib/billing-model"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
} from "@/registry/bases/__base__/ui/app-shell"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A workspace owner checks what they pay for, sees a limit coming, and changes
// plan knowing the exact charge. The next invoice is the page's signature: a
// sum people can read and try changes on. ?state= opens each situation.

function BillingScreen({
  sample,
  onSampleChange,
}: {
  sample: BillingSample
  onSampleChange: (sample: BillingSample) => void
}) {
  const billing = useBilling(getSampleState(sample))
  const { account, card, invoices, isLoading, role } = billing.state
  const { isChangingPlan, openPlans, closePlans } = useIsChangingPlan()
  const [draft, setDraft] = React.useState<BillingEstimate | null>(null)
  const [isUpdatingCard, setUpdatingCard] = React.useState(false)
  const [isEditingDetails, setEditingDetails] = React.useState(false)
  const [isCanceling, setCanceling] = React.useState(false)
  const [opened, setOpened] = React.useState<BillingInvoiceRecord | null>(null)
  const [isInvoiceOpen, setInvoiceOpen] = React.useState(false)

  const canManage = role === "owner"
  const plan = getPlan(account.planId)
  const estimate = draft ?? {
    seats: account.seats,
    extraRuns: account.extraRuns,
  }
  const isTrying = toEstimateDiff(account, estimate, SAMPLE_NOW).hasChanged
  const isMissingCard = card === null
  const failed = invoices.find(({ status }) => status === "failed")
  const isPicking = isChangingPlan && canManage

  const pageRef = React.useRef<HTMLDivElement>(null)
  const wasPicking = React.useRef(isPicking)

  // The plans replace the page, so focus and scroll start over with it.
  React.useEffect(() => {
    if (wasPicking.current === isPicking) return
    wasPicking.current = isPicking
    pageRef.current?.focus()
    pageRef.current?.scrollIntoView({ block: "start" })
  }, [isPicking])

  const download = (invoice: BillingInvoiceRecord) =>
    notifyBilling(`Downloading ${invoice.id}.pdf`)

  const icons = {
    download: (
      <IconPlaceholder
        lucide="DownloadIcon"
        tabler="IconDownload"
        hugeicons="Download01Icon"
        phosphor="DownloadIcon"
        remixicon="RiDownloadLine"
      />
    ),
    details: (
      <IconPlaceholder
        lucide="PencilIcon"
        tabler="IconPencil"
        hugeicons="PencilEdit01Icon"
        phosphor="PencilSimpleIcon"
        remixicon="RiPencilLine"
      />
    ),
    cancel: (
      <IconPlaceholder
        lucide="BanIcon"
        tabler="IconBan"
        hugeicons="UnavailableIcon"
        phosphor="ProhibitIcon"
        remixicon="RiForbidLine"
      />
    ),
  }

  return (
    <AppShellMain>
      <AppShellHeader>
        <AppShellBreadcrumb
          items={[
            { label: "Acme Inc", href: "/" },
            { label: "Settings", href: "/settings" },
            ...(isPicking
              ? [{ label: "Billing", href: "#" }, { label: "Change plan" }]
              : [{ label: "Billing" }]),
          ]}
        />
        <AppShellHeaderActions
          menuLabel="Billing options"
          menu={
            <BillingPageMenu
              sample={sample}
              onSampleChange={onSampleChange}
              groups={[
                [
                  {
                    id: "download",
                    label: "Download all invoices",
                    icon: icons.download,
                    onSelect: () => notifyBilling("Downloading invoices.zip"),
                  },
                  ...(canManage
                    ? [
                        {
                          id: "details",
                          label: "Edit billing details…",
                          icon: icons.details,
                          onSelect: () => setEditingDetails(true),
                        },
                      ]
                    : []),
                ],
                ...(canManage && account.status !== "canceled"
                  ? [
                      [
                        {
                          id: "cancel",
                          label: "Cancel plan…",
                          icon: icons.cancel,
                          isDestructive: true,
                          onSelect: () => setCanceling(true),
                        },
                      ],
                    ]
                  : []),
              ]}
            />
          }
        />
      </AppShellHeader>
      <AppShellContent size="lg">
        <div
          ref={pageRef}
          tabIndex={-1}
          className="@container flex scroll-mt-(--density-24) flex-col gap-(--density-24) outline-none"
        >
          <div className="flex flex-col gap-(--density-4)">
            <AppShellPageTitle>
              {isPicking ? "Change plan" : "Billing"}
            </AppShellPageTitle>
            <p className="text-[15px] text-pretty text-muted-foreground tabular-nums">
              {isPicking
                ? "Nothing changes until you confirm."
                : isLoading
                  ? `${plan.name} plan.`
                  : getBillingLead(account, SAMPLE_NOW)}
            </p>
          </div>
          {isPicking ? (
            <BillingPlanPicker
              account={account}
              card={card}
              onCancel={closePlans}
              onConfirm={(selection, change) => {
                billing.changePlan(selection, change)
                setDraft(null)
                closePlans()
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-(--density-16) @4xl:grid-cols-12">
              <div className="empty:hidden @4xl:col-span-12">
                <BillingAlert
                  state={billing.state}
                  onUpdateCard={() => setUpdatingCard(true)}
                  onKeepRunning={billing.keepRunning}
                  onEditDetails={() => setEditingDetails(true)}
                  onSeePlans={openPlans}
                />
              </div>
              <BillingPlanCard
                account={account}
                canManage={canManage}
                isPrimary={!isTrying && !isMissingCard && !failed}
                onChangePlan={openPlans}
                onKeepPlan={billing.keepPlan}
                onResume={billing.resume}
                className="@4xl:col-span-8"
              />
              <BillingPaymentCard
                card={card}
                canManage={canManage}
                isDeclined={failed !== undefined}
                onUpdateCard={() => setUpdatingCard(true)}
                className="@4xl:col-span-4"
              />
              <BillingNextInvoiceCard
                account={account}
                draft={estimate}
                canManage={canManage}
                isLoading={isLoading}
                onDraftChange={setDraft}
                onApply={() => {
                  billing.applyEstimate(estimate)
                  setDraft(null)
                }}
                className="@4xl:col-span-8"
              />
              <BillingUsageCards
                account={account}
                isLoading={isLoading}
                className="@4xl:col-span-4"
              />
              <BillingInvoicesCard
                invoices={invoices}
                isLoading={isLoading}
                onOpen={(invoice) => {
                  setOpened(invoice)
                  setInvoiceOpen(true)
                }}
                onDownload={download}
                className="@4xl:col-span-8"
              />
              <BillingDetailsCard
                details={account.details}
                canManage={canManage}
                onEdit={() => setEditingDetails(true)}
                className="@4xl:col-span-4"
              />
            </div>
          )}
        </div>
      </AppShellContent>
      <BillingInvoiceDialog
        invoice={opened}
        isOpen={isInvoiceOpen}
        onOpenChange={setInvoiceOpen}
        onDownload={download}
      />
      <BillingCardDialog
        isOpen={isUpdatingCard}
        onOpenChange={setUpdatingCard}
        amountDue={failed && formatMoney(failed.total)}
        onSave={billing.saveCard}
      />
      <BillingDetailsSheet
        account={account}
        isOpen={isEditingDetails}
        onOpenChange={setEditingDetails}
        onSave={billing.saveDetails}
      />
      <BillingConfirm
        open={isCanceling}
        onOpenChange={setCanceling}
        title={`Cancel ${plan.name}?`}
        description={`It stays on until ${formatDay(account.periodEnd, SAMPLE_NOW)}, with no charges after that. You can resume until then.`}
        cancelLabel={`Keep ${plan.name}`}
        actionLabel="Cancel plan"
        isDestructive
        onConfirm={() => {
          billing.cancel()
          setDraft(null)
        }}
      >
        <ul className="flex flex-col gap-(--density-8) rounded-lg bg-hover p-(--density-12) [&_svg]:mt-0.5 [&_svg]:size-(--density-icon-14) [&_svg]:shrink-0">
          <li className="flex gap-(--density-8)">
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
              className="text-success"
            />
            Projects, customers and reports stay for 90 days, read only
          </li>
          <li className="flex gap-(--density-8)">
            <IconPlaceholder
              lucide="CheckIcon"
              tabler="IconCheck"
              hugeicons="Tick02Icon"
              phosphor="CheckIcon"
              remixicon="RiCheckLine"
              className="text-success"
            />
            {account.storageUsed} GB of files can be downloaded until then
          </li>
          <li className="flex gap-(--density-8)">
            <IconPlaceholder
              lucide="MinusIcon"
              tabler="IconMinus"
              hugeicons="MinusSignIcon"
              phosphor="MinusIcon"
              remixicon="RiSubtractLine"
              className="text-destructive"
            />
            6 automations stop on {formatDay(account.periodEnd, SAMPLE_NOW)}
          </li>
        </ul>
      </BillingConfirm>
    </AppShellMain>
  )
}

export default function BillingPage() {
  const [sample, setSample] = useBillingSample()

  return (
    <AppShell storageKey="billing-01">
      <BillingSidebar />
      <BillingScreen key={sample} sample={sample} onSampleChange={setSample} />
    </AppShell>
  )
}
