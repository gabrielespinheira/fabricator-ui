"use client"

import * as React from "react"
import { toast } from "sonner"

import {
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/registry/bases/aria/ui/dropdown-menu"

// The automation block's controls whose API differs between Base UI, Radix
// and React Aria: menu items and toasts. This is React Aria's; the rest of the
// block is shared.

export type AutomationMenuEntry = {
  id: string
  label: string
  icon: React.ReactNode
  isDestructive?: boolean
  onSelect: () => void
}

export function AutomationMenuItems({
  groups,
}: {
  groups: AutomationMenuEntry[][]
}) {
  return groups.map((entries, index) => (
    <React.Fragment key={entries[0]?.id}>
      {index > 0 && <DropdownMenuSeparator />}
      <DropdownMenuGroup>
        {entries.map((entry) => (
          <DropdownMenuItem
            key={entry.id}
            variant={entry.isDestructive ? "destructive" : "default"}
            id={entry.id}
            textValue={entry.label}
            onAction={entry.onSelect}
          >
            {entry.icon}
            {entry.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuGroup>
    </React.Fragment>
  ))
}

/** Reports a finished run or a saved change; mount your Toaster once. */
export function notifyAutomation(message: string, description?: string) {
  toast(message, { description })
}
