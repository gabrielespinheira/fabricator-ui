"use client"

import { useState } from "react"

import {
  AppShell,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
} from "@/styles/base-fabricator/ui/app-shell"

export function AppShellHeaderActionsExample() {
  const [isPinned, setIsPinned] = useState(false)

  return (
    <AppShell storage={null}>
      <AppShellMain>
        <AppShellHeader trigger="never" className="justify-between">
          Launch plan
          <AppShellHeaderActions
            actions={[
              {
                id: "pin",
                label: isPinned ? "Unpin project" : "Pin project",
                onSelect: () => setIsPinned(!isPinned),
              },
            ]}
          />
        </AppShellHeader>
        <AppShellContent className="px-3 text-sm text-muted-foreground">
          {isPinned ? "Project pinned." : "Project unpinned."}
        </AppShellContent>
      </AppShellMain>
    </AppShell>
  )
}
