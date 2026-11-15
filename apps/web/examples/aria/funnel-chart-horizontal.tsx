import { type ChartConfig } from "@/styles/aria-fabricator/ui/chart-kit"
import { FunnelChart } from "@/styles/aria-fabricator/ui/funnel-chart"

const data = [
  { step: "Cart", orders: 3_840 },
  { step: "Shipping", orders: 2_910 },
  { step: "Payment", orders: 2_260 },
  { step: "Confirmed", orders: 1_980 },
]

const config = {
  orders: { label: "Orders", color: "chart-series-6" },
} satisfies ChartConfig

// Stages left to right, for a funnel read as a sequence of steps.
export function FunnelChartHorizontal() {
  return (
    <FunnelChart
      data={data}
      nameKey="step"
      valueKey="orders"
      config={config}
      orientation="horizontal"
      label="Checkout funnel"
      className="h-56 max-w-2xl"
    />
  )
}
