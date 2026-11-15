"use client"

import { DonutChart } from "@/styles/base-fabricator/ui/donut-chart"

const data = [
  { type: "Images", size: 42.1 },
  { type: "Video", size: 31.4 },
  { type: "Documents", size: 12.8 },
  { type: "Backups", size: 8.6 },
  { type: "Other", size: 3.2 },
]

// The ring alone, without the value list: the legend names the slices
// instead, and hides one when pressed.
export function DonutChartRing() {
  return (
    <DonutChart
      data={data}
      nameKey="type"
      valueKey="size"
      label="Storage by file type"
      centerLabel="Used"
      list={false}
      formatValue={(value) => `${value.toFixed(1)} GB`}
    />
  )
}
