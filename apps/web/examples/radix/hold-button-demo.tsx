"use client"

import * as React from "react"
import { TrashIcon } from "lucide-react"

import { HoldButton } from "@/styles/radix-fabricator/ui/hold-button"

export function HoldButtonDemo() {
  const [deleted, setDeleted] = React.useState(0)
  return (
    <div className="flex flex-col items-center gap-3">
      <HoldButton
        variant="destructive"
        onHoldComplete={() => setDeleted((count) => count + 1)}
      >
        <TrashIcon />
        Delete project
      </HoldButton>
      <p className="text-sm text-muted-foreground">
        {deleted === 0 ? "Press and hold to delete" : "Project deleted"}
      </p>
    </div>
  )
}
