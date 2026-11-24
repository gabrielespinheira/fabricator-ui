"use client"

import { toast } from "sonner"

import {
  FINANCE_PERIODS,
  isFinancePeriod,
  type FinancePeriod,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Button } from "@/registry/bases/radix/ui/button"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/registry/bases/radix/ui/dropdown-menu"
import { Spinner } from "@/registry/bases/radix/ui/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/bases/radix/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The finance overview's controls whose API differs by base: this is Radix's.

export type FinancePageAction =
  | "transfer"
  | "request"
  | "statement"
  | "export"
  | "settings"

/** The period presets, what stands beside them, and the cards they change. */
export function FinancePeriodTabs({
  value,
  onValueChange,
  toolbar,
  children,
}: {
  value: FinancePeriod
  onValueChange: (period: FinancePeriod) => void
  toolbar: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Tabs
      value={value}
      onValueChange={(next) => {
        if (isFinancePeriod(next)) onValueChange(next)
      }}
      className="gap-(--density-24)"
    >
      <div className="flex flex-wrap items-center gap-(--density-8)">
        <TabsList aria-label="Period">
          {FINANCE_PERIODS.map((period) => (
            <TabsTrigger key={period.value} value={period.value}>
              {period.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {toolbar}
      </div>
      {/* Its cards hold the tab stops, so the panel isn't one. */}
      <TabsContent value={value} tabIndex={-1}>
        {children}
      </TabsContent>
    </Tabs>
  )
}

export function FinanceRefreshButton({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean
  onRefresh: () => void
}) {
  return (
    // A local provider: Radix tooltips need one, and the app may not have it.
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh"
            disabled={isRefreshing}
            onClick={onRefresh}
          >
            {isRefreshing ? (
              <Spinner />
            ) : (
              <IconPlaceholder
                lucide="RefreshCwIcon"
                tabler="IconRefresh"
                hugeicons="RefreshIcon"
                phosphor="ArrowClockwiseIcon"
                remixicon="RiRefreshLine"
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Refresh</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

/** The page menu: other ways to move money, what the page shows, exports. */
export function FinancePageMenu({
  isComparing,
  onComparingChange,
  onAction,
}: {
  isComparing: boolean
  onComparingChange: (isComparing: boolean) => void
  onAction: (action: FinancePageAction) => void
}) {
  return (
    <>
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => onAction("transfer")}>
          <IconPlaceholder
            lucide="ArrowLeftRightIcon"
            tabler="IconArrowsLeftRight"
            hugeicons="ArrowDataTransferHorizontalIcon"
            phosphor="ArrowsLeftRightIcon"
            remixicon="RiArrowLeftRightLine"
          />
          Transfer between accounts
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("request")}>
          <IconPlaceholder
            lucide="ReceiptTextIcon"
            tabler="IconReceipt"
            hugeicons="Invoice01Icon"
            phosphor="ReceiptIcon"
            remixicon="RiBillLine"
          />
          Request payment
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuLabel>View</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          checked={isComparing}
          onCheckedChange={onComparingChange}
          // Keeps the menu open, so the change shows behind it.
          onSelect={(event) => event.preventDefault()}
        >
          <IconPlaceholder
            lucide="HistoryIcon"
            tabler="IconHistory"
            hugeicons="WorkHistoryIcon"
            phosphor="ClockCounterClockwiseIcon"
            remixicon="RiHistoryLine"
          />
          Compare with previous period
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => onAction("statement")}>
          <IconPlaceholder
            lucide="FileTextIcon"
            tabler="IconFileText"
            hugeicons="File01Icon"
            phosphor="FileTextIcon"
            remixicon="RiFileTextLine"
          />
          Download statement
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction("export")}>
          <IconPlaceholder
            lucide="DownloadIcon"
            tabler="IconDownload"
            hugeicons="Download01Icon"
            phosphor="DownloadSimpleIcon"
            remixicon="RiDownloadLine"
          />
          Export transactions as CSV
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onSelect={() => onAction("settings")}>
          <IconPlaceholder
            lucide="SlidersHorizontalIcon"
            tabler="IconAdjustmentsHorizontal"
            hugeicons="SlidersHorizontalIcon"
            phosphor="SlidersHorizontalIcon"
            remixicon="RiEqualizerLine"
          />
          Dashboard settings…
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </>
  )
}

/** Says what just happened, with Undo while it can be taken back. */
export function notifyFinance(message: string, undo?: () => void) {
  toast(message, undo ? { action: { label: "Undo", onClick: undo } } : {})
}
