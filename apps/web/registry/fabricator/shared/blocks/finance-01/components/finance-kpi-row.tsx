import { cn } from "cn"

import { FinanceDelta } from "@/registry/bases/__base__/blocks/finance-01/components/finance-delta"
import { type FinanceMetric } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Card, CardContent } from "@/registry/bases/__base__/ui/card"

/**
 * The headline numbers as stat cards, parted by the gutter alone. Four go
 * across on the quarters, two by two on phones.
 */
export function FinanceKpiRow({
  metrics,
  className,
}: {
  metrics: FinanceMetric[]
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-(--density-16) @4xl:grid-cols-4",
        className
      )}
    >
      {metrics.map((metric) => (
        <Card key={metric.id}>
          <CardContent>
            <dl className="flex min-w-0 flex-col gap-(--density-4)">
              <dt className="truncate text-muted-foreground">{metric.label}</dt>
              <dd className="truncate text-2xl tracking-tight tabular-nums weight-semibold">
                {metric.value}
              </dd>
              <dd className="flex items-center gap-(--density-8) text-(length:--density-text-12) text-muted-foreground">
                <FinanceDelta
                  change={metric.change}
                  isGoodWhenUp={metric.isGoodWhenUp}
                  unit={metric.unit}
                />
                <span className="hidden truncate @3xl:inline">
                  from {metric.previous}
                </span>
              </dd>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
