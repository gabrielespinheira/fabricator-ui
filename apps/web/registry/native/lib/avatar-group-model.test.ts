import { describe, expect, test } from "vitest"

import { getAvatarPart } from "./avatar-group-model"

describe("getAvatarPart", () => {
  test("leaves every avatar in place with none active", () => {
    expect(getAvatarPart(0, null)).toEqual({ shift: 0, isLifted: false })
    expect(getAvatarPart(3, null)).toEqual({ shift: 0, isLifted: false })
  })

  test("lifts the active avatar where it stands", () => {
    expect(getAvatarPart(2, 2)).toEqual({ shift: 0, isLifted: true })
  })

  test("parts the others away from the active avatar", () => {
    expect(getAvatarPart(0, 2)).toEqual({ shift: -1, isLifted: false })
    expect(getAvatarPart(1, 2)).toEqual({ shift: -1, isLifted: false })
    expect(getAvatarPart(3, 2)).toEqual({ shift: 1, isLifted: false })
    expect(getAvatarPart(6, 2)).toEqual({ shift: 1, isLifted: false })
  })
})
