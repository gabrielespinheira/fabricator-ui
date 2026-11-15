import { type ChartConfig } from "@/styles/base-fabricator/ui/chart-kit"
import { CompositionChart } from "@/styles/base-fabricator/ui/composition-chart"

const data = [
  { month: "Jun", free: 4_120, pro: 1_380, team: 420, enterprise: 64 },
  { month: "Jul", free: 4_310, pro: 1_520, team: 470, enterprise: 71 },
  { month: "Aug", free: 4_260, pro: 1_710, team: 540, enterprise: 78 },
  { month: "Sep", free: 4_480, pro: 1_890, team: 630, enterprise: 92 },
  { month: "Oct", free: 4_390, pro: 2_140, team: 720, enterprise: 104 },
  { month: "Nov", free: 4_550, pro: 2_360, team: 810, enterprise: 121 },
]

const config = {
  free: { label: "Free" },
  pro: { label: "Pro" },
  team: { label: "Team" },
  enterprise: { label: "Enterprise" },
} satisfies ChartConfig

// Six months of accounts by plan. With few columns each stays at its 40px
// cap and the rest of the band is air.
export function CompositionChartPlans() {
  return (
    <CompositionChart
      data={data}
      index="month"
      config={config}
      label="Accounts by plan"
      className="max-w-2xl"
    />
  )
}
