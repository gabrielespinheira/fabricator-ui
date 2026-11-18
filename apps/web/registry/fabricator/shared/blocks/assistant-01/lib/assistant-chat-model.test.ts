import { describe, expect, it } from "vitest"

import {
  formatChatAsMarkdown,
  formatFileSize,
  getChatInputStatus,
  getChatTitle,
  groupChatsByRecency,
  reduceAssistantMessages,
  splitIntoChunks,
  toMarkdownFileName,
  type AssistantMessage,
  type AssistantToolCall,
} from "@/registry/fabricator/shared/blocks/assistant-01/lib/assistant-chat-model"

const search: AssistantToolCall = {
  id: "tool-1",
  kind: "search",
  label: "Searched the web",
  runningLabel: "Searching the web",
  status: "running",
}

function sendHello(messages: AssistantMessage[] = []) {
  return reduceAssistantMessages(messages, {
    type: "send",
    userId: "user-1",
    assistantId: "assistant-1",
    text: "Hello",
    attachments: [],
  })
}

function lastAssistant(messages: AssistantMessage[]) {
  const message = messages.at(-1)
  if (message?.role !== "assistant") throw new Error("No assistant message")
  return message
}

describe("reduceAssistantMessages", () => {
  it("adds the person's message and a thinking reply", () => {
    expect(sendHello()).toEqual([
      { id: "user-1", role: "user", text: "Hello", attachments: [] },
      { id: "assistant-1", role: "assistant", parts: [], status: "thinking" },
    ])
  })

  it("runs a tool, then streams text after it", () => {
    let messages = sendHello()
    messages = reduceAssistantMessages(messages, {
      type: "tool-start",
      tool: search,
    })
    expect(lastAssistant(messages).status).toBe("working")

    messages = reduceAssistantMessages(messages, {
      type: "tool-end",
      id: "tool-1",
      status: "done",
      detail: "6 results",
    })
    messages = reduceAssistantMessages(messages, { type: "text", chunk: "Hi " })
    messages = reduceAssistantMessages(messages, {
      type: "text",
      chunk: "there.",
    })

    expect(lastAssistant(messages)).toEqual({
      id: "assistant-1",
      role: "assistant",
      status: "streaming",
      parts: [
        {
          type: "tool",
          tool: { ...search, status: "done", detail: "6 results" },
        },
        { type: "text", text: "Hi there." },
      ],
    })
  })

  it("finishes a reply", () => {
    const messages = reduceAssistantMessages(sendHello(), { type: "finish" })
    expect(lastAssistant(messages).status).toBe("done")
  })

  it("stops a reply and fails the tool that was running", () => {
    let messages = reduceAssistantMessages(sendHello(), {
      type: "tool-start",
      tool: search,
    })
    messages = reduceAssistantMessages(messages, { type: "stop" })

    expect(lastAssistant(messages)).toMatchObject({
      status: "stopped",
      parts: [{ type: "tool", tool: { status: "error", detail: "Stopped" } }],
    })
  })

  it("leaves earlier messages untouched", () => {
    const first = reduceAssistantMessages(sendHello(), { type: "finish" })
    const second = reduceAssistantMessages(first, {
      type: "send",
      userId: "user-2",
      assistantId: "assistant-2",
      text: "Again",
      attachments: [],
    })
    const next = reduceAssistantMessages(second, { type: "text", chunk: "Ok" })

    expect(next[1]).toBe(first[1])
    expect(lastAssistant(next).parts).toEqual([{ type: "text", text: "Ok" }])
  })
})

describe("getChatInputStatus", () => {
  it("follows the last reply", () => {
    expect(getChatInputStatus([])).toBe("ready")
    expect(getChatInputStatus(sendHello())).toBe("submitted")
    expect(
      getChatInputStatus(
        reduceAssistantMessages(sendHello(), { type: "text", chunk: "Hi" })
      )
    ).toBe("streaming")
    expect(
      getChatInputStatus(reduceAssistantMessages(sendHello(), { type: "stop" }))
    ).toBe("ready")
  })
})

describe("splitIntoChunks", () => {
  it("keeps every character, a word and its spacing per chunk", () => {
    const text = "## Growth\n\n- **EMEA** grew 18%.\n"
    const chunks = splitIntoChunks(text)
    expect(chunks.join("")).toBe(text)
    expect(chunks).toEqual([
      "## ",
      "Growth\n\n",
      "- ",
      "**EMEA** ",
      "grew ",
      "18%.\n",
    ])
  })

  it("returns nothing for an empty reply", () => {
    expect(splitIntoChunks("")).toEqual([])
  })
})

describe("getChatTitle", () => {
  it("takes the first sentence", () => {
    expect(getChatTitle("Draft a launch email. Keep it short.")).toBe(
      "Draft a launch email"
    )
  })

  it("shortens a long question at a word", () => {
    expect(
      getChatTitle(
        "How does our churn compare with other B2B companies of our size and stage?"
      )
    ).toBe("How does our churn compare with other…")
  })

  it("names an empty message", () => {
    expect(getChatTitle("   ")).toBe("New chat")
  })
})

describe("groupChatsByRecency", () => {
  const now = new Date(2026, 10, 17, 15, 0)
  const chat = (id: string, updatedAt: Date) => ({
    id,
    title: id,
    updatedAt: updatedAt.toISOString(),
  })

  it("groups by calendar day, newest first, without empty groups", () => {
    const groups = groupChatsByRecency(
      [
        chat("old", new Date(2026, 9, 1)),
        chat("morning", new Date(2026, 10, 17, 8)),
        chat("last-night", new Date(2026, 10, 16, 23)),
        chat("week", new Date(2026, 10, 12)),
        chat("now", new Date(2026, 10, 17, 14, 30)),
      ],
      now
    )

    expect(
      groups.map((group) => [group.label, group.chats.map(({ id }) => id)])
    ).toEqual([
      ["Today", ["now", "morning"]],
      ["Yesterday", ["last-night"]],
      ["Previous 7 days", ["week"]],
      ["Older", ["old"]],
    ])
  })
})

describe("formatFileSize", () => {
  it("rounds to the unit people read", () => {
    expect(formatFileSize(900)).toBe("900 B")
    expect(formatFileSize(48_300)).toBe("47 KB")
    expect(formatFileSize(3_400_000)).toBe("3.2 MB")
  })
})

describe("formatChatAsMarkdown", () => {
  it("writes the title, each turn and what the tools did", () => {
    const messages: AssistantMessage[] = [
      {
        id: "u",
        role: "user",
        text: "Compare us",
        attachments: [{ name: "q3.csv", size: "48 KB" }],
      },
      {
        id: "a",
        role: "assistant",
        status: "done",
        parts: [
          {
            type: "tool",
            tool: { ...search, status: "done", detail: "5 results" },
          },
          { type: "text", text: "You're ahead.\n" },
        ],
      },
    ]

    expect(formatChatAsMarkdown("Benchmarks", messages)).toBe(
      "# Benchmarks\n\n## You\n\nCompare us\n\nAttached: q3.csv\n\n## Assistant\n\n_Searched the web: 5 results_\n\nYou're ahead.\n"
    )
  })
})

describe("toMarkdownFileName", () => {
  it("makes a file name from the title", () => {
    expect(toMarkdownFileName("Q3 revenue: analysis!")).toBe(
      "q3-revenue-analysis.md"
    )
    expect(toMarkdownFileName("???")).toBe("chat.md")
  })
})
