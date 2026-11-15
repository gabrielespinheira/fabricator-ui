"use client"

import * as React from "react"

import { Badge } from "@/styles/base-fabricator/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/styles/base-fabricator/ui/card"
import {
  EventCalendar,
  type CalendarEvent,
  type CalendarSource,
  type EventCalendarLoadRequest,
} from "@/styles/base-fabricator/ui/event-calendar"
import { Spinner } from "@/styles/base-fabricator/ui/spinner"

const calendars: CalendarSource[] = [
  { id: "sales", name: "Sales", color: "blue" },
  { id: "support", name: "Support", color: "teal" },
  { id: "hiring", name: "Hiring", color: "pink" },
  { id: "ops", name: "Operations", color: "orange" },
]

const TITLES = [
  "Demo with Acme Inc",
  "Pipeline review",
  "Customer call",
  "Escalation sync",
  "Interview: backend",
  "Hiring panel",
  "Vendor check-in",
  "Quarterly planning",
  "Onboarding session",
  "Incident review",
]

// The stand-in server holds ten years around today, 840 events a month:
// about 100,000 events, of which the calendar only ever asks for a few
// months.
const EVENTS_PER_MONTH = 840
const YEARS = 10
const TOTAL_EVENTS = EVENTS_PER_MONTH * 12 * YEARS
const FIRST_YEAR = new Date().getFullYear() - YEARS / 2

/** A small seeded generator, so a month always holds the same events. */
function createRandom(seed: number) {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const pad = (value: number) => String(value).padStart(2, "0")

/** The month's events, as the server stores them. */
function createMonth(year: number, month: number): CalendarEvent[] {
  if (year < FIRST_YEAR || year >= FIRST_YEAR + YEARS) return []
  const random = createRandom(year * 12 + month)
  const days = new Date(year, month + 1, 0).getDate()
  return Array.from({ length: EVENTS_PER_MONTH }, (_, index) => {
    const day = 1 + Math.floor(random() * days)
    const hour = 8 + Math.floor(random() * 10)
    const minutes = random() < 0.5 ? 0 : 30
    const length = [30, 45, 60, 90][Math.floor(random() * 4)]
    const end = hour * 60 + minutes + length
    const date = `${year}-${pad(month + 1)}-${pad(day)}`
    return {
      id: `${date}-${index}`,
      title: TITLES[Math.floor(random() * TITLES.length)],
      start: `${date}T${pad(hour)}:${pad(minutes)}:00`,
      end: `${date}T${pad(Math.floor(end / 60))}:${pad(end % 60)}:00`,
      calendarId: calendars[Math.floor(random() * calendars.length)].id,
    }
  })
}

/** A request to the stand-in server: 300ms, cancelled with the signal. */
function fetchMonth(start: Date, signal: AbortSignal) {
  return new Promise<CalendarEvent[]>((resolve, reject) => {
    const timer = setTimeout(
      () => resolve(createMonth(start.getFullYear(), start.getMonth())),
      300
    )
    signal.addEventListener("abort", () => {
      clearTimeout(timer)
      reject(signal.reason)
    })
  })
}

/** Saving takes 400ms; the change shows as pending until then. */
function saveChange() {
  return new Promise<void>((resolve) => setTimeout(resolve, 400))
}

type MonthRequest = {
  id: number
  month: string
  status: "loading" | "loaded" | "cancelled" | "failed"
  events?: number
  milliseconds?: number
}

const MAX_REQUESTS = 8

const monthLabel = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
})

function RequestStatus({ request }: { request: MonthRequest }) {
  if (request.status === "loading") {
    return (
      <span className="flex items-center gap-2 text-muted-foreground">
        <Spinner className="size-3.5" />
        Loading
      </span>
    )
  }
  if (request.status === "cancelled") {
    return <Badge variant="secondary">Cancelled</Badge>
  }
  if (request.status === "failed") {
    return <Badge variant="destructive">Failed</Badge>
  }
  return (
    <span className="whitespace-nowrap text-muted-foreground tabular-nums">
      {`${request.events?.toLocaleString("en-US")} events · ${request.milliseconds}ms`}
    </span>
  )
}

export function EventCalendarLoader() {
  const [requests, setRequests] = React.useState<MonthRequest[]>([])
  const requestId = React.useRef(0)

  // The calendar calls this once per month it needs: the months in view,
  // then the months either side. A month that leaves the view before it
  // arrives is cancelled through the signal.
  const loadEvents = React.useCallback(
    ({ start, signal }: EventCalendarLoadRequest) => {
      requestId.current += 1
      const id = requestId.current
      const startedAt = performance.now()
      const update = (patch: Partial<MonthRequest>) =>
        setRequests((current) =>
          current.map((request) =>
            request.id === id ? { ...request, ...patch } : request
          )
        )
      setRequests((current) =>
        [
          { id, month: monthLabel.format(start), status: "loading" as const },
          ...current,
        ].slice(0, MAX_REQUESTS)
      )
      return fetchMonth(start, signal).then(
        (events) => {
          update({
            status: "loaded",
            events: events.length,
            milliseconds: Math.round(performance.now() - startedAt),
          })
          return events
        },
        (error: unknown) => {
          update({ status: signal.aborted ? "cancelled" : "failed" })
          throw error
        }
      )
    },
    []
  )

  return (
    <div className="flex w-full flex-col gap-4">
      <EventCalendar
        load={loadEvents}
        calendars={calendars}
        onEventChange={saveChange}
        className="h-[52rem] w-full"
      />
      <Card size="sm">
        <CardHeader>
          <CardTitle>Requests</CardTitle>
          <CardDescription>
            {`The server holds ${TOTAL_EVENTS.toLocaleString("en-US")} events. The calendar asks for one month at a time and the months either side, and keeps the last 24.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-2">
            {requests.map((request) => (
              <li
                key={request.id}
                className="flex min-h-9 items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-1.5"
              >
                <span className="font-medium whitespace-nowrap">
                  {request.month}
                </span>
                <RequestStatus request={request} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
