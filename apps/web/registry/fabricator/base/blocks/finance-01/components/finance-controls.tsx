"use client"

import {
  FINANCE_PERIODS,
  isFinancePeriod,
  type FinancePeriod,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  DropdownMenuCheckboxItem,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/registry/bases/__base__/ui/dropdown-menu"
import { Spinner } from "@/registry/bases/__base__/ui/spinner"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/bases/__base__/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/__base__/ui/tooltip"
import { toast } from "@/registry/bases/base/ui/toast"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The finance overview's controls whose API differs by base: this is Base UI's.

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
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Refresh"
            disabled={isRefreshing}
            onClick={onRefresh}
          />
        }
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
      </TooltipTrigger>
      <TooltipContent>Refresh</TooltipContent>
    </Tooltip>
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
        <DropdownMenuItem onClick={() => onAction("transfer")}>
          <IconPlaceholder
            lucide="ArrowLeftRightIcon"
            tabler="IconArrowsLeftRight"
            hugeicons="ArrowDataTransferHorizontalIcon"
            phosphor="ArrowsLeftRightIcon"
            remixicon="RiArrowLeftRightLine"
          />
          Transfer between accounts
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("request")}>
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
        <DropdownMenuItem onClick={() => onAction("statement")}>
          <IconPlaceholder
            lucide="FileTextIcon"
            tabler="IconFileText"
            hugeicons="File01Icon"
            phosphor="FileTextIcon"
            remixicon="RiFileTextLine"
          />
          Download statement
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onAction("export")}>
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
        <DropdownMenuItem onClick={() => onAction("settings")}>
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
  const id = toast.add({
    title: message,
    actionProps: undo && {
      children: "Undo",
      onClick: () => {
        toast.close(id)
        undo()
      },
    },
  })
}
