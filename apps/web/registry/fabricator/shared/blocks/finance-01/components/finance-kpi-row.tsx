import { cn } from "cn"

import { FinanceDelta } from "@/registry/bases/__base__/blocks/finance-01/components/finance-delta"
import { type FinanceMetric } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { Card, CardContent } from "@/registry/bases/__base__/ui/card"

/** The flows behind the balance as stat cards, on the page's thirds. */
export function FinanceKpiRow({
  metrics,
  isComparing,
  isLoading,
  className,
}: {
  metrics: readonly FinanceMetric[]
  isComparing: boolean
  isLoading: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-(--density-16) @lg:grid-cols-3",
        className
      )}
    >
      {metrics.map((metric) => (
        <Card key={metric.id} className="last:col-span-2 @lg:last:col-span-1">
          <CardContent>
            <dl className="flex min-w-0 flex-col gap-(--density-4)">
              <dt className="text-muted-foreground">
                {metric.label}
                {metric.scope && (
                  <span className="@lg:hidden @3xl:inline">
                    {" "}
                    {metric.scope}
                  </span>
                )}
              </dt>
              {/* Dimmed while new numbers load, as the charts are. */}
              <dd
                className={cn(
                  "flex flex-wrap items-center gap-x-(--density-8) gap-y-(--density-4) transition-opacity duration-feedback ease-feedback",
                  isLoading && "opacity-50"
                )}
              >
                <span className="text-2xl tracking-tight tabular-nums weight-semibold">
                  {metric.value}
                </span>
                {isComparing && (
                  <span className="flex items-center gap-(--density-8) text-(length:--density-text-12) text-muted-foreground">
                    <FinanceDelta
                      change={metric.change}
                      isGoodWhenUp={metric.isGoodWhenUp}
                      unit={metric.unit}
                    />
                    <span className="hidden @3xl:inline">
                      from {metric.previous}
                    </span>
                  </span>
                )}
              </dd>
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
