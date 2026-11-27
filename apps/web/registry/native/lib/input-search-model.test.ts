import { describe, expect, it } from "vitest"

import * as web from "@/registry/fabricator/shared/lib/input-search-model"
import {
  canClearSearch,
  getSearchKeyAction,
} from "@/registry/native/lib/input-search-model"

const STATES = [
  { value: "", isDisabled: false, isReadOnly: false },
  { value: "button", isDisabled: false, isReadOnly: false },
  { value: "button", isDisabled: true, isReadOnly: false },
  { value: "button", isDisabled: false, isReadOnly: true },
]

describe("input search model", () => {
  it.each(STATES)("matches the website for %o", (state) => {
    expect(canClearSearch(state)).toBe(web.canClearSearch(state))
    for (const key of ["Escape", "Enter", "a"]) {
      expect(getSearchKeyAction(key, state)).toBe(
        web.getSearchKeyAction(key, state)
      )
    }
  })
})
