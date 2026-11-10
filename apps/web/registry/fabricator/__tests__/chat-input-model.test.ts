import { describe, expect, it } from "vitest"

import {
  getChatInputSendLabel,
  getChatInputTrayStack,
  isChatInputMicLive,
  isChatInputSendDisabled,
  isChatInputSendLit,
  type ChatInputSendAction,
} from "@/registry/fabricator/shared/lib/chat-input-model"

// The rest of the model is tested through the website's re-exports, in
// chat-input.test.ts; these are the parts both platforms' send slot and
// microphone read.

const ACTIONS: ChatInputSendAction[] = [
  "send",
  "queue",
  "idle",
  "uploading",
  "voice",
  "stop",
  "busy",
]

describe("getChatInputSendLabel", () => {
  it("names what a press does", () => {
    expect(getChatInputSendLabel("send")).toBe("Send message")
    expect(getChatInputSendLabel("queue")).toBe("Queue message")
    expect(getChatInputSendLabel("stop")).toBe("Stop")
    expect(getChatInputSendLabel("uploading")).toBe("Attaching…")
  })

  it("starts voice chat, and ends it while it's on", () => {
    expect(getChatInputSendLabel("voice")).toBe("Start voice chat")
    expect(getChatInputSendLabel("voice", true)).toBe("End voice chat")
    expect(getChatInputSendLabel("send", true)).toBe("Send message")
  })
})

describe("isChatInputSendLit", () => {
  it("draws the primary fill whenever a press does something", () => {
    expect(ACTIONS.filter(isChatInputSendLit)).toEqual([
      "send",
      "queue",
      "voice",
      "stop",
      "busy",
    ])
  })
})

describe("isChatInputSendDisabled", () => {
  it("can't be pressed with nothing to send, an upload or a reply it can't stop", () => {
    expect(ACTIONS.filter(isChatInputSendDisabled)).toEqual([
      "idle",
      "uploading",
      "busy",
    ])
  })
})

describe("isChatInputMicLive", () => {
  it("follows the voice level while it hears or speaks", () => {
    expect(isChatInputMicLive("listening")).toBe(true)
    expect(isChatInputMicLive("hearing")).toBe(true)
    expect(isChatInputMicLive("speaking")).toBe(true)
    expect(isChatInputMicLive("muted")).toBe(false)
    expect(isChatInputMicLive("transcribing")).toBe(false)
  })
})

describe("getChatInputTrayStack", () => {
  it("leaves a single row as it is: nothing to fold", () => {
    expect(getChatInputTrayStack({ rows: [1], isExpanded: false })).toEqual({
      isCollapsible: false,
      isCollapsed: false,
      front: 0,
      hiddenRows: 0,
      edges: 0,
    })
  })

  it("folds every row but the front one behind it, at most two edges", () => {
    expect(
      getChatInputTrayStack({ rows: [1, 1, 3], isExpanded: false })
    ).toEqual({
      isCollapsible: true,
      isCollapsed: true,
      front: 2,
      hiddenRows: 4,
      edges: 2,
    })
    expect(getChatInputTrayStack({ rows: [2], isExpanded: false }).edges).toBe(
      1
    )
  })

  it("takes the frontmost tray with rows as the front", () => {
    expect(
      getChatInputTrayStack({ rows: [1, 2, 0], isExpanded: false }).front
    ).toBe(1)
  })

  it("shows everything once opened", () => {
    expect(
      getChatInputTrayStack({ rows: [1, 1, 3], isExpanded: true })
    ).toEqual({
      isCollapsible: true,
      isCollapsed: false,
      front: 2,
      hiddenRows: 0,
      edges: 0,
    })
  })

  it("has no front without rows", () => {
    expect(getChatInputTrayStack({ rows: [], isExpanded: false })).toEqual({
      isCollapsible: false,
      isCollapsed: false,
      front: -1,
      hiddenRows: 0,
      edges: 0,
    })
  })
})
