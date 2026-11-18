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
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/__base__/ui/toggle-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/__base__/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The finance home's controls whose API differs by base: this is Base UI's.

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
      size="sm"
      aria-label="Period"
      value={[value]}
      onValueChange={([next]) => {
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
