"use client"

import * as React from "react"

import { FinanceDelta } from "@/registry/bases/__base__/blocks/finance-01/components/finance-delta"
import {
  formatMoney,
  formatMoneyCompact,
  type CashPoint,
  type FinanceOverview,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import {
  type ChartActive,
  type ChartConfig,
} from "@/registry/bases/__base__/lib/chart-model"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"
import { LineChart } from "@/registry/bases/__base__/ui/line-chart"

const CURRENT: ChartConfig = { current: { label: "This period" } }

const WITH_PREVIOUS: ChartConfig = {
  ...CURRENT,
  previous: {
    label: "Previous period",
    color: "var(--muted-foreground)",
    dashed: true,
  },
}

const formatValue = (value: number) => formatMoney(value)

/** The cash across every account over the period; its total leads the page. */
export function FinanceCashCard({
  overview,
  balance,
  isComparing,
  isLoading,
  className,
}: {
  overview: FinanceOverview
  balance: number
  isComparing: boolean
  isLoading: boolean
  className?: string
}) {
  const [active, setActive] = React.useState<ChartActive<CashPoint> | null>(
    null
  )

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Cash balance</CardTitle>
        <CardDescription>{overview.grain}, across all accounts</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-(--density-16)">
        {/* The headline follows the pointer along the line. */}
        <div className="flex min-h-(--density-32) flex-wrap items-center gap-x-(--density-8) text-(length:--density-text-12) text-muted-foreground">
          <span className="text-2xl tracking-tight text-foreground tabular-nums weight-semibold">
            {formatMoney(active ? active.datum.current : balance)}
          </span>
          {active && <span>on {active.datum.date}</span>}
          {!active && isComparing && (
            <>
              <FinanceDelta
                change={overview.cashChange}
                isGoodWhenUp
                unit="%"
              />
              <span>from {formatMoneyCompact(overview.previousCash)}</span>
            </>
          )}
        </div>
        <LineChart
          className="h-60 @4xl:h-auto @4xl:min-h-64 @4xl:flex-1"
          data={overview.cash}
          index="date"
          config={isComparing ? WITH_PREVIOUS : CURRENT}
          label="Cash balance"
          formatValue={formatValue}
          loading={isLoading}
          onActiveChange={setActive}
        />
      </CardContent>
    </Card>
  )
}
