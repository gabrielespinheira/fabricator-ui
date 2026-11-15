import { describe, expect, it } from "vitest"

import { isWideDocsPage } from "@/lib/docs-wide-pages"

describe("isWideDocsPage", () => {
  it("is true for a wide component's page on every base", () => {
    expect(isWideDocsPage("/docs/components/base/event-calendar")).toBe(true)
    expect(isWideDocsPage("/docs/components/radix/event-calendar")).toBe(true)
    expect(isWideDocsPage("/docs/components/aria/event-calendar")).toBe(true)
  })

  it("is false for other pages", () => {
    expect(isWideDocsPage("/docs/components/base/calendar")).toBe(false)
    expect(isWideDocsPage("/docs/components/base/event-calendar/extra")).toBe(
      false
    )
    expect(isWideDocsPage("/docs")).toBe(false)
  })
})
