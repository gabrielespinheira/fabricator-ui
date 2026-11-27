"use client"

import * as React from "react"

import { FinancePageMenu } from "@/registry/bases/__base__/blocks/finance-01/components/finance-controls"
import { FinanceOverview } from "@/registry/bases/__base__/blocks/finance-01/components/finance-overview"
import { FinanceSidebar } from "@/registry/bases/__base__/blocks/finance-01/components/finance-sidebar"
import {
  AppShell,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
} from "@/registry/bases/__base__/ui/app-shell"
import { Button } from "@/registry/bases/__base__/ui/button"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// A finance lead checks cash and runway, then clears the payments that wait
// for them. The signature is the cash line beside the accounts that add up to
// it, so it comes first. Every number is worked out from the accounts and the
// ledger (lib/finance-model). Keep the period in the URL (with your router or
// nuqs) so a shared link opens the same view, and mount your Toaster in the
// root layout: approving reports itself there, with Undo.

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
  const [isComparing, setComparing] = React.useState(true)

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
          <FinanceOverview isComparing={isComparing} />
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
