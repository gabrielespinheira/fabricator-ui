import { describe, expect, it } from "vitest"

import {
  getChatInputKeyAction,
  isChatInputBusy,
  isChatInputReady,
  nextChatInputStacked,
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
