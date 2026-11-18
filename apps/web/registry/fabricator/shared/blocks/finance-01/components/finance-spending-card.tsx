import { FinanceCardLink } from "@/registry/bases/__base__/blocks/finance-01/components/finance-card-link"
import {
  formatMoney,
  type SpendingCategory,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { type ChartConfig } from "@/registry/bases/__base__/lib/chart-model"
import { BarChart } from "@/registry/bases/__base__/ui/bar-chart"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"

const CONFIG: ChartConfig = { amount: { label: "Spent" } }

const formatValue = (value: number) => formatMoney(value)

/** Where money went this period, largest first. */
export function FinanceSpendingCard({
  spending,
  isLoading,
  className,
}: {
  spending: SpendingCategory[]
  isLoading: boolean
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>Money out, largest first</CardDescription>
        <CardAction>
          <FinanceCardLink href="/insights/spending">View all</FinanceCardLink>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
        <BarChart
          className="h-full min-h-56"
          data={spending}
          index="category"
          config={CONFIG}
          layout="horizontal"
          label="Spending by category"
          formatValue={formatValue}
          loading={isLoading}
        />
      </CardContent>
    </Card>
  )
}
