import {
  formatMoney,
  getSpendingScope,
  type SpendingCategory,
} from "@/registry/bases/__base__/blocks/finance-01/lib/finance-model"
import { type ChartConfig } from "@/registry/bases/__base__/lib/chart-model"
import { BarChart } from "@/registry/bases/__base__/ui/bar-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/registry/bases/__base__/ui/card"

const CONFIG: ChartConfig = { amount: { label: "Spent" } }

const formatValue = (value: number) => formatMoney(value)

/** Where money went this period, largest first. Payroll would flatten the
 * rest, so it is named instead of drawn. */
export function FinanceSpendingCard({
  spending,
  payroll,
  isLoading,
  className,
}: {
  spending: readonly SpendingCategory[]
  payroll: number
  isLoading: boolean
  className?: string
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <CardDescription>{getSpendingScope(payroll)}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <BarChart
          className="h-full min-h-64"
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
