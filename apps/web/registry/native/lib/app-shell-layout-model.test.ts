import { describe, expect, it } from "vitest"

import { revealPanelView } from "@/registry/fabricator/shared/lib/app-shell-model"
import {
  applyPanelUpdate,
  getContentBottomInset,
  getContentColumn,
  getFabBottom,
  getFabClearance,
  getOtherPanelsWidth,
  getPanelFrame,
  getPanelHeaderEnd,
  getPinnedTriggerPosition,
  getStatusBarHeight,
  isTitleScrolledAway,
  shouldShowHeaderTrigger,
} from "@/registry/native/lib/app-shell-layout-model"

const DEFAULTS = { open: true, view: "details", width: 320 }

describe("applyPanelUpdate", () => {
  it("saves a docked panel's change", () => {
    const next = applyPanelUpdate({
      id: "details",
      update: (panel) => ({ ...panel, open: false }),
      layout: { panels: {} },
      floatingOpen: {},
      isFloating: false,
      defaults: DEFAULTS,
    })
    expect(next.layout?.panels.details).toEqual({
      open: false,
      view: "details",
      width: 320,
    })
    expect(next.floatingOpen).toBeUndefined()
  })

  it("keeps a floating panel's open state to itself", () => {
    const next = applyPanelUpdate({
      id: "details",
      update: (panel) => ({ ...panel, open: !panel.open }),
      layout: { panels: {} },
      floatingOpen: {},
      isFloating: true,
      defaults: DEFAULTS,
    })
    expect(next.floatingOpen).toEqual({ details: true })
    expect(next.layout).toBeUndefined()
  })

  it("starts a floating panel closed, whatever the docked one prefers", () => {
    const next = applyPanelUpdate({
      id: "details",
      update: (panel) => ({ ...panel }),
      layout: {
        panels: { details: { open: true, view: "details", width: 320 } },
      },
      floatingOpen: {},
      isFloating: true,
      defaults: DEFAULTS,
    })
    expect(next.floatingOpen).toEqual({ details: false })
  })

  it("still saves the view a floating panel shows", () => {
    const next = applyPanelUpdate({
      id: "details",
      update: (panel) => revealPanelView(panel, "activity"),
      layout: { panels: {} },
      floatingOpen: {},
      isFloating: true,
      defaults: DEFAULTS,
    })
    expect(next.floatingOpen).toEqual({ details: true })
    expect(next.layout?.panels.details).toEqual({
      open: true,
      view: "activity",
      width: 320,
    })
  })

  it("falls back on a closed panel before one registers", () => {
    const next = applyPanelUpdate({
      id: "unknown",
      update: (panel) => panel,
      layout: { panels: {} },
      floatingOpen: {},
      isFloating: false,
    })
    expect(next.layout?.panels.unknown).toEqual({
      open: false,
      view: null,
      width: 320,
    })
  })
})

describe("getOtherPanelsWidth", () => {
  const panels = {
    a: { open: true, view: null, width: 200 },
    b: { open: true, view: null, width: 300 },
    c: { open: false, view: null, width: 400 },
  }

  it("adds up the other open panels", () => {
    expect(getOtherPanelsWidth(panels, "a")).toBe(300)
    expect(getOtherPanelsWidth(panels, "c")).toBe(500)
  })
})

describe("shouldShowHeaderTrigger", () => {
  it("follows the prop", () => {
    expect(
      shouldShowHeaderTrigger({
        trigger: "always",
        isMobile: false,
        state: "expanded",
      })
    ).toBe(true)
    expect(
      shouldShowHeaderTrigger({
        trigger: "never",
        isMobile: true,
        state: "collapsed",
      })
    ).toBe(false)
  })

  it("shows itself where the sidebar can't show its own", () => {
    const auto = { trigger: "auto" as const }
    expect(
      shouldShowHeaderTrigger({ ...auto, isMobile: true, state: "expanded" })
    ).toBe(true)
    expect(
      shouldShowHeaderTrigger({ ...auto, isMobile: false, state: "collapsed" })
    ).toBe(true)
    expect(
      shouldShowHeaderTrigger({ ...auto, isMobile: false, state: "expanded" })
    ).toBe(false)
  })
})

describe("getFabBottom", () => {
  it("clears the tab bar and the home indicator", () => {
    expect(
      getFabBottom({
        hasBottomNav: true,
        rowHeight: 48,
        gap: 16,
        insetBottom: 34,
      })
    ).toBe(98)
    expect(
      getFabBottom({
        hasBottomNav: false,
        rowHeight: 48,
        gap: 16,
        insetBottom: 34,
      })
    ).toBe(50)
  })
})

describe("getFabClearance", () => {
  it("leaves the page's end clear of the button", () => {
    expect(getFabClearance({ hasFab: true, buttonSize: 44, gap: 16 })).toBe(76)
    expect(getFabClearance({ hasFab: false, buttonSize: 44, gap: 16 })).toBe(0)
  })
})

describe("getContentBottomInset", () => {
  const base = {
    hasBottomNav: false,
    hasStatusBar: false,
    isCard: false,
    insetBottom: 34,
  }

  it("clears the home indicator on its own", () => {
    expect(getContentBottomInset(base)).toBe(34)
  })

  it("leaves it to whatever already sits there", () => {
    expect(getContentBottomInset({ ...base, hasBottomNav: true })).toBe(0)
    expect(getContentBottomInset({ ...base, hasStatusBar: true })).toBe(0)
    expect(getContentBottomInset({ ...base, isCard: true })).toBe(0)
  })
})

describe("getContentColumn", () => {
  const base = {
    isPhone: false,
    phoneGutter: 16,
    gutter: 24,
    bottomInset: 0,
    fabClearance: 0,
  }

  it("gives the full width with no size, for tables and editors", () => {
    expect(
      getContentColumn({ ...base, size: undefined, bottomInset: 34 })
    ).toEqual({ paddingBottom: 34 })
  })

  it("centres the page's column with the page's padding", () => {
    expect(getContentColumn({ ...base, size: "md" })).toEqual({
      width: "100%",
      maxWidth: 896 + 48,
      alignSelf: "center",
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 24,
    })
  })

  it("tightens on phones and clears what floats over it", () => {
    const column = getContentColumn({
      ...base,
      size: "sm",
      isPhone: true,
      bottomInset: 34,
      fabClearance: 76,
    })
    expect(column.paddingHorizontal).toBe(16)
    expect(column.paddingBottom).toBe(16 + 34 + 76)
  })
})

describe("getPanelFrame", () => {
  const base = {
    statusBarHeight: 0,
    insetTop: 24,
    insetBottom: 20,
    gutter: 6,
  }

  it("pads a flat column under the status bar", () => {
    expect(getPanelFrame({ ...base, isCard: false })).toEqual({
      paddingTop: 24,
      marginTop: 0,
      marginBottom: 0,
    })
  })

  it("floats a card off the frame's edges", () => {
    expect(getPanelFrame({ ...base, isCard: true })).toEqual({
      paddingTop: 0,
      marginTop: 30,
      marginBottom: 26,
    })
  })

  it("ends above a status bar", () => {
    expect(
      getPanelFrame({ ...base, isCard: true, statusBarHeight: 56 }).marginBottom
    ).toBe(56)
    expect(
      getPanelFrame({ ...base, isCard: false, statusBarHeight: 56 })
        .marginBottom
    ).toBe(56)
  })
})

describe("getStatusBarHeight", () => {
  it("is the row plus the home indicator, and nothing without a bar", () => {
    expect(
      getStatusBarHeight({ hasStatusBar: true, row: 36, insetBottom: 20 })
    ).toBe(56)
    expect(
      getStatusBarHeight({ hasStatusBar: false, row: 36, insetBottom: 20 })
    ).toBe(0)
  })
})

describe("getPinnedTriggerPosition", () => {
  it("centres the toggle in the row of whichever header is under it", () => {
    expect(
      getPinnedTriggerPosition({
        insetTop: 24,
        insetRight: 0,
        gutter: 6,
        rowHeight: 48,
        buttonSize: 28,
        rowPadding: 12,
      })
    ).toEqual({ top: 24 + 6 + 10, right: 18 })
  })

  it("stays clear of a landscape inset", () => {
    expect(
      getPinnedTriggerPosition({
        insetTop: 0,
        insetRight: 44,
        gutter: 0,
        rowHeight: 48,
        buttonSize: 28,
        rowPadding: 12,
      }).right
    ).toBe(56)
  })
})

describe("getPanelHeaderEnd", () => {
  it("leaves room for a pinned toggle over the header's end", () => {
    expect(getPanelHeaderEnd({ rowPadding: 12, buttonSize: 28, gap: 6 })).toBe(
      46
    )
  })
})

describe("isTitleScrolledAway", () => {
  it("is away once its bottom passes the top of the scroller", () => {
    expect(isTitleScrolledAway({ titleBottom: 60, scrollY: 59 })).toBe(false)
    expect(isTitleScrolledAway({ titleBottom: 60, scrollY: 60 })).toBe(true)
  })

  it("isn't away before it has been measured", () => {
    expect(isTitleScrolledAway({ titleBottom: null, scrollY: 900 })).toBe(false)
  })
})
