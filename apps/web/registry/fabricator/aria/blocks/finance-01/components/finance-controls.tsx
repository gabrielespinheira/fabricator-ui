"use client"

import { toast } from "sonner"

import {
  FINANCE_PERIODS,
  isFinancePeriod,
  type FinancePeriod,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Button } from "@/registry/bases/aria/ui/button"
import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/registry/bases/aria/ui/dropdown-menu"
import { Spinner } from "@/registry/bases/aria/ui/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/bases/aria/ui/tabs"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The finance overview's controls whose API differs by base: this is React
// Aria's.

export type FinancePageAction =
  | "transfer"
  | "request"
  | "statement"
  | "export"
  | "settings"

const COMPARE = "compare"

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
      selectedKey={value}
      onSelectionChange={(next) => {
        if (isFinancePeriod(next)) onValueChange(next)
      }}
      className="gap-(--density-24)"
    >
      <div className="flex flex-wrap items-center gap-(--density-8)">
        <TabsList aria-label="Period">
          {FINANCE_PERIODS.map((period) => (
            <TabsTrigger key={period.value} id={period.value}>
              {period.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {toolbar}
      </div>
      <TabsContent id={value}>{children}</TabsContent>
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
    <TooltipTrigger>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Refresh"
        isDisabled={isRefreshing}
        onPress={onRefresh}
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
      <Tooltip>Refresh</Tooltip>
    </TooltipTrigger>
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
        <DropdownMenuItem onAction={() => onAction("transfer")}>
          <IconPlaceholder
            lucide="ArrowLeftRightIcon"
            tabler="IconArrowsLeftRight"
            hugeicons="ArrowDataTransferHorizontalIcon"
            phosphor="ArrowsLeftRightIcon"
            remixicon="RiArrowLeftRightLine"
          />
          Transfer between accounts
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => onAction("request")}>
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
      <DropdownMenuGroup
        selectionMode="multiple"
        selectedKeys={isComparing ? [COMPARE] : []}
        onSelectionChange={(keys) =>
          onComparingChange(keys === "all" || keys.has(COMPARE))
        }
      >
        <DropdownMenuLabel>View</DropdownMenuLabel>
        <DropdownMenuItem id={COMPARE}>
          <IconPlaceholder
            lucide="HistoryIcon"
            tabler="IconHistory"
            hugeicons="WorkHistoryIcon"
            phosphor="ClockCounterClockwiseIcon"
            remixicon="RiHistoryLine"
          />
          Compare with previous period
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem onAction={() => onAction("statement")}>
          <IconPlaceholder
            lucide="FileTextIcon"
            tabler="IconFileText"
            hugeicons="File01Icon"
            phosphor="FileTextIcon"
            remixicon="RiFileTextLine"
          />
          Download statement
        </DropdownMenuItem>
        <DropdownMenuItem onAction={() => onAction("export")}>
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
        <DropdownMenuItem onAction={() => onAction("settings")}>
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
