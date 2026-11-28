import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  CardValue,
  CardValueCaption,
} from "@/styles/base-fabricator/ui/card"
import { Delta } from "@/styles/base-fabricator/ui/delta"

const metrics = [
  {
    label: "Money in",
    value: "$981K",
    previous: "from $879.5K",
    change: 11.5,
    isGoodWhenUp: true,
  },
  {
    label: "Money out",
    value: "$1.02M",
    previous: "from $1M",
    change: 2.1,
    isGoodWhenUp: false,
  },
  {
    label: "Churn rate",
    value: "2.4%",
    previous: "from 2.8%",
    change: -0.4,
    isGoodWhenUp: false,
    unit: "pt" as const,
  },
  {
    label: "Refunds",
    value: "$0",
    previous: "First month tracked",
    change: null,
    isGoodWhenUp: false,
  },
]

// A KPI row: the title names the number and the delta beside it says whether
// it moved the right way; the value is the largest text, with the previous
// value under it. A missing comparison says No data instead of a zero.
export function CardStat() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-2 gap-(--density-16) md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <CardTitle>{metric.label}</CardTitle>
            <CardAction>
              <Delta
                change={metric.change}
                isGoodWhenUp={metric.isGoodWhenUp}
                unit={metric.unit}
              />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-(--density-6)">
            <CardValue>{metric.value}</CardValue>
            <CardValueCaption>{metric.previous}</CardValueCaption>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
