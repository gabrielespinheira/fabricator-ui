"use client"

import {
  Editor,
  EditorBubbleMenu,
  EditorContent,
  EditorFooter,
  EditorKeyboardBar,
  EditorLinkPopover,
  EditorToolbar,
  EditorWordCount,
} from "@/styles/base-fabricator/ui/editor"

const notes = `# Release notes

Write here. Select text to **format** it, or type Markdown: \`# \` for a heading, \`- \` for a list, \`[] \` for a task.

## Headings

### Heading 3

#### Heading 4

##### Heading 5

###### Heading 6

## Inline formatting

Text can be **bold**, *italic*, ***both***, ~~struck through~~ or \`inline code\`, and links go to the [changelog](https://fabricator-ui.vercel.app/docs/changelog).

## Lists

- Markdown preview
- Rich text editor
  - Web
  - iOS

1. Parse the file
2. Edit it
3. Save only what changed

- [x] Parser and serializer
- [x] Web editor
- [ ] Android editor

## Quote

> Unedited blocks save byte for byte.

## Code

\`\`\`tsx
import { Editor, EditorContent } from "@/components/ui/editor"

export function Notes() {
  return <Editor defaultValue="# Hello" />
}
\`\`\`

---

## Table

| Platform | Editor | Preview |
| :------- | :----: | ------: |
| Web      |  Yes   |     Yes |
| iOS      |  Yes   |     Yes |
| Android  |  Soon  |     Yes |
`

export function EditorDemo() {
  return (
    <Editor defaultValue={notes} className="w-full max-w-2xl">
      <EditorToolbar />
      <EditorContent className="max-h-[32rem] overflow-y-auto" />
      <EditorBubbleMenu />
      <EditorLinkPopover />
      <EditorKeyboardBar />
      <EditorFooter>
        <EditorWordCount />
      </EditorFooter>
    </Editor>
  )
}
