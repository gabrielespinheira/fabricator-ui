// The Event Calendar's range loader as pure functions. Events load by month:
// a view asks for the months it touches, the neighbouring months prefetch, a
// month is fetched once and kept until the cache outgrows its size, and a
// change patches every loaded month it touches, so moving an event across a
// month boundary shows at once.
//
// Months are in the calendar's time zone; keys are "YYYY-MM".

import { addMonths, format, startOfMonth } from "date-fns"

import {
  applyEventChange,
  overlapsRange,
  parseEventDate,
  toZoned,
  type CalendarEvent,
  type EventCalendarChange,
  type EventCalendarRange,
} from "./event-calendar-model"

type EventCalendarLoadRequest = {
  start: Date
  end: Date
  signal: AbortSignal
}

type EventCalendarLoader<TData = unknown> = (
  request: EventCalendarLoadRequest
) => Promise<CalendarEvent<TData>[]>

type EventCalendarChunk<TData = unknown> = {
  status: "loading" | "loaded" | "error"
  events: CalendarEvent<TData>[]
}

type EventCalendarChunks<TData = unknown> = Map<
  string,
  EventCalendarChunk<TData>
>

const KEY_FORMAT = "yyyy-MM"

function getChunkRange(key: string, timeZone?: string): EventCalendarRange {
  const start = parseEventDate(`${key}-01`, timeZone)
  return {
    start,
    end: new Date(+addMonths(toZoned(start, timeZone), 1)),
  }
}

/**
 * The months a range touches, in order; with `prefetch`, then the month
 * before and the month after.
 */
function getChunkKeys(
  range: EventCalendarRange,
  timeZone?: string,
  { prefetch = false }: { prefetch?: boolean } = {}
): string[] {
  const keys: string[] = []
  let month = startOfMonth(toZoned(range.start, timeZone))
  while (+month < +range.end) {
    keys.push(format(month, KEY_FORMAT))
    month = addMonths(month, 1)
  }
  if (!prefetch || keys.length === 0) return keys
  const first = startOfMonth(toZoned(range.start, timeZone))
  return [
    ...keys,
    format(addMonths(first, -1), KEY_FORMAT),
    format(month, KEY_FORMAT),
  ]
}

/**
 * Months to fetch: never asked for. A failed month stays failed until the
 * person retries, so a server that's down isn't asked again on every render.
 */
function getKeysToLoad(chunks: EventCalendarChunks, keys: string[]): string[] {
  return keys.filter((key) => !chunks.has(key))
}

const toMonthNumber = (key: string) =>
  Number(key.slice(0, 4)) * 12 + Number(key.slice(5, 7))

/**
 * Months to drop once more than `size` are kept: the farthest from the ones
 * in view first. Months in view and months still loading stay.
 */
function getKeysToEvict(
  chunks: EventCalendarChunks,
  keep: string[],
  size: number
): string[] {
  if (chunks.size <= size || keep.length === 0) return []
  const kept = keep.map(toMonthNumber)
  const distance = (key: string) =>
    Math.min(...kept.map((month) => Math.abs(month - toMonthNumber(key))))
  return [...chunks]
    .filter(([key, chunk]) => chunk.status !== "loading" && !keep.includes(key))
    .map(([key]) => ({ key, distance: distance(key) }))
    .sort((a, b) => b.distance - a.distance || a.key.localeCompare(b.key))
    .slice(0, chunks.size - size)
    .map((item) => item.key)
}

/** The events of the given months, each once, in the order first seen. */
function collectChunkEvents<TData>(
  chunks: EventCalendarChunks<TData>,
  keys: string[]
): CalendarEvent<TData>[] {
  const seen = new Set<string>()
  const events: CalendarEvent<TData>[] = []
  for (const key of keys) {
    for (const event of chunks.get(key)?.events ?? []) {
      if (seen.has(event.id)) continue
      seen.add(event.id)
      events.push(event)
    }
  }
  return events
}

/** Whether an event belongs in a month: a series from its start on. */
function belongsInChunk(
  event: CalendarEvent,
  range: EventCalendarRange,
  timeZone?: string
) {
  if (event.recurrence && !event.recurringEventId) {
    return parseEventDate(event.start, timeZone) < range.end
  }
  return overlapsRange(event, range, timeZone)
}

/**
 * Loaded months after a change: deleted events leave every month, updated
 * and created ones go to the months they now touch and leave the rest.
 * Months that are loading or failed are left alone; their fetch decides.
 */
function patchChunks<TData>(
  chunks: EventCalendarChunks<TData>,
  change: Pick<EventCalendarChange<TData>, "created" | "updated" | "deleted">,
  timeZone?: string
): EventCalendarChunks<TData> {
  const placed = [...change.updated, ...change.created]
  const next: EventCalendarChunks<TData> = new Map()
  for (const [key, chunk] of chunks) {
    if (chunk.status !== "loaded") {
      next.set(key, chunk)
      continue
    }
    const range = getChunkRange(key, timeZone)
    const inside = placed.filter((event) =>
      belongsInChunk(event, range, timeZone)
    )
    const leaving = placed.filter((event) => !inside.includes(event))
    const events = applyEventChange(chunk.events, {
      created: inside,
      updated: inside,
      deleted: [...change.deleted, ...leaving],
    })
    next.set(key, { ...chunk, events })
  }
  return next
}

export {
  collectChunkEvents,
  getChunkKeys,
  getChunkRange,
  getKeysToEvict,
  getKeysToLoad,
  patchChunks,
  type EventCalendarChunk,
  type EventCalendarChunks,
  type EventCalendarLoader,
  type EventCalendarLoadRequest,
}
