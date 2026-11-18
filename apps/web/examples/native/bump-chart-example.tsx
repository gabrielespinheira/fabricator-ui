import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { BumpChart } from "@/registry/native/ui/bump-chart"
import { Button } from "@/registry/native/ui/button"
import { type ChartConfig } from "@/registry/native/ui/chart-kit"

const products = [
  { month: "Jun", atlas: 1, pulse: 2, ledger: 3, relay: 4, beacon: 5 },
  { month: "Jul", atlas: 1, pulse: 3, ledger: 2, relay: 4, beacon: 5 },
  { month: "Aug", atlas: 2, pulse: 4, ledger: 1, relay: 3, beacon: 5 },
  { month: "Sep", atlas: 3, pulse: 5, ledger: 1, relay: 2, beacon: 4 },
  { month: "Oct", atlas: 4, pulse: 5, ledger: 2, relay: 1, beacon: 3 },
  { month: "Nov", atlas: 4, pulse: 5, ledger: 3, relay: 1, beacon: 2 },
]

const productsConfig = {
  atlas: { label: "Atlas" },
  pulse: { label: "Pulse" },
  ledger: { label: "Ledger" },
  relay: { label: "Relay" },
  beacon: { label: "Beacon" },
} satisfies ChartConfig

const TEAMS = ["design", "platform", "growth", "mobile", "data"] as const
const WEEKS = ["W1", "W2", "W3", "W4", "W5", "W6"]

type Week = { week: string } & Record<(typeof TEAMS)[number], number>

const START: Week[] = [
  { week: "W1", design: 42, platform: 38, growth: 31, mobile: 27, data: 19 },
  { week: "W2", design: 36, platform: 44, growth: 29, mobile: 33, data: 24 },
  { week: "W3", design: 31, platform: 47, growth: 35, mobile: 30, data: 28 },
  { week: "W4", design: 34, platform: 41, growth: 39, mobile: 26, data: 37 },
  { week: "W5", design: 29, platform: 36, growth: 45, mobile: 31, data: 40 },
  { week: "W6", design: 33, platform: 35, growth: 48, mobile: 28, data: 43 },
]

const teamsConfig = {
  design: { label: "Design" },
  platform: { label: "Platform" },
  growth: { label: "Growth" },
  mobile: { label: "Mobile" },
  data: { label: "Data" },
} satisfies ChartConfig

function getShuffled(): Week[] {
  return WEEKS.map((week) => ({
    week,
    design: Math.round(20 + Math.random() * 30),
    platform: Math.round(20 + Math.random() * 30),
    growth: Math.round(20 + Math.random() * 30),
    mobile: Math.round(20 + Math.random() * 30),
    data: Math.round(20 + Math.random() * 30),
  }))
}

// Scores ranked by the chart; Shuffle deals new ones and the points move.
function Shuffle() {
  const [data, setData] = React.useState(START)
  return (
    <>
      <BumpChart
        data={data}
        index="week"
        config={teamsConfig}
        label="Team rank by points each week"
        ranking="score"
        formatValue={(value) => `${value} pts`}
        className="h-72 w-full"
      />
      <View className="flex-row">
        <Button
          size="sm"
          variant="secondary"
          onPress={() => setData(getShuffled())}
        >
          Shuffle
        </Button>
      </View>
    </>
  )
}

export function BumpChartExample() {
  return (
    <ExampleWrapper>
      <Example title="Leaderboard" className="items-stretch">
        <BumpChart
          data={products}
          index="month"
          config={productsConfig}
          label="Product rank by revenue"
          className="h-72 w-full"
        />
      </Example>
      <Example title="Ranking scores" className="items-stretch">
        <Shuffle />
      </Example>
      <Example title="Loading and empty" className="items-stretch">
        <BumpChart
          data={products}
          index="month"
          config={productsConfig}
          label="Product rank by revenue, loading"
          loading
          legend={false}
          className="h-48 w-full"
        />
        <BumpChart
          data={[]}
          index="month"
          config={productsConfig}
          label="Product rank by revenue, no data"
          empty="No rankings yet"
          legend={false}
          className="h-32 w-full"
        />
      </Example>
    </ExampleWrapper>
  )
}
