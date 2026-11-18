import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"

import { formatChartNumber } from "@/registry/fabricator/shared/lib/chart-model"
import { DonutChart } from "@/registry/native/ui/donut-chart"

const revenue = [
  { plan: "Enterprise", revenue: 48_200 },
  { plan: "Team", revenue: 31_600 },
  { plan: "Pro", revenue: 22_900 },
  { plan: "Starter", revenue: 9_400 },
]

const storage = [
  { type: "Images", size: 42.1 },
  { type: "Video", size: 31.4 },
  { type: "Documents", size: 12.8 },
  { type: "Backups", size: 8.6 },
  { type: "Other", size: 3.2 },
]

const dollars = (value: number) =>
  `$${formatChartNumber(value, { compact: true })}`

export function DonutChartExample() {
  return (
    <ExampleWrapper>
      <Example title="With the list" className="items-stretch">
        <DonutChart
          data={revenue}
          nameKey="plan"
          valueKey="revenue"
          label="Revenue by plan"
          centerLabel="MRR"
          formatValue={dollars}
        />
      </Example>
      <Example title="Without the list" className="items-stretch">
        <DonutChart
          data={storage}
          nameKey="type"
          valueKey="size"
          label="Storage by file type"
          centerLabel="Used"
          list={false}
          formatValue={(value) => `${value.toFixed(1)} GB`}
        />
      </Example>
      <Example title="Labels and tooltip" className="items-stretch">
        <DonutChart
          data={revenue}
          nameKey="plan"
          valueKey="revenue"
          label="Revenue by plan"
          list={false}
          labels
          tooltip
          formatValue={dollars}
        />
      </Example>
      <Example title="Loading" className="items-stretch">
        <DonutChart
          data={revenue}
          nameKey="plan"
          valueKey="revenue"
          label="Revenue by plan"
          formatValue={dollars}
          loading
        />
      </Example>
    </ExampleWrapper>
  )
}
