"use client"

import { formatChartNumber } from "@/styles/aria-fabricator/lib/chart-model"
import { Treemap } from "@/styles/aria-fabricator/ui/treemap"

const data = [
  { service: "Compute", cost: 18_400 },
  { service: "Database", cost: 9_700 },
  { service: "Storage", cost: 6_200 },
  { service: "Networking", cost: 4_100 },
  { service: "Observability", cost: 2_600 },
  { service: "Queues", cost: 1_300 },
]

// One level: each node is its own group, in the next colour of the palette.
export function TreemapFlat() {
  return (
    <Treemap
      data={data}
      nameKey="service"
      valueKey="cost"
      label="Cloud spend by service"
      formatValue={(value) => `$${formatChartNumber(value, { compact: true })}`}
      className="max-w-2xl"
    />
  )
}
