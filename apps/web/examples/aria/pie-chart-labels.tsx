import { PieChart } from "@/styles/aria-fabricator/ui/pie-chart"

const data = [
  { name: "Email", value: 412 },
  { name: "Chat", value: 318 },
  { name: "Phone", value: 126 },
  { name: "Community", value: 74 },
]

// Each slice's share, printed inside it on a pill wherever it fits. The
// smallest slices leave theirs to the tooltip and the table.
export function PieChartLabels() {
  return <PieChart data={data} label="Support tickets by channel" labels />
}
