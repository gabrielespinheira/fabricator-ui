"use client"

import * as React from "react"

import { PreviewRail } from "@/styles/radix-fabricator/ui/preview-rail"

const FOLDERS = [
  { value: "inbox", label: "Inbox", description: "12 unread" },
  { value: "starred", label: "Starred", description: "4 conversations" },
  { value: "drafts", label: "Drafts", description: "2 drafts" },
  { value: "sent", label: "Sent", description: "Last sent today at 09:40" },
  { value: "archive", label: "Archive", description: "1,284 conversations" },
  { value: "spam", label: "Spam", description: "Empty", disabled: true },
  { value: "trash", label: "Trash", description: "Emptied every 30 days" },
]

export function PreviewRailControlled() {
  const [value, setValue] = React.useState("inbox")
  const folder = FOLDERS.find((item) => item.value === value)
  return (
    <div className="flex items-center gap-8">
      <p className="text-sm text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">{folder?.label}</span>
      </p>
      <PreviewRail
        items={FOLDERS}
        value={value}
        onValueChange={setValue}
        side="start"
        aria-label="Folders"
      />
    </div>
  )
}
