import { describe, expect, it } from "vitest"

import { nextSearchAction } from "@/registry/fabricator/shared/ui/search"

describe("nextSearchAction", () => {
  it("opens when the button is pressed", () => {
    expect(nextSearchAction("open", { value: "", collapsible: true })).toBe(
      "open"
    )
  })

  it("clears text on Escape before closing", () => {
    expect(
      nextSearchAction("escape", { value: "button", collapsible: true })
    ).toBe("clear")
    expect(nextSearchAction("escape", { value: "", collapsible: true })).toBe(
      "close"
    )
  })

  it("closes on blur only when the field is empty", () => {
    expect(nextSearchAction("blur", { value: "", collapsible: true })).toBe(
      "close"
    )
    expect(
      nextSearchAction("blur", { value: "button", collapsible: true })
    ).toBe("none")
  })

  it("never closes when it isn't collapsible", () => {
    expect(nextSearchAction("escape", { value: "", collapsible: false })).toBe(
      "none"
    )
    expect(nextSearchAction("blur", { value: "", collapsible: false })).toBe(
      "none"
    )
    // Escape still clears the text.
    expect(nextSearchAction("escape", { value: "x", collapsible: false })).toBe(
      "clear"
    )
  })
})
