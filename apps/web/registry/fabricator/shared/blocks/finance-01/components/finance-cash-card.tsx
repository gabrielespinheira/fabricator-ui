"use client"

import * as React from "react"

import { FinanceDelta } from "@/registry/bases/__base__/blocks/finance-01/components/finance-delta"
import {
  formatMoney,
  type CashPoint,
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

/** The cash balance over the period; the headline follows the pointer. */
export function FinanceCashCard({
  cash,
  balance,
  change,
  grain,
  isComparing,
  isLoading,
  className,
}: {
  cash: CashPoint[]
  balance: number
  change: number
  grain: string
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
        <CardDescription>{grain}, across all accounts</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-(--density-16)">
        <div className="flex flex-col gap-(--density-4)">
          <span className="text-muted-foreground">
            {active ? active.datum.date : "Today"}
          </span>
          <div className="flex flex-wrap items-center gap-(--density-8)">
            <span className="text-2xl tracking-tight tabular-nums weight-semibold">
              {formatMoney(active ? active.datum.current : balance)}
            </span>
            {!active && <FinanceDelta change={change} isGoodWhenUp unit="%" />}
          </div>
        </div>
        <LineChart
          className="h-56 @4xl:h-64"
          data={cash}
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
