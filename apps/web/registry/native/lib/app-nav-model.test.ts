import { describe, expect, it } from "vitest"

import {
  EMPTY_NAV_PREFERENCES,
  type NavGroup,
  type NavItem,
} from "@/registry/fabricator/shared/lib/app-shell-model"
import {
  getMoveAnnouncement,
  getNavRowEntries,
  getNavRowState,
  hasIconColumn,
  isNavGroupOpen,
} from "@/registry/native/lib/app-nav-model"

const ICON = "icon"

const groups: NavGroup<string>[] = [
  {
    id: "main",
    reorderable: true,
    items: [
      { id: "home", label: "Home", href: "/", icon: ICON },
      {
        id: "projects",
        label: "Projects",
        href: "/projects",
        children: [{ id: "launch", label: "Launch", href: "/projects/launch" }],
      },
    ],
  },
  {
    id: "work",
    label: "Work",
    reorderable: true,
    items: [{ id: "docs", label: "Docs", href: "/docs" }],
  },
  {
    id: "fixed",
    label: "Fixed",
    items: [{ id: "help", label: "Help", href: "/help" }],
  },
]

describe("hasIconColumn", () => {
  it("keeps the column for an icon or for children", () => {
    expect(hasIconColumn(groups[0]?.items ?? [])).toBe(true)
    expect(
      hasIconColumn([
        { id: "a", label: "A", children: [{ id: "b", label: "B" }] },
      ])
    ).toBe(true)
  })

  it("drops it when no row uses it", () => {
    expect(hasIconColumn(groups[1]?.items ?? [])).toBe(false)
  })
})

describe("isNavGroupOpen", () => {
  it("is open by default", () => {
    expect(isNavGroupOpen({ id: "a", items: [] }, EMPTY_NAV_PREFERENCES)).toBe(
      true
    )
  })

  it("follows the group's default, then the person's choice", () => {
    const group = { id: "a", items: [], defaultOpen: false }
    expect(isNavGroupOpen(group, EMPTY_NAV_PREFERENCES)).toBe(false)
    expect(
      isNavGroupOpen(group, { ...EMPTY_NAV_PREFERENCES, open: { a: true } })
    ).toBe(true)
  })
})

describe("getNavRowState", () => {
  const parent: NavItem<string> = {
    id: "projects",
    label: "Projects",
    children: [{ id: "launch", label: "Launch" }],
  }

  it("is current on its own page", () => {
    expect(getNavRowState(parent, "projects", EMPTY_NAV_PREFERENCES)).toEqual({
      hasChildren: true,
      isCurrent: true,
      holdsActive: false,
      isOpen: false,
    })
  })

  it("opens to show the page inside it", () => {
    expect(getNavRowState(parent, "launch", EMPTY_NAV_PREFERENCES)).toEqual({
      hasChildren: true,
      isCurrent: false,
      holdsActive: true,
      isOpen: true,
    })
  })

  it("lets an explicit choice win", () => {
    expect(
      getNavRowState(parent, "launch", {
        ...EMPTY_NAV_PREFERENCES,
        open: { projects: false },
      }).isOpen
    ).toBe(false)
  })

  it("opens by default when asked", () => {
    expect(
      getNavRowState(
        { ...parent, defaultOpen: true },
        null,
        EMPTY_NAV_PREFERENCES
      ).isOpen
    ).toBe(true)
  })

  it("is never open without children", () => {
    expect(
      getNavRowState({ id: "a", label: "A", defaultOpen: true }, null, {
        ...EMPTY_NAV_PREFERENCES,
        open: { a: true },
      }).isOpen
    ).toBe(false)
  })
})

describe("getNavRowEntries", () => {
  const entries = (
    overrides: Partial<Parameters<typeof getNavRowEntries<string>>[0]>
  ) =>
    getNavRowEntries({
      item: { id: "home", label: "Home" },
      parentId: "main",
      index: 0,
      count: 2,
      reorderable: false,
      canChangeGroup: true,
      customizable: false,
      applied: groups,
      preferences: EMPTY_NAV_PREFERENCES,
      ...overrides,
    })

  it("has nothing for a plain row", () => {
    expect(entries({})).toEqual([])
  })

  it("moves a reorderable row, within its limits", () => {
    const [up, down] = entries({ reorderable: true, index: 0, count: 2 })
    expect(up).toMatchObject({
      id: "move-up",
      disabled: true,
      action: { kind: "move", toParentId: "main", toIndex: -1 },
    })
    expect(down).toMatchObject({
      id: "move-down",
      disabled: false,
      action: { kind: "move", toParentId: "main", toIndex: 1 },
    })
    const [, last] = entries({ reorderable: true, index: 1, count: 2 })
    expect(last).toMatchObject({ id: "move-down", disabled: true })
  })

  it("sends a top-level row to the other reorderable groups", () => {
    const moveTo = entries({ reorderable: true }).find(
      (entry) => entry.id === "move-to"
    )
    expect(moveTo?.children).toEqual([
      expect.objectContaining({
        id: "work",
        label: "Work",
        action: { kind: "move", toParentId: "work", toIndex: 1 },
      }),
    ])
  })

  it("keeps a child with its parent", () => {
    expect(
      entries({ reorderable: true, canChangeGroup: false }).map(
        (entry) => entry.id
      )
    ).toEqual(["move-up", "move-down"])
  })

  it("pins and hides when customizable, after a separator", () => {
    const list = entries({ reorderable: true, customizable: true })
    expect(list.find((entry) => entry.id === "pin")).toMatchObject({
      label: "Pin to top",
      separatorBefore: true,
      action: { kind: "pin", pinned: true },
    })
    expect(list.find((entry) => entry.id === "hide")).toMatchObject({
      action: { kind: "hide" },
    })
  })

  it("offers to unpin a pinned row", () => {
    const [pin] = entries({
      customizable: true,
      preferences: { ...EMPTY_NAV_PREFERENCES, pinned: ["home"] },
    })
    expect(pin).toMatchObject({
      label: "Unpin",
      separatorBefore: false,
      action: { kind: "pin", pinned: false },
    })
  })

  it("adds the item's own actions, parted from the built-in ones", () => {
    const onSelect = () => {}
    const list = entries({
      customizable: true,
      item: {
        id: "home",
        label: "Home",
        actions: [
          { id: "rename", label: "Rename", icon: ICON, onSelect },
          { id: "delete", label: "Delete", destructive: true, onSelect },
        ],
      },
    })
    expect(list.at(-2)).toMatchObject({
      id: "rename",
      icon: ICON,
      separatorBefore: true,
      action: { kind: "select", onSelect },
    })
    expect(list.at(-1)).toMatchObject({ id: "delete", destructive: true })
  })

  it("keeps an action's own separator with no built-in entries", () => {
    const onSelect = () => {}
    const [rename] = entries({
      item: {
        id: "home",
        label: "Home",
        actions: [{ id: "rename", label: "Rename", onSelect }],
      },
    })
    expect(rename?.separatorBefore).toBeFalsy()
  })
})

describe("getMoveAnnouncement", () => {
  it("says where a row landed in its list", () => {
    expect(
      getMoveAnnouncement(groups, {
        id: "home",
        toParentId: "main",
        toIndex: 1,
      })
    ).toBe("Home moved to position 2 of 2.")
  })

  it("counts the row it adds to another list", () => {
    expect(
      getMoveAnnouncement(groups, {
        id: "home",
        toParentId: "work",
        toIndex: 1,
      })
    ).toBe("Home moved to position 2 of 2.")
  })

  it("keeps the position inside the list", () => {
    expect(
      getMoveAnnouncement(groups, {
        id: "home",
        toParentId: "main",
        toIndex: 9,
      })
    ).toBe("Home moved to position 2 of 2.")
  })
})
