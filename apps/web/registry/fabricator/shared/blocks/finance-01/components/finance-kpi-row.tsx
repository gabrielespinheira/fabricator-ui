import { cn } from "cn"

import { FinanceDelta } from "@/registry/bases/__base__/blocks/finance-01/components/finance-delta"
import { type FinanceMetric } from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import {
  Card,
  CardAction,
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
            <CardTitle>{metric.label}</CardTitle>
            {isComparing && (
              <CardAction>
                <FinanceDelta
                  change={metric.change}
                  isGoodWhenUp={metric.isGoodWhenUp}
                  unit={metric.unit}
                />
              </CardAction>
            )}
          </CardHeader>
          {/* Dimmed while new numbers load, as the charts are. */}
          <CardContent
            className={cn(
              "flex flex-col gap-(--density-6) transition-opacity duration-feedback ease-feedback",
              isLoading && "opacity-50"
            )}
          >
            <CardValue>{metric.value}</CardValue>
            {(metric.scope || isComparing) && (
              <CardValueCaption>
                {[metric.scope, isComparing && `from ${metric.previous}`]
                  .filter(Boolean)
                  .join(", ")}
              </CardValueCaption>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
