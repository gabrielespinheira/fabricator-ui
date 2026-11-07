"use client"

// Fabricator Sidebar. Keeps the upstream API (every export, prop, variant and
// data-slot) and adds:
//
// - SidebarRail drags to resize (clamped, past the minimum it collapses) and
//   clicks to collapse; its tooltip explains both with the shortcut.
// - `peek` reveals a collapsed sidebar as a floating card from its edge.
// - SidebarTrigger morphs its panel glyph between states and names the
//   shortcut in a tooltip.
// - SidebarGroup `collapsible` turns the label into an accordion toggle;
//   SidebarMenuSub `open` collapses a sub-tree on the moderate spring.
// - SidebarMenuButton `icon`, `status` and `dot`; SidebarGroupActions and
//   SidebarMenuActions clusters; arrow keys move between rows.
// - Each menu is a fluid hover container.
// - SidebarProvider `mobileSidebar="reveal"` shows the phone sidebar behind the
//   page instead of in a sheet over it.
//
// Motion is CSS on the motion tokens, so --motion-scale reaches all of it.
import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { useIsMobile } from "@/registry/base-fabricator/hooks/use-mobile"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/base-fabricator/lib/fluid-hover"
import {
  getRevealDragProgress,
  shouldRevealStayOpen,
  TOGGLE_GLYPH,
} from "@/registry/base-fabricator/lib/sidebar-model"
import { Button } from "@/registry/base-fabricator/ui/button"
import { Input } from "@/registry/base-fabricator/ui/input"
import { Kbd } from "@/registry/base-fabricator/ui/kbd"
import { Separator } from "@/registry/base-fabricator/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/registry/base-fabricator/ui/sheet"
import { Skeleton } from "@/registry/base-fabricator/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/base-fabricator/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
// A collapsed row (--density-32) plus the group padding on each side.
const SIDEBAR_WIDTH_ICON = "calc(var(--density-32) + 2 * var(--density-8))"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
/** Drag-resize clamp for SidebarRail (px). */
const SIDEBAR_MIN_WIDTH = 160
const SIDEBAR_MAX_WIDTH = 360
/** Dragging this far past the minimum collapses instead of bottoming out. */
const SIDEBAR_COLLAPSE_SLOP = 56
/** Hover-peek intent and leave delays (ms). */
const SIDEBAR_PEEK_DELAY = 150
const SIDEBAR_PEEK_DISMISS_DELAY = 250

/** A press on the page moves this far before it counts as a drag (px). */
const REVEAL_DRAG_SLOP = 4

type SidebarSide = "left" | "right"
type SidebarMobile = "sheet" | "reveal"
type SidebarPeek = "none" | "hover" | "click"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>
  isMobile: boolean
  /** How the sidebar shows on phones. */
  mobileSidebar: SidebarMobile
  toggleSidebar: () => void
  /** Live width; SidebarRail's drag updates it. */
  width: string
  setWidth: (width: string) => void
  /** The edge the Sidebar sits on (reported by <Sidebar />). */
  side: SidebarSide
  /** The toggle shortcut ("mod+b", "[", …), or null when disabled. */
  shortcut: string | null
  peek: SidebarPeek
  /** True while a collapsed sidebar shows as a floating card. */
  isPeeking: boolean
  setIsPeeking: React.Dispatch<React.SetStateAction<boolean>>
  /** True while SidebarRail is being dragged. */
  isResizing: boolean
}

type SidebarInternalContextProps = {
  registerSide: (side: SidebarSide) => void
  collapsible: "offcanvas" | "icon" | "none" | null
  registerCollapsible: (collapsible: "offcanvas" | "icon" | "none") => void
  setIsResizing: React.Dispatch<React.SetStateAction<boolean>>
  // One hover-intent timer serves every surface that can float the sidebar
  // out (the edge strip, the trigger, the card itself), so moving between
  // them cancels a pending dismissal instead of racing a second timer.
  schedulePeek: () => void
  scheduleDismissPeek: () => void
  cancelPeekTimer: () => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)
const SidebarInternalContext =
  React.createContext<SidebarInternalContextProps | null>(null)

function useSidebar() {
  const context = React.useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function useSidebarInternal() {
  const context = React.useContext(SidebarInternalContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }

  return context
}

function parseShortcut(shortcut: string) {
  const parts = shortcut.toLowerCase().split("+")
  const key = parts.pop() || "+"
  return { key, mod: parts.includes("mod") }
}

const subscribeNoop = () => () => {}

// Server and first client render agree on ⌘; the client corrects it.
function useIsApple() {
  return React.useSyncExternalStore(
    subscribeNoop,
    () => /Mac|iPhone|iPad|iPod/.test(navigator.platform),
    () => true
  )
}

/** The shortcut as a keycap label: "⌘B", "Ctrl B", "[". */
function useShortcutLabel(shortcut: string) {
  const isApple = useIsApple()
  const { key, mod } = parseShortcut(shortcut)
  const label = key.length === 1 ? key.toUpperCase() : key
  if (!mod) return label
  return isApple ? `⌘${label}` : `Ctrl ${label}`
}

// Mounted providers, for the global shortcut. Only one provider answers a
// keypress: the innermost one containing focus or, with focus outside every
// provider, the outermost one (an app shell wrapping nested demos).
const mountedProviders: HTMLElement[] = []

function shouldAnswerShortcut(root: HTMLElement, target: HTMLElement) {
  if (root.contains(target)) {
    // A nested provider closer to the focus answers instead.
    return !mountedProviders.some(
      (element) =>
        element !== root && root.contains(element) && element.contains(target)
    )
  }
  if (mountedProviders.some((element) => element.contains(target))) {
    return false
  }
  const outermost = mountedProviders.find(
    (element) =>
      !mountedProviders.some(
        (other) => other !== element && other.contains(element)
      )
  )
  return outermost === root
}

function isTypingTarget(target: HTMLElement) {
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  )
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  persist = true,
  shortcut = `mod+${SIDEBAR_KEYBOARD_SHORTCUT}`,
  peek = "none",
  width: widthProp,
  widthMobile = SIDEBAR_WIDTH_MOBILE,
  mobileSidebar: mobileSidebarProp = "sheet",
  onWidthChange,
  className,
  style,
  children,
  ref,
  ...props
}: React.ComponentProps<"div"> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Save the desktop state to the `sidebar_state` cookie. Default true. */
  persist?: boolean
  /**
   * The toggle shortcut: a key, optionally with `mod+` for ⌘ (macOS) or Ctrl.
   * Default "mod+b". A bare key ("[") is ignored while typing. null disables.
   */
  shortcut?: string | null
  /**
   * While collapsed, reveal the sidebar as a floating card from its edge, on
   * hover (after a short intent delay) or on click. Default "none".
   */
  peek?: SidebarPeek
  /** Starting width (SidebarRail resizes it). Default 16rem. */
  width?: string
  /** Width of the mobile drawer. Default 18rem. */
  widthMobile?: string
  /**
   * On phones: a sheet over the page, or `reveal`, where the page moves aside
   * and shrinks to show the sidebar behind it. Default "sheet".
   */
  mobileSidebar?: SidebarMobile
  /** Called once when a SidebarRail resize ends, with the new width. */
  onWidthChange?: (width: string) => void
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [side, setSide] = React.useState<SidebarSide>("left")
  const [collapsible, setCollapsible] = React.useState<
    "offcanvas" | "icon" | "none"
  >("offcanvas")
  // A sidebar that never collapses stays in the layout, so nothing to reveal.
  const mobileSidebar = collapsible === "none" ? "sheet" : mobileSidebarProp
  const wrapperRef = React.useRef<HTMLDivElement | null>(null)
  const mergedRef = useMergedRef(wrapperRef, ref)

  React.useEffect(() => {
    const element = wrapperRef.current
    if (!element) return
    mountedProviders.push(element)
    return () => {
      const index = mountedProviders.indexOf(element)
      if (index !== -1) mountedProviders.splice(index, 1)
    }
  }, [])

  // The width starts from the prop (or a --sidebar-width the consumer set in
  // `style`, the upstream way) and SidebarRail updates it. A new starting
  // width resets it, during that render.
  const startWidth =
    widthProp ??
    ((style as Record<string, string> | undefined)?.["--sidebar-width"] ||
      SIDEBAR_WIDTH)
  const [width, setWidth] = React.useState(startWidth)
  const [syncedStartWidth, setSyncedStartWidth] = React.useState(startWidth)
  if (syncedStartWidth !== startWidth) {
    setSyncedStartWidth(startWidth)
    setWidth(startWidth)
  }
  const [isResizing, setIsResizing] = React.useState(false)

  // Report the width once a rail drag ends, not on every frame of it.
  const onWidthChangeRef = React.useRef(onWidthChange)
  const wasResizing = React.useRef(false)
  React.useLayoutEffect(() => {
    onWidthChangeRef.current = onWidthChange
  })
  React.useEffect(() => {
    if (wasResizing.current && !isResizing) onWidthChangeRef.current?.(width)
    wasResizing.current = isResizing
  }, [isResizing, width])

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = React.useState(defaultOpen)
  const open = openProp ?? _open
  const openRef = React.useRef(open)
  React.useLayoutEffect(() => {
    openRef.current = open
  })
  const setOpen = React.useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState =
        typeof value === "function" ? value(openRef.current) : value
      openRef.current = openState
      if (setOpenProp) {
        setOpenProp(openState)
      } else {
        _setOpen(openState)
      }

      // This sets the cookie to keep the sidebar state.
      if (persist) {
        document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
      }
    },
    [setOpenProp, persist]
  )

  // Helper to toggle the sidebar.
  const toggleSidebar = React.useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open)
  }, [isMobile, setOpen, setOpenMobile])

  // Peek: pinning the sidebar open, or turning peek off, ends a peek and
  // drops a pending intent timer.
  const [isPeeking, setIsPeeking] = React.useState(false)
  const peekTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const peekAllowed = peek !== "none" && collapsible === "offcanvas"
  if ((open || !peekAllowed) && isPeeking) setIsPeeking(false)
  const cancelPeekTimer = React.useCallback(() => {
    if (peekTimer.current) clearTimeout(peekTimer.current)
    peekTimer.current = null
  }, [])
  React.useEffect(() => {
    if (open || !peekAllowed) cancelPeekTimer()
  }, [open, peekAllowed, cancelPeekTimer])
  const schedulePeek = React.useCallback(() => {
    cancelPeekTimer()
    peekTimer.current = setTimeout(() => setIsPeeking(true), SIDEBAR_PEEK_DELAY)
  }, [cancelPeekTimer])
  const scheduleDismissPeek = React.useCallback(() => {
    cancelPeekTimer()
    peekTimer.current = setTimeout(
      () => setIsPeeking(false),
      SIDEBAR_PEEK_DISMISS_DELAY
    )
  }, [cancelPeekTimer])
  React.useEffect(() => cancelPeekTimer, [cancelPeekTimer])

  // Adds a keyboard shortcut to toggle the sidebar.
  React.useEffect(() => {
    if (shortcut == null) return
    const { key, mod } = parseShortcut(shortcut)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== key || event.altKey) return
      const target = event.target as HTMLElement
      if (mod) {
        if (!(event.metaKey || event.ctrlKey)) return
      } else if (event.metaKey || event.ctrlKey || isTypingTarget(target)) {
        // A bare key leaves ⌘[ / ⌘] to the browser and typing alone.
        return
      }
      const root = wrapperRef.current
      if (!root || !shouldAnswerShortcut(root, target)) return
      event.preventDefault()
      toggleSidebar()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [shortcut, toggleSidebar])

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? "expanded" : "collapsed"

  const contextValue = React.useMemo<SidebarContextProps>(
    () => ({
      state,
      open,
      setOpen,
      isMobile,
      mobileSidebar,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      width,
      setWidth,
      side,
      shortcut,
      peek: peekAllowed ? peek : "none",
      isPeeking,
      setIsPeeking,
      isResizing,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      mobileSidebar,
      openMobile,
      setOpenMobile,
      toggleSidebar,
      width,
      side,
      shortcut,
      peekAllowed,
      peek,
      isPeeking,
      isResizing,
    ]
  )

  const internalValue = React.useMemo<SidebarInternalContextProps>(
    () => ({
      registerSide: setSide,
      collapsible,
      registerCollapsible: setCollapsible,
      setIsResizing,
      schedulePeek,
      scheduleDismissPeek,
      cancelPeekTimer,
    }),
    [collapsible, schedulePeek, scheduleDismissPeek, cancelPeekTimer]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <SidebarInternalContext.Provider value={internalValue}>
        <div
          ref={mergedRef}
          data-slot="sidebar-wrapper"
          data-reveal={
            isMobile && mobileSidebar === "reveal"
              ? openMobile
                ? "open"
                : "closed"
              : undefined
          }
          data-reveal-side={
            isMobile && mobileSidebar === "reveal" ? side : undefined
          }
          style={
            {
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              "--sidebar-width-mobile": widthMobile,
              ...style,
              "--sidebar-width": width,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full [--sidebar-reveal-direction:1] [--sidebar-reveal-scale:0.88] [--sidebar-reveal-width:min(var(--sidebar-width-mobile),calc(100%-56px))] has-data-[variant=inset]:bg-sidebar data-reveal:relative data-reveal:overflow-hidden data-reveal:bg-sidebar data-[reveal-side=right]:[--sidebar-reveal-direction:-1]",
            className
          )}
          {...props}
        >
          {children}
        </div>
      </SidebarInternalContext.Provider>
    </SidebarContext.Provider>
  )
}

/**
 * The phone sidebar as a surface behind the page: SidebarInset moves aside and
 * shrinks to uncover it, with the rest of the page still in view. The page is
 * inert while it is open. Focus moves in and returns; Escape, a tap on the page
 * or dragging the page back closes it.
 */
function SidebarReveal({
  side,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { side: SidebarSide }) {
  const { openMobile, setOpenMobile } = useSidebar()
  const surfaceRef = React.useRef<HTMLDivElement>(null)
  const previousFocus = React.useRef<Element | null>(null)
  const wasDragged = React.useRef(false)
  const drag = React.useRef<{
    startX: number
    lastX: number
    lastTime: number
    velocity: number
  } | null>(null)

  // Read before the page turns inert, which drops focus from the trigger.
  React.useLayoutEffect(() => {
    if (openMobile) previousFocus.current = document.activeElement
  }, [openMobile])

  React.useEffect(() => {
    if (!openMobile) return
    surfaceRef.current?.focus({ preventScroll: true })
    return () => {
      const previous = previousFocus.current
      if (previous instanceof HTMLElement) {
        previous.focus({ preventScroll: true })
      }
    }
  }, [openMobile])

  const toDelta = (clientX: number, startX: number) =>
    side === "left" ? clientX - startX : startX - clientX

  const getProgress = (clientX: number, startX: number) =>
    getRevealDragProgress({
      deltaX: toDelta(clientX, startX),
      width: surfaceRef.current?.offsetWidth ?? 1,
    })

  const endDrag = (button: HTMLElement) => {
    const wrapper = button.closest<HTMLElement>('[data-slot="sidebar-wrapper"]')
    wrapper?.removeAttribute("data-reveal-dragging")
    wrapper?.style.removeProperty("--sidebar-reveal-progress")
    drag.current = null
  }

  return (
    <>
      <div
        ref={surfaceRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sidebar"
        tabIndex={-1}
        inert={!openMobile}
        data-sidebar="sidebar"
        data-slot="sidebar"
        data-mobile="true"
        data-side={side}
        data-state={openMobile ? "open" : "closed"}
        className={cn(
          "absolute inset-y-0 z-0 flex w-(--sidebar-reveal-width) [transform:translateX(calc(var(--sidebar-reveal-width)*var(--sidebar-reveal-direction)*-0.12*(1-var(--sidebar-reveal-amount))))] flex-col text-sidebar-foreground opacity-(--sidebar-reveal-opacity) transition-[transform,opacity] duration-sheet-exit ease-drawer outline-none [--sidebar-reveal-amount:0] [--sidebar-reveal-opacity:calc(0.5+0.5*var(--sidebar-reveal-amount))] group-data-reveal-dragging/sidebar-wrapper:transition-none data-[side=left]:start-0 data-[side=right]:end-0 motion-reduce:transition-none data-open:duration-sheet data-open:[--sidebar-reveal-amount:var(--sidebar-reveal-progress,1)]",
          className
        )}
        onKeyDown={(event) => {
          // A menu in a portal bubbles here too; it closes itself.
          const isInside =
            event.target instanceof Node &&
            event.currentTarget.contains(event.target)
          if (event.key === "Escape" && isInside) setOpenMobile(false)
        }}
        {...props}
      >
        <div
          data-slot="sidebar-inner"
          className="flex h-full w-full flex-col bg-sidebar transition-[border-radius,box-shadow,background-color] duration-move ease-move group-data-peeking:rounded-xl group-data-peeking:bg-surface-3 group-data-peeking:shadow-surface-3 group-data-[variant=floating]:rounded-xl group-data-[variant=floating]:shadow-surface-2"
        >
          {children}
        </div>
      </div>
      {openMobile && (
        <button
          type="button"
          aria-label="Close sidebar"
          data-slot="sidebar-reveal-close"
          data-side={side}
          className="absolute inset-y-0 z-20 cursor-pointer touch-none outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset data-[side=left]:start-(--sidebar-reveal-width) data-[side=left]:end-0 data-[side=right]:start-0 data-[side=right]:end-(--sidebar-reveal-width)"
          onClick={() => {
            if (!wasDragged.current) setOpenMobile(false)
            wasDragged.current = false
          }}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            wasDragged.current = false
            drag.current = {
              startX: event.clientX,
              lastX: event.clientX,
              lastTime: event.timeStamp,
              velocity: 0,
            }
          }}
          onPointerMove={(event) => {
            const current = drag.current
            if (!current) return
            if (Math.abs(event.clientX - current.startX) < REVEAL_DRAG_SLOP) {
              return
            }
            wasDragged.current = true
            const elapsed = event.timeStamp - current.lastTime
            if (elapsed > 0) {
              current.velocity = toDelta(event.clientX, current.lastX) / elapsed
              current.lastX = event.clientX
              current.lastTime = event.timeStamp
            }
            const wrapper = event.currentTarget.closest<HTMLElement>(
              '[data-slot="sidebar-wrapper"]'
            )
            wrapper?.setAttribute("data-reveal-dragging", "")
            wrapper?.style.setProperty(
              "--sidebar-reveal-progress",
              String(getProgress(event.clientX, current.startX))
            )
          }}
          onPointerUp={(event) => {
            const current = drag.current
            endDrag(event.currentTarget)
            if (!current || !wasDragged.current) return
            const stayOpen = shouldRevealStayOpen({
              progress: getProgress(current.lastX, current.startX),
              velocity: current.velocity,
              restedFor: event.timeStamp - current.lastTime,
            })
            if (!stayOpen) setOpenMobile(false)
          }}
          onPointerCancel={(event) => endDrag(event.currentTarget)}
        />
      )}
    </>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  bordered = true,
  className,
  children,
  dir,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
  /** The `sidebar` variant's inner-edge border. Default true. */
  bordered?: boolean
}) {
  const {
    isMobile,
    mobileSidebar,
    state,
    openMobile,
    setOpenMobile,
    peek,
    isPeeking,
  } = useSidebar()
  const { registerSide, registerCollapsible } = useSidebarInternal()

  // The provider mirrors these into peek and the shortcut tooltips.
  React.useEffect(() => registerSide(side), [side, registerSide])
  React.useEffect(
    () => registerCollapsible(collapsible),
    [collapsible, registerCollapsible]
  )

  if (collapsible === "none") {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          "flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }

  if (isMobile && mobileSidebar === "reveal") {
    return (
      <SidebarReveal side={side} className={className} {...props}>
        {children}
      </SidebarReveal>
    )
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          dir={dir}
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          className="w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
          style={
            {
              "--sidebar-width": "var(--sidebar-width-mobile)",
            } as React.CSSProperties
          }
          side={side}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <SidebarDesktop
      side={side}
      variant={variant}
      collapsible={collapsible}
      bordered={bordered}
      state={state}
      peeking={peek !== "none" && state === "collapsed" && isPeeking}
      className={className}
      {...props}
    >
      {children}
    </SidebarDesktop>
  )
}

function SidebarDesktop({
  side,
  variant,
  collapsible,
  bordered,
  state,
  peeking,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side: SidebarSide
  variant: "sidebar" | "floating" | "inset"
  collapsible: "offcanvas" | "icon"
  bordered: boolean
  state: "expanded" | "collapsed"
  peeking: boolean
}) {
  const { peek, isPeeking, setIsPeeking, isResizing } = useSidebar()
  const { schedulePeek, scheduleDismissPeek, cancelPeekTimer } =
    useSidebarInternal()
  const rootRef = React.useRef<HTMLDivElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const peekArmed = peek !== "none" && state === "collapsed" && !isResizing

  // While peeking: Escape and an outside press dismiss. Hover mode holds the
  // peek by geometry, not enter/leave: a portalled tooltip or menu over the
  // card fires pointerleave although the pointer never left the sidebar.
  React.useEffect(() => {
    if (!(peekArmed && isPeeking)) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsPeeking(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Element
      if (rootRef.current?.contains(target)) return
      // A press in a popup the card opened (a row's menu) isn't outside.
      if (target.closest?.('[role="menu"], [role="listbox"], [role="dialog"]'))
        return
      setIsPeeking(false)
    }
    let wasInside = true
    const onPointerMove = (event: PointerEvent) => {
      const card = containerRef.current
      if (!card) return
      const box = card.getBoundingClientRect()
      const inside =
        event.clientX >= box.left - 8 &&
        event.clientX <= box.right + 8 &&
        event.clientY >= box.top - 8 &&
        event.clientY <= box.bottom + 8
      if (inside) {
        wasInside = true
        cancelPeekTimer()
      } else if (wasInside) {
        wasInside = false
        scheduleDismissPeek()
      }
    }
    document.addEventListener("keydown", onKeyDown)
    document.addEventListener("pointerdown", onPointerDown)
    if (peek === "hover")
      document.addEventListener("pointermove", onPointerMove)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("pointermove", onPointerMove)
    }
  }, [
    peekArmed,
    isPeeking,
    setIsPeeking,
    peek,
    cancelPeekTimer,
    scheduleDismissPeek,
  ])

  return (
    <div
      ref={rootRef}
      className="group peer hidden text-sidebar-foreground md:block"
      data-state={state}
      // A peeking sidebar lays out as expanded (the container slides back in)
      // while its gap stays closed and data-state stays collapsed.
      data-collapsible={state === "collapsed" && !peeking ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      data-peek={peekArmed ? peek : undefined}
      data-peeking={peeking ? "" : undefined}
      data-resizing={isResizing ? "" : undefined}
      data-slot="sidebar"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          "relative w-(--sidebar-width) bg-transparent transition-[width] duration-move ease-move group-data-[collapsible=icon]:duration-move-exit group-data-[collapsible=icon]:ease-exit group-data-[collapsible=offcanvas]:duration-move-exit group-data-[collapsible=offcanvas]:ease-exit motion-reduce:transition-none",
          "group-data-peeking:w-0 group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          "group-data-resizing:transition-none",
          variant === "floating"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        )}
      />
      <div
        ref={containerRef}
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          "fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width,padding] duration-move ease-move group-data-peeking:z-50 group-data-resizing:transition-none group-data-[collapsible=icon]:duration-move-exit group-data-[collapsible=icon]:ease-exit group-data-[collapsible=offcanvas]:duration-move-exit group-data-[collapsible=offcanvas]:ease-exit data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] motion-reduce:transition-none md:flex",
          // A floating card has room all round. Inset runs the full height:
          // its rows keep 8px from every edge, the main card's own margin, and
          // a peek floats as a card.
          variant === "floating" &&
            "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]",
          variant === "inset" &&
            "group-data-peeking:p-2 group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
          variant === "sidebar" &&
            cn(
              "group-data-peeking:py-2 group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
              bordered &&
                !peeking &&
                "group-data-[side=left]:border-r group-data-[side=right]:border-l"
            ),
          className
        )}
        onPointerEnter={
          peekArmed && peek === "hover" ? cancelPeekTimer : undefined
        }
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="flex size-full flex-col bg-sidebar transition-[border-radius,box-shadow,background-color] duration-move ease-move group-data-peeking:rounded-xl group-data-peeking:bg-surface-3 group-data-peeking:shadow-surface-3 group-data-[variant=floating]:rounded-xl group-data-[variant=floating]:shadow-surface-2"
        >
          {children}
        </div>
      </div>
      {peekArmed && (
        // The collapsed sidebar's reveal affordance: a strip on its edge
        // whose hairline brightens on hover.
        <button
          type="button"
          data-sidebar="peek-strip"
          data-slot="sidebar-peek-strip"
          data-side={side}
          aria-label="Show sidebar"
          aria-expanded={isPeeking}
          className="fixed inset-y-0 z-40 w-3 cursor-pointer outline-none after:absolute after:inset-y-0 after:w-px after:bg-border after:opacity-0 after:transition-opacity after:duration-feedback hover:after:opacity-100 focus-visible:after:bg-ring focus-visible:after:opacity-100 data-[side=left]:left-0 data-[side=left]:after:left-0 data-[side=right]:right-0 data-[side=right]:after:right-0"
          onPointerEnter={
            peek === "hover"
              ? (event) => {
                  if (event.pointerType === "mouse") schedulePeek()
                }
              : undefined
          }
          onPointerLeave={
            peek === "hover"
              ? () => {
                  if (!isPeeking) cancelPeekTimer()
                }
              : undefined
          }
          onClick={() => {
            cancelPeekTimer()
            setIsPeeking(true)
          }}
        />
      )}
    </div>
  )
}

// The panel glyph (lib/sidebar-model). The path morphs on the move timing where
// CSS `d` transitions are supported, and swaps elsewhere.

function SidebarToggleIcon({
  open,
  side,
  className,
}: {
  open: boolean
  side: SidebarSide
  className?: string
}) {
  const panel = open ? TOGGLE_GLYPH.panelOpen : TOGGLE_GLYPH.panelClosed

  return (
    <svg
      data-slot="sidebar-toggle-icon"
      data-state={open ? "open" : "closed"}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        "size-[calc(var(--density-icon-16)*1.125)]",
        side === "right" && "-scale-x-100",
        className
      )}
    >
      <path
        d={TOGGLE_GLYPH.frame}
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={panel}
        className="fill-background transition-[d] duration-move ease-move motion-reduce:transition-none"
        style={{ d: `path("${panel}")` } as React.CSSProperties}
      />
    </svg>
  )
}

function SidebarTrigger({
  className,
  onClick,
  onPointerEnter,
  onPointerLeave,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const {
    toggleSidebar,
    open,
    openMobile,
    isMobile,
    side,
    shortcut,
    peek,
    isPeeking,
  } = useSidebar()
  const { schedulePeek, cancelPeekTimer } = useSidebarInternal()
  const expanded = isMobile ? openMobile : open
  // With hover peek, resting on the collapsed trigger floats the sidebar out
  // like the edge strip does (the same intent timer).
  const hoverPeek = peek === "hover" && !isMobile && !open

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon-sm"
            className={cn(className)}
            onClick={(event) => {
              onClick?.(event)
              toggleSidebar()
            }}
            onPointerEnter={(event) => {
              onPointerEnter?.(event)
              if (!hoverPeek || event.pointerType !== "mouse") return
              if (isPeeking) cancelPeekTimer()
              else schedulePeek()
            }}
            onPointerLeave={(event) => {
              onPointerLeave?.(event)
              // While peeking, the card's geometry watcher owns dismissal.
              if (hoverPeek && !isPeeking) cancelPeekTimer()
            }}
            {...props}
          />
        }
      >
        {children ?? <SidebarToggleIcon open={expanded} side={side} />}
        <span className="sr-only">Toggle Sidebar</span>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {expanded ? "Collapse sidebar" : "Expand sidebar"}
        {shortcut != null && <SidebarShortcutKbd shortcut={shortcut} />}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarShortcutKbd({ shortcut }: { shortcut: string }) {
  return <Kbd className="-my-1">{useShortcutLabel(shortcut)}</Kbd>
}

function SidebarRail({
  className,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  ...props
}: React.ComponentProps<"button">) {
  const { toggleSidebar, setOpen, setWidth, side, state, shortcut } =
    useSidebar()
  const { setIsResizing } = useSidebarInternal()
  const drag = React.useRef<{
    startX: number
    startWidth: number
    moved: boolean
    collapsed: boolean
  } | null>(null)
  const [dragging, setDragging] = React.useState(false)
  const [tooltipOpen, setTooltipOpen] = React.useState(false)
  const expanded = state === "expanded"

  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerDown?.(event)
    if (event.button !== 0) return
    // Only an expanded sidebar resizes; a collapsed one opens on click.
    const container = event.currentTarget.closest<HTMLElement>(
      '[data-slot="sidebar-container"]'
    )
    if (!container || !expanded) {
      drag.current = {
        startX: event.clientX,
        startWidth: 0,
        moved: false,
        collapsed: true,
      }
      return
    }
    drag.current = {
      startX: event.clientX,
      startWidth: container.offsetWidth,
      moved: false,
      collapsed: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerMove?.(event)
    const current = drag.current
    if (!current || !current.startWidth) return
    const dx = event.clientX - current.startX
    if (!current.moved && Math.abs(dx) < 4) return
    if (!current.moved) {
      current.moved = true
      setDragging(true)
      setIsResizing(true)
    }
    const raw = current.startWidth + (side === "left" ? dx : -dx)
    // Dragged well past the minimum: preview the collapse, but keep the drag
    // alive so pulling back re-expands. Nothing commits until release.
    if (raw < SIDEBAR_MIN_WIDTH - SIDEBAR_COLLAPSE_SLOP) {
      if (!current.collapsed) {
        current.collapsed = true
        setWidth(`${SIDEBAR_MIN_WIDTH}px`)
        setOpen(false)
      }
      return
    }
    if (current.collapsed) {
      current.collapsed = false
      setOpen(true)
    }
    setWidth(
      `${Math.round(Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, raw)))}px`
    )
  }

  const endDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
    setIsResizing(false)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLButtonElement>) => {
    onPointerUp?.(event)
    const current = drag.current
    drag.current = null
    endDrag(event)
    // A press that never became a drag is the click: collapse or expand.
    if (current && !current.moved) toggleSidebar()
  }

  const handlePointerCancel = (
    event: React.PointerEvent<HTMLButtonElement>
  ) => {
    onPointerCancel?.(event)
    drag.current = null
    endDrag(event)
  }

  return (
    <Tooltip
      open={!dragging && tooltipOpen}
      onOpenChange={setTooltipOpen}
      trackCursorAxis="y"
    >
      <TooltipTrigger
        render={
          <button
            data-sidebar="rail"
            data-slot="sidebar-rail"
            data-dragging={dragging ? "" : undefined}
            aria-label={
              expanded ? "Resize or collapse sidebar" : "Expand sidebar"
            }
            tabIndex={-1}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            className={cn(
              // touch-none: a touch drag would otherwise scroll and cancel.
              "absolute inset-y-0 z-20 hidden w-4 cursor-col-resize touch-none group-data-[side=left]:-right-4 group-data-[side=right]:left-0 group-data-[state=collapsed]:cursor-pointer after:absolute after:inset-y-0 after:start-1/2 after:w-px after:bg-transparent after:transition-colors after:duration-feedback hover:after:bg-foreground/25 group-data-[collapsible=offcanvas]:hover:after:bg-border data-dragging:after:bg-foreground/25 sm:flex ltr:-translate-x-1/2",
              "group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full",
              "[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
              "[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
              className
            )}
            {...props}
          />
        }
      />
      <TooltipContent
        side={side === "left" ? "right" : "left"}
        sideOffset={8}
        className="py-(--density-6)"
      >
        {expanded ? (
          <span className="flex flex-col items-start gap-1.5">
            <span>
              <span className="weight-semibold">Drag</span> to resize
            </span>
            <span className="flex items-center gap-1.5">
              <span>
                <span className="weight-semibold">Click</span> to collapse
              </span>
              {shortcut != null && <SidebarShortcutKbd shortcut={shortcut} />}
            </span>
          </span>
        ) : (
          <>
            <span>
              <span className="weight-semibold">Click</span> to expand
            </span>
            {shortcut != null && <SidebarShortcutKbd shortcut={shortcut} />}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  const sidebar = React.useContext(SidebarContext)
  const isRevealOpen =
    sidebar !== null &&
    sidebar.isMobile &&
    sidebar.mobileSidebar === "reveal" &&
    sidebar.openMobile
  return (
    <main
      inert={isRevealOpen || undefined}
      data-slot="sidebar-inset"
      className={cn(
        "relative flex w-full flex-1 flex-col bg-background group-data-reveal/sidebar-wrapper:z-10 group-data-reveal/sidebar-wrapper:origin-left group-data-reveal/sidebar-wrapper:overflow-hidden group-data-reveal/sidebar-wrapper:transition-[transform,border-radius,box-shadow] group-data-reveal/sidebar-wrapper:duration-sheet-exit group-data-reveal/sidebar-wrapper:ease-drawer group-data-reveal-dragging/sidebar-wrapper:transition-none group-data-[reveal-side=right]/sidebar-wrapper:origin-right group-data-[reveal=open]/sidebar-wrapper:[transform:translateX(calc(var(--sidebar-reveal-width)*var(--sidebar-reveal-direction)*var(--sidebar-reveal-progress,1)))_scale(calc(1-(1-var(--sidebar-reveal-scale))*var(--sidebar-reveal-progress,1)))] group-data-[reveal=open]/sidebar-wrapper:rounded-2xl group-data-[reveal=open]/sidebar-wrapper:shadow-surface-6 group-data-[reveal=open]/sidebar-wrapper:duration-sheet motion-reduce:transition-none md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ms-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:bg-surface-2 md:peer-data-[variant=inset]:shadow-surface-2 md:peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-not-data-[collapsible=icon]:ms-2",
        className
      )}
      {...props}
    />
  )
}

function SidebarInput({
  className,
  ...props
}: React.ComponentProps<typeof Input>) {
  return (
    <Input
      data-slot="sidebar-input"
      data-sidebar="input"
      className={cn(
        "h-(--density-32) w-full bg-transparent text-(length:--density-text-13) shadow-[0_0_0_1px_transparent] hover:bg-hover hover:shadow-[0_0_0_1px_var(--border)] focus-visible:bg-card",
        className
      )}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn(
        "flex flex-col gap-(--density-8) p-(--density-8) [--sidebar-row-axis:calc(var(--density-8)+var(--density-20)/2)] [&>[data-slot=sidebar-trigger]]:me-[calc(var(--sidebar-row-axis)-var(--density-36)/2)]",
        className
      )}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn(
        "flex flex-col gap-(--density-8) p-(--density-8)",
        className
      )}
      {...props}
    />
  )
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>) {
  return (
    <Separator
      data-slot="sidebar-separator"
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-border/60", className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-content"
      data-sidebar="content"
      className={cn(
        "no-scrollbar flex min-h-0 flex-1 scroll-fade flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden",
        className
      )}
      {...props}
    />
  )
}

type SidebarGroupContextProps = {
  open: boolean
  toggle: () => void
  contentId: string
  /** Header actions over the label's end edge, which the label pads past. */
  actionsCount: number
}

const SidebarGroupContext =
  React.createContext<SidebarGroupContextProps | null>(null)

/** True inside SidebarGroupActions / SidebarMenuActions: actions flow in the
 *  cluster's row instead of positioning themselves. */
const SidebarActionsClusterContext = React.createContext(false)

function SidebarGroup({
  className,
  collapsible = false,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * Make the SidebarGroupLabel a toggle that collapses everything after it.
   * Uncontrolled by default; pass `open` and `onOpenChange` to control it.
   */
  collapsible?: boolean
  open?: boolean
  defaultOpen?: boolean
  onOpenChange?: (open: boolean) => void
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen)
  const open = openProp ?? uncontrolledOpen
  const collapse = useSidebarCollapse()
  const contentId = React.useId()
  const toggle = React.useCallback(() => {
    const next = !open
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }, [open, onOpenChange])

  // The label and header actions stay put; everything after the label rides
  // in the collapse. Without a SidebarGroupLabel child the group is untouched.
  let content: React.ReactNode = children
  let actionsCount = 0
  if (collapsible) {
    const kids = React.Children.toArray(children)
    const labelIndex = kids.findIndex(
      (kid) => React.isValidElement(kid) && kid.type === SidebarGroupLabel
    )
    if (labelIndex !== -1) {
      const isHeaderAction = (kid: React.ReactNode) =>
        React.isValidElement(kid) &&
        (kid.type === SidebarGroupAction || kid.type === SidebarGroupActions)
      const tail = kids.slice(labelIndex + 1)
      const headerActions = tail.filter(isHeaderAction)
      actionsCount = headerActions.reduce<number>(
        (count, kid) =>
          count +
          (React.isValidElement<{ children?: React.ReactNode }>(kid) &&
          kid.type === SidebarGroupActions
            ? React.Children.toArray(kid.props.children).length
            : 1),
        0
      )
      content = (
        <>
          {kids.slice(0, labelIndex)}
          {/* Hovering anywhere on the header row, the action cluster
              included, reveals the label's chevron. */}
          <div
            data-slot="sidebar-group-header"
            className="group/group-header w-full"
          >
            {kids[labelIndex]}
            {headerActions}
          </div>
          {/* A rail has no label to reopen a group with, so its rows always show. */}
          <SidebarCollapse id={contentId} open={open || collapse === "icon"}>
            {tail.filter((kid) => !isHeaderAction(kid))}
          </SidebarCollapse>
        </>
      )
    }
  }

  const contextValue = React.useMemo(
    () => ({ open, toggle, contentId, actionsCount }),
    [open, toggle, contentId, actionsCount]
  )

  return (
    <div
      data-slot="sidebar-group"
      data-sidebar="group"
      data-state={collapsible ? (open ? "open" : "closed") : undefined}
      className={cn(
        "relative flex w-full min-w-0 flex-col p-(--density-8)",
        className
      )}
      {...props}
    >
      <SidebarGroupContext.Provider value={collapsible ? contextValue : null}>
        {content}
      </SidebarGroupContext.Provider>
    </div>
  )
}

/** Height collapse on the grid-rows trick (no measuring). The inner box
 *  overflows its clip by 2px each side, so focus rings on the first and last
 *  rows aren't shaved; closed, it is transparent and inert. */
function SidebarCollapse({
  open,
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { open: boolean }) {
  return (
    <div
      data-slot="sidebar-collapse"
      data-state={open ? "open" : "closed"}
      inert={!open}
      className={cn(
        "grid grid-rows-[1fr] transition-[grid-template-rows,opacity] duration-move ease-move data-[state=closed]:grid-rows-[0fr] data-[state=closed]:opacity-0 data-[state=closed]:duration-move-exit data-[state=closed]:ease-exit motion-reduce:transition-opacity",
        className
      )}
      {...props}
    >
      <div className="-m-0.5 flex min-h-0 min-w-0 flex-col overflow-hidden p-0.5">
        {children}
      </div>
    </div>
  )
}

function SidebarGroupLabel({
  className,
  render,
  children,
  ...props
}: useRender.ComponentProps<"div"> & React.ComponentProps<"div">) {
  const group = React.useContext(SidebarGroupContext)

  // Inside a collapsible group the label is the toggle. Hover only raises
  // contrast and reveals a chevron, which stays as the reopen cue when closed.
  const toggleProps = group
    ? {
        type: render ? undefined : "button",
        "aria-expanded": group.open,
        "aria-controls": group.contentId,
        onClick: group.toggle,
        style:
          group.actionsCount > 0
            ? ({
                "--sidebar-group-actions-pad": `calc(${group.actionsCount} * (var(--density-24) + 4px) + var(--density-6))`,
              } as React.CSSProperties)
            : undefined,
      }
    : null

  return useRender({
    defaultTagName: group ? "button" : "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "mb-(--density-4) flex h-(--density-24) shrink-0 items-center rounded-md px-(--density-8) text-(length:--density-text-12) text-muted-foreground ring-ring outline-hidden transition-[margin,opacity,color] duration-move ease-move weight-medium group-data-[collapsible=icon]:-mt-[calc(var(--density-24)+var(--density-4))] group-data-[collapsible=icon]:opacity-0 focus-visible:ring-1 has-data-[slot=sidebar-group-label-chevron]:cursor-pointer has-data-[slot=sidebar-group-label-chevron]:gap-0.5 has-data-[slot=sidebar-group-label-chevron]:pe-[var(--sidebar-group-actions-pad,var(--density-8))] has-data-[slot=sidebar-group-label-chevron]:text-start has-data-[slot=sidebar-group-label-chevron]:hover:text-foreground [&>svg]:size-(--density-icon-16) [&>svg]:shrink-0",
          group && "w-full",
          className
        ),
        children: group ? (
          <>
            {children}
            <span
              data-slot="sidebar-group-label-chevron"
              className="flex size-(--density-icon-14) shrink-0 items-center justify-center overflow-hidden transition-opacity duration-feedback group-focus-within/group-header:opacity-100 group-hover/group-header:opacity-100 in-aria-[expanded=true]:opacity-0 pointer-coarse:opacity-100 [&>svg]:size-(--density-icon-14) [&>svg]:stroke-[1.5] [&>svg]:transition-transform [&>svg]:duration-feedback [&>svg]:ease-feedback in-aria-[expanded=true]:[&>svg]:rotate-90"
            >
              <IconPlaceholder
                lucide="ChevronRightIcon"
                tabler="IconChevronRight"
                hugeicons="ArrowRight01Icon"
                phosphor="CaretRightIcon"
                remixicon="RiArrowRightSLine"
              />
            </span>
          </>
        ) : (
          children
        ),
        ...(toggleProps as React.ComponentProps<"div">),
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-group-label",
      sidebar: "group-label",
    },
  })
}

function SidebarGroupAction({
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & React.ComponentProps<"button">) {
  const inCluster = React.useContext(SidebarActionsClusterContext)

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "absolute end-[calc(var(--density-8)+var(--density-6))] top-(--density-8) flex aspect-square size-(--density-24) cursor-pointer items-center justify-center rounded-md p-0 text-muted-foreground ring-ring outline-hidden transition-transform duration-feedback group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 hover:bg-hover hover:text-foreground focus-visible:ring-1 in-[[data-sidebar=group][data-state=closed]]:hidden md:after:hidden [&>svg]:size-(--density-icon-16) [&>svg]:shrink-0 [&>svg]:stroke-[1.5] hover:[&>svg]:stroke-2",
          inCluster && "relative inset-auto",
          className
        ),
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-group-action",
      sidebar: "group-action",
    },
  })
}

/** Up to three SidebarGroupActions in a row over the group label's end edge. */
function SidebarGroupActions({
  className,
  showOnHover = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Hide the actions until the label row is hovered or holds focus. */
  showOnHover?: boolean
}) {
  return (
    <div
      data-slot="sidebar-group-actions"
      data-sidebar="group-actions"
      data-show-on-hover={showOnHover ? "" : undefined}
      className={cn(
        "absolute end-[calc(var(--density-8)+var(--density-6))] top-(--density-8) z-10 flex items-center gap-1 transition-opacity duration-feedback group-data-[collapsible=icon]:hidden in-[[data-sidebar=group][data-state=closed]]:hidden data-show-on-hover:opacity-0 data-show-on-hover:focus-within:opacity-100 data-show-on-hover:hover:opacity-100 data-show-on-hover:has-aria-expanded:opacity-100 data-show-on-hover:pointer-coarse:opacity-100 data-show-on-hover:[[data-sidebar=group-label]:is(:hover,:focus-visible)~&]:opacity-100",
        className
      )}
      {...props}
    >
      <SidebarActionsClusterContext.Provider value={true}>
        {children}
      </SidebarActionsClusterContext.Provider>
    </div>
  )
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("w-full text-(length:--density-text-13)", className)}
      {...props}
    />
  )
}

// Fabricator: each menu is a fluid hover container. One highlight glides
// between its buttons (sub-menu buttons included), and the active button's
// background slides between active buttons.
// Matched by data-sidebar as well as data-slot: a collapsible row renders the
// menu button through CollapsibleTrigger, which replaces its data-slot.
const MENU_BUTTON = [
  '[data-slot="sidebar-menu-button"]',
  '[data-slot="sidebar-menu-sub-button"]',
  '[data-sidebar="menu-button"]',
  '[data-sidebar="menu-sub-button"]',
]
  .map((selector) => `${selector}`)
  .join(", ")
// The sliding selection marks an active top-level row. A nested row that is
// current paints its own quieter background instead.
const ACTIVE_MENU_BUTTON = [
  '[data-slot="sidebar-menu-button"]',
  '[data-sidebar="menu-button"]',
]
  .map((selector) =>
    selector.replace(/(\])/, '$1[data-active]:not([data-active="false"])')
  )
  .join(", ")
// Buttons in a collapsed sub-tree or group stay laid out (height 0), so they
// are skipped explicitly.
const SKIPPED_MENU_BUTTON =
  '[data-disabled], [aria-disabled="true"], :disabled, [inert] *, [data-sidebar="menu-sub"][data-state="closed"] *'

function SidebarMenu({
  className,
  children,
  ref,
  onKeyDown,
  ...props
}: React.ComponentProps<"ul">) {
  const fluid = useFluidHover<HTMLUListElement>({
    items: MENU_BUTTON,
    selected: ACTIVE_MENU_BUTTON,
    disabled: SKIPPED_MENU_BUTTON,
  })
  const mergedRef = useMergedRef(fluid.attach, ref)

  // Arrow keys, Home and End move between every visible row, sub-rows
  // included. Tab still visits each row.
  const handleKeyDown = (event: React.KeyboardEvent<HTMLUListElement>) => {
    onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
    const rows = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(MENU_BUTTON)
    ).filter(
      (row) => !row.matches(SKIPPED_MENU_BUTTON) && row.offsetParent !== null
    )
    const index = rows.indexOf(event.target as HTMLElement)
    if (index === -1) return
    event.preventDefault()
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? rows.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + rows.length) %
            rows.length
    rows[next]?.focus()
  }

  return (
    <ul
      data-slot="sidebar-menu"
      data-sidebar="menu"
      className={cn(
        "relative isolate flex w-full min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:items-center [&>[data-slot=fluid-hover-selection]]:shadow-surface-2 has-[>[data-dragging]>[data-active]:not([data-active=false])]:[&>[data-slot=fluid-hover-selection]]:opacity-0",
        className
      )}
      ref={mergedRef}
      onKeyDown={handleKeyDown}
      {...fluid.props}
      {...props}
    >
      <FluidHoverSelection selection={fluid.selection} />
      <FluidHoverHighlight hover={fluid.hover} />
      {children}
    </ul>
  )
}

// The trailing run a row's label must clear: the badge's slot (rightmost)
// and the action cluster (24px apiece at the default density, 4px apart),
// plus one gap, as a CSS length in density tokens so it follows the density.
// Published on the row as --sidebar-menu-gutter (at rest) and
// --sidebar-menu-gutter-hover (once hover-revealed actions show).
type SidebarMenuItemContextProps = {
  setActions: (count: number, showOnHover: boolean) => void
  setHasBadge: (hasBadge: boolean) => void
  isSubRow: boolean
}

const SidebarMenuItemContext =
  React.createContext<SidebarMenuItemContextProps | null>(null)

function rowGutter(actionCount: number, hasBadge: boolean) {
  if (!actionCount && !hasBadge) return "var(--density-8)"
  const slots = actionCount + (hasBadge ? 1 : 0)
  const edge = hasBadge ? "var(--density-8)" : "var(--density-6)"
  return `calc(${edge} + ${slots} * var(--density-24) + ${slots * 4}px)`
}

function useMenuRow(isSubRow: boolean) {
  const [trailing, setTrailing] = React.useState({
    actionCount: 0,
    showOnHover: false,
    hasBadge: false,
  })
  const setActions = React.useCallback(
    (actionCount: number, showOnHover: boolean) =>
      setTrailing((current) =>
        current.actionCount === actionCount &&
        current.showOnHover === showOnHover
          ? current
          : { ...current, actionCount, showOnHover }
      ),
    []
  )
  const setHasBadge = React.useCallback(
    (hasBadge: boolean) =>
      setTrailing((current) =>
        current.hasBadge === hasBadge ? current : { ...current, hasBadge }
      ),
    []
  )
  const context = React.useMemo(
    () => ({ setActions, setHasBadge, isSubRow }),
    [setActions, setHasBadge, isSubRow]
  )
  const hover = rowGutter(trailing.actionCount, trailing.hasBadge)
  const rest = trailing.showOnHover ? rowGutter(0, trailing.hasBadge) : hover
  // Always set, so a sub-row never inherits its parent row's gutter.
  const style = {
    "--sidebar-menu-gutter": rest,
    "--sidebar-menu-gutter-hover": hover,
  } as React.CSSProperties

  return { context, style }
}

function SidebarMenuItem({
  className,
  style,
  ...props
}: React.ComponentProps<"li">) {
  const row = useMenuRow(false)

  return (
    <SidebarMenuItemContext.Provider value={row.context}>
      <li
        data-slot="sidebar-menu-item"
        data-sidebar="menu-item"
        className={cn("group/menu-item relative", className)}
        style={{ ...row.style, ...style }}
        {...props}
      />
    </SidebarMenuItemContext.Provider>
  )
}

const sidebarMenuButtonVariants = cva(
  "peer/menu-button group/menu-button flex w-full cursor-pointer items-center gap-(--density-8) overflow-hidden rounded-lg px-(--density-8) pe-[var(--sidebar-menu-gutter,var(--density-8))] text-start text-(length:--density-text-13) text-foreground/80 ring-ring outline-hidden transition-[width,height,padding,color,background-color,box-shadow] duration-feedback weight-normal group-has-[>[data-sidebar=menu-action]]/menu-item:pe-[var(--sidebar-menu-gutter,var(--density-32))] group-data-[collapsible=icon]:size-(--density-32)! group-data-[collapsible=icon]:p-[calc((var(--density-32)-var(--density-icon-16))/2)]! hover:bg-hover hover:pe-[var(--sidebar-menu-gutter-hover,var(--density-8))] hover:text-foreground hover:group-has-[>[data-sidebar=menu-action]]/menu-item:pe-[var(--sidebar-menu-gutter-hover,var(--density-32))] focus-visible:pe-[var(--sidebar-menu-gutter-hover,var(--density-8))] focus-visible:ring-1 focus-visible:group-has-[>[data-sidebar=menu-action]]/menu-item:pe-[var(--sidebar-menu-gutter-hover,var(--density-32))] active:bg-active active:text-foreground disabled:pointer-events-none disabled:opacity-50 in-data-[fluid-hover]:hover:bg-transparent aria-disabled:pointer-events-none aria-disabled:opacity-50 data-fluid-hover-active:pe-[var(--sidebar-menu-gutter-hover,var(--density-8))] data-fluid-hover-active:text-foreground data-fluid-hover-active:group-has-[>[data-sidebar=menu-action]]/menu-item:pe-[var(--sidebar-menu-gutter-hover,var(--density-32))] data-open:text-foreground data-active:bg-active data-active:text-foreground data-active:shadow-surface-2 in-data-[fluid-hover]:data-active:bg-transparent in-data-[fluid-hover]:data-active:shadow-none [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:stroke-[1.5] [&_svg]:transition-[stroke-width,color] hover:[&_svg]:stroke-2 data-fluid-hover-active:[&_svg]:stroke-2 data-active:[&_svg]:stroke-2 [&_svg:not([class*='text-'])]:text-muted-foreground hover:[&_svg:not([class*='text-'])]:text-foreground data-fluid-hover-active:[&_svg:not([class*='text-'])]:text-foreground data-open:[&_svg:not([class*='text-'])]:text-foreground data-active:[&_svg:not([class*='text-'])]:text-foreground [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default:
          "hover:bg-hover hover:text-foreground in-data-[fluid-hover]:hover:bg-transparent",
        outline:
          "bg-transparent shadow-[0_0_0_1px_var(--border)] hover:bg-hover hover:text-foreground in-data-[fluid-hover]:hover:bg-transparent",
      },
      size: {
        default: "h-(--density-30) text-(length:--density-text-13)",
        sm: "h-(--density-28) text-(length:--density-text-12)",
        lg: "h-(--density-48) text-(length:--density-text-13) group-data-[collapsible=icon]:p-0!",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type SidebarIcon = React.ComponentType<{ className?: string }>

function SidebarMenuDot({ dot }: { dot: "filled" | "ring" }) {
  return (
    <span
      data-slot="sidebar-menu-dot"
      className="flex size-4 shrink-0 items-center justify-center"
    >
      <span
        data-dot={dot}
        className="size-2 rounded-full text-muted-foreground/50 transition-colors duration-feedback group-hover/menu-button:text-foreground/60 group-data-fluid-hover-active/menu-button:text-foreground/60 group-data-active/menu-button:text-foreground/60 data-[dot=filled]:bg-current data-[dot=ring]:shadow-[inset_0_0_0_1px_currentColor]"
      />
    </span>
  )
}

/** "icon" while the docked sidebar is its rail of icons: parts hide what won't fit. */
function useSidebarCollapse() {
  const sidebar = React.useContext(SidebarContext)
  const internal = React.useContext(SidebarInternalContext)
  if (!sidebar || sidebar.isMobile || sidebar.state === "expanded") {
    return undefined
  }
  return internal?.collapsible === "icon" && !sidebar.isPeeking
    ? ("icon" as const)
    : undefined
}

function SidebarMenuButton({
  render,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  icon: Icon,
  status,
  dot,
  className,
  children,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    isActive?: boolean
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
    /** Leading icon, as a component (`icon={HomeIcon}`). */
    icon?: SidebarIcon
    /**
     * Row state for status-dot navigation: `active` and `unread` draw a filled
     * dot, `idle` a ring. `active` implies `isActive`; `unread` adds hidden
     * text for screen readers.
     */
    status?: "active" | "unread" | "idle"
    /** A visual-only dot when `status` doesn't fit. Ignored with `icon`. */
    dot?: "filled" | "ring"
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const collapse = useSidebarCollapse()
  const active = isActive || status === "active"
  const resolvedDot =
    dot ?? (status ? (status === "idle" ? "ring" : "filled") : undefined)
  const content =
    Icon || resolvedDot || status === "unread" ? (
      <>
        {Icon ? (
          <Icon data-slot="sidebar-menu-icon" />
        ) : (
          resolvedDot && <SidebarMenuDot dot={resolvedDot} />
        )}
        {status === "unread" && <span className="sr-only">Unread: </span>}
        {children}
      </>
    ) : (
      children
    )

  const comp = useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(sidebarMenuButtonVariants({ variant, size }), className),
        children: content,
        ...(active && { "aria-current": "page" as const }),
        ...(status && { "data-status": status }),
      },
      props
    ),
    render: !tooltip ? render : <TooltipTrigger render={render} />,
    state: {
      slot: "sidebar-menu-button",
      sidebar: "menu-button",
      size,
      active,
    },
  })

  if (!tooltip) {
    return comp
  }

  if (typeof tooltip === "string") {
    tooltip = {
      children: tooltip,
    }
  }

  return (
    <Tooltip>
      {comp}
      <TooltipContent
        side="right"
        align="center"
        hidden={collapse !== "icon"}
        {...tooltip}
      />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  render,
  showOnHover = false,
  onClick,
  ...props
}: useRender.ComponentProps<"button"> &
  React.ComponentProps<"button"> & {
    showOnHover?: boolean
  }) {
  const row = React.useContext(SidebarMenuItemContext)
  const inCluster = React.useContext(SidebarActionsClusterContext)

  // A lone action reserves its own slot; a cluster reserves its whole run.
  const setActions = row?.setActions
  React.useLayoutEffect(() => {
    if (inCluster || !setActions) return
    setActions(1, showOnHover)
    return () => setActions(0, false)
  }, [inCluster, setActions, showOnHover])

  return useRender({
    defaultTagName: "button",
    props: mergeProps<"button">(
      {
        className: cn(
          "absolute end-(--density-6) top-[calc((var(--density-30)-var(--density-24))/2)] flex size-(--density-24) cursor-pointer items-center justify-center rounded-md p-0 text-muted-foreground ring-ring outline-hidden transition-transform duration-feedback group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-foreground peer-data-fluid-hover-active/menu-button:text-foreground peer-data-[size=lg]/menu-button:top-[calc((var(--density-48)-var(--density-24))/2)] peer-data-[size=sm]/menu-button:top-[calc((var(--density-28)-var(--density-24))/2)] after:absolute after:-inset-2 hover:bg-hover hover:text-foreground focus-visible:ring-1 in-data-[sidebar=menu-sub-item]:not-in-data-[slot=sidebar-menu-actions]:top-[calc((var(--density-30)-var(--density-24))/2)] md:after:hidden [&>svg]:size-(--density-icon-16) [&>svg]:shrink-0 [&>svg]:stroke-[1.5] hover:[&>svg]:stroke-2 [:has(>[data-sidebar=menu-badge])>&]:end-[calc(var(--density-8)+var(--density-20)+var(--density-6))]",
          showOnHover &&
            !inCluster &&
            "peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground hover:opacity-100 focus-visible:opacity-100 aria-expanded:opacity-100 md:opacity-0 md:peer-data-fluid-hover-active/menu-button:opacity-100",
          inCluster && "relative inset-auto",
          className
        ),
        // The action often sits on a row rendered as a link; keep its click
        // from also activating the row.
        onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
          event.stopPropagation()
          onClick?.(event)
        },
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-menu-action",
      sidebar: "menu-action",
    },
  })
}

/** Several SidebarMenuActions in a row at the row's end. */
function SidebarMenuActions({
  className,
  showOnHover = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Hide the cluster until the row is hovered or focused. */
  showOnHover?: boolean
}) {
  const row = React.useContext(SidebarMenuItemContext)
  const count = React.Children.count(children)
  const setActions = row?.setActions
  React.useLayoutEffect(() => {
    setActions?.(count, showOnHover)
    return () => setActions?.(0, false)
  }, [setActions, count, showOnHover])

  return (
    <div
      data-slot="sidebar-menu-actions"
      data-sidebar="menu-actions"
      data-show-on-hover={showOnHover ? "" : undefined}
      className={cn(
        "absolute end-(--density-6) top-[calc((var(--density-30)-var(--density-24))/2)] z-10 flex items-center gap-1 transition-opacity duration-feedback group-data-[collapsible=icon]:hidden peer-data-[size=lg]/menu-button:top-[calc((var(--density-48)-var(--density-24))/2)] peer-data-[size=sm]/menu-button:top-[calc((var(--density-28)-var(--density-24))/2)] in-data-[sidebar=menu-sub-item]:top-[calc((var(--density-30)-var(--density-24))/2)] [:has(>[data-sidebar=menu-badge])>&]:end-[calc(var(--density-8)+var(--density-20)+var(--density-6))]",
        showOnHover &&
          "peer-hover/menu-button:opacity-100 peer-focus-visible/menu-button:opacity-100 focus-within:opacity-100 hover:opacity-100 has-aria-expanded:opacity-100 has-data-popup-open:opacity-100 md:opacity-0 md:peer-data-fluid-hover-active/menu-button:opacity-100",
        className
      )}
      {...props}
    >
      <SidebarActionsClusterContext.Provider value={true}>
        {children}
      </SidebarActionsClusterContext.Provider>
    </div>
  )
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const row = React.useContext(SidebarMenuItemContext)
  const setHasBadge = row?.setHasBadge
  React.useLayoutEffect(() => {
    setHasBadge?.(true)
    return () => setHasBadge?.(false)
  }, [setHasBadge])

  return (
    <div
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      className={cn(
        "pointer-events-none absolute end-(--density-8) top-[calc((var(--density-30)-var(--density-20))/2)] flex h-(--density-20) min-w-(--density-20) items-center justify-center rounded-md px-1 text-(length:--density-text-12) text-muted-foreground tabular-nums transition-[color,font-variation-settings] duration-feedback select-none weight-normal group-data-[collapsible=icon]:hidden peer-hover/menu-button:text-foreground peer-data-fluid-hover-active/menu-button:text-foreground peer-data-[size=lg]/menu-button:top-[calc((var(--density-48)-var(--density-20))/2)] peer-data-[size=sm]/menu-button:top-[calc((var(--density-28)-var(--density-20))/2)] peer-data-active/menu-button:text-foreground in-data-[sidebar=menu-sub-item]:top-[calc((var(--density-30)-var(--density-20))/2)]",
        className
      )}
      {...props}
    />
  )
}

// A fixed cycle instead of Math.random, so server and client render the same
// width and hydration doesn't mismatch.
const SKELETON_WIDTHS = ["62%", "74%", "55%", "82%", "68%"]

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<"div"> & {
  showIcon?: boolean
}) {
  const id = React.useId()
  let sum = 0
  for (let index = 0; index < id.length; index++) sum += id.charCodeAt(index)
  const width = SKELETON_WIDTHS[sum % SKELETON_WIDTHS.length]

  return (
    <div
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(
        "flex h-(--density-30) items-center gap-(--density-8) rounded-lg px-(--density-8)",
        className
      )}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="size-(--density-icon-16) rounded-md"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={
          {
            "--skeleton-width": width,
          } as React.CSSProperties
        }
      />
    </div>
  )
}

// Fabricator: how deep a sub-menu sits, 1 under a top-level row. Its rows
// read it as --sidebar-menu-depth and indent one step a level, so sub-menus
// nest to any depth.
const SidebarMenuDepthContext = React.createContext(0)

type SidebarMenuDepthStyle = React.CSSProperties & {
  "--sidebar-menu-depth": number
}

function SidebarMenuSub({
  className,
  open,
  style,
  children,
  ...props
}: React.ComponentProps<"ul"> & {
  /**
   * Collapse the sub-tree on the moderate spring. Omitted, it is always
   * shown (or wrapped in a Collapsible, the upstream way).
   */
  open?: boolean
}) {
  const depth = React.useContext(SidebarMenuDepthContext) + 1
  const depthStyle: SidebarMenuDepthStyle = {
    ...style,
    "--sidebar-menu-depth": depth,
  }
  const list = (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      data-state={open === undefined ? undefined : open ? "open" : "closed"}
      className={cn(
        "relative ms-0 me-0 flex min-w-0 flex-col gap-0.5 border-0 ps-0 pe-0 pt-0.5 pb-0 group-data-[collapsible=icon]:hidden before:pointer-events-none before:absolute before:inset-y-1 before:start-[calc(var(--density-8)+var(--density-icon-16)/2+(var(--density-icon-16)+var(--density-8))*(var(--sidebar-menu-depth,1)-1))] before:w-px before:bg-border before:opacity-0 before:transition-opacity before:duration-feedback hover:before:opacity-100 has-focus-visible:before:opacity-100 has-[>[data-dragging]]:before:opacity-100",
        className
      )}
      style={depthStyle}
      {...props}
    >
      <SidebarMenuDepthContext.Provider value={depth}>
        {children}
      </SidebarMenuDepthContext.Provider>
    </ul>
  )

  if (open === undefined) {
    return list
  }

  return <SidebarCollapse open={open}>{list}</SidebarCollapse>
}

function SidebarMenuSubItem({
  className,
  style,
  ...props
}: React.ComponentProps<"li">) {
  const row = useMenuRow(true)

  return (
    <SidebarMenuItemContext.Provider value={row.context}>
      <li
        data-slot="sidebar-menu-sub-item"
        data-sidebar="menu-sub-item"
        className={cn("group/menu-sub-item relative", className)}
        style={{ ...row.style, ...style }}
        {...props}
      />
    </SidebarMenuItemContext.Provider>
  )
}

function SidebarMenuSubButton({
  render,
  size = "md",
  isActive = false,
  icon: Icon,
  className,
  children,
  ...props
}: useRender.ComponentProps<"a"> &
  React.ComponentProps<"a"> & {
    size?: "sm" | "md"
    isActive?: boolean
    /** Leading icon, as a component. */
    icon?: SidebarIcon
  }) {
  return useRender({
    defaultTagName: "a",
    props: mergeProps<"a">(
      {
        className: cn(
          "peer/menu-button flex h-(--density-30) min-w-0 -translate-x-px cursor-pointer items-center gap-(--density-8) overflow-hidden rounded-lg ps-[calc(var(--density-8)+(var(--density-icon-16)+var(--density-8))*var(--sidebar-menu-depth,1))] pe-[var(--sidebar-menu-gutter,var(--density-8))] text-(length:--density-text-13) text-muted-foreground ring-ring outline-hidden transition-[color,background-color,padding] duration-feedback weight-normal group-data-[collapsible=icon]:hidden hover:bg-hover hover:pe-[var(--sidebar-menu-gutter-hover,var(--density-8))] hover:text-foreground focus-visible:pe-[var(--sidebar-menu-gutter-hover,var(--density-8))] focus-visible:ring-1 active:bg-active active:text-foreground disabled:pointer-events-none disabled:opacity-50 in-data-[fluid-hover]:not-data-active:hover:bg-transparent in-data-[slot=sidebar-menu-sub]:translate-x-0 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-fluid-hover-active:pe-[var(--sidebar-menu-gutter-hover,var(--density-8))] data-fluid-hover-active:text-foreground data-[size=sm]:h-(--density-24) data-[size=sm]:text-(length:--density-text-12) data-active:bg-hover/50 data-active:text-foreground [&>span:last-child]:truncate [&>svg]:size-(--density-icon-16) [&>svg]:shrink-0 [&>svg]:stroke-[1.5] [&>svg]:transition-[stroke-width,color] data-fluid-hover-active:[&>svg]:stroke-2 [&>svg:not([class*='text-'])]:text-muted-foreground hover:[&>svg:not([class*='text-'])]:text-foreground data-fluid-hover-active:[&>svg:not([class*='text-'])]:text-foreground data-active:[&>svg:not([class*='text-'])]:text-foreground",
          className
        ),
        children: Icon ? (
          <>
            <Icon data-slot="sidebar-menu-icon" />
            {children}
          </>
        ) : (
          children
        ),
        ...(isActive && { "aria-current": "page" as const }),
      },
      props
    ),
    render,
    state: {
      slot: "sidebar-menu-sub-button",
      sidebar: "menu-sub-button",
      size,
      active: isActive,
    },
  })
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarToggleIcon,
  SidebarTrigger,
  useSidebar,
  useSidebarCollapse,
}
