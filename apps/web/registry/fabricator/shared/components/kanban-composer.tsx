"use client"

// A card written where it will live. Enter adds it and starts the next, so a
// list of cards is typed without leaving the keyboard; pasted lines become a
// card each.
import * as React from "react"

import { Textarea } from "@/registry/bases/__base__/ui/textarea"

function KanbanComposer({
  label,
  placeholder = "Card title",
  onCreate,
  onClose,
}: {
  label: string
  placeholder?: string
  onCreate: (title: string) => void
  onClose: () => void
}) {
  const field = React.useRef<HTMLTextAreaElement>(null)
  React.useEffect(() => {
    field.current?.focus()
    field.current?.scrollIntoView({ block: "nearest" })
  }, [])

  function commit() {
    const input = field.current
    if (!input) return false
    const titles = input.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
    input.value = ""
    for (const title of titles) onCreate(title)
    return titles.length > 0
  }

  return (
    <div
      data-slot="kanban-composer"
      className="cn-kanban-composer"
      data-sortable-ignore=""
    >
      <Textarea
        ref={field}
        rows={2}
        aria-label={label}
        placeholder={placeholder}
        className="cn-kanban-composer-field field-sizing-content resize-none"
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return
          if (event.key === "Escape") {
            event.stopPropagation()
            if (field.current) field.current.value = ""
            onClose()
          }
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            if (!commit()) onClose()
          }
        }}
        onBlur={() => {
          commit()
          onClose()
        }}
      />
      <p className="cn-kanban-composer-hint" aria-hidden="true">
        Enter to add, Esc to close
      </p>
    </div>
  )
}

export { KanbanComposer }
