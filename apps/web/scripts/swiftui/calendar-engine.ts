import { z } from "zod"

import type { CalendarEvent } from "../../registry/fabricator/shared/lib/event-calendar-model"
import {
  applyRecurringDelete,
  applyRecurringEdit,
  expandEvents,
  getRecurrencePresets,
  parseRecurrence,
} from "../../registry/fabricator/shared/lib/event-calendar-recurrence"

const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  start: z.string(),
  end: z.string(),
  allDay: z.boolean().optional(),
  calendarId: z.string().optional(),
  color: z
    .enum([
      "primary",
      "secondary",
      "info",
      "success",
      "warning",
      "destructive",
      "red",
      "orange",
      "yellow",
      "green",
      "teal",
      "cyan",
      "blue",
      "indigo",
      "purple",
      "pink",
      "gray",
    ])
    .optional(),
  recurrence: z.string().optional(),
  recurringEventId: z.string().optional(),
  originalStart: z.string().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  editable: z.boolean().optional(),
  location: z.string().optional(),
  description: z.string().optional(),
})
const requestSchema = z.object({
  action: z.enum([
    "environment",
    "expand",
    "edit",
    "delete",
    "presets",
    "validate",
  ]),
  events: z.array(eventSchema).default([]),
  start: z.string().optional(),
  end: z.string().optional(),
  timeZone: z.string(),
  occurrence: eventSchema.optional(),
  next: eventSchema.optional(),
  scope: z.enum(["this", "following", "all"]).default("this"),
  recurrence: z.string().optional(),
  newID: z.string().optional(),
})

function execute(requestJSON: string): string {
  try {
    const request = requestSchema.parse(JSON.parse(requestJSON))
    const resolvedZone = new Intl.DateTimeFormat("en-US", {
      timeZone: request.timeZone,
    }).resolvedOptions().timeZone
    const stored: CalendarEvent[] = request.events
    if (request.action === "environment")
      return JSON.stringify({
        ok: true,
        value: { events: [], timeZone: resolvedZone },
      })
    if (request.action === "validate") {
      if (request.recurrence) parseRecurrence(request.recurrence)
      return JSON.stringify({ ok: true, value: { events: stored } })
    }
    if (request.action === "presets")
      return JSON.stringify({
        ok: true,
        value: {
          events: [],
          presets: getRecurrencePresets(new Date(request.start ?? ""), {
            timeZone: request.timeZone,
            locale: "en-US",
          }),
        },
      })
    if (request.action === "expand") {
      if (!request.start || !request.end)
        throw new Error("Calendar range is missing")
      return JSON.stringify({
        ok: true,
        value: {
          events: expandEvents(
            stored,
            { start: new Date(request.start), end: new Date(request.end) },
            request.timeZone
          ),
        },
      })
    }
    if (!request.occurrence) throw new Error("Calendar occurrence is missing")
    if (request.action === "edit" && !request.next)
      throw new Error("Updated occurrence is missing")
    const change =
      request.action === "edit" && request.next
        ? applyRecurringEdit({
            stored,
            occurrence: request.occurrence,
            next: request.next,
            scope: request.scope,
            timeZone: request.timeZone,
            createId: () => {
              if (!request.newID)
                throw new Error("A new series identifier is required")
              return request.newID
            },
          })
        : applyRecurringDelete({
            stored,
            occurrence: request.occurrence,
            scope: request.scope,
            timeZone: request.timeZone,
          })
    const deleted = new Set(change.deleted.map((event) => event.id))
    const updates = new Map(change.updated.map((event) => [event.id, event]))
    const events = stored
      .filter((event) => !deleted.has(event.id))
      .map((event) => updates.get(event.id) ?? event)
    return JSON.stringify({
      ok: true,
      value: { events: [...events, ...change.created] },
    })
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: {
        name: error instanceof Error ? error.name : "CalendarError",
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

declare global {
  var FabricatorCalendarBridge: (request: string) => string
}
globalThis.FabricatorCalendarBridge = execute
