import { describe, expect, it } from "vitest"

import {
  getChatInputSendLabel,
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
