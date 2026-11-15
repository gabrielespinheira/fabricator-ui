"use client"

import { formatChartNumber } from "@/styles/radix-fabricator/lib/chart-model"
import { SankeyChart } from "@/styles/radix-fabricator/ui/sankey-chart"

const nodes = [
  { id: "budget", label: "Budget" },
  { id: "engineering", label: "Engineering" },
  { id: "go-to-market", label: "Go to market" },
  { id: "operations", label: "Operations" },
  { id: "salaries", label: "Salaries" },
  { id: "infrastructure", label: "Infrastructure" },
  { id: "campaigns", label: "Campaigns" },
  { id: "office", label: "Office" },
]

const links = [
  { source: "budget", target: "engineering", value: 2_400_000 },
  { source: "budget", target: "go-to-market", value: 1_500_000 },
  { source: "budget", target: "operations", value: 700_000 },
  { source: "engineering", target: "salaries", value: 1_900_000 },
  { source: "engineering", target: "infrastructure", value: 500_000 },
  { source: "go-to-market", target: "salaries", value: 800_000 },
  { source: "go-to-market", target: "campaigns", value: 700_000 },
  { source: "operations", target: "salaries", value: 400_000 },
  { source: "operations", target: "office", value: 300_000 },
]

// One source split in two steps. Links take their source's colour, so each
// department's spending reads as one stream.
export function SankeyChartBudget() {
  return (
    <SankeyChart
      nodes={nodes}
      links={links}
      label="Annual budget by department and cost"
      formatValue={(value) => `$${formatChartNumber(value, { compact: true })}`}
      className="max-w-2xl"
    />
  )
}
