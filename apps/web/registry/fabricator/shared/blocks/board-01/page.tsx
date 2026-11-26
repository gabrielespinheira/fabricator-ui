"use client"

import * as React from "react"

import { notifyBoard } from "@/registry/bases/__base__/blocks/board-01/components/board-controls"
import {
  BoardHeader,
  type BoardRows,
} from "@/registry/bases/__base__/blocks/board-01/components/board-header"
import { boardIcons } from "@/registry/bases/__base__/blocks/board-01/components/board-icons"
import { BoardNewTicket } from "@/registry/bases/__base__/blocks/board-01/components/board-new-ticket"
import { BoardSidebar } from "@/registry/bases/__base__/blocks/board-01/components/board-sidebar"
import { BoardTicketView } from "@/registry/bases/__base__/blocks/board-01/components/board-ticket"
import { useBoard } from "@/registry/bases/__base__/blocks/board-01/hooks/use-board"
import { BOARD_ME } from "@/registry/bases/__base__/blocks/board-01/lib/board-data"
import {
  getTicketTitle,
  getTicketValue,
  moveTicket,
  readTicketLink,
  setTicketValue,
  type BoardTicket,
  type BoardTicketDraft,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import { type KanbanPage } from "@/registry/bases/__base__/lib/kanban-model"
import {
  AppShell,
  AppShellContent,
  AppShellMain,
  useShellShortcut,
} from "@/registry/bases/__base__/ui/app-shell"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/registry/bases/__base__/ui/empty"
import { Kanban, KanbanBoard } from "@/registry/bases/__base__/ui/kanban"
import { PropertyIconProvider } from "@/registry/bases/__base__/ui/properties"
import { type RecordViewMode } from "@/registry/bases/__base__/ui/record-view"

// For a team that plans and ships from one board: the board is the page, edge
// to edge, under one row that says what it shows. Each project keeps its saved
// views in the sidebar, and a ticket opens beside a board that stays live.
// Toasts report a new ticket: mount your Toaster once in the app's layout.

const ICONS = { comments: boardIcons.comments }
const LOADING: KanbanPage<BoardTicket> = {
  items: [],
  nextCursor: null,
  isLoading: true,
}

export default function BoardPage() {
  return (
    <AppShell storageKey="board-01" sidebarWidth="14rem">
      <PropertyIconProvider icons={ICONS}>
        <Board />
      </PropertyIconProvider>
    </AppShell>
  )
}

function Board() {
  const {
    now,
    projects,
    project,
    properties,
    view,
    defaults,
    openId,
    setOpenId,
    createTicket,
    updateTickets,
    showTicket,
    ...state
  } = useBoard()
  const [rows, setRows] = React.useState<BoardRows>("none")
  const [mode, setMode] = React.useState<RecordViewMode>("side")
  const [isCreating, setIsCreating] = React.useState(false)
  const rowProperty = rows === "none" ? undefined : rows
  const rowOptions = properties.find(({ id }) => id === rowProperty)?.options

  useShellShortcut({ id: "ticket.new", keys: "c", label: "New ticket" }, () =>
    setIsCreating(true)
  )

  const showLinkedTicket = React.useEffectEvent(() => {
    const ticketId = readTicketLink(location.href)
    if (ticketId) showTicket(ticketId)
  })
  React.useEffect(() => showLinkedTicket(), [])

  function addTicket(draft: BoardTicketDraft) {
    const ticket = createTicket(draft)
    updateTickets((tickets) => [ticket, ...tickets])
    notifyBoard(`Created ${ticket.id}`, {
      label: "Open",
      onSelect: () => setOpenId(ticket.id),
    })
  }

  return (
    <>
      <BoardSidebar
        projects={projects}
        project={project}
        viewId={state.viewId}
        getCount={state.getCount}
        onNavigate={state.showView}
      />
      <AppShellMain>
        <Kanban
          key={project.id}
          label={`${project.name} board`}
          fit={rowProperty ? "content" : "fill"}
          className="min-h-0 flex-1 gap-0"
          items={project.tickets}
          pages={
            now === undefined
              ? new Map(project.columns.map(({ id }) => [id, LOADING]))
              : undefined
          }
          columns={project.columns}
          properties={properties}
          groupBy="status"
          lanes={rowOptions?.map(({ value, label }) => ({
            id: value,
            name: label,
          }))}
          getLaneId={
            rowProperty
              ? (ticket) => {
                  const value = getTicketValue(ticket, rowProperty)
                  return typeof value === "string" ? value : null
                }
              : undefined
          }
          getTitle={getTicketTitle}
          getValue={getTicketValue}
          setValue={setTicketValue}
          moveTo={(ticket, placement) =>
            moveTicket(ticket, placement, rowProperty)
          }
          createItem={({ title, columnId, laneId, value }) =>
            createTicket({
              title,
              description: "",
              values: {
                ...defaults,
                status: value ?? columnId,
                ...(rowProperty && { [rowProperty]: laneId }),
              },
            })
          }
          onCardsChange={(change) => updateTickets(change.apply)}
          onColumnsChange={state.setColumns}
          view={view}
          onViewChange={state.setView}
        >
          {(board) => (
            <>
              <BoardHeader
                board={board}
                project={project}
                rows={rows}
                onRowsChange={setRows}
                onNewTicket={() => setIsCreating(true)}
              />
              <AppShellContent className="flex min-h-0 flex-col overflow-hidden">
                {project.tickets.length === 0 ? (
                  <BoardEmpty
                    name={project.name}
                    onNewTicket={() => setIsCreating(true)}
                  />
                ) : (
                  <KanbanBoard
                    board={board}
                    openId={openId}
                    onOpenCard={({ id }) => setOpenId(id)}
                    addLabel="New ticket"
                    className="scroll-px-(--density-16) px-(--density-16) pt-(--density-4) pb-(--density-16)"
                  />
                )}
              </AppShellContent>
              <BoardTicketView
                board={board}
                project={project}
                properties={properties}
                ticketId={openId}
                mode={mode}
                now={now ?? 0}
                onModeChange={setMode}
                onClose={() => setOpenId(null)}
                onTicketChange={state.updateTicket}
                onComment={(ticketId, text) => {
                  const at = Date.now()
                  state.updateTicket(ticketId, (ticket) => ({
                    ...ticket,
                    activity: [
                      ...ticket.activity,
                      {
                        id: crypto.randomUUID(),
                        kind: "comment",
                        personId: BOARD_ME,
                        at,
                        text,
                      },
                    ],
                  }))
                }}
              />
            </>
          )}
        </Kanban>
      </AppShellMain>
      <BoardNewTicket
        open={isCreating}
        onOpenChange={setIsCreating}
        project={project}
        properties={properties}
        initialValues={{ ...defaults, status: "planned" }}
        onCreate={addTicket}
      />
    </>
  )
}

function BoardEmpty({
  name,
  onNewTicket,
}: {
  name: string
  onNewTicket: () => void
}) {
  return (
    <Empty className="m-auto">
      <EmptyHeader>
        <EmptyMedia variant="icon">{boardIcons.empty}</EmptyMedia>
        <EmptyTitle>No tickets in {name} yet</EmptyTitle>
        <EmptyDescription>
          Write down the first thing to ship, then drag it across the board.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button size="sm" onClick={onNewTicket}>
          {boardIcons.add}
          New ticket
        </Button>
      </EmptyContent>
    </Empty>
  )
}
