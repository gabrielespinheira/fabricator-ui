import { describe, expect, it } from "vitest"

import {
  describeFile,
  filterConversations,
  formatDuration,
  formatFileSize,
  formatListTime,
  formatPresence,
  getAdjacentId,
  getMessagePreview,
  getReadReceipt,
  groupTranscript,
  ME,
  messengerReducer,
  sortConversations,
  type ChatMessage,
  type Conversation,
  type MessengerState,
  type Person,
} from "@/registry/fabricator/shared/blocks/messenger-01/lib/messenger-model"

const FORMAT = { locale: "en-US", timeZone: "UTC" }
const NOW = Date.UTC(2026, 10, 17, 9, 41)
const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const PEOPLE: Person[] = [
  { id: "maya", name: "Maya Chen", presence: { kind: "online" } },
  {
    id: "lucas",
    name: "Lucas Ferreira",
    presence: { kind: "offline", lastSeenAt: NOW - 2 * HOUR },
  },
]

function text(
  id: string,
  senderId: string,
  sentAt: number,
  value = id
): ChatMessage {
  return { id, senderId, sentAt, body: { kind: "text", text: value } }
}

function conversation(
  id: string,
  messages: ChatMessage[],
  extra: Partial<Conversation> = {}
): Conversation {
  return {
    id,
    kind: "direct",
    title: id,
    memberIds: ["maya"],
    messages,
    unreadCount: 0,
    isPinned: false,
    isMuted: false,
    ...extra,
  }
}

describe("groupTranscript", () => {
  it("splits days and groups consecutive messages from one sender", () => {
    const days = groupTranscript(
      [
        text("a", "maya", NOW - DAY - HOUR),
        text("b", "maya", NOW - 50 * MINUTE),
        text("c", "maya", NOW - 49 * MINUTE),
        text("d", ME, NOW - 40 * MINUTE),
        text("e", "maya", NOW - 5 * MINUTE),
      ],
      { now: NOW, format: FORMAT }
    )

    expect(days.map((day) => day.label)).toEqual(["Yesterday", "Today"])
    expect(days[1].runs.map((run) => run.messages.map(({ id }) => id))).toEqual(
      [["b", "c"], ["d"], ["e"]]
    )
    expect(days[1].runs[1].isMine).toBe(true)
  })

  it("starts a new run after a long pause from the same sender", () => {
    const [today] = groupTranscript(
      [text("a", "maya", NOW - 3 * HOUR), text("b", "maya", NOW - HOUR)],
      { now: NOW, format: FORMAT }
    )
    expect(today.runs).toHaveLength(2)
  })

  it("names older days by weekday, then by date", () => {
    const days = groupTranscript(
      [text("a", "maya", NOW - 20 * DAY), text("b", "maya", NOW - 3 * DAY)],
      { now: NOW, format: FORMAT }
    )
    expect(days.map((day) => day.label)).toEqual(["Oct 28", "Saturday"])
  })
})

describe("formatListTime", () => {
  it("shows the time today, then yesterday, a weekday and a date", () => {
    expect(formatListTime(NOW - 30 * MINUTE, NOW, FORMAT)).toBe("9:11 AM")
    expect(formatListTime(NOW - DAY, NOW, FORMAT)).toBe("Yesterday")
    expect(formatListTime(NOW - 3 * DAY, NOW, FORMAT)).toBe("Sat")
    expect(formatListTime(NOW - 20 * DAY, NOW, FORMAT)).toBe("Oct 28")
  })
})

describe("formatPresence", () => {
  it("says online or how long ago they were seen", () => {
    expect(formatPresence({ kind: "online" }, NOW, FORMAT)).toBe("Online")
    expect(
      formatPresence(
        { kind: "offline", lastSeenAt: NOW - 5 * MINUTE },
        NOW,
        FORMAT
      )
    ).toBe("Last seen 5 min ago")
    expect(
      formatPresence(
        { kind: "offline", lastSeenAt: NOW - 2 * HOUR },
        NOW,
        FORMAT
      )
    ).toBe("Last seen 2 h ago")
    expect(
      formatPresence(
        { kind: "offline", lastSeenAt: NOW - 30 * HOUR },
        NOW,
        FORMAT
      )
    ).toBe("Last seen yesterday")
    expect(
      formatPresence(
        { kind: "offline", lastSeenAt: NOW - 20 * DAY },
        NOW,
        FORMAT
      )
    ).toBe("Last seen Oct 28")
  })
})

describe("getMessagePreview", () => {
  it("names the sender in groups and says You for mine", () => {
    expect(
      getMessagePreview(text("a", ME, NOW, "On my way"), {
        isGroup: false,
        people: PEOPLE,
      })
    ).toBe("You: On my way")
    expect(
      getMessagePreview(text("a", "maya", NOW, "Booked it"), {
        isGroup: true,
        people: PEOPLE,
      })
    ).toBe("Maya: Booked it")
    expect(
      getMessagePreview(text("a", "maya", NOW, "Booked it"), {
        isGroup: false,
        people: PEOPLE,
      })
    ).toBe("Booked it")
  })

  it("describes photos, files and voice messages", () => {
    const preview = (body: ChatMessage["body"]) =>
      getMessagePreview(
        { id: "a", senderId: "maya", sentAt: NOW, body },
        { isGroup: false, people: PEOPLE }
      )
    expect(preview({ kind: "image", src: "x", alt: "Lake" })).toBe("Photo")
    expect(
      preview({ kind: "image", src: "x", alt: "Lake", caption: "Day two" })
    ).toBe("Photo: Day two")
    expect(preview({ kind: "file", name: "plan.pdf", size: "2 MB" })).toBe(
      "plan.pdf"
    )
    expect(preview({ kind: "voice", src: "x", duration: 74, peaks: [] })).toBe(
      "Voice message (1:14)"
    )
  })
})

describe("formatDuration", () => {
  it("pads seconds", () => {
    expect(formatDuration(9)).toBe("0:09")
    expect(formatDuration(74)).toBe("1:14")
  })
})

describe("files", () => {
  it("formats sizes like a file browser", () => {
    expect(formatFileSize(900)).toBe("900 B")
    expect(formatFileSize(15_360)).toBe("15 KB")
    expect(formatFileSize(1_258_291)).toBe("1.2 MB")
  })

  it("describes a file by its type and size", () => {
    expect(describeFile("dolomites-weekend.pdf", "1.2 MB")).toBe("PDF · 1.2 MB")
    expect(describeFile("README", "2 KB")).toBe("File · 2 KB")
  })
})

describe("getReadReceipt", () => {
  it("labels my last message as read or delivered", () => {
    const read = { ...text("b", ME, NOW - 10 * MINUTE), readAt: NOW - MINUTE }
    expect(
      getReadReceipt([text("a", "maya", NOW - HOUR), read], FORMAT)
    ).toEqual({ messageId: "b", label: "Read 9:40 AM" })
    expect(
      getReadReceipt(
        [text("a", ME, NOW - HOUR), text("b", "maya", NOW)],
        FORMAT
      )
    ).toEqual({ messageId: "a", label: "Delivered" })
    expect(getReadReceipt([text("a", "maya", NOW)], FORMAT)).toBeUndefined()
  })
})

describe("sortConversations", () => {
  it("puts pinned first, then the most recent", () => {
    const sorted = sortConversations([
      conversation("old", [text("a", "maya", NOW - DAY)]),
      conversation("pinned", [text("b", "maya", NOW - 2 * DAY)], {
        isPinned: true,
      }),
      conversation("new", [text("c", "maya", NOW)]),
    ])
    expect(sorted.map(({ id }) => id)).toEqual(["pinned", "new", "old"])
  })
})

describe("filterConversations", () => {
  it("matches the title, a member's name or the last message", () => {
    const list = [
      conversation("a", [text("1", "maya", NOW, "Ferry at nine")], {
        title: "Maya Chen",
      }),
      conversation("b", [text("2", "lucas", NOW, "See you")], {
        title: "Lucas Ferreira",
        memberIds: ["lucas"],
      }),
    ]
    expect(
      filterConversations(list, "ferry", PEOPLE).map(({ id }) => id)
    ).toEqual(["a"])
    expect(
      filterConversations(list, " lucas ", PEOPLE).map(({ id }) => id)
    ).toEqual(["b"])
    expect(filterConversations(list, "", PEOPLE)).toHaveLength(2)
  })
})

describe("getAdjacentId", () => {
  it("moves through the list and stops at its ends", () => {
    const ids = ["a", "b", "c"]
    expect(getAdjacentId(ids, "b", "next")).toBe("c")
    expect(getAdjacentId(ids, "c", "next")).toBe("c")
    expect(getAdjacentId(ids, "a", "previous")).toBe("a")
    expect(getAdjacentId(ids, "b", "first")).toBe("a")
    expect(getAdjacentId(ids, "a", "last")).toBe("c")
    expect(getAdjacentId(ids, "missing", "next")).toBe("a")
  })
})

describe("messengerReducer", () => {
  const initial: MessengerState = {
    conversations: [
      conversation("maya", [text("a", "maya", NOW - HOUR)]),
      conversation("lucas", [text("b", "lucas", NOW - HOUR)], {
        unreadCount: 2,
      }),
    ],
    openId: "maya",
    drafts: { maya: "Half-written" },
    typing: {},
  }

  it("opens a conversation and clears its unread count", () => {
    const state = messengerReducer(initial, { type: "open", id: "lucas" })
    expect(state.openId).toBe("lucas")
    expect(state.conversations[1].unreadCount).toBe(0)
  })

  it("keeps each conversation's draft", () => {
    const state = messengerReducer(initial, {
      type: "draft",
      id: "lucas",
      text: "Hey",
    })
    expect(state.drafts).toEqual({ maya: "Half-written", lucas: "Hey" })
  })

  it("sends a message and clears the draft", () => {
    const state = messengerReducer(initial, {
      type: "send",
      id: "maya",
      message: text("c", ME, NOW, "Sounds good"),
    })
    expect(state.conversations[0].messages.at(-1)?.id).toBe("c")
    expect(state.drafts.maya).toBe("")
  })

  it("receives a message: stops typing, counts unread when closed", () => {
    const typing = messengerReducer(initial, {
      type: "typing",
      id: "lucas",
      personId: "lucas",
    })
    expect(typing.typing.lucas).toBe("lucas")

    const received = messengerReducer(typing, {
      type: "receive",
      id: "lucas",
      message: text("c", "lucas", NOW),
    })
    expect(received.typing.lucas).toBeUndefined()
    expect(received.conversations[1].unreadCount).toBe(3)

    const open = messengerReducer(initial, {
      type: "receive",
      id: "maya",
      message: text("d", "maya", NOW),
    })
    expect(open.conversations[0].unreadCount).toBe(0)
  })

  it("marks my messages read", () => {
    const sent = messengerReducer(initial, {
      type: "send",
      id: "maya",
      message: text("c", ME, NOW),
    })
    const read = messengerReducer(sent, { type: "read", id: "maya", at: NOW })
    expect(read.conversations[0].messages.at(-1)?.readAt).toBe(NOW)
    expect(read.conversations[0].messages[0].readAt).toBeUndefined()
  })

  it("blocks and unblocks a contact", () => {
    const blocked = messengerReducer(initial, {
      type: "block",
      id: "lucas",
      isBlocked: true,
    })
    expect(blocked.conversations[1].isBlocked).toBe(true)
    const unblocked = messengerReducer(blocked, {
      type: "block",
      id: "lucas",
      isBlocked: false,
    })
    expect(unblocked.conversations[1].isBlocked).toBe(false)
  })

  it("mutes a conversation", () => {
    const state = messengerReducer(initial, {
      type: "mute",
      id: "lucas",
      isMuted: true,
    })
    expect(state.conversations[1].isMuted).toBe(true)
  })
})
