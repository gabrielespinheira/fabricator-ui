"use client"

import * as React from "react"

import { useBoardNow } from "@/registry/bases/__base__/blocks/board-01/hooks/use-board-now"
import {
  BOARD_CARD_PROPERTIES,
  BOARD_ME,
  BOARD_VIEWS,
  createBoardProjects,
  createBoardProperties,
  type BoardProject,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-data"
import {
  countOpenTickets,
  getActiveViewId,
  getFilterDefaults,
  getNextTicketNumber,
  recordChanges,
  type BoardTicket,
  type BoardTicketDraft,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import { type KanbanColumn } from "@/registry/bases/__base__/lib/kanban-model"
import { type KanbanView } from "@/registry/bases/__base__/ui/kanban"

const DEFAULT_VIEW: KanbanView = {
  hiddenColumns: ["canceled"],
  visibleProperties: BOARD_CARD_PROPERTIES,
  colorColumns: true,
}

/** The open project with its tickets, and everything that changes them. */
export function useBoard() {
  // Undefined until the page is in the browser, whose day the dates follow.
  const now = useBoardNow()
  const [projects, setProjects] = React.useState(() =>
    createBoardProjects(new Date())
  )
  const [projectId, setProjectId] =
    React.useState<BoardProject["id"]>("storefront")
  const [views, setViews] = React.useState<Record<string, KanbanView>>({})
  const [openId, setOpenId] = React.useState<string | null>(null)
  const numbers = React.useRef(new Map<string, number>())

  const project = projects.find(({ id }) => id === projectId) ?? projects[0]
  const view = views[project.id] ?? DEFAULT_VIEW
  const properties = React.useMemo(
    () => createBoardProperties(project.columns),
    [project.columns]
  )

  function updateProject(change: (project: BoardProject) => BoardProject) {
    setProjects((list) =>
      list.map((entry) => (entry.id === project.id ? change(entry) : entry))
    )
  }

  function updateTickets(
    change: (tickets: readonly BoardTicket[]) => readonly BoardTicket[]
  ) {
    const at = Date.now()
    updateProject((entry) => ({
      ...entry,
      tickets: recordChanges(entry.tickets, change(entry.tickets), {
        personId: BOARD_ME,
        at,
        createId: () => crypto.randomUUID(),
      }),
    }))
  }

  /** Makes a ticket with the project's next ID. Several can be made at once. */
  function createTicket({
    title,
    description,
    values,
  }: BoardTicketDraft): BoardTicket {
    const number =
      numbers.current.get(project.id) ?? getNextTicketNumber(project.tickets)
    numbers.current.set(project.id, number + 1)
    const id = `${project.key}-${number}`
    return {
      id,
      title,
      description,
      subtasks: [],
      activity: [
        {
          id: `${id}-created`,
          kind: "created",
          personId: BOARD_ME,
          at: Date.now(),
        },
      ],
      values,
    }
  }

  function setView(next: KanbanView) {
    setViews((current) => ({ ...current, [project.id]: next }))
  }

  return {
    now,
    projects,
    project,
    properties,
    view,
    setView,
    /** The saved view on screen, or null once its filters were changed. */
    viewId: getActiveViewId(BOARD_VIEWS, view.filters),
    /** What a new ticket starts with in this view. */
    defaults: getFilterDefaults(view.filters, properties),
    openId,
    setOpenId,
    createTicket,
    updateTickets,
    updateTicket: (
      ticketId: string,
      change: (ticket: BoardTicket) => BoardTicket
    ) =>
      updateTickets((tickets) =>
        tickets.map((ticket) =>
          ticket.id === ticketId ? change(ticket) : ticket
        )
      ),
    setColumns: (columns: KanbanColumn[]) =>
      updateProject((entry) => ({ ...entry, columns })),
    getCount: (entry: BoardProject, viewId: string) =>
      now === undefined
        ? 0
        : countOpenTickets(
            entry.tickets,
            createBoardProperties(entry.columns),
            BOARD_VIEWS.find(({ id }) => id === viewId)?.filters
          ),
    /** Opens a project on one of its saved views. */
    showView: (nextId: BoardProject["id"], viewId: string) => {
      setProjectId(nextId)
      setOpenId(null)
      setViews((current) => ({
        ...current,
        [nextId]: {
          ...(current[nextId] ?? DEFAULT_VIEW),
          search: "",
          filters: BOARD_VIEWS.find(({ id }) => id === viewId)?.filters,
        },
      }))
    },
    /** Opens a ticket wherever it is. */
    showTicket: (ticketId: string) => {
      const owner = projects.find(({ tickets }) =>
        tickets.some(({ id }) => id === ticketId)
      )
      if (!owner) return
      setProjectId(owner.id)
      setOpenId(ticketId)
    },
  }
}
