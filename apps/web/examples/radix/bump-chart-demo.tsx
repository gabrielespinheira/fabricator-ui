import { BumpChart } from "@/styles/radix-fabricator/ui/bump-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"

// Each month's rank by revenue, 1 at the top.
const data = [
  { month: "Jun", atlas: 1, pulse: 2, ledger: 3, relay: 4, beacon: 5 },
  { month: "Jul", atlas: 1, pulse: 3, ledger: 2, relay: 4, beacon: 5 },
  { month: "Aug", atlas: 2, pulse: 4, ledger: 1, relay: 3, beacon: 5 },
  { month: "Sep", atlas: 3, pulse: 5, ledger: 1, relay: 2, beacon: 4 },
  { month: "Oct", atlas: 4, pulse: 5, ledger: 2, relay: 1, beacon: 3 },
  { month: "Nov", atlas: 4, pulse: 5, ledger: 3, relay: 1, beacon: 2 },
]

const config = {
  atlas: { label: "Atlas" },
  pulse: { label: "Pulse" },
  ledger: { label: "Ledger" },
  relay: { label: "Relay" },
  beacon: { label: "Beacon" },
} satisfies ChartConfig

export function BumpChartDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Top products</CardTitle>
        <CardDescription>Acme Inc, rank by revenue each month</CardDescription>
      </CardHeader>
      <CardContent>
        <BumpChart
          data={data}
          index="month"
          config={config}
          label="Product rank by revenue"
        />
      </CardContent>
    </Card>
  )
}
