"use client"

import * as React from "react"

import {
  Editor,
  EditorBubbleMenu,
  EditorContent,
  EditorLinkPopover,
  EditorToolbar,
} from "@/styles/base-fabricator/ui/editor"
import { Markdown } from "@/styles/base-fabricator/ui/markdown"

const initial = `## Weekly sync

Review the *editor* with **design** on Friday.

1. Typography
2. Keyboard bar
`

export function EditorMarkdown() {
  const [value, setValue] = React.useState(initial)
  return (
    <div className="grid w-full max-w-4xl gap-4 md:grid-cols-2">
      <Editor value={value} onValueChange={setValue}>
        <EditorToolbar />
        <EditorContent size="sm" />
        <EditorBubbleMenu />
        <EditorLinkPopover />
      </Editor>
      <div className="flex min-w-0 flex-col gap-4">
        <pre className="overflow-x-auto rounded-xl bg-muted p-4 font-mono text-xs leading-relaxed text-muted-foreground">
          {value}
        </pre>
        <Markdown size="sm">{value}</Markdown>
      </div>
    </div>
  )
}
