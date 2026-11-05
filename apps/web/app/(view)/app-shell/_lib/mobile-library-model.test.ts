import { describe, expect, it } from "vitest"

import {
  BLOCKS_HREF,
  COMPONENTS_HREF,
  getBlockName,
  getDemoName,
} from "../../../../../mobile/src/library/library-model"

describe("the React Native example's library paths", () => {
  it("finds the demo a path opens", () => {
    expect(getDemoName(`${COMPONENTS_HREF}/avatar`)).toBe("avatar")
  })

  it("has no demo on the list or anywhere else", () => {
    expect(getDemoName(COMPONENTS_HREF)).toBeNull()
    expect(getDemoName("/")).toBeNull()
    expect(getDemoName("/components-extra/avatar")).toBeNull()
  })

  it("finds the block a path opens", () => {
    expect(getBlockName(`${BLOCKS_HREF}/login-01`)).toBe("login-01")
    expect(getBlockName(BLOCKS_HREF)).toBeNull()
  })
})
