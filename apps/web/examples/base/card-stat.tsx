import {
  Card,
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
    previous: "",
    change: null,
    isGoodWhenUp: false,
  },
]

// A KPI row: the title names the number, the value is the largest text, and
// the delta says whether it moved the right way. A missing comparison says
// No data instead of a zero.
export function CardStat() {
  return (
    <div className="grid w-full max-w-4xl grid-cols-2 gap-(--density-16) md:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.label}>
          <CardHeader>
            <CardTitle>{metric.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <CardValue>
              {metric.value}
              <Delta
                change={metric.change}
                isGoodWhenUp={metric.isGoodWhenUp}
                unit={metric.unit}
              />
              {metric.previous && (
                <CardValueCaption>{metric.previous}</CardValueCaption>
              )}
            </CardValue>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
