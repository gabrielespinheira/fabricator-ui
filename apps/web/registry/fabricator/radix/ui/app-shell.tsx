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
import { cn } from "cn"
import { Slot } from "radix-ui"

import {
  foldBreadcrumbs,
  formatShortcut,
  getPanelPlacement,
  getResizedSize,
  getShellSize,
  getShellStorageKey,
  getTrafficLightsGeometry,
  matchesShortcut,
  parseShellLayout,
  parseShortcut,
  readStoredJson,
  revealPanelView,
  selectPanelView,
  SHELL_BREAKPOINTS,
  stepSize,
  type PanelMobile,
  type PanelPlacement,
  type PanelState,
  type ShellBreakpoints,
  type ShellLayoutState,
  type ShellSize,
  type ShellStorage,
  type ShortcutPlatform,
} from "@/registry/bases/radix/lib/app-shell-model"
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/registry/bases/radix/ui/breadcrumb"
import { Button } from "@/registry/bases/radix/ui/button"
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/bases/radix/ui/drawer"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/registry/bases/radix/ui/dropdown-menu"
import { Kbd } from "@/registry/bases/radix/ui/kbd"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/registry/bases/radix/ui/sheet"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/registry/bases/radix/ui/sidebar"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/registry/bases/radix/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/registry/bases/radix/ui/tooltip"
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
  /** The `trafficLightPosition` the window was created with (px). */
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
    /** A full-width row above the sidebar and main column (AppShellTitlebar). */
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
          data-titlebar={titlebar ? "" : undefined}
          data-translucent={windowProp?.isTranslucent ? "" : undefined}
          className={cn(
            "cn-app-shell group/app-shell @container/app-shell relative isolate flex h-svh w-full flex-col overflow-hidden",
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
          {titlebar}
          <SidebarProvider
            defaultOpen={defaultOpen}
            open={open}
            onOpenChange={onOpenChange}
            persist={persist}
            shortcut={shortcut}
            peek={peek}
            width={layout.sidebarWidth ?? sidebarWidthProp}
            widthMobile={widthMobile}
            onWidthChange={setSidebarWidth}
            className="cn-app-shell-body min-h-0 flex-1"
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
      className="cn-app-shell-skip-link sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:z-50"
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
  return label ? <Kbd className="cn-app-shell-kbd">{label}</Kbd> : null
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
        "cn-app-shell-titlebar flex shrink-0 items-center",
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
      className="cn-app-shell-window-toggle pointer-events-none absolute top-0 z-20 hidden items-center group-has-[[data-slot=sidebar][data-state]]/app-shell:flex"
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
        "cn-app-shell-main min-h-0 min-w-0 overflow-hidden",
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
        "cn-app-shell-header flex shrink-0 items-center",
        className
      )}
      {...props}
    >
      {showTrigger && (
        <SidebarTrigger className="cn-app-shell-header-trigger" />
      )}
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

/** renderLink returns a link without children; asChild needs the label in it. */
function withChildren(element: React.ReactElement, children: React.ReactNode) {
  return React.cloneElement(element, undefined, children)
}

function BreadcrumbCrumb({
  item,
  renderLink,
}: {
  item: AppShellBreadcrumbItem
  renderLink: RenderLink
}) {
  if (!item.href && !item.onSelect) {
    return <span className="cn-app-shell-breadcrumb-text">{item.label}</span>
  }
  if (!item.href) {
    return (
      <BreadcrumbLink asChild>
        <button type="button" onClick={item.onSelect}>
          {item.label}
        </button>
      </BreadcrumbLink>
    )
  }
  return (
    <BreadcrumbLink asChild>
      {withChildren(renderLink(item), item.label)}
    </BreadcrumbLink>
  )
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
          asChild={Boolean(item.href)}
          onSelect={item.onSelect}
        >
          {item.href ? withChildren(renderLink(item), item.label) : item.label}
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
        "cn-app-shell-breadcrumb relative grid min-w-0 flex-1 items-center",
        className
      )}
    >
      <Breadcrumb
        className="cn-app-shell-breadcrumb-trail col-start-1 row-start-1 min-w-0"
        aria-hidden={showsTitle || undefined}
        {...props}
      >
        {/* Tablets and up: the trail, with the middle folded. */}
        <BreadcrumbList className="cn-app-shell-breadcrumb-list flex-nowrap @max-[48rem]/app-shell:hidden">
          {[...leading, ...(folded.length ? [null] : []), ...trailing].map(
            (item, index) => (
              <React.Fragment key={index}>
                <BreadcrumbItem>
                  {item ? (
                    <BreadcrumbCrumb item={item} renderLink={renderLink} />
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className="cn-app-shell-breadcrumb-fold"
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
        <BreadcrumbList className="cn-app-shell-breadcrumb-list flex-nowrap @min-[48rem]/app-shell:hidden">
          {current && (
            <BreadcrumbItem className="min-w-0">
              {parents.length > 0 ? (
                <DropdownMenu>
                  <DropdownMenuTrigger className="cn-app-shell-breadcrumb-current">
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
        className="cn-app-shell-breadcrumb-title col-start-1 row-start-1 min-w-0 truncate"
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
      className={cn("cn-app-shell-page-title", className)}
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
      className={cn(
        "cn-app-shell-header-actions flex shrink-0 items-center",
        className
      )}
      {...props}
    >
      {[...actions, ...(primaryAction ? [primaryAction] : [])].map((action) => (
        <ActionShortcut key={action.id} action={action} />
      ))}
      {actions.map((action) =>
        action.icon ? (
          // A local provider: Radix tooltips need one, and the app may not
          // have it.
          <TooltipProvider key={action.id} delayDuration={600}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={action.label}
                  disabled={action.disabled}
                  onClick={action.onSelect}
                  className="@max-[48rem]/app-shell:hidden"
                >
                  <IconSlot icon={action.icon} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {action.label}
                {action.shortcut && (
                  <ShortcutKbd shortcut={{ keys: action.shortcut }} />
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
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
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="More actions"
              className="@min-[48rem]/app-shell:hidden"
            >
              <IconPlaceholder
                lucide="EllipsisIcon"
                tabler="IconDots"
                hugeicons="MoreHorizontalCircle01Icon"
                phosphor="DotsThreeIcon"
                remixicon="RiMoreLine"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {actions.map((action) => (
                <DropdownMenuItem
                  key={action.id}
                  disabled={action.disabled}
                  onSelect={action.onSelect}
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
          className="cn-app-shell-fab absolute z-20 @min-[48rem]/app-shell:hidden"
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
  className,
  onScroll,
  ...props
}: React.ComponentProps<"div">) {
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
      onScroll={(event) => {
        onScroll?.(event)
        const scrolled = event.currentTarget.scrollTop > 0
        if (scrolled !== isScrolled) setIsScrolled(scrolled)
      }}
      className={cn(
        "cn-app-shell-content relative min-h-0 flex-1 overflow-y-auto outline-none",
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
        "cn-app-shell-status-bar absolute end-0 bottom-0 flex items-center",
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
        "cn-app-shell-bottom-nav flex shrink-0 @min-[48rem]/app-shell:hidden",
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
  asChild = false,
  className,
  children,
  ...props
}: React.ComponentProps<"a"> & {
  /** Renders the child element (a router Link, without children) instead. */
  asChild?: boolean
  icon?: IconLike
  label: string
  isActive?: boolean
}) {
  const Comp = asChild ? Slot.Root : "a"
  return (
    <Comp
      data-slot="app-shell-bottom-nav-item"
      data-active={isActive ? "" : undefined}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "cn-app-shell-bottom-nav-item flex flex-1 flex-col items-center justify-center",
        className
      )}
      {...props}
    >
      <IconSlot icon={icon} />
      <span className="cn-app-shell-bottom-nav-label truncate">{label}</span>
      <Slot.Slottable>{children}</Slot.Slottable>
    </Comp>
  )
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
  const open = shell.floating[id]
    ? (shell.floatingOpen[id] ?? false)
    : saved.open
  const { updatePanel } = shell
  return React.useMemo(
    () => ({
      open,
      view: saved.view,
      width: saved.width,
      label: config?.label ?? id,
      shortcut: config?.shortcut ?? null,
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
      saved.width,
      config?.label,
      config?.shortcut,
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
  shortcut = null,
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
  /** Toggles the panel ("mod+alt+b"). */
  shortcut?: string | null
}) {
  const shell = useAppShell()
  const elementRef = React.useRef<HTMLElement | null>(null)
  // Primitive dependencies only: `views` is usually an inline array.
  const initialView = defaultView ?? views[0]?.value ?? null
  const defaults = React.useMemo<PanelState>(
    () => ({ open: defaultOpen, view: initialView, width: defaultWidth }),
    [defaultOpen, initialView, defaultWidth]
  )
  const { registerPanel } = shell
  React.useEffect(
    () => registerPanel(id, { label, defaults, shortcut }),
    [registerPanel, id, label, defaults, shortcut]
  )

  const control = useShellPanel(id)
  const panel: PanelState = {
    open: control.open,
    view: control.view ?? defaults.view,
    width: Math.max(minWidth, Math.min(maxWidth, control.width)),
  }

  useShellShortcut(
    { id: `panel.${id}.toggle`, keys: shortcut, label: `Toggle ${label}` },
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
        onValueChange={control.reveal}
        className="cn-app-shell-panel-tabs-root flex min-h-0 flex-1 flex-col"
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
              "cn-app-shell-panel-sheet flex flex-col gap-0 p-0",
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
            className={cn("cn-app-shell-panel-drawer flex flex-col", className)}
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
          "cn-app-shell-panel group/app-shell-panel relative flex shrink-0 flex-col overflow-hidden data-[placement=inline]:w-(--app-shell-panel-width) data-[placement=swap]:absolute data-[placement=swap]:inset-0 data-[placement=swap]:z-30 data-[placement=inline]:data-closed:w-0",
          className
        )}
        style={panelStyle}
        {...props}
      >
        <div
          data-slot="app-shell-panel-inner"
          className="cn-app-shell-panel-inner @container/app-shell-panel flex h-full min-h-0 flex-col in-data-[placement=inline]:w-(--app-shell-panel-width)"
        >
          {content}
        </div>
        {placement === "inline" && panel.open && <AppShellPanelResizeHandle />}
      </aside>
    </PanelContext.Provider>
  )
}

function AppShellPanelResizeHandle() {
  const {
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

  const preview = (width: number) =>
    elementRef.current?.style.setProperty(
      "--app-shell-panel-width",
      `${width}px`
    )

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
      className="cn-app-shell-panel-resize-handle absolute inset-y-0 z-10 touch-none outline-none"
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
        "cn-app-shell-panel-header flex shrink-0 items-center",
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
        "cn-app-shell-panel-title min-w-0 flex-1 truncate",
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
      className={cn("cn-app-shell-panel-tabs min-w-0", className)}
      {...props}
    >
      {views.map((view) => (
        <TabsTrigger
          key={view.value}
          value={view.value}
          aria-label={view.label}
          className="cn-app-shell-panel-tab"
        >
          <IconSlot icon={view.icon} />
          <span className="cn-app-shell-panel-tab-label">{view.label}</span>
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
  const { label, placement, setOpen } = usePanel()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={`Close ${label}`}
      data-slot="app-shell-panel-close"
      onClick={() => setOpen(false)}
      className={cn("cn-app-shell-panel-close", className)}
      {...props}
    >
      {children ??
        (placement === "swap" ? (
          <IconPlaceholder
            lucide="ArrowLeftIcon"
            tabler="IconArrowLeft"
            hugeicons="ArrowLeft01Icon"
            phosphor="ArrowLeftIcon"
            remixicon="RiArrowLeftLine"
          />
        ) : (
          <IconPlaceholder
            lucide="XIcon"
            tabler="IconX"
            hugeicons="Cancel01Icon"
            phosphor="XIcon"
            remixicon="RiCloseLine"
          />
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
        "cn-app-shell-panel-content min-h-0 flex-1 overflow-y-auto",
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
        "cn-app-shell-panel-view min-h-0 flex-1 overflow-y-auto",
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
  // A local provider: Radix tooltips need one, and the app may not have it.
  // The button's own data-state wins over the tooltip trigger's.
  return (
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={panel.label}
            aria-expanded={isPressed}
            aria-controls={panel.domId}
            data-slot="app-shell-panel-trigger"
            data-state={isPressed ? "open" : "closed"}
            onClick={(event) => {
              onClick?.(event)
              if (view) panel.select(view)
              else panel.toggle()
            }}
            className={cn("cn-app-shell-panel-trigger", className)}
            {...props}
          >
            {children ?? (
              <IconPlaceholder
                lucide="PanelRightIcon"
                tabler="IconLayoutSidebarRight"
                hugeicons="LayoutRightIcon"
                phosphor="SidebarSimpleIcon"
                remixicon="RiLayoutRightLine"
              />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {panel.open ? "Hide" : "Show"} {panel.label.toLowerCase()}
          {panel.shortcut && (
            <ShortcutKbd shortcut={{ keys: panel.shortcut }} />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
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
