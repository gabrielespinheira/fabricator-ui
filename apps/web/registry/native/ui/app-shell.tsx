// App Shell on touch: the frame an application lives in. It wraps SidebarProvider
// and adds a main column with a header, breadcrumb and status bar, side panels that
// dock, float or become a drawer depending on the room left, and the phone's tab bar
// and floating primary action.
//
// Layout follows the shell's own width, and the behaviour lives in
// lib/app-shell-model, the same file the website runs.
//
// `shortcut`, `shortcutScope` and `window` are accepted and do nothing: React Native
// has no global key events and draws no window controls of its own. Shortcuts still
// register, so `useShellShortcuts` can list them for a command palette. A panel keeps
// its width: dragging its edge needs a pointer.
import * as React from "react"
import {
  ChevronDownIcon,
  EllipsisIcon,
  IconProvider,
  PanelBottomIcon,
  PlusIcon,
  XIcon,
  type IconProps,
} from "@fabricator-ui/icons-react-native"
import {
  useComposedRefs,
  useEffectEvent as useLatestCallback,
} from "@rn-primitives/hooks"
import { Portal, PortalHost } from "@rn-primitives/portal"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native"
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated"
import { SafeAreaInsetsContext } from "react-native-safe-area-context"
import { ScopedVariables, useCSSVariable, useResolveClassNames } from "uniwind"

import { DENSITIES } from "@/registry/fabricator/density"
import {
  foldBreadcrumbs,
  formatShortcut,
  getDefaultPanelShortcut,
  getPanelPlacement,
  getPanelTriggerAnchor,
  getShellSize,
  getShellStorageKey,
  parseShellLayout,
  parseShortcut,
  readStoredJson,
  revealPanelView,
  selectPanelView,
  SHELL_BREAKPOINTS,
  type AppShellContentSize,
  type PanelMobile,
  type PanelPlacement,
  type PanelState,
  type ShellBreakpoints,
  type ShellLayoutState,
  type ShellSize,
  type ShellStorage,
  type ShortcutEvent,
  type ShortcutPlatform,
} from "@/registry/fabricator/shared/lib/app-shell-model"
import { noteStep } from "@/registry/fabricator/shared/lib/sound-recipes"
import {
  applyPanelUpdate,
  FALLBACK_PANEL,
  getContentBottomInset,
  getContentColumn,
  getFabBottom,
  getFabClearance,
  getFloatingNavMetrics,
  getOtherPanelsWidth,
  getPanelFrame,
  getPanelHeaderEnd,
  getPinnedTriggerPosition,
  getStatusBarHeight,
  isTitleScrolledAway,
  shouldShowHeaderTrigger,
} from "@/registry/native/lib/app-shell-layout-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import {
  FluidHoverArea,
  FluidHoverHighlight,
  FluidHoverProvider,
  FluidHoverSelection,
  useFluidHover,
  useFluidRow,
} from "@/registry/native/lib/fluid-hover"
import { HeaderFade } from "@/registry/native/lib/header-fade"
import { useMotion } from "@/registry/native/lib/motion"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import { getTextContent } from "@/registry/native/lib/overlay-model"
import { renderSlot, type RenderProps } from "@/registry/native/lib/render"
import {
  SheetSurface,
  SheetSurfaceScrollView,
} from "@/registry/native/lib/sheet-surface"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/native/ui/breadcrumb"
import { Button } from "@/registry/native/ui/button"
import { Drawer, DrawerContent } from "@/registry/native/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import { Sheet, SheetContent } from "@/registry/native/ui/sheet"
import {
  SidebarFrameContext,
  SidebarInset,
  SidebarProvider,
  SidebarToggleIcon,
  SidebarTrigger,
  useShellInsets,
  useSidebar,
  useSidebarLayout,
  useSidebarPortal,
} from "@/registry/native/ui/sidebar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/native/ui/tabs"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/native/ui/tooltip"

// A button of size="icon-sm" pins the compact density, and size="icon-lg" the
// spacious one, whatever the shell's density is.
const ICON_SM = DENSITIES.compact.space[36]
const ICON_LG = DENSITIES.spacious.space[36]
/** Below this a panel's view tabs show their icons only (pt). */
const PANEL_TABS_LABEL_WIDTH = 360

/** An icon as a component (`icon={HomeIcon}`) or an element (`icon={<HomeIcon />}`). */
type IconLike = React.ComponentType<IconProps> | React.ReactElement

function IconSlot({ icon }: { icon?: IconLike }) {
  if (!icon) return null
  if (React.isValidElement(icon)) return icon
  const IconComponent = icon
  return <IconComponent />
}

// MARK: Storage adapters

function createMemoryStorage(): ShellStorage {
  const entries = new Map<string, string>()
  return {
    get: (key) => entries.get(key) ?? null,
    set: (key, value) => {
      entries.set(key, value)
    },
  }
}

/**
 * The website's cookie has no place here. It keeps the layout for the session, so
 * shared code compiles; pass your own `ShellStorage` to save it across launches.
 */
function createCookieStorage(_options: { maxAge?: number } = {}): ShellStorage {
  return createMemoryStorage()
}

/**
 * localStorage has no place here either. It keeps the layout for the session; pass
 * your own `ShellStorage` to save it across launches.
 */
function createLocalStorage(): ShellStorage {
  return createMemoryStorage()
}

// MARK: Platform

/** "apple" reads `mod` as ⌘; everything else as Ctrl. */
function useShortcutPlatform(): ShortcutPlatform {
  return Platform.OS === "ios" || Platform.OS === "macos" ? "apple" : "other"
}

// MARK: Shortcut registry

type ShellShortcut = {
  /** A stable id, listed by useShellShortcuts ("panel.toggle"). */
  id?: string
  /** "mod+alt+b"; `mod` is ⌘ on Apple platforms and Ctrl elsewhere. */
  keys: string | null
  /** The website's keys in a browser. Kept so shared code compiles. */
  webKeys?: string | null
  /** What it does, for command palettes and tooltips. */
  label?: string
  /** Kept so shared code compiles. */
  allowInInputs?: boolean
}

type ShortcutEntry = ShellShortcut & {
  handler: (event: ShortcutEvent) => void
}

type ShortcutRegistry = {
  register: (entry: ShortcutEntry) => () => void
  entries: () => ShortcutEntry[]
  subscribe: (listener: () => void) => () => void
}

function createShortcutRegistry(): ShortcutRegistry {
  let entries: ShortcutEntry[] = []
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((listener) => listener())
  return {
    register(entry) {
      entries = [...entries, entry]
      emit()
      return () => {
        entries = entries.filter((existing) => existing !== entry)
        emit()
      }
    },
    entries: () => entries,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

// MARK: Context

/** How a desktop app's window draws its controls. Kept so shared code compiles. */
type AppShellWindow = {
  controls: "none" | "macos" | "overlay"
  isFullscreen?: boolean
  trafficLights?: { x: number; y: number }
  isTranslucent?: boolean
  overlayWidth?: number
}

type PanelConfig = {
  label: string
  defaults: PanelState
  shortcut: string | null
  side: "left" | "right"
  minWidth: number
  maxWidth: number
}

type AppShellContextValue = {
  size: ShellSize
  width: number
  sidebarWidth: number
  breakpoints: ShellBreakpoints
  minMainWidth: number
  window: AppShellWindow | null
  isDesktop: boolean
  platform: ShortcutPlatform
  contentId: string
  shortcuts: ShortcutRegistry
  panels: Record<string, PanelState>
  /** Open state of panels that float (overlay, drawer, swap): temporary. */
  floatingOpen: Record<string, boolean>
  floating: Record<string, boolean>
  setFloating: (id: string, isFloating: boolean) => void
  /** Panels this size of shell doesn't show (`mobile="none"` on a phone). */
  absent: Record<string, boolean>
  setAbsent: (id: string, isAbsent: boolean) => void
  configs: Record<string, PanelConfig>
  registerPanel: (id: string, config: PanelConfig) => () => void
  updatePanel: (id: string, update: (panel: PanelState) => PanelState) => void
  hasStatusBar: boolean
  setHasStatusBar: (hasStatusBar: boolean) => void
  /** Toggles pinned over the frame's corner, which panel headers make room for. */
  pinnedTriggers: number
  setPinnedTriggers: React.Dispatch<React.SetStateAction<number>>
}

const AppShellContext = React.createContext<AppShellContextValue | null>(null)

type AppShellScrollValue = {
  isScrolled: boolean
  scrollRoot: React.RefObject<React.ComponentRef<typeof ScrollView> | null>
  onContentScroll: (y: number) => void
  pageTitle: React.ReactNode | null
  /** Where the page's heading ends in the scroller, and the heading itself. */
  setTitle: (title: { bottom: number; node: React.ReactNode } | null) => void
  hasBottomNav: boolean
  setHasBottomNav: (hasBottomNav: boolean) => void
  hasFab: boolean
  setHasFab: (hasFab: boolean) => void
  /** How far a phone's header reaches down: the page scrolls under it. */
  phoneHeaderHeight: number
  setPhoneHeaderHeight: (height: number) => void
  /** How far a tab bar that floats over the page reaches up. */
  bottomNavOverlap: number
  setBottomNavOverlap: (overlap: number) => void
}

const AppShellScrollContext = React.createContext<AppShellScrollValue | null>(
  null
)

function useAppShell() {
  const context = React.use(AppShellContext)
  if (!context) {
    throw new Error("useAppShell must be used within an AppShell.")
  }
  return context
}

function useAppShellScroll() {
  const context = React.use(AppShellScrollContext)
  if (!context) {
    throw new Error("App Shell parts must be used within an AppShell.")
  }
  return context
}

/** Attributes that make an element a window drag region. Windows don't drag here. */
function useDragRegionProps() {
  return {}
}

function usePinnedHost() {
  return `${useAppShell().contentId}:pinned`
}

function useFabHost() {
  return `${useAppShell().contentId}:fab`
}

// MARK: AppShell

type AppShellProps = React.ComponentProps<typeof View> &
  Pick<
    React.ComponentProps<typeof SidebarProvider>,
    | "defaultOpen"
    | "open"
    | "onOpenChange"
    | "persist"
    | "shortcut"
    | "peek"
    | "widthMobile"
  > & {
    /**
     * The sidebar on phones. `reveal`: the page moves aside and shrinks to show
     * it behind. `sheet`: it slides over the page.
     */
    mobileSidebar?: React.ComponentProps<
      typeof SidebarProvider
    >["mobileSidebar"]
    /** Names this shell's saved layout: `app-shell.<storageKey>.layout`. */
    storageKey?: string
    /** Where the layout is saved. Default: nowhere. Pass your own adapter. */
    storage?: ShellStorage | null
    /** The saved layout, read before the first render. */
    defaultLayout?: ShellLayoutState
    /** The sidebar's starting width. */
    sidebarWidth?: string
    /** Kept so shared code compiles: there are no window controls to clear. */
    window?: AppShellWindow
    /** A full-width row above the sidebar and main column (AppShellTitlebar). */
    titlebar?: React.ReactNode
    breakpoints?: ShellBreakpoints
    /** The narrowest the main column gets before panels float over it. */
    minMainWidth?: number
    /** Kept so shared code compiles: no global key events. */
    shortcutScope?: "window" | "focus"
  }

function AppShell({
  storageKey = "default",
  storage: storageProp,
  defaultLayout,
  sidebarWidth: sidebarWidthProp,
  window: windowProp,
  titlebar,
  breakpoints = SHELL_BREAKPOINTS,
  minMainWidth = 520,
  shortcutScope: _shortcutScope = "window",
  defaultOpen,
  open,
  onOpenChange,
  persist,
  shortcut,
  peek,
  widthMobile,
  mobileSidebar = "reveal",
  className,
  children,
  onLayout,
  ...props
}: AppShellProps) {
  const { width: windowWidth } = useWindowDimensions()
  const insets = useShellInsets()
  const platform = useShortcutPlatform()
  const contentId = React.useId()
  const [shortcuts] = React.useState(createShortcutRegistry)
  const layoutKey = getShellStorageKey(storageKey, "layout")
  const storage = storageProp ?? null

  const [measuredWidth, setMeasuredWidth] = React.useState(0)
  const width = measuredWidth > 0 ? measuredWidth : windowWidth
  const size = getShellSize(width, breakpoints)
  const [sidebarGap, setSidebarGap] = React.useState(0)

  const [layout, setLayout] = React.useState<ShellLayoutState>(
    () => defaultLayout ?? { panels: {} }
  )
  const [floatingOpen, setFloatingOpen] = React.useState<
    Record<string, boolean>
  >({})
  const [floating, setFloatingState] = React.useState<Record<string, boolean>>(
    {}
  )
  const setFloating = React.useCallback((id: string, isFloating: boolean) => {
    setFloatingState((current) =>
      current[id] === isFloating ? current : { ...current, [id]: isFloating }
    )
  }, [])
  const [absent, setAbsentState] = React.useState<Record<string, boolean>>({})
  const setAbsent = React.useCallback((id: string, isAbsent: boolean) => {
    setAbsentState((current) =>
      current[id] === isAbsent ? current : { ...current, [id]: isAbsent }
    )
  }, [])
  const [configs, setConfigs] = React.useState<Record<string, PanelConfig>>({})
  const [hasStatusBar, setHasStatusBar] = React.useState(false)
  const [pinnedTriggers, setPinnedTriggers] = React.useState(0)

  // Without a layout read up front, adopt the stored one after mounting.
  const hasRestored = React.useRef(defaultLayout !== undefined)
  React.useEffect(() => {
    if (hasRestored.current || !storage) return
    hasRestored.current = true
    setLayout(parseShellLayout(readStoredJson(storage, layoutKey)))
  }, [storage, layoutKey])

  // Event handlers read the latest state through refs, so several updates in one
  // event build on each other and storage is written once per change.
  const latest = React.useRef({ layout, floatingOpen, floating, configs })
  React.useLayoutEffect(() => {
    latest.current = { layout, floatingOpen, floating, configs }
  })

  const commitLayout = React.useCallback(
    (next: ShellLayoutState) => {
      latest.current.layout = next
      setLayout(next)
      storage?.set(layoutKey, JSON.stringify(next))
    },
    [storage, layoutKey]
  )

  const registerPanel = React.useCallback((id: string, config: PanelConfig) => {
    setConfigs((current) => {
      const existing = current[id]
      const isSame =
        existing &&
        existing.label === config.label &&
        existing.shortcut === config.shortcut &&
        existing.side === config.side &&
        existing.minWidth === config.minWidth &&
        existing.maxWidth === config.maxWidth &&
        existing.defaults.open === config.defaults.open &&
        existing.defaults.view === config.defaults.view &&
        existing.defaults.width === config.defaults.width
      return isSame ? current : { ...current, [id]: config }
    })
    return () =>
      setConfigs((current) => {
        const { [id]: _removed, ...rest } = current
        return rest
      })
  }, [])

  const updatePanel = React.useCallback(
    (id: string, update: (panel: PanelState) => PanelState) => {
      const current = latest.current
      const next = applyPanelUpdate({
        id,
        update,
        layout: current.layout,
        floatingOpen: current.floatingOpen,
        isFloating: current.floating[id] ?? false,
        defaults: current.configs[id]?.defaults,
      })
      if (next.floatingOpen) {
        latest.current.floatingOpen = next.floatingOpen
        setFloatingOpen(next.floatingOpen)
      }
      if (next.layout) commitLayout(next.layout)
    },
    [commitLayout]
  )

  const contextValue = React.useMemo<AppShellContextValue>(
    () => ({
      size,
      width,
      sidebarWidth: size === "phone" ? 0 : sidebarGap,
      breakpoints,
      minMainWidth,
      window: windowProp ?? null,
      isDesktop: windowProp !== undefined,
      platform,
      contentId,
      shortcuts,
      panels: layout.panels,
      floatingOpen,
      floating,
      setFloating,
      absent,
      setAbsent,
      configs,
      registerPanel,
      updatePanel,
      hasStatusBar,
      setHasStatusBar,
      pinnedTriggers,
      setPinnedTriggers,
    }),
    [
      absent,
      breakpoints,
      configs,
      contentId,
      floating,
      floatingOpen,
      hasStatusBar,
      layout.panels,
      minMainWidth,
      pinnedTriggers,
      platform,
      registerPanel,
      setAbsent,
      setFloating,
      shortcuts,
      sidebarGap,
      size,
      updatePanel,
      width,
      windowProp,
    ]
  )

  const [frame, frameMuted] = useCSSVariable([
    "--app-shell-frame",
    "--app-shell-frame-muted",
  ])
  const frameVariables = React.useMemo(
    () =>
      typeof frame === "string" && typeof frameMuted === "string"
        ? { "--sidebar": frame, "--muted-foreground": frameMuted }
        : null,
    [frame, frameMuted]
  )
  const belowTitlebar = React.useMemo(
    () => (titlebar ? { ...insets, top: 0 } : insets),
    [insets, titlebar]
  )

  return (
    <AppShellContext value={contextValue}>
      <AppShellScrollProvider>
        <SidebarFrameContext value={frameVariables}>
          <View
            data-slot="app-shell"
            data-size={size}
            data-titlebar={titlebar ? "true" : undefined}
            className={cn(
              "cn-app-shell relative flex-1 flex-col overflow-hidden",
              className
            )}
            onLayout={(event) => {
              setMeasuredWidth(event.nativeEvent.layout.width)
              onLayout?.(event)
            }}
            {...props}
          >
            <AppShellSkipLink />
            {titlebar}
            <SafeAreaInsetsContext value={belowTitlebar}>
              <SidebarProvider
                defaultOpen={defaultOpen}
                open={open}
                onOpenChange={onOpenChange}
                persist={persist}
                shortcut={shortcut}
                peek={peek}
                width={layout.sidebarWidth ?? sidebarWidthProp}
                widthMobile={widthMobile}
                mobileSidebar={mobileSidebar}
                isMobile={size === "phone"}
                onGapWidthChange={setSidebarGap}
                className="cn-app-shell-body min-h-0 flex-1"
              >
                {children}
                <View
                  pointerEvents="box-none"
                  className="absolute inset-0 z-30"
                >
                  <PortalHost name={`${contentId}:pinned`} />
                </View>
              </SidebarProvider>
            </SafeAreaInsetsContext>
          </View>
        </SidebarFrameContext>
      </AppShellScrollProvider>
    </AppShellContext>
  )
}

function AppShellScrollProvider({ children }: { children: React.ReactNode }) {
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [pageTitle, setPageTitle] = React.useState<React.ReactNode | null>(null)
  const [hasBottomNav, setHasBottomNav] = React.useState(false)
  const [hasFab, setHasFab] = React.useState(false)
  const [phoneHeaderHeight, setPhoneHeaderHeight] = React.useState(0)
  const [bottomNavOverlap, setBottomNavOverlap] = React.useState(0)
  const scrollRoot = React.useRef<React.ComponentRef<typeof ScrollView>>(null)
  const title = React.useRef<{ bottom: number; node: React.ReactNode } | null>(
    null
  )
  const scrollY = React.useRef(0)
  const headerReach = React.useRef(0)
  headerReach.current = phoneHeaderHeight

  const syncTitle = React.useCallback(() => {
    const isAway = isTitleScrolledAway({
      titleBottom: title.current?.bottom ?? null,
      scrollY: scrollY.current + headerReach.current,
    })
    setPageTitle(isAway ? (title.current?.node ?? null) : null)
  }, [])

  const setTitle = React.useCallback(
    (next: { bottom: number; node: React.ReactNode } | null) => {
      title.current = next
      syncTitle()
    },
    [syncTitle]
  )

  const onContentScroll = React.useCallback(
    (y: number) => {
      scrollY.current = y
      setIsScrolled(y > 0)
      syncTitle()
    },
    [syncTitle]
  )

  const value = React.useMemo<AppShellScrollValue>(
    () => ({
      isScrolled,
      scrollRoot,
      onContentScroll,
      pageTitle,
      setTitle,
      hasBottomNav,
      setHasBottomNav,
      hasFab,
      setHasFab,
      phoneHeaderHeight,
      setPhoneHeaderHeight,
      bottomNavOverlap,
      setBottomNavOverlap,
    }),
    [
      bottomNavOverlap,
      hasBottomNav,
      hasFab,
      isScrolled,
      onContentScroll,
      pageTitle,
      phoneHeaderHeight,
      setTitle,
    ]
  )
  return <AppShellScrollContext value={value}>{children}</AppShellScrollContext>
}

/**
 * The first stop for a screen reader: it jumps to the content, past the sidebar's
 * rows. Nothing to see. It can't be fully transparent: iOS skips what has no opacity.
 */
function AppShellSkipLink() {
  const { scrollRoot } = useAppShellScroll()
  return (
    <Pressable
      data-slot="app-shell-skip-link"
      role="link"
      accessibilityLabel="Skip to content"
      className="cn-app-shell-skip-link absolute top-0 left-0"
      onPress={() => {
        const node = findNodeHandle(scrollRoot.current)
        if (node) AccessibilityInfo.setAccessibilityFocus(node)
      }}
    />
  )
}

// MARK: Shortcut hooks

/**
 * Registers a shortcut with the nearest AppShell, for `useShellShortcuts`. Nothing
 * presses it here: React Native has no global key events.
 */
function useShellShortcut(
  shortcut: ShellShortcut & { enabled?: boolean },
  handler: (event: ShortcutEvent) => void
) {
  const shell = React.use(AppShellContext)
  const registry = shell?.shortcuts
  const latestHandler = useLatestCallback(handler)
  const { id, keys, webKeys, label, allowInInputs, enabled = true } = shortcut
  React.useEffect(() => {
    if (!registry || !enabled || keys === null) return
    return registry.register({
      id,
      keys,
      webKeys,
      label,
      allowInInputs,
      handler: latestHandler,
    })
  }, [
    registry,
    id,
    keys,
    webKeys,
    label,
    allowInInputs,
    enabled,
    latestHandler,
  ])
}

/** The label for a shortcut ("⇧⌘T", "Ctrl+Shift+T"). */
function useShortcutLabel(shortcut: Pick<ShellShortcut, "keys" | "webKeys">) {
  const platform = useShortcutPlatform()
  return shortcut.keys
    ? formatShortcut(parseShortcut(shortcut.keys), platform)
    : null
}

/** Every shortcut registered in the shell, for a command palette. */
function useShellShortcuts() {
  const shell = useAppShell()
  const entries = React.useSyncExternalStore(
    shell.shortcuts.subscribe,
    shell.shortcuts.entries,
    shell.shortcuts.entries
  )
  return React.useMemo(
    () =>
      entries.flatMap((entry) => {
        if (!entry.keys || !entry.label) return []
        return [
          {
            id: entry.id ?? entry.label,
            label: entry.label,
            keys: formatShortcut(parseShortcut(entry.keys), shell.platform),
          },
        ]
      }),
    [entries, shell.platform]
  )
}

// MARK: Frame

/** The frame's muted text, for parts that sit on it. */
function FrameScope({ children }: { children: React.ReactNode }) {
  const frame = React.use(SidebarFrameContext)
  if (!frame) return children
  return <ScopedVariables variables={frame}>{children}</ScopedVariables>
}

// MARK: Titlebar

/** A full-width row above everything: pass it as AppShell's `titlebar`. */
function AppShellTitlebar({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View>) {
  const insets = useShellInsets()
  return (
    <FrameScope>
      <View
        data-slot="app-shell-titlebar"
        className={cn("cn-app-shell-titlebar shrink-0", className)}
        style={[{ paddingTop: insets.top }, style]}
        {...props}
      >
        <View className="cn-app-shell-titlebar-row flex-row items-center">
          {renderTextChildren(children)}
        </View>
      </View>
    </FrameScope>
  )
}

// MARK: Main column

function AppShellMain({
  className,
  children,
  ...props
}: React.ComponentProps<typeof SidebarInset>) {
  const shell = useAppShell()
  const insets = useShellInsets()
  const fabHost = useFabHost()
  const { phoneHeaderHeight } = useAppShellScroll()
  const [gutter, statusRow] = useCSSVariable(["--density-6", "--density-36"])
  return (
    <SidebarInset
      data-app-shell-main=""
      isFlushTop={phoneHeaderHeight > 0}
      gutter={parseNumber(gutter, 6)}
      statusBarHeight={getStatusBarHeight({
        hasStatusBar: shell.hasStatusBar && shell.size !== "phone",
        row: parseNumber(statusRow, 36),
        insetBottom: insets.bottom,
      })}
      className={cn("cn-app-shell-main min-h-0 min-w-0", className)}
      {...props}
    >
      {children}
      <View pointerEvents="box-none" className="absolute inset-0 z-20">
        <PortalHost name={fabHost} />
      </View>
    </SidebarInset>
  )
}

const headerFadeVariants = cva("cn-app-shell-header-fade")

function AppShellHeader({
  trigger = "auto",
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & {
  /**
   * The sidebar toggle at the start. `auto` shows it only while the sidebar
   * is collapsed or on phones, where the sidebar can't show its own.
   */
  trigger?: "auto" | "always" | "never"
}) {
  const { state, isMobile } = useSidebar()
  const { size } = useAppShell()
  const { isScrolled, setPhoneHeaderHeight } = useAppShellScroll()
  const insets = useShellInsets()
  const isPhone = size === "phone"
  const row = parseNumber(useCSSVariable("--density-48"), 48)
  const { color } = useResolveClassNames(headerFadeVariants())
  const reach = isPhone ? insets.top + row : 0
  React.useLayoutEffect(() => {
    setPhoneHeaderHeight(reach)
    return () => setPhoneHeaderHeight(0)
  }, [reach, setPhoneHeaderHeight])
  return (
    <View
      data-slot="app-shell-header"
      // On a phone the page dissolves under the header, so there's no hairline.
      data-scrolled={!isPhone && isScrolled}
      data-phone={isPhone}
      className={cn(
        "cn-app-shell-header shrink-0 flex-row items-center",
        className
      )}
      style={[
        isPhone ? { height: reach, paddingTop: insets.top } : undefined,
        style,
      ]}
      {...props}
    >
      {isPhone && typeof color === "string" ? (
        <HeaderFade color={color} insetTop={insets.top} rowHeight={row} />
      ) : null}
      {shouldShowHeaderTrigger({ trigger, isMobile, state }) && (
        <SidebarTrigger className="cn-app-shell-header-trigger" />
      )}
      {renderTextChildren(children)}
    </View>
  )
}

type AppShellBreadcrumbItem = {
  label: React.ReactNode
  href?: string
  onSelect?: () => void
}

type RenderLink = (item: { href?: string }) => React.ReactElement<{
  children?: React.ReactNode
}>

function BreadcrumbCrumb({
  item,
  renderLink,
}: {
  item: AppShellBreadcrumbItem
  renderLink?: RenderLink
}) {
  if (item.onSelect) {
    return <BreadcrumbLink onPress={item.onSelect}>{item.label}</BreadcrumbLink>
  }
  if (item.href && renderLink) {
    return (
      <BreadcrumbLink render={renderLink(item)}>{item.label}</BreadcrumbLink>
    )
  }
  return <Text className="cn-app-shell-breadcrumb-text">{item.label}</Text>
}

function BreadcrumbMenuItems({
  items,
  renderLink,
}: {
  items: AppShellBreadcrumbItem[]
  renderLink?: RenderLink
}) {
  return (
    <DropdownMenuGroup>
      {items.map((item, index) => (
        <DropdownMenuItem
          key={index}
          render={item.href && renderLink ? renderLink(item) : undefined}
          onPress={item.onSelect}
        >
          {item.label}
        </DropdownMenuItem>
      ))}
    </DropdownMenuGroup>
  )
}

function AppShellBreadcrumb({
  items,
  maxItems = 4,
  renderLink,
  className,
  ...props
}: React.ComponentProps<typeof View> & {
  /** Root first; the last item is the current page. */
  items: AppShellBreadcrumbItem[]
  /** More items than this fold the middle ones into a menu. Default 4. */
  maxItems?: number
  /** Returns the link element for an item, without children (a router Link). */
  renderLink?: RenderLink
}) {
  const { pageTitle } = useAppShellScroll()
  const { size } = useAppShell()
  const motion = useMotion("move")
  const iconSize = parseNumber(useCSSVariable("--density-icon-14"), 14)
  const current = items.at(-1)
  const parents = items.slice(0, -1)
  const { leading, folded, trailing } = foldBreadcrumbs(parents, maxItems - 1)
  const showsTitle = pageTitle !== null
  const isReduced = motion.isReduced

  // Once the page's own title scrolls away, it takes the trail's place, with a
  // short rise. Reduced motion keeps the fade.
  const progress = useSharedValue(showsTitle ? 1 : 0)
  React.useEffect(() => {
    progress.value = withTiming(showsTitle ? 1 : 0, {
      duration: showsTitle ? motion.enterMs : motion.exitMs,
      easing: motion.moveEasing,
    })
  }, [motion, progress, showsTitle])
  const trailStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value,
    transform: [{ translateY: isReduced ? 0 : -4 * progress.value }],
  }))
  const titleStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: isReduced ? 0 : 4 * (1 - progress.value) }],
  }))

  return (
    <View
      data-slot="app-shell-breadcrumb"
      data-title={showsTitle}
      className={cn(
        "cn-app-shell-breadcrumb relative flex-1 justify-center",
        className
      )}
      {...props}
    >
      <Animated.View
        className="cn-app-shell-breadcrumb-trail"
        pointerEvents={showsTitle ? "none" : "auto"}
        accessibilityElementsHidden={showsTitle}
        importantForAccessibility={showsTitle ? "no-hide-descendants" : "auto"}
        style={trailStyle}
      >
        <Breadcrumb>
          {size === "phone" ? (
            // Phones: only the current page; it opens a menu of its parents.
            <BreadcrumbList className="cn-app-shell-breadcrumb-list">
              {current && (
                <BreadcrumbItem className="min-w-0">
                  {parents.length > 0 ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger className="cn-app-shell-breadcrumb-current flex-row items-center">
                        <BreadcrumbPage numberOfLines={1}>
                          {current.label}
                        </BreadcrumbPage>
                        <IconProvider size={iconSize}>
                          <ChevronDownIcon />
                        </IconProvider>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <BreadcrumbMenuItems
                          items={[...parents].reverse()}
                          renderLink={renderLink}
                        />
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <BreadcrumbPage numberOfLines={1}>
                      {current.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          ) : (
            // Tablets and up: the trail, with the middle folded.
            <BreadcrumbList className="cn-app-shell-breadcrumb-list">
              {[...leading, ...(folded.length ? [null] : []), ...trailing].map(
                (item, index) => (
                  <React.Fragment key={index}>
                    <BreadcrumbItem>
                      {item ? (
                        <BreadcrumbCrumb item={item} renderLink={renderLink} />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            className="cn-app-shell-breadcrumb-fold items-center"
                            accessibilityLabel="Show more"
                          >
                            <BreadcrumbEllipsis />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <BreadcrumbMenuItems
                              items={folded}
                              renderLink={renderLink}
                            />
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                  </React.Fragment>
                )
              )}
              {current && (
                <BreadcrumbItem className="min-w-0">
                  <BreadcrumbPage numberOfLines={1}>
                    {current.label}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              )}
            </BreadcrumbList>
          )}
        </Breadcrumb>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden={!showsTitle}
        importantForAccessibility={showsTitle ? "auto" : "no-hide-descendants"}
        className="absolute inset-x-0"
        style={titleStyle}
      >
        <Text
          data-slot="app-shell-breadcrumb-title"
          numberOfLines={1}
          className="cn-app-shell-breadcrumb-title"
        >
          {pageTitle}
        </Text>
      </Animated.View>
    </View>
  )
}

/**
 * The page's heading. When it scrolls out of view, the header's breadcrumb shows it
 * instead.
 */
function AppShellPageTitle({
  className,
  children,
  onLayout,
  ...props
}: React.ComponentProps<typeof Text>) {
  const { scrollRoot, setTitle } = useAppShellScroll()
  const ref = React.useRef<React.ComponentRef<typeof Text>>(null)
  const text = getTextContent(children)
  const report = useLatestCallback(() => {
    const scroller = scrollRoot.current?.getInnerViewRef()
    if (!scroller) return
    ref.current?.measureLayout(scroller, (_x, y, _width, height) => {
      setTitle({ bottom: y + height, node: children })
    })
  })
  React.useEffect(() => {
    report()
    return () => setTitle(null)
  }, [report, setTitle, text])
  return (
    <Text
      ref={ref}
      data-slot="app-shell-page-title"
      role="heading"
      className={cn("cn-app-shell-page-title", className)}
      onLayout={(event) => {
        report()
        onLayout?.(event)
      }}
      {...props}
    >
      {children}
    </Text>
  )
}

type AppShellAction = {
  id: string
  label: string
  icon?: IconLike
  onSelect: () => void
  /** Kept so shared code compiles: no global key events. */
  shortcut?: string
  disabled?: boolean
}

function ActionShortcut({ action }: { action: AppShellAction }) {
  useShellShortcut(
    {
      id: `action.${action.id}`,
      keys: action.shortcut ?? null,
      label: action.label,
      enabled: !action.disabled,
    },
    action.onSelect
  )
  return null
}

/** The phone's primary action, floating over the page above the tab bar. */
function AppShellFab({ action }: { action: AppShellAction }) {
  const fabHost = useFabHost()
  const { bottomNavOverlap, hasBottomNav, setHasFab } = useAppShellScroll()
  const insets = useShellInsets()
  const name = React.useId()
  const [row, gap] = useCSSVariable(["--density-48", "--density-16"])
  React.useLayoutEffect(() => {
    setHasFab(true)
    return () => setHasFab(false)
  }, [setHasFab])
  return (
    <Portal name={name} hostName={fabHost}>
      <Button
        data-slot="app-shell-fab"
        size="icon-lg"
        accessibilityLabel={action.label}
        disabled={action.disabled}
        onPress={action.onSelect}
        className="cn-app-shell-fab absolute"
        style={{
          bottom: getFabBottom({
            hasBottomNav,
            rowHeight: parseNumber(row, 48),
            gap: parseNumber(gap, 16),
            insetBottom: insets.bottom,
            overlap: bottomNavOverlap,
          }),
        }}
      >
        {action.icon ? <IconSlot icon={action.icon} /> : <PlusIcon />}
      </Button>
    </Portal>
  )
}

/**
 * Header actions, described once. Tablets and up get buttons; phones get one menu,
 * and the primary action becomes a floating button.
 */
function AppShellHeaderActions({
  actions = [],
  primaryAction,
  className,
  ...props
}: React.ComponentProps<typeof View> & {
  actions?: AppShellAction[]
  primaryAction?: AppShellAction
}) {
  const { size } = useAppShell()
  const isPhone = size === "phone"
  return (
    <View
      data-slot="app-shell-header-actions"
      className={cn(
        "cn-app-shell-header-actions shrink-0 flex-row items-center",
        className
      )}
      {...props}
    >
      {[...actions, ...(primaryAction ? [primaryAction] : [])].map((action) => (
        <ActionShortcut key={action.id} action={action} />
      ))}
      {!isPhone &&
        actions.map((action) =>
          action.icon ? (
            <Tooltip key={action.id}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    accessibilityLabel={action.label}
                    disabled={action.disabled}
                    onPress={action.onSelect}
                  />
                }
              >
                <IconSlot icon={action.icon} />
              </TooltipTrigger>
              <TooltipContent>{action.label}</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              key={action.id}
              variant="ghost"
              size="sm"
              disabled={action.disabled}
              onPress={action.onSelect}
            >
              {action.label}
            </Button>
          )
        )}
      {!isPhone && primaryAction && (
        <Button
          size="sm"
          disabled={primaryAction.disabled}
          onPress={primaryAction.onSelect}
        >
          <IconSlot icon={primaryAction.icon} />
          {primaryAction.label}
        </Button>
      )}
      {isPhone && actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                accessibilityLabel="More actions"
              />
            }
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  onPress={action.onSelect}
                >
                  <IconSlot icon={action.icon} />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {isPhone && primaryAction && <AppShellFab action={primaryAction} />}
    </View>
  )
}

/** The page's scroller: the only one in the main column. */
function AppShellContent({
  id,
  size,
  className,
  onScroll,
  style,
  contentContainerStyle,
  children,
  ref,
  ...props
}: React.ComponentProps<typeof ScrollView> & {
  /**
   * Centres the page in a column of this width, with the page's padding. Left
   * out, the page has the column's full width, for tables, boards and editors.
   */
  size?: AppShellContentSize
}) {
  const shell = useAppShell()
  const scroll = useAppShellScroll()
  const insets = useShellInsets()
  const { variant } = useSidebarLayout()
  const composedRef = useComposedRefs(scroll.scrollRoot, ref)
  const [phoneGutter, gutter] = useCSSVariable(["--density-16", "--density-24"])
  const isPhone = shell.size === "phone"
  const column = getContentColumn({
    size,
    isPhone,
    phoneGutter: parseNumber(phoneGutter, 16),
    gutter: parseNumber(gutter, 24),
    bottomInset:
      scroll.bottomNavOverlap +
      getContentBottomInset({
        hasBottomNav: isPhone && scroll.hasBottomNav,
        hasStatusBar: !isPhone && shell.hasStatusBar,
        isCard: !isPhone && variant === "inset",
        insetBottom: insets.bottom,
      }),
    fabClearance: getFabClearance({
      hasFab: isPhone && scroll.hasFab,
      buttonSize: ICON_LG,
      gap: parseNumber(phoneGutter, 16),
    }),
    topInset: scroll.phoneHeaderHeight,
  })
  return (
    <ScrollView
      ref={composedRef}
      nativeID={id ?? shell.contentId}
      data-slot="app-shell-content"
      data-content-size={size}
      scrollEventThrottle={16}
      className={cn("cn-app-shell-content flex-1", className)}
      style={[{ marginTop: -scroll.phoneHeaderHeight }, style]}
      scrollIndicatorInsets={{
        top: scroll.phoneHeaderHeight,
        bottom: scroll.bottomNavOverlap,
      }}
      contentContainerStyle={[column, contentContainerStyle]}
      onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
        onScroll?.(event)
        scroll.onContentScroll(event.nativeEvent.contentOffset.y)
      }}
      {...props}
    >
      {renderTextChildren(children)}
    </ScrollView>
  )
}

/**
 * The status bar: a row on the frame under the main column and the panels. Place it
 * in AppShell, after them. Fill it with ghost `size="sm"` buttons and text; phones
 * hide it.
 */
function AppShellStatusBar({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View>) {
  const { size, setHasStatusBar, sidebarWidth } = useAppShell()
  const insets = useShellInsets()
  const isPhone = size === "phone"
  React.useLayoutEffect(() => {
    setHasStatusBar(true)
    return () => setHasStatusBar(false)
  }, [setHasStatusBar])
  if (isPhone) return null
  return (
    <FrameScope>
      <TextStyle className="cn-app-shell-status-bar-text">
        <View
          data-slot="app-shell-status-bar"
          role="summary"
          className={cn("cn-app-shell-status-bar absolute bottom-0", className)}
          style={[
            {
              left: insets.left + sidebarWidth,
              right: insets.right,
              paddingBottom: insets.bottom,
            },
            style,
          ]}
          {...props}
        >
          <View className="cn-app-shell-status-bar-row flex-row items-center">
            {renderTextChildren(children)}
          </View>
        </View>
      </TextStyle>
    </FrameScope>
  )
}

// MARK: Bottom nav

const BottomNavContext = React.createContext<{
  setSelected: (key: string) => void
} | null>(null)

const BottomNavIndexContext = React.createContext(0)

// A lit tab turns foreground too; only the current one turns semibold.
const bottomNavTextVariants = cva("cn-app-shell-bottom-nav-text")
const bottomNavLitTextVariants = cva("cn-app-shell-bottom-nav-text-lit")
const bottomNavActiveTextVariants = cva("cn-app-shell-bottom-nav-text-active")

/**
 * A phone tab bar. It hides itself from tablets up. `flat` is a row under the page.
 * `floating` is a capsule over it, so the page scrolls behind: `capsule` gives it
 * another surface, such as a glass view. A finger slides along the tabs, and
 * letting go opens the lit one.
 */
function AppShellBottomNav({
  variant = "flat",
  capsule,
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View> & {
  variant?: "flat" | "floating"
  /** The capsule's surface: an element to put the tabs in. */
  capsule?: React.ReactElement<{
    style?: React.ComponentProps<typeof View>["style"]
    children?: React.ReactNode
  }>
}) {
  const shell = React.use(AppShellContext)
  const scroll = React.use(AppShellScrollContext)
  const insets = useShellInsets()
  const { width } = useWindowDimensions()
  const isPhone = (shell?.size ?? getShellSize(width)) === "phone"
  const isFloating = variant === "floating"
  const [selected, setSelected] = React.useState<string>()
  const fluid = useFluidHover({
    selected: isFloating ? selected : undefined,
    axis: "x",
    track: "drag",
    previewsSelection: isFloating,
  })
  const [row, padding, gap] = useCSSVariable([
    "--density-48",
    "--density-6",
    "--density-12",
  ])
  const metrics = getFloatingNavMetrics({
    row: parseNumber(row, 48),
    padding: parseNumber(padding, 6),
    gap: parseNumber(gap, 12),
    insetBottom: insets.bottom,
  })
  const setHasBottomNav = scroll?.setHasBottomNav
  const setBottomNavOverlap = scroll?.setBottomNavOverlap
  const overlap = isPhone && isFloating ? metrics.clearance : 0
  React.useLayoutEffect(() => {
    if (!isPhone || !setHasBottomNav) return
    setHasBottomNav(true)
    return () => setHasBottomNav(false)
  }, [isPhone, setHasBottomNav])
  React.useLayoutEffect(() => {
    if (!setBottomNavOverlap) return
    setBottomNavOverlap(overlap)
    return () => setBottomNavOverlap(0)
  }, [overlap, setBottomNavOverlap])
  const context = React.useMemo(() => ({ setSelected }), [])
  if (!isPhone) return null
  const track = (
    <FluidHoverProvider fluid={fluid}>
      <FluidHoverArea fluid={fluid}>
        <View
          ref={fluid.attach}
          data-slot="app-shell-bottom-nav-track"
          data-variant={variant}
          className="cn-app-shell-bottom-nav-track relative flex-row"
        >
          {isFloating ? (
            <FluidHoverSelection
              selection={fluid.selection}
              className="cn-app-shell-bottom-nav-selection"
            />
          ) : null}
          <FluidHoverHighlight
            hover={fluid.hover}
            data-variant={variant}
            className="cn-app-shell-bottom-nav-highlight"
          />
          <BottomNavContext value={context}>
            {React.Children.toArray(children).map((child, index) => (
              <BottomNavIndexContext key={index} value={index}>
                {child}
              </BottomNavIndexContext>
            ))}
          </BottomNavContext>
        </View>
      </FluidHoverArea>
    </FluidHoverProvider>
  )
  if (isFloating) {
    const surface = {
      height: metrics.height,
      padding: parseNumber(padding, 6),
      borderRadius: metrics.radius,
    }
    return (
      <View
        data-slot="app-shell-bottom-nav"
        data-variant={variant}
        accessibilityRole="tabbar"
        aria-label="Main"
        className={cn("cn-app-shell-bottom-nav-floating absolute", className)}
        style={[{ bottom: metrics.bottom }, style]}
        {...props}
      >
        {capsule ? (
          React.cloneElement(capsule, {
            style: [surface, capsule.props.style],
            children: track,
          })
        ) : (
          <View
            data-slot="app-shell-bottom-nav-capsule"
            className="cn-app-shell-bottom-nav-capsule"
            style={surface}
          >
            {track}
          </View>
        )}
      </View>
    )
  }
  return (
    <View
      data-slot="app-shell-bottom-nav"
      data-variant={variant}
      accessibilityRole="tabbar"
      aria-label="Main"
      className={cn("cn-app-shell-bottom-nav shrink-0", className)}
      style={[{ paddingBottom: insets.bottom }, style]}
      {...props}
    >
      {track}
    </View>
  )
}

function AppShellBottomNavItem({
  icon,
  label,
  isActive = false,
  render,
  asChild,
  className,
  onPress,
  onPressIn,
  onPressOut,
  onLayout,
  ...props
}: Omit<React.ComponentProps<typeof Pressable>, "children" | "onPress"> &
  RenderProps & {
    icon?: IconLike
    label: string
    isActive?: boolean
    /** Letting go after a slide along the tabs has no press event to pass on. */
    onPress?: (event?: GestureResponderEvent) => void
  }) {
  const feedback = useFeedback()
  const nav = React.use(BottomNavContext)
  const index = React.use(BottomNavIndexContext)
  const setSelected = nav?.setSelected
  const iconSize = parseNumber(useCSSVariable("--density-20"), 20)
  const { isLit, rowProps } = useFluidRow<
    LayoutChangeEvent,
    GestureResponderEvent
  >({
    itemKey: label,
    disabled: props.disabled,
    onActivate: () => {
      feedback("note", { pitch: noteStep(index) })
      onPress?.()
    },
    onLayout,
    onPressIn,
    onPressOut,
  })
  React.useLayoutEffect(() => {
    if (isActive) setSelected?.(label)
  }, [isActive, label, setSelected])
  const content = (
    <>
      <IconProvider size={iconSize} strokeWidth={isActive || isLit ? 2 : 1.5}>
        <IconSlot icon={icon} />
      </IconProvider>
      <Text
        numberOfLines={1}
        // A long label in a narrow tab shrinks a little instead of truncating.
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        className="cn-app-shell-bottom-nav-label"
      >
        {label}
      </Text>
    </>
  )
  const shared = {
    "data-slot": "app-shell-bottom-nav-item",
    role: "button" as const,
    "aria-selected": isActive,
    accessibilityState: { selected: isActive },
    className: cn(
      "cn-app-shell-bottom-nav-item flex-1 flex-col items-center justify-center",
      className
    ),
    onPress: (event: GestureResponderEvent) => {
      feedback("note", { pitch: noteStep(index) })
      onPress?.(event)
    },
    ...props,
    ...rowProps,
  }
  return (
    <TextStyle
      eases
      className={cn(
        bottomNavTextVariants(),
        isActive
          ? bottomNavActiveTextVariants()
          : isLit
            ? bottomNavLitTextVariants()
            : undefined
      )}
    >
      {renderSlot({ render, asChild }, shared, content) ?? (
        <Pressable {...shared}>{content}</Pressable>
      )}
    </TextStyle>
  )
}

// MARK: Panels

type AppShellPanelView = {
  value: string
  label: string
  icon?: IconLike
  /** Kept so shared code compiles: no global key events. */
  shortcut?: string
}

type PanelContextValue = {
  id: string
  label: string
  side: "left" | "right"
  views: AppShellPanelView[]
  placement: PanelPlacement
  panel: PanelState
  setOpen: (open: boolean) => void
  reveal: (view: string) => void
}

const PanelContext = React.createContext<PanelContextValue | null>(null)

function usePanel() {
  const context = React.use(PanelContext)
  if (!context) {
    throw new Error("Panel parts must be used within an AppShellPanel.")
  }
  return context
}

function getPanelDomId(id: string) {
  return `app-shell-panel-${id}`
}

/** A panel's state and controls, from anywhere inside the shell. */
function useShellPanel(id: string) {
  const shell = useAppShell()
  const config = shell.configs[id]
  const saved = shell.panels[id] ?? config?.defaults ?? FALLBACK_PANEL
  const isFloating = shell.floating[id] ?? false
  const open = isFloating ? (shell.floatingOpen[id] ?? false) : saved.open
  const width = config
    ? Math.max(config.minWidth, Math.min(config.maxWidth, saved.width))
    : saved.width
  const { updatePanel } = shell
  return React.useMemo(
    () => ({
      open,
      view: saved.view,
      width,
      label: config?.label ?? id,
      shortcut: config?.shortcut ?? null,
      side: config?.side ?? null,
      isFloating,
      domId: getPanelDomId(id),
      setOpen: (next: boolean) =>
        updatePanel(id, (panel) => ({ ...panel, open: next })),
      toggle: () =>
        updatePanel(id, (panel) => ({ ...panel, open: !panel.open })),
      /** Shows a view; selecting the view already showing closes the panel. */
      select: (view: string) =>
        updatePanel(id, (panel) => selectPanelView(panel, view)),
      /** Shows a view, opening the panel. Never closes it. */
      reveal: (view: string) =>
        updatePanel(id, (panel) => revealPanelView(panel, view)),
    }),
    [
      id,
      open,
      saved.view,
      width,
      config?.label,
      config?.shortcut,
      config?.side,
      isFloating,
      updatePanel,
    ]
  )
}

function PanelViewShortcut({
  panelId,
  view,
}: {
  panelId: string
  view: AppShellPanelView
}) {
  const { select } = useShellPanel(panelId)
  useShellShortcut(
    {
      id: `panel.${panelId}.${view.value}`,
      keys: view.shortcut ?? null,
      label: `Show ${view.label}`,
    },
    () => select(view.value)
  )
  return null
}

function AppShellPanel({
  id,
  label,
  side = "right",
  views = [],
  defaultOpen = false,
  defaultView,
  defaultWidth = 320,
  minWidth = 240,
  maxWidth = 640,
  mobile = "drawer",
  shortcut: shortcutProp,
  className,
  style,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "id"> & {
  id: string
  /** Names the panel for assistive tech, tooltips and its sheet. */
  label: string
  side?: "left" | "right"
  /** Views the header's AppShellPanelTabs switches between. */
  views?: AppShellPanelView[]
  defaultOpen?: boolean
  defaultView?: string
  defaultWidth?: number
  /** Clamps the width. Nothing drags it here. */
  minWidth?: number
  /** Clamps the width. Nothing drags it here. */
  maxWidth?: number
  /** On phones: a bottom drawer, the whole screen, or not shown. */
  mobile?: PanelMobile
  /** Kept so shared code compiles: no global key events. */
  shortcut?: string | null
}) {
  const shell = useAppShell()
  const scroll = useAppShellScroll()
  const sidebarPortal = useSidebarPortal()
  const { variant } = useSidebarLayout()
  const insets = useShellInsets()
  const motion = useMotion("move")
  const { width: windowWidth } = useWindowDimensions()
  const [gutterToken, statusRow, sheetMargin] = useCSSVariable([
    "--density-6",
    "--density-36",
    "--density-48",
  ])
  const gutter = parseNumber(gutterToken, 6)
  const shortcut =
    shortcutProp === undefined ? getDefaultPanelShortcut(side) : shortcutProp
  // Primitive dependencies only: `views` is usually an inline array.
  const initialView = defaultView ?? views[0]?.value ?? null
  const defaults = React.useMemo<PanelState>(
    () => ({ open: defaultOpen, view: initialView, width: defaultWidth }),
    [defaultOpen, initialView, defaultWidth]
  )
  const { registerPanel } = shell
  React.useEffect(
    () =>
      registerPanel(id, {
        label,
        defaults,
        shortcut,
        side,
        minWidth,
        maxWidth,
      }),
    [registerPanel, id, label, defaults, shortcut, side, minWidth, maxWidth]
  )

  const control = useShellPanel(id)
  const panelWidth = Math.max(minWidth, Math.min(maxWidth, control.width))

  useShellShortcut(
    { id: `panel.${id}.toggle`, keys: shortcut, label: `Toggle ${label}` },
    control.toggle
  )

  const placement = getPanelPlacement({
    shellWidth: shell.width - insets.left - insets.right,
    occupiedWidth: shell.sidebarWidth + getOtherPanelsWidth(shell.panels, id),
    panelWidth,
    minMainWidth: shell.minMainWidth,
    mobile,
    breakpoints: shell.breakpoints,
  })
  // A panel that floats starts closed, from its first render: a sheet never opens
  // by itself, whatever the docked preference is.
  const panel: PanelState = {
    open:
      placement === "inline" ? control.open : (shell.floatingOpen[id] ?? false),
    view: control.view ?? defaults.view,
    width: panelWidth,
  }

  const { setFloating, setAbsent } = shell
  const isFloating = placement !== "inline"
  React.useLayoutEffect(() => {
    setFloating(id, isFloating)
  }, [setFloating, id, isFloating])
  const isAbsent = placement === null
  React.useLayoutEffect(() => {
    setAbsent(id, isAbsent)
    return () => setAbsent(id, false)
  }, [setAbsent, id, isAbsent])

  // A docked panel opens and closes its width on the move timing.
  const isCard = variant === "inset"
  const openWidth = panel.open ? panel.width : 0
  const animatedWidth = useSharedValue(openWidth)
  const fullWidth = panel.width
  React.useEffect(() => {
    animatedWidth.value = withTiming(openWidth, {
      duration: motion.isReduced
        ? 0
        : panel.open
          ? motion.enterMs
          : motion.exitMs,
      easing: panel.open ? motion.moveEasing : motion.exitEasing,
    })
  }, [animatedWidth, motion, openWidth, panel.open])
  const dockedStyle = useAnimatedStyle(() => ({
    width: animatedWidth.value,
    marginRight: isCard ? gutter * (animatedWidth.value / fullWidth) : 0,
  }))

  if (placement === null) return null

  const contextValue: PanelContextValue = {
    id,
    label,
    side,
    views,
    placement,
    panel,
    setOpen: control.setOpen,
    reveal: control.reveal,
  }

  const content = (
    <TextStyle className="cn-app-shell-panel-text">
      {views.length > 0 ? (
        <Tabs
          value={panel.view ?? undefined}
          onValueChange={control.reveal}
          className="cn-app-shell-panel-tabs-root min-h-0 flex-1 flex-col"
        >
          {renderTextChildren(children)}
        </Tabs>
      ) : (
        renderTextChildren(children)
      )}
    </TextStyle>
  )

  // Sheets and drawers leave the React tree, so parts inside read these again.
  const portalled = sidebarPortal(
    <AppShellContext value={shell}>
      <AppShellScrollContext value={scroll}>
        <PanelContext value={contextValue}>{content}</PanelContext>
      </AppShellScrollContext>
    </AppShellContext>
  )

  const viewShortcuts = views.map((view) => (
    <PanelViewShortcut key={view.value} panelId={id} view={view} />
  ))

  if (placement === "overlay") {
    return (
      <>
        {viewShortcuts}
        <Sheet open={panel.open} onOpenChange={control.setOpen}>
          <SheetContent
            nativeID={control.domId}
            side={side}
            showCloseButton={false}
            accessibilityLabel={label}
            data-app-shell-panel=""
            data-placement="overlay"
            className={cn("cn-app-shell-panel-sheet flex-col", className)}
            style={[
              {
                width: panel.width,
                maxWidth: windowWidth - parseNumber(sheetMargin, 48),
              },
              style,
            ]}
          >
            {portalled}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  if (placement === "drawer") {
    return (
      <>
        {viewShortcuts}
        <Drawer
          open={panel.open}
          onOpenChange={control.setOpen}
          showSwipeHandle
        >
          <DrawerContent
            nativeID={control.domId}
            accessibilityLabel={label}
            data-app-shell-panel=""
            data-placement="drawer"
            className={cn("cn-app-shell-panel-drawer flex-col", className)}
            style={style}
          >
            {portalled}
          </DrawerContent>
        </Drawer>
      </>
    )
  }

  if (placement === "swap") {
    return (
      <>
        {viewShortcuts}
        <SheetSurface
          nativeID={control.domId}
          accessibilityLabel={label}
          data-slot="app-shell-panel"
          data-placement="swap"
          data-state={panel.open ? "open" : "closed"}
          open={panel.open}
          onOpenChange={control.setOpen}
          side="bottom"
          className={cn("cn-app-shell-panel flex-col", className)}
          style={style}
        >
          <View
            data-slot="app-shell-panel-inner"
            className="cn-app-shell-panel-inner flex-col"
          >
            {portalled}
          </View>
        </SheetSurface>
      </>
    )
  }

  return (
    <PanelContext value={contextValue}>
      {viewShortcuts}
      <Animated.View
        nativeID={control.domId}
        aria-label={label}
        data-slot="app-shell-panel"
        data-side={side}
        data-placement={placement}
        data-state={panel.open ? "open" : "closed"}
        data-layout={isCard ? (panel.open ? "card" : "closed") : "flat"}
        data-edge={
          !isCard && panel.open ? (side === "right" ? "left" : "right") : "none"
        }
        accessibilityElementsHidden={!panel.open}
        importantForAccessibility={panel.open ? "auto" : "no-hide-descendants"}
        pointerEvents={panel.open ? "auto" : "none"}
        className={cn(
          "cn-app-shell-panel shrink-0 flex-col overflow-hidden",
          className
        )}
        style={[
          dockedStyle,
          getPanelFrame({
            isCard,
            statusBarHeight: getStatusBarHeight({
              hasStatusBar: shell.hasStatusBar,
              row: parseNumber(statusRow, 36),
              insetBottom: insets.bottom,
            }),
            insetTop: insets.top,
            insetBottom: insets.bottom,
            gutter,
          }),
          style,
        ]}
        {...props}
      >
        <View
          data-slot="app-shell-panel-inner"
          className="cn-app-shell-panel-inner flex-col"
          style={{ width: panel.width }}
        >
          {content}
        </View>
      </Animated.View>
    </PanelContext>
  )
}

function AppShellPanelHeader({
  className,
  children,
  style,
  ...props
}: React.ComponentProps<typeof View>) {
  const { placement } = usePanel()
  const { pinnedTriggers } = useAppShell()
  const [padding, gap] = useCSSVariable(["--density-12", "--density-6"])
  const isUnderToggle = placement === "inline" && pinnedTriggers > 0
  return (
    <View
      data-slot="app-shell-panel-header"
      data-floating={placement !== "inline"}
      className={cn(
        "cn-app-shell-panel-header shrink-0 flex-row items-center",
        className
      )}
      style={[
        isUnderToggle
          ? {
              paddingRight: getPanelHeaderEnd({
                rowPadding: parseNumber(padding, 12),
                buttonSize: ICON_SM,
                gap: parseNumber(gap, 6),
              }),
            }
          : undefined,
        style,
      ]}
      {...props}
    >
      {renderTextChildren(children)}
    </View>
  )
}

function AppShellPanelTitle({
  className,
  ...props
}: React.ComponentProps<typeof Text>) {
  return (
    <Text
      data-slot="app-shell-panel-title"
      role="heading"
      numberOfLines={1}
      className={cn("cn-app-shell-panel-title min-w-0 flex-1", className)}
      {...props}
    />
  )
}

/** The panel's views as tabs. Below 360pt they show icons only. */
function AppShellPanelTabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  const { views, panel, placement } = usePanel()
  const isFloating = placement !== "inline"
  const isCompact = !isFloating && panel.width < PANEL_TABS_LABEL_WIDTH
  return (
    <TabsList
      data-slot="app-shell-panel-tabs"
      data-floating={isFloating}
      className={cn("cn-app-shell-panel-tabs", className)}
      {...props}
    >
      {views.map((view) => (
        <TabsTrigger
          key={view.value}
          value={view.value}
          accessibilityLabel={view.label}
          data-compact={isCompact && view.icon !== undefined}
          data-floating={isFloating}
          className="cn-app-shell-panel-tab"
        >
          {/* A phone's stretched track has room for the names, not both. */}
          {isFloating ? null : <IconSlot icon={view.icon} />}
          <Text
            data-compact={isCompact && view.icon !== undefined}
            numberOfLines={1}
            className="cn-app-shell-panel-tab-label"
          >
            {view.label}
          </Text>
        </TabsTrigger>
      ))}
    </TabsList>
  )
}

function AppShellPanelClose({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { label, placement, side, setOpen } = usePanel()
  const { pinnedTriggers } = useAppShell()
  // Beside a pinned toggle, which closes the panel from the same spot, it steps aside.
  if (placement === "inline" && pinnedTriggers > 0) return null
  const isFloating = placement !== "inline"
  return (
    <Button
      variant="ghost"
      size={isFloating ? "icon" : "icon-sm"}
      accessibilityLabel={`Close ${label}`}
      data-slot="app-shell-panel-close"
      data-floating={isFloating}
      onPress={() => setOpen(false)}
      className={cn("cn-app-shell-panel-close", className)}
      {...props}
    >
      {children ??
        (isFloating ? <XIcon /> : <SidebarToggleIcon open side={side} />)}
    </Button>
  )
}

/** The scrolling body of a panel without views. */
function AppShellPanelContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  return (
    <SheetSurfaceScrollView
      data-slot="app-shell-panel-content"
      className={cn("cn-app-shell-panel-content flex-1", className)}
      {...props}
    >
      {renderTextChildren(children)}
    </SheetSurfaceScrollView>
  )
}

/** One of the panel's views; shown while its tab is selected. */
function AppShellPanelView({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsContent>) {
  return (
    <TabsContent
      data-slot="app-shell-panel-view"
      className={cn("cn-app-shell-panel-view flex-1", className)}
      {...props}
    >
      <SheetSurfaceScrollView>
        {renderTextChildren(children)}
      </SheetSurfaceScrollView>
    </TabsContent>
  )
}

/** Toggles a panel, or selects one of its views (VS Code's activity bar). */
function AppShellPanelTrigger({
  panel: panelId,
  view,
  className,
  children,
  onPress,
  ...props
}: React.ComponentProps<typeof Button> & {
  panel: string
  view?: string
}) {
  const shell = useAppShell()
  const panel = useShellPanel(panelId)
  const pinnedHost = usePinnedHost()
  const insets = useShellInsets()
  const { variant } = useSidebarLayout()
  const name = React.useId()
  const [row, padding, gutter] = useCSSVariable([
    "--density-48",
    "--density-12",
    "--density-6",
  ])
  const isPressed = view ? panel.open && panel.view === view : panel.open
  const anchor = getPanelTriggerAnchor({
    hasView: view !== undefined,
    side: panel.side,
    isFloating: panel.isFloating,
    open: panel.open,
    width: panel.width,
  })
  const isAbsent = shell.absent[panelId] ?? false
  const isPinned = anchor.isPinned && !isAbsent

  const { setPinnedTriggers } = shell
  React.useLayoutEffect(() => {
    if (!isPinned) return
    setPinnedTriggers((count) => count + 1)
    return () => setPinnedTriggers((count) => count - 1)
  }, [isPinned, setPinnedTriggers])

  if (isAbsent) return null

  const hint = `${panel.open ? "Hide" : "Show"} ${panel.label.toLowerCase()}`
  const button = (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            accessibilityLabel={hint}
            aria-expanded={isPressed}
            data-slot="app-shell-panel-trigger"
            data-state={isPressed ? "open" : "closed"}
            data-view={view}
            data-selected={view !== undefined && isPressed}
            onPress={(event) => {
              onPress?.(event)
              if (view) panel.select(view)
              else panel.toggle()
            }}
            className={cn("cn-app-shell-panel-trigger", className)}
            {...props}
          />
        }
      >
        {children ??
          // A phone's panel comes up from the bottom, so its toggle says that.
          (shell.size === "phone" ? (
            <PanelBottomIcon />
          ) : (
            <SidebarToggleIcon open={isPressed} side={panel.side ?? "right"} />
          ))}
      </TooltipTrigger>
      <TooltipContent>{hint}</TooltipContent>
    </Tooltip>
  )

  // A docked right panel's toggle keeps its spot, open or closed: it sits over the
  // frame's corner, and only its room stays in the header.
  if (isPinned) {
    return (
      <>
        <View
          data-slot="app-shell-panel-trigger-anchor"
          data-panel={panelId}
          data-pinned="true"
          data-state={panel.open ? "open" : "closed"}
          className="cn-app-shell-panel-trigger-anchor"
          style={{ width: ICON_SM }}
        />
        <Portal name={name} hostName={pinnedHost}>
          <View
            pointerEvents="box-none"
            className="absolute"
            style={getPinnedTriggerPosition({
              insetTop: insets.top,
              insetRight: insets.right,
              gutter: variant === "inset" ? parseNumber(gutter, 6) : 0,
              rowHeight: parseNumber(row, 48),
              buttonSize: ICON_SM,
              rowPadding: parseNumber(padding, 12),
            })}
          >
            {button}
          </View>
        </Portal>
      </>
    )
  }

  return (
    <View
      data-slot="app-shell-panel-trigger-anchor"
      data-panel={panelId}
      data-state={panel.open ? "open" : "closed"}
      className="cn-app-shell-panel-trigger-anchor"
    >
      {button}
    </View>
  )
}

export {
  IconSlot,
  AppShell,
  AppShellBottomNav,
  AppShellBottomNavItem,
  AppShellBreadcrumb,
  AppShellContent,
  AppShellHeader,
  AppShellHeaderActions,
  AppShellMain,
  AppShellPageTitle,
  AppShellPanel,
  AppShellPanelClose,
  AppShellPanelContent,
  AppShellPanelHeader,
  AppShellPanelTabs,
  AppShellPanelTitle,
  AppShellPanelTrigger,
  AppShellPanelView,
  AppShellStatusBar,
  AppShellTitlebar,
  createCookieStorage,
  createLocalStorage,
  useAppShell,
  useDragRegionProps,
  useShellPanel,
  useShellShortcut,
  useShellShortcuts,
  useShortcutLabel,
  type AppShellAction,
  type AppShellBreadcrumbItem,
  type AppShellPanelView as AppShellPanelViewOption,
  type AppShellWindow,
  type IconLike,
  type ShellShortcut,
}
