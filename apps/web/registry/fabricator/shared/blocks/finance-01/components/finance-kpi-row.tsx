import { cn } from "cn"

import { FinanceDelta } from "@/registry/bases/__base__/blocks/finance-01/components/finance-delta"
import { type FinanceMetric } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardValue,
  CardValueCaption,
} from "@/registry/bases/__base__/ui/card"

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
          <CardHeader>
            <CardTitle>
              {metric.label}
              {metric.scope && (
                <span className="@lg:hidden @3xl:inline"> {metric.scope}</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Dimmed while new numbers load, as the charts are. */}
            <CardValue
              className={cn(
                "transition-opacity duration-feedback ease-feedback",
                isLoading && "opacity-50"
              )}
            >
              {metric.value}
              {isComparing && (
                <FinanceDelta
                  change={metric.change}
                  isGoodWhenUp={metric.isGoodWhenUp}
                  unit={metric.unit}
                />
              )}
              {isComparing && (
                <CardValueCaption className="hidden @3xl:inline">
                  from {metric.previous}
                </CardValueCaption>
              )}
            </CardValue>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
