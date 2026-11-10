import { describe, expect, it } from "vitest"

import {
  getChatInputGlowRoles,
  getChatInputKeyboardOffset,
  getChatInputMentionTone,
  getChatInputReturnKey,
  withChatInputAlpha,
} from "@/registry/native/lib/chat-input-native-model"

describe("getChatInputReturnKey", () => {
  it("sends from the return key when Enter sends", () => {
    expect(getChatInputReturnKey("enter")).toEqual({
      returnKeyType: "send",
      submitBehavior: "submit",
    })
  })

  it("adds a line from the return key when only Cmd+Enter sends", () => {
    expect(getChatInputReturnKey("mod-enter")).toEqual({
      returnKeyType: "default",
      submitBehavior: "newline",
    })
  })
})

describe("getChatInputMentionTone", () => {
  it("tints files, skills, artifacts and cards by their sigil", () => {
    expect(getChatInputMentionTone("@")).toBe("file")
    expect(getChatInputMentionTone("/")).toBe("skill")
    expect(getChatInputMentionTone("$")).toBe("artifact")
    expect(getChatInputMentionTone("#")).toBe("card")
  })

  it("gives any other sigil the primary role", () => {
    expect(getChatInputMentionTone("!")).toBe("other")
    expect(getChatInputMentionTone(undefined)).toBe("other")
  })
})

describe("withChatInputAlpha", () => {
  it("adds an alpha channel to a six-digit hex colour", () => {
    expect(withChatInputAlpha("#7c3aed", 0.15)).toBe("#7c3aed26")
    expect(withChatInputAlpha("#7C3AED", 1)).toBe("#7C3AEDff")
    expect(withChatInputAlpha("#000000", 0)).toBe("#00000000")
  })

  it("leaves what it can't read alone", () => {
    expect(withChatInputAlpha("rgb(1, 2, 3)", 0.5)).toBeUndefined()
    expect(withChatInputAlpha(undefined, 0.5)).toBeUndefined()
  })
})

describe("getChatInputGlowRoles", () => {
  it("draws three lobes, the centre first, from the colour roles", () => {
    expect(getChatInputGlowRoles("colorful")).toEqual([
      "primary",
      "info",
      "destructive",
    ])
    expect(getChatInputGlowRoles("mono")).toEqual([
      "foreground",
      "foreground",
      "foreground",
    ])
  })

  it("has a set for every palette voice-glow names", () => {
    for (const variant of [
      "colorful",
      "mono",
      "ocean",
      "sunset",
      "forest",
      "candy",
      "ice",
      "gold",
    ] as const) {
      expect(getChatInputGlowRoles(variant)).toHaveLength(3)
    }
  })
})

describe("getChatInputKeyboardOffset", () => {
  it("lifts the composer to a gap above the keyboard from where it sits", () => {
    // 34pt above the window's bottom (the home indicator), an 8pt gap: the
    // keyboard's own height already covers the 34, so it moves 26 less.
    expect(getChatInputKeyboardOffset({ distanceToBottom: 34, gap: 8 })).toBe(
      26
    )
  })

  it("never pushes the composer into the keyboard", () => {
    expect(getChatInputKeyboardOffset({ distanceToBottom: 0, gap: 8 })).toBe(-8)
    expect(getChatInputKeyboardOffset({ distanceToBottom: -12, gap: 8 })).toBe(
      -8
    )
  })
})
