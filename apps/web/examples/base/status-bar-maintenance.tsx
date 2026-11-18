import { StatusBar } from "@/styles/base-fabricator/ui/status-bar"

const DAY = 86_400_000
const END = Date.UTC(2026, 10, 15)

const EVENTS: Record<number, { status: string; note: string }> = {
  8: { status: "maintenance", note: "Database upgrade to version 17" },
  21: { status: "degraded", note: "Webhook deliveries delayed" },
  37: { status: "maintenance", note: "Network switch replacement" },
  52: { status: "outage", note: "Payments unavailable for 18 minutes" },
  66: { status: "maintenance", note: "Storage migration, read only" },
  79: { status: "degraded", note: "Higher error rates on exports" },
}

// Ninety days, with the monitor switched off for the first two.
const data = Array.from({ length: 90 }, (_, index) => ({
  date: new Date(END - (89 - index) * DAY).toISOString().slice(0, 10),
  status: index < 2 ? null : (EVENTS[index]?.status ?? "operational"),
  note: EVENTS[index]?.note,
}))

// Notes show in the tooltip. `statuses` renames a status; days with none
// read as "No data".
export function StatusBarMaintenance() {
  return (
    <StatusBar
      data={data}
      index="date"
      noteKey="note"
      statuses={{ maintenance: { label: "Planned maintenance" } }}
      label="Payments status, the last 90 days"
      className="max-w-2xl"
    />
  )
}
