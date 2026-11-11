"use client"

import { Editor, EditorContent } from "@/styles/base-fabricator/ui/editor"

const text = `### Read only

The same surface with editing turned off: **formatting**, [links](https://fabricator-ui.vercel.app) and lists stay as they are.

- Nothing here can change`

export function EditorReadOnly() {
  return (
    <Editor defaultValue={text} readOnly className="w-full max-w-md">
      <EditorContent />
    </Editor>
  )
}
