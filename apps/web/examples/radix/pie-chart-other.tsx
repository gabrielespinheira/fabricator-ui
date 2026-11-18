import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"
import { PieChart } from "@/styles/radix-fabricator/ui/pie-chart"

const data = [
  { country: "US", orders: 4_210 },
  { country: "GB", orders: 1_830 },
  { country: "DE", orders: 1_460 },
  { country: "FR", orders: 980 },
  { country: "CA", orders: 870 },
  { country: "BR", orders: 640 },
  { country: "JP", orders: 590 },
  { country: "ES", orders: 310 },
  { country: "NL", orders: 280 },
  { country: "SE", orders: 190 },
  { country: "PL", orders: 120 },
]

const config = {
  US: { label: "United States" },
  GB: { label: "United Kingdom" },
  DE: { label: "Germany" },
  FR: { label: "France" },
  CA: { label: "Canada" },
  BR: { label: "Brazil" },
  JP: { label: "Japan" },
} satisfies ChartConfig

// Eleven countries: the seven largest keep their slices and colours, the
// smallest four fold into one grey Other. The hidden table keeps every row.
export function PieChartOther() {
  return (
    <PieChart
      data={data}
      nameKey="country"
      valueKey="orders"
      config={config}
      label="Orders by country"
    />
  )
}
