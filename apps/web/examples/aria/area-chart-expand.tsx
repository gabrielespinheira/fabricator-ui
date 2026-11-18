import { AreaChart } from "@/styles/aria-fabricator/ui/area-chart"
import { type ChartConfig } from "@/styles/aria-fabricator/ui/chart-kit"

const data = [
  { quarter: "Q1 2025", starter: 420, team: 310, enterprise: 120 },
  { quarter: "Q2 2025", starter: 460, team: 380, enterprise: 150 },
  { quarter: "Q3 2025", starter: 430, team: 450, enterprise: 210 },
  { quarter: "Q4 2025", starter: 400, team: 520, enterprise: 260 },
  { quarter: "Q1 2026", starter: 380, team: 610, enterprise: 330 },
  { quarter: "Q2 2026", starter: 350, team: 660, enterprise: 410 },
]

const config = {
  starter: { label: "Starter" },
  team: { label: "Team" },
  enterprise: { label: "Enterprise" },
} satisfies ChartConfig

// Expanded: every quarter stretches to the whole, so the chart reads as the
// mix of plans rather than their size. The tooltip gives both.
export function AreaChartExpand() {
  return (
    <AreaChart
      data={data}
      index="quarter"
      config={config}
      label="Subscriptions by plan"
      stack="expand"
      className="max-w-2xl"
    />
  )
}
