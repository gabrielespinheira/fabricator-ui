export type NavMatch = {
  /** Only the item's own path matches, not the paths below it. */
  exact?: boolean
  /** More paths this item owns (an Invoices page under Billing). */
  prefixes?: readonly string[]
}

export type NavAction<TIcon = unknown> = {
  id: string
  label: string
  icon?: TIcon
  /** Shown beside the label, in the shortcut format ("mod+shift+d"). */
  shortcut?: string
  destructive?: boolean
  separatorBefore?: boolean
  onSelect: () => void
}

export type NavItem<TIcon = unknown> = {
  id: string
  label: string
  href?: string
  /** A component (`icon={HomeIcon}`), on web and native alike. */
  icon?: TIcon
  match?: NavMatch
  badge?: number | string
  status?: "active" | "unread" | "idle"
  disabled?: boolean
  /** Open children by default. Items holding the active page always open. */
  defaultOpen?: boolean
  children?: NavItem<TIcon>[]
  actions?: NavAction<TIcon>[]
  /** Where the item goes on phones: a bottom tab, a menu row, or nowhere. */
  mobile?: "tab" | "menu" | "hidden"
}

export type NavGroup<TIcon = unknown> = {
  id: string
  label?: string
  items: NavItem<TIcon>[]
  /** The label becomes a toggle that collapses the group. */
  collapsible?: boolean
  defaultOpen?: boolean
  /** Items can be dragged within the group and into other reorderable groups. */
  reorderable?: boolean
  actions?: NavAction<TIcon>[]
}

/** What a person changed about the navigation. Serializable. */
export type NavPreferences = {
  /**
   * Group id → its item ids, and item id → its children's ids, in order.
   * Top-level items can move between groups; children stay with their
   * parent. Ids are unique across groups and items.
   */
  order: Record<string, string[]>
  hidden: string[]
  pinned: string[]
  /** Group or item id → open. Missing ids use their default. */
  open: Record<string, boolean>
}

export const EMPTY_NAV_PREFERENCES: NavPreferences = {
  order: {},
  hidden: [],
  pinned: [],
  open: {},
}

/** Drops the query, the hash and a trailing slash. */
export function normalizePath(path: string) {
  const [withoutHash = ""] = path.split("#")
  const [withoutQuery = ""] = withoutHash.split("?")
  if (withoutQuery.length > 1 && withoutQuery.endsWith("/")) {
    return withoutQuery.slice(0, -1)
  }
  return withoutQuery || "/"
}

function isSegmentPrefix(prefix: string, pathname: string) {
  const normalized = normalizePath(prefix)
  if (pathname === normalized) return true
  if (normalized === "/") return false
  return pathname.startsWith(`${normalized}/`)
}

/** The length of the path this item matched, or 0. */
function getMatchLength(item: NavItem<unknown>, pathname: string) {
  let length = 0
  if (item.href) {
    const href = normalizePath(item.href)
    const isMatch = item.match?.exact
      ? pathname === href
      : isSegmentPrefix(href, pathname)
    if (isMatch) length = href.length
  }
  for (const prefix of item.match?.prefixes ?? []) {
    if (isSegmentPrefix(prefix, pathname)) {
      length = Math.max(length, normalizePath(prefix).length)
    }
  }
  return length
}

function flattenItems<TIcon>(items: NavItem<TIcon>[]): NavItem<TIcon>[] {
  return items.flatMap((item) => [item, ...flattenItems(item.children ?? [])])
}

/** The id of the item that owns the path. The longest match wins. */
export function getActiveNavItem<TIcon>(
  groups: NavGroup<TIcon>[],
  pathname: string
) {
  const path = normalizePath(pathname)
  let best: { id: string; length: number } | null = null
  for (const item of flattenItems(groups.flatMap((group) => group.items))) {
    const length = getMatchLength(item, path)
    if (length > 0 && (!best || length > best.length)) {
      best = { id: item.id, length }
    }
  }
  return best?.id ?? null
}

/** Whether the item or one of its descendants has the id. */
export function containsNavItem<TIcon>(
  item: NavItem<TIcon>,
  id: string | null
) {
  if (!id) return false
  return flattenItems([item]).some((entry) => entry.id === id)
}

function hideItems<TIcon>(
  items: NavItem<TIcon>[],
  hidden: Set<string>
): NavItem<TIcon>[] {
  return items
    .filter((item) => !hidden.has(item.id))
    .map((item) =>
      item.children
        ? { ...item, children: hideItems(item.children, hidden) }
        : item
    )
}

/** Children in their saved order (unknown ids dropped, new ones last), at every depth. */
function orderChildren<TIcon>(
  items: NavItem<TIcon>[],
  order: Record<string, string[]>
): NavItem<TIcon>[] {
  return items.map((item) => {
    if (!item.children) return item
    const byId = new Map(item.children.map((child) => [child.id, child]))
    const ordered = unique(order[item.id] ?? []).flatMap((id) => {
      const child = byId.get(id)
      return child ? [child] : []
    })
    const placed = new Set(ordered.map((child) => child.id))
    const rest = item.children.filter((child) => !placed.has(child.id))
    return { ...item, children: orderChildren([...ordered, ...rest], order) }
  })
}

function findParentItem<TIcon>(
  items: NavItem<TIcon>[],
  id: string
): NavItem<TIcon> | null {
  for (const item of items) {
    if (item.children?.some((child) => child.id === id)) return item
    const found = findParentItem(item.children ?? [], id)
    if (found) return found
  }
  return null
}

/** The item with the id, at any depth. */
export function findNavItem<TIcon>(groups: NavGroup<TIcon>[], id: string) {
  return (
    flattenItems(groups.flatMap((group) => group.items)).find(
      (item) => item.id === id
    ) ?? null
  )
}

/** The items a phone shows as bottom tabs (`mobile: "tab"`), at any depth. */
export function getMobileTabItems<TIcon>(groups: NavGroup<TIcon>[]) {
  return flattenItems(groups.flatMap((group) => group.items)).filter(
    (item) => item.mobile === "tab"
  )
}

/** What a row says on the rail: its label, and the badge there's no room for. */
export function getNavRailLabel<TIcon>({
  label,
  badge,
}: Pick<NavItem<TIcon>, "label" | "badge">) {
  return badge === undefined ? label : `${label} · ${badge}`
}

/** The item and its ancestors, outermost first (empty when it isn't there). */
export function getNavPath<TIcon>(
  groups: NavGroup<TIcon>[],
  id: string
): NavItem<TIcon>[] {
  const walk = (items: NavItem<TIcon>[]): NavItem<TIcon>[] => {
    for (const item of items) {
      if (item.id === id) return [item]
      const below = walk(item.children ?? [])
      if (below.length > 0) return [item, ...below]
    }
    return []
  }
  return walk(groups.flatMap((group) => group.items))
}

/** The rows a group or an item holds (an item without children holds none). */
export function getNavList<TIcon>(
  groups: NavGroup<TIcon>[],
  parentId: string
): NavItem<TIcon>[] | null {
  const group = groups.find((entry) => entry.id === parentId)
  if (group) return group.items
  const item = findNavItem(groups, parentId)
  return item ? (item.children ?? []) : null
}

/** The groups with the saved order applied and hidden items left out. */
export function applyNavPreferences<TIcon>(
  groups: NavGroup<TIcon>[],
  preferences: NavPreferences
): NavGroup<TIcon>[] {
  const pool = new Map(
    groups.flatMap((group) => group.items.map((item) => [item.id, item]))
  )
  const claimed = new Set(
    groups.flatMap((group) =>
      (preferences.order[group.id] ?? []).filter((id) => pool.has(id))
    )
  )
  const placed = new Set<string>()
  const hidden = new Set(preferences.hidden)

  return groups.map((group) => {
    const ordered = (preferences.order[group.id] ?? []).flatMap((id) => {
      const item = pool.get(id)
      if (!item || placed.has(id)) return []
      placed.add(id)
      return [item]
    })
    const rest = group.items.filter(
      (item) => !claimed.has(item.id) && !placed.has(item.id)
    )
    for (const item of rest) placed.add(item.id)
    return {
      ...group,
      items: hideItems(
        orderChildren([...ordered, ...rest], preferences.order),
        hidden
      ),
    }
  })
}

/** Pinned items, in the order they were pinned. */
export function getPinnedNavItems<TIcon>(
  groups: NavGroup<TIcon>[],
  preferences: NavPreferences
) {
  const items = new Map(
    flattenItems(groups.flatMap((group) => group.items)).map((item) => [
      item.id,
      item,
    ])
  )
  return preferences.pinned.flatMap((id) => {
    const item = items.get(id)
    return item ? [item] : []
  })
}

export type NavMove = {
  id: string
  /** The group a top-level item lands in, or the item a child belongs to. */
  toParentId: string
  toIndex: number
}

function insertAt(ids: string[], id: string, index: number) {
  const at = Math.max(0, Math.min(index, ids.length))
  return [...ids.slice(0, at), id, ...ids.slice(at)]
}

/**
 * Moves an item to a position in a list: a top-level item within its group
 * or into another, a child within its parent. Anything else is ignored. The
 * index counts the rows on show; hidden rows keep their place among them.
 */
export function moveNavItem<TIcon>(
  preferences: NavPreferences,
  groups: NavGroup<TIcon>[],
  { id, toParentId, toIndex }: NavMove
): NavPreferences {
  const applied = applyNavPreferences(groups, {
    ...preferences,
    hidden: [],
  })
  const hidden = new Set(preferences.hidden)
  const place = (ids: string[]) => {
    const onShow = ids.filter((other) => !hidden.has(other))
    const next = onShow[toIndex]
    const last = onShow.at(-1)
    if (next !== undefined) return insertAt(ids, id, ids.indexOf(next))
    return insertAt(ids, id, last === undefined ? 0 : ids.indexOf(last) + 1)
  }
  const from = applied.find((group) =>
    group.items.some((item) => item.id === id)
  )
  if (!from) {
    const parent = findParentItem(
      applied.flatMap((group) => group.items),
      id
    )
    if (!parent || parent.id !== toParentId) return preferences
    const siblings = (parent.children ?? [])
      .map((child) => child.id)
      .filter((childId) => childId !== id)
    return {
      ...preferences,
      order: {
        ...preferences.order,
        [parent.id]: place(siblings),
      },
    }
  }
  const to = applied.find((group) => group.id === toParentId)
  if (!to) return preferences

  const fromIds = from.items
    .map((item) => item.id)
    .filter((itemId) => itemId !== id)
  const toIds = from === to ? fromIds : to.items.map((item) => item.id)
  const nextToIds = place(toIds)

  return {
    ...preferences,
    order: {
      ...preferences.order,
      [from.id]: from === to ? nextToIds : fromIds,
      [to.id]: nextToIds,
    },
  }
}

function setMember(list: string[], id: string, isMember: boolean) {
  const without = list.filter((entry) => entry !== id)
  return isMember ? [...without, id] : without
}

/** Every row in its saved order, hidden ones too: what Customize lists. */
export function getCustomizableNavGroups<TIcon>(
  groups: NavGroup<TIcon>[],
  preferences: NavPreferences
) {
  return applyNavPreferences(groups, { ...preferences, hidden: [] })
}

/** Moves a row within that list, where the index counts hidden rows too. */
export function moveCustomizableNavItem<TIcon>(
  preferences: NavPreferences,
  groups: NavGroup<TIcon>[],
  move: NavMove
): NavPreferences {
  return {
    ...moveNavItem({ ...preferences, hidden: [] }, groups, move),
    hidden: preferences.hidden,
  }
}

export function setNavItemHidden(
  preferences: NavPreferences,
  id: string,
  hidden: boolean
): NavPreferences {
  return { ...preferences, hidden: setMember(preferences.hidden, id, hidden) }
}

export function setNavItemPinned(
  preferences: NavPreferences,
  id: string,
  pinned: boolean
): NavPreferences {
  return { ...preferences, pinned: setMember(preferences.pinned, id, pinned) }
}

export function setNavOpen(
  preferences: NavPreferences,
  id: string,
  open: boolean
): NavPreferences {
  return { ...preferences, open: { ...preferences.open, [id]: open } }
}

// MARK: Lenient restore helpers

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string")
}

function unique(list: string[]) {
  return Array.from(new Set(list))
}

/** Reads saved preferences, dropping anything malformed. */
export function parseNavPreferences(value: unknown): NavPreferences {
  if (!isRecord(value)) return EMPTY_NAV_PREFERENCES
  const order = isRecord(value.order)
    ? Object.fromEntries(
        Object.entries(value.order).flatMap(([groupId, ids]) =>
          Array.isArray(ids) ? [[groupId, unique(toStringList(ids))]] : []
        )
      )
    : {}
  const open = isRecord(value.open)
    ? Object.fromEntries(
        Object.entries(value.open).filter(
          (entry): entry is [string, boolean] => typeof entry[1] === "boolean"
        )
      )
    : {}
  return {
    order,
    hidden: unique(toStringList(value.hidden)),
    pinned: unique(toStringList(value.pinned)),
    open,
  }
}

// MARK: Tabs

export type TabStripState = {
  /** Visual order, pinned tabs first. */
  tabs: string[]
  pinned: string[]
  /** Most recent first. The first one still open is the active tab. */
  recent: string[]
  /** An italic tab the next preview replaces. */
  preview: string | null
  /** Closed tabs to reopen, newest first. */
  closed: string[]
}

export const EMPTY_TAB_STRIP_STATE: TabStripState = {
  tabs: [],
  pinned: [],
  recent: [],
  preview: null,
  closed: [],
}

export const MAX_CLOSED_TABS = 20

export function getActiveTab(state: TabStripState) {
  return (
    state.recent.find((id) => state.tabs.includes(id)) ?? state.tabs[0] ?? null
  )
}

/** Puts the pinned tabs first, keeping each run's order. */
function withPinnedFirst(state: TabStripState): TabStripState {
  const pinned = state.tabs.filter((id) => state.pinned.includes(id))
  return {
    ...state,
    pinned,
    tabs: [...pinned, ...state.tabs.filter((id) => !pinned.includes(id))],
  }
}

export function activateTab(state: TabStripState, id: string): TabStripState {
  if (!state.tabs.includes(id)) return state
  return {
    ...state,
    recent: [id, ...state.recent.filter((entry) => entry !== id)],
  }
}

export type OpenTabOptions = {
  /** Open as a preview tab, replacing the current preview in place. */
  preview?: boolean
  /** Insert right after this tab instead of at the end. */
  after?: string
  /** Don't activate it. */
  background?: boolean
  /**
   * Open in this tab's place, as a page opens over a browser's new tab. The
   * replaced tab isn't kept for reopening. A tab that is already open is shown
   * where it is, and this one stays.
   */
  replace?: string
}

export function openTab(
  state: TabStripState,
  id: string,
  { preview = false, after, background = false, replace }: OpenTabOptions = {}
): TabStripState {
  const activate = (next: TabStripState) =>
    background ? next : activateTab(next, id)

  if (state.tabs.includes(id)) {
    const promoted =
      state.preview === id && !preview ? { ...state, preview: null } : state
    return activate(promoted)
  }

  const closed = state.closed.filter((entry) => entry !== id)
  const previewTab =
    preview && state.preview && state.tabs.includes(state.preview)
      ? state.preview
      : null
  const replaced =
    replace && state.tabs.includes(replace) ? replace : previewTab

  let tabs: string[]
  if (replaced) {
    tabs = state.tabs.map((entry) => (entry === replaced ? id : entry))
  } else {
    const afterIndex = after ? state.tabs.indexOf(after) : -1
    const index =
      afterIndex === -1
        ? state.tabs.length
        : Math.max(afterIndex + 1, state.pinned.length)
    tabs = [...state.tabs.slice(0, index), id, ...state.tabs.slice(index)]
  }

  return activate({
    ...state,
    tabs,
    pinned: state.pinned.map((entry) => (entry === replaced ? id : entry)),
    recent: replaced
      ? state.recent.filter((entry) => entry !== replaced)
      : state.recent,
    preview: preview ? id : state.preview === replaced ? null : state.preview,
    closed,
  })
}

export function closeTabs(state: TabStripState, ids: string[]): TabStripState {
  const closing = state.tabs.filter((id) => ids.includes(id))
  if (closing.length === 0) return state

  const active = getActiveTab(state)
  const activeIndex = active ? state.tabs.indexOf(active) : -1
  const tabs = state.tabs.filter((id) => !closing.includes(id))
  const recent = state.recent.filter((id) => !closing.includes(id))

  const next: TabStripState = {
    tabs,
    pinned: state.pinned.filter((id) => !closing.includes(id)),
    recent,
    preview:
      state.preview && closing.includes(state.preview) ? null : state.preview,
    closed: [...[...closing].reverse(), ...state.closed].slice(
      0,
      MAX_CLOSED_TABS
    ),
  }

  const hasRecent = recent.some((id) => tabs.includes(id))
  if (!hasRecent && tabs.length > 0 && activeIndex !== -1) {
    const neighbour = tabs[Math.min(activeIndex, tabs.length - 1)]
    return neighbour ? activateTab(next, neighbour) : next
  }
  return next
}

/** Closes every unpinned tab except this one. */
export function closeOtherTabs(state: TabStripState, id: string) {
  return closeTabs(
    state,
    state.tabs.filter((entry) => entry !== id && !state.pinned.includes(entry))
  )
}

/** Closes the unpinned tabs after this one. */
export function closeTabsToRight(state: TabStripState, id: string) {
  const index = state.tabs.indexOf(id)
  if (index === -1) return state
  return closeTabs(
    state,
    state.tabs.slice(index + 1).filter((entry) => !state.pinned.includes(entry))
  )
}

export function reopenClosedTab(state: TabStripState): TabStripState {
  const [id] = state.closed
  if (!id) return state
  return openTab({ ...state, closed: state.closed.slice(1) }, id)
}

/**
 * Moves a tab to its final index. Landing inside the pinned run pins it,
 * landing past the slot after it unpins it; that slot keeps either kind.
 */
export function moveTab(
  state: TabStripState,
  id: string,
  toIndex: number
): TabStripState {
  if (!state.tabs.includes(id)) return state
  const rest = state.tabs.filter((entry) => entry !== id)
  const pinnedCount = state.pinned.filter((entry) => entry !== id).length
  const index = Math.max(0, Math.min(toIndex, rest.length))
  const wasPinned = state.pinned.includes(id)
  const isPinned = index < pinnedCount || (index === pinnedCount && wasPinned)

  const tabs = [...rest.slice(0, index), id, ...rest.slice(index)]
  const pinned = tabs.filter((entry) =>
    entry === id ? isPinned : state.pinned.includes(entry)
  )
  return withPinnedFirst({
    ...state,
    tabs,
    pinned,
    preview: isPinned && state.preview === id ? null : state.preview,
  })
}

/** Pins to the end of the pinned run, or unpins to the start of the rest. */
export function togglePinnedTab(state: TabStripState, id: string) {
  if (!state.tabs.includes(id)) return state
  const pinnedCount = state.pinned.length
  return state.pinned.includes(id)
    ? moveTab(
        { ...state, pinned: state.pinned.filter((entry) => entry !== id) },
        id,
        pinnedCount - 1
      )
    : moveTab(
        {
          ...state,
          pinned: [...state.pinned, id],
          preview: state.preview === id ? null : state.preview,
        },
        id,
        pinnedCount
      )
}

/** The tab before or after the active one, wrapping around. */
export function getNeighbourTab(state: TabStripState, direction: 1 | -1) {
  const active = getActiveTab(state)
  if (!active) return null
  const index = state.tabs.indexOf(active)
  const length = state.tabs.length
  return state.tabs[(index + direction + length) % length] ?? null
}

/** The tab at a 1-based position; 9 is always the last tab, as in browsers. */
export function getTabAtPosition(state: TabStripState, position: number) {
  if (position === 9) return state.tabs.at(-1) ?? null
  return state.tabs[position - 1] ?? null
}

/** Reads a saved strip, dropping anything malformed. */
export function parseTabStripState(value: unknown): TabStripState {
  if (!isRecord(value)) return EMPTY_TAB_STRIP_STATE
  const tabs = unique(toStringList(value.tabs))
  const isOpen = (id: string) => tabs.includes(id)
  return withPinnedFirst({
    tabs,
    pinned: unique(toStringList(value.pinned)).filter(isOpen),
    recent: unique(toStringList(value.recent)).filter(isOpen),
    preview:
      typeof value.preview === "string" && isOpen(value.preview)
        ? value.preview
        : null,
    closed: unique(toStringList(value.closed)).slice(0, MAX_CLOSED_TABS),
  })
}

// MARK: Layout

export type ShellSize = "phone" | "tablet" | "desktop"

export type ShellBreakpoints = { tablet: number; desktop: number }

export const SHELL_BREAKPOINTS: ShellBreakpoints = {
  tablet: 768,
  desktop: 1024,
}

/** The shell's size class, from its own width (not the viewport's). */
export function getShellSize(
  width: number,
  breakpoints: ShellBreakpoints = SHELL_BREAKPOINTS
): ShellSize {
  if (width < breakpoints.tablet) return "phone"
  if (width < breakpoints.desktop) return "tablet"
  return "desktop"
}

// macOS draws the traffic lights in a 52 by 14px box whose top start corner
// is the window's trafficLightPosition.
const TRAFFIC_LIGHTS_WIDTH = 52
const TRAFFIC_LIGHTS_HEIGHT = 14
const TRAFFIC_LIGHTS_GAP = 20
// What a rail of icons keeps past the lights, for the toggle after them to sit
// inside the main card by the header's inset.
const TRAFFIC_LIGHTS_RAIL_END = 8

/**
 * Windows and Linux draw their window buttons over the page, so a window there
 * gets a row of its own for them, as native apps have. Fullscreen hides them.
 */
export function hasWindowTitlebar(
  window: { controls: string; isFullscreen?: boolean } | undefined
) {
  return window?.controls === "overlay" && !window.isFullscreen
}

/**
 * Where the shell's chrome goes around the traffic lights: content starts
 * `insetStart` px from the window's edge, and the top band is `bandHeight`
 * px tall, so a row filling it centres on the lights. A rail of icons is
 * `railWidth` px wide, so the lights stay on it.
 */
export function getTrafficLightsGeometry(position: { x: number; y: number }) {
  return {
    insetStart: position.x + TRAFFIC_LIGHTS_WIDTH + TRAFFIC_LIGHTS_GAP,
    bandHeight: position.y * 2 + TRAFFIC_LIGHTS_HEIGHT,
    railWidth: position.x + TRAFFIC_LIGHTS_WIDTH + TRAFFIC_LIGHTS_RAIL_END,
  }
}

/**
 * The widths of the page's column in AppShellContent, in px: forms and settings,
 * most pages, and dense ones. The style map has them in rem.
 */
export const APP_SHELL_CONTENT_WIDTHS = { sm: 672, md: 896, lg: 1152 } as const

export type AppShellContentSize = keyof typeof APP_SHELL_CONTENT_WIDTHS

export type PanelPlacement = "inline" | "overlay" | "drawer" | "swap"

/** Phones: a bottom drawer, the whole screen (`swap`), or not shown. */
export type PanelMobile = "drawer" | "swap" | "none"

export const MIN_MAIN_WIDTH = 520

export function getPanelPlacement({
  shellWidth,
  occupiedWidth,
  panelWidth,
  minMainWidth = MIN_MAIN_WIDTH,
  mobile = "drawer",
  breakpoints = SHELL_BREAKPOINTS,
}: {
  shellWidth: number
  /** Width already taken beside the main column (sidebar, other panels). */
  occupiedWidth: number
  panelWidth: number
  minMainWidth?: number
  mobile?: PanelMobile
  breakpoints?: ShellBreakpoints
}): PanelPlacement | null {
  if (getShellSize(shellWidth, breakpoints) === "phone") {
    return mobile === "none" ? null : mobile
  }
  return shellWidth - occupiedWidth - panelWidth >= minMainWidth
    ? "inline"
    : "overlay"
}

// MARK: Panels

/** A right panel toggles with ⌘\\ unless it asks otherwise. */
export function getDefaultPanelShortcut(side: "left" | "right") {
  return side === "right" ? "mod+\\" : null
}

/**
 * Where a panel's toggle sits. A docked right panel's toggle keeps its spot on
 * screen: it rests at the end of the main header, and moves by exactly what
 * the main column gives up as the panel opens. Anything else stays put.
 */
export function getPanelTriggerAnchor({
  hasView,
  side,
  isFloating,
  open,
  width,
}: {
  /** The trigger selects one of the views, so several can exist. */
  hasView: boolean
  /** null until the panel has registered. */
  side: "left" | "right" | null
  isFloating: boolean
  open: boolean
  width: number
}) {
  const isPinned = !hasView && side === "right" && !isFloating
  return { isPinned, shift: isPinned && open ? width : 0 }
}

export type PanelState = { open: boolean; view: string | null; width: number }

/** Shows a view; selecting the view already showing closes the panel. */
export function selectPanelView(panel: PanelState, view: string): PanelState {
  if (panel.open && panel.view === view) return { ...panel, open: false }
  return { ...panel, open: true, view }
}

/** Shows a view, opening the panel if needed. Never closes it. */
export function revealPanelView(panel: PanelState, view: string): PanelState {
  return { ...panel, open: true, view }
}

export type ShellLayoutState = {
  sidebarWidth?: string
  panels: Record<string, PanelState>
}

function parsePanelState(value: unknown): PanelState | null {
  if (!isRecord(value)) return null
  if (typeof value.open !== "boolean" || typeof value.width !== "number") {
    return null
  }
  return {
    open: value.open,
    view: typeof value.view === "string" ? value.view : null,
    width: value.width,
  }
}

/** Reads a saved layout (a cookie on the server, storage on the client). */
export function parseShellLayout(value: unknown): ShellLayoutState {
  if (!isRecord(value)) return { panels: {} }
  const panels = isRecord(value.panels)
    ? Object.fromEntries(
        Object.entries(value.panels).flatMap(([id, panel]) => {
          const parsed = parsePanelState(panel)
          return parsed ? [[id, parsed]] : []
        })
      )
    : {}
  return typeof value.sidebarWidth === "string"
    ? { sidebarWidth: value.sidebarWidth, panels }
    : { panels }
}

/**
 * Reads the layout cookie a server received, so the first render already
 * has the saved panels and sidebar width (no flash).
 */
export function readShellLayoutCookie(value: string | undefined) {
  if (!value) return parseShellLayout(null)
  try {
    return parseShellLayout(JSON.parse(decodeURIComponent(value)))
  } catch {
    return parseShellLayout(null)
  }
}

// MARK: Storage

/** Where the shell keeps its layout. Web ships cookie and localStorage adapters. */
export type ShellStorage = {
  get(key: string): string | null
  set(key: string, value: string): void
}

/** One namespace for everything a shell persists (cookie-safe characters). */
export function getShellStorageKey(storageKey: string, part: string) {
  return `app-shell.${storageKey}.${part}`
}

/** Parses stored JSON; anything unreadable is null. */
export function readStoredJson(storage: ShellStorage, key: string): unknown {
  const raw = storage.get(key)
  if (raw === null) return null
  try {
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

// MARK: Shortcuts

export type Shortcut = {
  code: string
  /** ⌘ on Apple platforms, Ctrl elsewhere. */
  mod: boolean
  ctrl: boolean
  alt: boolean
  shift: boolean
  meta: boolean
}

export type ShortcutPlatform = "apple" | "other"

/** The parts of a keyboard event a shortcut reads (DOM or native). */
export type ShortcutEvent = {
  code: string
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  shiftKey: boolean
}

const KEY_CODES: Record<string, string> = {
  "[": "BracketLeft",
  "]": "BracketRight",
  "\\": "Backslash",
  "/": "Slash",
  ",": "Comma",
  ".": "Period",
  ";": "Semicolon",
  "'": "Quote",
  "`": "Backquote",
  "-": "Minus",
  "=": "Equal",
  tab: "Tab",
  enter: "Enter",
  escape: "Escape",
  esc: "Escape",
  space: "Space",
  backspace: "Backspace",
  delete: "Delete",
  home: "Home",
  end: "End",
  pageup: "PageUp",
  pagedown: "PageDown",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  arrowup: "ArrowUp",
  arrowdown: "ArrowDown",
  arrowleft: "ArrowLeft",
  arrowright: "ArrowRight",
}

// The one-character keys above are the symbols, which layouts move around.
const SYMBOLS_BY_CODE: Record<string, string> = Object.fromEntries(
  Object.entries(KEY_CODES)
    .filter(([key]) => key.length === 1)
    .map(([key, code]) => [code, key])
)

function toCode(key: string) {
  const lower = key.toLowerCase()
  if (KEY_CODES[lower]) return KEY_CODES[lower]
  if (/^[a-z]$/.test(lower)) return `Key${lower.toUpperCase()}`
  if (/^[0-9]$/.test(lower)) return `Digit${lower}`
  if (/^f([1-9]|1[0-9]|2[0-4])$/.test(lower)) return lower.toUpperCase()
  return key
}

/** "mod+shift+t" → the code and modifiers it means. */
export function parseShortcut(value: string): Shortcut {
  // A trailing "+" is the plus key itself ("mod++").
  const parts = value.endsWith("++")
    ? [...value.slice(0, -2).split("+"), "+"]
    : value.split("+")
  const key = parts.pop() ?? ""
  const modifiers = new Set(parts.map((part) => part.toLowerCase()))
  return {
    code: key === "+" ? "Equal" : toCode(key),
    mod: modifiers.has("mod"),
    ctrl: modifiers.has("ctrl") || modifiers.has("control"),
    alt: modifiers.has("alt") || modifiers.has("option"),
    shift: modifiers.has("shift"),
    meta: modifiers.has("meta") || modifiers.has("cmd"),
  }
}

/**
 * Letters and named keys match by physical position, which survives layouts. A
 * symbol matches by what it types, because layouts move it (\\ is elsewhere on
 * Portuguese and Brazilian keyboards), unless Option or Shift changes what the
 * key types: those chords keep the position.
 */
function matchesShortcutKey(event: ShortcutEvent, code: string) {
  const symbol = SYMBOLS_BY_CODE[code]
  const typesItsSymbol =
    !event.altKey && !event.shiftKey && event.key.length === 1
  return symbol !== undefined && typesItsSymbol
    ? event.key === symbol
    : event.code === code
}

/** A chord types nothing, so it can work while focus is in a text field. */
export function isChordShortcut(value: string) {
  const { mod, ctrl, alt, meta } = parseShortcut(value)
  return mod || ctrl || alt || meta
}

export function matchesShortcut(
  event: ShortcutEvent,
  shortcut: Shortcut,
  platform: ShortcutPlatform
) {
  const meta = shortcut.meta || (shortcut.mod && platform === "apple")
  const ctrl = shortcut.ctrl || (shortcut.mod && platform === "other")
  return (
    matchesShortcutKey(event, shortcut.code) &&
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.altKey === shortcut.alt &&
    event.shiftKey === shortcut.shift
  )
}

const CODE_LABELS: Record<string, string> = {
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Slash: "/",
  Comma: ",",
  Period: ".",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Space: "Space",
}

function getCodeLabel(code: string) {
  if (CODE_LABELS[code]) return CODE_LABELS[code]
  if (code.startsWith("Key")) return code.slice(3)
  if (code.startsWith("Digit")) return code.slice(5)
  return code
}

/** "⇧⌘T" on Apple platforms, "Ctrl+Shift+T" elsewhere. */
export function formatShortcut(shortcut: Shortcut, platform: ShortcutPlatform) {
  const key = getCodeLabel(shortcut.code)
  if (platform === "apple") {
    return [
      shortcut.ctrl ? "⌃" : "",
      shortcut.alt ? "⌥" : "",
      shortcut.shift ? "⇧" : "",
      shortcut.meta || shortcut.mod ? "⌘" : "",
      key,
    ].join("")
  }
  return [
    shortcut.ctrl || shortcut.mod ? "Ctrl" : null,
    shortcut.meta ? "Win" : null,
    shortcut.alt ? "Alt" : null,
    shortcut.shift ? "Shift" : null,
    key,
  ]
    .filter((part) => part !== null)
    .join("+")
}

// MARK: Resize

export function getResizedSize({
  startSize,
  delta,
  min,
  max,
  collapseSlop,
}: {
  startSize: number
  /** Pointer travel towards growing (already flipped for the handle's side). */
  delta: number
  min: number
  max: number
  /** Dragging this far past the minimum collapses instead of stopping. */
  collapseSlop?: number
}) {
  const raw = startSize + delta
  if (collapseSlop !== undefined && raw < min - collapseSlop) {
    return { size: min, isCollapsed: true }
  }
  return {
    size: Math.round(Math.max(min, Math.min(max, raw))),
    isCollapsed: false,
  }
}

/** One keyboard step, within the limits. */
export function stepSize(size: number, step: number, min: number, max: number) {
  return Math.max(min, Math.min(max, size + step))
}

// MARK: Breadcrumbs

export type BreadcrumbEntry = { label: string; href?: string }

function toLabel(segment: string) {
  const words = decodeURIComponent(segment).replace(/[-_]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/** Crumbs for each path segment, a fallback for pages that pass none. */
export function getBreadcrumbsFromPath(
  pathname: string,
  {
    labels = {},
    rootLabel,
    skip = 0,
  }: {
    /** A label per segment or per full path. */
    labels?: Record<string, string>
    /** A first crumb for the root (after skipped segments). */
    rootLabel?: string
    /** Leading segments to leave out, like an organization slug. */
    skip?: number
  } = {}
): BreadcrumbEntry[] {
  const segments = normalizePath(pathname).split("/").filter(Boolean)
  const base = `/${segments.slice(0, skip).join("/")}`
  const crumbs: BreadcrumbEntry[] = rootLabel
    ? [{ label: rootLabel, href: base }]
    : []
  let href = base === "/" ? "" : base
  for (const segment of segments.slice(skip)) {
    href = `${href}/${segment}`
    crumbs.push({
      label: labels[href] ?? labels[segment] ?? toLabel(segment),
      href,
    })
  }
  return crumbs
}

/** Splits crumbs into what shows and what folds into a menu. */
export function foldBreadcrumbs<T>(items: T[], maxItems = 4) {
  if (items.length <= maxItems) {
    return { leading: items, folded: [] as T[], trailing: [] as T[] }
  }
  const trailingCount = Math.max(1, maxItems - 2)
  return {
    leading: items.slice(0, 1),
    folded: items.slice(1, items.length - trailingCount),
    trailing: items.slice(items.length - trailingCount),
  }
}

// MARK: Reorder announcements

/** What a live region says after a keyboard or menu move. */
export function describeMove(label: string, index: number, total: number) {
  return `${label} moved to position ${index + 1} of ${total}.`
}
