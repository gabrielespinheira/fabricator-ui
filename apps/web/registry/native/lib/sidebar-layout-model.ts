// The Sidebar's layout as plain numbers: its widths, the room a row's trailing
// controls take, and where the reveal puts the page. No React Native imports, so
// it stays testable anywhere; the "worklet" directive lets a gesture run it on the
// UI thread.

import { REVEAL_SCALE } from "@/registry/fabricator/shared/lib/sidebar-model"

export type SidebarSide = "left" | "right"
export type SidebarVariant = "sidebar" | "floating" | "inset"
export type SidebarCollapsible = "offcanvas" | "icon"

export type SidebarRegistration = SidebarCollapsible | "none"

export const SIDEBAR_WIDTH = "16rem"
export const SIDEBAR_WIDTH_MOBILE = "18rem"

/** How close to the leading edge a swipe has to start to open the reveal. */
export const REVEAL_OPEN_EDGE = 24

/** A horizontal move this long, and mostly sideways, claims the touch. */
export const REVEAL_DRAG_SLOP = 8

// How far the sidebar drifts as the page uncovers it, as a share of its width.
const REVEAL_SIDEBAR_DRIFT = 0.12
const REVEAL_CLOSED_OPACITY = 0.5
const REVEAL_SHRINK = 1 - REVEAL_SCALE

const REM = 16
const WIDTH_PATTERN = /^\s*(\d*\.?\d+)\s*(rem|px)?\s*$/

const SKELETON_WIDTHS = ["62%", "74%", "55%", "82%", "68%"] as const

/** A width as the website writes one ("16rem", "320px"), in points. */
export function parseSidebarWidth(width: string, fallback: number) {
  const match = WIDTH_PATTERN.exec(width)
  if (!match) return fallback
  const value = Number(match[1])
  return match[2] === "rem" ? value * REM : value
}

/** A collapsed row plus the group's padding on each side. */
export function getSidebarIconWidth({
  row,
  padding,
}: {
  row: number
  padding: number
}) {
  return row + 2 * padding
}

type SidebarWidthInput = {
  isCollapsed: boolean
  collapsible: SidebarCollapsible
  variant: SidebarVariant
  width: number
  iconWidth: number
  /** The room a floating card keeps on each side. */
  gutter: number
}

function getRailWidth({
  variant,
  iconWidth,
  gutter,
}: Pick<SidebarWidthInput, "variant" | "iconWidth" | "gutter">) {
  return variant === "floating" ? iconWidth + 2 * gutter : iconWidth
}

/** The room the sidebar takes beside the main column. */
export function getSidebarGapWidth(input: SidebarWidthInput) {
  if (!input.isCollapsed) return input.width
  if (input.collapsible === "offcanvas") return 0
  return getRailWidth(input)
}

/** The sidebar's own width. Off-canvas, it keeps it and slides away. */
export function getSidebarContainerWidth(input: SidebarWidthInput) {
  if (!input.isCollapsed || input.collapsible === "offcanvas") {
    return input.width
  }
  return getRailWidth(input)
}

/** Where the sidebar sits off its own edge when it's off-canvas. */
export function getSidebarContainerOffset({
  isCollapsed,
  collapsible,
  side,
  width,
}: {
  isCollapsed: boolean
  collapsible: SidebarCollapsible
  side: SidebarSide
  width: number
}) {
  if (!isCollapsed || collapsible !== "offcanvas") return 0
  return side === "left" ? -width : width
}

/**
 * What a row's end holds, from the end: the toggle on the axis of the badges, the
 * badge, then the actions (24pt apiece, 4pt apart). `gutter` is what the label has
 * to clear; the others are each control's distance from the row's end.
 */
export function getRowTrailing({
  actionCount,
  hasBadge,
  hasToggle,
  space,
}: {
  actionCount: number
  hasBadge: boolean
  hasToggle: boolean
  space: Record<6 | 8 | 20 | 24 | 28 | 36, number>
}) {
  const toggleRoom = hasToggle ? space[36] : 0
  const slots = actionCount + (hasBadge ? 1 : 0)
  const edge = hasBadge ? space[8] : space[6]
  const badgeEnd = hasToggle ? toggleRoom : space[8]
  return {
    toggleEnd: space[8] + space[20] / 2 - space[28] / 2,
    badgeEnd,
    actionsEnd: hasBadge
      ? badgeEnd + space[20] + space[6]
      : hasToggle
        ? toggleRoom
        : space[6],
    gutter:
      slots === 0
        ? hasToggle
          ? toggleRoom
          : space[8]
        : (hasToggle ? toggleRoom : edge) + slots * space[24] + slots * 4,
  }
}

/** The margin that centres a header's toggle on the axis of the rows' badges. */
export function getHeaderTriggerEnd({
  rowEnd,
  badge,
  button,
}: {
  rowEnd: number
  badge: number
  button: number
}) {
  return rowEnd + badge / 2 - button / 2
}

/** A translation as distance towards open: negative towards closed on either side. */
export function toRevealDelta(side: SidebarSide, translation: number) {
  "worklet"
  return side === "left" ? translation : -translation
}

/** A gesture's velocity (pt/s) as `shouldRevealStayOpen` reads it (pt/ms). */
export function toRevealVelocity(side: SidebarSide, velocity: number) {
  "worklet"
  return (side === "left" ? velocity : -velocity) / 1000
}

/**
 * `getRevealDragProgress` from lib/sidebar-model, as a worklet: a drag reads it on
 * the UI thread every frame, and the shared file has no directive. The test pins
 * the two together.
 */
export function getRevealProgress(deltaX: number, width: number) {
  "worklet"
  return Math.max(0, Math.min(1, 1 + deltaX / width))
}

/** Where the page sits at a reveal's progress. */
export function getRevealPageTransform(
  progress: number,
  width: number,
  side: SidebarSide
) {
  "worklet"
  return {
    translateX: (side === "left" ? 1 : -1) * width * progress,
    scale: 1 - REVEAL_SHRINK * progress,
  }
}

/** The sidebar behind the page, drifting a little as it uncovers. */
export function getRevealSidebarStyle(
  progress: number,
  width: number,
  side: SidebarSide
) {
  "worklet"
  return {
    opacity: REVEAL_CLOSED_OPACITY + (1 - REVEAL_CLOSED_OPACITY) * progress,
    translateX:
      (side === "left" ? -1 : 1) *
      width *
      REVEAL_SIDEBAR_DRIFT *
      (1 - progress),
  }
}

/**
 * Where the page sits in the window. A phone's page and a flat column run under
 * the status bar and pad past it; a card floats off the frame's edges.
 */
export function getInsetFrame({
  isMobile,
  isCard,
  hasSidebarBeside,
  statusBarHeight,
  insetTop,
  insetBottom,
  gutter,
}: {
  isMobile: boolean
  isCard: boolean
  hasSidebarBeside: boolean
  statusBarHeight: number
  insetTop: number
  insetBottom: number
  gutter: number
}) {
  if (isMobile || !isCard) {
    return {
      paddingTop: insetTop,
      marginTop: 0,
      marginRight: 0,
      marginBottom: statusBarHeight,
      marginLeft: 0,
    }
  }
  return {
    paddingTop: 0,
    marginTop: insetTop + gutter,
    marginRight: gutter,
    marginBottom: statusBarHeight > 0 ? statusBarHeight : insetBottom + gutter,
    marginLeft: hasSidebarBeside ? 0 : gutter,
  }
}

/** A loading row's width: varied, and stable for one row. */
export function getSkeletonWidth(id: string) {
  let sum = 0
  for (let index = 0; index < id.length; index++) sum += id.charCodeAt(index)
  return SKELETON_WIDTHS[sum % SKELETON_WIDTHS.length] ?? SKELETON_WIDTHS[0]
}

/**
 * Two sidebars can share a provider (sidebar-15). The one that collapses decides the
 * phone's gestures, since one that never collapses has nothing to reveal.
 */
export function getRegisteredCollapsible(
  current: SidebarRegistration | null,
  next: SidebarRegistration
) {
  return next === "none" && current !== null ? current : next
}

export function getUnregisteredCollapsible(
  current: SidebarRegistration | null,
  own: SidebarRegistration
) {
  return current === own ? null : current
}
