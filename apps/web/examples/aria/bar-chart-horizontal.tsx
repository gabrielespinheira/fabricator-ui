import { BarChart } from "@/styles/aria-fabricator/ui/bar-chart"
import { type ChartConfig } from "@/styles/aria-fabricator/ui/chart-kit"

const data = [
  { page: "/pricing", visits: 18_420 },
  { page: "/docs/getting-started", visits: 15_310 },
  { page: "/blog/launch-week", visits: 11_870 },
  { page: "/changelog", visits: 8_240 },
  { page: "/integrations", visits: 6_930 },
  { page: "/careers", visits: 3_160 },
]

const config = { visits: { label: "Visits" } } satisfies ChartConfig

// Rows for long category names. One series needs no legend: the label names
// what is plotted.
export function BarChartHorizontal() {
  return (
    <BarChart
      data={data}
      index="page"
      config={config}
      label="Top pages by visits"
      layout="horizontal"
      className="max-w-2xl"
    />
  )
}
