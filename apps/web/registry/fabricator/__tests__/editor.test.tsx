import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  Editor,
  EditorContent,
  EditorFooter,
  EditorToolbar,
  EditorToolbarButton,
  EditorWordCount,
} from "@/registry/fabricator/shared/ui/editor"

// The site's icon placeholder reads its settings from the URL (nuqs); the CLI
// replaces it with the project's icon library at install time.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("Editor", () => {
  it("renders the document as an editable, labelled multiline textbox", () => {
    const html = render(<Editor defaultValue={"# Title\n\nHello **you**"} />)
    expect(html).toContain('data-slot="editor"')
    expect(html).toContain('role="textbox"')
    expect(html).toContain('aria-multiline="true"')
    expect(html).toContain('contentEditable="true"')
    expect(html).toMatch(/<h1[^>]*data-block-id="[^"]+"[^>]*>Title<\/h1>/)
    expect(html).toContain("<strong")
  })

  it("uses Markdown's typography so the preview matches", () => {
    const html = render(
      <Editor defaultValue="Hi">
        <EditorContent size="lg" />
      </Editor>
    )
    expect(html).toContain('data-size="lg"')
  })

  it("shows the placeholder on an empty document's only block", () => {
    const html = render(<Editor placeholder="Write something" />)
    expect(html).toContain('data-placeholder="Write something"')
    expect(html).toContain("data-editor-filler")
  })

  it("turns editing off when read only", () => {
    const html = render(<Editor defaultValue="Hi" readOnly />)
    expect(html).toContain('contentEditable="false"')
    expect(html).toContain('aria-readonly="true"')
  })

  it("draws void blocks outside the editable text and tasks with a checkbox", () => {
    const html = render(<Editor defaultValue={"---\n\n- [x] Done"} />)
    expect(html).toMatch(/data-void="true"[^>]*contentEditable="false"/)
    expect(html).toMatch(/<button[^>]*role="checkbox"[^>]*aria-checked="true"/)
  })

  it("renders a toolbar of commands with their state and shortcuts", () => {
    const html = render(
      <Editor defaultValue="Hi">
        <EditorToolbar />
      </Editor>
    )
    expect(html).toContain('role="toolbar"')
    expect(html).toContain('data-command="bold"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('aria-keyshortcuts="mod+b"')
    expect(html).toContain('aria-label="Heading 1"')
  })

  it("skips a toolbar button for a command no kit defines", () => {
    const html = render(
      <Editor>
        <EditorToolbarButton command="nope" />
      </Editor>
    )
    expect(html).not.toContain("<button")
  })

  it("renders the same block ids on the server and the client", () => {
    const value = "One\n\nTwo"
    expect(render(<Editor defaultValue={value} />)).toBe(
      render(<Editor defaultValue={value} />)
    )
    expect(render(<Editor />)).toBe(render(<Editor />))
  })

  it("counts words", () => {
    const html = render(
      <Editor defaultValue={"One two\n\n- three"}>
        <EditorFooter>
          <EditorWordCount />
        </EditorFooter>
      </Editor>
    )
    expect(html).toContain("3 words")
  })
})
