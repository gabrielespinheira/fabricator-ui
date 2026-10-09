"use client"

// Fabricator Sidebar. Keeps the upstream API (every export, prop, variant and
// data-slot) and adds the Fluid Functionalism sidebar behaviour by Micka
// Touillaud (MIT), https://github.com/mickadesign/fluid-functionalism:
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
//
// Motion is CSS on the motion tokens, so --motion-scale reaches all of it.
import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"

import { useIsMobile } from "@/registry/bases/base/hooks/use-mobile"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/base/lib/fluid-hover"
import { Button } from "@/registry/bases/base/ui/button"
import { Input } from "@/registry/bases/base/ui/input"
import { Kbd } from "@/registry/bases/base/ui/kbd"
import { Separator } from "@/registry/bases/base/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/registry/bases/base/ui/sheet"
import { Skeleton } from "@/registry/bases/base/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/base/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_WIDTH = "16rem"
const SIDEBAR_WIDTH_MOBILE = "18rem"
const SIDEBAR_WIDTH_ICON = "3rem"
const SIDEBAR_KEYBOARD_SHORTCUT = "b"
/** Drag-resize clamp for SidebarRail (px). */
const SIDEBAR_MIN_WIDTH = 160
const SIDEBAR_MAX_WIDTH = 360
/** Dragging this far past the minimum collapses instead of bottoming out. */
const SIDEBAR_COLLAPSE_SLOP = 56
/** Hover-peek intent and leave delays (ms). */
const SIDEBAR_PEEK_DELAY = 150
const SIDEBAR_PEEK_DISMISS_DELAY = 250

type SidebarSide = "left" | "right"
type SidebarPeek = "none" | "hover" | "click"

type SidebarContextProps = {
  state: "expanded" | "collapsed"
  open: boolean
  setOpen: (open: boolean | ((open: boolean) => boolean)) => void
  openMobile: boolean
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>
  isMobile: boolean
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
}) {
  const isMobile = useIsMobile()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [side, setSide] = React.useState<SidebarSide>("left")
  const [collapsible, setCollapsible] = React.useState<
    "offcanvas" | "icon" | "none"
  >("offcanvas")
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
      registerCollapsible: setCollapsible,
      setIsResizing,
      schedulePeek,
      scheduleDismissPeek,
      cancelPeekTimer,
    }),
    [schedulePeek, scheduleDismissPeek, cancelPeekTimer]
  )

  return (
    <SidebarContext.Provider value={contextValue}>
      <SidebarInternalContext.Provider value={internalValue}>
        <div
          ref={mergedRef}
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              "--sidebar-width-mobile": widthMobile,
              ...style,
              "--sidebar-width": width,
            } as React.CSSProperties
          }
          className={cn(
            "group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar",
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
  const { isMobile, state, openMobile, setOpenMobile, peek, isPeeking } =
    useSidebar()
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
          "cn-sidebar-gap relative w-(--sidebar-width) bg-transparent",
          "group-data-peeking:w-0 group-data-[collapsible=offcanvas]:w-0",
          "group-data-[side=right]:rotate-180",
          "group-data-resizing:transition-none",
          variant === "floating" || variant === "inset"
            ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]"
            : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        )}
      />
      <div
        ref={containerRef}
        data-slot="sidebar-container"
        data-side={side}
        className={cn(
          "cn-sidebar-container fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) group-data-peeking:z-50 group-data-resizing:transition-none data-[side=left]:left-0 data-[side=left]:group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)] data-[side=right]:right-0 data-[side=right]:group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)] md:flex",
          // Adjust the padding for floating and inset variants.
          variant === "floating" || variant === "inset"
            ? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
            : cn(
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
          className="cn-sidebar-inner flex size-full flex-col"
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
          className="cn-sidebar-peek-strip fixed inset-y-0 z-40 w-3 outline-none data-[side=left]:left-0 data-[side=right]:right-0"
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

// The panel glyph from SharpOS: a rounded frame with the sidebar cut out of
// it. The cut-out widens when the sidebar is open; the path morphs on the
// moderate tier where CSS `d` transitions are supported, and swaps elsewhere.
const TOGGLE_FRAME =
  "M11 3H13C16.7712 3 18.6569 3 19.8284 4.17157C21 5.34315 21 7.22876 21 11V13C21 16.7712 21 18.6569 19.8284 19.8284C18.6569 21 16.7712 21 13 21H11C7.2288 21 5.3431 21 4.1716 19.8284C3 18.6569 3 16.7712 3 13V11C3 7.22876 3 5.34315 4.1716 4.17157C5.3431 3 7.2288 3 11 3Z"
const TOGGLE_PANEL_CLOSED =
  "M10 5.5 C10 4.793 10 4.439 9.780 4.220 C9.560 4 9.207 4 8.5 4 H8.5 C6.379 4 5.318 4 4.659 4.659 C4 5.318 4 6.379 4 8.5 V15.5 C4 17.621 4 18.682 4.659 19.341 C5.318 20 6.379 20 8.5 20 H8.5 C9.207 20 9.561 20 9.780 19.780 C10 19.561 10 19.207 10 18.5 V5.5 Z"
const TOGGLE_PANEL_OPEN =
  "M14 6 C14 5.057 14 4.586 13.707 4.293 C13.414 4 12.943 4 12 4 H10 C7.172 4 5.757 4 4.879 4.879 C4 5.757 4 7.172 4 10 V14 C4 16.828 4 18.243 4.879 19.121 C5.757 20 7.172 20 10 20 H12 C12.943 20 13.414 20 13.707 19.707 C14 19.414 14 18.943 14 18 V6 Z"

function SidebarToggleIcon({
  open,
  side,
  className,
}: {
  open: boolean
  side: SidebarSide
  className?: string
}) {
  const maskId = `sidebar-toggle-${React.useId().replace(/[^a-zA-Z0-9-]/g, "")}`
  const panel = open ? TOGGLE_PANEL_OPEN : TOGGLE_PANEL_CLOSED

  return (
    <svg
      data-slot="sidebar-toggle-icon"
      data-state={open ? "open" : "closed"}
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className={cn(
        "cn-sidebar-toggle-icon",
        side === "right" && "-scale-x-100",
        className
      )}
    >
      <mask id={maskId}>
        <path
          d={TOGGLE_FRAME}
          fill="white"
          stroke="white"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <path
          d={panel}
          fill="black"
          className="cn-sidebar-toggle-icon-panel"
          style={{ d: `path("${panel}")` } as React.CSSProperties}
        />
      </mask>
      <rect
        width="24"
        height="24"
        fill="currentColor"
        mask={`url(#${maskId})`}
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
            className={cn("cn-sidebar-trigger", className)}
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
  return <Kbd className="cn-sidebar-shortcut">{useShortcutLabel(shortcut)}</Kbd>
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
              "cn-sidebar-rail absolute inset-y-0 z-20 hidden w-4 touch-none group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:start-1/2 after:w-px sm:flex ltr:-translate-x-1/2",
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
        className="cn-sidebar-rail-tooltip"
      >
        {expanded ? (
          <span className="flex flex-col items-start gap-1.5">
            <span>
              <span className="cn-sidebar-rail-tooltip-verb">Drag</span> to
              resize
            </span>
            <span className="flex items-center gap-1.5">
              <span>
                <span className="cn-sidebar-rail-tooltip-verb">Click</span> to
                collapse
              </span>
              {shortcut != null && <SidebarShortcutKbd shortcut={shortcut} />}
            </span>
          </span>
        ) : (
          <>
            <span>
              <span className="cn-sidebar-rail-tooltip-verb">Click</span> to
              expand
            </span>
            {shortcut != null && <SidebarShortcutKbd shortcut={shortcut} />}
          </>
        )}
      </TooltipContent>
    </Tooltip>
  )
}

function SidebarInset({ className, ...props }: React.ComponentProps<"main">) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        "cn-sidebar-inset relative flex w-full flex-1 flex-col",
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
      className={cn("cn-sidebar-input", className)}
      {...props}
    />
  )
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("cn-sidebar-header flex flex-col", className)}
      {...props}
    />
  )
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("cn-sidebar-footer flex flex-col", className)}
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
      className={cn("cn-sidebar-separator w-auto", className)}
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
        "cn-sidebar-content flex min-h-0 flex-1 flex-col overflow-auto group-data-[collapsible=icon]:overflow-hidden",
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
            ? React.Children.count(kid.props.children)
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
          <SidebarCollapse id={contentId} open={open}>
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
        "cn-sidebar-group relative flex w-full min-w-0 flex-col",
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
        "cn-sidebar-collapse grid grid-rows-[1fr] data-[state=closed]:grid-rows-[0fr]",
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
                "--sidebar-group-actions-pad": `${group.actionsCount * 28 + 6}px`,
              } as React.CSSProperties)
            : undefined,
      }
    : null

  return useRender({
    defaultTagName: group ? "button" : "div",
    props: mergeProps<"div">(
      {
        className: cn(
          "cn-sidebar-group-label flex shrink-0 items-center outline-hidden [&>svg]:shrink-0",
          group && "w-full",
          className
        ),
        children: group ? (
          <>
            {children}
            <span
              data-slot="sidebar-group-label-chevron"
              className="cn-sidebar-group-label-chevron ms-auto flex shrink-0 items-center justify-center overflow-hidden"
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
          "cn-sidebar-group-action flex aspect-square items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
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
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sidebar-group-actions"
      data-sidebar="group-actions"
      className={cn(
        "cn-sidebar-group-actions absolute z-10 flex items-center group-data-[collapsible=icon]:hidden",
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
      className={cn("cn-sidebar-group-content w-full", className)}
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
const ACTIVE_MENU_BUTTON = MENU_BUTTON.split(", ")
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
      className={cn("cn-sidebar-menu flex w-full min-w-0 flex-col", className)}
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
// and the action cluster (24px apiece, 4px apart), plus one gap. Published
// on the row as --sidebar-menu-gutter (at rest) and
// --sidebar-menu-gutter-hover (once hover-revealed actions show).
type SidebarMenuItemContextProps = {
  setActions: (count: number, showOnHover: boolean) => void
  setHasBadge: (hasBadge: boolean) => void
  isSubRow: boolean
}

const SidebarMenuItemContext =
  React.createContext<SidebarMenuItemContextProps | null>(null)

function rowGutter(actionCount: number, hasBadge: boolean) {
  if (!actionCount && !hasBadge) return 8
  const actions = actionCount ? actionCount * 24 + (actionCount - 1) * 4 : 0
  const run = (hasBadge ? 24 : 0) + actions + (hasBadge && actionCount ? 4 : 0)
  return (hasBadge ? 8 : 6) + run + 4
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
    "--sidebar-menu-gutter": `${rest}px`,
    "--sidebar-menu-gutter-hover": `${hover}px`,
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
  "cn-sidebar-menu-button peer/menu-button group/menu-button flex w-full items-center overflow-hidden outline-hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&>span:last-child]:truncate",
  {
    variants: {
      variant: {
        default: "cn-sidebar-menu-button-variant-default",
        outline: "cn-sidebar-menu-button-variant-outline",
      },
      size: {
        default: "cn-sidebar-menu-button-size-default",
        sm: "cn-sidebar-menu-button-size-sm",
        lg: "cn-sidebar-menu-button-size-lg",
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
      <span data-dot={dot} className="cn-sidebar-menu-dot rounded-full" />
    </span>
  )
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
  const { isMobile, state } = useSidebar()
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
        hidden={state !== "collapsed" || isMobile}
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
          "cn-sidebar-menu-action flex items-center justify-center outline-hidden transition-transform group-data-[collapsible=icon]:hidden after:absolute after:-inset-2 md:after:hidden [&>svg]:shrink-0",
          showOnHover &&
            !inCluster &&
            "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-active/menu-button:text-sidebar-accent-foreground aria-expanded:opacity-100 md:opacity-0 md:peer-data-fluid-hover-active/menu-button:opacity-100",
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
        "cn-sidebar-menu-actions absolute z-10 flex items-center group-data-[collapsible=icon]:hidden",
        showOnHover &&
          "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 has-aria-expanded:opacity-100 has-data-popup-open:opacity-100 md:opacity-0",
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
        "cn-sidebar-menu-badge flex items-center justify-center tabular-nums select-none group-data-[collapsible=icon]:hidden",
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
      className={cn("cn-sidebar-menu-skeleton flex items-center", className)}
      {...props}
    >
      {showIcon && (
        <Skeleton
          className="cn-sidebar-menu-skeleton-icon"
          data-sidebar="menu-skeleton-icon"
        />
      )}
      <Skeleton
        className="cn-sidebar-menu-skeleton-text max-w-(--skeleton-width) flex-1"
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

function SidebarMenuSub({
  className,
  open,
  ...props
}: React.ComponentProps<"ul"> & {
  /**
   * Collapse the sub-tree on the moderate spring. Omitted, it is always
   * shown (or wrapped in a Collapsible, the upstream way).
   */
  open?: boolean
}) {
  const list = (
    <ul
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      data-state={open === undefined ? undefined : open ? "open" : "closed"}
      className={cn("cn-sidebar-menu-sub flex min-w-0 flex-col", className)}
      {...props}
    />
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
          "cn-sidebar-menu-sub-button flex min-w-0 -translate-x-px items-center overflow-hidden outline-hidden group-data-[collapsible=icon]:hidden disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:shrink-0",
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
  SidebarTrigger,
  useSidebar,
}
