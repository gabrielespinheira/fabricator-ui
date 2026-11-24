import { describe, expect, it } from "vitest"

import {
  canReact,
  createMessengerState,
  describeFile,
  describeReaction,
  filterConversations,
  filterPeople,
  formatDuration,
  formatFileSize,
  formatListTime,
  formatPresence,
  getAdjacentId,
  getFirstUnreadId,
  getMessageActions,
  getMessagePreview,
  getReadReceipt,
  getRunPosition,
  getSharedMedia,
  getVisibleUnread,
  groupTranscript,
  ME,
  messengerReducer,
  sortConversations,
  toggleReaction,
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

describe("groupTranscript, where a run ends", () => {
  const options = { now: NOW, format: FORMAT }

  it("starts a run at the first unread message and marks it", () => {
    const [today] = groupTranscript(
      [
        text("a", "maya", NOW - 10 * MINUTE),
        text("b", "maya", NOW - 9 * MINUTE),
        text("c", "maya", NOW - 8 * MINUTE),
      ],
      { ...options, unreadFromId: "b" }
    )
    expect(today.runs.map((run) => run.messages.map(({ id }) => id))).toEqual([
      ["a"],
      ["b", "c"],
    ])
    expect(today.runs.map((run) => run.isFirstUnread)).toEqual([false, true])
  })

  it("marks a run that was starting anyway", () => {
    const [today] = groupTranscript(
      [text("a", ME, NOW - 10 * MINUTE), text("b", "maya", NOW - 9 * MINUTE)],
      { ...options, unreadFromId: "b" }
    )
    expect(today.runs.map((run) => run.isFirstUnread)).toEqual([false, true])
  })

  it("gives a failed message a run of its own, so its Retry is under it", () => {
    const failed: ChatMessage = {
      ...text("b", ME, NOW - 9 * MINUTE),
      status: "failed",
    }
    const [today] = groupTranscript(
      [
        text("a", ME, NOW - 10 * MINUTE),
        failed,
        text("c", ME, NOW - 8 * MINUTE),
      ],
      options
    )
    expect(today.runs.map((run) => run.messages.map(({ id }) => id))).toEqual([
      ["a"],
      ["b"],
      ["c"],
    ])
  })
})

describe("getRunPosition", () => {
  it("says which corners of a bubble join its neighbours", () => {
    expect(getRunPosition(0, 1)).toBe("only")
    expect(getRunPosition(0, 3)).toBe("first")
    expect(getRunPosition(1, 3)).toBe("middle")
    expect(getRunPosition(2, 3)).toBe("last")
  })
})

describe("getFirstUnreadId", () => {
  const messages = [
    text("a", "maya", NOW - 5 * MINUTE),
    text("b", "maya", NOW - 4 * MINUTE),
    text("c", ME, NOW - 3 * MINUTE),
    text("d", "lucas", NOW - 2 * MINUTE),
  ]

  it("counts back over the messages from other people", () => {
    expect(getFirstUnreadId(messages, 1)).toBe("d")
    expect(getFirstUnreadId(messages, 2)).toBe("b")
  })

  it("has none when all is read, and starts at the first when older ones are unread too", () => {
    expect(getFirstUnreadId(messages, 0)).toBeUndefined()
    expect(getFirstUnreadId(messages, 12)).toBe("a")
    expect(getFirstUnreadId([text("a", ME, NOW)], 3)).toBeUndefined()
  })
})

describe("getVisibleUnread", () => {
  const unread = conversation("maya", [], { unreadCount: 3 })

  it("hides the count of the conversation being read", () => {
    expect(getVisibleUnread(unread, "lucas")).toBe(3)
    expect(getVisibleUnread(unread, "maya")).toBe(0)
    expect(getVisibleUnread(unread, null)).toBe(3)
  })

  it("keeps the count of a conversation I marked unread", () => {
    expect(getVisibleUnread({ ...unread, isMarkedUnread: true }, "maya")).toBe(
      3
    )
  })
})

describe("reactions", () => {
  it("adds mine, joins a reaction that is there and takes mine back", () => {
    const added = toggleReaction(undefined, "👍", ME)
    expect(added).toEqual([{ emoji: "👍", personIds: [ME] }])

    const joined = toggleReaction(
      [{ emoji: "👍", personIds: ["maya"] }],
      "👍",
      ME
    )
    expect(joined).toEqual([{ emoji: "👍", personIds: ["maya", ME] }])

    expect(toggleReaction(joined, "👍", ME)).toEqual([
      { emoji: "👍", personIds: ["maya"] },
    ])
    expect(toggleReaction(added, "👍", ME)).toEqual([])
  })

  it("names the reaction and who it is from", () => {
    expect(
      describeReaction({ emoji: "❤️", personIds: ["maya", ME] }, PEOPLE)
    ).toBe("Heart from Maya and you")
    expect(
      describeReaction({ emoji: "🦄", personIds: ["lucas"] }, PEOPLE)
    ).toBe("🦄 from Lucas")
  })

  it("waits until a message has been sent", () => {
    expect(canReact(text("a", ME, NOW))).toBe(true)
    expect(canReact({ ...text("a", ME, NOW), status: "sending" })).toBe(false)
    expect(canReact({ ...text("a", ME, NOW), status: "failed" })).toBe(false)
  })
})

describe("getMessageActions", () => {
  it("offers what fits the message and whose it is", () => {
    expect(getMessageActions(text("a", "maya", NOW))).toEqual([
      "reply",
      "copy",
      "unread",
    ])
    expect(getMessageActions(text("a", ME, NOW))).toEqual([
      "reply",
      "copy",
      "delete",
    ])
    expect(
      getMessageActions({
        id: "a",
        senderId: "maya",
        sentAt: NOW,
        body: { kind: "file", name: "plan.pdf", size: "2 MB" },
      })
    ).toEqual(["reply", "unread"])
  })

  it("offers Retry on a failed message and nothing on one being sent", () => {
    expect(
      getMessageActions({ ...text("a", ME, NOW), status: "failed" })
    ).toEqual(["retry", "copy", "delete"])
    expect(
      getMessageActions({ ...text("a", ME, NOW), status: "sending" })
    ).toEqual(["copy"])
  })
})

describe("getSharedMedia", () => {
  it("lists photos and files, newest first", () => {
    const photo = (id: string): ChatMessage => ({
      id,
      senderId: "maya",
      sentAt: NOW,
      body: { kind: "image", src: `${id}.jpg`, alt: id },
    })
    const file: ChatMessage = {
      id: "f",
      senderId: ME,
      sentAt: NOW,
      body: { kind: "file", name: "plan.pdf", size: "2 MB" },
    }
    const media = getSharedMedia([
      photo("a"),
      file,
      text("t", "maya", NOW),
      photo("b"),
    ])
    expect(media.photos.map(({ id }) => id)).toEqual(["b", "a"])
    expect(media.files.map(({ id }) => id)).toEqual(["f"])
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

  it("says Sending until it lands, and skips a message that failed", () => {
    const sending: ChatMessage = { ...text("b", ME, NOW), status: "sending" }
    expect(getReadReceipt([sending], FORMAT)?.label).toBe("Sending")

    const failed: ChatMessage = { ...text("c", ME, NOW), status: "failed" }
    expect(
      getReadReceipt([text("a", ME, NOW - MINUTE), failed], FORMAT)?.messageId
    ).toBe("a")
    expect(getReadReceipt([failed], FORMAT)).toBeUndefined()
  })

  it("names up to two readers in a group, then counts them", () => {
    const readBy = (...ids: string[]) =>
      getReadReceipt([{ ...text("a", ME, NOW), readBy: ids }], FORMAT, PEOPLE)
        ?.label
    expect(readBy("maya")).toBe("Read by Maya")
    expect(readBy("maya", "lucas")).toBe("Read by Maya and Lucas")
    expect(readBy("maya", "lucas", "sofia")).toBe("Read by 3")
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

  it("puts a match in the title before one among the members", () => {
    const list = [
      conversation("offsite", [], { title: "Lisbon offsite" }),
      conversation("maya", [], { title: "Maya Chen" }),
    ]
    expect(
      filterConversations(list, "maya", PEOPLE).map(({ id }) => id)
    ).toEqual(["maya", "offsite"])
  })
})

describe("filterPeople", () => {
  it("matches a name or a role, and everyone without a search", () => {
    const people: Person[] = [
      { ...PEOPLE[0], role: "Product designer" },
      PEOPLE[1],
    ]
    expect(filterPeople(people, " DESIGN ").map(({ id }) => id)).toEqual([
      "maya",
    ])
    expect(filterPeople(people, "ferr").map(({ id }) => id)).toEqual(["lucas"])
    expect(filterPeople(people, "")).toHaveLength(2)
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
    replyTo: {},
    unreadFrom: {},
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

  it("starts with the open conversation's unread messages marked", () => {
    const state = createMessengerState(initial.conversations, "lucas")
    expect(state.openId).toBe("lucas")
    expect(state.unreadFrom.lucas).toBe("b")
    expect(state.conversations[1].unreadCount).toBe(2)

    const seen = messengerReducer(state, { type: "seen", id: "lucas" })
    expect(seen.conversations[1].unreadCount).toBe(0)
    expect(seen.unreadFrom.lucas).toBe("b")
  })

  it("marks where unread messages start on opening, and forgets it once read", () => {
    const opened = messengerReducer(initial, { type: "open", id: "lucas" })
    expect(opened.unreadFrom.lucas).toBe("b")

    const away = messengerReducer(opened, { type: "open", id: "maya" })
    const back = messengerReducer(away, { type: "open", id: "lucas" })
    expect(back.unreadFrom.lucas).toBeUndefined()

    const answered = messengerReducer(opened, {
      type: "send",
      id: "lucas",
      message: text("c", ME, NOW),
    })
    expect(answered.unreadFrom.lucas).toBeUndefined()
  })

  it("counts a message that arrives while a phone shows the list", () => {
    const state = messengerReducer(initial, {
      type: "receive",
      id: "maya",
      message: text("d", "maya", NOW),
      isAway: true,
    })
    expect(state.conversations[0].unreadCount).toBe(1)
  })

  it("keeps a conversation unread from a message until it is opened again", () => {
    const marked = messengerReducer(initial, {
      type: "unread",
      id: "maya",
      messageId: "a",
    })
    expect(marked.conversations[0].unreadCount).toBe(1)
    expect(marked.unreadFrom.maya).toBe("a")
    expect(
      messengerReducer(marked, { type: "seen", id: "maya" }).conversations[0]
        .unreadCount
    ).toBe(1)

    const opened = messengerReducer(marked, { type: "open", id: "maya" })
    expect(opened.conversations[0].unreadCount).toBe(0)
    expect(opened.conversations[0].isMarkedUnread).toBe(false)
  })

  it("sends, fails, retries at the end and delivers", () => {
    const sending: ChatMessage = { ...text("c", ME, NOW), status: "sending" }
    const sent = messengerReducer(initial, {
      type: "send",
      id: "maya",
      message: sending,
    })
    const failed = messengerReducer(sent, {
      type: "fail",
      id: "maya",
      messageId: "c",
    })
    expect(failed.conversations[0].messages.at(-1)?.status).toBe("failed")

    const later = messengerReducer(failed, {
      type: "receive",
      id: "maya",
      message: text("d", "maya", NOW + MINUTE),
    })
    const retried = messengerReducer(later, {
      type: "retry",
      id: "maya",
      messageId: "c",
      at: NOW + HOUR,
    })
    expect(retried.conversations[0].messages.at(-1)).toMatchObject({
      id: "c",
      status: "sending",
      sentAt: NOW + HOUR,
    })

    const delivered = messengerReducer(retried, {
      type: "deliver",
      id: "maya",
      messageId: "c",
    })
    expect(delivered.conversations[0].messages.at(-1)?.status).toBeUndefined()
  })

  it("never marks a failed message read", () => {
    const failed: ChatMessage = { ...text("c", ME, NOW), status: "failed" }
    const sent = messengerReducer(initial, {
      type: "send",
      id: "maya",
      message: failed,
    })
    const read = messengerReducer(sent, { type: "read", id: "maya", at: NOW })
    expect(read.conversations[0].messages.at(-1)?.readAt).toBeUndefined()
  })

  it("adds a reader to my messages in a group", () => {
    const group: MessengerState = {
      ...initial,
      conversations: [
        conversation("offsite", [text("a", ME, NOW)], { kind: "group" }),
      ],
    }
    const read = messengerReducer(group, {
      type: "read",
      id: "offsite",
      at: NOW,
      personId: "maya",
    })
    const again = messengerReducer(read, {
      type: "read",
      id: "offsite",
      at: NOW,
      personId: "maya",
    })
    expect(again.conversations[0].messages[0].readBy).toEqual(["maya"])
    expect(again.conversations[0].messages[0].readAt).toBeUndefined()
  })

  it("stops showing someone as typing in one conversation only", () => {
    const typing = ["maya", "lucas"].reduce(
      (state, id) =>
        messengerReducer(state, { type: "typing", id, personId: id }),
      initial
    )
    const received = messengerReducer(typing, {
      type: "receive",
      id: "lucas",
      message: text("d", "lucas", NOW),
    })
    expect(received.typing).toEqual({ maya: "maya", lucas: undefined })
  })

  it("quotes the message being answered, then drops it", () => {
    const replying = messengerReducer(initial, {
      type: "reply",
      id: "maya",
      messageId: "a",
    })
    expect(replying.replyTo.maya).toBe("a")
    const sent = messengerReducer(replying, {
      type: "send",
      id: "maya",
      message: text("c", ME, NOW),
    })
    expect(sent.replyTo.maya).toBeUndefined()
    expect(sent.conversations[0].messages.at(-1)?.replyToId).toBe("a")
  })

  it("reacts to a message", () => {
    const state = messengerReducer(initial, {
      type: "react",
      id: "maya",
      messageId: "a",
      emoji: "👍",
    })
    expect(state.conversations[0].messages[0].reactions).toEqual([
      { emoji: "👍", personIds: [ME] },
    ])
  })

  it("deletes a message and puts it back where it was", () => {
    const sent = ["b", "c"].reduce(
      (state, id) =>
        messengerReducer(state, {
          type: "send",
          id: "maya",
          message: text(id, ME, NOW),
        }),
      initial
    )
    const deleted = messengerReducer(sent, {
      type: "delete",
      id: "maya",
      messageId: "b",
    })
    expect(deleted.conversations[0].messages.map(({ id }) => id)).toEqual([
      "a",
      "c",
    ])

    const restored = messengerReducer(deleted, {
      type: "restore",
      id: "maya",
      message: sent.conversations[0].messages[1],
      index: 1,
    })
    expect(restored.conversations[0].messages.map(({ id }) => id)).toEqual([
      "a",
      "b",
      "c",
    ])
  })

  it("starts a chat with someone new, and opens the one that is there", () => {
    const priya: Person = {
      id: "priya",
      name: "Priya Raman",
      presence: { kind: "online" },
    }
    const started = messengerReducer(initial, {
      type: "start",
      person: priya,
      at: NOW,
    })
    expect(started.openId).toBe("priya")
    expect(sortConversations(started.conversations)[0]).toMatchObject({
      id: "priya",
      title: "Priya Raman",
      kind: "direct",
      messages: [],
    })

    const existing = messengerReducer(initial, {
      type: "start",
      person: PEOPLE[0],
      at: NOW,
    })
    expect(existing.conversations).toHaveLength(2)
    expect(existing.openId).toBe("maya")
  })

  it("pins a conversation", () => {
    const state = messengerReducer(initial, {
      type: "pin",
      id: "lucas",
      isPinned: true,
    })
    expect(state.conversations[1].isPinned).toBe(true)
  })
})
