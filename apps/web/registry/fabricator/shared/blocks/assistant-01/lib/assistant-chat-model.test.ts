import { describe, expect, it } from "vitest"

import { type AssistantArtifact } from "@/registry/fabricator/shared/blocks/assistant-01/lib/assistant-artifact-model"
import {
  formatChatAsMarkdown,
  formatFileSize,
  formatWorkDuration,
  getChatArtifacts,
  getChatInputStatus,
  getChatTitle,
  getReplyQuestion,
  getReplySources,
  getReplyText,
  getStepsSummary,
  groupAssistantChats,
  groupReplyParts,
  isReplyRunning,
  reduceAssistantMessages,
  searchAssistantChats,
  splitIntoChunks,
  toMarkdownFileName,
  type AssistantMessage,
  type AssistantPart,
  type AssistantReply,
  type AssistantStep,
} from "@/registry/fabricator/shared/blocks/assistant-01/lib/assistant-chat-model"

const search: AssistantStep = {
  id: "step-1",
  kind: "search",
  label: "Searched the web",
  runningLabel: "Searching the web",
  status: "running",
}

const doneSearch: AssistantStep = { ...search, status: "done", seconds: 2.6 }

const growth: AssistantArtifact = {
  id: "growth",
  title: "Growth by region",
  scope: "Q2 to Q3",
  source: "q3.csv",
  columns: [
    { key: "region", label: "Region", format: "text" },
    { key: "change", label: "Change", format: "change" },
  ],
  rows: [{ region: "EMEA", change: 18.4 }],
  chart: {
    label: "Change in MRR",
    index: "region",
    value: "change",
    isRanked: true,
  },
}

function sendHello(messages: AssistantMessage[] = []) {
  return reduceAssistantMessages(messages, {
    type: "send",
    userId: "user-1",
    replyId: "reply-1",
    text: "Hello",
    attachments: [],
  })
}

function findReply(messages: AssistantMessage[], id = "reply-1") {
  const message = messages.find((entry) => entry.id === id)
  if (message?.role !== "assistant") throw new Error(`No reply ${id}`)
  return message
}

function createReply(
  parts: AssistantPart[],
  status: AssistantReply["status"] = "done"
): AssistantReply {
  return { id: "reply-1", role: "assistant", parts, status }
}

describe("reduceAssistantMessages", () => {
  it("adds the person's message and a thinking reply", () => {
    expect(sendHello()).toEqual([
      { id: "user-1", role: "user", text: "Hello", attachments: [] },
      { id: "reply-1", role: "assistant", parts: [], status: "thinking" },
    ])
  })

  it("runs a step, then streams text after it", () => {
    let messages = sendHello()
    messages = reduceAssistantMessages(messages, {
      type: "step-start",
      replyId: "reply-1",
      step: search,
    })
    expect(findReply(messages).status).toBe("working")

    messages = reduceAssistantMessages(messages, {
      type: "step-end",
      replyId: "reply-1",
      stepId: "step-1",
      status: "done",
      detail: "6 results",
      seconds: 2.6,
    })
    for (const chunk of ["Hi ", "there."]) {
      messages = reduceAssistantMessages(messages, {
        type: "text",
        replyId: "reply-1",
        chunk,
      })
    }

    expect(findReply(messages)).toEqual({
      id: "reply-1",
      role: "assistant",
      status: "streaming",
      parts: [
        { type: "step", step: { ...doneSearch, detail: "6 results" } },
        { type: "text", text: "Hi there." },
      ],
    })
  })

  it("adds an artifact and finishes a reply", () => {
    let messages = reduceAssistantMessages(sendHello(), {
      type: "artifact",
      replyId: "reply-1",
      artifact: growth,
    })
    messages = reduceAssistantMessages(messages, {
      type: "finish",
      replyId: "reply-1",
    })
    expect(findReply(messages)).toMatchObject({
      status: "done",
      parts: [{ type: "artifact", artifact: growth }],
    })
  })

  it("stops a reply and the step that was running", () => {
    let messages = reduceAssistantMessages(sendHello(), {
      type: "step-start",
      replyId: "reply-1",
      step: search,
    })
    messages = reduceAssistantMessages(messages, {
      type: "stop",
      replyId: "reply-1",
    })

    expect(findReply(messages)).toMatchObject({
      status: "stopped",
      parts: [{ type: "step", step: { status: "stopped" } }],
    })
  })

  it("fails a reply with a reason and keeps what it wrote", () => {
    let messages = reduceAssistantMessages(sendHello(), {
      type: "text",
      replyId: "reply-1",
      chunk: "Churn fell",
    })
    messages = reduceAssistantMessages(messages, {
      type: "fail",
      replyId: "reply-1",
      error: "The connection dropped.",
    })
    expect(findReply(messages)).toMatchObject({
      status: "failed",
      error: "The connection dropped.",
      parts: [{ type: "text", text: "Churn fell" }],
    })
  })

  it("starts a reply over in place, without its error or rating", () => {
    let messages = reduceAssistantMessages(sendHello(), {
      type: "fail",
      replyId: "reply-1",
      error: "The connection dropped.",
    })
    messages = reduceAssistantMessages(messages, {
      type: "rate",
      replyId: "reply-1",
      rating: "bad",
    })
    messages = reduceAssistantMessages(messages, {
      type: "restart",
      replyId: "reply-1",
    })
    expect(findReply(messages)).toEqual({
      id: "reply-1",
      role: "assistant",
      parts: [],
      status: "thinking",
    })
  })

  it("resumes a blocked step and its reply", () => {
    let messages = reduceAssistantMessages(sendHello(), {
      type: "step-start",
      replyId: "reply-1",
      step: search,
    })
    messages = reduceAssistantMessages(messages, {
      type: "step-end",
      replyId: "reply-1",
      stepId: "step-1",
      status: "blocked",
      detail: "Needs a sign-in",
    })
    messages = reduceAssistantMessages(messages, {
      type: "step-resume",
      replyId: "reply-1",
      stepId: "step-1",
    })
    expect(findReply(messages)).toMatchObject({
      status: "working",
      parts: [{ type: "step", step: { status: "running" } }],
    })
  })

  it("rates a reply, and takes the rating back when chosen again", () => {
    const good = reduceAssistantMessages(sendHello(), {
      type: "rate",
      replyId: "reply-1",
      rating: "good",
    })
    expect(findReply(good).rating).toBe("good")

    const bad = reduceAssistantMessages(good, {
      type: "rate",
      replyId: "reply-1",
      rating: "bad",
    })
    expect(findReply(bad).rating).toBe("bad")

    const none = reduceAssistantMessages(bad, {
      type: "rate",
      replyId: "reply-1",
      rating: "bad",
    })
    expect(findReply(none).rating).toBeUndefined()
  })

  it("changes only the reply it names", () => {
    const first = reduceAssistantMessages(sendHello(), {
      type: "finish",
      replyId: "reply-1",
    })
    const second = reduceAssistantMessages(first, {
      type: "send",
      userId: "user-2",
      replyId: "reply-2",
      text: "Again",
      attachments: [],
    })
    const next = reduceAssistantMessages(second, {
      type: "text",
      replyId: "reply-2",
      chunk: "Ok",
    })

    expect(next[1]).toBe(first[1])
    expect(findReply(next, "reply-2").parts).toEqual([
      { type: "text", text: "Ok" },
    ])
  })
})

describe("getChatInputStatus", () => {
  it("follows the reply that is running", () => {
    expect(getChatInputStatus([])).toBe("ready")
    expect(getChatInputStatus(sendHello())).toBe("submitted")
    expect(
      getChatInputStatus(
        reduceAssistantMessages(sendHello(), {
          type: "text",
          replyId: "reply-1",
          chunk: "Hi",
        })
      )
    ).toBe("streaming")
    expect(
      getChatInputStatus(
        reduceAssistantMessages(sendHello(), {
          type: "stop",
          replyId: "reply-1",
        })
      )
    ).toBe("ready")
  })

  it("sees an earlier reply that started over", () => {
    let messages = reduceAssistantMessages(sendHello(), {
      type: "finish",
      replyId: "reply-1",
    })
    messages = reduceAssistantMessages(messages, {
      type: "send",
      userId: "user-2",
      replyId: "reply-2",
      text: "Again",
      attachments: [],
    })
    messages = reduceAssistantMessages(messages, {
      type: "finish",
      replyId: "reply-2",
    })
    messages = reduceAssistantMessages(messages, {
      type: "restart",
      replyId: "reply-1",
    })
    expect(getChatInputStatus(messages)).toBe("submitted")
    expect(isReplyRunning(findReply(messages))).toBe(true)
    expect(isReplyRunning(findReply(messages, "reply-2"))).toBe(false)
  })
})

describe("groupReplyParts", () => {
  it("folds consecutive steps and keeps text and artifacts apart", () => {
    const groups = groupReplyParts([
      { type: "step", step: doneSearch },
      { type: "step", step: { ...doneSearch, id: "step-2" } },
      { type: "text", text: "Answer" },
      { type: "step", step: { ...doneSearch, id: "step-3" } },
      { type: "artifact", artifact: growth },
    ])
    expect(
      groups.map((group) =>
        group.type === "steps" ? group.settled.map(({ id }) => id) : group.type
      )
    ).toEqual([["step-1", "step-2"], "text", ["step-3"], "artifact"])
  })

  it("holds steps that wait for the person apart from the settled ones", () => {
    const [group] = groupReplyParts([
      { type: "step", step: doneSearch },
      { type: "step", step: { ...search, id: "step-2", status: "blocked" } },
    ])
    expect(group).toMatchObject({
      type: "steps",
      settled: [{ id: "step-1" }],
      blocked: [{ id: "step-2" }],
      isRunning: false,
    })
  })

  it("knows when a step of the group runs", () => {
    const [group] = groupReplyParts([{ type: "step", step: search }])
    expect(group).toMatchObject({ type: "steps", isRunning: true })
  })
})

describe("getStepsSummary", () => {
  it("adds up the time and counts the steps", () => {
    expect(
      getStepsSummary([
        doneSearch,
        { ...doneSearch, id: "step-2", seconds: 1.1 },
      ])
    ).toBe("Worked for 4s, 2 steps")
  })

  it("leaves out a time nobody measured", () => {
    expect(getStepsSummary([{ ...doneSearch, seconds: undefined }])).toBe(
      "1 step"
    )
  })

  it("writes short and long waits the way people say them", () => {
    expect(formatWorkDuration(0.4)).toBe("1s")
    expect(formatWorkDuration(59.4)).toBe("59s")
    expect(formatWorkDuration(60)).toBe("1m")
    expect(formatWorkDuration(72)).toBe("1m 12s")
  })
})

describe("getReplySources", () => {
  it("lists each page once, in the order the steps found them", () => {
    const stripe = { title: "A", domain: "stripe.com", url: "https://s/a" }
    const hubspot = { title: "B", domain: "hubspot.com", url: "https://h/b" }
    const reply = createReply([
      { type: "step", step: { ...doneSearch, sources: [stripe, hubspot] } },
      {
        type: "step",
        step: { ...doneSearch, id: "step-2", sources: [stripe] },
      },
    ])
    expect(getReplySources(reply)).toEqual([stripe, hubspot])
  })

  it("leaves out pages a step couldn't open", () => {
    const gartner = { title: "C", domain: "gartner.com", url: "https://g/c" }
    const step = { ...doneSearch, sources: [gartner] }
    expect(
      getReplySources(
        createReply([{ type: "step", step: { ...step, status: "blocked" } }])
      )
    ).toEqual([])
    expect(getReplySources(createReply([{ type: "step", step }]))).toEqual([
      gartner,
    ])
  })
})

describe("getReplyText", () => {
  it("joins what the assistant wrote, without its steps", () => {
    expect(
      getReplyText(
        createReply([
          { type: "step", step: doneSearch },
          { type: "text", text: "One.\n" },
          { type: "artifact", artifact: growth },
          { type: "text", text: "\n\nTwo." },
        ])
      )
    ).toBe("One.\n\nTwo.")
  })
})

describe("getReplyQuestion", () => {
  it("finds the message a reply answers", () => {
    const messages = sendHello()
    expect(getReplyQuestion(messages, "reply-1")?.text).toBe("Hello")
    expect(getReplyQuestion(messages, "missing")).toBeNull()
  })
})

describe("getChatArtifacts", () => {
  it("lists the artifacts of a conversation in order", () => {
    const messages: AssistantMessage[] = [
      createReply([{ type: "artifact", artifact: growth }]),
      {
        ...createReply([
          { type: "artifact", artifact: { ...growth, id: "churn" } },
        ]),
        id: "reply-2",
      },
    ]
    expect(getChatArtifacts(messages).map(({ id }) => id)).toEqual([
      "growth",
      "churn",
    ])
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

describe("groupAssistantChats", () => {
  const now = new Date("2026-11-24T15:00:00Z")
  const chat = (id: string, updatedAt: string, isPinned = false) => ({
    id,
    title: id,
    updatedAt,
    isPinned,
  })

  it("groups by calendar day, newest first, without empty groups", () => {
    const groups = groupAssistantChats(
      [
        chat("old", "2026-10-01T09:00:00Z"),
        chat("morning", "2026-11-24T08:00:00Z"),
        chat("last-night", "2026-11-23T23:30:00Z"),
        chat("week", "2026-11-19T09:00:00Z"),
        chat("now", "2026-11-24T14:30:00Z"),
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

  it("puts pinned chats first, and nowhere else", () => {
    const groups = groupAssistantChats(
      [
        chat("now", "2026-11-24T14:30:00Z"),
        chat("board", "2026-11-19T09:00:00Z", true),
      ],
      now
    )
    expect(
      groups.map((group) => [group.label, group.chats.map(({ id }) => id)])
    ).toEqual([
      ["Pinned", ["board"]],
      ["Today", ["now"]],
    ])
  })
})

describe("searchAssistantChats", () => {
  const chat = (
    id: string,
    title: string,
    updatedAt: string,
    text: string
  ) => ({
    id,
    title,
    updatedAt,
    isPinned: false,
    messages: [
      {
        id: `${id}-user`,
        role: "user" as const,
        text,
        attachments: [],
      },
    ],
  })
  const chats = [
    chat("email", "Launch email", "2026-11-20T09:00:00Z", "Weekly reports"),
    chat("board", "Board update", "2026-11-22T09:00:00Z", "Add the launch"),
    chat("sql", "Retention SQL", "2026-11-24T09:00:00Z", "Cohorts by month"),
  ]

  it("lists every chat, newest first, before anything is typed", () => {
    expect(
      searchAssistantChats(chats, "  ").map(({ chat }) => chat.id)
    ).toEqual(["sql", "board", "email"])
  })

  it("finds titles first, then words inside the chat with their place", () => {
    const results = searchAssistantChats(chats, "LAUNCH")
    expect(results.map(({ chat }) => chat.id)).toEqual(["email", "board"])
    expect(results[0]?.snippet).toBeNull()
    expect(results[1]?.snippet).toBe("Add the launch")
  })

  it("needs every word, in any order and accent", () => {
    expect(
      searchAssistantChats(chats, "month cohorts").map(({ chat }) => chat.id)
    ).toEqual(["sql"])
    expect(searchAssistantChats(chats, "réport")).toHaveLength(1)
    expect(searchAssistantChats(chats, "launch invoice")).toEqual([])
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
  it("writes the title, each turn, what the steps did and the artifacts", () => {
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
            type: "step",
            step: { ...doneSearch, detail: "5 results" },
          },
          { type: "text", text: "You're ahead.\n" },
          { type: "artifact", artifact: growth },
        ],
      },
    ]

    expect(formatChatAsMarkdown("Benchmarks", messages)).toBe(
      "# Benchmarks\n\n## You\n\nCompare us\n\nAttached: q3.csv\n\n## Assistant\n\n_Searched the web: 5 results_\n\nYou're ahead.\n\n**Growth by region**\n\n| Region | Change |\n| --- | ---: |\n| EMEA | +18.4% |\n"
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
