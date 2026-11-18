"use client"

import * as React from "react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/radix-fabricator/ui/card"
import { type ChartConfig } from "@/styles/radix-fabricator/ui/chart-kit"
import { FunnelChart } from "@/styles/radix-fabricator/ui/funnel-chart"

const COHORTS = [
  {
    name: "October",
    stages: [
      { stage: "Visited site", people: 12_400 },
      { stage: "Signed up", people: 7_310 },
      { stage: "Created a project", people: 4_870 },
      { stage: "Invited a teammate", people: 2_640 },
      { stage: "First payment", people: 1_190 },
    ],
  },
  {
    name: "November",
    stages: [
      { stage: "Visited site", people: 13_900 },
      { stage: "Signed up", people: 9_020 },
      { stage: "Created a project", people: 6_480 },
      { stage: "Invited a teammate", people: 3_150 },
      { stage: "First payment", people: 1_720 },
    ],
  },
  {
    name: "December",
    stages: [
      { stage: "Visited site", people: 10_800 },
      { stage: "Signed up", people: 5_560 },
      { stage: "Created a project", people: 3_940 },
      { stage: "Invited a teammate", people: 2_310 },
      { stage: "First payment", people: 1_380 },
    ],
  },
]

const config = { people: { label: "People" } } satisfies ChartConfig

// The next cohort morphs each stage to its new size and conversion.
export function FunnelChartDemo() {
  const [cohort, setCohort] = React.useState(0)
  const { name, stages } = COHORTS[cohort]

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <CardTitle>Sign-up funnel</CardTitle>
          <CardDescription>Acme Inc, {name} cohort</CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCohort((index) => (index + 1) % COHORTS.length)}
        >
          Next cohort
        </Button>
      </CardHeader>
      <CardContent>
        <FunnelChart
          data={stages}
          nameKey="stage"
          valueKey="people"
          config={config}
          label={`Sign-up funnel, ${name} cohort`}
        />
      </CardContent>
    </Card>
  )
}
