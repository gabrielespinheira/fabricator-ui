"use client"

import {
  BoardIconButton,
  BoardRowsMenu,
} from "@/registry/bases/__base__/blocks/board-01/components/board-controls"
import { boardIcons } from "@/registry/bases/__base__/blocks/board-01/components/board-icons"
import { BoardProjectMark } from "@/registry/bases/__base__/blocks/board-01/components/board-project-mark"
import {
  BOARD_PEOPLE,
  BOARD_PROPERTIES,
  type BoardProject,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-data"
import {
  toggleMember,
  type BoardTicket,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import { getOptionFilter } from "@/registry/bases/__base__/lib/property-model"
import { AppShellHeader } from "@/registry/bases/__base__/ui/app-shell"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  KanbanToolbar,
  type KanbanController,
} from "@/registry/bases/__base__/ui/kanban"
import { PropertyAvatar } from "@/registry/bases/__base__/ui/properties"

export type BoardRows = "none" | "assignee" | "priority"

const ROWS: { value: BoardRows; label: string }[] = [
  { value: "none", label: "No rows" },
  { value: "assignee", label: "By assignee" },
  { value: "priority", label: "By priority" },
]

/** The page's one row: the project, what it is filtered by, and New ticket. */
export function BoardHeader({
  board,
  project,
  rows,
  onRowsChange,
  onNewTicket,
}: {
  board: KanbanController<BoardTicket>
  project: BoardProject
  rows: BoardRows
  onRowsChange: (rows: BoardRows) => void
  onNewTicket: () => void
}) {
  return (
    <AppShellHeader className="pe-(--density-16) not-has-[>[data-slot=sidebar-trigger]]:ps-(--density-16)">
      <KanbanToolbar
        board={board}
        className="min-w-0 flex-1"
        title={
          <h1 className="flex min-w-0 items-center gap-(--density-8)">
            <BoardProjectMark projectId={project.id} />
            <span className="truncate">{project.name}</span>
          </h1>
        }
      >
        <BoardRowsMenu
          label="Rows"
          icon={boardIcons.rows}
          options={ROWS}
          value={rows}
          onValueChange={onRowsChange}
          className="@max-2xl/kanban-toolbar:hidden"
        />
        <BoardMembers board={board} />
        <Button size="sm" aria-keyshortcuts="C" onClick={onNewTicket}>
          {boardIcons.add}
          <span className="@max-2xl/kanban-toolbar:sr-only">New ticket</span>
        </Button>
      </KanbanToolbar>
    </AppShellHeader>
  )
}

/** The team, each face a filter for that person's tickets. */
function BoardMembers({ board }: { board: KanbanController<BoardTicket> }) {
  const picked = getOptionFilter(board.view.filters, "assignee")
  return (
    <div
      role="group"
      aria-label="Filter by person"
      className="flex items-center @max-4xl/kanban-toolbar:hidden"
    >
      {BOARD_PEOPLE.map((person) => {
        const isPicked = picked.includes(person.value)
        return (
          <BoardIconButton
            key={person.value}
            label={person.label}
            isPressed={isPicked}
            onClick={() =>
              board.setView({
                ...board.view,
                filters: toggleMember(
                  board.view.filters,
                  person.value,
                  BOARD_PROPERTIES
                ),
              })
            }
            className="-ms-(--density-6) size-(--density-28) rounded-full p-0 first:ms-0 hover:z-1 hover:bg-transparent aria-pressed:z-1 aria-pressed:bg-transparent"
          >
            <PropertyAvatar
              person={person}
              className={[
                "size-(--density-24) ring-2 transition-opacity duration-feedback ease-feedback",
                isPicked ? "ring-primary" : "ring-background",
                picked.length > 0 && !isPicked
                  ? "opacity-45 hover:opacity-100"
                  : "",
              ].join(" ")}
            />
          </BoardIconButton>
        )
      })}
    </div>
  )
}
