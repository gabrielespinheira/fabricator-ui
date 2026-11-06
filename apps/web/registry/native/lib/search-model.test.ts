import { describe, expect, it } from "vitest"

import { nextSearchAction as webNextSearchAction } from "@/registry/fabricator/shared/ui/search"
import {
  nextSearchAction,
  toDimension,
  type SearchEvent,
} from "@/registry/native/lib/search-model"

describe("nextSearchAction", () => {
  it("clears text before closing", () => {
    expect(
      nextSearchAction("escape", { value: "button", collapsible: true })
    ).toBe("clear")
    expect(nextSearchAction("escape", { value: "", collapsible: true })).toBe(
      "close"
    )
  })

  it("closes on blur only when empty and collapsible", () => {
    expect(nextSearchAction("blur", { value: "", collapsible: true })).toBe(
      "close"
    )
    expect(nextSearchAction("blur", { value: "a", collapsible: true })).toBe(
      "none"
    )
    expect(nextSearchAction("blur", { value: "", collapsible: false })).toBe(
      "none"
    )
  })

  it("decides exactly what the website's does", () => {
    const events: SearchEvent[] = ["open", "escape", "blur"]
    for (const event of events) {
      for (const value of ["", "text"]) {
        for (const collapsible of [true, false]) {
          expect(nextSearchAction(event, { value, collapsible })).toBe(
            webNextSearchAction(event, { value, collapsible })
          )
        }
      }
    }
  })
})

describe("toDimension", () => {
  it("turns the website's CSS lengths into what React Native takes", () => {
    expect(toDimension(320)).toBe(320)
    expect(toDimension("320px")).toBe(320)
    expect(toDimension("320")).toBe(320)
    expect(toDimension("100%")).toBe("100%")
  })

  it("is undefined when there is no length it can use", () => {
    expect(toDimension(undefined)).toBeUndefined()
    expect(toDimension("20rem")).toBeUndefined()
  })
})
