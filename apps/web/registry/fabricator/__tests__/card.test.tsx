import * as React from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import * as UpstreamCard from "../../bases/base/ui/card"
import * as AriaCard from "../aria/ui/card"
import * as BaseCard from "../base/ui/card"
import * as RadixCard from "../radix/ui/card"
import { Delta } from "../shared/ui/delta"

vi.mock("@/app/(create)/components/icon-placeholder", () => ({
  IconPlaceholder: () => <svg data-icon-placeholder="" />,
}))

const render = (element: React.ReactElement) => renderToStaticMarkup(element)

const BASES = { base: BaseCard, radix: RadixCard, aria: AriaCard }

describe.each(Object.entries(BASES))("%s card", (_, Card) => {
  it("keeps every upstream export (contract 1)", () => {
    for (const name of Object.keys(UpstreamCard)) {
      expect(Card).toHaveProperty(name)
    }
  })

  it("marks every part with its slot", () => {
    const markup = render(
      <Card.Card>
        <Card.CardHeader>
          <Card.CardMedia variant="icon">i</Card.CardMedia>
          <Card.CardTitle>Node 07</Card.CardTitle>
          <Card.CardDescription>Summarizer</Card.CardDescription>
          <Card.CardAction>…</Card.CardAction>
        </Card.CardHeader>
        <Card.CardContent>
          <Card.CardValue>
            24,182
            <Card.CardValueCaption>visits</Card.CardValueCaption>
          </Card.CardValue>
        </Card.CardContent>
        <Card.CardFooter>Updated 2 min ago</Card.CardFooter>
      </Card.Card>
    )
    for (const slot of [
      "card",
      "card-header",
      "card-media",
      "card-title",
      "card-description",
      "card-action",
      "card-content",
      "card-value",
      "card-value-caption",
      "card-footer",
    ]) {
      expect(markup).toContain(`data-slot="${slot}"`)
    }
  })

  it("defaults to the lifted variant and the default size", () => {
    const markup = render(<Card.Card />)
    expect(markup).toContain('data-variant="default"')
    expect(markup).toContain('data-size="default"')
  })

  it("puts the variant and size on the card", () => {
    const markup = render(<Card.Card variant="tray" size="sm" />)
    expect(markup).toContain('data-variant="tray"')
    expect(markup).toContain('data-size="sm"')
  })

  it("gives the media its variant", () => {
    const markup = render(<Card.CardMedia variant="image" />)
    expect(markup).toMatch(/data-slot="card-media"[^>]*data-variant="image"/)
  })

  it("renders CardLink as one anchor that covers the card", () => {
    const markup = render(
      <Card.Card>
        <Card.CardHeader>
          <Card.CardTitle>
            <Card.CardLink href="/agents/node-07">Node 07</Card.CardLink>
          </Card.CardTitle>
        </Card.CardHeader>
      </Card.Card>
    )
    expect(markup.match(/<a /g)).toHaveLength(1)
    expect(markup).toMatch(
      /<a[^>]*href="\/agents\/node-07"[^>]*>Node 07<\/a>|<a[^>]*data-slot="card-link"[^>]*>Node 07<\/a>/
    )
    expect(markup).toContain('data-slot="card-link"')
    expect(markup).toContain("after:absolute")
    expect(markup).toContain("after:inset-0")
  })
})

describe("CardLink with a router link", () => {
  it("renders the router's element through render (Base UI)", () => {
    const markup = render(
      <BaseCard.CardLink render={<a href="/projects" data-router="" />}>
        Projects
      </BaseCard.CardLink>
    )
    expect(markup).toContain('data-router=""')
    expect(markup).toContain('data-slot="card-link"')
  })

  it("renders its child through asChild (Radix)", () => {
    const markup = render(
      <RadixCard.CardLink asChild>
        <a href="/projects" data-router="">
          Projects
        </a>
      </RadixCard.CardLink>
    )
    expect(markup).toContain('data-router=""')
    expect(markup).toContain('data-slot="card-link"')
  })
})

describe("Delta", () => {
  it("shows a good rise as a success badge with its arrow and sign", () => {
    const markup = render(<Delta change={12.4} />)
    expect(markup).toContain('data-delta="up"')
    expect(markup).toContain("+12.4%")
    expect(markup).toContain("<svg")
  })

  it("shows a missing comparison as text, never a badge", () => {
    const markup = render(<Delta change={null} />)
    expect(markup).toContain('data-direction="none"')
    expect(markup).toContain("No data")
    expect(markup).not.toContain('data-slot="badge"')
  })
})
