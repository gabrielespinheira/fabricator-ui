import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"
import { RadarChart } from "@/styles/radix-fabricator/ui/radar-chart"

const data = [
  { skill: "Research", design: 70 },
  { skill: "Interface", design: 92 },
  { skill: "Prototyping", design: 85 },
  { skill: "Writing", design: 60 },
  { skill: "Accessibility", design: 78 },
]

const config = { design: { label: "Design team" } } satisfies ChartConfig

// One series needs no legend: the label names what is plotted.
export function RadarChartSingle() {
  return (
    <RadarChart
      data={data}
      index="skill"
      config={config}
      label="Design team skills"
      className="max-w-xl"
    />
  )
}
