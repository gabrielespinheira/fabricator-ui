import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import { Button } from "@/registry/native/ui/button"
import { CandlestickChart } from "@/registry/native/ui/candlestick-chart"

const november = [
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

const weeks = [
  { week: "Sep 7", open: 171.2, high: 176.4, low: 169.8, close: 175.1 },
  { week: "Sep 14", open: 175.1, high: 178.9, low: 172.3, close: 173.0 },
  { week: "Sep 21", open: 173.0, high: 174.2, low: 166.5, close: 167.9 },
  { week: "Sep 28", open: 167.9, high: 172.8, low: 165.1, close: 171.6 },
  { week: "Oct 5", open: 171.6, high: 179.5, low: 170.9, close: 178.8 },
  { week: "Oct 12", open: 178.8, high: 183.2, low: 176.4, close: 181.7 },
  { week: "Oct 19", open: 181.7, high: 182.6, low: 175.3, close: 176.2 },
  { week: "Oct 26", open: 176.2, high: 181.0, low: 174.8, close: 180.3 },
]

type Candle = {
  time: string
  minute: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const WINDOW = 24

function noise(minute: number, draw: number) {
  let value = Math.imul(minute * 4 + draw + 1, 0x9e3779b1)
  value = Math.imul(value ^ (value >>> 15), 0x2c1b3c6d)
  value = Math.imul(value ^ (value >>> 12), 0x297a2d39)
  return ((value ^ (value >>> 15)) >>> 0) / 4_294_967_296
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function getCandle(minute: number, open: number): Candle {
  const close = round(open + (noise(minute, 0) - 0.48) * 1.6)
  return {
    time: `${String(Math.floor(minute / 60) % 24).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`,
    minute,
    open,
    high: round(Math.max(open, close) + noise(minute, 1) * 0.6),
    low: round(Math.min(open, close) - noise(minute, 2) * 0.6),
    close,
    volume: Math.round(800 + noise(minute, 3) * 2_400) * 100,
  }
}

function getOpening() {
  const candles: Candle[] = []
  let close = 182.4
  for (let minute = 0; minute < WINDOW; minute++) {
    const candle = getCandle(9 * 60 + 30 + minute, close)
    candles.push(candle)
    close = candle.close
  }
  return candles
}

// A minute candle arrives every second and the oldest drops off.
function LiveFeed() {
  const [candles, setCandles] = React.useState(getOpening)
  const [isPaused, setIsPaused] = React.useState(false)

  React.useEffect(() => {
    if (isPaused) return
    const timer = setInterval(() => {
      setCandles((current) => {
        const last = current[current.length - 1]
        return [...current.slice(1), getCandle(last.minute + 1, last.close)]
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [isPaused])

  return (
    <>
      <CandlestickChart
        data={candles}
        index="time"
        label="ACME price by minute"
        className="h-60 w-full"
      />
      <View className="flex-row">
        <Button
          size="sm"
          variant="secondary"
          onPress={() => setIsPaused((value) => !value)}
        >
          {isPaused ? "Resume" : "Pause"}
        </Button>
      </View>
    </>
  )
}

export function CandlestickChartExample() {
  return (
    <ExampleWrapper>
      <Example title="Daily prices with volume" className="items-stretch">
        <CandlestickChart
          data={november}
          index="day"
          label="ACME daily prices in November"
          formatValue={(value, key) =>
            key === "volume"
              ? `${(value / 1_000_000).toFixed(1)}M`
              : `$${value.toFixed(2)}`
          }
          className="h-64 w-full"
        />
      </Example>
      <Example title="Live" className="items-stretch">
        <LiveFeed />
      </Example>
      <Example title="Without volume, with a key" className="items-stretch">
        <CandlestickChart
          data={weeks}
          index="week"
          label="ACME weekly prices"
          legend
          className="h-56 w-full"
        />
      </Example>
      <Example title="Loading and empty" className="items-stretch">
        <CandlestickChart
          data={weeks}
          index="week"
          label="ACME weekly prices, loading"
          loading
          className="h-40 w-full"
        />
        <CandlestickChart
          data={[]}
          index="week"
          label="ACME weekly prices, no data"
          empty="Market closed"
          className="h-32 w-full"
        />
      </Example>
    </ExampleWrapper>
  )
}
