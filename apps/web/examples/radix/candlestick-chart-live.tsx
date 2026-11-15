"use client"

import * as React from "react"

import { Button } from "@/styles/radix-fabricator/ui/button"
import { CandlestickChart } from "@/styles/radix-fabricator/ui/candlestick-chart"

type Candle = {
  time: string
  minute: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

const WINDOW = 30
const OPENING_MINUTE = 9 * 60 + 30

// A repeatable 0 to 1 for each minute and draw, so the first render is the
// same on the server and in the browser.
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
    const candle = getCandle(OPENING_MINUTE + minute, close)
    candles.push(candle)
    close = candle.close
  }
  return candles
}

// A minute candle arrives every second; the oldest drops off and the rest
// slide along. Pause stops the feed.
export function CandlestickChartLive() {
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
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setIsPaused((value) => !value)}
        >
          {isPaused ? "Resume" : "Pause"}
        </Button>
      </div>
      <CandlestickChart
        data={candles}
        index="time"
        label="ACME price by minute"
      />
    </div>
  )
}
