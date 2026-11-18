import { type ChartConfig } from "@/styles/aria-fabricator/ui/chart-kit"
import { RadarChart } from "@/styles/aria-fabricator/ui/radar-chart"

const data = [
  { feature: "Storage", starter: 30, pro: 60, enterprise: 100 },
  { feature: "Seats", starter: 20, pro: 55, enterprise: 95 },
  { feature: "Support", starter: 35, pro: 70, enterprise: 90 },
  { feature: "API", starter: 25, pro: 80, enterprise: 85 },
  { feature: "Security", starter: 50, pro: 65, enterprise: 98 },
  { feature: "Analytics", starter: 40, pro: 75, enterprise: 88 },
]

const config = {
  starter: { label: "Starter" },
  pro: { label: "Pro" },
  enterprise: { label: "Enterprise" },
} satisfies ChartConfig

// Three series on one grid. The legend hides a plan when pressed and
// spotlights it when pointed at; the washes stay faint so the outlines read
// where they overlap.
export function RadarChartSeries() {
  return (
    <RadarChart
      data={data}
      index="feature"
      config={config}
      label="Plans compared"
      className="max-w-xl"
    />
  )
}
