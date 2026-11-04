import { describe, expect, it } from "vitest"

import { getHaptic } from "@/registry/native/lib/sounds-model"

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
