import { describe, expect, it } from "vitest"

import { getRevealDragProgress } from "@/registry/fabricator/shared/lib/sidebar-model"
import {
  getHeaderTriggerEnd,
  getInsetFrame,
  getRegisteredCollapsible,
  getRevealPageTransform,
  getRevealProgress,
  getRevealSidebarStyle,
  getRowTrailing,
  getSidebarContainerOffset,
  getSidebarContainerWidth,
  getSidebarGapWidth,
  getSidebarIconWidth,
  getSkeletonWidth,
  getUnregisteredCollapsible,
  parseSidebarWidth,
  toRevealDelta,
  toRevealVelocity,
} from "@/registry/native/lib/sidebar-layout-model"

const SPACE = { 6: 6, 8: 8, 20: 20, 24: 24, 28: 28, 36: 36 }

describe("parseSidebarWidth", () => {
  it("reads the website's units", () => {
    expect(parseSidebarWidth("16rem", 0)).toBe(256)
    expect(parseSidebarWidth("18rem", 0)).toBe(288)
    expect(parseSidebarWidth("320px", 0)).toBe(320)
    expect(parseSidebarWidth("240", 0)).toBe(240)
  })

  it("falls back on what it can't read", () => {
    expect(parseSidebarWidth("calc(1rem + 2px)", 256)).toBe(256)
    expect(parseSidebarWidth("", 256)).toBe(256)
  })
})

describe("the docked sidebar's widths", () => {
  const base = { width: 256, iconWidth: 48, gutter: 8 }

  it("takes its width while expanded", () => {
    const expanded = {
      ...base,
      isCollapsed: false,
      collapsible: "icon" as const,
      variant: "sidebar" as const,
    }
    expect(getSidebarGapWidth(expanded)).toBe(256)
    expect(getSidebarContainerWidth(expanded)).toBe(256)
  })

  it("gives up all of its gap off-canvas, keeping the container's width", () => {
    const collapsed = {
      ...base,
      isCollapsed: true,
      collapsible: "offcanvas" as const,
      variant: "sidebar" as const,
    }
    expect(getSidebarGapWidth(collapsed)).toBe(0)
    expect(getSidebarContainerWidth(collapsed)).toBe(256)
  })

  it("keeps a rail of icons, with room around a floating card", () => {
    const rail = {
      ...base,
      isCollapsed: true,
      collapsible: "icon" as const,
    }
    expect(getSidebarGapWidth({ ...rail, variant: "sidebar" })).toBe(48)
    expect(getSidebarGapWidth({ ...rail, variant: "inset" })).toBe(48)
    expect(getSidebarGapWidth({ ...rail, variant: "floating" })).toBe(64)
    expect(getSidebarContainerWidth({ ...rail, variant: "floating" })).toBe(64)
  })

  it("is a row plus the group's padding as a rail", () => {
    expect(getSidebarIconWidth({ row: 32, padding: 8 })).toBe(48)
  })

  it("slides off its own edge off-canvas", () => {
    const collapsed = { isCollapsed: true, collapsible: "offcanvas" as const }
    expect(
      getSidebarContainerOffset({ ...collapsed, side: "left", width: 256 })
    ).toBe(-256)
    expect(
      getSidebarContainerOffset({ ...collapsed, side: "right", width: 256 })
    ).toBe(256)
  })

  it("stays put otherwise", () => {
    expect(
      getSidebarContainerOffset({
        isCollapsed: true,
        collapsible: "icon",
        side: "left",
        width: 256,
      })
    ).toBe(0)
    expect(
      getSidebarContainerOffset({
        isCollapsed: false,
        collapsible: "offcanvas",
        side: "left",
        width: 256,
      })
    ).toBe(0)
  })
})

describe("getRowTrailing", () => {
  it("keeps the label's own padding on a bare row", () => {
    const trailing = getRowTrailing({
      actionCount: 0,
      hasBadge: false,
      hasToggle: false,
      space: SPACE,
    })
    expect(trailing.gutter).toBe(8)
  })

  it("clears a badge and its actions, as the website's row does", () => {
    expect(
      getRowTrailing({
        actionCount: 1,
        hasBadge: false,
        hasToggle: false,
        space: SPACE,
      })
    ).toMatchObject({ gutter: 6 + 24 + 4, actionsEnd: 6 })
    expect(
      getRowTrailing({
        actionCount: 0,
        hasBadge: true,
        hasToggle: false,
        space: SPACE,
      })
    ).toMatchObject({ gutter: 8 + 24 + 4, badgeEnd: 8 })
    expect(
      getRowTrailing({
        actionCount: 2,
        hasBadge: true,
        hasToggle: false,
        space: SPACE,
      })
    ).toMatchObject({ gutter: 8 + 3 * 24 + 3 * 4, actionsEnd: 8 + 20 + 6 })
  })

  it("centres the toggle on the badge's axis", () => {
    const { toggleEnd } = getRowTrailing({
      actionCount: 0,
      hasBadge: false,
      hasToggle: true,
      space: SPACE,
    })
    expect(toggleEnd + 28 / 2).toBe(8 + 20 / 2)
  })

  it("moves everything past the toggle", () => {
    expect(
      getRowTrailing({
        actionCount: 0,
        hasBadge: false,
        hasToggle: true,
        space: SPACE,
      }).gutter
    ).toBe(36)
    expect(
      getRowTrailing({
        actionCount: 1,
        hasBadge: true,
        hasToggle: true,
        space: SPACE,
      })
    ).toMatchObject({
      badgeEnd: 36,
      actionsEnd: 36 + 20 + 6,
      gutter: 36 + 2 * 24 + 2 * 4,
    })
    expect(
      getRowTrailing({
        actionCount: 1,
        hasBadge: false,
        hasToggle: true,
        space: SPACE,
      }).actionsEnd
    ).toBe(36)
  })
})

describe("getHeaderTriggerEnd", () => {
  it("centres a header's toggle on the axis of the rows' badges", () => {
    expect(
      getHeaderTriggerEnd({ rowEnd: 8, badge: 20, button: 28 }) + 28 / 2
    ).toBe(8 + 20 / 2)
  })
})

describe("the reveal", () => {
  it("draws what the shared model decides", () => {
    for (const deltaX of [-400, -288, -144, -1, 0, 1, 100]) {
      expect(getRevealProgress(deltaX, 288)).toBe(
        getRevealDragProgress({ deltaX, width: 288 })
      )
    }
  })

  it("reads a drag towards closed as negative on either side", () => {
    expect(toRevealDelta("left", -40)).toBe(-40)
    expect(toRevealDelta("right", 40)).toBe(-40)
    expect(toRevealVelocity("left", -600)).toBeCloseTo(-0.6)
    expect(toRevealVelocity("right", 600)).toBeCloseTo(-0.6)
  })

  it("moves the page aside and shrinks it", () => {
    expect(getRevealPageTransform(0, 288, "left")).toEqual({
      translateX: 0,
      scale: 1,
    })
    expect(getRevealPageTransform(1, 288, "left")).toEqual({
      translateX: 288,
      scale: 0.88,
    })
    expect(getRevealPageTransform(1, 288, "right").translateX).toBe(-288)
  })

  it("drifts the sidebar in behind it", () => {
    const open = getRevealSidebarStyle(1, 288, "left")
    expect(open.opacity).toBe(1)
    expect(open.translateX).toBeCloseTo(0)
    const closed = getRevealSidebarStyle(0, 288, "left")
    expect(closed.opacity).toBe(0.5)
    expect(closed.translateX).toBeCloseTo(-288 * 0.12)
    expect(getRevealSidebarStyle(0, 288, "right").translateX).toBeCloseTo(
      288 * 0.12
    )
  })
})

describe("getInsetFrame", () => {
  const base = {
    statusBarHeight: 0,
    insetTop: 40,
    insetBottom: 20,
    gutter: 6,
    hasSidebarBeside: true,
  }

  it("pads a phone's page under the status bar", () => {
    expect(getInsetFrame({ ...base, isMobile: true, isCard: true })).toEqual({
      paddingTop: 40,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
    })
  })

  it("leaves a phone's page flush when its header holds the status bar", () => {
    expect(
      getInsetFrame({ ...base, isMobile: true, isCard: true, isFlushTop: true })
        .paddingTop
    ).toBe(0)
  })

  it("pads a flat column under the status bar", () => {
    expect(getInsetFrame({ ...base, isMobile: false, isCard: false })).toEqual({
      paddingTop: 40,
      marginTop: 0,
      marginRight: 0,
      marginBottom: 0,
      marginLeft: 0,
    })
  })

  it("floats a card off the frame's edges", () => {
    expect(getInsetFrame({ ...base, isMobile: false, isCard: true })).toEqual({
      paddingTop: 0,
      marginTop: 46,
      marginRight: 6,
      marginBottom: 26,
      marginLeft: 0,
    })
  })

  it("keeps the gutter on the start with no sidebar beside the card", () => {
    expect(
      getInsetFrame({
        ...base,
        isMobile: false,
        isCard: true,
        hasSidebarBeside: false,
      }).marginLeft
    ).toBe(6)
  })

  it("ends above a status bar", () => {
    expect(
      getInsetFrame({
        ...base,
        statusBarHeight: 56,
        isMobile: false,
        isCard: true,
      }).marginBottom
    ).toBe(56)
    expect(
      getInsetFrame({
        ...base,
        statusBarHeight: 56,
        isMobile: false,
        isCard: false,
      }).marginBottom
    ).toBe(56)
  })
})

describe("getSkeletonWidth", () => {
  it("is stable for an id and picks from a fixed cycle", () => {
    expect(getSkeletonWidth(":r1:")).toBe(getSkeletonWidth(":r1:"))
    expect(["62%", "74%", "55%", "82%", "68%"]).toContain(
      getSkeletonWidth(":r2:")
    )
  })
})

describe("two sidebars in one provider", () => {
  it("lets the one that collapses decide, whichever registers first", () => {
    expect(getRegisteredCollapsible(null, "offcanvas")).toBe("offcanvas")
    expect(getRegisteredCollapsible("none", "offcanvas")).toBe("offcanvas")
    expect(getRegisteredCollapsible("offcanvas", "none")).toBe("offcanvas")
    expect(getRegisteredCollapsible(null, "none")).toBe("none")
  })

  it("keeps the other's registration when one unmounts", () => {
    expect(getUnregisteredCollapsible("offcanvas", "none")).toBe("offcanvas")
    expect(getUnregisteredCollapsible("offcanvas", "offcanvas")).toBeNull()
  })
})
