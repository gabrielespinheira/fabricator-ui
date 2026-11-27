import { describe, expect, it } from "vitest"

import { getPasswordScore } from "./password-strength-model"

describe("getPasswordScore", () => {
  it("scores nothing typed as 0", () => {
    expect(getPasswordScore("")).toBe(0)
  })

  it("keeps short passwords weak whatever they mix", () => {
    expect(getPasswordScore("aB3$")).toBe(1)
  })

  it("rises with length and kinds of character", () => {
    expect(getPasswordScore("abcdefgh")).toBe(1)
    expect(getPasswordScore("abcdefgh1")).toBe(2)
    expect(getPasswordScore("Abcdefgh1")).toBe(3)
    expect(getPasswordScore("Abcdefgh1!")).toBe(4)
    expect(getPasswordScore("Abcdefghijk1!")).toBe(4)
  })
})
