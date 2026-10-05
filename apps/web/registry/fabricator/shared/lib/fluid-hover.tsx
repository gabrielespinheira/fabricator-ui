"use client"

// Fluid hover: one highlight that glides to the item nearest the pointer, and
// a selection background that slides between selected items. Adapted from
// Fluid Functionalism by Micka Touillaud (MIT),
// https://github.com/mickadesign/fluid-functionalism.
//
// Items are found by selector inside a positioned container, so a component
// only wires its container. Motion is CSS (transform, width, height, opacity)
// on the Fabricator spring easings; no animation library is needed.
import * as React from "react"
import { cn } from "cn"

type Rect = { top: number; left: number; width: number; height: number }

export type FluidHoverOptions = {
  /** Selector for the items, matched inside the container. */
  items: string
  /** Items matching this are never lit and never receive gap clicks. */
  disabled?: string
  /** Items matching this get the sliding selection background. */
  selected?: string
  /**
   * Items matching this are lit while the pointer is outside the container,
   * so keyboard navigation from the primitive moves the same highlight.
   */
  highlighted?: string
  /**
   * Which way the items run: y for lists, x for strips, xy for grids.
   * auto reads the container's aria-orientation, or data-orientation where
   * the primitive only sets that (Base UI), and is horizontal unless vertical.
   */
  axis?: "x" | "y" | "xy" | "auto"
  /** A click between items goes to the lit one. */
  gapClick?: boolean
}

const DEFAULT_DISABLED = '[data-disabled], [aria-disabled="true"], :disabled'
const ACTIVE_ATTR = "data-fluid-hover-active"

function sameRect(a: Rect | null, b: Rect | null) {
  return (
    a === b ||
    (!!a &&
      !!b &&
      a.top === b.top &&
      a.left === b.left &&
      a.width === b.width &&
      a.height === b.height)
  )
}

// Offsets, not bounding rects: CSS transforms on ancestors (a popup scaling
// in) don't distort them, and they match the space of absolute children.
function measure(element: HTMLElement, container: HTMLElement): Rect {
  let top = element.offsetTop
  let left = element.offsetLeft
  let ancestor = element.offsetParent as HTMLElement | null
  while (ancestor && ancestor !== container && container.contains(ancestor)) {
    top += ancestor.offsetTop + ancestor.clientTop
    left += ancestor.offsetLeft + ancestor.clientLeft
    ancestor = ancestor.offsetParent as HTMLElement | null
  }
  return { top, left, width: element.offsetWidth, height: element.offsetHeight }
}

function pickNearest(
  container: HTMLElement,
  elements: HTMLElement[],
  point: { x: number; y: number },
  axis: "x" | "y" | "xy"
) {
  const box = container.getBoundingClientRect()
  const scaleX = container.offsetWidth ? box.width / container.offsetWidth : 1
  const scaleY = container.offsetHeight
    ? box.height / container.offsetHeight
    : 1
  let containing: HTMLElement | null = null
  let nearest: HTMLElement | null = null
  let nearestDistance = Infinity

  for (const element of elements) {
    const rect = measure(element, container)
    const left =
      box.left +
      (container.clientLeft + rect.left - container.scrollLeft) * scaleX
    const top =
      box.top + (container.clientTop + rect.top - container.scrollTop) * scaleY
    const width = rect.width * scaleX
    const height = rect.height * scaleY
    const insideX = point.x >= left && point.x <= left + width
    const insideY = point.y >= top && point.y <= top + height

    let distance: number
    if (axis === "xy") {
      if (insideX && insideY) containing = element
      distance = Math.hypot(
        point.x - (left + width / 2),
        point.y - (top + height / 2)
      )
    } else if (axis === "x") {
      if (insideX) containing = element
      distance = Math.abs(point.x - (left + width / 2))
    } else {
      if (insideY) containing = element
      distance = Math.abs(point.y - (top + height / 2))
    }
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = element
    }
  }
  return containing ?? nearest
}

type Overlay = { rect: Rect | null; session: number; animate: boolean }

// React events bubble through portals, so a submenu's events reach its parent
// menu. Only events from inside the container's own DOM count.
function isOwnEvent(event: React.SyntheticEvent) {
  return (event.currentTarget as Node).contains(event.target as Node)
}

export function useFluidHover<T extends HTMLElement = HTMLElement>({
  items,
  disabled = DEFAULT_DISABLED,
  selected,
  highlighted,
  axis = "y",
  gapClick = true,
}: FluidHoverOptions) {
  const containerRef = React.useRef<T | null>(null)
  const litRef = React.useRef<HTMLElement | null>(null)
  const pointerInside = React.useRef(false)
  const frame = React.useRef<number | null>(null)
  // The container often mounts later than the component (popups render in a
  // portal only while open), so observers attach when it actually mounts.
  const [container, setContainer] = React.useState<T | null>(null)
  const attach = React.useCallback((element: T | null) => {
    containerRef.current = element
    if (!element) {
      // The popup unmounted: a fresh open starts outside the pointer session.
      pointerInside.current = false
      litRef.current?.removeAttribute(ACTIVE_ATTR)
      litRef.current = null
    }
    setContainer(element)
  }, [])

  // Items that belong to this container, not to a nested fluid container
  // (a submenu rendered inside it, or portalled content).
  const ownItems = React.useCallback((selector: string) => {
    const container = containerRef.current
    if (!container) return []
    return Array.from(container.querySelectorAll<HTMLElement>(selector)).filter(
      (element) => element.closest("[data-fluid-hover]") === container
    )
  }, [])
  const [hover, setHover] = React.useState<Overlay>({
    rect: null,
    session: 0,
    animate: false,
  })
  const [selection, setSelection] = React.useState<Overlay>({
    rect: null,
    session: 0,
    animate: false,
  })

  const getItems = React.useCallback(
    () =>
      ownItems(items).filter(
        (element) => !element.matches(disabled) && element.offsetParent !== null
      ),
    [items, disabled, ownItems]
  )

  const light = React.useCallback((element: HTMLElement | null) => {
    const container = containerRef.current
    if (litRef.current !== element) {
      litRef.current?.removeAttribute(ACTIVE_ATTR)
      element?.setAttribute(ACTIVE_ATTR, "")
      litRef.current = element
    }
    const rect = element && container ? measure(element, container) : null
    setHover((current) => {
      if (sameRect(current.rect, rect)) return current
      // Appearing (from nothing) fades in place; moving glides.
      return { rect, session: current.session, animate: current.rect !== null }
    })
  }, [])

  const syncSelection = React.useCallback(() => {
    const container = containerRef.current
    if (!container || !selected) return
    const element = ownItems(selected)[0] ?? null
    const rect =
      element && element.offsetParent !== null
        ? measure(element, container)
        : null
    setSelection((current) => {
      if (sameRect(current.rect, rect)) return current
      return {
        rect,
        session: current.session,
        // Slide between selected items; snap when one first appears.
        animate: current.rect !== null && rect !== null,
      }
    })
  }, [selected, ownItems])

  const syncHighlighted = React.useCallback(() => {
    if (!containerRef.current || !highlighted || pointerInside.current) return
    light(ownItems(highlighted)[0] ?? null)
  }, [highlighted, light, ownItems])

  // Selection and keyboard highlight follow the primitive's attributes.
  React.useEffect(() => {
    if (!container) return
    syncSelection()
    syncHighlighted()
    const observer = new MutationObserver(() => {
      syncSelection()
      syncHighlighted()
      if (litRef.current && !litRef.current.isConnected) light(null)
    })
    observer.observe(container, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-highlighted",
        "data-focused",
        "data-selected",
        "data-checked",
        "data-active",
        "data-state",
        "data-pressed",
        "aria-selected",
        "aria-checked",
        "aria-pressed",
        "aria-current",
        "data-disabled",
        "data-popup-open",
        "aria-expanded",
      ],
    })
    // Keyboard focus moves the highlight too (e.g. tabs, where arrow keys
    // move focus without changing any attribute), when the pointer is away.
    const onFocusIn = (event: FocusEvent) => {
      if (pointerInside.current) return
      const target = event.target as HTMLElement
      const item = target.closest<HTMLElement>(items)
      if (
        item &&
        item.closest("[data-fluid-hover]") === container &&
        !item.matches(disabled) &&
        target.matches(":focus-visible")
      ) {
        light(item)
      }
    }
    const onFocusOut = (event: FocusEvent) => {
      if (pointerInside.current) return
      if (container.contains(event.relatedTarget as Node | null)) return
      light(null)
      syncHighlighted()
    }
    container.addEventListener("focusin", onFocusIn)
    container.addEventListener("focusout", onFocusOut)
    const resize = new ResizeObserver(() => {
      syncSelection()
      if (litRef.current) light(litRef.current)
    })
    resize.observe(container)
    return () => {
      observer.disconnect()
      resize.disconnect()
      container.removeEventListener("focusin", onFocusIn)
      container.removeEventListener("focusout", onFocusOut)
    }
  }, [container, items, disabled, light, syncSelection, syncHighlighted])

  React.useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = null
      // Forget the lit item too: effects can re-run without a remount (React
      // StrictMode), and `light` skips an item it believes is already lit.
      litRef.current?.removeAttribute(ACTIVE_ATTR)
      litRef.current = null
    },
    []
  )

  const onPointerEnter = React.useCallback((event: React.PointerEvent) => {
    if (event.pointerType !== "mouse" || !isOwnEvent(event)) return
    pointerInside.current = true
    setHover((current) => ({ ...current, session: current.session + 1 }))
  }, [])

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse" || !isOwnEvent(event)) return
      pointerInside.current = true
      const point = { x: event.clientX, y: event.clientY }
      if (frame.current !== null) cancelAnimationFrame(frame.current)
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        const container = containerRef.current
        if (!container) return
        const along =
          axis === "auto"
            ? (container.getAttribute("aria-orientation") ??
                container.getAttribute("data-orientation")) === "vertical"
              ? "y"
              : "x"
            : axis
        light(pickNearest(container, getItems(), point, along))
      })
    },
    [axis, getItems, light]
  )

  const onPointerLeave = React.useCallback(() => {
    pointerInside.current = false
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = null
    light(null)
    syncHighlighted()
  }, [light, syncHighlighted])

  const onClick = React.useCallback(
    (event: React.MouseEvent) => {
      if (!gapClick || !isOwnEvent(event)) return
      const target = event.target as HTMLElement
      const lit = litRef.current
      if (!lit || lit.matches(disabled)) return
      if (getItems().some((element) => element.contains(target))) return
      if (
        target.closest("input, textarea, select, button, a, [contenteditable]")
      )
        return
      lit.click()
    },
    [gapClick, disabled, getItems]
  )

  return {
    /** Ref callback for the container (pass it to `ref`, or merge it with
     *  `useMergedRef`). Not named `ref`, so the React Compiler doesn't treat
     *  the whole return value as a ref. */
    attach,
    /** Spread onto the container. `data-fluid-hover` lets styles switch off
     *  per-item hover backgrounds inside a fluid container. */
    props: {
      "data-fluid-hover": "",
      onPointerEnter,
      onPointerMove,
      onPointerLeave,
      onClick,
    },
    hover,
    selection,
  }
}

type OverlayProps = {
  overlay: Overlay
  className?: string
} & Omit<React.ComponentProps<"span">, "children">

function FluidHoverOverlay({
  overlay,
  className,
  style,
  ...props
}: OverlayProps) {
  const { rect, animate } = overlay
  return (
    <span
      aria-hidden
      data-visible={rect ? "" : undefined}
      data-animate={animate ? "" : undefined}
      className={cn(
        "pointer-events-none absolute top-0 left-0 -z-10 opacity-0 data-visible:opacity-100",
        className
      )}
      style={{
        ...(rect && {
          transform: `translate(${rect.left}px, ${rect.top}px)`,
          width: rect.width,
          height: rect.height,
        }),
        ...style,
      }}
      {...props}
    />
  )
}

/** The hover highlight. Render it as the first child of the container. */
function FluidHoverHighlight({
  hover,
  className,
  ...props
}: { hover: Overlay } & Omit<OverlayProps, "overlay">) {
  return (
    <FluidHoverOverlay
      key={hover.session}
      overlay={hover}
      data-slot="fluid-hover-highlight"
      className={cn("cn-fluid-hover-highlight", className)}
      {...props}
    />
  )
}

/** The selection background. Render it before the highlight. */
function FluidHoverSelection({
  selection,
  className,
  ...props
}: { selection: Overlay } & Omit<OverlayProps, "overlay">) {
  return (
    <FluidHoverOverlay
      overlay={selection}
      data-slot="fluid-hover-selection"
      className={cn("cn-fluid-hover-selection", className)}
      {...props}
    />
  )
}

/** Merge the container ref with a ref passed by the consumer. */
function useMergedRef<T>(...refs: Array<React.Ref<T> | undefined>) {
  return React.useCallback(
    (value: T | null) => {
      for (const ref of refs) {
        if (typeof ref === "function") ref(value)
        else if (ref) (ref as React.RefObject<T | null>).current = value
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    refs
  )
}

export { FluidHoverHighlight, FluidHoverSelection, pickNearest, useMergedRef }
