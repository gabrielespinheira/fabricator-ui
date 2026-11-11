import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { Markdown } from "@/registry/fabricator/shared/ui/markdown"

// The site's icon placeholder reads its settings from the URL (nuqs); the CLI
// replaces it with the project's icon library at install time.
vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg />,
}))

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

describe("Markdown", () => {
  it("renders headings, paragraphs and inline marks as semantic HTML", () => {
    const html = render(
      <Markdown>
        {"## Title\n\nSome **bold**, *em*, ~~old~~ and `code`."}
      </Markdown>
    )
    expect(html).toContain('data-slot="markdown"')
    expect(html).toMatch(/<h2[^>]*data-level="2"[^>]*>Title<\/h2>/)
    expect(html).toContain("<strong")
    expect(html).toMatch(/<em[^>]*>em<\/em>/)
    expect(html).toMatch(/<s [^>]*>old<\/s>/)
    expect(html).toMatch(/<code[^>]*>code<\/code>/)
  })

  it("nests lists and draws tasks with read-only checkboxes", () => {
    const html = render(
      <Markdown>{"- one\n  1. inner\n- [x] done\n- [ ] todo"}</Markdown>
    )
    expect(html).toMatch(/<ul[^>]*><li[^>]*>one<ol/)
    expect(html.match(/role="checkbox"/g)).toHaveLength(2)
    expect(html).toContain('aria-checked="true"')
    expect(html).toContain('aria-label="Done"')
    expect(html).toContain('aria-label="Not done"')
    expect(html).toContain('aria-readonly="true"')
  })

  it("starts an ordered list at its first number", () => {
    expect(render(<Markdown>{"3. c\n4. d"}</Markdown>)).toContain('start="3"')
  })

  it("renders tables with their alignment", () => {
    const html = render(
      <Markdown>{"| A | B |\n| :- | -: |\n| 1 | 2 |"}</Markdown>
    )
    expect(html).toContain("<table>")
    expect(html).toMatch(/<th[^>]*data-align="left"/)
    expect(html).toMatch(/<td[^>]*data-align="right"/)
  })

  it("keeps what it doesn't model as visible source", () => {
    const html = render(
      <Markdown>{"<details>\n<summary>x</summary>\n</details>"}</Markdown>
    )
    expect(html).toContain('data-slot="markdown-raw"')
    expect(html).toContain("&lt;details&gt;")
  })

  it("passes links through a replacement component and sets the size", () => {
    function AppLink(props: React.ComponentProps<"a">) {
      return <a data-router="" {...props} />
    }
    const html = render(
      <Markdown size="sm" components={{ a: AppLink }}>
        {"[Settings](/settings)"}
      </Markdown>
    )
    expect(html).toContain('data-router=""')
    expect(html).toContain('href="/settings"')
    expect(html).toContain('data-size="sm"')
  })

  it("doesn't draw frontmatter", () => {
    expect(
      render(<Markdown>{"---\ntitle: x\n---\n\nBody"}</Markdown>)
    ).not.toContain("title: x")
  })
})
