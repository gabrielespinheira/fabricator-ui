import { describe, expect, it } from "vitest"

import {
  canClearSearch,
  getSearchKeyAction,
} from "@/registry/fabricator/shared/lib/input-search-model"

const editable = { value: "button", isDisabled: false, isReadOnly: false }

describe("canClearSearch", () => {
  it("offers the clear button once there is text", () => {
    expect(canClearSearch(editable)).toBe(true)
    expect(canClearSearch({ ...editable, value: "" })).toBe(false)
  })

  it("never clears a field the person can't edit", () => {
    expect(canClearSearch({ ...editable, isDisabled: true })).toBe(false)
    expect(canClearSearch({ ...editable, isReadOnly: true })).toBe(false)
  })
})

describe("getSearchKeyAction", () => {
  it("clears the text on Escape", () => {
    expect(getSearchKeyAction("Escape", editable)).toBe("clear")
  })

  it("lets Escape through on an empty field, so a dialog around it closes", () => {
    expect(getSearchKeyAction("Escape", { ...editable, value: "" })).toBe(
      "none"
    )
  })

  it("leaves every other key to the field", () => {
    expect(getSearchKeyAction("Enter", editable)).toBe("none")
    expect(getSearchKeyAction("Backspace", editable)).toBe("none")
  })

  it("keeps a read-only field's text on Escape", () => {
    expect(
      getSearchKeyAction("Escape", { ...editable, isReadOnly: true })
    ).toBe("none")
  })
})
