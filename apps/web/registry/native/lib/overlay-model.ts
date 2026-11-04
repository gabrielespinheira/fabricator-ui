// What the anchored overlays share. React only, with no React Native imports, so
// it stays testable anywhere.

import * as React from "react"

type TriggerAction = "open" | "close"

/** Keeps an anchored surface off the edge of the screen. */
export const COLLISION_INSETS = { top: 8, right: 8, bottom: 8, left: 8 }

const MENU_HEIGHT_FRACTION = 0.8

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

/** The tallest a menu gets before it scrolls. */
export function getMenuMaxHeight(windowHeight: number) {
  return windowHeight * MENU_HEIGHT_FRACTION
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
