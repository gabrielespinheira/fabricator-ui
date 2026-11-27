"use client"

// The Canvas's parts that differ by base: the search and connect lists (a
// command dialog) and the toast a failed change raises. The Canvas describes
// them as data; this file draws them with the base's own parts.
import * as React from "react"
import { toast } from "sonner"

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/registry/bases/radix/ui/command"

type CanvasCommandItem = {
  id: string
  label: string
  /** Shown after the label, muted: the node a handle belongs to. */
  detail?: string
  icon?: React.ReactNode
  onSelect: () => void
}

type CanvasCommandGroup = {
  id: string
  label?: string
  items: readonly CanvasCommandItem[]
}

type CanvasCommandDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  placeholder: string
  empty: string
  groups: readonly CanvasCommandGroup[]
}

type CanvasNoticeMessage = {
  id: number
  message: string
  description?: string
  action?: { label: string; run: () => void }
}

function CanvasCommandDialog({
  open,
  onOpenChange,
  title,
  placeholder,
  empty,
  groups,
}: CanvasCommandDialogProps) {
  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={placeholder}
    >
      <Command>
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>{empty}</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.id} heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.label} ${item.detail ?? ""} ${item.id}`}
                  onSelect={() => {
                    onOpenChange(false)
                    item.onSelect()
                  }}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                  {item.detail && (
                    <span className="ms-auto truncate text-muted-foreground">
                      {item.detail}
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  )
}

/** Raises a toast for each new notice, with its action. */
function useCanvasToast(notice: CanvasNoticeMessage | null) {
  React.useEffect(() => {
    if (!notice) return
    toast.error(notice.message, {
      description: notice.description,
      action: notice.action
        ? { label: notice.action.label, onClick: notice.action.run }
        : undefined,
    })
  }, [notice])
}

export {
  CanvasCommandDialog,
  useCanvasToast,
  type CanvasCommandDialogProps,
  type CanvasCommandGroup,
  type CanvasCommandItem,
  type CanvasNoticeMessage,
}
