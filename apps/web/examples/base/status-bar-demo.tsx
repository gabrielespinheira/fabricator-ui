import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import { StatusBar } from "@/styles/base-fabricator/ui/status-bar"

const DAY = 86_400_000
const END = Date.UTC(2026, 10, 15)

type Status = "operational" | "degraded" | "outage"

// Sixty days per service, oldest first, with the days that went wrong.
function getDays(incidents: Record<number, [Status, string]>) {
  return Array.from({ length: 60 }, (_, index) => {
    const [status, note] = incidents[index] ?? ["operational", undefined]
    return {
      date: new Date(END - (59 - index) * DAY).toISOString().slice(0, 10),
      status,
      note,
    }
  })
}

const SERVICES = [
  {
    name: "API",
    data: getDays({
      12: ["degraded", "Slow responses from the EU region"],
      31: ["outage", "Database failover, 42 minutes"],
      32: ["degraded", "Recovering from the failover"],
    }),
  },
  {
    name: "Website",
    data: getDays({
      20: ["outage", "CDN outage in two regions, 25 minutes"],
      44: ["degraded", "Images loading slowly"],
      58: ["degraded", "Search results delayed"],
    }),
  },
]

const STATUS = {
  operational: { label: "Operational", dot: "bg-success" },
  degraded: { label: "Degraded", dot: "bg-warning" },
  outage: { label: "Outage", dot: "bg-destructive" },
}

export function StatusBarDemo() {
  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>System status</CardTitle>
        <CardDescription>Acme Inc, the last 60 days</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {SERVICES.map((service, position) => {
          const current = STATUS[service.data[service.data.length - 1].status]
          return (
            <div key={service.name} className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">{service.name}</span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className={`size-2 rounded-full ${current.dot}`} />
                  {current.label}
                </span>
              </div>
              {/* The last bar's legend names every status in the card. */}
              <StatusBar
                data={service.data}
                index="date"
                noteKey="note"
                label={`${service.name} status, the last 60 days`}
                legend={position === SERVICES.length - 1}
              />
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
