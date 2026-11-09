import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import {
  SyntaxHighlight,
  SyntaxHighlightContent,
  SyntaxHighlightCopy,
  SyntaxHighlightHeader,
  SyntaxHighlightLanguage,
  SyntaxHighlightTitle,
} from "@/registry/fabricator/shared/ui/syntax-highlight"

// The site's icon placeholder reads its settings from the URL (nuqs); the CLI
// replaces it with the project's icon library at install time.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

/** The opening tags of every element with this data-slot, in order. */
function tags(markup: string, slot: string) {
  return (
    markup.match(new RegExp(`<[a-z]+[^>]*data-slot="${slot}"[^>]*>`, "g")) ?? []
  )
}

/** The text inside each element with this data-slot that holds only text. */
function texts(markup: string, slot: string) {
  return [
    ...markup.matchAll(new RegExp(`data-slot="${slot}"[^>]*>([^<]*)<`, "g")),
  ].map((match) => match[1])
}

const code = 'const greeting = "hi"\n\n// done'

describe("SyntaxHighlight", () => {
  it("renders just the code when it has no parts", () => {
    const markup = render(<SyntaxHighlight code={code} language="ts" />)
    expect(tags(markup, "syntax-highlight-line")).toHaveLength(3)
    expect(tags(markup, "syntax-highlight-content")[0]).toContain(
      'tabindex="0"'
    )
    expect(markup).toContain("greeting")
  })

  it("reads the language from the file name and shows it in the header", () => {
    const markup = render(
      <SyntaxHighlight code="{}" filename="package.json">
        <SyntaxHighlightHeader>
          <SyntaxHighlightTitle />
          <SyntaxHighlightLanguage />
          <SyntaxHighlightCopy />
        </SyntaxHighlightHeader>
        <SyntaxHighlightContent />
      </SyntaxHighlight>
    )
    expect(tags(markup, "syntax-highlight")[0]).toContain(
      'data-language="json"'
    )
    expect(texts(markup, "syntax-highlight-title")).toEqual(["package.json"])
    expect(texts(markup, "syntax-highlight-language")).toEqual(["JSON"])
    expect(tags(markup, "syntax-highlight-copy")[0]).toContain(
      'aria-label="Copy code"'
    )
  })

  it("names each token's kind", () => {
    const markup = render(<SyntaxHighlight code={code} language="ts" />)
    for (const kind of ["keyword", "string", "comment"]) {
      expect(markup).toContain(`data-token="${kind}"`)
    }
  })

  it("numbers lines out of reading and selection, from startLine", () => {
    const markup = render(
      <SyntaxHighlight code={code} language="ts">
        <SyntaxHighlightContent showLineNumbers startLine={9} />
      </SyntaxHighlight>
    )
    expect(texts(markup, "syntax-highlight-line-number")).toEqual([
      "9",
      "10",
      "11",
    ])
    const [number] = tags(markup, "syntax-highlight-line-number")
    expect(number).toContain('aria-hidden="true"')
    expect(number).toContain("select-none")
  })

  it("marks highlighted, added and removed lines by their numbers", () => {
    const markup = render(
      <SyntaxHighlight code={code} language="ts">
        <SyntaxHighlightContent
          highlightLines={[1]}
          insertedLines={[2]}
          deletedLines={[3]}
        />
      </SyntaxHighlight>
    )
    const lines = tags(markup, "syntax-highlight-line")
    expect(lines[0]).toContain("data-highlighted")
    expect(lines[1]).toContain('data-diff="inserted"')
    expect(lines[2]).toContain('data-diff="deleted"')
  })

  it("marks a diff's lines on its own and sets data-wrap", () => {
    const markup = render(
      <SyntaxHighlight code={"-old\n+new"} language="diff">
        <SyntaxHighlightContent wrap />
      </SyntaxHighlight>
    )
    const lines = tags(markup, "syntax-highlight-line")
    expect(lines[0]).toContain('data-diff="deleted"')
    expect(lines[1]).toContain('data-diff="inserted"')
    expect(tags(markup, "syntax-highlight-content")[0]).toContain("data-wrap")
  })

  it("keeps a blank line's height", () => {
    const markup = render(<SyntaxHighlight code={"a\n\nb"} language="text" />)
    expect(texts(markup, "syntax-highlight-line-content")).toEqual([
      "a",
      "\n",
      "b",
    ])
  })
})
