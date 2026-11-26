"use client"

import * as React from "react"

import { BoardCheckbox } from "@/registry/bases/__base__/blocks/board-01/components/board-controls"
import { type BoardSubtask } from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import { Input } from "@/registry/bases/__base__/ui/input"
import { RecordViewSection } from "@/registry/bases/__base__/ui/record-view"

/** The steps inside a ticket: ticked off, and added in place. */
export function BoardSubtasks({
  subtasks,
  onSubtasksChange,
}: {
  subtasks: readonly BoardSubtask[]
  onSubtasksChange: (subtasks: BoardSubtask[]) => void
}) {
  const [title, setTitle] = React.useState("")
  const done = subtasks.filter(({ isDone }) => isDone).length
  return (
    <RecordViewSection
      title={
        subtasks.length ? `Sub-tasks ${done}/${subtasks.length}` : "Sub-tasks"
      }
    >
      {subtasks.length > 0 && (
        <ul className="flex flex-col">
          {subtasks.map((subtask) => (
            <li
              key={subtask.id}
              className="flex min-h-(--density-32) items-center gap-(--density-12)"
            >
              <BoardCheckbox
                label={subtask.title}
                checked={subtask.isDone}
                onCheckedChange={(isDone) =>
                  onSubtasksChange(
                    subtasks.map((entry) =>
                      entry.id === subtask.id ? { ...entry, isDone } : entry
                    )
                  )
                }
              />
              <span
                className={
                  subtask.isDone ? "text-muted-foreground line-through" : ""
                }
              >
                {subtask.title}
              </span>
            </li>
          ))}
        </ul>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!title.trim()) return
          onSubtasksChange([
            ...subtasks,
            { id: crypto.randomUUID(), title: title.trim(), isDone: false },
          ])
          setTitle("")
        }}
      >
        <Input
          aria-label="New sub-task"
          placeholder="Add a sub-task"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </form>
    </RecordViewSection>
  )
}
