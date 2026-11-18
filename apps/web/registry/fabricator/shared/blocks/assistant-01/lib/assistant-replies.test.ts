import { describe, expect, it } from "vitest"

import { pickReplyScript } from "@/registry/fabricator/shared/blocks/assistant-01/lib/assistant-replies"

describe("pickReplyScript", () => {
  it("analyses data when asked about numbers or a file", () => {
    expect(pickReplyScript("Summarize this quarter's churn").tool.kind).toBe(
      "code"
    )
    expect(pickReplyScript("Chart the CSV by month").tool.kind).toBe("code")
  })

  it("reads the brief before writing", () => {
    expect(pickReplyScript("Draft a launch email").tool.kind).toBe("read")
  })

  it("searches the web for anything else", () => {
    expect(pickReplyScript("What changed in EU pricing law?").tool.kind).toBe(
      "search"
    )
  })

  it("starts every tool as running", () => {
    expect(pickReplyScript("Hello").tool.status).toBe("running")
  })
})
