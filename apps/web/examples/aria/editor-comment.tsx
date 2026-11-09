"use client"

import {
  Editor,
  EditorBubbleMenu,
  EditorContent,
  EditorLinkPopover,
} from "@/styles/aria-fabricator/ui/editor"

export function EditorComment() {
  return (
    <Editor placeholder="Leave a comment" className="w-full max-w-md">
      <EditorContent size="sm" aria-label="Comment" />
      <EditorBubbleMenu />
      <EditorLinkPopover />
    </Editor>
  )
}
