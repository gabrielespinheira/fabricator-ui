import { CandlestickChart } from "@/styles/radix-fabricator/ui/candlestick-chart"

const data = [
  { week: "Sep 7", open: 171.2, high: 176.4, low: 169.8, close: 175.1 },
  { week: "Sep 14", open: 175.1, high: 178.9, low: 172.3, close: 173.0 },
  { week: "Sep 21", open: 173.0, high: 174.2, low: 166.5, close: 167.9 },
  { week: "Sep 28", open: 167.9, high: 172.8, low: 165.1, close: 171.6 },
  { week: "Oct 5", open: 171.6, high: 179.5, low: 170.9, close: 178.8 },
  { week: "Oct 12", open: 178.8, high: 183.2, low: 176.4, close: 181.7 },
  { week: "Oct 19", open: 181.7, high: 182.6, low: 175.3, close: 176.2 },
  { week: "Oct 26", open: 176.2, high: 181.0, low: 174.8, close: 180.3 },
  { week: "Nov 2", open: 180.3, high: 187.1, low: 179.0, close: 182.8 },
  { week: "Nov 9", open: 182.8, high: 183.8, low: 177.3, close: 180.4 },
  { week: "Nov 16", open: 180.4, high: 184.4, low: 173.9, close: 175.9 },
  { week: "Nov 23", open: 175.9, high: 185.0, low: 175.4, close: 182.8 },
]

// Weekly candles without volume, with a key naming the up and down colours.
export function CandlestickChartPlain() {
  return (
    <CandlestickChart
      data={data}
      index="week"
      label="ACME weekly prices"
      legend
      className="max-w-2xl"
    />
  )
}
