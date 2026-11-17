"use client"

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
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/radix/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The finance home's controls whose API differs by base: this is Radix's.

export type FinancePageAction = "statement" | "export" | "settings"

/** The period presets; one is always selected. */
export function FinancePeriodToggle({
  value,
  onValueChange,
}: {
  value: FinancePeriod
  onValueChange: (period: FinancePeriod) => void
}) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      aria-label="Period"
      value={value}
      onValueChange={(next) => {
        if (isFinancePeriod(next)) onValueChange(next)
      }}
    >
      {FINANCE_PERIODS.map((period) => (
        <ToggleGroupItem key={period.value} value={period.value}>
          {period.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
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

/** The header's page menu: what the page shows, exports, its settings. */
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
