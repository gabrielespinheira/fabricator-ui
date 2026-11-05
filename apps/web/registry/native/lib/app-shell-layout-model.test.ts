import { describe, expect, it } from "vitest"

import { revealPanelView } from "@/registry/fabricator/shared/lib/app-shell-model"
import {
  applyPanelUpdate,
  getContentBottomInset,
  getContentColumn,
  getFabBottom,
  getFabClearance,
  getFloatingNavMetrics,
  getOtherPanelsWidth,
  getPanelFrame,
  getPanelHeaderEnd,
  getPhoneTrail,
  getPinnedAnchorWidth,
  getPinnedTriggerPosition,
  getShellRowOffset,
  getStatusBarHeight,
  getStatusBarPadding,
  hasPanelClose,
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
        canCollapse: false,
      })
    ).toBe(true)
    expect(
      shouldShowHeaderTrigger({
        trigger: "never",
        isMobile: true,
        canCollapse: true,
      })
    ).toBe(false)
  })

  it("stays in a tablet's toolbar while the sidebar can collapse, open or not", () => {
    expect(
      shouldShowHeaderTrigger({
        trigger: "auto",
        isMobile: false,
        canCollapse: true,
      })
    ).toBe(true)
  })

  it("has nothing to do beside a tablet's sidebar that never collapses", () => {
    expect(
      shouldShowHeaderTrigger({
        trigger: "auto",
        isMobile: false,
        canCollapse: false,
      })
    ).toBe(false)
  })

  it("is how a phone reaches its sidebar, whichever kind it is", () => {
    expect(
      shouldShowHeaderTrigger({
        trigger: "auto",
        isMobile: true,
        canCollapse: false,
      })
    ).toBe(true)
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

describe("getFabBottom with a floating nav", () => {
  it("rises above what floats, not above a row", () => {
    expect(
      getFabBottom({
        hasBottomNav: true,
        rowHeight: 56,
        gap: 16,
        insetBottom: 34,
        overlap: 94,
      })
    ).toBe(110)
  })
})

describe("getFloatingNavMetrics", () => {
  const base = { row: 56, padding: 8, gap: 12 }

  it("sits partly in the home indicator's space", () => {
    expect(getFloatingNavMetrics({ ...base, insetBottom: 34 }).bottom).toBe(22)
  })

  it("keeps its gap where there's no home indicator", () => {
    expect(getFloatingNavMetrics({ ...base, insetBottom: 0 }).bottom).toBe(12)
  })

  it("is as tall as its row and padding, and fully round", () => {
    const { height, radius } = getFloatingNavMetrics({
      ...base,
      insetBottom: 34,
    })
    expect(height).toBe(72)
    expect(radius).toBe(36)
  })

  it("asks a page to clear everything up to its top", () => {
    expect(getFloatingNavMetrics({ ...base, insetBottom: 34 }).clearance).toBe(
      94
    )
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

  it("clears a header the content scrolls under", () => {
    expect(
      getContentColumn({ ...base, size: undefined, topInset: 115 })
    ).toEqual({ paddingTop: 115, paddingBottom: 0 })
    expect(getContentColumn({ ...base, size: "md", topInset: 115 })).toEqual(
      expect.objectContaining({ paddingTop: 24 + 115 })
    )
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

describe("getShellRowOffset", () => {
  it("drops a flush column's top row by the sidebar's padding", () => {
    expect(
      getShellRowOffset({ variant: "sidebar", isPhone: false, rowInset: 10 })
    ).toBe(10)
  })

  it("drops it by the card's gutter too beside a floating sidebar", () => {
    expect(
      getShellRowOffset({ variant: "floating", isPhone: false, rowInset: 10 })
    ).toBe(20)
  })

  it("leaves it to the card's own gutter beside an inset sidebar", () => {
    expect(
      getShellRowOffset({ variant: "inset", isPhone: false, rowInset: 10 })
    ).toBe(0)
  })

  it("has no sidebar to line up with on a phone", () => {
    expect(
      getShellRowOffset({ variant: "floating", isPhone: true, rowInset: 10 })
    ).toBe(0)
  })
})

describe("getPanelFrame", () => {
  const base = {
    statusBarHeight: 0,
    insetTop: 24,
    insetBottom: 20,
    gutter: 6,
  }

  it("drops a flat column's top row with the main column's", () => {
    expect(
      getPanelFrame({ ...base, isCard: false, rowOffset: 20 }).paddingTop
    ).toBe(44)
  })

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
  it("is the row plus half the home indicator's space", () => {
    expect(
      getStatusBarHeight({ hasStatusBar: true, row: 36, insetBottom: 20 })
    ).toBe(46)
  })

  it("is the row alone on a tablet with a home button", () => {
    expect(
      getStatusBarHeight({ hasStatusBar: true, row: 36, insetBottom: 0 })
    ).toBe(36)
  })

  it("is nothing without a bar", () => {
    expect(
      getStatusBarHeight({ hasStatusBar: false, row: 36, insetBottom: 20 })
    ).toBe(0)
  })
})

describe("getStatusBarPadding", () => {
  const base = { gutter: 10, rowInset: 14 }

  it("sits as far inside a card's left edge as inside its right", () => {
    const { paddingLeft, paddingRight } = getStatusBarPadding({
      ...base,
      hasSidebarBeside: true,
    })
    // The bar starts at the card's left edge, and ends past its right by the gutter.
    expect(paddingLeft).toBe(14)
    expect(paddingRight - base.gutter).toBe(14)
  })

  it("clears the gutter on the left once no sidebar is beside it", () => {
    expect(getStatusBarPadding({ ...base, hasSidebarBeside: false })).toEqual({
      paddingLeft: 24,
      paddingRight: 24,
    })
  })
})

describe("getPinnedAnchorWidth", () => {
  const metrics = { buttonSize: 34, pageGutter: 28, rowPadding: 14, gap: 10 }

  it("holds the toggle's room while it sits over this header", () => {
    expect(getPinnedAnchorWidth({ ...metrics, isOpen: false })).toBe(34)
  })

  it("lines the header's end up with the page's once it's over the panel", () => {
    const width = getPinnedAnchorWidth({ ...metrics, isOpen: true })
    expect(width + metrics.gap + metrics.rowPadding).toBe(metrics.pageGutter)
  })

  it("never asks for less than nothing", () => {
    expect(
      getPinnedAnchorWidth({
        ...metrics,
        pageGutter: 16,
        isOpen: true,
      })
    ).toBe(0)
  })
})

describe("getPinnedTriggerPosition", () => {
  it("drops with a row that has dropped, keeping its distance from the side", () => {
    expect(
      getPinnedTriggerPosition({
        insetTop: 32,
        insetRight: 0,
        gutter: 0,
        rowHeight: 52,
        buttonSize: 34,
        rowPadding: 14,
        rowOffset: 20,
      })
    ).toEqual({ top: 32 + 20 + 9, right: 14 })
  })

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

describe("hasPanelClose", () => {
  it("leaves a phone's drawer to its handle and scrim", () => {
    expect(hasPanelClose({ placement: "drawer", pinnedTriggers: 0 })).toBe(
      false
    )
  })

  it("keeps it where the panel has no other way to close", () => {
    expect(hasPanelClose({ placement: "swap", pinnedTriggers: 0 })).toBe(true)
    expect(hasPanelClose({ placement: "overlay", pinnedTriggers: 0 })).toBe(
      true
    )
    expect(hasPanelClose({ placement: "inline", pinnedTriggers: 0 })).toBe(true)
  })

  it("steps aside beside a pinned toggle, which closes a docked panel", () => {
    expect(hasPanelClose({ placement: "inline", pinnedTriggers: 1 })).toBe(
      false
    )
    expect(hasPanelClose({ placement: "overlay", pinnedTriggers: 1 })).toBe(
      true
    )
  })
})

describe("getPanelHeaderEnd", () => {
  it("leaves room for a pinned toggle over the header's end", () => {
    expect(getPanelHeaderEnd({ rowPadding: 12, buttonSize: 28, gap: 6 })).toBe(
      46
    )
  })
})

describe("getPhoneTrail", () => {
  const home = { label: "Home" }
  const ui = { label: "UI" }
  const avatar = { label: "Avatar" }
  const atRest = { hasPageTitle: true, isTitleAway: false }

  it("leaves the current page to its own heading while that's on screen", () => {
    expect(getPhoneTrail({ items: [home], ...atRest })).toEqual({
      folded: [],
      parent: null,
      current: home,
      showsCurrent: false,
    })
  })

  it("keeps the way up in the header, beside the page's heading", () => {
    const trail = getPhoneTrail({ items: [ui, avatar], ...atRest })
    expect(trail.parent).toBe(ui)
    expect(trail.current).toBe(avatar)
    expect(trail.showsCurrent).toBe(false)
  })

  it("takes the page's name over once its heading scrolls away", () => {
    expect(
      getPhoneTrail({
        items: [ui, avatar],
        hasPageTitle: true,
        isTitleAway: true,
      }).showsCurrent
    ).toBe(true)
  })

  it("names the page itself when it has no heading", () => {
    expect(
      getPhoneTrail({
        items: [home],
        hasPageTitle: false,
        isTitleAway: false,
      }).showsCurrent
    ).toBe(true)
  })

  it("folds what a phone has no room for, keeping the nearest parent", () => {
    const projects = { label: "Projects" }
    const launch = { label: "Q4 launch" }
    const specs = { label: "Specs" }
    const trail = getPhoneTrail({
      items: [ui, projects, launch, specs],
      ...atRest,
    })
    expect(trail.folded).toEqual([ui, projects])
    expect(trail.parent).toBe(launch)
    expect(trail.current).toBe(specs)
  })

  it("has nothing to show for no items", () => {
    expect(getPhoneTrail({ items: [], ...atRest }).current).toBeNull()
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
