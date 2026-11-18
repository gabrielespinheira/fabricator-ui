import { AreaChart } from "@/styles/base-fabricator/ui/area-chart"
import { type ChartConfig } from "@/styles/base-fabricator/ui/chart-kit"

const data = [
  { week: "W1", organic: 4_200, direct: 2_400, referral: 1_100 },
  { week: "W2", organic: 4_600, direct: 2_300, referral: 1_400 },
  { week: "W3", organic: 4_100, direct: 2_900, referral: 1_300 },
  { week: "W4", organic: 5_300, direct: 3_100, referral: 1_700 },
  { week: "W5", organic: 5_900, direct: 3_000, referral: 2_100 },
  { week: "W6", organic: 6_400, direct: 3_600, referral: 1_900 },
  { week: "W7", organic: 6_100, direct: 3_900, referral: 2_400 },
  { week: "W8", organic: 7_200, direct: 4_100, referral: 2_600 },
]

const config = {
  organic: { label: "Organic search" },
  direct: { label: "Direct" },
  referral: { label: "Referral" },
} satisfies ChartConfig

// Stacked: each series sits on the ones before it, so the top line is the
// total.
export function AreaChartStacked() {
  return (
    <AreaChart
      data={data}
      index="week"
      config={config}
      label="Weekly visits by source"
      stack="stacked"
      className="max-w-2xl"
    />
  )
}
