import * as React from "react"
import { Example, ExampleWrapper } from "@/examples/native/example"
import { View } from "react-native"

import {
  Editor,
  EditorBubbleMenu,
  EditorContent,
  EditorFooter,
  EditorKeyboardBar,
  EditorLinkPopover,
  EditorToolbar,
  EditorWordCount,
} from "@/registry/native/ui/editor"
import { Markdown } from "@/registry/native/ui/markdown"
import { Text } from "@/registry/native/ui/text"

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

const review = `## Review

Ship it once **design** signs off. Questions to [Gabs](mailto:gabs@fabricator.dev).
`

const initial = `## Weekly sync

Review the *editor* with **design** on Friday.

1. Typography
2. Keyboard bar
`

function EditorExample() {
  const [value, setValue] = React.useState(initial)
  return (
    <ExampleWrapper>
      <Example title="Default" framed={false}>
        <Editor defaultValue={notes} className="w-full">
          <EditorToolbar />
          <EditorContent />
          <EditorBubbleMenu />
          <EditorLinkPopover />
          <EditorKeyboardBar />
          <EditorFooter>
            <EditorWordCount />
          </EditorFooter>
        </Editor>
      </Example>
      <Example title="Placeholder" framed={false}>
        <Editor placeholder="Write something" className="w-full">
          <EditorContent size="sm" />
          <EditorKeyboardBar />
        </Editor>
      </Example>
      <Example title="Read-only" framed={false}>
        <Editor defaultValue={review} readOnly className="w-full">
          <EditorToolbar />
          <EditorContent size="sm" />
        </Editor>
      </Example>
      <Example title="Controlled, with its Markdown" framed={false}>
        <Editor value={value} onValueChange={setValue} className="w-full">
          <EditorToolbar />
          <EditorContent size="sm" />
          <EditorLinkPopover />
          <EditorKeyboardBar />
        </Editor>
        <View className="w-full gap-3">
          <Text
            selectable
            className="rounded-xl bg-muted p-4 font-mono text-xs text-muted-foreground"
          >
            {value}
          </Text>
          <Markdown size="sm">{value}</Markdown>
        </View>
      </Example>
      <Example title="Size lg, scrolling in its own height" framed={false}>
        <Editor defaultValue={notes} className="h-80 w-full">
          <EditorContent size="lg" scrollEnabled />
          <EditorKeyboardBar />
        </Editor>
      </Example>
    </ExampleWrapper>
  )
}

export { EditorExample }
