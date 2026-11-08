import { describe, expect, it } from "vitest"

import {
  getNextOtpValue,
  getOtpCaretHoldMs,
  getOtpKeyboardType,
  getOtpSlots,
  isOtpComplete,
  REGEXP_ONLY_CHARS,
  REGEXP_ONLY_DIGITS,
  REGEXP_ONLY_DIGITS_AND_CHARS,
} from "@/registry/native/lib/input-otp-model"

describe("getNextOtpValue", () => {
  it("takes what was typed", () => {
    expect(getNextOtpValue("12", "1", { maxLength: 6 })).toBe("12")
  })

  it("cuts a pasted or filled code to the slots", () => {
    expect(getNextOtpValue("1234567", "", { maxLength: 6 })).toBe("123456")
  })

  it("rejects what breaks the pattern, keeping the value", () => {
    const options = { maxLength: 6, pattern: REGEXP_ONLY_DIGITS }
    expect(getNextOtpValue("12a", "12", options)).toBe("12")
  })

  it("lets the value empty out whatever the pattern", () => {
    const options = { maxLength: 6, pattern: REGEXP_ONLY_DIGITS }
    expect(getNextOtpValue("", "1", options)).toBe("")
  })

  it("accepts a RegExp", () => {
    const options = { maxLength: 6, pattern: /^[a-z]+$/ }
    expect(getNextOtpValue("ab", "a", options)).toBe("ab")
    expect(getNextOtpValue("a1", "a", options)).toBe("a")
  })

  it("transforms a change before reading it", () => {
    const options = {
      maxLength: 6,
      pattern: REGEXP_ONLY_DIGITS,
      transform: (text: string) => text.replaceAll("-", ""),
    }
    expect(getNextOtpValue("123-456", "", options)).toBe("123456")
  })
})

describe("getOtpSlots", () => {
  it("lights the next empty slot while focused", () => {
    const slots = getOtpSlots("12", 4, true)
    expect(slots.map((slot) => slot.char)).toEqual(["1", "2", null, null])
    expect(slots.map((slot) => slot.isActive)).toEqual([
      false,
      false,
      true,
      false,
    ])
    expect(slots[2]?.hasFakeCaret).toBe(true)
  })

  it("gives each empty slot its placeholder character, as input-otp does", () => {
    const slots = getOtpSlots("1", 4, false, "0000")
    expect(slots.map((slot) => slot.placeholderChar)).toEqual([
      null,
      "0",
      "0",
      "0",
    ])
  })

  it("has no placeholder characters without a placeholder", () => {
    const slots = getOtpSlots("", 3, false)
    expect(slots.every((slot) => slot.placeholderChar === null)).toBe(true)
  })

  it("lights nothing without focus", () => {
    const slots = getOtpSlots("12", 4, false)
    expect(slots.some((slot) => slot.isActive)).toBe(false)
    expect(slots.some((slot) => slot.hasFakeCaret)).toBe(false)
  })

  it("keeps the last slot lit when full, with no caret", () => {
    const slots = getOtpSlots("1234", 4, true)
    expect(slots[3]?.isActive).toBe(true)
    expect(slots[3]?.hasFakeCaret).toBe(false)
  })
})

describe("isOtpComplete", () => {
  it("fires once, on the change that fills the last slot", () => {
    expect(isOtpComplete("123", "1234", 4)).toBe(true)
    expect(isOtpComplete("1234", "1234", 4)).toBe(false)
    expect(isOtpComplete("12", "123", 4)).toBe(false)
  })
})

describe("getOtpKeyboardType", () => {
  it("shows digits unless the pattern takes letters", () => {
    expect(getOtpKeyboardType(undefined)).toBe("number-pad")
    expect(getOtpKeyboardType(REGEXP_ONLY_DIGITS)).toBe("number-pad")
    expect(getOtpKeyboardType(REGEXP_ONLY_CHARS)).toBe("default")
    expect(getOtpKeyboardType(REGEXP_ONLY_DIGITS_AND_CHARS)).toBe("default")
  })
})

describe("getOtpCaretHoldMs", () => {
  it("keeps the website's 1.25s blink, whatever the fade takes", () => {
    expect(getOtpCaretHoldMs(250)).toBe(375)
    expect(getOtpCaretHoldMs(150)).toBe(475)
  })

  it("never goes below nothing", () => {
    expect(getOtpCaretHoldMs(900)).toBe(0)
  })
})
