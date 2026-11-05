// What the App Shell's native parts work out on top of lib/app-shell-model, which
// holds every decision about layout: this is where those decisions land in a
// window with safe areas, and the panel state rule the website keeps in its
// component. No React Native imports, so it stays testable anywhere.

import {
  APP_SHELL_CONTENT_WIDTHS,
  type AppShellContentSize,
  type PanelState,
  type ShellLayoutState,
} from "@/registry/fabricator/shared/lib/app-shell-model"

export const FALLBACK_PANEL: PanelState = {
  open: false,
  view: null,
  width: 320,
}

/**
 * A change to a panel. A panel that floats over the page (an overlay, a drawer,
 * the whole screen) starts closed and its open state is temporary, so it never
 * overwrites the docked preference. The chosen view is still saved.
 */
export function applyPanelUpdate({
  id,
  update,
  layout,
  floatingOpen,
  isFloating,
  defaults,
}: {
  id: string
  update: (panel: PanelState) => PanelState
  layout: ShellLayoutState
  floatingOpen: Record<string, boolean>
  isFloating: boolean
  defaults?: PanelState
}): {
  layout?: ShellLayoutState
  floatingOpen?: Record<string, boolean>
} {
  const saved = layout.panels[id] ?? defaults ?? FALLBACK_PANEL
  if (!isFloating) {
    return {
      layout: { ...layout, panels: { ...layout.panels, [id]: update(saved) } },
    }
  }
  const next = update({ ...saved, open: floatingOpen[id] ?? false })
  return {
    floatingOpen: { ...floatingOpen, [id]: next.open },
    ...(next.view === saved.view
      ? {}
      : {
          layout: {
            ...layout,
            panels: { ...layout.panels, [id]: { ...saved, view: next.view } },
          },
        }),
  }
}

/** The room the other open panels take beside the main column. */
export function getOtherPanelsWidth(
  panels: Record<string, PanelState>,
  id: string
) {
  return Object.entries(panels)
    .filter(([otherId, other]) => otherId !== id && other.open)
    .reduce((total, [, other]) => total + other.width, 0)
}

/** `auto` shows the toggle only where the sidebar can't show its own. */
export function shouldShowHeaderTrigger({
  trigger,
  isMobile,
  state,
}: {
  trigger: "auto" | "always" | "never"
  isMobile: boolean
  state: "expanded" | "collapsed"
}) {
  if (trigger === "auto") return isMobile || state === "collapsed"
  return trigger === "always"
}

/** The phone's primary action, clear of the tab bar when the column has one. */
export function getFabBottom({
  hasBottomNav,
  rowHeight,
  gap,
  insetBottom,
  overlap = 0,
}: {
  hasBottomNav: boolean
  rowHeight: number
  gap: number
  insetBottom: number
  /** How far a tab bar that floats over the page reaches up. */
  overlap?: number
}) {
  if (overlap > 0) return overlap + gap
  return (hasBottomNav ? rowHeight : 0) + gap + insetBottom
}

/**
 * Where a floating tab bar sits: a capsule over the page, partly in the home
 * indicator's space, as Apple's. `clearance` is what a page leaves below its
 * content so it can scroll out from under it.
 */
export function getFloatingNavMetrics({
  row,
  padding,
  gap,
  insetBottom,
}: {
  row: number
  padding: number
  gap: number
  insetBottom: number
}) {
  const height = row + 2 * padding
  const bottom = Math.max(insetBottom - gap, gap)
  return { height, bottom, radius: height / 2, clearance: bottom + height }
}

/** What the page's end leaves free, so its last row can scroll out from under it. */
export function getFabClearance({
  hasFab,
  buttonSize,
  gap,
}: {
  hasFab: boolean
  buttonSize: number
  gap: number
}) {
  return hasFab ? buttonSize + 2 * gap : 0
}

/** The home indicator, unless something below the page already clears it. */
export function getContentBottomInset({
  hasBottomNav,
  hasStatusBar,
  isCard,
  insetBottom,
}: {
  hasBottomNav: boolean
  hasStatusBar: boolean
  isCard: boolean
  insetBottom: number
}) {
  return hasBottomNav || hasStatusBar || isCard ? 0 : insetBottom
}

/**
 * The page's column. With a size it's centred at that width, with the page's
 * padding; without one, the page has the column's full width, for tables, boards
 * and editors.
 */
export function getContentColumn({
  size,
  isPhone,
  phoneGutter,
  gutter,
  bottomInset,
  fabClearance,
  topInset = 0,
}: {
  size: AppShellContentSize | undefined
  isPhone: boolean
  phoneGutter: number
  gutter: number
  bottomInset: number
  fabClearance: number
  /** How far a header the page scrolls under reaches down. */
  topInset?: number
}) {
  if (!size) {
    return {
      ...(topInset > 0 ? { paddingTop: topInset } : {}),
      paddingBottom: bottomInset + fabClearance,
    }
  }
  const padding = isPhone ? phoneGutter : gutter
  return {
    width: "100%" as const,
    maxWidth: APP_SHELL_CONTENT_WIDTHS[size] + 2 * padding,
    alignSelf: "center" as const,
    paddingHorizontal: padding,
    paddingTop: padding + topInset,
    paddingBottom: padding + bottomInset + fabClearance,
  }
}

/** A docked panel's place in the window: as the main column's, on its edge. */
export function getPanelFrame({
  isCard,
  statusBarHeight,
  insetTop,
  insetBottom,
  gutter,
}: {
  isCard: boolean
  statusBarHeight: number
  insetTop: number
  insetBottom: number
  gutter: number
}) {
  if (!isCard) {
    return { paddingTop: insetTop, marginTop: 0, marginBottom: statusBarHeight }
  }
  return {
    paddingTop: 0,
    marginTop: insetTop + gutter,
    marginBottom: statusBarHeight > 0 ? statusBarHeight : insetBottom + gutter,
  }
}

/** The status bar's row, above the home indicator. Nothing without one. */
export function getStatusBarHeight({
  hasStatusBar,
  row,
  insetBottom,
}: {
  hasStatusBar: boolean
  row: number
  insetBottom: number
}) {
  return hasStatusBar ? row + insetBottom : 0
}

/**
 * A docked right panel's toggle keeps its spot, open or closed: the top corner of
 * the card, centred in the row of whichever header is under it.
 */
export function getPinnedTriggerPosition({
  insetTop,
  insetRight,
  gutter,
  rowHeight,
  buttonSize,
  rowPadding,
}: {
  insetTop: number
  insetRight: number
  gutter: number
  rowHeight: number
  buttonSize: number
  rowPadding: number
}) {
  return {
    top: insetTop + gutter + (rowHeight - buttonSize) / 2,
    right: insetRight + gutter + rowPadding,
  }
}

/** What a docked panel's header leaves for the toggle pinned over its end. */
export function getPanelHeaderEnd({
  rowPadding,
  buttonSize,
  gap,
}: {
  rowPadding: number
  buttonSize: number
  gap: number
}) {
  return rowPadding + buttonSize + gap
}

/** Whether the page's heading has left the top of its scroller. */
export function isTitleScrolledAway({
  titleBottom,
  scrollY,
}: {
  titleBottom: number | null
  scrollY: number
}) {
  return titleBottom !== null && scrollY >= titleBottom
}
