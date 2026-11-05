// Fabricator Sidebar on touch. Keeps the website's parts and `SidebarProvider` API.
//
// - Phones: `mobileSidebar="reveal"` shows it behind the page, which moves aside and
//   shrinks; `"sheet"` slides it over the page. A tap on the page or dragging back
//   closes it, and a swipe from the leading edge opens it.
// - Tablets: docked, collapsing off-canvas or to a rail of icons on the move timing.
// - SidebarGroup `collapsible`, SidebarMenuSub `open`, row actions, badges, status
//   dots and nested rows work as on the website, always visible: touch has no hover.
//
// `peek`, `persist`, `shortcut`, `showOnHover` and `onWidthChange` are accepted and
// do nothing: they need a pointer, a cookie or a keyboard. Drag resizing is gone from
// SidebarRail for the same reason, and a tap still collapses.
import * as React from "react"
import {
  ChevronRightIcon,
  IconProvider,
  type IconProps,
} from "@fabricator-ui/icons-react-native"
import { useEffectEvent as useLatestCallback } from "@rn-primitives/hooks"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import {
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from "react-native"
import { Gesture, GestureDetector } from "react-native-gesture-handler"
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated"
import {
  initialWindowMetrics,
  SafeAreaInsetsContext,
  type EdgeInsets,
} from "react-native-safe-area-context"
import Svg, { Path } from "react-native-svg"
import { scheduleOnRN } from "react-native-worklets"
import { ScopedVariables, useCSSVariable, useResolveClassNames } from "uniwind"

import { DENSITIES } from "@/registry/fabricator/density"
import {
  getRevealDragProgress,
  getRevealWidth,
  getToggleGlyphPanel,
  shouldRevealStayOpen,
  TOGGLE_GLYPH,
  TOGGLE_GLYPH_SCALE,
} from "@/registry/fabricator/shared/lib/sidebar-model"
import { useIsMobile } from "@/registry/native/hooks/use-mobile"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  FluidHoverHighlight,
  FluidHoverProvider,
  FluidHoverSelection,
  useFluidHover,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { getTextContent } from "@/registry/native/lib/overlay-model"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import { SheetSurface } from "@/registry/native/lib/sheet-surface"
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
  REVEAL_DRAG_SLOP,
  REVEAL_OPEN_EDGE,
  SIDEBAR_WIDTH,
  SIDEBAR_WIDTH_MOBILE,
  toRevealDelta,
  toRevealVelocity,
} from "@/registry/native/lib/sidebar-layout-model"
import { wrapTextChildren } from "@/registry/native/lib/text-children"
import { Button } from "@/registry/native/ui/button"
import { DropdownMenu } from "@/registry/native/ui/dropdown-menu"
import { Input } from "@/registry/native/ui/input"
import { Separator } from "@/registry/native/ui/separator"
import { Skeleton } from "@/registry/native/ui/skeleton"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/native/ui/tooltip"

const SIDEBAR_KEYBOARD_SHORTCUT = "b"
const DEFAULT_WIDTH = parseSidebarWidth(SIDEBAR_WIDTH, 256)
const DEFAULT_WIDTH_MOBILE = parseSidebarWidth(SIDEBAR_WIDTH_MOBILE, 288)
const NO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 }

type SidebarSide = "left" | "right"
type SidebarMobile = "sheet" | "reveal"
type SidebarPeek = "none" | "hover" | "click"
type SidebarVariant = "sidebar" | "floating" | "inset"
type SidebarCollapsible = "offcanvas" | "icon" | "none"
type SidebarIcon = React.ComponentType<IconProps> | React.ReactElement

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
  width: string
  setWidth: (width: string) => void
  /** The edge the Sidebar sits on (reported by <Sidebar />). */
  side: SidebarSide
  /** The toggle shortcut as given. It can't fire: no global key events. */
  shortcut: string | null
  /** Always "none": peeking needs a pointer. */
  peek: SidebarPeek
  isPeeking: boolean
  setIsPeeking: React.Dispatch<React.SetStateAction<boolean>>
  /** Always false: nothing drags to resize here. */
  isResizing: boolean
}

type SidebarInternalContextProps = {
  registerSide: (side: SidebarSide) => void
  registerCollapsible: (collapsible: SidebarCollapsible) => void
  unregisterCollapsible: (collapsible: SidebarCollapsible) => void
  registerVariant: (variant: SidebarVariant) => void
  registerGapWidth: (width: number) => void
  collapsible: SidebarCollapsible | null
  variant: SidebarVariant
  gapWidth: number
  /** Open is 1, closed is 0. The page and the revealed sidebar both follow it. */
  progress: SharedValue<number>
  revealWidth: number
  /** Stays true until the page is back, so its corners and shadow leave last. */
  isAside: boolean
  setIsAside: React.Dispatch<React.SetStateAction<boolean>>
  settleReveal: (toOpen: boolean) => void
}

const SidebarContext = React.createContext<SidebarContextProps | null>(null)
const SidebarInternalContext =
  React.createContext<SidebarInternalContextProps | null>(null)

/**
 * Variables the sidebar's own surface reads instead of the theme's. App Shell puts
 * it on its frame this way. A sheet leaves the React tree, so it carries them over.
 */
const SidebarFrameContext = React.createContext<Record<
  string,
  string | number
> | null>(null)

function useSidebar() {
  const context = React.use(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

function useSidebarInternal() {
  const context = React.use(SidebarInternalContext)
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.")
  }
  return context
}

/** The window's safe areas. Zero outside a SafeAreaProvider, before measuring. */
function useShellInsets() {
  return (
    React.use(SafeAreaInsetsContext) ??
    initialWindowMetrics?.insets ??
    NO_INSETS
  )
}

/** "icon" while the docked sidebar is its rail of icons: parts hide what won't fit. */
function useSidebarCollapse() {
  const sidebar = React.use(SidebarContext)
  const internal = React.use(SidebarInternalContext)
  if (!sidebar || sidebar.isMobile || sidebar.state === "expanded") {
    return undefined
  }
  return internal?.collapsible === "icon" ? ("icon" as const) : undefined
}

/** Carries the sidebar's context into a portal, which leaves the React tree. */
function useSidebarPortal() {
  const sidebar = React.use(SidebarContext)
  const internal = React.use(SidebarInternalContext)
  const frame = React.use(SidebarFrameContext)
  return React.useCallback(
    (children: React.ReactNode) => (
      <SidebarContext value={sidebar}>
        <SidebarInternalContext value={internal}>
          <SidebarFrameContext value={frame}>{children}</SidebarFrameContext>
        </SidebarInternalContext>
      </SidebarContext>
    ),
    [frame, internal, sidebar]
  )
}

/** What the docked sidebar takes beside the main column, and how it sits there. */
function useSidebarLayout() {
  const { variant, gapWidth } = useSidebarInternal()
  return { variant, gapWidth }
}

function SidebarProvider({
  defaultOpen = true,
  open: openProp,
  onOpenChange: setOpenProp,
  persist: _persist = true,
  shortcut = `mod+${SIDEBAR_KEYBOARD_SHORTCUT}`,
  peek: _peek = "none",
  width: widthProp,
  widthMobile = SIDEBAR_WIDTH_MOBILE,
  mobileSidebar: mobileSidebarProp = "sheet",
  onWidthChange: _onWidthChange,
  isMobile: isMobileProp,
  onGapWidthChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Kept so code from the website compiles: there's no cookie to save it in. */
  persist?: boolean
  /** Kept so code from the website compiles: no global key events. */
  shortcut?: string | null
  /** Kept so code from the website compiles: peeking needs a pointer. */
  peek?: SidebarPeek
  /** Starting width. Default 16rem. */
  width?: string
  /** Width of the phone's sidebar. Default 18rem. */
  widthMobile?: string
  /**
   * On phones: a sheet over the page, or `reveal`, where the page moves aside
   * and shrinks to show the sidebar behind it. Default "sheet".
   */
  mobileSidebar?: SidebarMobile
  /** Kept so code from the website compiles: nothing drags to resize here. */
  onWidthChange?: (width: string) => void
  /** Overrides the window's width, so an App Shell's own width decides. */
  isMobile?: boolean
  /** Called with the room the docked sidebar takes beside the main column. */
  onGapWidthChange?: (width: number) => void
}) {
  const isWindowMobile = useIsMobile()
  const isMobile = isMobileProp ?? isWindowMobile
  const insets = useShellInsets()
  const { width: windowWidth } = useWindowDimensions()
  const [openMobile, setOpenMobile] = React.useState(false)
  const [side, setSide] = React.useState<SidebarSide>("left")
  const [collapsible, setCollapsible] =
    React.useState<SidebarCollapsible | null>(null)
  const [variant, setVariant] = React.useState<SidebarVariant>("sidebar")
  const [gapWidth, setGapWidth] = React.useState(0)
  // A sidebar that never collapses stays in the layout, so nothing to reveal.
  const mobileSidebar = collapsible === "none" ? "sheet" : mobileSidebarProp

  const startWidth = widthProp ?? SIDEBAR_WIDTH
  const [width, setWidth] = React.useState(startWidth)
  const [syncedStartWidth, setSyncedStartWidth] = React.useState(startWidth)
  if (syncedStartWidth !== startWidth) {
    setSyncedStartWidth(startWidth)
    setWidth(startWidth)
  }

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
      if (setOpenProp) setOpenProp(openState)
      else _setOpen(openState)
    },
    [setOpenProp]
  )

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((current) => !current)
    else setOpen((current) => !current)
  }, [isMobile, setOpen])

  const [isPeeking, setIsPeeking] = React.useState(false)

  const motion = useMotion("sheet")
  const progress = useSharedValue(0)
  const [isAside, setIsAside] = React.useState(false)
  const settleReveal = React.useCallback(
    (toOpen: boolean) => {
      const duration = motion.isReduced
        ? 0
        : toOpen
          ? motion.enterMs
          : motion.exitMs
      progress.value = withTiming(
        toOpen ? 1 : 0,
        { duration, easing: motion.drawerEasing },
        (finished) => {
          if (finished && !toOpen) scheduleOnRN(setIsAside, false)
        }
      )
    },
    [motion, progress]
  )

  const isReveal = isMobile && mobileSidebar === "reveal"
  React.useEffect(() => {
    if (!isReveal) {
      progress.value = 0
      setIsAside(false)
      return
    }
    if (openMobile) setIsAside(true)
    settleReveal(openMobile)
  }, [isReveal, openMobile, progress, settleReveal])

  // Turned to a tablet's layout, a phone's open sidebar has nothing to return to.
  React.useEffect(() => {
    if (!isMobile) setOpenMobile(false)
  }, [isMobile])

  const reportGapWidth = useLatestCallback((next: number) => {
    onGapWidthChange?.(next)
  })
  const registerCollapsible = React.useCallback(
    (next: SidebarCollapsible) =>
      setCollapsible((current) => getRegisteredCollapsible(current, next)),
    []
  )
  const unregisterCollapsible = React.useCallback(
    (own: SidebarCollapsible) =>
      setCollapsible((current) => getUnregisteredCollapsible(current, own)),
    []
  )
  const registerGapWidth = React.useCallback(
    (next: number) => {
      setGapWidth(next)
      reportGapWidth(next)
    },
    [reportGapWidth]
  )

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
      peek: "none",
      isPeeking,
      setIsPeeking,
      isResizing: false,
    }),
    [
      state,
      open,
      setOpen,
      isMobile,
      mobileSidebar,
      openMobile,
      toggleSidebar,
      width,
      side,
      shortcut,
      isPeeking,
    ]
  )

  const revealWidth = getRevealWidth(
    parseSidebarWidth(widthMobile, DEFAULT_WIDTH_MOBILE),
    windowWidth
  )
  const internalValue = React.useMemo<SidebarInternalContextProps>(
    () => ({
      registerSide: setSide,
      registerCollapsible,
      unregisterCollapsible,
      registerVariant: setVariant,
      registerGapWidth,
      collapsible,
      variant,
      gapWidth,
      progress,
      revealWidth,
      isAside,
      setIsAside,
      settleReveal,
    }),
    [
      collapsible,
      gapWidth,
      isAside,
      progress,
      registerCollapsible,
      registerGapWidth,
      revealWidth,
      settleReveal,
      unregisterCollapsible,
      variant,
    ]
  )

  return (
    <SidebarContext value={contextValue}>
      <SidebarInternalContext value={internalValue}>
        <View
          data-slot="sidebar-wrapper"
          data-reveal={isReveal ? (openMobile ? "open" : "closed") : undefined}
          data-reveal-side={isReveal ? side : undefined}
          className={cn("cn-sidebar-wrapper flex-1 flex-row", className)}
          style={[
            isMobile
              ? undefined
              : { paddingLeft: insets.left, paddingRight: insets.right },
            style,
          ]}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </SidebarInternalContext>
    </SidebarContext>
  )
}

/** The surface every form of the sidebar draws its parts on. */
function SidebarInner({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const frame = React.use(SidebarFrameContext)
  const inner = (
    <TextStyle className="cn-sidebar-text">
      <View
        data-slot="sidebar-inner"
        data-sidebar="sidebar"
        className={cn("cn-sidebar-inner flex-1 flex-col", className)}
        {...props}
      >
        {renderTextChildren(children)}
      </View>
    </TextStyle>
  )
  if (!frame) return inner
  return <ScopedVariables variables={frame}>{inner}</ScopedVariables>
}

function useRevealCloseGesture(side: SidebarSide) {
  const { setOpenMobile } = useSidebar()
  const { progress, revealWidth, settleReveal } = useSidebarInternal()
  const release = useLatestCallback(
    (deltaX: number, velocity: number, success: boolean) => {
      const stayOpen =
        !success ||
        shouldRevealStayOpen({
          progress: getRevealDragProgress({ deltaX, width: revealWidth }),
          velocity,
        })
      if (stayOpen) settleReveal(true)
      else setOpenMobile(false)
    }
  )
  return React.useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(side === "left" ? -REVEAL_DRAG_SLOP : REVEAL_DRAG_SLOP)
        .failOffsetY([-REVEAL_DRAG_SLOP, REVEAL_DRAG_SLOP])
        .onUpdate((event) => {
          "worklet"
          progress.value = getRevealProgress(
            toRevealDelta(side, event.translationX),
            revealWidth
          )
        })
        .onEnd((event, success) => {
          "worklet"
          scheduleOnRN(
            release,
            toRevealDelta(side, event.translationX),
            toRevealVelocity(side, event.velocityX),
            success
          )
        }),
    [progress, release, revealWidth, side]
  )
}

function useRevealOpenGesture(isEnabled: boolean, followsFinger: boolean) {
  const { setOpenMobile, side } = useSidebar()
  const { progress, revealWidth, setIsAside, settleReveal } =
    useSidebarInternal()
  const release = useLatestCallback(
    (deltaX: number, velocity: number, success: boolean) => {
      const shouldOpen =
        success &&
        shouldRevealStayOpen({
          progress: getRevealDragProgress({
            deltaX: deltaX - revealWidth,
            width: revealWidth,
          }),
          velocity,
        })
      if (shouldOpen) setOpenMobile(true)
      else settleReveal(false)
    }
  )
  const handleStart = useLatestCallback(() => setIsAside(true))
  return React.useMemo(
    () =>
      Gesture.Pan()
        .enabled(isEnabled)
        .hitSlop(
          side === "left"
            ? { left: 0, width: REVEAL_OPEN_EDGE }
            : { right: 0, width: REVEAL_OPEN_EDGE }
        )
        .activeOffsetX(side === "left" ? REVEAL_DRAG_SLOP : -REVEAL_DRAG_SLOP)
        .failOffsetY([-REVEAL_DRAG_SLOP, REVEAL_DRAG_SLOP])
        .onStart(() => {
          "worklet"
          if (followsFinger) scheduleOnRN(handleStart)
        })
        .onUpdate((event) => {
          "worklet"
          if (!followsFinger) return
          progress.value = getRevealProgress(
            toRevealDelta(side, event.translationX) - revealWidth,
            revealWidth
          )
        })
        .onEnd((event, success) => {
          "worklet"
          scheduleOnRN(
            release,
            toRevealDelta(side, event.translationX),
            toRevealVelocity(side, event.velocityX),
            success
          )
        }),
    [
      followsFinger,
      handleStart,
      isEnabled,
      progress,
      release,
      revealWidth,
      side,
    ]
  )
}

/**
 * The phone sidebar as a surface behind the page: SidebarInset moves aside and
 * shrinks to uncover it, with the rest of the page still in view. The page takes no
 * touches and is hidden from screen readers while it is open. Dragging back or a
 * tap on the page closes it.
 */
function SidebarReveal({
  side,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & { side: SidebarSide }) {
  const { openMobile, setOpenMobile } = useSidebar()
  const { progress, revealWidth, isAside } = useSidebarInternal()
  const insets = useShellInsets()
  const surfaceGesture = useRevealCloseGesture(side)
  const pageGesture = useRevealCloseGesture(side)
  const surfaceStyle = useAnimatedStyle(() => {
    const { opacity, translateX } = getRevealSidebarStyle(
      progress.value,
      revealWidth,
      side
    )
    return { opacity, transform: [{ translateX }] }
  })
  return (
    <>
      <GestureDetector gesture={surfaceGesture}>
        <Animated.View
          data-sidebar="sidebar"
          data-slot="sidebar"
          data-mobile="true"
          data-side={side}
          data-state={openMobile ? "open" : "closed"}
          data-aside={isAside}
          role="dialog"
          aria-modal={openMobile}
          aria-label="Sidebar"
          accessibilityElementsHidden={!openMobile}
          importantForAccessibility={
            openMobile ? "auto" : "no-hide-descendants"
          }
          onAccessibilityEscape={() => setOpenMobile(false)}
          pointerEvents={openMobile ? "auto" : "none"}
          className={cn("cn-sidebar-reveal absolute inset-y-0", className)}
          style={[{ width: revealWidth }, surfaceStyle, style]}
          {...props}
        >
          <SidebarInner
            style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
          >
            {children}
          </SidebarInner>
        </Animated.View>
      </GestureDetector>
      {openMobile && (
        <GestureDetector gesture={pageGesture}>
          <View
            data-slot="sidebar-reveal-close"
            data-side={side}
            className="cn-sidebar-reveal-close absolute inset-y-0"
            style={
              side === "left"
                ? { left: revealWidth, right: 0 }
                : { left: 0, right: revealWidth }
            }
          >
            <Pressable
              role="button"
              accessibilityLabel="Close the sidebar"
              className="flex-1"
              onPress={() => setOpenMobile(false)}
            />
          </View>
        </GestureDetector>
      )}
    </>
  )
}

/** The phone sidebar over the page, on the sheet every overlay shares. */
function SidebarSheet({
  side,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & { side: SidebarSide }) {
  const sidebar = useSidebar()
  const internal = useSidebarInternal()
  const frame = React.use(SidebarFrameContext)
  const portal = useSidebarPortal()
  const { width: windowWidth } = useWindowDimensions()
  return (
    <SheetSurface
      data-sidebar="sidebar"
      data-slot="sidebar"
      data-mobile="true"
      accessibilityLabel="Sidebar"
      open={sidebar.openMobile}
      onOpenChange={sidebar.setOpenMobile}
      side={side}
      className={cn("cn-sidebar-sheet", className)}
      style={[
        { width: internal.revealWidth, maxWidth: windowWidth },
        // An undefined backgroundColor would still override the class's.
        typeof frame?.["--sidebar"] === "string" && {
          backgroundColor: frame["--sidebar"],
        },
        style,
      ]}
      {...props}
    >
      {portal(<SidebarInner>{children}</SidebarInner>)}
    </SheetSurface>
  )
}

function SidebarDesktop({
  side,
  variant,
  collapsible,
  bordered,
  state,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & {
  side: SidebarSide
  variant: SidebarVariant
  collapsible: "offcanvas" | "icon"
  bordered: boolean
  state: "expanded" | "collapsed"
}) {
  const { width } = useSidebar()
  const { registerGapWidth } = useSidebarInternal()
  const insets = useShellInsets()
  const motion = useMotion("move")
  const [rowToken, paddingToken] = useCSSVariable([
    "--density-32",
    "--density-8",
  ])
  const padding = parseNumber(paddingToken, 8)
  const iconWidth = getSidebarIconWidth({
    row: parseNumber(rowToken, 32),
    padding,
  })
  const isCollapsed = state === "collapsed"
  const isFloating = variant === "floating"
  const sidebarWidth = parseSidebarWidth(width, DEFAULT_WIDTH)
  const widths = {
    isCollapsed,
    collapsible,
    variant,
    width: sidebarWidth,
    iconWidth,
    gutter: padding,
  }
  const gapTarget = getSidebarGapWidth(widths)
  const containerTarget = getSidebarContainerWidth(widths)
  const offsetTarget = getSidebarContainerOffset({
    isCollapsed,
    collapsible,
    side,
    width: sidebarWidth,
  })

  React.useEffect(() => {
    registerGapWidth(gapTarget)
    return () => registerGapWidth(0)
  }, [gapTarget, registerGapWidth])

  const gap = useSharedValue(gapTarget)
  const container = useSharedValue(containerTarget)
  const offset = useSharedValue(offsetTarget)
  React.useEffect(() => {
    const config = {
      duration: motion.isReduced
        ? 0
        : isCollapsed
          ? motion.exitMs
          : motion.enterMs,
      easing: isCollapsed ? motion.exitEasing : motion.moveEasing,
    }
    gap.value = withTiming(gapTarget, config)
    container.value = withTiming(containerTarget, config)
    offset.value = withTiming(offsetTarget, config)
  }, [
    container,
    containerTarget,
    gap,
    gapTarget,
    isCollapsed,
    motion,
    offset,
    offsetTarget,
  ])
  const gapStyle = useAnimatedStyle(() => ({ width: gap.value }))
  const containerStyle = useAnimatedStyle(() => ({
    width: container.value,
    transform: [{ translateX: offset.value }],
  }))

  const isOffCanvas = isCollapsed && collapsible === "offcanvas"
  return (
    <View
      data-slot="sidebar"
      data-state={state}
      data-collapsible={isCollapsed ? collapsible : ""}
      data-variant={variant}
      data-side={side}
      className="relative shrink-0"
    >
      <Animated.View
        data-slot="sidebar-gap"
        className="cn-sidebar-gap h-full"
        style={gapStyle}
      />
      <Animated.View
        data-slot="sidebar-container"
        data-side={side}
        data-variant={variant}
        data-edge={bordered && variant === "sidebar" ? side : "none"}
        accessibilityElementsHidden={isOffCanvas}
        importantForAccessibility={isOffCanvas ? "no-hide-descendants" : "auto"}
        pointerEvents={isOffCanvas ? "none" : "auto"}
        className={cn("cn-sidebar-container absolute inset-y-0", className)}
        style={[
          containerStyle,
          isFloating
            ? {
                paddingTop: insets.top + padding,
                paddingBottom: insets.bottom + padding,
              }
            : undefined,
          style,
        ]}
        {...props}
      >
        <SidebarInner
          data-variant={variant}
          style={
            isFloating
              ? undefined
              : { paddingTop: insets.top, paddingBottom: insets.bottom }
          }
        >
          {children}
        </SidebarInner>
      </Animated.View>
    </View>
  )
}

function Sidebar({
  side = "left",
  variant = "sidebar",
  collapsible = "offcanvas",
  bordered = true,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & {
  side?: "left" | "right"
  variant?: "sidebar" | "floating" | "inset"
  collapsible?: "offcanvas" | "icon" | "none"
  /** The `sidebar` variant's inner-edge border. Default true. */
  bordered?: boolean
}) {
  const { isMobile, mobileSidebar, state, width } = useSidebar()
  const {
    registerSide,
    registerCollapsible,
    unregisterCollapsible,
    registerVariant,
  } = useSidebarInternal()
  const insets = useShellInsets()

  React.useEffect(() => registerSide(side), [side, registerSide])
  React.useEffect(() => registerVariant(variant), [variant, registerVariant])
  React.useEffect(() => {
    registerCollapsible(collapsible)
    return () => unregisterCollapsible(collapsible)
  }, [collapsible, registerCollapsible, unregisterCollapsible])

  if (collapsible === "none") {
    return (
      <View
        data-slot="sidebar"
        className={cn("shrink-0 flex-col", className)}
        style={[{ width: parseSidebarWidth(width, DEFAULT_WIDTH) }, style]}
        {...props}
      >
        <SidebarInner
          style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
        >
          {children}
        </SidebarInner>
      </View>
    )
  }

  if (isMobile && mobileSidebar === "reveal") {
    return (
      <SidebarReveal side={side} className={className} style={style} {...props}>
        {children}
      </SidebarReveal>
    )
  }

  if (isMobile) {
    return (
      <SidebarSheet side={side} className={className} style={style} {...props}>
        {children}
      </SidebarSheet>
    )
  }

  return (
    <SidebarDesktop
      side={side}
      variant={variant}
      collapsible={collapsible}
      bordered={bordered}
      state={state}
      className={className}
      style={style}
      {...props}
    >
      {children}
    </SidebarDesktop>
  )
}

const sidebarTriggerWashVariants = cva("cn-sidebar-trigger-wash")
const sidebarToggleIconVariants = cva("cn-sidebar-toggle-icon")
const sidebarToggleIconPanelVariants = cva("cn-sidebar-toggle-icon-panel")

/**
 * The panel glyph (lib/sidebar-model): the sidebar inside its frame widens as it
 * opens, on the look's move timing. A path can't animate on the UI thread here, so
 * each frame of the move draws the shape.
 */
function SidebarToggleIcon({
  open,
  side,
  className,
}: {
  open: boolean
  side: SidebarSide
  className?: string
}) {
  const motion = useMotion("move")
  const { color: frameColor } = useResolveClassNames(
    sidebarToggleIconVariants({ className })
  )
  const { color: panelColor } = useResolveClassNames(
    sidebarToggleIconPanelVariants()
  )
  const size =
    parseNumber(useCSSVariable("--density-icon-16"), 16) * TOGGLE_GLYPH_SCALE
  const progress = useSharedValue(open ? 1 : 0)
  const [drawn, setDrawn] = React.useState(open ? 1 : 0)
  React.useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: motion.isReduced ? 0 : motion.enterMs,
      easing: motion.moveEasing,
    })
  }, [motion, open, progress])
  useAnimatedReaction(
    () => progress.value,
    (value) => {
      scheduleOnRN(setDrawn, value)
    }
  )
  const fill = typeof frameColor === "string" ? frameColor : undefined
  return (
    <Svg
      data-slot="sidebar-toggle-icon"
      data-state={open ? "open" : "closed"}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={side === "right" ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Path
        d={TOGGLE_GLYPH.frame}
        fill={fill}
        stroke={fill}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d={getToggleGlyphPanel(drawn)}
        fill={typeof panelColor === "string" ? panelColor : undefined}
      />
    </Svg>
  )
}

// Whether a part sits in a SidebarHeader, which React Native's styles can't read.
const SidebarHeaderContext = React.createContext(false)

function SidebarTrigger({
  className,
  onPress,
  children,
  accessibilityLabel,
  style,
  ...props
}: Omit<React.ComponentProps<typeof Button>, "style"> & {
  style?: React.ComponentProps<typeof View>["style"]
}) {
  const { toggleSidebar, open, openMobile, isMobile, side } = useSidebar()
  const isInHeader = React.use(SidebarHeaderContext)
  const [rowEnd, badge] = useCSSVariable(["--density-8", "--density-20"])
  const expanded = isMobile ? openMobile : open
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          // Silent, as on the website: it opens and closes too often to sound.
          <Button
            data-sound="none"
            data-sidebar="trigger"
            data-slot="sidebar-trigger"
            variant="ghost"
            size="icon-sm"
            washClassName={sidebarTriggerWashVariants()}
            hitSlop={8}
            aria-expanded={expanded}
            accessibilityLabel={
              accessibilityLabel ??
              (expanded ? "Hide the sidebar" : "Show the sidebar")
            }
            className={cn("cn-sidebar-trigger", className)}
            style={[
              isInHeader
                ? {
                    marginRight: getHeaderTriggerEnd({
                      rowEnd: parseNumber(rowEnd, 8),
                      badge: parseNumber(badge, 20),
                      // size="icon-sm" pins the compact density.
                      button: DENSITIES.compact.space[36],
                    }),
                  }
                : undefined,
              style,
            ]}
            onPress={(event) => {
              onPress?.(event)
              toggleSidebar()
            }}
            {...props}
          />
        }
      >
        {children ?? <SidebarToggleIcon open={expanded} side={side} />}
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {expanded ? "Collapse sidebar" : "Expand sidebar"}
      </TooltipContent>
    </Tooltip>
  )
}

/** The edge handle: a tap collapses or expands. Nothing to reach on a phone. */
function SidebarRail({
  className,
  onPress,
  ...props
}: React.ComponentProps<typeof Pressable>) {
  const { toggleSidebar, isMobile, side, state } = useSidebar()
  if (isMobile) return null
  const expanded = state === "expanded"
  return (
    // The tooltip's root is the view in the layout, so it takes the edge's place.
    <Tooltip
      data-side={side}
      className="cn-sidebar-rail absolute inset-y-0 z-20"
    >
      <TooltipTrigger
        render={
          <Pressable
            data-sidebar="rail"
            data-slot="sidebar-rail"
            role="button"
            accessibilityLabel={
              expanded ? "Collapse the sidebar" : "Expand the sidebar"
            }
            className={cn("cn-sidebar-rail-target flex-1", className)}
            onPress={(event) => {
              onPress?.(event)
              toggleSidebar()
            }}
            {...props}
          />
        }
      />
      <TooltipContent
        side={side === "left" ? "right" : "left"}
        sideOffset={8}
        className="cn-sidebar-rail-tooltip"
      >
        <Text>
          <Text className="cn-sidebar-rail-tooltip-verb">Tap</Text> to{" "}
          {expanded ? "collapse" : "expand"}
        </Text>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * The page. On a phone with `mobileSidebar="reveal"` it moves aside and shrinks to
 * uncover the sidebar, and a swipe from the leading edge drags it there.
 */
function SidebarInset({
  className,
  children,
  gutter,
  statusBarHeight,
  isFlushTop,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children"> & {
  /** How far a card sits from the frame's edges. Default the density's 8pt step. */
  gutter?: number
  /** What the page ends above, when something sits under it. */
  statusBarHeight?: number
  /** A header inside holds the status bar, so the page runs up behind it. */
  isFlushTop?: boolean
  children?: React.ReactNode
}) {
  const sidebar = React.use(SidebarContext)
  if (sidebar) {
    return (
      <SidebarPage
        className={className}
        gutter={gutter}
        statusBarHeight={statusBarHeight}
        isFlushTop={isFlushTop}
        {...props}
      >
        {children}
      </SidebarPage>
    )
  }
  return (
    <Animated.View
      data-slot="sidebar-inset"
      className={cn(
        "cn-sidebar-inset relative min-w-0 flex-1 flex-col",
        className
      )}
      {...props}
    >
      {renderTextChildren(children)}
    </Animated.View>
  )
}

function SidebarPage({
  className,
  children,
  style,
  gutter,
  statusBarHeight = 0,
  isFlushTop,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children"> & {
  gutter?: number
  statusBarHeight?: number
  isFlushTop?: boolean
  children?: React.ReactNode
}) {
  const { isMobile, mobileSidebar, openMobile, side } = useSidebar()
  const { collapsible, gapWidth, isAside, progress, revealWidth, variant } =
    useSidebarInternal()
  const insets = useShellInsets()
  const defaultGutter = parseNumber(useCSSVariable("--density-8"), 8)
  const isReveal = isMobile && mobileSidebar === "reveal"
  const isRevealOpen = isReveal && openMobile
  const canSwipeOpen =
    isMobile && collapsible !== null && collapsible !== "none" && !openMobile
  const openGesture = useRevealOpenGesture(canSwipeOpen, isReveal)
  const revealStyle = useAnimatedStyle(() => {
    const { translateX, scale } = getRevealPageTransform(
      isReveal ? progress.value : 0,
      revealWidth,
      side
    )
    return { transform: [{ translateX }, { scale }] }
  })
  const isCard = variant === "inset"
  return (
    <GestureDetector gesture={openGesture}>
      <Animated.View
        data-slot="sidebar-inset"
        data-reveal={isReveal}
        data-aside={isReveal && isAside}
        data-layout={isMobile ? "page" : isCard ? "card" : "flat"}
        accessibilityElementsHidden={isRevealOpen}
        importantForAccessibility={
          isRevealOpen ? "no-hide-descendants" : "auto"
        }
        pointerEvents={isRevealOpen ? "none" : "auto"}
        className={cn(
          "cn-sidebar-inset relative min-w-0 flex-1 flex-col",
          className
        )}
        style={[
          getInsetFrame({
            isMobile,
            isCard,
            hasSidebarBeside: gapWidth > 0,
            statusBarHeight,
            insetTop: insets.top,
            insetBottom: insets.bottom,
            gutter: gutter ?? defaultGutter,
            isFlushTop,
          }),
          { transformOrigin: side === "left" ? "left center" : "right center" },
          revealStyle,
          style,
        ]}
        {...props}
      >
        {renderTextChildren(children)}
      </Animated.View>
    </GestureDetector>
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

function SidebarHeader({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="sidebar-header"
      data-sidebar="header"
      className={cn("cn-sidebar-header flex-col", className)}
      {...props}
    >
      <SidebarHeaderContext value={true}>
        {renderTextChildren(children)}
      </SidebarHeaderContext>
    </View>
  )
}

function SidebarFooter({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="sidebar-footer"
      data-sidebar="footer"
      className={cn("cn-sidebar-footer flex-col", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
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

function SidebarContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  return (
    <ScrollView
      data-slot="sidebar-content"
      data-sidebar="content"
      showsVerticalScrollIndicator={false}
      className={cn("cn-sidebar-content flex-1", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </ScrollView>
  )
}

/** The panel's chevron, 14pt: it points down while open, on the feedback timing. */
function SidebarChevron({ open }: { open: boolean }) {
  const motion = useMotion("feedback")
  const iconSize = parseNumber(useCSSVariable("--density-icon-14"), 14)
  const rotation = useSharedValue(open ? 90 : 0)
  React.useEffect(() => {
    rotation.value = withTiming(open ? 90 : 0, {
      duration: motion.isReduced ? 0 : motion.enterMs,
      easing: motion.feedbackEasing,
    })
  }, [motion, open, rotation])
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }))
  return (
    <Animated.View style={style}>
      <ChevronRightIcon size={iconSize} strokeWidth={1.5} />
    </Animated.View>
  )
}

type SidebarGroupContextProps = {
  open: boolean
  toggle: () => void
  /** Header actions over the label's end edge, which the label pads past. */
  actionsCount: number
}

const SidebarGroupContext =
  React.createContext<SidebarGroupContextProps | null>(null)

/**
 * Whether a primitive's trigger renders this control: each one sets `expanded`.
 * Its popup plays, or it plays itself, so the control stays silent.
 */
function isPrimitiveTrigger(
  state: React.ComponentProps<typeof Pressable>["accessibilityState"]
) {
  return state?.expanded !== undefined
}

/**
 * A DropdownMenu's root is a view, and `absolute` means the direct parent here. An
 * action inside one would sit under its row instead of over it, so the root takes
 * the row's top edge.
 */
function renderRowChildren(children: React.ReactNode) {
  // A menu alone is the row itself (UserMenu, WorkspaceSwitcher), so it keeps its
  // height. Beside a button, it's the row's action and sits over it.
  const hasRowButton = React.Children.count(children) > 1
  return renderTextChildren(
    React.Children.map(children, (kid) =>
      hasRowButton && React.isValidElement(kid) && kid.type === DropdownMenu ? (
        <View className="absolute inset-x-0 top-0">{kid}</View>
      ) : (
        kid
      )
    )
  )
}

/** Where header actions sit: over the group's padding, or in its header row. */
const SidebarGroupHeaderContext = React.createContext(false)

/** True inside a cluster: actions flow in its row instead of placing themselves. */
const SidebarActionsClusterContext = React.createContext(false)

function SidebarGroup({
  className,
  collapsible = false,
  open: openProp,
  defaultOpen = true,
  onOpenChange,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
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
  const toggle = React.useCallback(() => {
    const next = !open
    setUncontrolledOpen(next)
    onOpenChange?.(next)
  }, [open, onOpenChange])

  // The label and header actions stay put; everything after the label rides in
  // the collapse. Without a SidebarGroupLabel child the group is untouched.
  let content: React.ReactNode = renderRowChildren(children)
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
          <View data-slot="sidebar-group-header" className="relative w-full">
            <SidebarGroupHeaderContext value={true}>
              {kids[labelIndex]}
              {headerActions}
            </SidebarGroupHeaderContext>
          </View>
          <SidebarCollapse open={open}>
            {tail.filter((kid) => !isHeaderAction(kid))}
          </SidebarCollapse>
        </>
      )
    }
  }

  const contextValue = React.useMemo(
    () => ({ open, toggle, actionsCount }),
    [open, toggle, actionsCount]
  )

  return (
    <View
      data-slot="sidebar-group"
      data-sidebar="group"
      data-state={collapsible ? (open ? "open" : "closed") : undefined}
      className={cn(
        "cn-sidebar-group relative w-full min-w-0 flex-col",
        className
      )}
      {...props}
    >
      <SidebarGroupContext value={collapsible ? contextValue : null}>
        {content}
      </SidebarGroupContext>
    </View>
  )
}

/**
 * A height collapse on the move timing. While open and settled the height is its
 * content's, so a sub-tree opening inside it needs no measure. Reduced motion keeps
 * the fade. Its content unmounts once closed.
 */
function SidebarCollapse({
  open,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children"> & {
  open: boolean
  children?: React.ReactNode
}) {
  const motion = useMotion("move")
  const [isMounted, setIsMounted] = React.useState(open)
  if (open && !isMounted) setIsMounted(true)
  const startsOpen = React.useRef(open).current
  const measured = useSharedValue(-1)
  const progress = useSharedValue(open ? 1 : 0)
  const isReduced = motion.isReduced
  React.useEffect(() => {
    progress.value = withTiming(
      open ? 1 : 0,
      {
        duration: open ? motion.enterMs : motion.exitMs,
        easing: open ? motion.moveEasing : motion.exitEasing,
      },
      (finished) => {
        if (finished && !open) scheduleOnRN(setIsMounted, false)
      }
    )
  }, [motion, open, progress])
  const collapseStyle = useAnimatedStyle(() => {
    const opacity = progress.value
    if (isReduced) return { opacity, height: open ? "auto" : 0 }
    if (progress.value >= 1) return { opacity, height: "auto" }
    if (measured.value < 0) {
      return { opacity, height: startsOpen ? "auto" : 0 }
    }
    return { opacity, height: measured.value * progress.value }
  })
  return (
    <Animated.View
      data-slot="sidebar-collapse"
      data-state={open ? "open" : "closed"}
      accessibilityElementsHidden={!open}
      importantForAccessibility={open ? "auto" : "no-hide-descendants"}
      pointerEvents={open ? "auto" : "none"}
      className={cn("cn-sidebar-collapse overflow-hidden", className)}
      style={collapseStyle}
      {...props}
    >
      {isMounted ? (
        <View
          onLayout={(event) => {
            measured.value = event.nativeEvent.layout.height
          }}
        >
          {children}
        </View>
      ) : null}
    </Animated.View>
  )
}

function SidebarGroupLabel({
  className,
  render,
  asChild,
  children,
  onPress,
  style,
  ...props
}: React.ComponentProps<typeof View> &
  RenderProps & {
    onPress?: React.ComponentProps<typeof Pressable>["onPress"]
  }) {
  const group = React.use(SidebarGroupContext)
  const collapse = useSidebarCollapse()
  const feedback = useFeedback()
  const [actionToken, gapToken] = useCSSVariable([
    "--density-24",
    "--density-6",
  ])
  const content = (
    <TextStyle className="cn-sidebar-group-label-text">
      {renderTextChildren(children)}
      {group ? (
        <View
          data-slot="sidebar-group-label-chevron"
          className="cn-sidebar-group-label-chevron shrink-0 items-center justify-center"
        >
          <SidebarChevron open={group.open} />
        </View>
      ) : null}
    </TextStyle>
  )
  const shared = {
    "data-slot": "sidebar-group-label",
    "data-sidebar": "group-label",
    "data-collapsible": collapse,
    className: cn(
      "cn-sidebar-group-label shrink-0 flex-row items-center",
      group && "w-full",
      className
    ),
    // It pads past the header's action cluster.
    style: [
      group?.actionsCount
        ? {
            paddingRight:
              group.actionsCount * (parseNumber(actionToken, 24) + 4) +
              parseNumber(gapToken, 6),
          }
        : undefined,
      style,
    ],
    ...props,
  }
  // Inside a collapsible group the label is the toggle.
  const toggle = group
    ? {
        role: "button" as const,
        "aria-expanded": group.open,
        hitSlop: 8,
        onPress: (
          event: Parameters<
            NonNullable<React.ComponentProps<typeof Pressable>["onPress"]>
          >[0]
        ) => {
          feedback(group.open ? "collapse" : "expand")
          group.toggle()
          onPress?.(event)
        },
      }
    : { role: "heading" as const }
  return (
    renderSlot({ render, asChild }, { ...shared, ...toggle }, content) ??
    (group ? (
      <Pressable {...shared} {...toggle}>
        {content}
      </Pressable>
    ) : (
      <View {...shared} role="heading">
        {content}
      </View>
    ))
  )
}

function SidebarGroupAction({
  className,
  render,
  asChild,
  children,
  accessibilityState,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children"> &
  RenderProps & { children?: React.ReactNode }) {
  const inCluster = React.use(SidebarActionsClusterContext)
  const inHeader = React.use(SidebarGroupHeaderContext)
  const group = React.use(SidebarGroupContext)
  const collapse = useSidebarCollapse()
  const feedback = useFeedback()
  if (collapse === "icon" || group?.open === false) return null
  const content = (
    <TextStyle className="cn-sidebar-group-action-text">
      {renderTextChildren(children)}
    </TextStyle>
  )
  const shared = {
    "data-slot": "sidebar-group-action",
    "data-sidebar": "group-action",
    "data-place": inCluster ? undefined : inHeader ? "header" : "group",
    role: "button" as const,
    hitSlop: 8,
    className: cn(
      "cn-sidebar-group-action items-center justify-center",
      !inCluster && "absolute",
      className
    ),
    accessibilityState,
    onPress: (event: GestureResponderEvent) => {
      if (!isPrimitiveTrigger(accessibilityState)) feedback("tap")
      onPress?.(event)
    },
    ...props,
  }
  return (
    renderSlot({ render, asChild }, shared, content) ?? (
      <Pressable {...shared}>{content}</Pressable>
    )
  )
}

/** Up to three SidebarGroupActions in a row over the group label's end edge. */
function SidebarGroupActions({
  className,
  showOnHover: _showOnHover = false,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  /** Kept so code from the website compiles: touch has no hover, so they stay. */
  showOnHover?: boolean
}) {
  const inHeader = React.use(SidebarGroupHeaderContext)
  const group = React.use(SidebarGroupContext)
  const collapse = useSidebarCollapse()
  if (collapse === "icon" || group?.open === false) return null
  return (
    <View
      data-slot="sidebar-group-actions"
      data-sidebar="group-actions"
      data-place={inHeader ? "header" : "group"}
      className={cn(
        "cn-sidebar-group-actions absolute z-10 flex-row items-center",
        className
      )}
      {...props}
    >
      <SidebarActionsClusterContext value={true}>
        {children}
      </SidebarActionsClusterContext>
    </View>
  )
}

function SidebarGroupContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  return (
    <View
      data-slot="sidebar-group-content"
      data-sidebar="group-content"
      className={cn("cn-sidebar-group-content", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

type SidebarMenuContextProps = {
  /** Names the top-level row the sliding selection sits on. */
  setSelected: React.Dispatch<React.SetStateAction<string | undefined>>
  setIsDragging: (isDragging: boolean) => void
  /**
   * A row is being dragged. Rows shift under a drag by a transform, which the
   * selection can't follow, so until it ends the active row paints its own.
   */
  isDragging: boolean
}

const SidebarMenuContext = React.createContext<SidebarMenuContextProps | null>(
  null
)

/**
 * A fluid hover container, in a sidebar that scrolls, so a drag stays the
 * scroll's: one highlight glides between its rows, sub-rows included, and the
 * active row's background slides between active rows.
 */
function SidebarMenu({
  className,
  children,
  ...props
}: React.ComponentProps<typeof View>) {
  const [selected, setSelected] = React.useState<string>()
  const [isDragging, setIsDragging] = React.useState(false)
  const fluid = useFluidHover({ selected: isDragging ? undefined : selected })
  const menu = React.useMemo(
    () => ({ setSelected, setIsDragging, isDragging }),
    [isDragging]
  )
  return (
    <FluidHoverProvider fluid={fluid}>
      <SidebarMenuContext value={menu}>
        <View
          ref={fluid.attach}
          data-slot="sidebar-menu"
          data-sidebar="menu"
          role="list"
          className={cn(
            "cn-sidebar-menu relative w-full min-w-0 flex-col",
            className
          )}
          {...props}
        >
          <FluidHoverSelection
            selection={fluid.selection}
            className="cn-sidebar-menu-selection"
          />
          <FluidHoverHighlight hover={fluid.hover} />
          {renderTextChildren(children)}
        </View>
      </SidebarMenuContext>
    </FluidHoverProvider>
  )
}

type SidebarRowSize = "default" | "sm" | "lg"

type SidebarMenuItemContextProps = {
  setActions: (count: number) => void
  setHasBadge: (hasBadge: boolean) => void
  setHasToggle: (hasToggle: boolean) => void
  setButton: (size: SidebarRowSize, isActive: boolean, isLit: boolean) => void
  /** What the row's end holds, from lib/sidebar-layout-model. */
  trailing: ReturnType<typeof getRowTrailing>
  size: SidebarRowSize
  isActive: boolean
  isLit: boolean
  /** Set by the selected row, for when the item around it moves. */
  measureSelected: React.RefObject<(() => void) | null>
}

const SidebarMenuItemContext =
  React.createContext<SidebarMenuItemContextProps | null>(null)

function useMenuRow(isDragging: boolean | undefined) {
  const [row, setRow] = React.useState<{
    actionCount: number
    hasBadge: boolean
    hasToggle: boolean
    size: SidebarRowSize
    isActive: boolean
    isLit: boolean
  }>({
    actionCount: 0,
    hasBadge: false,
    hasToggle: false,
    size: "default",
    isActive: false,
    isLit: false,
  })
  const measureSelected = React.useRef<(() => void) | null>(null)
  const setMenuDragging = React.use(SidebarMenuContext)?.setIsDragging
  React.useLayoutEffect(() => {
    if (!isDragging || !setMenuDragging) return
    setMenuDragging(true)
    return () => setMenuDragging(false)
  }, [isDragging, setMenuDragging])
  const setActions = React.useCallback(
    (actionCount: number) =>
      setRow((current) =>
        current.actionCount === actionCount
          ? current
          : { ...current, actionCount }
      ),
    []
  )
  const setHasBadge = React.useCallback(
    (hasBadge: boolean) =>
      setRow((current) =>
        current.hasBadge === hasBadge ? current : { ...current, hasBadge }
      ),
    []
  )
  const setHasToggle = React.useCallback(
    (hasToggle: boolean) =>
      setRow((current) =>
        current.hasToggle === hasToggle ? current : { ...current, hasToggle }
      ),
    []
  )
  const setButton = React.useCallback(
    (size: SidebarRowSize, isActive: boolean, isLit: boolean) =>
      setRow((current) =>
        current.size === size &&
        current.isActive === isActive &&
        current.isLit === isLit
          ? current
          : { ...current, size, isActive, isLit }
      ),
    []
  )
  const [space6, space8, space20, space24, space28, space36] = useCSSVariable([
    "--density-6",
    "--density-8",
    "--density-20",
    "--density-24",
    "--density-28",
    "--density-36",
  ])
  const trailing = React.useMemo(
    () =>
      getRowTrailing({
        actionCount: row.actionCount,
        hasBadge: row.hasBadge,
        hasToggle: row.hasToggle,
        space: {
          6: parseNumber(space6, 6),
          8: parseNumber(space8, 8),
          20: parseNumber(space20, 20),
          24: parseNumber(space24, 24),
          28: parseNumber(space28, 28),
          36: parseNumber(space36, 36),
        },
      }),
    [
      row.actionCount,
      row.hasBadge,
      row.hasToggle,
      space6,
      space8,
      space20,
      space24,
      space28,
      space36,
    ]
  )
  return React.useMemo<SidebarMenuItemContextProps>(
    () => ({
      setActions,
      setHasBadge,
      setHasToggle,
      setButton,
      trailing,
      size: row.size,
      isActive: row.isActive,
      isLit: row.isLit,
      measureSelected,
    }),
    [
      row.isActive,
      row.isLit,
      row.size,
      setActions,
      setButton,
      setHasBadge,
      setHasToggle,
      trailing,
    ]
  )
}

/** The row around a part: App Nav's toggle takes its place at the row's end here. */
function useSidebarMenuRow() {
  return React.use(SidebarMenuItemContext)
}

type RowPressProps = Pick<
  React.ComponentProps<typeof Pressable>,
  | "disabled"
  | "onLayout"
  | "onPressIn"
  | "onPressOut"
  | "onHoverIn"
  | "onHoverOut"
>

/**
 * A row in its menu's Fluid Hover. With `isSelected` the selection sits on it, and
 * keeps up as it moves: a row above it opening moves it without its own layout
 * changing, so the item around it, whose layout does, asks it to measure again.
 */
function useMenuFluidRow({
  isSelected = false,
  disabled,
  onLayout,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
}: RowPressProps & { isSelected?: boolean }) {
  const row = React.use(SidebarMenuItemContext)
  const menu = React.use(SidebarMenuContext)
  const { key, isLit, remeasure, rowProps } = useFluidRow({
    disabled,
    onPressIn,
    onPressOut,
    onHoverIn,
    onHoverOut,
  })
  const measure = useLatestCallback(() => {
    remeasure?.()
  })
  const setSelected = menu?.setSelected
  const measureSelected = row?.measureSelected
  React.useLayoutEffect(() => {
    if (!isSelected || !setSelected) return
    measure()
    setSelected(key)
    return () =>
      setSelected((current) => (current === key ? undefined : current))
  }, [isSelected, key, measure, setSelected])
  React.useLayoutEffect(() => {
    if (!isSelected || !measureSelected) return
    measureSelected.current = measure
    return () => {
      measureSelected.current = null
    }
  }, [isSelected, measure, measureSelected])
  return {
    isLit,
    /** Paints its own active fill and pressed fill: no overlay is doing it. */
    paintsOwnFill: !menu || menu.isDragging,
    rowProps: {
      ...rowProps,
      onLayout: (event: LayoutChangeEvent) => {
        rowProps.onLayout(event)
        onLayout?.(event)
      },
    },
  }
}

function SidebarMenuItem({
  className,
  children,
  onLayout,
  "data-dragging": isDragging,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children" | "onLayout"> & {
  children?: React.ReactNode
  onLayout?: (event: LayoutChangeEvent) => void
  "data-dragging"?: boolean
}) {
  const row = useMenuRow(isDragging)
  return (
    <SidebarMenuItemContext value={row}>
      <Animated.View
        data-slot="sidebar-menu-item"
        data-sidebar="menu-item"
        data-dragging={isDragging}
        role="listitem"
        className={cn("relative", className)}
        onLayout={(event) => {
          row.measureSelected.current?.()
          onLayout?.(event)
        }}
        {...props}
      >
        {renderRowChildren(children)}
      </Animated.View>
    </SidebarMenuItemContext>
  )
}

const sidebarMenuButtonVariants = cva(
  "cn-sidebar-menu-button w-full flex-row items-center",
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

const sidebarMenuButtonTextVariants = cva("cn-sidebar-menu-button-text", {
  variants: {
    size: {
      default: "",
      sm: "cn-sidebar-menu-button-text-size-sm",
      lg: "",
    },
    state: {
      default: "",
      active: "cn-sidebar-menu-button-text-active",
    },
  },
  defaultVariants: {
    size: "default",
    state: "default",
  },
})

const sidebarMenuButtonIconVariants = cva("cn-sidebar-menu-button-icon", {
  variants: {
    state: {
      default: "",
      active: "cn-sidebar-menu-button-icon-active",
    },
  },
  defaultVariants: {
    state: "default",
  },
})

function SidebarMenuDot({
  dot,
  isActive,
}: {
  dot: "filled" | "ring"
  isActive: boolean
}) {
  return (
    <View
      data-slot="sidebar-menu-dot"
      className="cn-sidebar-menu-dot-slot shrink-0 items-center justify-center"
    >
      <View
        data-dot={dot}
        data-active={isActive}
        className="cn-sidebar-menu-dot"
      />
    </View>
  )
}

function renderRowIcon(icon: SidebarIcon) {
  if (React.isValidElement(icon)) return icon
  const Icon = icon
  return <Icon data-slot="sidebar-menu-icon" />
}

function SidebarMenuButton({
  render,
  asChild,
  isActive = false,
  variant = "default",
  size = "default",
  tooltip,
  icon,
  status,
  dot,
  className,
  children,
  style,
  disabled,
  accessibilityLabel,
  accessibilityState,
  "aria-expanded": ariaExpanded,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onLayout,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "style"> &
  RenderProps & {
    isActive?: boolean
    /** Shown on a long press while the sidebar is its rail of icons. */
    tooltip?: string | React.ComponentProps<typeof TooltipContent>
    /** Leading icon, as a component (`icon={HomeIcon}`) or an element. */
    icon?: SidebarIcon
    /**
     * Row state for status-dot navigation: `active` and `unread` draw a filled
     * dot, `idle` a ring. `active` implies `isActive`; `unread` adds to what
     * screen readers hear.
     */
    status?: "active" | "unread" | "idle"
    /** A visual-only dot when `status` doesn't fit. Ignored with `icon`. */
    dot?: "filled" | "ring"
    children?: React.ReactNode
    style?: React.ComponentProps<typeof View>["style"]
  } & VariantProps<typeof sidebarMenuButtonVariants>) {
  const row = React.use(SidebarMenuItemContext)
  const collapse = useSidebarCollapse()
  const feedback = useFeedback()
  const active = isActive || status === "active"
  const resolvedSize = size ?? "default"
  const resolvedDot =
    dot ?? (status ? (status === "idle" ? "ring" : "filled") : undefined)
  const fluid = useMenuFluidRow({
    isSelected: active,
    disabled,
    onLayout,
    onPressIn,
    onPressOut,
    onHoverIn,
    onHoverOut,
  })
  const { isLit } = fluid
  // A lit row turns foreground like the active one.
  const state = active || isLit ? "active" : "default"
  const { color: iconColor } = useResolveClassNames(
    sidebarMenuButtonIconVariants({ state })
  )
  const setButton = row?.setButton
  React.useLayoutEffect(() => {
    setButton?.(resolvedSize, active, isLit)
  }, [active, isLit, resolvedSize, setButton])

  const isRail = collapse === "icon"
  const text = getTextContent(children)
  const content = (
    <TextStyle
      eases
      className={sidebarMenuButtonTextVariants({ size: resolvedSize, state })}
    >
      <IconProvider
        strokeWidth={active || isLit ? 2 : 1.5}
        {...(typeof iconColor === "string" ? { color: iconColor } : {})}
      >
        {icon ? (
          renderRowIcon(icon)
        ) : resolvedDot ? (
          <SidebarMenuDot dot={resolvedDot} isActive={active || isLit} />
        ) : null}
      </IconProvider>
      {wrapTextChildren(children, (label, key) => (
        <Text
          key={key}
          numberOfLines={1}
          data-collapsible={collapse}
          className="cn-sidebar-menu-button-label"
        >
          {label}
        </Text>
      ))}
    </TextStyle>
  )
  const shared = {
    "data-slot": "sidebar-menu-button",
    "data-sidebar": "menu-button",
    "data-size": resolvedSize,
    "data-active": active,
    "data-status": status,
    "data-collapsible": collapse,
    "data-fluid": !fluid.paintsOwnFill,
    role: "button" as const,
    disabled,
    "aria-expanded": ariaExpanded,
    accessibilityLabel:
      accessibilityLabel ??
      (status === "unread" ? `Unread: ${text}` : isRail ? text : undefined),
    accessibilityState: {
      selected: active,
      disabled: Boolean(disabled),
      ...accessibilityState,
    },
    className: cn(sidebarMenuButtonVariants({ variant, size }), className),
    style: [
      !isRail && row ? { paddingRight: row.trailing.gutter } : undefined,
      style,
    ],
    onPress: (event: GestureResponderEvent) => {
      // A row that only opens its children is a disclosure, as on the website.
      if (!isPrimitiveTrigger(accessibilityState)) {
        feedback(
          ariaExpanded === undefined
            ? "tick"
            : ariaExpanded
              ? "collapse"
              : "expand"
        )
      }
      onPress?.(event)
    },
    ...fluid.rowProps,
    ...props,
  }
  const button = renderSlot({ render, asChild }, shared, content) ?? (
    <Pressable {...shared}>{content}</Pressable>
  )
  if (!tooltip || !isRail) return button
  const tooltipProps =
    typeof tooltip === "string" ? { children: tooltip } : tooltip
  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="right" align="center" {...tooltipProps} />
    </Tooltip>
  )
}

function SidebarMenuAction({
  className,
  render,
  asChild,
  showOnHover: _showOnHover = false,
  children,
  style,
  accessibilityState,
  onPress,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "style"> &
  RenderProps & {
    /** Kept so code from the website compiles: touch has no hover, so it stays. */
    showOnHover?: boolean
    children?: React.ReactNode
    style?: React.ComponentProps<typeof View>["style"]
  }) {
  const row = React.use(SidebarMenuItemContext)
  const inCluster = React.use(SidebarActionsClusterContext)
  const collapse = useSidebarCollapse()
  const feedback = useFeedback()

  // A lone action reserves its own slot; a cluster reserves its whole run.
  const setActions = row?.setActions
  React.useLayoutEffect(() => {
    if (inCluster || !setActions) return
    setActions(1)
    return () => setActions(0)
  }, [inCluster, setActions])

  if (collapse === "icon") return null
  const content = row?.isLit ? (
    <TextStyle className="cn-sidebar-menu-action-text cn-sidebar-menu-action-text-lit">
      {renderTextChildren(children)}
    </TextStyle>
  ) : (
    <TextStyle className="cn-sidebar-menu-action-text">
      {renderTextChildren(children)}
    </TextStyle>
  )
  const shared = {
    "data-slot": "sidebar-menu-action",
    "data-sidebar": "menu-action",
    "data-row-size": inCluster ? undefined : (row?.size ?? "default"),
    role: "button" as const,
    hitSlop: 8,
    className: cn(
      "cn-sidebar-menu-action items-center justify-center",
      !inCluster && "absolute",
      className
    ),
    style: [
      !inCluster && row ? { right: row.trailing.actionsEnd } : undefined,
      style,
    ],
    accessibilityState,
    onPress: (event: GestureResponderEvent) => {
      if (!isPrimitiveTrigger(accessibilityState)) feedback("tap")
      onPress?.(event)
    },
    ...props,
  }
  return (
    renderSlot({ render, asChild }, shared, content) ?? (
      <Pressable {...shared}>{content}</Pressable>
    )
  )
}

/** Several SidebarMenuActions in a row at the row's end. */
function SidebarMenuActions({
  className,
  showOnHover: _showOnHover = false,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & {
  /** Kept so code from the website compiles: touch has no hover, so they stay. */
  showOnHover?: boolean
}) {
  const row = React.use(SidebarMenuItemContext)
  const collapse = useSidebarCollapse()
  const count = React.Children.count(children)
  const setActions = row?.setActions
  React.useLayoutEffect(() => {
    setActions?.(count)
    return () => setActions?.(0)
  }, [setActions, count])

  if (collapse === "icon") return null
  return (
    <View
      data-slot="sidebar-menu-actions"
      data-sidebar="menu-actions"
      data-row-size={row?.size ?? "default"}
      className={cn(
        "cn-sidebar-menu-actions absolute z-10 flex-row items-center",
        className
      )}
      style={[row ? { right: row.trailing.actionsEnd } : undefined, style]}
      {...props}
    >
      <SidebarActionsClusterContext value={true}>
        {children}
      </SidebarActionsClusterContext>
    </View>
  )
}

function SidebarMenuBadge({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View>) {
  const row = React.use(SidebarMenuItemContext)
  const collapse = useSidebarCollapse()
  const setHasBadge = row?.setHasBadge
  React.useLayoutEffect(() => {
    setHasBadge?.(true)
    return () => setHasBadge?.(false)
  }, [setHasBadge])

  if (collapse === "icon") return null
  const badge = (
    <View
      data-slot="sidebar-menu-badge"
      data-sidebar="menu-badge"
      data-row-size={row?.size ?? "default"}
      pointerEvents="none"
      className={cn(
        "cn-sidebar-menu-badge absolute items-center justify-center",
        className
      )}
      style={[row ? { right: row.trailing.badgeEnd } : undefined, style]}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
  return row?.isActive || row?.isLit ? (
    <TextStyle className="cn-sidebar-menu-badge-text cn-sidebar-menu-badge-text-active">
      {badge}
    </TextStyle>
  ) : (
    <TextStyle className="cn-sidebar-menu-badge-text">{badge}</TextStyle>
  )
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<typeof View> & {
  showIcon?: boolean
}) {
  const width = getSkeletonWidth(React.useId())
  return (
    <View
      data-slot="sidebar-menu-skeleton"
      data-sidebar="menu-skeleton"
      className={cn(
        "cn-sidebar-menu-skeleton flex-row items-center",
        className
      )}
      {...props}
    >
      {showIcon && <Skeleton className="cn-sidebar-menu-skeleton-icon" />}
      <Skeleton
        className="cn-sidebar-menu-skeleton-text flex-1"
        style={{ maxWidth: width }}
      />
    </View>
  )
}

// How deep a sub-menu sits, 1 under a top-level row. Its rows indent one step a
// level, so sub-menus nest to any depth.
const SidebarMenuDepthContext = React.createContext(0)

function SidebarMenuSub({
  className,
  open,
  children,
  ...props
}: React.ComponentProps<typeof View> & {
  /**
   * Collapse the sub-tree on the move timing. Omitted, it is always shown (or
   * wrapped in a Collapsible).
   */
  open?: boolean
}) {
  const depth = React.use(SidebarMenuDepthContext) + 1
  const collapse = useSidebarCollapse()
  const list = (
    <View
      data-slot="sidebar-menu-sub"
      data-sidebar="menu-sub"
      data-state={open === undefined ? undefined : open ? "open" : "closed"}
      data-collapsible={collapse}
      role="list"
      className={cn("cn-sidebar-menu-sub min-w-0 flex-col", className)}
      {...props}
    >
      <SidebarMenuDepthContext value={depth}>
        {renderTextChildren(children)}
      </SidebarMenuDepthContext>
    </View>
  )
  if (open === undefined) return list
  return <SidebarCollapse open={open}>{list}</SidebarCollapse>
}

function SidebarMenuSubItem({
  className,
  children,
  "data-dragging": isDragging,
  ...props
}: Omit<React.ComponentProps<typeof Animated.View>, "children"> & {
  children?: React.ReactNode
  "data-dragging"?: boolean
}) {
  const row = useMenuRow(isDragging)
  return (
    <SidebarMenuItemContext value={row}>
      <Animated.View
        data-slot="sidebar-menu-sub-item"
        data-sidebar="menu-sub-item"
        data-dragging={isDragging}
        role="listitem"
        className={cn("relative", className)}
        {...props}
      >
        {renderRowChildren(children)}
      </Animated.View>
    </SidebarMenuItemContext>
  )
}

const sidebarMenuSubButtonTextVariants = cva(
  "cn-sidebar-menu-sub-button-text",
  {
    variants: {
      size: {
        md: "",
        sm: "cn-sidebar-menu-sub-button-text-size-sm",
      },
      state: {
        default: "",
        active: "cn-sidebar-menu-sub-button-text-active",
      },
    },
    defaultVariants: {
      size: "md",
      state: "default",
    },
  }
)

function SidebarMenuSubButton({
  render,
  asChild,
  size = "md",
  isActive = false,
  icon,
  className,
  children,
  style,
  disabled,
  accessibilityState,
  "aria-expanded": ariaExpanded,
  onPress,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  onLayout,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "style"> &
  RenderProps & {
    size?: "sm" | "md"
    isActive?: boolean
    /** Leading icon, as a component or an element. */
    icon?: SidebarIcon
    children?: React.ReactNode
    style?: React.ComponentProps<typeof View>["style"]
  }) {
  const row = React.use(SidebarMenuItemContext)
  const depth = React.use(SidebarMenuDepthContext)
  const collapse = useSidebarCollapse()
  const feedback = useFeedback()
  const [space8, space16, icon14] = useCSSVariable([
    "--density-8",
    "--density-16",
    "--density-icon-14",
  ])
  const start = parseNumber(space8, 8)
  const step = parseNumber(space16, 16)
  const rowSize = size === "sm" ? "sm" : "default"
  const fluid = useMenuFluidRow({
    disabled,
    onLayout,
    onPressIn,
    onPressOut,
    onHoverIn,
    onHoverOut,
  })
  const { isLit } = fluid
  const setButton = row?.setButton
  React.useLayoutEffect(() => {
    setButton?.(rowSize, isActive, isLit)
  }, [isActive, isLit, rowSize, setButton])

  const content = (
    <TextStyle
      eases
      className={sidebarMenuSubButtonTextVariants({
        size,
        state: isActive || isLit ? "active" : "default",
      })}
    >
      <IconProvider
        size={parseNumber(icon14, 14)}
        strokeWidth={isActive || isLit ? 2 : 1.5}
      >
        {icon ? renderRowIcon(icon) : null}
      </IconProvider>
      {wrapTextChildren(children, (label, key) => (
        <Text
          key={key}
          numberOfLines={1}
          className="cn-sidebar-menu-sub-button-label"
        >
          {label}
        </Text>
      ))}
    </TextStyle>
  )
  const shared = {
    "data-slot": "sidebar-menu-sub-button",
    "data-sidebar": "menu-sub-button",
    "data-size": size,
    "data-active": isActive,
    "data-collapsible": collapse,
    "data-fluid": !fluid.paintsOwnFill,
    role: "button" as const,
    disabled,
    "aria-expanded": ariaExpanded,
    accessibilityState: {
      selected: isActive,
      disabled: Boolean(disabled),
      ...accessibilityState,
    },
    className: cn(
      "cn-sidebar-menu-sub-button min-w-0 flex-row items-center",
      className
    ),
    style: [
      {
        // A row without an icon starts its label under its parent's.
        paddingLeft: icon ? start + step * depth : step * (depth + 1),
        paddingRight: row?.trailing.gutter ?? start,
      },
      style,
    ],
    onPress: (event: GestureResponderEvent) => {
      if (!isPrimitiveTrigger(accessibilityState)) {
        feedback(
          ariaExpanded === undefined
            ? "tick"
            : ariaExpanded
              ? "collapse"
              : "expand"
        )
      }
      onPress?.(event)
    },
    ...fluid.rowProps,
    ...props,
  }
  return (
    renderSlot({ render, asChild }, shared, content) ?? (
      <Pressable {...shared}>{content}</Pressable>
    )
  )
}

export {
  Sidebar,
  SidebarChevron,
  SidebarContent,
  SidebarFooter,
  SidebarFrameContext,
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
  useShellInsets,
  useSidebar,
  useSidebarCollapse,
  useSidebarLayout,
  useSidebarMenuRow,
  useSidebarPortal,
  type SidebarIcon,
}
