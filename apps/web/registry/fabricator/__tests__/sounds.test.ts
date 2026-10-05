import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  resolveClickSound,
  resolveSlotSound,
  resolveStateSound,
  type ClickTarget,
} from "@/registry/fabricator/shared/components/sound-effects"

function target(overrides: Partial<ClickTarget>): ClickTarget {
  return { tag: "div", ...overrides }
}

describe("resolveClickSound", () => {
  it("prefers an explicit data-sound", () => {
    expect(resolveClickSound(target({ tag: "button", sound: "copy" }))).toBe(
      "copy"
    )
    expect(resolveClickSound(target({ tag: "button", sound: "none" }))).toBe(
      null
    )
  })

  it("denies disabled controls", () => {
    expect(resolveClickSound(target({ tag: "button", disabled: true }))).toBe(
      "deny"
    )
  })

  it("stays quiet on popup triggers", () => {
    expect(resolveClickSound(target({ tag: "button", hasPopup: true }))).toBe(
      null
    )
  })

  it("defers switches and checkboxes to their new state", () => {
    expect(resolveClickSound(target({ role: "switch" }))).toBe("toggle")
    expect(resolveClickSound(target({ slot: "switch", tag: "button" }))).toBe(
      "toggle"
    )
    expect(resolveClickSound(target({ role: "checkbox" }))).toBe("check")
    expect(resolveClickSound(target({ role: "menuitemcheckbox" }))).toBe(
      "check"
    )
    expect(resolveClickSound(target({ tag: "input", type: "checkbox" }))).toBe(
      "check"
    )
  })

  it("ticks for selection", () => {
    for (const role of ["radio", "tab", "option", "menuitemradio"]) {
      expect(resolveClickSound(target({ role }))).toBe("tick")
    }
    expect(
      resolveClickSound(target({ tag: "button", slot: "toggle-group-item" }))
    ).toBe("tick")
    expect(resolveClickSound(target({ tag: "button", pressed: true }))).toBe(
      "tick"
    )
  })

  it("taps for buttons, menu items and button links", () => {
    expect(resolveClickSound(target({ tag: "button" }))).toBe("tap")
    expect(resolveClickSound(target({ role: "menuitem" }))).toBe("tap")
    expect(resolveClickSound(target({ tag: "a", slot: "button" }))).toBe("tap")
    expect(resolveClickSound(target({ tag: "a" }))).toBe(null)
  })
})

describe("resolveStateSound", () => {
  it("rises when turning on and falls when turning off", () => {
    expect(resolveStateSound("toggle", true)).toBe("toggle-on")
    expect(resolveStateSound("toggle", false)).toBe("toggle-off")
    expect(resolveStateSound("check", true)).toBe("check")
    expect(resolveStateSound("check", false)).toBe("uncheck")
  })
})

describe("resolveSlotSound", () => {
  it("maps popups to sounds", () => {
    expect(resolveSlotSound("dialog-content", "appear")).toBe("open")
    expect(resolveSlotSound("sheet-content", "disappear")).toBe("close")
    expect(resolveSlotSound("dropdown-menu-content", "appear")).toBe("pop")
    expect(resolveSlotSound("dropdown-menu-content", "disappear")).toBe(null)
    expect(resolveSlotSound("toast", "appear")).toBe("notify")
    expect(resolveSlotSound("button", "appear")).toBe(null)
  })
})

// A fake AudioContext that counts the voices played.
function installFakeAudio() {
  const oscillators: number[] = []
  const param = () => ({
    value: 0,
    setValueAtTime: () => {},
    exponentialRampToValueAtTime: () => {},
    setTargetAtTime: () => {},
  })
  const node = () => ({
    connect(next: unknown) {
      return next ?? this
    },
    disconnect: () => {},
    start: () => {},
    stop: () => {},
    gain: param(),
    frequency: param(),
    Q: param(),
    type: "",
    buffer: null,
  })
  class FakeAudioContext {
    currentTime = 0
    sampleRate = 8000
    state = "running"
    destination = node()
    createOscillator() {
      oscillators.push(1)
      return node()
    }
    createGain() {
      return node()
    }
    createBiquadFilter() {
      return node()
    }
    createBufferSource() {
      return node()
    }
    createBuffer(_channels: number, length: number, sampleRate: number) {
      return { sampleRate, getChannelData: () => new Float32Array(length) }
    }
    resume() {
      return Promise.resolve()
    }
  }
  vi.stubGlobal("window", {
    AudioContext: FakeAudioContext,
    setTimeout: () => 0,
  })
  vi.stubGlobal("document", { hidden: false })
  return oscillators
}

describe("playSound", () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("is silent until enabled, unless forced", async () => {
    const oscillators = installFakeAudio()
    const sounds = await import("@/registry/fabricator/shared/lib/sounds")
    expect(sounds.getSoundsEnabled()).toBe(false)
    sounds.playSound("tap")
    expect(oscillators.length).toBe(0)
    sounds.playSound("tap", { force: true })
    expect(oscillators.length).toBeGreaterThan(0)
  })

  it("does not retrigger the same sound within the throttle window", async () => {
    const oscillators = installFakeAudio()
    const sounds = await import("@/registry/fabricator/shared/lib/sounds")
    sounds.setSoundsEnabled(true)
    sounds.playSound("pop")
    const afterFirst = oscillators.length
    sounds.playSound("pop")
    expect(oscillators.length).toBe(afterFirst)
    sounds.playSound("tick")
    expect(oscillators.length).toBeGreaterThan(afterFirst)
  })

  it("notifies subscribers when toggled", async () => {
    const sounds = await import("@/registry/fabricator/shared/lib/sounds")
    const listener = vi.fn()
    const unsubscribe = sounds.subscribeSounds(listener)
    sounds.setSoundsEnabled(true)
    sounds.setSoundsEnabled(true)
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it("lists metadata for every sound", async () => {
    const sounds = await import("@/registry/fabricator/shared/lib/sounds")
    expect(sounds.SOUNDS.length).toBeGreaterThanOrEqual(14)
    for (const sound of sounds.SOUNDS) {
      expect(sounds.isSoundName(sound.name)).toBe(true)
    }
  })
})
