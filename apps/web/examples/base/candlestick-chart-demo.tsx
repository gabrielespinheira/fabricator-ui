"use client"

import { formatChartNumber } from "@/styles/base-fabricator/lib/chart-model"
import { CandlestickChart } from "@/styles/base-fabricator/ui/candlestick-chart"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"

const data = [
  {
    day: "Nov 2",
    open: 182.6,
    high: 184.65,
    low: 180.84,
    close: 182.45,
    volume: 3_384_000,
  },
  {
    day: "Nov 3",
    open: 182.5,
    high: 184.0,
    low: 179.04,
    close: 181.12,
    volume: 4_769_000,
  },
  {
    day: "Nov 4",
    open: 180.62,
    high: 185.29,
    low: 179.88,
    close: 183.5,
    volume: 4_544_000,
  },
  {
    day: "Nov 5",
    open: 183.5,
    high: 186.49,
    low: 183.49,
    close: 185.02,
    volume: 4_820_000,
  },
  {
    day: "Nov 6",
    open: 185.69,
    high: 187.11,
    low: 182.68,
    close: 182.76,
    volume: 4_773_000,
  },
  {
    day: "Nov 9",
    open: 181.88,
    high: 183.76,
    low: 178.62,
    close: 179.89,
    volume: 3_677_000,
  },
  {
    day: "Nov 10",
    open: 179.24,
    high: 183.02,
    low: 177.3,
    close: 181.85,
    volume: 4_802_000,
  },
  {
    day: "Nov 11",
    open: 181.75,
    high: 181.87,
    low: 177.38,
    close: 178.72,
    volume: 5_802_000,
  },
  {
    day: "Nov 12",
    open: 178.21,
    high: 179.94,
    low: 177.48,
    close: 179.44,
    volume: 5_508_000,
  },
  {
    day: "Nov 13",
    open: 180.16,
    high: 180.92,
    low: 179.48,
    close: 180.43,
    volume: 3_787_000,
  },
  {
    day: "Nov 16",
    open: 179.58,
    high: 182.54,
    low: 177.92,
    close: 180.91,
    volume: 6_116_000,
  },
  {
    day: "Nov 17",
    open: 180.09,
    high: 184.44,
    low: 177.83,
    close: 183.41,
    volume: 4_540_000,
  },
  {
    day: "Nov 18",
    open: 182.63,
    high: 183.5,
    low: 178.29,
    close: 179.45,
    volume: 5_908_000,
  },
  {
    day: "Nov 19",
    open: 180.25,
    high: 181.98,
    low: 175.26,
    close: 177.5,
    volume: 4_735_000,
  },
  {
    day: "Nov 20",
    open: 177.91,
    high: 179.16,
    low: 173.91,
    close: 175.88,
    volume: 3_974_000,
  },
  {
    day: "Nov 23",
    open: 176.87,
    high: 179.72,
    low: 175.83,
    close: 177.52,
    volume: 4_795_000,
  },
  {
    day: "Nov 24",
    open: 177.19,
    high: 178.85,
    low: 175.44,
    close: 178.07,
    volume: 4_038_000,
  },
  {
    day: "Nov 25",
    open: 177.97,
    high: 182.25,
    low: 175.58,
    close: 180.58,
    volume: 6_515_000,
  },
  {
    day: "Nov 27",
    open: 180.44,
    high: 181.68,
    low: 180.2,
    close: 180.97,
    volume: 5_102_000,
  },
  {
    day: "Nov 30",
    open: 180.6,
    high: 184.98,
    low: 180.38,
    close: 182.81,
    volume: 5_110_000,
  },
]

// Prices in dollars, volume as shares: the key says which is which.
function formatValue(value: number, key: string) {
  return key === "volume"
    ? formatChartNumber(value, { compact: true })
    : `$${value.toFixed(2)}`
}

export function CandlestickChartDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>ACME</CardTitle>
        <CardDescription>Acme Inc, daily prices in November</CardDescription>
      </CardHeader>
      <CardContent>
        <CandlestickChart
          data={data}
          index="day"
          label="ACME daily prices in November"
          formatValue={formatValue}
        />
      </CardContent>
    </Card>
  )
}
