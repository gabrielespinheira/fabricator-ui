import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { AreaChart } from "@/registry/native/ui/area-chart"
import { Button } from "@/registry/native/ui/button"
import { type ChartConfig } from "@/registry/native/ui/chart-kit"
import { Text } from "@/registry/native/ui/text"

const revenue = [
  { month: "Jan", thisYear: 36_400, lastYear: 36_500 },
  { month: "Feb", thisYear: 43_000, lastYear: 35_800 },
  { month: "Mar", thisYear: 43_900, lastYear: 36_300 },
  { month: "Apr", thisYear: 44_200, lastYear: 39_900 },
  { month: "May", thisYear: 49_100, lastYear: 43_300 },
  { month: "Jun", thisYear: 52_200, lastYear: 40_900 },
  { month: "Jul", thisYear: 53_600, lastYear: 44_200 },
  { month: "Aug", thisYear: 58_700, lastYear: 45_600 },
  { month: "Sep", thisYear: 63_800, lastYear: 51_100 },
  { month: "Oct", thisYear: 67_100, lastYear: 55_500 },
  { month: "Nov", thisYear: 71_600, lastYear: 53_700 },
  { month: "Dec", thisYear: 75_600, lastYear: 55_500 },
]

const revenueConfig = {
  thisYear: { label: "This year" },
  lastYear: { label: "Last year" },
} satisfies ChartConfig

const visits = [
  { week: "W1", organic: 4_200, direct: 2_400, referral: 1_100 },
  { week: "W2", organic: 4_600, direct: 2_300, referral: 1_400 },
  { week: "W3", organic: 4_100, direct: 2_900, referral: 1_300 },
  { week: "W4", organic: 5_300, direct: 3_100, referral: 1_700 },
  { week: "W5", organic: 5_900, direct: 3_000, referral: 2_100 },
  { week: "W6", organic: 6_400, direct: 3_600, referral: 1_900 },
]

const visitsConfig = {
  organic: { label: "Organic" },
  direct: { label: "Direct" },
  referral: { label: "Referral" },
} satisfies ChartConfig

const requests = [
  { hour: "08", requests: 120 },
  { hour: "09", requests: 340 },
  { hour: "10", requests: 310 },
  { hour: "11", requests: 460 },
  { hour: "12", requests: 380 },
  { hour: "13", requests: 520 },
  { hour: "14", requests: 490 },
]

const currency = (value: number) =>
  `$${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`

const CURVES = ["smooth", "linear", "step"] as const
const STACKS = ["stacked", "expand"] as const

function CurveSwitch() {
  const [curve, setCurve] = React.useState<(typeof CURVES)[number]>("smooth")
  return (
    <>
      <AreaChart
        data={requests}
        index="hour"
        config={{ requests: { label: "Requests" } }}
        label="Requests per hour"
        curve={curve}
        className="h-48"
      />
      <ButtonRow values={CURVES} value={curve} onChange={setCurve} />
    </>
  )
}

function StackSwitch() {
  const [stack, setStack] = React.useState<(typeof STACKS)[number]>("stacked")
  return (
    <>
      <AreaChart
        data={visits}
        index="week"
        config={visitsConfig}
        label="Weekly visits by source"
        stack={stack}
        className="h-56"
      />
      <ButtonRow values={STACKS} value={stack} onChange={setStack} />
    </>
  )
}

function ButtonRow<TValue extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly TValue[]
  value: TValue
  onChange: (value: TValue) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-1">
      {values.map((item) => (
        <Button
          key={item}
          size="sm"
          variant={item === value ? "secondary" : "ghost"}
          accessibilityState={{ selected: item === value }}
          onPress={() => onChange(item)}
        >
          <Text className="capitalize">{item}</Text>
        </Button>
      ))}
    </View>
  )
}

export function AreaChartExample() {
  return (
    <ExampleWrapper>
      <Example title="Two series" className="items-stretch">
        <AreaChart
          data={revenue}
          index="month"
          config={revenueConfig}
          label="Monthly revenue"
          formatValue={currency}
          className="h-60 w-full"
        />
      </Example>
      <Example title="Stacked and expanded" className="items-stretch">
        <StackSwitch />
      </Example>
      <Example title="Curves" className="items-stretch">
        <CurveSwitch />
      </Example>
      <Example title="Empty" className="items-stretch">
        <AreaChart
          data={[]}
          index="month"
          config={revenueConfig}
          label="Monthly revenue"
          empty="No revenue yet"
          className="h-40 w-full"
        />
      </Example>
    </ExampleWrapper>
  )
}
