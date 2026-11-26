import { type KanbanPlacement } from "@/registry/bases/__base__/lib/kanban-model"
import {
  formatPropertyValue,
  getOptionFilter,
  isMultiProperty,
  matchesPropertyFilters,
  toggleOptionFilter,
  type PropertyDefinition,
  type PropertyFilterGroup,
} from "@/registry/bases/__base__/lib/property-model"

export type BoardSubtask = { id: string; title: string; isDone: boolean }

export type BoardChange = { propertyId: string; from: unknown; to: unknown }

export type BoardActivity = { id: string; personId: string; at: number } & (
  | { kind: "comment"; text: string }
  | { kind: "created" }
  | ({ kind: "change" } & BoardChange)
)

export type BoardTicket = {
  /** Its project's key and a number: SHOP-118. */
  id: string
  title: string
  description: string
  subtasks: readonly BoardSubtask[]
  /** Oldest first. */
  activity: readonly BoardActivity[]
  /** What its properties hold, by property ID. */
  values: Readonly<Record<string, unknown>>
}

/** What the new ticket form collects. */
export type BoardTicketDraft = Pick<
  BoardTicket,
  "title" | "description" | "values"
>

export type BoardViewFilters = {
  id: string
  filters: PropertyFilterGroup | undefined
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Changes closer than this to the last one are told as one. */
const JOIN_WITHIN = 2 * MINUTE

const LOGGED = ["status", "priority", "assignee", "labels", "due", "estimate"]
const CLOSED = new Set<unknown>(["done", "canceled"])

export function getTicketTitle(ticket: BoardTicket) {
  return ticket.title
}

export function getTicketValue(
  ticket: BoardTicket,
  propertyId: string
): unknown {
  switch (propertyId) {
    case "key":
      return ticket.id
    case "subtasks":
      if (!ticket.subtasks.length) return undefined
      return {
        done: ticket.subtasks.filter(({ isDone }) => isDone).length,
        total: ticket.subtasks.length,
      }
    case "comments":
      return (
        ticket.activity.filter(({ kind }) => kind === "comment").length ||
        undefined
      )
    default:
      return ticket.values[propertyId]
  }
}

export function setTicketValue(
  ticket: BoardTicket,
  propertyId: string,
  value: unknown
): BoardTicket {
  return { ...ticket, values: { ...ticket.values, [propertyId]: value } }
}

/** Writes where a ticket was dropped: its column, and its row if there are. */
export function moveTicket(
  ticket: BoardTicket,
  { columnId, laneId }: KanbanPlacement,
  rowProperty: string | undefined
): BoardTicket {
  const moved = setTicketValue(ticket, "status", columnId)
  return rowProperty ? setTicketValue(moved, rowProperty, laneId) : moved
}

// MARK: Activity

function isBlank(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0)
  )
}

function isSameValue(left: unknown, right: unknown) {
  if (isBlank(left) && isBlank(right)) return true
  return JSON.stringify(left) === JSON.stringify(right)
}

type ChangeAuthor = { personId: string; at: number; createId: () => string }

function addChange(
  activity: readonly BoardActivity[],
  change: BoardChange,
  { personId, at, createId }: ChangeAuthor
): readonly BoardActivity[] {
  const last = activity.at(-1)
  const isJoined =
    last?.kind === "change" &&
    last.propertyId === change.propertyId &&
    last.personId === personId &&
    at - last.at < JOIN_WITHIN
  const from = isJoined ? last.from : change.from
  const earlier = isJoined ? activity.slice(0, -1) : activity
  if (isSameValue(from, change.to)) return earlier
  return [
    ...earlier,
    { id: createId(), kind: "change", personId, at, ...change, from },
  ]
}

/** The tickets after a change, each with what changed added to its activity. */
export function recordChanges(
  before: readonly BoardTicket[],
  after: readonly BoardTicket[],
  author: ChangeAuthor
): BoardTicket[] {
  const previous = new Map(before.map((ticket) => [ticket.id, ticket]))
  return after.map((ticket) => {
    const old = previous.get(ticket.id)
    if (!old || old.values === ticket.values) return ticket
    const activity = LOGGED.reduce((entries, propertyId) => {
      const from = old.values[propertyId]
      const to = ticket.values[propertyId]
      return isSameValue(from, to)
        ? entries
        : addChange(entries, { propertyId, from, to }, author)
    }, ticket.activity)
    return activity === ticket.activity ? ticket : { ...ticket, activity }
  })
}

/** What a change did, to follow the name of who made it. */
export function describeChange(
  { propertyId, from, to }: BoardChange,
  properties: readonly PropertyDefinition[]
) {
  const property = properties.find(({ id }) => id === propertyId)
  if (!property) return "changed this ticket"
  const name = property.name.toLowerCase()
  if (isBlank(to))
    return propertyId === "assignee"
      ? "removed the assignee"
      : `cleared the ${name}`
  const value = [to]
    .flat()
    .map((entry) => formatPropertyValue(property, entry))
    .join(", ")
  if (propertyId === "status")
    return `moved this from ${formatPropertyValue(property, from)} to ${value}`
  if (propertyId === "assignee") return `assigned this to ${value}`
  return `set the ${name} to ${value}`
}

/** How long ago something happened, or the day once a week has passed. */
export function formatTicketTime(at: number, now: number) {
  const elapsed = now - at
  if (elapsed < MINUTE) return "Just now"
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m ago`
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h ago`
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}d ago`
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(at)
}

// MARK: Views

/** Filters for picked options: `{ priority: ["urgent", "high"] }`. */
export function createFilters(
  properties: readonly PropertyDefinition[],
  picks: Record<string, readonly string[]>
): PropertyFilterGroup | undefined {
  return properties.reduce<PropertyFilterGroup | undefined>(
    (filters, property) =>
      (picks[property.id] ?? []).reduce(
        (group, key) => toggleOptionFilter(group, property, key),
        filters
      ),
    undefined
  )
}

function getPicks(filters: PropertyFilterGroup | undefined) {
  return (filters?.filters ?? [])
    .flatMap((filter) =>
      "propertyId" in filter
        ? [
            `${filter.propertyId}:${[...getOptionFilter(filters, filter.propertyId)].sort().join()}`,
          ]
        : []
    )
    .sort()
    .join(";")
}

export function isSameFilters(
  left: PropertyFilterGroup | undefined,
  right: PropertyFilterGroup | undefined
) {
  return getPicks(left) === getPicks(right)
}

/** The saved view the board shows, or null once its filters were changed. */
export function getActiveViewId(
  views: readonly BoardViewFilters[],
  filters: PropertyFilterGroup | undefined
) {
  return views.find((view) => isSameFilters(view.filters, filters))?.id ?? null
}

/** Shows or stops showing one person's tickets, beside the other filters. */
export function toggleMember(
  filters: PropertyFilterGroup | undefined,
  personId: string,
  properties: readonly PropertyDefinition[]
) {
  const assignee = properties.find(({ id }) => id === "assignee")
  return assignee ? toggleOptionFilter(filters, assignee, personId) : filters
}

/** What a ticket added to a filtered board starts with, so it stays in view. */
export function getFilterDefaults(
  filters: PropertyFilterGroup | undefined,
  properties: readonly PropertyDefinition[]
): Record<string, unknown> {
  return Object.fromEntries(
    properties.flatMap((property) => {
      const value = getOptionFilter(filters, property.id).at(-1)
      if (value === undefined || property.id === "status") return []
      return [[property.id, isMultiProperty(property) ? [value] : value]]
    })
  )
}

/** How many tickets a view holds that aren't done or canceled. */
export function countOpenTickets(
  tickets: readonly BoardTicket[],
  properties: readonly PropertyDefinition[],
  filters: PropertyFilterGroup | undefined
) {
  const definitions = new Map(
    properties.map((property) => [property.id, property])
  )
  return tickets.filter(
    (ticket) =>
      !CLOSED.has(ticket.values.status) &&
      (!filters ||
        matchesPropertyFilters(filters, definitions, (id) =>
          getTicketValue(ticket, id)
        ))
  ).length
}

// MARK: Tickets

export function getNextTicketNumber(tickets: readonly BoardTicket[]) {
  return (
    tickets.reduce((highest, { id }) => {
      const number = Number(id.split("-").at(-1))
      return Number.isInteger(number) ? Math.max(highest, number) : highest
    }, 0) + 1
  )
}

const LINK_PARAM = "ticket"

export function getTicketLink(address: string, ticketId: string) {
  const url = new URL(address)
  url.searchParams.set(LINK_PARAM, ticketId)
  return url.toString()
}

export function readTicketLink(address: string) {
  return new URL(address).searchParams.get(LINK_PARAM)
}
