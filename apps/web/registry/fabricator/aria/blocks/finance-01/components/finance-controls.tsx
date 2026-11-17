"use client"

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
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/bases/aria/ui/toggle-group"
import { Tooltip, TooltipTrigger } from "@/registry/bases/aria/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

// The finance home's controls whose API differs by base: this is React
// Aria's.

export type FinancePageAction = "statement" | "export" | "settings"

const COMPARE = "compare"

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
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[value]}
      onSelectionChange={(keys) => {
        const [next] = keys
        if (isFinancePeriod(next)) onValueChange(next)
      }}
    >
      {FINANCE_PERIODS.map((period) => (
        <ToggleGroupItem key={period.value} id={period.value}>
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
