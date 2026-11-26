"use client"

import * as React from "react"

import {
  BoardDialog,
  BoardSwitch,
} from "@/registry/bases/__base__/blocks/board-01/components/board-controls"
import {
  BOARD_FORM_PROPERTIES,
  type BoardProject,
} from "@/registry/bases/__base__/blocks/board-01/lib/board-data"
import { type BoardTicketDraft } from "@/registry/bases/__base__/blocks/board-01/lib/board-model"
import { Button } from "@/registry/bases/__base__/ui/button"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/registry/bases/__base__/ui/field"
import { Input } from "@/registry/bases/__base__/ui/input"
import {
  PropertyList,
  type PropertyDefinition,
} from "@/registry/bases/__base__/ui/properties"
import { Textarea } from "@/registry/bases/__base__/ui/textarea"

/** A ticket from its title and a few choices; C opens it. */
export function BoardNewTicket({
  open,
  onOpenChange,
  project,
  properties,
  initialValues,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  project: BoardProject
  properties: readonly PropertyDefinition[]
  initialValues: BoardTicketDraft["values"]
  onCreate: (draft: BoardTicketDraft) => void
}) {
  return (
    <BoardDialog
      open={open}
      onOpenChange={onOpenChange}
      title="New ticket"
      description={`In ${project.name}`}
    >
      <BoardTicketForm
        properties={properties}
        initialValues={initialValues}
        onCreate={onCreate}
        onClose={() => onOpenChange(false)}
      />
    </BoardDialog>
  )
}

function BoardTicketForm({
  properties,
  initialValues,
  onCreate,
  onClose,
}: {
  properties: readonly PropertyDefinition[]
  initialValues: BoardTicketDraft["values"]
  onCreate: (draft: BoardTicketDraft) => void
  onClose: () => void
}) {
  const id = React.useId()
  const titleRef = React.useRef<HTMLInputElement>(null)
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [values, setValues] = React.useState(initialValues)
  const [error, setError] = React.useState("")
  const [isAnother, setIsAnother] = React.useState(false)

  function submit() {
    if (!title.trim()) {
      setError("Give the ticket a title.")
      titleRef.current?.focus()
      return
    }
    onCreate({
      title: title.trim(),
      description: description.trim(),
      values,
    })
    if (!isAnother) {
      onClose()
      return
    }
    // The choices stay for the next one.
    setTitle("")
    setDescription("")
    titleRef.current?.focus()
  }

  return (
    <form
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-(--density-20) max-md:px-(--density-16) max-md:pt-(--density-12) max-md:pb-[max(var(--density-16),env(safe-area-inset-bottom))]"
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      onKeyDownCapture={(event) => {
        if (event.key !== "Enter" || !(event.metaKey || event.ctrlKey)) return
        event.preventDefault()
        event.stopPropagation()
        submit()
      }}
    >
      {/* Its padding keeps the fields' focus rings out of the clip. */}
      <FieldGroup className="-m-1 min-h-0 w-[calc(100%+(--spacing(2)))] flex-1 overflow-y-auto p-1">
        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor={`${id}-title`}>Title</FieldLabel>
          <Input
            ref={titleRef}
            id={`${id}-title`}
            autoFocus
            autoComplete="off"
            placeholder="What needs to happen?"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setError("")
            }}
          />
          <FieldError id={`${id}-error`}>{error}</FieldError>
        </Field>
        <Field>
          <FieldLabel htmlFor={`${id}-description`}>Description</FieldLabel>
          <Textarea
            id={`${id}-description`}
            placeholder="Context, steps or a link"
            className="field-sizing-content max-h-48 min-h-20 resize-none"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </Field>
        <PropertyList
          properties={properties.filter((property) =>
            BOARD_FORM_PROPERTIES.includes(property.id)
          )}
          getValue={(propertyId) => values[propertyId]}
          onValueChange={(propertyId, value) =>
            setValues((current) => ({ ...current, [propertyId]: value }))
          }
        />
      </FieldGroup>
      <div className="flex shrink-0 items-center gap-(--density-8)">
        <label
          htmlFor={`${id}-another`}
          className="me-auto flex items-center gap-(--density-8) text-(length:--density-text-13) text-muted-foreground"
        >
          <BoardSwitch
            id={`${id}-another`}
            label="Create another"
            checked={isAnother}
            onCheckedChange={setIsAnother}
          />
          Create another
        </label>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" aria-keyshortcuts="Meta+Enter Control+Enter">
          Create ticket
        </Button>
      </div>
    </form>
  )
}
