"use client"

import * as React from "react"

import { Button } from "@/styles/base-fabricator/ui/button"
import { StatusBar } from "@/styles/base-fabricator/ui/status-bar"

const DAY = 86_400_000
const END = Date.UTC(2026, 10, 15)

const CALM = Array.from({ length: 30 }, (_, index) => ({
  date: new Date(END - (29 - index) * DAY).toISOString().slice(0, 10),
  status: "operational",
  note: undefined as string | undefined,
}))

const INCIDENT: Record<number, { status: string; note: string }> = {
  25: { status: "degraded", note: "Queue backlog building" },
  26: { status: "outage", note: "Workers down for 3 hours" },
  27: { status: "outage", note: "Partial recovery, retries failing" },
  28: { status: "degraded", note: "Draining the backlog" },
}

const STORMY = CALM.map((day, index) => ({ ...day, ...INCIDENT[index] }))

// A pill whose status changes crossfades to its new colour.
export function StatusBarIncident() {
  const [hasIncident, setHasIncident] = React.useState(false)
  return (
    <div className="flex w-full max-w-2xl flex-col gap-3">
      <div className="flex flex-wrap gap-1">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setHasIncident((value) => !value)}
        >
          {hasIncident ? "Resolve incident" : "Simulate incident"}
        </Button>
      </div>
      <StatusBar
        data={hasIncident ? STORMY : CALM}
        index="date"
        noteKey="note"
        label="Background jobs status, the last 30 days"
      />
    </div>
  )
}
