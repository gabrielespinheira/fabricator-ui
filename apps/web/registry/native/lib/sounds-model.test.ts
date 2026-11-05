import { describe, expect, it } from "vitest"

import {
  createSoundGate,
  getHaptic,
  quantizePitch,
} from "@/registry/native/lib/sounds-model"

describe("getHaptic", () => {
  it("gives actions an impact by weight", () => {
    expect(getHaptic("tap")).toEqual({ kind: "impact", weight: "light" })
    expect(getHaptic("thud")).toEqual({ kind: "impact", weight: "heavy" })
  })

  it("gives selection controls the selection tick", () => {
    expect(getHaptic("check")).toEqual({ kind: "selection" })
    expect(getHaptic("note")).toEqual({ kind: "selection" })
  })

  it("gives toasts their notification", () => {
    expect(getHaptic("error")).toEqual({ kind: "notification", type: "error" })
  })

  it("stays quiet for surfaces that only move", () => {
    expect(getHaptic("open")).toBeNull()
    expect(getHaptic("whisk")).toBeNull()
  })
})

describe("createSoundGate", () => {
  it("lets one sound through per retrigger window", () => {
    const shouldPlay = createSoundGate()
    expect(shouldPlay("tick", 0)).toBe(true)
    expect(shouldPlay("tick", 20)).toBe(false)
    expect(shouldPlay("tick", 40)).toBe(true)
  })

  it("keeps sounds apart by name", () => {
    const shouldPlay = createSoundGate()
    expect(shouldPlay("tick", 0)).toBe(true)
    expect(shouldPlay("tap", 1)).toBe(true)
  })

  it("stays quiet when a choice closes its own popup", () => {
    const shouldPlay = createSoundGate()
    expect(shouldPlay("pick", 0)).toBe(true)
    expect(shouldPlay("dismiss", 50)).toBe(false)
    expect(shouldPlay("dismiss", 400)).toBe(true)
  })

  it("lets a plain button close a surface with the surface's sound", () => {
    const shouldPlay = createSoundGate()
    expect(shouldPlay("tap", 0)).toBe(true)
    expect(shouldPlay("close", 50)).toBe(true)
  })

  it("plays a surface opening right after a press", () => {
    const shouldPlay = createSoundGate()
    expect(shouldPlay("press", 0)).toBe(true)
    expect(shouldPlay("open", 30)).toBe(true)
  })
})

describe("quantizePitch", () => {
  it("snaps a continuous pitch to a step, so a slider shares its files", () => {
    expect(quantizePitch(1.031)).toBe(1.05)
    expect(quantizePitch(0.81)).toBe(0.8)
  })

  it("keeps the chord's tones", () => {
    expect(quantizePitch(1)).toBe(1)
  })
})
