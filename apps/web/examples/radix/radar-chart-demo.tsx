import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"
import { RadarChart } from "@/styles/radix-fabricator/ui/radar-chart"

const data = [
  { measure: "Performance", acme: 86, average: 70 },
  { measure: "Reliability", acme: 92, average: 75 },
  { measure: "Usability", acme: 78, average: 72 },
  { measure: "Support", acme: 88, average: 66 },
  { measure: "Price", acme: 64, average: 70 },
  { measure: "Integrations", acme: 72, average: 68 },
]

const config = {
  acme: { label: "Acme Inc" },
  average: { label: "Industry average" },
} satisfies ChartConfig

export function RadarChartDemo() {
  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Customer scorecard</CardTitle>
        <CardDescription>
          Acme Inc against the industry, out of 100
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadarChart
          data={data}
          index="measure"
          config={config}
          label="Customer scorecard"
        />
      </CardContent>
    </Card>
  )
}
