"use client"

import {
  BoardActivityList,
  BoardCommentForm,
} from "@/registry/bases/__base__/blocks/board-01/components/board-activity"
import {
  BoardMenuButton,
  notifyBoard,
} from "@/registry/bases/__base__/blocks/board-01/components/board-controls"
import { boardIcons } from "@/registry/bases/__base__/blocks/board-01/components/board-icons"
import { BoardProjectMark } from "@/registry/bases/__base__/blocks/board-01/components/board-project-mark"
import { BoardSubtasks } from "@/registry/bases/__base__/blocks/board-01/components/board-subtasks"
import { type BoardProject } from "@/registry/bases/__base__/blocks/board-01/lib/board-data"
import {
  getTicketLink,
  getTicketValue,
  setTicketValue,
  type BoardTicket,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import { type KanbanController } from "@/registry/bases/__base__/ui/kanban"
import {
  getPropertyCover,
  PropertyList,
  type PropertyDefinition,
  type PropertyFile,
} from "@/registry/bases/__base__/ui/properties"
import {
  RecordView,
  RecordViewCover,
  RecordViewSection,
  type RecordViewMode,
} from "@/registry/bases/__base__/ui/record-view"
import { Textarea } from "@/registry/bases/__base__/ui/textarea"

/** Replace with your own storage: upload each file and return its address. */
async function storeFiles(files: File[]): Promise<PropertyFile[]> {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    url: URL.createObjectURL(file),
  }))
}

function copy(text: string, message: string) {
  navigator.clipboard.writeText(text).then(
    () => notifyBoard(message),
    () => notifyBoard("Couldn’t copy. Allow clipboard access and try again.")
  )
}

/** One ticket, beside a board that stays live. */
export function BoardTicketView({
  board,
  project,
  properties,
  ticketId,
  mode,
  now,
  onModeChange,
  onClose,
  onTicketChange,
  onComment,
}: {
  board: KanbanController<BoardTicket>
  project: BoardProject
  properties: readonly PropertyDefinition[]
  ticketId: string | null
  mode: RecordViewMode
  now: number
  onModeChange: (mode: RecordViewMode) => void
  onClose: () => void
  onTicketChange: (
    ticketId: string,
    change: (ticket: BoardTicket) => BoardTicket
  ) => void
  onComment: (ticketId: string, text: string) => void
}) {
  const ticket = ticketId === null ? undefined : board.byId.get(ticketId)
  const cover = ticket
    ? properties
        .map((property) =>
          getPropertyCover(property, getTicketValue(ticket, property.id))
        )
        .find(Boolean)
    : undefined
  return (
    <RecordView
      open={ticketId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      mode={mode}
      onModeChange={onModeChange}
      title={ticket?.title ?? "Ticket"}
      onTitleChange={(title) => {
        if (ticket) onTicketChange(ticket.id, (entry) => ({ ...entry, title }))
      }}
      state={ticket ? "ready" : "missing"}
      context={
        <>
          <BoardProjectMark projectId={project.id} />
          <span className="truncate">{project.name}</span>
          <span aria-hidden>/</span>
          <span className="text-foreground tabular-nums">{ticketId}</span>
        </>
      }
      onCopyLink={() => {
        if (ticket)
          void navigator.clipboard.writeText(
            getTicketLink(location.href, ticket.id)
          )
      }}
      actions={
        ticket && (
          <BoardMenuButton
            label="Ticket actions"
            icon={boardIcons.more}
            entries={[
              {
                id: "copy",
                label: "Copy ID",
                icon: boardIcons.copy,
                onSelect: () => copy(ticket.id, `Copied ${ticket.id}`),
              },
              {
                id: "delete",
                label: "Delete ticket",
                icon: boardIcons.trash,
                isDestructive: true,
                onSelect: () => {
                  onClose()
                  board.remove([ticket.id])
                },
              },
            ]}
          />
        )
      }
      cover={cover && <RecordViewCover src={cover.url} alt={cover.name} />}
      aside={
        ticket && (
          <PropertyList
            key={ticket.id}
            properties={properties}
            getValue={(id) => getTicketValue(ticket, id)}
            onValueChange={(id, value) =>
              onTicketChange(ticket.id, (entry) =>
                setTicketValue(entry, id, value)
              )
            }
            onFilesAdd={(_, files) => storeFiles(files)}
          />
        )
      }
      footer={
        ticket && (
          <BoardCommentForm
            key={ticket.id}
            onComment={(text) => onComment(ticket.id, text)}
          />
        )
      }
    >
      {ticket && (
        <>
          <RecordViewSection title="Description">
            <Textarea
              key={ticket.id}
              aria-label="Description"
              placeholder="Add a description"
              className="field-sizing-content resize-none leading-normal"
              defaultValue={ticket.description}
              onBlur={(event) => {
                const description = event.target.value
                if (description !== ticket.description)
                  onTicketChange(ticket.id, (entry) => ({
                    ...entry,
                    description,
                  }))
              }}
            />
          </RecordViewSection>
          <BoardSubtasks
            key={ticket.id}
            subtasks={ticket.subtasks}
            onSubtasksChange={(subtasks) =>
              onTicketChange(ticket.id, (entry) => ({ ...entry, subtasks }))
            }
          />
          <BoardActivityList
            activity={ticket.activity}
            properties={properties}
            now={now}
          />
        </>
      )}
    </RecordView>
  )
}
