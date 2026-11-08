import { describe, expect, it } from "vitest"

import {
  applyChatInputPick,
  filterChatInputCommands,
  findChatInputTrigger,
  formatChatInputDuration,
  formatTokenCount,
  getChatInputAttachmentsLayout,
  getChatInputContextLevel,
  getChatInputKeyAction,
  getChatInputMicLabel,
  getChatInputSendAction,
  isChatInputBusy,
  isChatInputReady,
  nextChatInputStacked,
  splitChatInputMentions,
} from "@/registry/fabricator/shared/ui/chat-input"

const enter = {
  key: "Enter",
  shiftKey: false,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  isComposing: false,
}

describe("getChatInputKeyAction", () => {
  it("submits on Enter and adds a line on Shift+Enter", () => {
    expect(getChatInputKeyAction(enter, { submitOn: "enter" })).toBe("submit")
    expect(
      getChatInputKeyAction({ ...enter, shiftKey: true }, { submitOn: "enter" })
    ).toBe("none")
  })

  it("leaves Enter to an input method composing text", () => {
    expect(
      getChatInputKeyAction(
        { ...enter, isComposing: true },
        { submitOn: "enter" }
      )
    ).toBe("none")
  })

  it("submits on Cmd or Ctrl+Enter in mod-enter mode, where Enter adds a line", () => {
    expect(getChatInputKeyAction(enter, { submitOn: "mod-enter" })).toBe("none")
    expect(
      getChatInputKeyAction(
        { ...enter, metaKey: true },
        { submitOn: "mod-enter" }
      )
    ).toBe("submit")
    expect(
      getChatInputKeyAction(
        { ...enter, ctrlKey: true },
        { submitOn: "mod-enter" }
      )
    ).toBe("submit")
  })

  it("submits on Cmd+Enter in enter mode too", () => {
    expect(
      getChatInputKeyAction({ ...enter, metaKey: true }, { submitOn: "enter" })
    ).toBe("submit")
  })

  it("stops on Escape", () => {
    expect(
      getChatInputKeyAction({ ...enter, key: "Escape" }, { submitOn: "enter" })
    ).toBe("stop")
  })

  it("ignores other keys", () => {
    expect(
      getChatInputKeyAction({ ...enter, key: "a" }, { submitOn: "enter" })
    ).toBe("none")
  })
})

describe("isChatInputBusy", () => {
  it("is busy while a reply is submitted or streaming", () => {
    expect(isChatInputBusy("submitted")).toBe(true)
    expect(isChatInputBusy("streaming")).toBe(true)
    expect(isChatInputBusy("ready")).toBe(false)
    expect(isChatInputBusy("error")).toBe(false)
  })
})

describe("isChatInputReady", () => {
  it("is ready with text that isn't only whitespace", () => {
    expect(isChatInputReady({ value: "Hi", status: "ready" })).toBe(true)
    expect(isChatInputReady({ value: "  \n ", status: "ready" })).toBe(false)
  })

  it("is ready with no text when there is something else to send", () => {
    expect(
      isChatInputReady({ value: "", status: "ready", hasContent: true })
    ).toBe(true)
  })

  it("is never ready while busy or disabled", () => {
    expect(isChatInputReady({ value: "Hi", status: "streaming" })).toBe(false)
    expect(
      isChatInputReady({ value: "Hi", status: "ready", disabled: true })
    ).toBe(false)
  })

  it("takes a message to queue while busy when queueing is on", () => {
    expect(
      isChatInputReady({ value: "Hi", status: "streaming", queue: true })
    ).toBe(true)
    expect(
      isChatInputReady({ value: " ", status: "streaming", queue: true })
    ).toBe(false)
  })

  it("lets a failed message be sent again", () => {
    expect(isChatInputReady({ value: "Hi", status: "error" })).toBe(true)
  })
})

describe("nextChatInputStacked", () => {
  const room = { lineWidth: 100, inlineWidth: 200 }

  it("stays inline while the draft fits beside the controls", () => {
    expect(
      nextChatInputStacked({
        stacked: false,
        value: "Hi",
        wraps: false,
        ...room,
      })
    ).toBe(false)
  })

  it("stacks once the draft wraps beside the controls", () => {
    expect(
      nextChatInputStacked({
        stacked: false,
        value: "Hi",
        wraps: true,
        ...room,
      })
    ).toBe(true)
  })

  it("stays stacked until the draft fits the inline room again", () => {
    expect(
      nextChatInputStacked({
        stacked: true,
        value: "A long line",
        wraps: false,
        lineWidth: 199,
        inlineWidth: 200,
      })
    ).toBe(true)
    expect(
      nextChatInputStacked({
        stacked: true,
        value: "Short",
        wraps: false,
        lineWidth: 50,
        inlineWidth: 200,
      })
    ).toBe(false)
  })

  it("stays stacked while the draft has a line break", () => {
    expect(
      nextChatInputStacked({
        stacked: true,
        value: "a\nb",
        wraps: false,
        ...room,
      })
    ).toBe(true)
  })

  it("goes back inline once the draft is cleared", () => {
    expect(
      nextChatInputStacked({ stacked: true, value: "", wraps: true, ...room })
    ).toBe(false)
  })
})

describe("getChatInputSendAction", () => {
  const idle = {
    hasMessage: false,
    isUploading: false,
    isBusy: false,
    canStop: false,
    queue: false,
    hasVoice: false,
    isVoiceActive: false,
  }

  it("sends a message and waits for one", () => {
    expect(getChatInputSendAction({ ...idle, hasMessage: true })).toBe("send")
    expect(getChatInputSendAction(idle)).toBe("idle")
  })

  it("offers voice chat in an empty input, and ends it while it's on", () => {
    expect(getChatInputSendAction({ ...idle, hasVoice: true })).toBe("voice")
    expect(
      getChatInputSendAction({
        ...idle,
        hasVoice: true,
        isVoiceActive: true,
        isBusy: true,
        canStop: true,
      })
    ).toBe("voice")
    expect(
      getChatInputSendAction({ ...idle, hasVoice: true, hasMessage: true })
    ).toBe("send")
  })

  it("stops a reply from an empty input", () => {
    expect(
      getChatInputSendAction({ ...idle, isBusy: true, canStop: true })
    ).toBe("stop")
    expect(
      getChatInputSendAction({
        ...idle,
        isBusy: true,
        canStop: true,
        hasVoice: true,
      })
    ).toBe("stop")
    expect(getChatInputSendAction({ ...idle, isBusy: true })).toBe("busy")
  })

  it("queues a typed message while a reply runs when queueing is on", () => {
    const running = { ...idle, isBusy: true, canStop: true, hasMessage: true }
    expect(getChatInputSendAction({ ...running, queue: true })).toBe("queue")
    expect(getChatInputSendAction(running)).toBe("stop")
  })

  it("waits for uploads before sending", () => {
    expect(
      getChatInputSendAction({ ...idle, hasMessage: true, isUploading: true })
    ).toBe("uploading")
    expect(
      getChatInputSendAction({ ...idle, hasVoice: true, isUploading: true })
    ).toBe("uploading")
  })
})

describe("getChatInputAttachmentsLayout", () => {
  const image = { isImage: true }
  const file = { isImage: false }

  it("lays tiles out across the card in the default layout", () => {
    expect(
      getChatInputAttachmentsLayout({
        layout: "default",
        isStacked: false,
        items: [image],
      })
    ).toBe("default")
  })

  it("puts up to three images beside send in the compact pill", () => {
    expect(
      getChatInputAttachmentsLayout({
        layout: "compact",
        isStacked: false,
        items: [image, image, image],
      })
    ).toBe("inline")
  })

  it("moves them above once there are more, a file, or the draft has stacked", () => {
    const compact = { layout: "compact" as const, isStacked: false }
    expect(
      getChatInputAttachmentsLayout({
        ...compact,
        items: [image, image, image, image],
      })
    ).toBe("compact")
    expect(
      getChatInputAttachmentsLayout({ ...compact, items: [image, file] })
    ).toBe("compact")
    expect(
      getChatInputAttachmentsLayout({
        layout: "compact",
        isStacked: true,
        items: [image],
      })
    ).toBe("compact")
  })
})

describe("getChatInputContextLevel", () => {
  it("is calm under 70%, high under 90%, then full", () => {
    expect(getChatInputContextLevel(0.2)).toBe("calm")
    expect(getChatInputContextLevel(0.7)).toBe("high")
    expect(getChatInputContextLevel(0.9)).toBe("full")
    expect(getChatInputContextLevel(1.4)).toBe("full")
  })
})

describe("formatTokenCount", () => {
  it("shortens thousands and millions", () => {
    expect(formatTokenCount(950)).toBe("950")
    expect(formatTokenCount(84_200)).toBe("84K")
    expect(formatTokenCount(200_000)).toBe("200K")
    expect(formatTokenCount(1_000_000)).toBe("1M")
    expect(formatTokenCount(1_250_000)).toBe("1.3M")
  })
})

describe("splitChatInputMentions", () => {
  const sigils = ["@", "/"]

  it("marks a sigil and the name after it at the start or after a space", () => {
    expect(
      splitChatInputMentions("Fix @src/app.tsx with /review now", sigils)
    ).toEqual([
      { text: "Fix " },
      { text: "@src/app.tsx", sigil: "@" },
      { text: " with " },
      { text: "/review", sigil: "/" },
      { text: " now" },
    ])
  })

  it("leaves a sigil inside a word or alone", () => {
    expect(splitChatInputMentions("mail me@x.com / ok", sigils)).toEqual([
      { text: "mail me@x.com / ok" },
    ])
  })

  it("keeps the text unchanged when it joins back", () => {
    const text = "@a\n/b  c"
    expect(
      splitChatInputMentions(text, sigils)
        .map((segment) => segment.text)
        .join("")
    ).toBe(text)
  })
})

describe("getChatInputMicLabel", () => {
  it("names what a press does in each state", () => {
    expect(getChatInputMicLabel("listening")).toBe("Listening. Mute")
    expect(getChatInputMicLabel("muted")).toBe("Unmute")
    expect(getChatInputMicLabel("speaking")).toBe("Stop speaking")
    expect(getChatInputMicLabel("transcribing")).toBe("Transcribing…")
  })
})

describe("findChatInputTrigger", () => {
  it("finds a sigil typed at the start or after a space, up to the caret", () => {
    expect(findChatInputTrigger("/rev", 4, ["/"])).toEqual({
      sigil: "/",
      query: "rev",
      start: 0,
      end: 4,
    })
    expect(findChatInputTrigger("please /", 8, ["/"])).toEqual({
      sigil: "/",
      query: "",
      start: 7,
      end: 8,
    })
  })

  it("ignores a sigil inside a word or a path", () => {
    expect(findChatInputTrigger("and/or", 6, ["/"])).toBeNull()
    expect(findChatInputTrigger("see src/app", 11, ["/"])).toBeNull()
  })

  it("only looks behind the caret", () => {
    expect(findChatInputTrigger("/goal ship it", 13, ["/"])).toBeNull()
    expect(findChatInputTrigger("/goal ship it", 3, ["/"])).toEqual({
      sigil: "/",
      query: "go",
      start: 0,
      end: 3,
    })
  })

  it("picks the right sigil among several", () => {
    expect(findChatInputTrigger("look at @src", 12, ["/", "@"])?.sigil).toBe(
      "@"
    )
  })
})

describe("applyChatInputPick", () => {
  it("replaces the typed token with the pick and a space, and puts the caret after it", () => {
    const trigger = { sigil: "/", query: "rev", start: 4, end: 8 }
    expect(applyChatInputPick("run /rev now", trigger, "/code-review")).toEqual(
      { text: "run /code-review now", caret: 17 }
    )
  })

  it("adds a trailing space at the end of the draft", () => {
    const trigger = { sigil: "/", query: "go", start: 0, end: 3 }
    expect(applyChatInputPick("/go", trigger, "/goal")).toEqual({
      text: "/goal ",
      caret: 6,
    })
  })

  it("removes the token when the pick is empty, for a command that runs", () => {
    const trigger = { sigil: "/", query: "sub", start: 0, end: 4 }
    expect(applyChatInputPick("/sub", trigger, "")).toEqual({
      text: "",
      caret: 0,
    })
  })
})

describe("filterChatInputCommands", () => {
  const commands = [
    { value: "goal" },
    { value: "code-review" },
    { value: "review-pr" },
    { value: "simplify" },
  ]

  it("keeps everything for an empty query, in order", () => {
    expect(filterChatInputCommands(commands, "")).toEqual(commands)
  })

  it("puts names starting with the query before names containing it", () => {
    expect(
      filterChatInputCommands(commands, "rev").map((command) => command.value)
    ).toEqual(["review-pr", "code-review"])
  })

  it("ignores case and drops what doesn't match", () => {
    expect(
      filterChatInputCommands(commands, "SIM").map((command) => command.value)
    ).toEqual(["simplify"])
  })
})

describe("getChatInputKeyAction recall", () => {
  const arrowUp = { ...enter, key: "ArrowUp" }

  it("takes the last queued message back with ↑ in an empty field", () => {
    expect(
      getChatInputKeyAction(arrowUp, { submitOn: "enter", isEmpty: true })
    ).toBe("recall")
  })

  it("leaves ↑ alone in a draft or with a modifier", () => {
    expect(
      getChatInputKeyAction(arrowUp, { submitOn: "enter", isEmpty: false })
    ).toBe("none")
    expect(
      getChatInputKeyAction(
        { ...arrowUp, shiftKey: true },
        { submitOn: "enter", isEmpty: true }
      )
    ).toBe("none")
  })
})

describe("formatChatInputDuration", () => {
  it("reads seconds, minutes and hours", () => {
    expect(formatChatInputDuration(4_200)).toBe("4s")
    expect(formatChatInputDuration(184_000)).toBe("3m 04s")
    expect(formatChatInputDuration(3_725_000)).toBe("1h 02m")
  })
})

describe("splitChatInputMentions with known names", () => {
  it("tints only the mentions the predicate knows", () => {
    expect(
      splitChatInputMentions(
        "/goal ship /unknown",
        ["/"],
        (mention) => mention === "/goal"
      )
    ).toEqual([{ text: "/goal", sigil: "/" }, { text: " ship /unknown" }])
  })
})
