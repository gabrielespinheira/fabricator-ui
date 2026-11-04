import { describe, expect, it } from "vitest"

import {
  activateTab,
  applyNavPreferences,
  closeOtherTabs,
  closeTabs,
  closeTabsToRight,
  EMPTY_NAV_PREFERENCES,
  EMPTY_TAB_STRIP_STATE,
  findNavItem,
  foldBreadcrumbs,
  formatShortcut,
  getActiveNavItem,
  getActiveTab,
  getBreadcrumbsFromPath,
  getDefaultPanelShortcut,
  getMobileTabItems,
  getNavList,
  getNavPath,
  getNeighbourTab,
  getPanelPlacement,
  getPanelTriggerAnchor,
  getPinnedNavItems,
  getResizedSize,
  getShellSize,
  getTabAtPosition,
  getTrafficLightsGeometry,
  isChordShortcut,
  matchesShortcut,
  moveNavItem,
  moveTab,
  openTab,
  parseNavPreferences,
  parseShellLayout,
  parseShortcut,
  parseTabStripState,
  readShellLayoutCookie,
  reopenClosedTab,
  revealPanelView,
  selectPanelView,
  setNavItemHidden,
  setNavItemPinned,
  setNavOpen,
  stepSize,
  togglePinnedTab,
  type NavGroup,
  type NavItem,
  type TabStripState,
} from "@/registry/fabricator/shared/lib/app-shell-model"

const groups: NavGroup[] = [
  {
    id: "main",
    items: [
      { id: "home", label: "Home", href: "/" },
      { id: "inbox", label: "Inbox", href: "/inbox" },
      {
        id: "projects",
        label: "Projects",
        href: "/projects",
        children: [
          { id: "alpha", label: "Alpha", href: "/projects/alpha" },
          { id: "beta", label: "Beta", href: "/projects/beta" },
        ],
      },
    ],
  },
  {
    id: "settings",
    label: "Settings",
    items: [
      { id: "general", label: "General", href: "/settings" },
      {
        id: "billing",
        label: "Billing",
        href: "/billing",
        match: { prefixes: ["/invoices"] },
      },
    ],
  },
]

const ids = (navGroups: NavGroup[]) =>
  navGroups.map((group) => [group.id, group.items.map((item) => item.id)])

describe("getActiveNavItem", () => {
  it("matches the exact path", () => {
    expect(getActiveNavItem(groups, "/inbox")).toBe("inbox")
  })

  it("matches a nested path by segment prefix, longest first", () => {
    expect(getActiveNavItem(groups, "/projects/alpha/tasks")).toBe("alpha")
    expect(getActiveNavItem(groups, "/projects")).toBe("projects")
  })

  it("never treats a shared string prefix as a segment match", () => {
    expect(getActiveNavItem(groups, "/inboxes")).toBeNull()
  })

  it("matches the root only exactly", () => {
    expect(getActiveNavItem(groups, "/")).toBe("home")
    expect(getActiveNavItem(groups, "/unknown")).toBeNull()
  })

  it("uses extra prefixes", () => {
    expect(getActiveNavItem(groups, "/invoices/42")).toBe("billing")
  })

  it("ignores query, hash and a trailing slash", () => {
    expect(getActiveNavItem(groups, "/inbox/?filter=open#top")).toBe("inbox")
  })

  it("honours exact matching", () => {
    const exact: NavGroup[] = [
      {
        id: "g",
        items: [
          { id: "docs", label: "Docs", href: "/docs", match: { exact: true } },
        ],
      },
    ]
    expect(getActiveNavItem(exact, "/docs/intro")).toBeNull()
    expect(getActiveNavItem(exact, "/docs")).toBe("docs")
  })
})

describe("nav preferences", () => {
  it("keeps the configured order without preferences", () => {
    expect(ids(applyNavPreferences(groups, EMPTY_NAV_PREFERENCES))).toEqual(
      ids(groups)
    )
  })

  it("reorders within a group and appends items it doesn't know", () => {
    const applied = applyNavPreferences(groups, {
      ...EMPTY_NAV_PREFERENCES,
      order: { main: ["projects", "home"] },
    })
    expect(applied[0]?.items.map((item) => item.id)).toEqual([
      "projects",
      "home",
      "inbox",
    ])
  })

  it("moves an item to another group", () => {
    const preferences = moveNavItem(EMPTY_NAV_PREFERENCES, groups, {
      id: "inbox",
      toParentId: "settings",
      toIndex: 1,
    })
    expect(ids(applyNavPreferences(groups, preferences))).toEqual([
      ["main", ["home", "projects"]],
      ["settings", ["general", "inbox", "billing"]],
    ])
  })

  it("clamps the target index", () => {
    const preferences = moveNavItem(EMPTY_NAV_PREFERENCES, groups, {
      id: "home",
      toParentId: "main",
      toIndex: 99,
    })
    expect(applyNavPreferences(groups, preferences)[0]?.items.at(-1)?.id).toBe(
      "home"
    )
  })

  it("drops unknown ids from saved orders", () => {
    const applied = applyNavPreferences(groups, {
      ...EMPTY_NAV_PREFERENCES,
      order: { main: ["gone", "inbox"] },
    })
    expect(applied[0]?.items.map((item) => item.id)).toEqual([
      "inbox",
      "home",
      "projects",
    ])
  })

  it("hides items, children included", () => {
    const preferences = setNavItemHidden(
      setNavItemHidden(EMPTY_NAV_PREFERENCES, "inbox", true),
      "beta",
      true
    )
    const applied = applyNavPreferences(groups, preferences)
    expect(applied[0]?.items.map((item) => item.id)).toEqual([
      "home",
      "projects",
    ])
    expect(applied[0]?.items[1]?.children?.map((item) => item.id)).toEqual([
      "alpha",
    ])
    expect(
      setNavItemHidden(preferences, "inbox", false).hidden.includes("inbox")
    ).toBe(false)
  })

  it("lists pinned items in pin order, children included", () => {
    const preferences = setNavItemPinned(
      setNavItemPinned(EMPTY_NAV_PREFERENCES, "beta", true),
      "inbox",
      true
    )
    expect(
      getPinnedNavItems(groups, preferences).map((item) => item.id)
    ).toEqual(["beta", "inbox"])
    expect(setNavItemPinned(preferences, "beta", false).pinned).toEqual([
      "inbox",
    ])
  })

  it("records open state", () => {
    expect(setNavOpen(EMPTY_NAV_PREFERENCES, "settings", false).open).toEqual({
      settings: false,
    })
  })

  it("restores leniently", () => {
    expect(parseNavPreferences(null)).toEqual(EMPTY_NAV_PREFERENCES)
    expect(
      parseNavPreferences({
        order: { main: ["a", 3], other: "x" },
        hidden: ["b", null],
        pinned: "c",
        open: { g: true, h: "yes" },
      })
    ).toEqual({
      order: { main: ["a"] },
      hidden: ["b"],
      pinned: [],
      open: { g: true },
    })
  })
})

const tabs = (state: TabStripState) => ({
  tabs: state.tabs,
  pinned: state.pinned,
  active: getActiveTab(state),
  preview: state.preview,
})

const withTabs = (...list: string[]) =>
  list.reduce((state, id) => openTab(state, id), EMPTY_TAB_STRIP_STATE)

describe("tab strip", () => {
  it("opens tabs at the end and activates them", () => {
    expect(tabs(withTabs("a", "b"))).toEqual({
      tabs: ["a", "b"],
      pinned: [],
      active: "b",
      preview: null,
    })
  })

  it("activates an open tab instead of opening it twice", () => {
    expect(tabs(openTab(withTabs("a", "b"), "a")).tabs).toEqual(["a", "b"])
    expect(getActiveTab(openTab(withTabs("a", "b"), "a"))).toBe("a")
  })

  it("opens after a given tab, and in the background", () => {
    const state = openTab(withTabs("a", "b"), "c", {
      after: "a",
      background: true,
    })
    expect(tabs(state)).toMatchObject({ tabs: ["a", "c", "b"], active: "b" })
  })

  it("replaces the preview tab in place", () => {
    let state = openTab(withTabs("a", "b"), "p1", { preview: true, after: "a" })
    state = openTab(state, "p2", { preview: true })
    expect(tabs(state)).toEqual({
      tabs: ["a", "p2", "b"],
      pinned: [],
      active: "p2",
      preview: "p2",
    })
  })

  it("keeps a preview tab once it is opened for real", () => {
    let state = openTab(withTabs("a"), "p", { preview: true })
    state = openTab(state, "p")
    expect(state.preview).toBeNull()
  })

  it("activates the most recent tab when the active one closes", () => {
    let state = withTabs("a", "b", "c")
    state = activateTab(state, "a")
    state = activateTab(state, "c")
    expect(getActiveTab(closeTabs(state, ["c"]))).toBe("a")
  })

  it("falls back to the neighbour when no recent tab is left", () => {
    const state: TabStripState = {
      ...EMPTY_TAB_STRIP_STATE,
      tabs: ["a", "b", "c"],
      recent: ["b"],
    }
    expect(getActiveTab(closeTabs(state, ["b"]))).toBe("c")
  })

  it("closes others and to the right, sparing pinned tabs", () => {
    let state = withTabs("a", "b", "c", "d")
    state = togglePinnedTab(state, "c")
    expect(closeOtherTabs(state, "b").tabs).toEqual(["c", "b"])
    expect(closeTabsToRight(state, "a").tabs).toEqual(["c", "a"])
  })

  it("reopens closed tabs, newest first", () => {
    let state = closeTabs(withTabs("a", "b", "c"), ["b"])
    state = closeTabs(state, ["c"])
    state = reopenClosedTab(state)
    expect(tabs(state)).toMatchObject({ tabs: ["a", "c"], active: "c" })
    expect(reopenClosedTab(state).tabs).toEqual(["a", "c", "b"])
  })

  it("caps the reopen stack at 20", () => {
    const many = Array.from({ length: 30 }, (_, index) => `t${index}`)
    const state = closeTabs(withTabs(...many), many)
    expect(state.closed).toHaveLength(20)
  })

  it("pins to the end of the pinned run and unpins to the start of the rest", () => {
    let state = withTabs("a", "b", "c")
    state = togglePinnedTab(state, "b")
    state = togglePinnedTab(state, "c")
    expect(tabs(state)).toMatchObject({
      tabs: ["b", "c", "a"],
      pinned: ["b", "c"],
    })
    state = togglePinnedTab(state, "b")
    expect(tabs(state)).toMatchObject({ tabs: ["c", "b", "a"], pinned: ["c"] })
  })

  it("moves tabs, pinning or unpinning across the boundary", () => {
    let state = togglePinnedTab(withTabs("a", "b", "c", "d"), "a")
    expect(moveTab(state, "d", 2).tabs).toEqual(["a", "b", "d", "c"])
    state = moveTab(state, "c", 0)
    expect(tabs(state)).toMatchObject({
      tabs: ["c", "a", "b", "d"],
      pinned: ["c", "a"],
    })
    // The slot right after the pinned run keeps either kind as it is…
    expect(moveTab(state, "a", 1).pinned).toEqual(["c", "a"])
    expect(tabs(moveTab(state, "d", 2))).toMatchObject({
      tabs: ["c", "a", "d", "b"],
      pinned: ["c", "a"],
    })
    // …and past it, a pinned tab is unpinned.
    expect(tabs(moveTab(state, "a", 3))).toMatchObject({
      tabs: ["c", "b", "d", "a"],
      pinned: ["c"],
    })
  })

  it("steps to neighbours with wrapping, and picks by position", () => {
    const state = activateTab(withTabs("a", "b", "c"), "c")
    expect(getNeighbourTab(state, 1)).toBe("a")
    expect(getNeighbourTab(state, -1)).toBe("b")
    expect(getTabAtPosition(state, 2)).toBe("b")
    expect(getTabAtPosition(state, 9)).toBe("c")
    expect(getTabAtPosition(state, 7)).toBeNull()
  })

  it("restores leniently", () => {
    expect(parseTabStripState("nope")).toEqual(EMPTY_TAB_STRIP_STATE)
    expect(
      parseTabStripState({
        tabs: ["a", "b", 1, "a"],
        pinned: ["b", "x"],
        recent: ["b", "x"],
        preview: "x",
        closed: ["z"],
      })
    ).toEqual({
      tabs: ["b", "a"],
      pinned: ["b"],
      recent: ["b"],
      preview: null,
      closed: ["z"],
    })
  })
})

describe("layout", () => {
  it("sizes the shell by its own width", () => {
    expect(getShellSize(600)).toBe("phone")
    expect(getShellSize(768)).toBe("tablet")
    expect(getShellSize(1024)).toBe("desktop")
  })

  it("places a panel inline while the main column keeps its minimum", () => {
    const input = {
      shellWidth: 1280,
      occupiedWidth: 256,
      panelWidth: 320,
      mobile: "drawer" as const,
    }
    expect(getPanelPlacement(input)).toBe("inline")
    expect(getPanelPlacement({ ...input, shellWidth: 1000 })).toBe("overlay")
    expect(getPanelPlacement({ ...input, minMainWidth: 800 })).toBe("overlay")
  })

  it("uses the mobile role on phones", () => {
    const input = { shellWidth: 390, occupiedWidth: 0, panelWidth: 320 }
    expect(getPanelPlacement({ ...input, mobile: "drawer" })).toBe("drawer")
    expect(getPanelPlacement({ ...input, mobile: "swap" })).toBe("swap")
    expect(getPanelPlacement({ ...input, mobile: "none" })).toBeNull()
  })
})

describe("panels", () => {
  const closed = { open: false, view: "files", width: 320 }

  it("toggles off when the showing view is selected again", () => {
    const open = selectPanelView(closed, "files")
    expect(open).toEqual({ open: true, view: "files", width: 320 })
    expect(selectPanelView(open, "files").open).toBe(false)
    expect(selectPanelView(open, "search")).toEqual({
      open: true,
      view: "search",
      width: 320,
    })
  })

  it("reveals without toggling", () => {
    const open = revealPanelView(closed, "files")
    expect(revealPanelView(open, "files").open).toBe(true)
  })

  it("reads the layout cookie a server received", () => {
    const value = encodeURIComponent(
      JSON.stringify({
        panels: { inspector: { open: true, view: null, width: 360 } },
      })
    )
    expect(readShellLayoutCookie(value)).toEqual({
      panels: { inspector: { open: true, view: null, width: 360 } },
    })
    expect(readShellLayoutCookie(undefined)).toEqual({ panels: {} })
    expect(readShellLayoutCookie("%E0%A4%A")).toEqual({ panels: {} })
    expect(readShellLayoutCookie("not json")).toEqual({ panels: {} })
  })

  it("restores the shell layout leniently", () => {
    expect(parseShellLayout(undefined)).toEqual({ panels: {} })
    expect(
      parseShellLayout({
        sidebarWidth: "18rem",
        panels: {
          inspector: { open: true, view: "details", width: 400 },
          broken: { open: "yes" },
        },
      })
    ).toEqual({
      sidebarWidth: "18rem",
      panels: { inspector: { open: true, view: "details", width: 400 } },
    })
  })
})

describe("shortcuts", () => {
  const event = (
    code: string,
    modifiers: Partial<
      Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>
    > = {},
    key = ""
  ) => ({
    code,
    key,
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    ...modifiers,
  })

  it("parses keys into codes and modifiers", () => {
    expect(parseShortcut("mod+shift+t")).toEqual({
      code: "KeyT",
      mod: true,
      ctrl: false,
      alt: false,
      shift: true,
      meta: false,
    })
    expect(parseShortcut("alt+mod+]").code).toBe("BracketRight")
    expect(parseShortcut("ctrl+tab").code).toBe("Tab")
    expect(parseShortcut("F6").code).toBe("F6")
    expect(parseShortcut("alt+1").code).toBe("Digit1")
    expect(parseShortcut("mod+\\").code).toBe("Backslash")
  })

  it("finds a symbol by what the key types, wherever the layout puts it", () => {
    const backslash = parseShortcut("mod+\\")
    const meta = { metaKey: true }
    expect(
      matchesShortcut(event("Backslash", meta, "\\"), backslash, "apple")
    ).toBe(true)
    // Portuguese and Brazilian keyboards: \\ sits on another key…
    expect(
      matchesShortcut(event("IntlBackslash", meta, "\\"), backslash, "apple")
    ).toBe(true)
    // …and the key at the US position types something else.
    expect(
      matchesShortcut(event("Backslash", meta, "]"), backslash, "apple")
    ).toBe(false)
  })

  it("keeps a symbol's position when Shift or Option changes what it types", () => {
    expect(
      matchesShortcut(
        event("BracketRight", { metaKey: true, shiftKey: true }, "}"),
        parseShortcut("mod+shift+]"),
        "apple"
      )
    ).toBe(true)
    expect(
      matchesShortcut(
        event("BracketRight", { metaKey: true, altKey: true }, "‘"),
        parseShortcut("alt+mod+]"),
        "apple"
      )
    ).toBe(true)
  })

  it("keeps letters on their physical key", () => {
    expect(
      matchesShortcut(
        event("KeyB", { metaKey: true }, "x"),
        parseShortcut("mod+b"),
        "apple"
      )
    ).toBe(true)
  })

  it("labels the panel's shortcut", () => {
    expect(formatShortcut(parseShortcut("mod+\\"), "apple")).toBe("⌘\\")
    expect(formatShortcut(parseShortcut("mod+\\"), "other")).toBe("Ctrl+\\")
  })

  it("tells chords, which type nothing, from keys that do", () => {
    expect(isChordShortcut("mod+\\")).toBe(true)
    expect(isChordShortcut("alt+1")).toBe(true)
    expect(isChordShortcut("ctrl+tab")).toBe(true)
    expect(isChordShortcut("[")).toBe(false)
    expect(isChordShortcut("shift+x")).toBe(false)
  })

  it("reads mod as ⌘ on Apple platforms and Ctrl elsewhere", () => {
    const shortcut = parseShortcut("mod+b")
    expect(
      matchesShortcut(event("KeyB", { metaKey: true }), shortcut, "apple")
    ).toBe(true)
    expect(
      matchesShortcut(event("KeyB", { ctrlKey: true }), shortcut, "apple")
    ).toBe(false)
    expect(
      matchesShortcut(event("KeyB", { ctrlKey: true }), shortcut, "other")
    ).toBe(true)
  })

  it("requires the exact modifiers", () => {
    const shortcut = parseShortcut("mod+b")
    expect(
      matchesShortcut(
        event("KeyB", { metaKey: true, shiftKey: true }),
        shortcut,
        "apple"
      )
    ).toBe(false)
  })

  it("matches by code, whatever the layout types", () => {
    expect(
      matchesShortcut(
        event("Digit1", { altKey: true }),
        parseShortcut("alt+1"),
        "apple"
      )
    ).toBe(true)
  })

  it("formats for each platform", () => {
    expect(formatShortcut(parseShortcut("mod+shift+t"), "apple")).toBe("⇧⌘T")
    expect(formatShortcut(parseShortcut("mod+shift+t"), "other")).toBe(
      "Ctrl+Shift+T"
    )
    expect(formatShortcut(parseShortcut("alt+mod+]"), "apple")).toBe("⌥⌘]")
    expect(formatShortcut(parseShortcut("ctrl+tab"), "apple")).toBe("⌃Tab")
  })
})

describe("resize", () => {
  it("clamps between the limits", () => {
    expect(
      getResizedSize({ startSize: 320, delta: 500, min: 240, max: 640 })
    ).toEqual({
      size: 640,
      isCollapsed: false,
    })
    expect(
      getResizedSize({ startSize: 320, delta: -100, min: 240, max: 640 })
    ).toEqual({
      size: 240,
      isCollapsed: false,
    })
  })

  it("collapses past the minimum by the slop", () => {
    expect(
      getResizedSize({
        startSize: 320,
        delta: -140,
        min: 240,
        max: 640,
        collapseSlop: 56,
      }).isCollapsed
    ).toBe(true)
  })

  it("steps within the limits", () => {
    expect(stepSize(320, 16, 240, 640)).toBe(336)
    expect(stepSize(250, -16, 240, 640)).toBe(240)
  })
})

describe("breadcrumbs", () => {
  it("derives crumbs from a path", () => {
    expect(
      getBreadcrumbsFromPath("/acme/projects/q4-launch", {
        skip: 1,
        rootLabel: "Home",
        labels: { "q4-launch": "Q4 launch" },
      })
    ).toEqual([
      { label: "Home", href: "/acme" },
      { label: "Projects", href: "/acme/projects" },
      { label: "Q4 launch", href: "/acme/projects/q4-launch" },
    ])
  })

  it("folds the middle past the maximum", () => {
    const items = ["a", "b", "c", "d", "e"].map((label) => ({ label }))
    const folded = foldBreadcrumbs(items, 4)
    expect(folded.leading.map((item) => item.label)).toEqual(["a"])
    expect(folded.folded.map((item) => item.label)).toEqual(["b", "c"])
    expect(folded.trailing.map((item) => item.label)).toEqual(["d", "e"])
    expect(foldBreadcrumbs(items.slice(0, 4), 4).folded).toEqual([])
  })
})

describe("traffic lights", () => {
  it("clears the lights and centres the top band on them", () => {
    expect(getTrafficLightsGeometry({ x: 16, y: 23 })).toEqual({
      insetStart: 88,
      bandHeight: 60,
    })
    expect(getTrafficLightsGeometry({ x: 20, y: 12 })).toEqual({
      insetStart: 92,
      bandHeight: 38,
    })
  })
})

describe("nested navigation", () => {
  const tree: NavGroup[] = [
    {
      id: "work",
      reorderable: true,
      items: [
        { id: "home", label: "Home", href: "/" },
        {
          id: "projects",
          label: "Projects",
          href: "/projects",
          children: [
            {
              id: "alpha",
              label: "Alpha",
              href: "/projects/alpha",
              children: [
                { id: "specs", label: "Specs", href: "/projects/alpha/specs" },
                { id: "tasks", label: "Tasks", href: "/projects/alpha/tasks" },
                { id: "notes", label: "Notes", href: "/projects/alpha/notes" },
              ],
            },
            {
              id: "beta",
              label: "Beta",
              href: "/projects/beta",
              children: [
                {
                  id: "roadmap",
                  label: "Roadmap",
                  href: "/projects/beta/roadmap",
                },
              ],
            },
          ],
        },
      ],
    },
  ]

  const childrenOf = (navGroups: NavGroup[], id: string) => {
    const visit = (items: NavItem[]): string[] | null => {
      for (const item of items) {
        if (item.id === id)
          return (item.children ?? []).map((child) => child.id)
        const found = visit(item.children ?? [])
        if (found) return found
      }
      return null
    }
    return visit(navGroups.flatMap((group) => group.items))
  }

  it("matches an item at any depth", () => {
    expect(getActiveNavItem(tree, "/projects/alpha/tasks/42")).toBe("tasks")
  })

  it("applies a saved order to children and appends the rest", () => {
    const applied = applyNavPreferences(tree, {
      ...EMPTY_NAV_PREFERENCES,
      order: { alpha: ["notes", "gone", "specs"] },
    })
    expect(childrenOf(applied, "alpha")).toEqual(["notes", "specs", "tasks"])
  })

  it("moves an item within its parent", () => {
    const preferences = moveNavItem(EMPTY_NAV_PREFERENCES, tree, {
      id: "notes",
      toParentId: "alpha",
      toIndex: 0,
    })
    expect(childrenOf(applyNavPreferences(tree, preferences), "alpha")).toEqual(
      ["notes", "specs", "tasks"]
    )
  })

  it("finds an item at any depth", () => {
    expect(findNavItem(tree, "roadmap")?.label).toBe("Roadmap")
    expect(findNavItem(tree, "missing")).toBeNull()
  })

  it("lists an item's ancestors, outermost first", () => {
    expect(getNavPath(tree, "tasks").map((item) => item.id)).toEqual([
      "projects",
      "alpha",
      "tasks",
    ])
    expect(getNavPath(tree, "home").map((item) => item.id)).toEqual(["home"])
    expect(getNavPath(tree, "missing")).toEqual([])
  })

  it("finds the list a group or an item holds", () => {
    expect(getNavList(tree, "work")?.map((item) => item.id)).toEqual([
      "home",
      "projects",
    ])
    expect(getNavList(tree, "beta")?.map((item) => item.id)).toEqual([
      "roadmap",
    ])
    expect(getNavList(tree, "home")).toEqual([])
    expect(getNavList(tree, "missing")).toBeNull()
  })

  it("keeps a nested item under its own parent", () => {
    expect(
      moveNavItem(EMPTY_NAV_PREFERENCES, tree, {
        id: "notes",
        toParentId: "beta",
        toIndex: 0,
      })
    ).toBe(EMPTY_NAV_PREFERENCES)
    expect(
      moveNavItem(EMPTY_NAV_PREFERENCES, tree, {
        id: "projects",
        toParentId: "alpha",
        toIndex: 0,
      })
    ).toBe(EMPTY_NAV_PREFERENCES)
  })
})

describe("getMobileTabItems", () => {
  it("lists the items marked as phone tabs, at any depth, in order", () => {
    const navGroups: NavGroup[] = [
      {
        id: "main",
        items: [
          { id: "home", label: "Home", href: "/", mobile: "tab" },
          {
            id: "projects",
            label: "Projects",
            children: [
              { id: "inbox", label: "Inbox", href: "/inbox", mobile: "tab" },
            ],
          },
        ],
      },
      {
        id: "more",
        items: [
          { id: "help", label: "Help", href: "/help", mobile: "menu" },
          {
            id: "settings",
            label: "Settings",
            href: "/settings",
            mobile: "tab",
          },
        ],
      },
    ]
    expect(getMobileTabItems(navGroups).map((item) => item.id)).toEqual([
      "home",
      "inbox",
      "settings",
    ])
  })
})

describe("getDefaultPanelShortcut", () => {
  it("gives a right panel ⌘\\, and a left panel none", () => {
    expect(getDefaultPanelShortcut("right")).toBe("mod+\\")
    expect(getDefaultPanelShortcut("left")).toBeNull()
  })
})

describe("getPanelTriggerAnchor", () => {
  const docked = {
    hasView: false,
    side: "right",
    isFloating: false,
    open: true,
    width: 320,
  } as const

  it("offsets a docked panel's toggle by the width the main column gives up", () => {
    expect(getPanelTriggerAnchor(docked)).toEqual({
      isPinned: true,
      shift: 320,
    })
  })

  it("rests in the header while the panel is closed", () => {
    expect(getPanelTriggerAnchor({ ...docked, open: false })).toEqual({
      isPinned: true,
      shift: 0,
    })
  })

  it.each([
    ["a floating panel", { isFloating: true }],
    ["a left panel", { side: "left" }],
    ["a trigger that selects one view", { hasView: true }],
  ] as const)("doesn't pin %s", (_label, change) => {
    expect(getPanelTriggerAnchor({ ...docked, ...change })).toEqual({
      isPinned: false,
      shift: 0,
    })
  })
})
