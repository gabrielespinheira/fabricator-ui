import { describe, expect, it } from "vitest"

import { ASSISTANT_CHATS } from "@/registry/fabricator/shared/blocks/assistant-01/lib/assistant-chats"
import {
  ASSISTANT_SUGGESTIONS,
  createFinishedParts,
  pickReplyScript,
} from "@/registry/fabricator/shared/blocks/assistant-01/lib/assistant-replies"

function pick(text: string) {
  return pickReplyScript(text, []).id
}

describe("pickReplyScript", () => {
  it.each([
    ["Which regions grew fastest?", "growth"],
    ["Show revenue growth by region", "growth"],
    ["Summarize this quarter's churn", "churn"],
    ["What was our churn in Q3?", "churn"],
    ["Draft a launch email for weekly reports", "launch-email"],
    ["Compare us with SaaS benchmarks", "benchmarks"],
    ["How does that compare with the market?", "benchmarks"],
    ["Review the copy on our pricing page", "pricing-copy"],
    ["Write SQL for monthly cohort retention", "cohort-sql"],
    ["Outline the November board update", "board-update"],
    ["Build a feature matrix of our competitors", "competitors"],
    ["Suggest questions for our onboarding survey", "survey"],
    ["Thanks!", "thanks"],
    ["hello", "hello"],
    ["What can you do?", "hello"],
  ])("answers %j with %s", (question, id) => {
    expect(pick(question)).toBe(id)
  })

  it.each([
    "What's the weather in Lisbon?",
    "Why did APAC shrink?",
    "What is churn?",
    "What should we do about churn?",
    "How do we calculate churn?",
    "Predict next quarter's churn",
    "Draft an email about churn this quarter",
    "Draft an apology email to a customer",
    "Which regions should we hire in to grow?",
    "Which regions will grow fastest next year?",
    "Write SQL for churn by month",
    "What's the capital of Portugal?",
    "Make it shorter",
    "Translate the launch email to Portuguese",
    "Hello, can you book a flight?",
    "Thanks, now export it to PDF",
    "Who wrote the pricing page?",
    "Cancel the board meeting",
    "",
  ])("doesn't pretend to answer %j", (question) => {
    expect(pick(question)).toBe("fallback")
  })

  it("says so when it can't read an attached file", () => {
    const script = pickReplyScript("Which regions grew fastest?", [
      { name: "2025-budget.xlsx", size: "12 KB" },
    ])
    expect(script.id).toBe("unread-file")
    expect(script.text).toContain("2025-budget.xlsx")
  })

  it("reads the sample file", () => {
    const script = pickReplyScript("Which regions grew fastest?", [
      { name: "q3-revenue.csv", size: "298 KB" },
    ])
    expect(script.id).toBe("growth")
  })

  it("has an answer for every suggestion", () => {
    for (const { prompt } of ASSISTANT_SUGGESTIONS) {
      expect(pick(prompt)).not.toBe("fallback")
    }
  })

  it("can answer every question of the sample chats again", () => {
    for (const { messages } of ASSISTANT_CHATS) {
      for (const message of messages) {
        if (message.role !== "user") continue
        const script = pickReplyScript(message.text, message.attachments)
        expect([message.text, script.id]).not.toContain("fallback")
        expect([message.text, script.id]).not.toContain("unread-file")
      }
    }
  })
})

describe("createFinishedParts", () => {
  it("plays a script to its end", () => {
    const script = pickReplyScript("Which regions grew fastest?", [])
    const parts = createFinishedParts(script, "q3")
    expect(parts.map(({ type }) => type)).toEqual([
      ...script.steps.map(() => "step"),
      "text",
      "artifact",
    ])
    expect(
      parts.every((part) => part.type !== "step" || part.step.status === "done")
    ).toBe(true)
  })
})
