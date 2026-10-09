import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  resolveClickSound,
  resolveSlotSound,
  resolveStateSound,
  resolveToastSound,
  type ClickTarget,
} from "@/registry/fabricator/shared/components/sound-effects"
import { noteStep } from "@/registry/fabricator/shared/lib/sounds"

function target(overrides: Partial<ClickTarget>): ClickTarget {
  return { tag: "div", ...overrides }
}

function sound(overrides: Partial<ClickTarget>) {
  return resolveClickSound(target(overrides))?.sound ?? null
}

describe("resolveClickSound", () => {
  it("prefers an explicit data-sound", () => {
    expect(sound({ tag: "button", sound: "copy" })).toBe("copy")
    expect(sound({ tag: "button", sound: "none" })).toBe(null)
  })

  it("denies disabled controls", () => {
    expect(sound({ tag: "button", disabled: true })).toBe("deny")
  })

  it("stays quiet on popup triggers", () => {
    expect(sound({ tag: "button", hasPopup: true })).toBe(null)
    expect(sound({ tag: "button", hasPopup: true, expandable: true })).toBe(
      null
    )
  })

  it("gives each on/off control its own pair", () => {
    expect(sound({ role: "switch" })).toBe("switch")
    expect(sound({ slot: "switch", tag: "button" })).toBe("switch")
    expect(sound({ role: "checkbox" })).toBe("checkbox")
    expect(sound({ role: "menuitemcheckbox" })).toBe("checkbox")
    expect(sound({ tag: "input", type: "checkbox" })).toBe("checkbox")
    expect(sound({ tag: "button", slot: "toggle-group-item" })).toBe("toggle")
    expect(sound({ tag: "button", slot: "toggle" })).toBe("toggle")
    expect(sound({ tag: "button", pressed: true })).toBe("toggle")
  })

  it("picks one choice from a set", () => {
    for (const role of ["radio", "option", "menuitemradio"]) {
      expect(sound({ role })).toBe("pick")
    }
    expect(sound({ tag: "input", type: "radio" })).toBe("pick")
    expect(sound({ tag: "button", day: true })).toBe("pick")
  })

  it("rings a note per tab", () => {
    expect(sound({ role: "tab" })).toBe("tab")
  })

  it("expands and collapses disclosures", () => {
    expect(
      sound({ tag: "button", slot: "accordion-trigger", expandable: true })
    ).toBe("disclosure")
    expect(sound({ tag: "summary" })).toBe("disclosure")
  })

  it("keeps the sidebar toggle quiet", () => {
    expect(sound({ tag: "button", slot: "sidebar-trigger" })).toBeNull()
    expect(sound({ tag: "button", slot: "sidebar-rail" })).toBeNull()
  })

  it("turns pages and slides carousels, pitched by direction", () => {
    const next = resolveClickSound(
      target({ tag: "a", slot: "button", paging: true, direction: "next" })
    )
    const previous = resolveClickSound(
      target({ tag: "a", slot: "button", paging: true, direction: "previous" })
    )
    expect(next?.sound).toBe("page")
    expect(previous?.sound).toBe("page")
    expect(next!.pitch!).toBeGreaterThan(previous!.pitch!)
    expect(sound({ tag: "button", direction: "next" })).toBe("page")
    expect(
      sound({ tag: "button", slot: "carousel-next", direction: "next" })
    ).toBe("whisk")
  })

  it("ticks for rows and links", () => {
    expect(sound({ role: "menuitem" })).toBe("tick")
    expect(sound({ role: "treeitem" })).toBe("tick")
    expect(sound({ tag: "a", slot: "sidebar-menu-button" })).toBe("tick")
    expect(sound({ tag: "a", slot: "breadcrumb-link" })).toBe("tick")
    expect(sound({ tag: "a", slot: "item" })).toBe("tick")
    expect(sound({ tag: "a" })).toBe(null)
  })

  it("weighs buttons by variant", () => {
    const button = (variant?: string) =>
      sound({ tag: "button", slot: "button", variant })
    expect(button("default")).toBe("press")
    expect(button("destructive")).toBe("thud")
    expect(button("link")).toBe("tick")
    expect(button("outline")).toBe("tap")
    expect(button("ghost")).toBe("tap")
    expect(button()).toBe("tap")
    expect(sound({ tag: "a", slot: "button", variant: "default" })).toBe(
      "press"
    )
    // Directional buttons drawn as Buttons, like the questionnaire's.
    expect(
      sound({
        tag: "button",
        slot: "questionnaire-next",
        direction: "next",
        variant: "default",
      })
    ).toBe("press")
    expect(
      sound({
        tag: "button",
        slot: "questionnaire-previous",
        direction: "previous",
        variant: "outline",
      })
    ).toBe("tap")
  })

  it("pitches small buttons up and large ones down", () => {
    const pitch = (size: string) =>
      resolveClickSound(target({ tag: "button", slot: "button", size }))?.pitch
    expect(pitch("sm")).toBeGreaterThan(1)
    expect(pitch("lg")).toBeLessThan(1)
    expect(pitch("default")).toBe(undefined)
  })
})

describe("noteStep", () => {
  it("rises through a chord and wraps", () => {
    const steps = [0, 1, 2, 3].map(noteStep)
    expect(steps).toEqual([...steps].sort((a, b) => a - b))
    expect(noteStep(2)).toBe(1)
    expect(noteStep(6)).toBe(noteStep(0))
  })
})

describe("resolveStateSound", () => {
  it("plays a different pair for each kind of control", () => {
    const pairs = (["switch", "checkbox", "toggle", "disclosure"] as const).map(
      (kind) => [resolveStateSound(kind, true), resolveStateSound(kind, false)]
    )
    expect(pairs).toEqual([
      ["toggle-on", "toggle-off"],
      ["check", "uncheck"],
      ["latch", "unlatch"],
      ["expand", "collapse"],
    ])
  })
})

describe("resolveSlotSound", () => {
  it("gives each kind of surface its own sound", () => {
    expect(resolveSlotSound("dropdown-menu-content", "appear")).toBe("pop")
    expect(resolveSlotSound("select-content", "disappear")).toBe("dismiss")
    expect(resolveSlotSound("dialog-content", "appear")).toBe("open")
    expect(resolveSlotSound("search", "appear")).toBe("open")
    expect(resolveSlotSound("dialog-content", "disappear")).toBe("close")
    expect(resolveSlotSound("alert-dialog-content", "appear")).toBe("alert")
    expect(resolveSlotSound("sheet-content", "appear")).toBe("slide-in")
    expect(resolveSlotSound("drawer-content", "disappear")).toBe("slide-out")
    expect(resolveSlotSound("button", "appear")).toBe(null)
  })

  it("chimes toasts by type", () => {
    expect(resolveSlotSound("toast", "appear")).toBe("notify")
    expect(resolveSlotSound("toast", "appear", "success")).toBe("success")
    expect(resolveSlotSound("toast", "disappear", "success")).toBe(null)
    expect(resolveToastSound("error")).toBe("error")
    expect(resolveToastSound("warning")).toBe("warning")
    expect(resolveToastSound("info")).toBe("notify")
    expect(resolveToastSound("loading")).toBe(null)
  })
})

// A fake AudioContext that records what every play schedules.
function installFakeAudio() {
  const log: unknown[] = []
  const clock = { now: 0 }
  const param = (name: string) => ({
    value: 0,
    setValueAtTime: (value: number, time: number) =>
      log.push([name, "set", value, time - clock.now]),
    exponentialRampToValueAtTime: (value: number, time: number) =>
      log.push([name, "ramp", value, time - clock.now]),
    setTargetAtTime: () => {},
  })
  const node = (kind: string) => {
    const created = {
      connect(next: unknown) {
        return next ?? this
      },
      disconnect: () => {},
      start: () => {},
      stop: () => {},
      gain: param(`${kind}.gain`),
      frequency: param(`${kind}.frequency`),
      Q: param(`${kind}.Q`),
      buffer: null,
    }
    let type = ""
    Object.defineProperty(created, "type", {
      get: () => type,
      set: (value: string) => {
        type = value
        log.push([kind, "type", value])
      },
    })
    return created
  }
  class FakeAudioContext {
    sampleRate = 8000
    state = "running"
    destination = node("destination")
    get currentTime() {
      return clock.now
    }
    createOscillator() {
      log.push(["oscillator"])
      return node("oscillator")
    }
    createGain() {
      return node("gain")
    }
    createBiquadFilter() {
      return node("filter")
    }
    createBufferSource() {
      log.push(["noise"])
      return node("noise")
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
  return {
    log,
    /** Moves time on so earlier sounds have rung out. */
    advance: () => {
      clock.now += 10
    },
  }
}

describe("playSound", () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it("is silent until enabled, unless forced", async () => {
    const { log } = installFakeAudio()
    const sounds = await import("@/registry/fabricator/shared/lib/sounds")
    expect(sounds.getSoundsEnabled()).toBe(false)
    sounds.playSound("tap")
    expect(log.length).toBe(0)
    sounds.playSound("tap", { force: true })
    expect(log.length).toBeGreaterThan(0)
  })

  it("does not retrigger the same sound within the throttle window", async () => {
    const { log } = installFakeAudio()
    const sounds = await import("@/registry/fabricator/shared/lib/sounds")
    sounds.setSoundsEnabled(true)
    sounds.playSound("pop")
    const afterFirst = log.length
    sounds.playSound("pop")
    expect(log.length).toBe(afterFirst)
    sounds.playSound("tick")
    expect(log.length).toBeGreaterThan(afterFirst)
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
    expect(sounds.SOUNDS.length).toBeGreaterThanOrEqual(30)
    for (const sound of sounds.SOUNDS) {
      expect(sounds.isSoundName(sound.name)).toBe(true)
      expect(sound.length).toBeGreaterThan(0)
      expect(sound.usedBy).not.toBe("")
    }
  })

  it("never gives two sounds the same synthesis", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5)
    const { log, advance } = installFakeAudio()
    const sounds = await import("@/registry/fabricator/shared/lib/sounds")
    const prints = new Map<string, string>()
    for (const { name } of sounds.SOUNDS) {
      log.length = 0
      advance()
      sounds.playSound(name, { force: true })
      const print = JSON.stringify(log)
      expect(print.length).toBeGreaterThan(2)
      expect(prints.get(print), `${name} sounds like another sound`).toBe(
        undefined
      )
      prints.set(print, name)
    }
  })
})
