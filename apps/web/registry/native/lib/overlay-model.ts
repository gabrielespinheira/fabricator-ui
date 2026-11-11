// What the anchored overlays share. React only, with no React Native imports, so
// it stays testable anywhere.

import * as React from "react"

type TriggerAction = "open" | "close"

/** Keeps an anchored surface off the edge of the screen. */
export const COLLISION_INSETS = { top: 8, right: 8, bottom: 8, left: 8 }

type Insets = { top?: number; right?: number; bottom?: number; left?: number }

/** Collision insets that keep clear of the status bar and the home indicator too. */
export function getSafeInsets(
  insets: Insets,
  /** What `useSafeAreaInsets()` returns. */
  safeArea: Required<Insets>
) {
  return {
    ...insets,
    top: (insets.top ?? 0) + safeArea.top,
    bottom: (insets.bottom ?? 0) + safeArea.bottom,
  }
}

const MENU_HEIGHT_FRACTION = 0.8

/** Where a window stops being a phone's: a tall screen is no reason for a tall menu. */
const TABLET_WIDTH = 768
const TABLET_MENU_MAX_HEIGHT = 480
const TABLET_MENU_MAX_MIN_WIDTH = 360

/**
 * For a dialog's or a sheet's root: on the website it renders no element, so a closed
 * one with no trigger takes no slot in its parent's gap. Its trigger lays out as a
 * child of that parent, which is where the website's does too.
 */
export const NO_LAYOUT = { display: "contents" } as const

/** What it takes to bring a primitive's own open state to the wanted one. */
export function getTriggerAction(
  wanted: boolean,
  actual: boolean
): TriggerAction | null {
  if (wanted === actual) return null
  return wanted ? "open" : "close"
}

/**
 * The primitives place a surface above or below its anchor, flipping and clamping
 * it there. A phone rarely has room beside one, so the other sides go below.
 */
export function getVerticalSide(side: string): "top" | "bottom" {
  return side === "top" ? "top" : "bottom"
}

/**
 * The side a surface fits on. The primitives only clamp to the screen, which lays a
 * tall menu over its own trigger near an edge. This flips it to the roomier side, once
 * it's been measured and only if it doesn't fit where it was asked.
 */
export function getFittedSide({
  side,
  triggerY,
  triggerHeight,
  contentHeight,
  offset,
  windowHeight,
  insets,
}: {
  side: "top" | "bottom"
  triggerY: number | undefined
  triggerHeight: number | undefined
  contentHeight: number | null
  offset: number
  windowHeight: number
  insets?: { top?: number; bottom?: number }
}) {
  if (
    contentHeight === null ||
    triggerY === undefined ||
    triggerHeight === undefined
  ) {
    return side
  }
  const above = triggerY - offset - (insets?.top ?? 0)
  const below =
    windowHeight - (insets?.bottom ?? 0) - triggerY - triggerHeight - offset
  if (side === "bottom") {
    return contentHeight > below && above > below ? "top" : "bottom"
  }
  return contentHeight > above && below > above ? "bottom" : "top"
}

/** The tallest a menu gets before it scrolls. */
export function getMenuMaxHeight(
  windowHeight: number,
  windowWidth: number,
  /** Room on the side the menu opens to, when it's known. */
  available?: number
) {
  const fraction = windowHeight * MENU_HEIGHT_FRACTION
  const height =
    windowWidth >= TABLET_WIDTH
      ? Math.min(fraction, TABLET_MENU_MAX_HEIGHT)
      : fraction
  return available === undefined
    ? height
    : Math.min(height, Math.max(available, 0))
}

/**
 * The room between a trigger and the screen's edge on the side a menu opens
 * to, inside the insets (which include the safe area: a menu opening up from
 * a bar at the bottom mustn't run under the status bar).
 */
export function getMenuAvailableSpace({
  side,
  triggerY,
  triggerHeight,
  offset,
  windowHeight,
  insets,
}: {
  side: "top" | "bottom"
  triggerY: number | undefined
  triggerHeight: number | undefined
  offset: number
  windowHeight: number
  insets: { top: number; bottom: number }
}) {
  if (triggerY === undefined || triggerHeight === undefined) return undefined
  return side === "top"
    ? triggerY - offset - insets.top
    : windowHeight - (triggerY + triggerHeight) - offset - insets.bottom
}

/**
 * A menu is at least as wide as its trigger, until the trigger is a row stretched
 * across a tablet: past that, a wider menu only moves its text further apart.
 */
export function getMenuMinWidth(
  triggerWidth: number | undefined,
  windowWidth: number
) {
  if (triggerWidth === undefined || windowWidth < TABLET_WIDTH) {
    return triggerWidth
  }
  return Math.min(triggerWidth, TABLET_MENU_MAX_MIN_WIDTH)
}

/** The text inside a React node, however deep. */
export function getTextContent(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getTextContent).join("")
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextContent(node.props.children)
  }
  return ""
}

/**
 * The website's `open`, `defaultOpen` and `onOpenChange` for primitives that have
 * no `open` prop: a ref on their Trigger exposes `open()` and `close()`, so an
 * effect brings the primitive to the wanted state. Pass `triggerRef` to the
 * Trigger and `onOpenChange` to the Root.
 */
export function useTriggerOpen<
  Trigger extends { open: () => void; close: () => void },
>({
  open,
  defaultOpen = false,
  onOpenChange,
}: {
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultOpen)
  const [actual, setActual] = React.useState(false)
  const isControlled = open !== undefined
  const wanted = isControlled ? open : uncontrolled
  const triggerRef = React.useRef<Trigger>(null)

  React.useEffect(() => {
    const action = getTriggerAction(wanted, actual)
    if (action) triggerRef.current?.[action]()
  }, [wanted, actual])

  const setIsOpen = (next: boolean) => {
    if (next === wanted) return
    if (!isControlled) setUncontrolled(next)
    onOpenChange?.(next)
  }

  return {
    isOpen: wanted,
    setIsOpen,
    triggerRef,
    onOpenChange: (next: boolean) => {
      setActual(next)
      setIsOpen(next)
    },
  }
}
