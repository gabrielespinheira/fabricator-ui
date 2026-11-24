import { describe, expect, it } from "vitest"

import {
  canApplyMailAction,
  findNextSnoozed,
  formatFileSize,
  formatMailDateTime,
  formatMailTime,
  getAdjacentId,
  getComposeErrors,
  getDraftBody,
  getForwardQuote,
  getListPosition,
  getMailCounts,
  getParticipants,
  getReplyRecipientIds,
  getShortName,
  getSnippet,
  getSnoozeOptions,
  getVisibleThreads,
  hasDraftContent,
  isSameDraft,
  mailReducer,
  ME,
  splitDraftBody,
  splitQuote,
  toMailMarkdown,
  type MailBox,
  type MailContact,
  type MailMessage,
  type MailState,
  type MailThread,
  type TimeFormat,
} from "@/registry/fabricator/shared/blocks/mail-01/lib/mail-model"

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
// Tuesday 17 November 2026, 15:20 UTC.
const NOW = Date.UTC(2026, 10, 17, 15, 20)
const UTC: TimeFormat = { locale: "en-US", timeZone: "UTC" }

const contacts: MailContact[] = [
  { id: ME, name: "Ada Lovelace", email: "ada@acme.com" },
  { id: "maya", name: "Maya Chen", email: "maya@acme.com" },
  { id: "stripe", name: "Stripe", email: "receipts@stripe.com" },
]

function thread(
  id: string,
  overrides: Partial<MailThread> = {},
  sentAt = NOW - HOUR
): MailThread {
  return {
    id,
    subject: `Subject ${id}`,
    account: "work",
    box: "inbox",
    isUnread: false,
    isStarred: false,
    labels: [],
    messages: [
      {
        id: `${id}-1`,
        fromId: "maya",
        toIds: [ME],
        sentAt,
        body: `Body of ${id}.\n\nSecond paragraph.`,
      },
    ],
    ...overrides,
  }
}

const threads: MailThread[] = [
  thread("a", { isUnread: true, labels: ["work"] }, NOW - 2 * HOUR),
  thread("b", { isStarred: true }, NOW - HOUR),
  thread("c", { box: "archive", labels: ["work"] }, NOW - DAY),
  thread("d", { box: "trash", isStarred: true, labels: ["work"] }),
  thread("e", { box: "drafts" }),
  thread("f", { snoozedUntil: NOW + DAY, isUnread: true }),
  thread("g", {
    box: "sent",
    messages: [
      {
        id: "g-1",
        fromId: ME,
        toIds: ["maya"],
        sentAt: NOW - 3 * HOUR,
        body: "Sent by me",
      },
    ],
  }),
  thread("h", { box: "spam", isUnread: true }),
]

describe("getVisibleThreads", () => {
  it("shows the inbox newest first, without snoozed, sent-only or other boxes", () => {
    const visible = getVisibleThreads(threads, {
      view: { kind: "folder", folder: "inbox" },
      filter: "all",
      query: "",
      contacts,
    })
    expect(visible.map(({ id }) => id)).toEqual(["b", "a"])
  })

  it("collects starred threads from every box but trash and spam", () => {
    const visible = getVisibleThreads(threads, {
      view: { kind: "folder", folder: "starred" },
      filter: "all",
      query: "",
      contacts,
    })
    expect(visible.map(({ id }) => id)).toEqual(["b"])
  })

  it("lists threads with a message from me in Sent", () => {
    const visible = getVisibleThreads(threads, {
      view: { kind: "folder", folder: "sent" },
      filter: "all",
      query: "",
      contacts,
    })
    expect(visible.map(({ id }) => id)).toEqual(["g"])
  })

  it("shows snoozed threads only under Snoozed", () => {
    const view = { kind: "folder", folder: "snoozed" } as const
    expect(
      getVisibleThreads(threads, { view, filter: "all", query: "", contacts })
    ).toHaveLength(1)
  })

  it("shows a label's threads outside trash and spam", () => {
    const visible = getVisibleThreads(threads, {
      view: { kind: "label", label: "work" },
      filter: "all",
      query: "",
      contacts,
    })
    expect(visible.map(({ id }) => id)).toEqual(["a", "c"])
  })

  it("narrows to unread or starred", () => {
    const view = { kind: "folder", folder: "inbox" } as const
    expect(
      getVisibleThreads(threads, {
        view,
        filter: "unread",
        query: "",
        contacts,
      }).map(({ id }) => id)
    ).toEqual(["a"])
    expect(
      getVisibleThreads(threads, {
        view,
        filter: "starred",
        query: "",
        contacts,
      }).map(({ id }) => id)
    ).toEqual(["b"])
  })

  it("keeps the open thread listed after reading it, until it is left", () => {
    const view = { kind: "folder", folder: "inbox" } as const
    const read = mailReducer(
      { threads, openId: null, selectedIds: [], replyDrafts: {} },
      { type: "open", id: "a" }
    ).threads
    const unread = (keepId?: string) =>
      getVisibleThreads(read, {
        view,
        filter: "unread",
        query: "",
        contacts,
        keepId,
      }).map(({ id }) => id)
    expect(unread("a")).toEqual(["a"])
    expect(unread()).toEqual([])
    // Keeping it never brings a thread into a folder it left.
    expect(unread("c")).toEqual([])
  })

  it("searches subjects, bodies and senders, ignoring case and spaces", () => {
    const view = { kind: "folder", folder: "inbox" } as const
    const search = (query: string) =>
      getVisibleThreads(threads, { view, filter: "all", query, contacts }).map(
        ({ id }) => id
      )
    expect(search("  SUBJECT A ")).toEqual(["a"])
    expect(search("second paragraph")).toEqual(["b", "a"])
    expect(search("maya@acme")).toEqual(["b", "a"])
    expect(search("nothing like this")).toEqual([])
  })
})

describe("getMailCounts", () => {
  it("counts unread inbox threads and drafts", () => {
    expect(getMailCounts(threads)).toEqual({ inbox: 1, drafts: 1, spam: 1 })
  })
})

describe("mailReducer", () => {
  const initial: MailState = {
    threads,
    openId: "b",
    selectedIds: [],
    replyDrafts: {},
  }

  it("opens a thread and marks it read", () => {
    const next = mailReducer(initial, { type: "open", id: "a" })
    expect(next.openId).toBe("a")
    expect(next.threads.find(({ id }) => id === "a")?.isUnread).toBe(false)
  })

  it("selects, toggles and clears rows", () => {
    let next = mailReducer(initial, { type: "toggleSelected", id: "a" })
    next = mailReducer(next, { type: "toggleSelected", id: "b" })
    expect(next.selectedIds).toEqual(["a", "b"])
    next = mailReducer(next, { type: "toggleSelected", id: "a" })
    expect(next.selectedIds).toEqual(["b"])
    next = mailReducer(next, { type: "selectAll", ids: ["a", "b"] })
    expect(next.selectedIds).toEqual(["a", "b"])
    next = mailReducer(next, { type: "clearSelection" })
    expect(next.selectedIds).toEqual([])
  })

  it("moves threads to another box and opens the next one in the list", () => {
    const next = mailReducer(
      { ...initial, selectedIds: ["b"] },
      { type: "move", ids: ["b"], box: "archive", visibleIds: ["b", "a"] }
    )
    expect(next.threads.find(({ id }) => id === "b")?.box).toBe("archive")
    expect(next.openId).toBe("a")
    expect(next.selectedIds).toEqual([])
  })

  it("closes the thread when nothing is left to open", () => {
    const next = mailReducer(initial, {
      type: "move",
      ids: ["b", "a"],
      box: "trash",
      visibleIds: ["b", "a"],
    })
    expect(next.openId).toBeNull()
  })

  it("marks threads read or unread, and stars one", () => {
    let next = mailReducer(initial, {
      type: "setUnread",
      ids: ["a", "b"],
      isUnread: true,
    })
    expect(next.threads.filter(({ isUnread }) => isUnread)).toHaveLength(4)
    next = mailReducer(next, { type: "star", id: "a", isStarred: true })
    expect(next.threads.find(({ id }) => id === "a")?.isStarred).toBe(true)
  })

  it("snoozes threads out of the inbox until a time", () => {
    const next = mailReducer(initial, {
      type: "snooze",
      ids: ["a"],
      until: NOW + HOUR,
      visibleIds: ["b", "a"],
    })
    expect(next.threads.find(({ id }) => id === "a")?.snoozedUntil).toBe(
      NOW + HOUR
    )
  })

  it("adds a reply to a thread and a new message to Sent", () => {
    const reply = {
      id: "r",
      fromId: ME,
      toIds: ["maya"],
      sentAt: NOW,
      body: "Thanks!",
    }
    let next = mailReducer(initial, { type: "reply", id: "a", message: reply })
    expect(next.threads.find(({ id }) => id === "a")?.messages.at(-1)).toBe(
      reply
    )
    next = mailReducer(next, {
      type: "send",
      thread: thread("new", { box: "sent" }),
    })
    expect(next.threads[0].id).toBe("new")
  })

  it("puts back only the threads an action changed, for Undo", () => {
    const before = initial.threads.filter(({ id }) => id === "b")
    let next = mailReducer(initial, {
      type: "move",
      ids: ["b"],
      box: "trash",
      visibleIds: ["b", "a"],
    })
    // Something else happens before Undo is pressed.
    next = mailReducer(next, { type: "star", id: "a", isStarred: true })
    next = mailReducer(next, { type: "restore", threads: before, openId: "b" })
    expect(next.threads.find(({ id }) => id === "b")?.box).toBe("inbox")
    expect(next.threads.find(({ id }) => id === "a")?.isStarred).toBe(true)
    expect(next.openId).toBe("b")
  })

  it("closes the open thread and drops the selection", () => {
    const next = mailReducer(
      { ...initial, selectedIds: ["a"] },
      { type: "close" }
    )
    expect(next.openId).toBeNull()
    expect(next.selectedIds).toEqual([])
  })

  it("keeps a reply's draft per thread and drops it once sent", () => {
    const draft = { body: "Half a thou", mode: "reply", files: [] } as const
    let next = mailReducer(initial, { type: "draftReply", id: "a", draft })
    expect(next.replyDrafts).toEqual({ a: draft })
    next = mailReducer(next, {
      type: "reply",
      id: "a",
      message: {
        id: "r",
        fromId: ME,
        toIds: ["maya"],
        sentAt: NOW,
        body: "Half a thought",
      },
    })
    expect(next.replyDrafts).toEqual({})
    next = mailReducer(next, { type: "draftReply", id: "b", draft })
    next = mailReducer(next, { type: "draftReply", id: "b", draft: null })
    expect(next.replyDrafts).toEqual({})
  })

  it("unsends a reply back into its draft", () => {
    const draft = { body: "Thanks!", mode: "replyAll", files: [] } as const
    let next = mailReducer(initial, {
      type: "reply",
      id: "a",
      message: {
        id: "r",
        fromId: ME,
        toIds: ["maya"],
        sentAt: NOW,
        body: "Thanks!",
      },
    })
    next = mailReducer(next, {
      type: "unsendReply",
      id: "a",
      messageId: "r",
      draft,
    })
    const restored = next.threads.find(({ id }) => id === "a")
    expect(restored?.messages.map(({ id }) => id)).toEqual(["a-1"])
    expect(next.replyDrafts.a).toEqual(draft)
  })

  it("saves a draft over its earlier version", () => {
    const draft = thread("d1", { box: "drafts", subject: "First" })
    let next = mailReducer(initial, { type: "send", thread: draft })
    next = mailReducer(next, {
      type: "send",
      thread: { ...draft, subject: "Second" },
    })
    expect(
      next.threads.filter(({ id }) => id === "d1").map(({ subject }) => subject)
    ).toEqual(["Second"])
  })

  it("closes a thread that is removed", () => {
    const next = mailReducer(initial, { type: "remove", id: "b" })
    expect(next.openId).toBeNull()
  })

  it("takes a sent message back out for Undo", () => {
    const sent = thread("new", { box: "sent" })
    let next = mailReducer(initial, { type: "send", thread: sent })
    next = mailReducer(next, { type: "remove", id: "new" })
    expect(next.threads.some(({ id }) => id === "new")).toBe(false)
  })
})

describe("getAdjacentId", () => {
  it("steps through the list and stops at its ends", () => {
    expect(getAdjacentId(["a", "b", "c"], "b", "next")).toBe("c")
    expect(getAdjacentId(["a", "b", "c"], "c", "next")).toBe("c")
    expect(getAdjacentId(["a", "b", "c"], "a", "previous")).toBe("a")
    expect(getAdjacentId(["a", "b", "c"], null, "next")).toBe("a")
    expect(getAdjacentId([], null, "next")).toBeUndefined()
  })
})

describe("getListPosition", () => {
  it("counts from one, and has no place for a thread outside the list", () => {
    expect(getListPosition(["a", "b"], "b")).toEqual({ place: 2, total: 2 })
    expect(getListPosition(["a", "b"], "z")).toBeNull()
    expect(getListPosition([], null)).toBeNull()
  })
})

describe("replying", () => {
  const message: MailMessage = {
    id: "m",
    fromId: "maya",
    toIds: [ME, "stripe"],
    ccIds: ["lucas", "maya"],
    sentAt: NOW,
    body: "Hi",
  }

  it("answers the sender, or everyone else on the message once", () => {
    expect(getReplyRecipientIds(message, "reply")).toEqual(["maya"])
    expect(getReplyRecipientIds(message, "replyAll")).toEqual([
      "maya",
      "stripe",
      "lucas",
    ])
  })

  it("writes again to the same people after my own message", () => {
    const mine = { ...message, fromId: ME, toIds: ["maya"], ccIds: ["lucas"] }
    expect(getReplyRecipientIds(mine, "reply")).toEqual(["maya"])
    expect(getReplyRecipientIds(mine, "replyAll")).toEqual(["maya", "lucas"])
  })
})

describe("composing", () => {
  it("needs someone to send to, and a message or a file", () => {
    const empty = { toIds: [], subject: "", body: " \n" }
    expect(getComposeErrors(empty, { fileCount: 0 })).toEqual({
      to: "Add at least one person to send to.",
      body: "Write a message or attach a file.",
    })
    expect(
      getComposeErrors({ ...empty, toIds: ["maya"] }, { fileCount: 1 })
    ).toEqual({})
    // A forwarded message speaks for itself.
    expect(
      getComposeErrors(
        { ...empty, toIds: ["maya"], quote: "> Hi" },
        { fileCount: 0 }
      )
    ).toEqual({})
  })

  it("puts what it quotes under what was written", () => {
    const draft = { toIds: [], subject: "", body: " Look at this. \n" }
    expect(getDraftBody(draft)).toBe("Look at this.")
    expect(getDraftBody({ ...draft, quote: "> Hi" })).toBe(
      "Look at this.\n\n> Hi"
    )
    expect(getDraftBody({ ...draft, body: "", quote: "> Hi" })).toBe("> Hi")
  })

  it("opens a saved draft with its quote apart again", () => {
    expect(splitDraftBody("Look at this.\n\n> Hi\n> there")).toEqual({
      body: "Look at this.",
      quote: "> Hi\n> there",
    })
    expect(splitDraftBody("> Hi")).toEqual({ body: "", quote: "> Hi" })
    expect(splitDraftBody("Just text")).toEqual({ body: "Just text" })
    // An answer's attribution stays with the text.
    expect(splitDraftBody("Yes.\n\nOn Monday, Ada wrote:\n> Ok?")).toEqual({
      body: "Yes.\n\nOn Monday, Ada wrote:",
      quote: "> Ok?",
    })
  })

  it("keeps a draft only when something was added", () => {
    const empty = { toIds: [], subject: "", body: "" }
    expect(hasDraftContent(empty, { fileCount: 0 })).toBe(false)
    expect(hasDraftContent({ ...empty, body: "\n " }, { fileCount: 0 })).toBe(
      false
    )
    expect(hasDraftContent({ ...empty, subject: "Hi" }, { fileCount: 0 })).toBe(
      true
    )
    expect(hasDraftContent(empty, { fileCount: 1 })).toBe(true)
  })

  it("tells a draft that was changed from one that was only opened", () => {
    const draft = { toIds: ["maya"], subject: "Hi", body: "Text" }
    expect(isSameDraft(draft, { ...draft, toIds: ["maya"] })).toBe(true)
    expect(isSameDraft(draft, { ...draft, toIds: [] })).toBe(false)
    expect(isSameDraft(draft, { ...draft, toIds: ["stripe"] })).toBe(false)
    expect(isSameDraft(draft, { ...draft, body: "Text." })).toBe(false)
  })

  it("quotes the latest message when forwarding, without its own quote", () => {
    const forwarded = thread("t", {
      subject: "Plan",
      messages: [
        {
          id: "1",
          fromId: "maya",
          toIds: [ME],
          sentAt: NOW,
          body: "Two\nlines\n\nOn Monday, Ada wrote:\n> Older",
        },
      ],
    })
    expect(getForwardQuote(forwarded, contacts, UTC)).toBe(
      [
        "> Forwarded message",
        "> From: Maya Chen, maya@acme.com",
        "> Date: Tue, Nov 17, 3:20 PM",
        "> Subject: Plan",
        ">",
        "> Two",
        "> lines",
      ].join("\n")
    )
  })
})

describe("canApplyMailAction", () => {
  const allowed = (box: MailBox, overrides: Partial<MailThread> = {}) =>
    (["archive", "moveToInbox", "delete", "snooze", "spam"] as const).filter(
      (action) => canApplyMailAction(thread("t", { box, ...overrides }), action)
    )

  it("offers what makes sense where the thread is", () => {
    expect(allowed("inbox")).toEqual(["archive", "delete", "snooze", "spam"])
    expect(allowed("sent")).toEqual(["archive", "delete", "snooze"])
    expect(allowed("archive")).toEqual([
      "moveToInbox",
      "delete",
      "snooze",
      "spam",
    ])
    expect(allowed("spam")).toEqual(["moveToInbox", "delete"])
    expect(allowed("trash")).toEqual(["moveToInbox"])
    expect(allowed("drafts")).toEqual(["delete"])
  })

  it("brings a snoozed thread back to the inbox", () => {
    expect(allowed("inbox", { snoozedUntil: NOW + DAY })).toContain(
      "moveToInbox"
    )
  })
})

describe("getShortName", () => {
  it("is a person's first name, and a company's whole name", () => {
    expect(getShortName(contacts[1])).toBe("Maya")
    expect(
      getShortName({ id: "b", name: "Blue Fox", email: "", brand: "fox" })
    ).toBe("Blue Fox")
    expect(
      getShortName({
        id: "l",
        name: "City Library",
        email: "",
        isCompany: true,
      })
    ).toBe("City Library")
    expect(getShortName(undefined)).toBe("")
  })
})

describe("message text", () => {
  it("parts what was written from what it quotes", () => {
    expect(
      splitQuote("Good call.\n\nOn Monday, Ada wrote:\n> Looks focused.\n> Ada")
    ).toEqual({
      text: "Good call.",
      attribution: "On Monday, Ada wrote:",
      quote: "Looks focused.\nAda",
    })
    expect(splitQuote("Just text")).toEqual({ text: "Just text" })
    // A quote answered in the middle of the message stays where it is.
    expect(splitQuote("> Is it ready?\n\nYes.")).toEqual({
      text: "> Is it ready?\n\nYes.",
    })
  })

  it("keeps single line breaks and leaves lists alone", () => {
    expect(toMailMarkdown("In: Thursday\nOut: Sunday\n\n1. One\n2. Two")).toBe(
      "In: Thursday  \nOut: Sunday\n\n1. One\n2. Two"
    )
    const quoted = toMailMarkdown("> From: Maya\n> Date: Today\n>\n> Hi")
    expect(quoted).toBe("> From: Maya  \n> Date: Today\n>\n> Hi")
    expect(toMailMarkdown(quoted)).toBe(quoted)
  })
})

describe("findNextSnoozed", () => {
  it("is the snoozed thread that returns first", () => {
    const later = thread("z", { snoozedUntil: NOW + 3 * DAY })
    expect(findNextSnoozed([later, ...threads])?.id).toBe("f")
    expect(findNextSnoozed([])).toBeUndefined()
  })
})

describe("formatMailTime", () => {
  it("uses the clock today, then the day, then the date", () => {
    expect(formatMailTime(NOW - HOUR, NOW, UTC)).toBe("2:20 PM")
    expect(formatMailTime(NOW - DAY, NOW, UTC)).toBe("Yesterday")
    expect(formatMailTime(NOW - 3 * DAY, NOW, UTC)).toBe("Sat")
    expect(formatMailTime(NOW - 20 * DAY, NOW, UTC)).toBe("Oct 28")
    expect(formatMailTime(Date.UTC(2025, 5, 2), NOW, UTC)).toBe("Jun 2, 2025")
  })

  it("writes a message's full date", () => {
    expect(formatMailDateTime(NOW, UTC)).toBe("Tue, Nov 17, 3:20 PM")
  })
})

describe("getSnoozeOptions", () => {
  it("offers later today, tomorrow morning, the weekend and next week", () => {
    expect(
      getSnoozeOptions(NOW, UTC).map(({ id, label, detail }) => [
        id,
        label,
        detail,
      ])
    ).toEqual([
      ["later", "Later today", "6:00 PM"],
      ["tomorrow", "Tomorrow", "Wed, 8:00 AM"],
      ["weekend", "This weekend", "Sat, 8:00 AM"],
      ["next-week", "Next week", "Mon, 8:00 AM"],
    ])
  })

  it("leaves out later today in the evening", () => {
    const evening = Date.UTC(2026, 10, 17, 19, 0)
    expect(getSnoozeOptions(evening, UTC).map(({ id }) => id)).toEqual([
      "tomorrow",
      "weekend",
      "next-week",
    ])
  })
})

describe("getSnippet and getParticipants", () => {
  it("reads the latest message as one line", () => {
    expect(getSnippet(threads[0])).toBe("Body of a. Second paragraph.")
  })

  it("leaves quotes and formatting marks out of the line", () => {
    const formatted = thread("t", {
      messages: [
        {
          id: "1",
          fromId: "maya",
          toIds: [ME],
          sentAt: NOW,
          body: "**Short** version:\n\n- Keep it\n- _Move_ it\n\nOn Monday, Ada wrote:\n> Older",
        },
      ],
    })
    expect(getSnippet(formatted)).toBe("Short version: Keep it Move it")
    const forwarded = thread("t", {
      messages: [
        {
          id: "1",
          fromId: ME,
          toIds: ["maya"],
          sentAt: NOW,
          body: "\n\n> Forwarded message\n> Hi",
        },
      ],
    })
    expect(getSnippet(forwarded)).toBe("Forwarded message Hi")
  })

  it("names who wrote, with me last and a message count", () => {
    const conversation = thread("t", {
      messages: [
        { id: "1", fromId: "maya", toIds: [ME], sentAt: 1, body: "Hi" },
        { id: "2", fromId: ME, toIds: ["maya"], sentAt: 2, body: "Hey" },
        { id: "3", fromId: "maya", toIds: [ME], sentAt: 3, body: "Ok" },
      ],
    })
    expect(getParticipants(conversation, contacts)).toEqual({
      label: "Maya, me",
      count: 3,
    })
    expect(getParticipants(threads[0], contacts)).toEqual({
      label: "Maya Chen",
      count: 1,
    })
  })
})

describe("formatFileSize", () => {
  it("rounds to bytes, kilobytes or megabytes", () => {
    expect(formatFileSize(860)).toBe("860 B")
    expect(formatFileSize(54 * 1024)).toBe("54 KB")
    expect(formatFileSize(1.8 * 1024 * 1024)).toBe("1.8 MB")
  })
})
