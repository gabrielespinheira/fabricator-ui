"use client"

// App Shell: the frame an application lives in. It wraps SidebarProvider (the
// Sidebar keeps its own API and works without the shell) and adds a main
// column with a header, breadcrumb and status bar, side panels that dock,
// float or become a drawer depending on the room left, one shortcut registry,
// and the native-window details of Electron and Tauri apps.
//
// Layout follows the shell's own width, not the viewport's, so it behaves the
// same in a desktop window, a split view or a docs preview. The behaviour
// lives in lib/app-shell-model, which has no DOM and also serves React Native.
import * as React from "react"
import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "cn"

import {
  foldBreadcrumbs,
  formatShortcut,
  getDefaultPanelShortcut,
  getPanelPlacement,
  getPanelTriggerAnchor,
  getResizedSize,
  getShellSize,
  getShellStorageKey,
  getTrafficLightsGeometry,
  hasWindowTitlebar,
  isChordShortcut,
  matchesShortcut,
  parseShellLayout,
  parseShortcut,
  readStoredJson,
  revealPanelView,
  selectPanelView,
  SHELL_BREAKPOINTS,
  stepSize,
  type AppShellContentSize,
  type PanelMobile,
  type PanelPlacement,
  type PanelState,
  type ShellBreakpoints,
  type ShellLayoutState,
  type ShellSize,
  type ShellStorage,
  type ShortcutPlatform,
} from "@/registry/base-fabricator/lib/app-shell-model"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/base-fabricator/ui/breadcrumb"
import { Button } from "@/registry/base-fabricator/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/base-fabricator/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/base-fabricator/ui/dropdown-menu"
import { Kbd } from "@/registry/base-fabricator/ui/kbd"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/registry/base-fabricator/ui/sheet"
import {
  SidebarInset,
  SidebarProvider,
  SidebarToggleIcon,
  SidebarTrigger,
  useSidebar,
} from "@/registry/base-fabricator/ui/sidebar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/base-fabricator/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/base-fabricator/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** Dragging a panel this far past its minimum closes it (px). */
const PANEL_COLLAPSE_SLOP = 56
/** One arrow-key step on a resize handle; Shift takes four (px). */
const RESIZE_STEP = 16
/** Where the traffic lights sit when the window doesn't say: a 40px band. */
const DEFAULT_TRAFFIC_LIGHTS = { x: 16, y: 13 }

/** An icon as a component (`icon={HomeIcon}`) or an element (`icon={<HomeIcon />}`). */
type IconLike = React.ComponentType<{ className?: string }> | React.ReactElement

function IconSlot({ icon }: { icon?: IconLike }) {
  if (!icon) return null
  if (React.isValidElement(icon)) return icon
  const IconComponent = icon
  return <IconComponent />
}

const FALLBACK_PANEL: PanelState = { open: false, view: null, width: 320 }

// MARK: Storage adapters

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

/** Stores the layout in a cookie, so a server can render it without a flash. */
function createCookieStorage({
  maxAge = COOKIE_MAX_AGE,
}: { maxAge?: number } = {}): ShellStorage {
  return {
    get(key) {
      const entry = document.cookie
        .split("; ")
        .find((cookie) => cookie.startsWith(`${key}=`))
      return entry ? decodeURIComponent(entry.slice(key.length + 1)) : null
    },
    set(key, value) {
      document.cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; samesite=lax`
    },
  }
}

/** Stores the layout in localStorage (client-only apps, Electron, Tauri). */
function createLocalStorage(): ShellStorage {
  return {
    get: (key) => window.localStorage.getItem(key),
    set: (key, value) => window.localStorage.setItem(key, value),
  }
}

// MARK: Platform

const subscribeNoop = () => () => {}

function getIsApple() {
  return /Mac|iPhone|iPad|iPod/.test(window.navigator.platform)
}

/** "apple" reads `mod` as ⌘; everything else as Ctrl. */
function useShortcutPlatform(): ShortcutPlatform {
  const isApple = React.useSyncExternalStore(
    subscribeNoop,
    getIsApple,
    () => false
  )
  return isApple ? "apple" : "other"
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return (
    target.isContentEditable ||
    target.closest("input, textarea, select, [contenteditable='true']") !== null
  )
}

// MARK: Shortcut registry

type ShellShortcut = {
  /** A stable id, listed by useShellShortcuts ("panel.toggle"). */
  id?: string
  /** "mod+alt+b"; `mod` is ⌘ on Apple platforms and Ctrl elsewhere. */
  keys: string | null
  /**
   * Used in a browser instead of `keys`, for keys the browser keeps (⌘T,
   * ⌘W). null turns the shortcut off in a browser.
   */
  webKeys?: string | null
  /** What it does, for command palettes and tooltips. */
  label?: string
  /** Fire while focus is in a text field. Default false. */
  allowInInputs?: boolean
}

type ShortcutEntry = ShellShortcut & {
  handler: (event: KeyboardEvent) => void
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

/** The keys that apply where the app runs: `keys` on desktop, else `webKeys`. */
function resolveKeys(shortcut: ShellShortcut, isDesktop: boolean) {
  if (shortcut.keys === null) return null
  if (isDesktop || shortcut.webKeys === undefined) return shortcut.keys
  return shortcut.webKeys
}

// Several shells can mount (a docs page, an embedded preview); the most
// recently mounted one that contains focus, or else the newest, answers.
const mountedShells: HTMLElement[] = []

function shouldAnswerShortcut(root: HTMLElement, target: EventTarget | null) {
  const node = target instanceof Node ? target : null
  let owner: HTMLElement | undefined
  for (const shell of mountedShells) {
    if (node && shell.contains(node)) owner = shell
  }
  return (owner ?? mountedShells.at(-1)) === root
}

// MARK: Context

/** How the app's window draws its native controls (Electron, Tauri). */
type AppShellWindow = {
  /**
   * `macos`: traffic lights at the top start (`titleBarStyle: "hiddenInset"`
   * or `"hidden"`). `overlay`: Windows and Linux controls at the top end
   * (Electron `titleBarOverlay`, the Window Controls Overlay).
   */
  controls: "none" | "macos" | "overlay"
  /** In fullscreen the traffic lights are gone, and so is their inset. */
  isFullscreen?: boolean
  /** Where the window's traffic lights are now (px): `trafficLightPosition`. */
  trafficLights?: { x: number; y: number }
  /**
   * The window paints a native material behind the page (Electron
   * `vibrancy`, Tauri `windowEffects`): the frame and the sidebar turn
   * transparent so it shows through. The page itself must be transparent.
   */
  isTranslucent?: boolean
  /**
   * The overlay controls' width where the platform doesn't report it. The
   * Window Controls Overlay (Electron's `titleBarOverlay`) reports it through
   * `env(titlebar-area-*)`, which wins. Default 0.
   */
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
  /** null until measured; container queries cover the first paint. */
  size: ShellSize | null
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
  configs: Record<string, PanelConfig>
  registerPanel: (id: string, config: PanelConfig) => () => void
  updatePanel: (id: string, update: (panel: PanelState) => PanelState) => void
}

const AppShellContext = React.createContext<AppShellContextValue | null>(null)

type AppShellScrollValue = {
  /** The id the content carries (its own, or the shell's). */
  contentTarget: string | null
  setContentTarget: (id: string | null) => void
  isScrolled: boolean
  setIsScrolled: (isScrolled: boolean) => void
  scrollRoot: HTMLDivElement | null
  setScrollRoot: (element: HTMLDivElement | null) => void
  pageTitle: React.ReactNode | null
  setPageTitle: (title: React.ReactNode | null) => void
}

const AppShellScrollContext = React.createContext<AppShellScrollValue | null>(
  null
)

function useAppShell() {
  const context = React.useContext(AppShellContext)
  if (!context) {
    throw new Error("useAppShell must be used within an AppShell.")
  }
  return context
}

function useAppShellScroll() {
  const context = React.useContext(AppShellScrollContext)
  if (!context) {
    throw new Error("App Shell parts must be used within an AppShell.")
  }
  return context
}

/** Attributes that make an element a window drag region on desktop. */
function useDragRegionProps() {
  const shell = React.useContext(AppShellContext)
  return {
    "data-drag-region": "",
    // Tauri reads its own attribute, on the element itself only.
    "data-tauri-drag-region": shell?.isDesktop ? "" : undefined,
  }
}

// MARK: Measuring

/** The shell's width and the width the desktop sidebar takes beside it. */
function useShellWidths(root: React.RefObject<HTMLDivElement | null>) {
  const [widths, setWidths] = React.useState({ shell: 0, sidebar: 0 })

  React.useLayoutEffect(() => {
    const element = root.current
    if (!element) return
    let gap: Element | null = null
    const measure = () => {
      const nextGap = element.querySelector('[data-slot="sidebar-gap"]')
      if (nextGap !== gap) {
        if (gap) observer.unobserve(gap)
        if (nextGap) observer.observe(nextGap)
        gap = nextGap
      }
      const shell = element.getBoundingClientRect().width
      const sidebar = gap?.getBoundingClientRect().width ?? 0
      setWidths((current) =>
        current.shell === shell && current.sidebar === sidebar
          ? current
          : { shell, sidebar }
      )
    }
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    // The sidebar gap mounts and unmounts as the layout crosses the phone
    // breakpoint; watch for it.
    const mutations = new MutationObserver(measure)
    mutations.observe(element, { childList: true, subtree: true })
    measure()
    return () => {
      observer.disconnect()
      mutations.disconnect()
    }
  }, [root])

  return widths
}

function getWindowStyle(window: AppShellWindow | undefined) {
  const isMacos = window?.controls === "macos" && !window.isFullscreen
  const isOverlay = window?.controls === "overlay" && !window.isFullscreen
  const lights = getTrafficLightsGeometry(
    window?.trafficLights ?? DEFAULT_TRAFFIC_LIGHTS
  )
  return {
    "--app-shell-window-inset-start": isMacos
      ? `${lights.insetStart}px`
      : "0px",
    "--app-shell-window-inset-end": isOverlay
      ? `calc(100vw - env(titlebar-area-x, 0px) - env(titlebar-area-width, calc(100vw - ${window?.overlayWidth ?? 0}px)))`
      : "0px",
    "--app-shell-titlebar-height": isOverlay
      ? "env(titlebar-area-height, var(--density-40))"
      : isMacos
        ? `max(var(--density-40), ${lights.bandHeight}px)`
        : "var(--density-40)",
  }
}

/**
 * On macOS a rail of icons is wide enough that the traffic lights stay on it.
 * A titlebar row has them above the rail, so there it keeps its own width.
 */
function getRailStyle(
  window: AppShellWindow | undefined,
  hasTitlebar: boolean
) {
  if (window?.controls !== "macos" || window.isFullscreen || hasTitlebar) {
    return undefined
  }
  const { railWidth } = getTrafficLightsGeometry(
    window.trafficLights ?? DEFAULT_TRAFFIC_LIGHTS
  )
  return { "--sidebar-width-icon": `${railWidth}px` } as React.CSSProperties
}

// MARK: AppShell

type AppShellProps = React.ComponentProps<"div"> &
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
    /** Where the layout is saved. Default: a cookie. null saves nothing. */
    storage?: ShellStorage | null
    /** The saved layout, read on the server (readShellLayoutCookie). */
    defaultLayout?: ShellLayoutState
    /** The sidebar's starting width. Rail resizes are saved over it. */
    sidebarWidth?: string
    /** Desktop apps: where the native window controls are. */
    window?: AppShellWindow
    /**
     * A full-width row above the sidebar and main column (AppShellTitlebar).
     * A window with overlaid buttons gets an empty one if you don't pass it.
     */
    titlebar?: React.ReactNode
    breakpoints?: ShellBreakpoints
    /** The narrowest the main column gets before panels float over it. */
    minMainWidth?: number
    /**
     * `window`: shortcuts work anywhere on the page (an app). `focus`: only
     * while focus is inside the shell (a shell embedded in a page).
     */
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
  shortcutScope = "window",
  defaultOpen,
  open,
  onOpenChange,
  persist,
  shortcut,
  peek,
  widthMobile,
  mobileSidebar = "reveal",
  className,
  style,
  children,
  ...props
}: AppShellProps) {
  const rootRef = React.useRef<HTMLDivElement>(null)
  const widths = useShellWidths(rootRef)
  const platform = useShortcutPlatform()
  const contentId = React.useId()
  const [shortcuts] = React.useState(createShortcutRegistry)
  const isDesktop = windowProp !== undefined
  const layoutKey = getShellStorageKey(storageKey, "layout")
  const [storage] = React.useState<ShellStorage | null>(() =>
    storageProp === undefined
      ? typeof document === "undefined"
        ? null
        : createCookieStorage()
      : storageProp
  )

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
  const [configs, setConfigs] = React.useState<Record<string, PanelConfig>>({})

  // Without a server-read layout, adopt the stored one after mounting.
  const hasRestored = React.useRef(defaultLayout !== undefined)
  React.useEffect(() => {
    if (hasRestored.current || !storage) return
    hasRestored.current = true
    setLayout(parseShellLayout(readStoredJson(storage, layoutKey)))
  }, [storage, layoutKey])

  const size = widths.shell > 0 ? getShellSize(widths.shell, breakpoints) : null

  // Event handlers read the latest state through refs, so several updates in
  // one event build on each other and storage is written once per change.
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
      const { layout, floatingOpen, floating, configs } = latest.current
      const saved = layout.panels[id] ?? configs[id]?.defaults ?? FALLBACK_PANEL
      // A panel that floats over the page (an overlay, a drawer, the whole
      // screen) starts closed and its open state is temporary: it never
      // overwrites the docked preference. The chosen view is still saved.
      if (floating[id]) {
        const next = update({ ...saved, open: floatingOpen[id] ?? false })
        const nextFloatingOpen = { ...floatingOpen, [id]: next.open }
        latest.current.floatingOpen = nextFloatingOpen
        setFloatingOpen(nextFloatingOpen)
        if (next.view !== saved.view) {
          commitLayout({
            ...layout,
            panels: { ...layout.panels, [id]: { ...saved, view: next.view } },
          })
        }
        return
      }
      commitLayout({
        ...layout,
        panels: { ...layout.panels, [id]: update(saved) },
      })
    },
    [commitLayout]
  )

  const setSidebarWidth = React.useCallback(
    (width: string) =>
      commitLayout({ ...latest.current.layout, sidebarWidth: width }),
    [commitLayout]
  )

  const contextValue = React.useMemo<AppShellContextValue>(
    () => ({
      size,
      width: widths.shell,
      sidebarWidth: size === "phone" ? 0 : widths.sidebar,
      breakpoints,
      minMainWidth,
      window: windowProp ?? null,
      isDesktop,
      platform,
      contentId,
      shortcuts,
      panels: layout.panels,
      floatingOpen,
      floating,
      setFloating,
      configs,
      registerPanel,
      updatePanel,
    }),
    [
      size,
      widths.shell,
      widths.sidebar,
      breakpoints,
      minMainWidth,
      windowProp,
      isDesktop,
      platform,
      contentId,
      shortcuts,
      layout.panels,
      floatingOpen,
      floating,
      setFloating,
      configs,
      registerPanel,
      updatePanel,
    ]
  )

  // One listener for every shortcut the shell's parts register.
  React.useEffect(() => {
    const root = rootRef.current
    if (!root) return
    mountedShells.push(root)
    const parsed = new Map<string, ReturnType<typeof parseShortcut>>()
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !shouldAnswerShortcut(root, event.target)) {
        return
      }
      if (
        shortcutScope === "focus" &&
        !(event.target instanceof Node && root.contains(event.target))
      ) {
        return
      }
      const entries = shortcuts.entries()
      for (let index = entries.length - 1; index >= 0; index--) {
        const entry = entries[index]
        if (!entry) continue
        const keys = resolveKeys(entry, isDesktop)
        if (!keys) continue
        if (!entry.allowInInputs && isTypingTarget(event.target)) continue
        let shortcutKeys = parsed.get(keys)
        if (!shortcutKeys) {
          shortcutKeys = parseShortcut(keys)
          parsed.set(keys, shortcutKeys)
        }
        if (!matchesShortcut(event, shortcutKeys, platform)) continue
        event.preventDefault()
        entry.handler(event)
        return
      }
    }
    window.addEventListener("keydown", handleKeyDown, { capture: true })
    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true })
      const index = mountedShells.indexOf(root)
      if (index !== -1) mountedShells.splice(index, 1)
    }
  }, [shortcuts, isDesktop, platform, shortcutScope])

  const shellTitlebar =
    titlebar ?? (hasWindowTitlebar(windowProp) ? <AppShellTitlebar /> : null)

  return (
    <AppShellContext.Provider value={contextValue}>
      <AppShellScrollProvider>
        <div
          ref={rootRef}
          data-slot="app-shell"
          data-size={size ?? undefined}
          data-window-controls={
            windowProp && windowProp.controls !== "none"
              ? windowProp.controls
              : undefined
          }
          data-fullscreen={windowProp?.isFullscreen ? "" : undefined}
          data-titlebar={shellTitlebar ? "" : undefined}
          data-translucent={windowProp?.isTranslucent ? "" : undefined}
          className={cn(
            "group/app-shell @container/app-shell relative isolate flex h-svh w-full flex-col overflow-hidden bg-(--app-shell-frame) text-foreground [--app-shell-card-shadow:var(--shadow-surface-2)] [--app-shell-control-inset:calc(var(--app-shell-row-offset)+(var(--density-48)-1.75rem)/2)] [--app-shell-frame-fill:color-mix(in_oklab,var(--surface-1),black_4%)] [--app-shell-frame-muted:color-mix(in_oklab,var(--muted-foreground),black_10%)] [--app-shell-frame:var(--app-shell-frame-fill)] [--app-shell-main:var(--surface-1)] [--app-shell-panel-trigger-room:0px] [--app-shell-panel:var(--app-shell-main)] [--app-shell-row-offset:0px] [--app-shell-status-bar-height:0px] [--app-shell-window-row-height:var(--app-shell-titlebar-height)] [--app-shell-window-toggle-end:calc(max(var(--density-16),var(--app-shell-window-inset-start))+var(--density-28)+var(--density-8))] has-[[data-slot=app-shell-panel-trigger-anchor][data-pinned]]:[--app-shell-panel-trigger-room:calc(1.75rem+var(--density-6))] has-[[data-slot=app-shell-status-bar]]:not-data-[size=phone]:[--app-shell-status-bar-height:var(--density-36)] has-[[data-slot=sidebar][data-variant=inset]]:[--app-shell-window-row-height:max(var(--density-40),calc(var(--app-shell-titlebar-height)-var(--density-16)))] data-resizing:select-none data-translucent:not-data-[size=phone]:[--app-shell-frame:transparent] data-[size=phone]:[--app-shell-window-toggle-end:max(var(--density-12),var(--app-shell-window-inset-start))] data-[window-controls=macos]:not-data-titlebar:[--app-shell-control-inset:calc((var(--app-shell-window-row-height)-1.75rem)/2)] md:not-data-translucent:has-[[data-slot=sidebar][data-variant=floating]]:[--app-shell-frame:var(--app-shell-main)] md:not-data-[window-controls=macos]:not-data-fullscreen:has-[[data-slot=sidebar][data-variant=floating]]:[--app-shell-row-offset:calc(0.5rem+var(--density-8))] md:not-data-[window-controls=macos]:not-data-fullscreen:has-[[data-slot=sidebar][data-variant=sidebar]]:[--app-shell-row-offset:var(--density-8)] dark:[--app-shell-card-shadow:inset_0_0_0_1px_var(--dm-ring-high),0_1px_2px_oklch(0_0_0/0.24)] dark:[--app-shell-frame-fill:color-mix(in_oklab,var(--surface-1),black_22%)] dark:[--app-shell-frame-muted:var(--muted-foreground)] data-resizing:[&_*]:transition-none data-window-controls:[&_:is([data-drag-region],[data-slot=sidebar-header])]:[-webkit-app-region:drag] data-window-controls:[&_:is([data-drag-region],[data-slot=sidebar-header])]:[app-region:drag] data-window-controls:[&_:is([data-drag-region],[data-slot=sidebar-header])_:is(button,a,input,textarea,select,[role=button],[role=tab],[data-no-drag])]:[-webkit-app-region:no-drag] data-window-controls:[&_:is([data-drag-region],[data-slot=sidebar-header])_:is(button,a,input,textarea,select,[role=button],[role=tab],[data-no-drag])]:[app-region:no-drag] [&_:is([data-slot=sidebar-inner],[data-slot=app-shell-status-bar],[data-slot=app-shell-titlebar])]:[--muted-foreground:var(--app-shell-frame-muted)] [&_:is([data-slot=sidebar-inset],[data-slot=app-shell-panel-inner])>:first-child]:mt-(--app-shell-row-offset) data-[window-controls=overlay]:not-data-titlebar:[&_:is([data-slot=sidebar-inset],[data-slot=app-shell-panel-inner])>:first-child]:min-h-(--app-shell-titlebar-height) data-[window-controls=macos]:not-data-titlebar:[&_:is([data-slot=sidebar-inset]>:first-child,[data-slot=app-shell-panel-header])]:h-(--app-shell-window-row-height) data-[window-controls=overlay]:not-data-titlebar:[&_[data-slot=app-shell-panel][data-side=right]_[data-slot=app-shell-panel-header]]:pe-[calc(var(--app-shell-window-inset-end)+var(--app-shell-panel-trigger-room))] data-window-controls:[&_[data-slot=app-shell-window-toggle]>*]:[-webkit-app-region:no-drag] data-window-controls:[&_[data-slot=app-shell-window-toggle]>*]:[app-region:no-drag] data-titlebar:[&_[data-slot=sidebar-container]]:top-(--app-shell-titlebar-height) data-titlebar:[&_[data-slot=sidebar-container]]:h-[calc(100svh-var(--app-shell-titlebar-height))] data-window-controls:not-data-titlebar:[&_[data-slot=sidebar-inner]>[data-slot=sidebar-content]:first-child]:pt-(--app-shell-titlebar-height) data-titlebar:[&_[data-slot=sidebar-peek-strip]]:top-(--app-shell-titlebar-height) [&_[data-slot=sidebar]:not([data-peeking])_[data-slot=sidebar-inner]]:bg-(--app-shell-frame) [&_[data-slot=sidebar]:not([data-state])]:bg-(--app-shell-frame) data-window-controls:not-data-titlebar:[&_[data-slot=sidebar]:not([data-variant=floating])_[data-slot=sidebar-header]]:pt-(--app-shell-titlebar-height) md:data-translucent:[&_[data-slot=sidebar][data-variant=floating]_[data-slot=sidebar-container]]:overflow-clip data-window-controls:not-data-titlebar:[&_[data-slot=sidebar][data-variant=floating]_[data-slot=sidebar-header]]:pt-[calc(var(--app-shell-titlebar-height)-var(--density-8))] md:[&_[data-slot=sidebar][data-variant=floating]:not([data-peeking])_[data-slot=sidebar-inner]]:bg-sidebar md:data-translucent:[&_[data-slot=sidebar][data-variant=floating]:not([data-peeking])_[data-slot=sidebar-inner]]:bg-transparent md:data-translucent:[&_[data-slot=sidebar][data-variant=floating]:not([data-peeking])_[data-slot=sidebar-inner]]:shadow-[var(--app-shell-card-shadow),0_0_0_100vmax_var(--app-shell-main)] data-window-controls:[&_[data-state=collapsed][data-collapsible=offcanvas]_[data-slot=sidebar-header]]:[-webkit-app-region:no-drag] data-window-controls:[&_[data-state=collapsed][data-collapsible=offcanvas]_[data-slot=sidebar-header]]:[app-region:no-drag] data-[window-controls=overlay]:not-data-titlebar:[&:is(:not(:has([data-slot=app-shell-panel][data-side=right][data-state=open])),:has([data-slot=app-shell-panel-trigger-anchor][data-pinned]))_[data-slot=sidebar-inset]>:first-child]:pe-(--app-shell-window-inset-end) data-window-controls:not-data-titlebar:[&:not(:has([data-slot=sidebar][data-state=expanded]))_[data-slot=sidebar-inset]>:first-child]:ps-[max(var(--density-12),calc(var(--app-shell-window-toggle-end)-var(--app-shell-sidebar-gap)))] [:is(body>:not(&,:has(&)),body>:not(&,:has(&))_*)]:[-webkit-app-region:no-drag] [:is(body>:not(&,:has(&)),body>:not(&,:has(&))_*)]:[app-region:no-drag]",
            className
          )}
          style={
            {
              ...getWindowStyle(windowProp),
              ...style,
            } as React.CSSProperties
          }
          {...props}
        >
          <AppShellSkipLink fallbackId={contentId} />
          {shellTitlebar}
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
            onWidthChange={setSidebarWidth}
            style={getRailStyle(windowProp, Boolean(shellTitlebar))}
            className="relative min-h-0 flex-1 [--app-shell-sidebar-gap:0px] has-data-[variant=inset]:bg-transparent data-reveal:bg-transparent md:has-[>[data-slot=sidebar]:not([data-collapsible=offcanvas],[data-collapsible=icon],[data-peeking])]:[--app-shell-sidebar-gap:var(--sidebar-width)] md:has-[>[data-slot=sidebar][data-collapsible=icon]:not([data-variant=floating])]:[--app-shell-sidebar-gap:var(--sidebar-width-icon)] md:has-[>[data-slot=sidebar][data-collapsible=icon][data-variant=floating]]:[--app-shell-sidebar-gap:calc(var(--sidebar-width-icon)+var(--spacing)*4)]"
          >
            {children}
            {windowProp && windowProp.controls !== "none" && (
              <AppShellWindowToggle />
            )}
            <AppShellRegionShortcuts />
          </SidebarProvider>
        </div>
      </AppShellScrollProvider>
    </AppShellContext.Provider>
  )
}

function AppShellScrollProvider({ children }: { children: React.ReactNode }) {
  const [contentTarget, setContentTarget] = React.useState<string | null>(null)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [scrollRoot, setScrollRoot] = React.useState<HTMLDivElement | null>(
    null
  )
  const [pageTitle, setPageTitle] = React.useState<React.ReactNode | null>(null)
  const value = React.useMemo(
    () => ({
      contentTarget,
      setContentTarget,
      isScrolled,
      setIsScrolled,
      scrollRoot,
      setScrollRoot,
      pageTitle,
      setPageTitle,
    }),
    [contentTarget, isScrolled, scrollRoot, pageTitle]
  )
  return (
    <AppShellScrollContext.Provider value={value}>
      {children}
    </AppShellScrollContext.Provider>
  )
}

/** The first stop in the tab order: it jumps to the content. */
function AppShellSkipLink({ fallbackId }: { fallbackId: string }) {
  const { contentTarget } = useAppShellScroll()
  return (
    <a
      href={`#${contentTarget ?? fallbackId}`}
      data-slot="app-shell-skip-link"
      className="sr-only rounded-lg bg-surface-3 px-(--density-12) py-(--density-8) text-(length:--density-text-13) shadow-surface-3 ring-1 ring-ring focus-visible:not-sr-only focus-visible:absolute focus-visible:start-(--density-8) focus-visible:top-(--density-8) focus-visible:z-50"
    >
      Skip to content
    </a>
  )
}

// F6 and ⇧F6 move focus between the shell's regions, as in browsers and
// editors: sidebar, tab strip, content, open panels.
const REGIONS = [
  '[data-slot="sidebar-container"]',
  '[data-slot="tab-strip"]',
  '[data-slot="app-shell-content"]',
  '[data-slot="app-shell-panel"][data-state="open"]',
].join(", ")

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex="0"]'

function focusRegion(region: HTMLElement) {
  if (region.dataset.slot === "app-shell-content") {
    region.focus()
    return
  }
  const target =
    region.querySelector<HTMLElement>('[tabindex="0"][role="tab"]') ??
    region.querySelector<HTMLElement>(FOCUSABLE)
  ;(target ?? region).focus()
}

function AppShellRegionShortcuts() {
  const move = (direction: 1 | -1) => (event: KeyboardEvent) => {
    const root =
      event.target instanceof Element
        ? event.target.closest('[data-slot="app-shell"]')
        : null
    const shell = root ?? document.querySelector('[data-slot="app-shell"]')
    if (!shell) return
    const regions = Array.from(
      shell.querySelectorAll<HTMLElement>(REGIONS)
    ).filter((region) => region.getClientRects().length > 0)
    if (regions.length === 0) return
    const current = regions.findIndex(
      (region) =>
        document.activeElement instanceof Node &&
        region.contains(document.activeElement)
    )
    const next =
      regions[(current + direction + regions.length) % regions.length]
    if (next) focusRegion(next)
  }
  useShellShortcut(
    {
      id: "shell.next-region",
      keys: "F6",
      label: "Next region",
      allowInInputs: true,
    },
    move(1)
  )
  useShellShortcut(
    {
      id: "shell.previous-region",
      keys: "shift+F6",
      label: "Previous region",
      allowInInputs: true,
    },
    move(-1)
  )
  return null
}

// MARK: Shortcut hooks

/**
 * Registers a shortcut with the nearest AppShell. Outside a shell it does
 * nothing, so components that use it still work on their own.
 */
function useShellShortcut(
  shortcut: ShellShortcut & { enabled?: boolean },
  handler: (event: KeyboardEvent) => void
) {
  const shell = React.useContext(AppShellContext)
  const registry = shell?.shortcuts
  const handlerRef = React.useRef(handler)
  React.useLayoutEffect(() => {
    handlerRef.current = handler
  })
  const { id, keys, webKeys, label, allowInInputs, enabled = true } = shortcut
  React.useEffect(() => {
    if (!registry || !enabled || keys === null) return
    return registry.register({
      id,
      keys,
      webKeys,
      label,
      allowInInputs,
      handler: (event) => handlerRef.current(event),
    })
  }, [registry, id, keys, webKeys, label, allowInInputs, enabled])
}

/** The label for a shortcut where the app runs ("⇧⌘T", "Ctrl+Shift+T"). */
function useShortcutLabel(shortcut: Pick<ShellShortcut, "keys" | "webKeys">) {
  const shell = React.useContext(AppShellContext)
  const platform = useShortcutPlatform()
  const keys = resolveKeys(shortcut, shell?.isDesktop ?? false)
  return keys ? formatShortcut(parseShortcut(keys), platform) : null
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
        const keys = resolveKeys(entry, shell.isDesktop)
        if (!keys || !entry.label) return []
        return [
          {
            id: entry.id ?? entry.label,
            label: entry.label,
            keys: formatShortcut(parseShortcut(keys), shell.platform),
          },
        ]
      }),
    [entries, shell.isDesktop, shell.platform]
  )
}

function ShortcutKbd({
  shortcut,
}: {
  shortcut: Pick<ShellShortcut, "keys" | "webKeys">
}) {
  const label = useShortcutLabel(shortcut)
  return label ? <Kbd className="ms-(--density-6)">{label}</Kbd> : null
}

// MARK: Titlebar

/** A full-width row above everything: pass it as AppShell's `titlebar`. */
function AppShellTitlebar({
  className,
  ...props
}: React.ComponentProps<"header">) {
  const dragRegion = useDragRegionProps()
  return (
    <header
      data-slot="app-shell-titlebar"
      {...dragRegion}
      className={cn(
        "flex h-(--app-shell-titlebar-height) shrink-0 items-center gap-(--density-8) bg-(--app-shell-frame) ps-[max(var(--density-8),var(--app-shell-window-inset-start))] pe-[max(calc((var(--app-shell-titlebar-height)-1.75rem)/2),var(--app-shell-window-inset-end))] in-[[data-window-controls]:has([data-slot=sidebar][data-state])]:ps-(--app-shell-window-toggle-end) md:in-[[data-slot=app-shell]:has([data-slot=sidebar][data-variant=floating])]:bg-(--app-shell-main)",
        className
      )}
      {...props}
    />
  )
}

/**
 * Desktop apps: the sidebar toggle in the window's top band, beside the
 * traffic lights on macOS, where the system's own sidebars keep it. It stays
 * put while the sidebar collapses; on phones the header has it instead.
 */
function AppShellWindowToggle() {
  const { isMobile } = useSidebar()
  if (isMobile) return null
  return (
    <div
      data-slot="app-shell-window-toggle"
      className="pointer-events-none absolute start-[max(var(--density-16),var(--app-shell-window-inset-start))] top-0 z-20 hidden h-(--app-shell-titlebar-height) items-center group-has-[[data-slot=sidebar][data-state]]/app-shell:flex in-data-titlebar:-translate-y-full"
    >
      <SidebarTrigger className="pointer-events-auto" />
    </div>
  )
}

// MARK: Main column

function AppShellMain({
  className,
  ...props
}: React.ComponentProps<typeof SidebarInset>) {
  return (
    <SidebarInset
      data-app-shell-main=""
      className={cn(
        "isolate mb-(--app-shell-status-bar-height) min-h-0 min-w-0 overflow-hidden bg-(--app-shell-main) [--background:var(--app-shell-main)] has-[[data-slot=app-shell-panel-trigger-anchor][data-pinned]]:z-1 has-[[data-slot=app-shell-panel-trigger-anchor][data-pinned]]:overflow-x-visible has-[[data-slot=app-shell-panel-trigger-anchor][data-pinned]]:overflow-y-clip md:peer-data-[variant=inset]:me-(--density-8) md:peer-data-[variant=inset]:mt-(--density-8) md:peer-data-[variant=inset]:mb-[max(var(--density-8),var(--app-shell-status-bar-height))] md:peer-data-[variant=inset]:bg-(--app-shell-main) md:peer-data-[variant=inset]:shadow-(--app-shell-card-shadow)! md:peer-data-[variant=inset]:peer-data-[state=collapsed]:peer-not-data-[collapsible=icon]:ms-(--density-8)",
        className
      )}
      {...props}
    />
  )
}

function AppShellHeader({
  trigger = "auto",
  className,
  children,
  ...props
}: React.ComponentProps<"header"> & {
  /**
   * The sidebar toggle at the start. `auto` shows it only while the sidebar
   * is collapsed or on phones, where the sidebar can't show its own. In a
   * desktop window the toggle in the window's top band covers the collapsed
   * case.
   */
  trigger?: "auto" | "always" | "never"
}) {
  const { state, isMobile } = useSidebar()
  const { window: shellWindow } = useAppShell()
  const { isScrolled } = useAppShellScroll()
  const dragRegion = useDragRegionProps()
  const hasWindowToggle =
    shellWindow !== null && shellWindow.controls !== "none"
  const showTrigger =
    trigger === "always" ||
    (trigger === "auto" &&
      (isMobile || (state === "collapsed" && !hasWindowToggle)))

  return (
    <header
      data-slot="app-shell-header"
      data-scrolled={isScrolled ? "" : undefined}
      {...dragRegion}
      className={cn(
        "flex h-(--density-48) shrink-0 items-center gap-(--density-8) border-b border-transparent ps-(--density-12) pe-(--app-shell-control-inset) pt-px transition-[border-color] duration-feedback ease-feedback has-[>[data-slot=sidebar-trigger]:first-child]:ps-(--app-shell-control-inset) has-[>[data-slot=tab-strip]:first-child]:ps-0 data-scrolled:border-border",
        className
      )}
      {...props}
    >
      {showTrigger && <SidebarTrigger className="shrink-0" />}
      {children}
    </header>
  )
}

type AppShellBreadcrumbItem = {
  label: React.ReactNode
  href?: string
  onSelect?: () => void
}

type RenderLink = (item: { href?: string }) => React.ReactElement

const renderAnchor: RenderLink = (item) => <a href={item.href} />

function BreadcrumbCrumb({
  item,
  renderLink,
}: {
  item: AppShellBreadcrumbItem
  renderLink: RenderLink
}) {
  if (!item.href && !item.onSelect) {
    return <span className="text-muted-foreground">{item.label}</span>
  }
  if (!item.href) {
    return (
      <BreadcrumbLink render={<button type="button" onClick={item.onSelect} />}>
        {item.label}
      </BreadcrumbLink>
    )
  }
  return <BreadcrumbLink render={renderLink(item)}>{item.label}</BreadcrumbLink>
}

function BreadcrumbMenuItems({
  items,
  renderLink,
}: {
  items: AppShellBreadcrumbItem[]
  renderLink: RenderLink
}) {
  return (
    <DropdownMenuGroup>
      {items.map((item, index) => (
        <DropdownMenuItem
          key={index}
          render={item.href ? renderLink(item) : undefined}
          onClick={item.onSelect}
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
  renderLink = renderAnchor,
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  /** Root first; the last item is the current page. */
  items: AppShellBreadcrumbItem[]
  /** More items than this fold the middle ones into a menu. Default 4. */
  maxItems?: number
  /** Returns the link element for an item, without children (a router Link). */
  renderLink?: RenderLink
}) {
  const { pageTitle } = useAppShellScroll()
  const current = items.at(-1)
  const parents = items.slice(0, -1)
  const { leading, folded, trailing } = foldBreadcrumbs(parents, maxItems - 1)
  const showsTitle = pageTitle !== null

  return (
    <div
      data-slot="app-shell-breadcrumb"
      data-title={showsTitle ? "" : undefined}
      className={cn(
        "relative grid min-w-0 flex-1 items-center text-(length:--density-text-13) leading-(--density-20)",
        className
      )}
    >
      <Breadcrumb
        className="col-start-1 row-start-1 min-w-0 transition-[opacity,translate] duration-move ease-move in-data-title:pointer-events-none in-data-title:-translate-y-1 in-data-title:opacity-0 motion-reduce:translate-y-0"
        aria-hidden={showsTitle || undefined}
        {...props}
      >
        {/* Tablets and up: the trail, with the middle folded. */}
        <BreadcrumbList className="flex-nowrap gap-(--density-6) text-(length:--density-text-13) leading-(--density-20) @max-[48rem]/app-shell:hidden">
          {[...leading, ...(folded.length ? [null] : []), ...trailing].map(
            (item, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {item ? (
                    <BreadcrumbCrumb item={item} renderLink={renderLink} />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="flex cursor-pointer items-center rounded-md text-muted-foreground ring-ring transition-colors duration-feedback hover:text-foreground focus-visible:ring-1"
                        aria-label="Show more"
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
              <BreadcrumbPage className="truncate">
                {current.label}
              </BreadcrumbPage>
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
        {/* Phones: only the current page; it opens a menu of its parents. */}
        <BreadcrumbList className="flex-nowrap gap-(--density-6) text-(length:--density-text-13) leading-(--density-20) @min-[48rem]/app-shell:hidden">
          {current && (
            <BreadcrumbItem className="min-w-0">
              {parents.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex min-w-0 cursor-pointer items-center gap-(--density-4) rounded-md ring-ring focus-visible:ring-1 [&_svg]:size-(--density-icon-14) [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
                    <BreadcrumbPage className="truncate">
                      {current.label}
                    </BreadcrumbPage>
                    <IconPlaceholder
                      lucide="ChevronDownIcon"
                      tabler="IconChevronDown"
                      hugeicons="ArrowDown01Icon"
                      phosphor="CaretDownIcon"
                      remixicon="RiArrowDownSLine"
                    />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <BreadcrumbMenuItems
                      items={[...parents].reverse()}
                      renderLink={renderLink}
                    />
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <BreadcrumbPage className="truncate">
                  {current.label}
                </BreadcrumbPage>
              )}
            </BreadcrumbItem>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      {/* Once the page's own title scrolls away, it takes the trail's place. */}
      <span
        data-slot="app-shell-breadcrumb-title"
        aria-hidden={!showsTitle || undefined}
        className="pointer-events-none col-start-1 row-start-1 min-w-0 translate-y-1 truncate text-(length:--density-text-13) leading-(--density-20) opacity-0 transition-[opacity,translate] duration-move ease-move weight-semibold in-data-title:pointer-events-auto in-data-title:translate-y-0 in-data-title:opacity-100 motion-reduce:translate-y-0"
      >
        {pageTitle}
      </span>
    </div>
  )
}

/**
 * The page's heading. When it scrolls out of view, the header's breadcrumb
 * shows it instead.
 */
function AppShellPageTitle({
  className,
  children,
  ...props
}: React.ComponentProps<"h1">) {
  const { scrollRoot, setPageTitle } = useAppShellScroll()
  const ref = React.useRef<HTMLHeadingElement>(null)
  const titleRef = React.useRef(children)
  React.useLayoutEffect(() => {
    titleRef.current = children
  })

  React.useEffect(() => {
    const element = ref.current
    if (!element || !scrollRoot) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        setPageTitle(entry.isIntersecting ? null : titleRef.current)
      },
      { root: scrollRoot }
    )
    observer.observe(element)
    return () => {
      observer.disconnect()
      setPageTitle(null)
    }
  }, [scrollRoot, setPageTitle])

  return (
    <h1
      ref={ref}
      data-slot="app-shell-page-title"
      className={cn("text-2xl tracking-tight weight-semibold", className)}
      {...props}
    >
      {children}
    </h1>
  )
}

type AppShellAction = {
  id: string
  label: string
  icon?: IconLike
  onSelect: () => void
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

/**
 * Header actions, described once. Tablets and up get buttons; phones get one
 * menu, and the primary action becomes a floating button.
 */
function AppShellHeaderActions({
  actions = [],
  primaryAction,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  actions?: AppShellAction[]
  primaryAction?: AppShellAction
}) {
  return (
    <div
      data-slot="app-shell-header-actions"
      className={cn("flex shrink-0 items-center gap-(--density-4)", className)}
      {...props}
    >
      {[...actions, ...(primaryAction ? [primaryAction] : [])].map((action) => (
        <ActionShortcut key={action.id} action={action} />
      ))}
      {actions.map((action) =>
        action.icon ? (
          <Tooltip key={action.id}>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={action.label}
                  disabled={action.disabled}
                  onClick={action.onSelect}
                  className="@max-[48rem]/app-shell:hidden"
                />
              }
            >
              <IconSlot icon={action.icon} />
            </TooltipTrigger>
            <TooltipContent>
              {action.label}
              {action.shortcut && (
                <ShortcutKbd shortcut={{ keys: action.shortcut }} />
              )}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            key={action.id}
            variant="ghost"
            size="sm"
            disabled={action.disabled}
            onClick={action.onSelect}
            className="@max-[48rem]/app-shell:hidden"
          >
            {action.label}
          </Button>
        )
      )}
      {primaryAction && (
        <Button
          size="sm"
          disabled={primaryAction.disabled}
          onClick={primaryAction.onSelect}
          className="@max-[48rem]/app-shell:hidden"
        >
          {primaryAction.icon && <IconSlot icon={primaryAction.icon} />}
          {primaryAction.label}
        </Button>
      )}
      {actions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="More actions"
                className="@min-[48rem]/app-shell:hidden"
              />
            }
          >
            <IconPlaceholder
              lucide="EllipsisIcon"
              tabler="IconDots"
              hugeicons="MoreHorizontalCircle01Icon"
              phosphor="DotsThreeIcon"
              remixicon="RiMoreLine"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  onClick={action.onSelect}
                >
                  <IconSlot icon={action.icon} />
                  {action.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      {primaryAction && (
        <Button
          data-slot="app-shell-fab"
          size="icon-lg"
          aria-label={primaryAction.label}
          disabled={primaryAction.disabled}
          onClick={primaryAction.onSelect}
          className="absolute end-(--density-16) bottom-(--density-16) z-20 rounded-full shadow-surface-4 in-[[data-app-shell-main]:has(>[data-slot=app-shell-bottom-nav])]:bottom-[calc(var(--density-48)+var(--density-16)+env(safe-area-inset-bottom))] @min-[48rem]/app-shell:hidden"
        >
          {primaryAction.icon ? (
            <IconSlot icon={primaryAction.icon} />
          ) : (
            <IconPlaceholder
              lucide="PlusIcon"
              tabler="IconPlus"
              hugeicons="PlusSignIcon"
              phosphor="PlusIcon"
              remixicon="RiAddLine"
            />
          )}
        </Button>
      )}
    </div>
  )
}

/** The page's scroller: the only one in the main column. */
function AppShellContent({
  id,
  size,
  className,
  onScroll,
  ...props
}: React.ComponentProps<"div"> & {
  /**
   * Centres the page in a column of this width, with the page's padding. Left
   * out, the page has the column's full width, for tables, boards and editors.
   */
  size?: AppShellContentSize
}) {
  const { contentId } = useAppShell()
  const { isScrolled, setIsScrolled, setScrollRoot, setContentTarget } =
    useAppShellScroll()
  const targetId = id ?? contentId
  React.useLayoutEffect(() => {
    setContentTarget(targetId)
    return () => setContentTarget(null)
  }, [setContentTarget, targetId])
  return (
    <div
      ref={setScrollRoot}
      id={targetId}
      tabIndex={-1}
      data-slot="app-shell-content"
      data-content-size={size}
      onScroll={(event) => {
        onScroll?.(event)
        const scrolled = event.currentTarget.scrollTop > 0
        if (scrolled !== isScrolled) setIsScrolled(scrolled)
      }}
      className={cn(
        "relative min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-b-[inherit] outline-none [--app-shell-content-gutter:var(--density-24)] focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-inset in-data-[size=phone]:[--app-shell-content-gutter:var(--density-16)] data-content-size:px-[max(var(--app-shell-content-gutter),calc((100%-var(--app-shell-content-width))/2))] data-content-size:py-(--app-shell-content-gutter) data-[content-size=lg]:[--app-shell-content-width:72rem] data-[content-size=md]:[--app-shell-content-width:56rem] data-[content-size=sm]:[--app-shell-content-width:42rem]",
        className
      )}
      {...props}
    />
  )
}

/**
 * The status bar: a row on the frame under the main column and the panels.
 * Place it in AppShell, after them. Fill it with ghost `size="sm"` buttons
 * and text; phones hide it.
 */
function AppShellStatusBar({
  className,
  ...props
}: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="app-shell-status-bar"
      className={cn(
        "absolute start-(--app-shell-sidebar-gap) end-0 bottom-0 flex h-(--density-36) items-center gap-0 px-(--density-4) text-(length:--density-text-12) text-muted-foreground transition-[inset-inline-start,inset-inline-end] duration-move ease-move in-data-[size=phone]:hidden in-[:has(>[data-slot=sidebar]:is([data-collapsible=icon],[data-collapsible=offcanvas]))]:duration-move-exit in-[:has(>[data-slot=sidebar]:is([data-collapsible=icon],[data-collapsible=offcanvas]))]:ease-exit in-[:has(>[data-slot=sidebar][data-resizing])]:transition-none in-[:has(>[data-slot=sidebar][data-side=right])]:start-0 in-[:has(>[data-slot=sidebar][data-side=right])]:end-(--app-shell-sidebar-gap) motion-reduce:transition-none md:in-[:has(>[data-slot=sidebar][data-variant=floating])]:border-t md:in-[:has(>[data-slot=sidebar][data-variant=floating])]:border-border md:in-[:has(>[data-slot=sidebar][data-variant=floating])]:bg-(--app-shell-main) [&>span]:truncate [&>span]:px-(--density-8)",
        className
      )}
      {...props}
    />
  )
}

// MARK: Bottom nav

/** A phone tab bar. It hides itself from tablets up. */
function AppShellBottomNav({
  className,
  ...props
}: React.ComponentProps<"nav">) {
  return (
    <nav
      data-slot="app-shell-bottom-nav"
      aria-label="Main"
      className={cn(
        "flex shrink-0 border-t border-border bg-(--app-shell-main) pb-[env(safe-area-inset-bottom)] @min-[48rem]/app-shell:hidden",
        className
      )}
      {...props}
    />
  )
}

function AppShellBottomNavItem({
  icon,
  label,
  isActive = false,
  render,
  className,
  ...props
}: useRender.ComponentProps<"a"> & {
  icon?: IconLike
  label: string
  isActive?: boolean
}) {
  return useRender({
    defaultTagName: "a",
    render,
    props: mergeProps<"a">(
      {
        className: cn(
          "flex min-h-(--density-48) flex-1 cursor-pointer flex-col items-center justify-center gap-(--density-4) text-(length:--density-text-11) text-muted-foreground transition-colors duration-feedback ease-feedback outline-none hover:text-foreground focus-visible:text-foreground aria-[current=page]:text-foreground aria-[current=page]:weight-semibold [&_svg]:size-(--density-icon-16) [&_svg]:stroke-[1.5] aria-[current=page]:[&_svg]:stroke-2",
          className
        ),
        "aria-current": isActive ? "page" : undefined,
        children: (
          <>
            <IconSlot icon={icon} />
            <span className="max-w-full truncate px-(--density-4)">
              {label}
            </span>
          </>
        ),
      },
      props
    ),
    state: { slot: "app-shell-bottom-nav-item", active: isActive },
  })
}

// MARK: Panels

type AppShellPanelView = {
  value: string
  label: string
  icon?: IconLike
  /** Shows this view (opening the panel). */
  shortcut?: string
}

type PanelContextValue = {
  id: string
  domId: string
  label: string
  side: "left" | "right"
  views: AppShellPanelView[]
  placement: PanelPlacement
  panel: PanelState
  minWidth: number
  maxWidth: number
  defaultWidth: number
  setOpen: (open: boolean) => void
  setWidth: (width: number) => void
  reveal: (view: string) => void
  elementRef: React.RefObject<HTMLElement | null>
}

const PanelContext = React.createContext<PanelContextValue | null>(null)

function usePanel() {
  const context = React.useContext(PanelContext)
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
}: Omit<React.ComponentProps<"aside">, "id"> & {
  id: string
  /** Names the panel for assistive tech, tooltips and its sheet title. */
  label: string
  side?: "left" | "right"
  /** Views the header's AppShellPanelTabs switches between. */
  views?: AppShellPanelView[]
  defaultOpen?: boolean
  defaultView?: string
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  /** On phones: a bottom drawer, the whole screen, or not shown. */
  mobile?: PanelMobile
  /** Toggles the panel. Default ⌘\\ on the right, none on the left. null: none. */
  shortcut?: string | null
}) {
  const shell = useAppShell()
  const elementRef = React.useRef<HTMLElement | null>(null)
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
  const panel: PanelState = {
    open: control.open,
    view: control.view ?? defaults.view,
    width: Math.max(minWidth, Math.min(maxWidth, control.width)),
  }

  useShellShortcut(
    {
      id: `panel.${id}.toggle`,
      keys: shortcut,
      label: `Toggle ${label}`,
      allowInInputs: shortcut !== null && isChordShortcut(shortcut),
    },
    control.toggle
  )

  // Other open panels take room too.
  const otherPanels = Object.entries(shell.panels)
    .filter(([otherId, other]) => otherId !== id && other.open)
    .reduce((total, [, other]) => total + other.width, 0)
  const placement =
    shell.size === null
      ? "inline"
      : getPanelPlacement({
          shellWidth: shell.width,
          occupiedWidth: shell.sidebarWidth + otherPanels,
          panelWidth: panel.width,
          minMainWidth: shell.minMainWidth,
          mobile,
          breakpoints: shell.breakpoints,
        })

  const { setFloating } = shell
  const isFloating = placement !== "inline"
  React.useLayoutEffect(() => {
    setFloating(id, isFloating)
  }, [setFloating, id, isFloating])

  const contextValue: PanelContextValue = {
    id,
    domId: control.domId,
    label,
    side,
    views,
    placement: placement ?? "drawer",
    panel,
    minWidth,
    maxWidth,
    defaultWidth,
    setOpen: control.setOpen,
    setWidth: (width) =>
      shell.updatePanel(id, (current) => ({ ...current, width })),
    reveal: control.reveal,
    elementRef,
  }

  const content =
    views.length > 0 ? (
      <Tabs
        value={panel.view ?? undefined}
        onValueChange={(value) => {
          if (typeof value === "string") control.reveal(value)
        }}
        className="flex min-h-0 flex-1 flex-col gap-0"
      >
        {children}
      </Tabs>
    ) : (
      children
    )

  const viewShortcuts = views.map((view) => (
    <PanelViewShortcut key={view.value} panelId={id} view={view} />
  ))

  if (placement === null) return null

  const panelStyle = {
    "--app-shell-panel-width": `${panel.width}px`,
    ...style,
  } as React.CSSProperties

  if (placement === "overlay") {
    return (
      <PanelContext.Provider value={contextValue}>
        {viewShortcuts}
        <Sheet open={panel.open} onOpenChange={control.setOpen}>
          <SheetContent
            id={control.domId}
            side={side}
            showCloseButton={false}
            data-app-shell-panel=""
            data-placement="overlay"
            className={cn(
              "flex w-(--app-shell-panel-width) max-w-[calc(100%-var(--density-48))] flex-col gap-0 p-0 [--background:var(--surface-3)] sm:max-w-[calc(100%-var(--density-48))]",
              className
            )}
            style={panelStyle}
          >
            <SheetHeader className="sr-only">
              <SheetTitle>{label}</SheetTitle>
              <SheetDescription>{label}</SheetDescription>
            </SheetHeader>
            {content}
          </SheetContent>
        </Sheet>
      </PanelContext.Provider>
    )
  }

  if (placement === "drawer") {
    return (
      <PanelContext.Provider value={contextValue}>
        {viewShortcuts}
        <Drawer open={panel.open} onOpenChange={control.setOpen}>
          <DrawerContent
            id={control.domId}
            data-app-shell-panel=""
            data-placement="drawer"
            className={cn("flex max-h-[85svh] flex-col", className)}
          >
            <DrawerHeader className="sr-only">
              <DrawerTitle>{label}</DrawerTitle>
            </DrawerHeader>
            {content}
          </DrawerContent>
        </Drawer>
      </PanelContext.Provider>
    )
  }

  return (
    <PanelContext.Provider value={contextValue}>
      {viewShortcuts}
      <aside
        ref={elementRef}
        id={control.domId}
        aria-label={label}
        data-slot="app-shell-panel"
        data-side={side}
        data-placement={placement}
        data-state={panel.open ? "open" : "closed"}
        inert={!panel.open}
        hidden={placement === "swap" && !panel.open}
        className={cn(
          "group/app-shell-panel relative mb-(--app-shell-status-bar-height) flex shrink-0 flex-col overflow-hidden border-border bg-(--app-shell-panel) transition-[width,margin,border-width,box-shadow] duration-move ease-move [--background:var(--app-shell-panel)] group-has-data-[variant=inset]/sidebar-wrapper:my-(--density-8) group-has-data-[variant=inset]/sidebar-wrapper:mb-[max(var(--density-8),var(--app-shell-status-bar-height))] group-has-data-[variant=inset]/sidebar-wrapper:rounded-xl group-has-data-[variant=inset]/sidebar-wrapper:border-0 group-has-data-[variant=inset]/sidebar-wrapper:shadow-(--app-shell-card-shadow) data-[placement=inline]:w-(--app-shell-panel-width) data-[placement=swap]:absolute data-[placement=swap]:inset-0 data-[placement=swap]:z-30 data-[placement=swap]:border-0 data-[placement=swap]:bg-(--app-shell-frame) data-[placement=swap]:[--background:var(--app-shell-frame)] motion-reduce:transition-none group-has-data-[variant=inset]/sidebar-wrapper:data-open:me-(--density-8) data-[placement=inline]:data-open:data-[side=left]:border-e group-has-data-[variant=inset]/sidebar-wrapper:data-[placement=inline]:data-open:data-[side=left]:border-e-0 data-[placement=inline]:data-open:data-[side=right]:border-s group-has-data-[variant=inset]/sidebar-wrapper:data-[placement=inline]:data-open:data-[side=right]:border-s-0 data-closed:duration-move-exit data-closed:ease-exit group-has-data-[variant=inset]/sidebar-wrapper:data-closed:shadow-none data-[placement=inline]:data-closed:w-0",
          className
        )}
        style={panelStyle}
        {...props}
      >
        <div
          data-slot="app-shell-panel-inner"
          className="@container/app-shell-panel flex h-full min-h-0 min-w-0 flex-col in-data-[placement=inline]:w-(--app-shell-panel-width)"
        >
          {content}
        </div>
        {/* In a window, a press on a drag region moves the window, and a drag
            region later in the document cancels an earlier no-drag one. The
            pinned toggle comes before this panel's header, so its spot is given
            back here, on the panel itself: the header slides under it. */}
        <span
          aria-hidden
          data-slot="app-shell-panel-trigger-guard"
          className="pointer-events-none absolute end-0 top-0 hidden h-(--density-48) w-[calc(var(--app-shell-window-inset-end)+var(--app-shell-control-inset)+var(--app-shell-panel-trigger-room))] [-webkit-app-region:no-drag] [app-region:no-drag] in-data-titlebar:w-[calc(var(--app-shell-control-inset)+var(--app-shell-panel-trigger-room))] in-data-[placement=inline]:in-data-[side=right]:in-[[data-slot=sidebar-wrapper]:has([data-slot=app-shell-panel-trigger-anchor][data-pinned])]:block"
        />
        {placement === "inline" && panel.open && <AppShellPanelResizeHandle />}
      </aside>
    </PanelContext.Provider>
  )
}

function AppShellPanelResizeHandle() {
  const {
    id,
    domId,
    label,
    side,
    panel,
    minWidth,
    maxWidth,
    defaultWidth,
    setOpen,
    setWidth,
    elementRef,
  } = usePanel()
  const drag = React.useRef<{ startX: number; startWidth: number } | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)

  // The toggle follows live too, so it holds its spot while the panel resizes.
  const preview = (width: number) => {
    const element = elementRef.current
    element?.style.setProperty("--app-shell-panel-width", `${width}px`)
    element
      ?.closest('[data-slot="app-shell"]')
      ?.querySelector<HTMLElement>(
        `[data-slot="app-shell-panel-trigger-anchor"][data-panel="${id}"]`
      )
      ?.style.setProperty("--app-shell-panel-trigger-shift", `${width}px`)
  }

  const toDelta = (clientX: number, startX: number) =>
    side === "right" ? startX - clientX : clientX - startX

  const setResizing = (isResizing: boolean) => {
    const root = elementRef.current?.closest<HTMLElement>(
      '[data-slot="app-shell"]'
    )
    if (isResizing) {
      root?.setAttribute("data-resizing", "")
      document.documentElement.style.cursor = "col-resize"
    } else {
      root?.removeAttribute("data-resizing")
      document.documentElement.style.cursor = ""
    }
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${label}`}
      aria-controls={domId}
      aria-valuenow={panel.width}
      aria-valuemin={minWidth}
      aria-valuemax={maxWidth}
      tabIndex={0}
      data-slot="app-shell-panel-resize-handle"
      data-side={side}
      data-dragging={isDragging ? "" : undefined}
      className="absolute inset-y-0 z-10 w-2 cursor-col-resize touch-none outline-none after:absolute after:inset-y-0 after:w-px after:bg-transparent after:transition-colors after:duration-feedback hover:after:bg-foreground/25 focus-visible:after:bg-ring data-dragging:after:bg-foreground/25 data-[side=left]:end-0 data-[side=left]:after:end-0 data-[side=right]:start-0 data-[side=right]:after:start-0"
      onPointerDown={(event) => {
        if (event.button !== 0) return
        event.currentTarget.setPointerCapture(event.pointerId)
        drag.current = { startX: event.clientX, startWidth: panel.width }
        setIsDragging(true)
        setResizing(true)
      }}
      onPointerMove={(event) => {
        const current = drag.current
        if (!current) return
        const { size, isCollapsed } = getResizedSize({
          startSize: current.startWidth,
          delta: toDelta(event.clientX, current.startX),
          min: minWidth,
          max: maxWidth,
          collapseSlop: PANEL_COLLAPSE_SLOP,
        })
        preview(isCollapsed ? minWidth : size)
        elementRef.current?.toggleAttribute("data-collapsing", isCollapsed)
      }}
      onPointerUp={(event) => {
        const current = drag.current
        drag.current = null
        setIsDragging(false)
        setResizing(false)
        elementRef.current?.removeAttribute("data-collapsing")
        if (!current) return
        const { size, isCollapsed } = getResizedSize({
          startSize: current.startWidth,
          delta: toDelta(event.clientX, current.startX),
          min: minWidth,
          max: maxWidth,
          collapseSlop: PANEL_COLLAPSE_SLOP,
        })
        if (isCollapsed) {
          preview(current.startWidth)
          setOpen(false)
          return
        }
        setWidth(size)
      }}
      onPointerCancel={() => {
        const current = drag.current
        drag.current = null
        setIsDragging(false)
        setResizing(false)
        elementRef.current?.removeAttribute("data-collapsing")
        if (current) preview(current.startWidth)
      }}
      onDoubleClick={() => {
        preview(defaultWidth)
        setWidth(defaultWidth)
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? RESIZE_STEP * 4 : RESIZE_STEP
        // The handle sits on the panel's inner edge: towards the main column
        // grows the panel.
        const grow = side === "right" ? "ArrowLeft" : "ArrowRight"
        const shrink = side === "right" ? "ArrowRight" : "ArrowLeft"
        let next: number | null = null
        if (event.key === grow)
          next = stepSize(panel.width, step, minWidth, maxWidth)
        if (event.key === shrink)
          next = stepSize(panel.width, -step, minWidth, maxWidth)
        if (event.key === "Home") next = minWidth
        if (event.key === "End") next = maxWidth
        if (next === null) return
        event.preventDefault()
        preview(next)
        setWidth(next)
      }}
    />
  )
}

function AppShellPanelHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const dragRegion = useDragRegionProps()
  return (
    <div
      data-slot="app-shell-panel-header"
      {...dragRegion}
      className={cn(
        "flex h-(--density-48) shrink-0 items-center gap-(--density-6) border-b border-transparent ps-(--density-12) pe-[var(--app-shell-control-inset,calc((var(--density-48)-1.75rem)/2))] pt-px in-data-[placement=inline]:pe-[calc(var(--app-shell-control-inset)+var(--app-shell-panel-trigger-room))] in-data-[placement=overlay]:in-[:root:has([data-slot=sidebar][data-variant=inset])]:mt-(--density-8) in-data-[placement=overlay]:in-[:root:has([data-slot=sidebar][data-variant=inset])]:pe-[calc((var(--density-48)-1.75rem)/2+var(--density-8))]",
        className
      )}
      {...props}
    />
  )
}

function AppShellPanelTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="app-shell-panel-title"
      className={cn(
        "min-w-0 flex-1 truncate text-(length:--density-text-13) weight-semibold",
        className
      )}
      {...props}
    />
  )
}

/** The panel's views as tabs. Below 360px they show icons only. */
function AppShellPanelTabs({
  className,
  ...props
}: React.ComponentProps<typeof TabsList>) {
  const { views } = usePanel()
  return (
    <TabsList
      data-slot="app-shell-panel-tabs"
      className={cn("min-w-0 justify-start", className)}
      {...props}
    >
      {views.map((view) => (
        <TabsTrigger
          key={view.value}
          value={view.value}
          aria-label={view.label}
          className="@max-[22.5rem]/app-shell-panel:px-(--density-8)"
        >
          <IconSlot icon={view.icon} />
          <span className="@max-[22.5rem]/app-shell-panel:sr-only">
            {view.label}
          </span>
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
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Close ${label}`}
      data-slot="app-shell-panel-close"
      onClick={() => setOpen(false)}
      className={cn(
        "ms-auto in-data-[placement=inline]:in-[[data-slot=sidebar-wrapper]:has([data-slot=app-shell-panel-trigger-anchor][data-pinned])]:hidden",
        className
      )}
      {...props}
    >
      {children ??
        (placement === "drawer" ? (
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
          />
        ) : (
          <SidebarToggleIcon open side={side} />
        ))}
    </Button>
  )
}

/** The scrolling body of a panel without views. */
function AppShellPanelContent({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="app-shell-panel-content"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto text-(length:--density-text-13)",
        className
      )}
      {...props}
    />
  )
}

/** One of the panel's views; shown while its tab is selected. */
function AppShellPanelView({
  className,
  ...props
}: React.ComponentProps<typeof TabsContent>) {
  return (
    <TabsContent
      data-slot="app-shell-panel-view"
      className={cn(
        "min-h-0 flex-1 overflow-y-auto text-(length:--density-text-13)",
        className
      )}
      {...props}
    />
  )
}

/** Toggles a panel, or selects one of its views (VS Code's activity bar). */
function AppShellPanelTrigger({
  panel: panelId,
  view,
  className,
  children,
  onClick,
  ...props
}: React.ComponentProps<typeof Button> & {
  panel: string
  view?: string
}) {
  const panel = useShellPanel(panelId)
  const isPressed = view ? panel.open && panel.view === view : panel.open
  const anchor = getPanelTriggerAnchor({
    hasView: view !== undefined,
    side: panel.side,
    isFloating: panel.isFloating,
    open: panel.open,
    width: panel.width,
  })
  return (
    <span
      data-slot="app-shell-panel-trigger-anchor"
      data-panel={panelId}
      data-pinned={anchor.isPinned ? "" : undefined}
      data-state={panel.open ? "open" : "closed"}
      style={
        {
          "--app-shell-panel-trigger-shift": `${anchor.shift}px`,
        } as React.CSSProperties
      }
      className="relative end-[calc(-1*(var(--app-shell-panel-trigger-shift)+var(--app-shell-panel-trigger-gutter)))] inline-flex shrink-0 transition-[inset-inline-end,margin-inline-start] duration-move ease-move [--app-shell-panel-trigger-gutter:0px] motion-reduce:transition-none data-open:group-has-data-[variant=inset]/sidebar-wrapper:[--app-shell-panel-trigger-gutter:var(--density-8)] data-pinned:data-open:ms-[calc(-1*(1.75rem+var(--density-8)+max(0px,var(--app-shell-window-inset-end)-var(--app-shell-control-inset))))] in-data-titlebar:data-pinned:data-open:ms-[calc(-1*(1.75rem+var(--density-8)))] data-closed:duration-move-exit data-closed:ease-exit"
    >
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={panel.label}
              aria-expanded={isPressed}
              aria-controls={panel.domId}
              data-slot="app-shell-panel-trigger"
              data-state={isPressed ? "open" : "closed"}
              data-view={view}
              onClick={(event) => {
                onClick?.(event)
                if (view) panel.select(view)
                else panel.toggle()
              }}
              className={cn(
                "not-data-view:aria-expanded:not-hover:bg-transparent not-data-view:aria-expanded:not-hover:text-muted-foreground data-view:data-open:bg-active data-view:data-open:text-foreground",
                className
              )}
              {...props}
            />
          }
        >
          {children ?? (
            <SidebarToggleIcon open={isPressed} side={panel.side ?? "right"} />
          )}
        </TooltipTrigger>
        <TooltipContent>
          {panel.open ? "Hide" : "Show"} {panel.label.toLowerCase()}
          {panel.shortcut && (
            <ShortcutKbd shortcut={{ keys: panel.shortcut }} />
          )}
        </TooltipContent>
      </Tooltip>
    </span>
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
