import { BarChart } from "@/styles/base-fabricator/ui/bar-chart"
import { type ChartConfig } from "@/styles/base-fabricator/ui/chart-kit"

const data = [
  { month: "Jan", resolved: 182, open: 34, escalated: 9 },
  { month: "Feb", resolved: 205, open: 41, escalated: 12 },
  { month: "Mar", resolved: 231, open: 29, escalated: 7 },
  { month: "Apr", resolved: 198, open: 52, escalated: 15 },
  { month: "May", resolved: 246, open: 38, escalated: 11 },
  { month: "Jun", resolved: 262, open: 27, escalated: 6 },
]

const config = {
  resolved: { label: "Resolved" },
  open: { label: "Open" },
  escalated: { label: "Escalated" },
} satisfies ChartConfig

// Stacked: the column is the month's total, split by state. Only the top of
// each column is rounded; segments keep a 2px gap.
export function BarChartStacked() {
  return (
    <BarChart
      data={data}
      index="month"
      config={config}
      label="Support tickets by state"
      stack="stacked"
      className="max-w-2xl"
    />
  )
}
