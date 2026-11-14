import { describe, expect, it } from "vitest"

import {
  getAvatarGroupItemIndex,
  getAvatarGroupLabelPosition,
  getAvatarParting,
} from "./avatar-group-parting"

describe("getAvatarParting", () => {
  it("leaves every avatar alone with none active", () => {
    expect(getAvatarParting(0, null)).toBeUndefined()
    expect(getAvatarParting(4, null)).toBeUndefined()
  })

  it("parts the group around the active avatar", () => {
    expect(getAvatarParting(0, 2)).toBe("before")
    expect(getAvatarParting(1, 2)).toBe("before")
    expect(getAvatarParting(2, 2)).toBe("active")
    expect(getAvatarParting(3, 2)).toBe("after")
  })
})

describe("getAvatarGroupItemIndex", () => {
  type FakeNode = { parentNode: FakeNode | null }
  function createGroup() {
    const group: FakeNode & { children: FakeNode[] } = {
      parentNode: null,
      children: [],
    }
    group.children = [0, 1, 2].map(() => ({ parentNode: group }))
    return group
  }

  it("finds the item a target sits in", () => {
    const group = createGroup()
    const image = { parentNode: group.children[1] }
    expect(getAvatarGroupItemIndex(group, image)).toBe(1)
    expect(getAvatarGroupItemIndex(group, group.children[2])).toBe(2)
  })

  it("finds nothing for the group itself or a node outside it", () => {
    const group = createGroup()
    expect(getAvatarGroupItemIndex(group, group)).toBeNull()
    expect(getAvatarGroupItemIndex(group, { parentNode: null })).toBeNull()
    expect(getAvatarGroupItemIndex(group, null)).toBeNull()
  })
})

describe("getAvatarGroupLabelPosition", () => {
  const viewport = { width: 1000, height: 800 }
  const label = { width: 80, height: 24 }
  const item = { left: 400, top: 300, width: 32, height: 32 }

  it("centres the label over the avatar, its gap above the lifted avatar", () => {
    expect(
      getAvatarGroupLabelPosition({ item, label, viewport, gap: 4, lift: 3 })
    ).toEqual({ x: 376, y: 269, side: "top" })
  })

  it("goes below the avatar when the top has no room", () => {
    const high = { ...item, top: 10 }
    expect(
      getAvatarGroupLabelPosition({
        item: high,
        label,
        viewport,
        gap: 4,
        lift: 3,
      })
    ).toEqual({ x: 376, y: 46, side: "bottom" })
  })

  it("stays inside the viewport at its edges", () => {
    const left = { ...item, left: 0 }
    const right = { ...item, left: 990 }
    expect(
      getAvatarGroupLabelPosition({
        item: left,
        label,
        viewport,
        gap: 4,
        lift: 3,
      }).x
    ).toBe(8)
    expect(
      getAvatarGroupLabelPosition({
        item: right,
        label,
        viewport,
        gap: 4,
        lift: 3,
      }).x
    ).toBe(912)
  })
})
