import { describe, expect, it } from "vitest"

import {
  canSaveAddress,
  getAddressError,
  lookUpAddress,
  suggestAddresses,
  toAddress,
} from "./settings-address-model"

const known = { current: "acme", taken: ["acme-labs", "acme-labs-hq"] }

describe("toAddress", () => {
  it("keeps letters, numbers and dashes", () => {
    expect(toAddress("Acme Inc.")).toBe("acme-inc-")
    expect(toAddress("Ação & Café")).toBe("acao-cafe")
    expect(toAddress("a--b__c")).toBe("a-b-c")
    expect(toAddress("x".repeat(60))).toHaveLength(32)
  })
})

describe("getAddressError", () => {
  it("says how to fix it", () => {
    expect(getAddressError("ac")).toContain("at least 3")
    expect(getAddressError("acme-")).toContain("Start and end")
    expect(getAddressError("acme-hq")).toBeNull()
  })
})

describe("lookUpAddress", () => {
  it("knows its own address", () => {
    expect(lookUpAddress("acme", known)).toEqual({ kind: "current" })
  })

  it("says available, invalid, empty or taken", () => {
    expect(lookUpAddress("acme-hq", known).kind).toBe("available")
    expect(lookUpAddress("a", known).kind).toBe("invalid")
    expect(lookUpAddress("", known).kind).toBe("empty")
    expect(lookUpAddress("acme-labs", known)).toEqual({
      kind: "taken",
      suggestions: ["acme-labs-team", "acme-labs-app"],
    })
  })

  it("saves only an available address", () => {
    expect(canSaveAddress(lookUpAddress("acme-hq", known))).toBe(true)
    expect(canSaveAddress(lookUpAddress("acme", known))).toBe(false)
    expect(canSaveAddress({ kind: "checking" })).toBe(false)
  })
})

describe("suggestAddresses", () => {
  it("never offers a taken or too long address", () => {
    expect(suggestAddresses("acme-labs", known.taken)).not.toContain(
      "acme-labs-hq"
    )
    expect(suggestAddresses("x".repeat(31), [])).toEqual([])
  })
})
