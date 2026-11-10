"use client"

// App Nav: renders a navigation model into the Sidebar. The model (groups
// of items with icons, badges, statuses, children and actions) is plain data
// from lib/app-shell-model, so a React Native shell can render the same one.
//
// - The active item comes from the pathname: the longest match wins. Its
//   top-level row is raised; a nested page sits on a quieter wash.
// - Items nest to any depth. A row with children swaps its icon for a
//   chevron on hover; → and ← open and close it, and ← goes to the parent.
//   Groups and rows remember being opened.
// - Each row's actions show in a hover menu and on right-click, described
//   once.
// - Rows in reorderable groups drag to a new place in their list (children
//   among their siblings); ⌥⇧↑ / ⌥⇧↓ do the same from the keyboard, and the
//   row menu's Move to sends a top-level row to another reorderable group.
// - With `customizable`, people can pin items to the top and hide them;
//   AppNavCustomize lists everything to show or hide again, and to reorder.
// - Everything a person changes is one serializable value (preferences).
import * as React from "react"
import { cn } from "cn"

import {
  applyNavPreferences,
  containsNavItem,
  describeMove,
  EMPTY_NAV_PREFERENCES,
  findNavItem,
  getActiveNavItem,
  getCustomizableNavGroups,
  getMobileTabItems,
  getNavList,
  getNavRailLabel,
  getPinnedNavItems,
  moveCustomizableNavItem,
  moveNavItem,
  setNavItemHidden,
  setNavItemPinned,
  setNavOpen,
  type NavAction,
  type NavGroup,
  type NavItem,
  type NavPreferences,
} from "@/registry/bases/base/lib/app-shell-model"
import {
  SortableProvider,
  useSortableItem,
} from "@/registry/bases/base/lib/sortable"
import {
  AppShellBottomNav,
  AppShellBottomNavItem,
  IconSlot,
  useShortcutLabel,
  type IconLike,
} from "@/registry/bases/base/ui/app-shell"
import { Button } from "@/registry/bases/base/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/registry/bases/base/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/bases/base/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import {
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupActions,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuActions,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
  useSidebarCollapse,
} from "@/registry/bases/base/ui/sidebar"
import { Switch } from "@/registry/bases/base/ui/switch"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

/** A component (`icon={HomeIcon}`) or an element (`icon={<HomeIcon />}`). */
type AppNavIcon = IconLike
type AppNavItem = NavItem<AppNavIcon>
type AppNavGroup = NavGroup<AppNavIcon>
type AppNavAction = NavAction<AppNavIcon>

/** Returns the link element for an item, without children (a router Link). */
type AppNavRenderLink = (item: AppNavItem) => React.ReactElement

const renderAnchor: AppNavRenderLink = (item) => <a href={item.href} />

/** The pinned rows repeat items from their groups; their drag ids differ. */
const PINNED_GROUP = "app-nav-pinned"

// MARK: Menus

/** One description of a row's menu, rendered as a context or dropdown menu. */
type MenuEntry = {
  id: string
  label: string
  icon?: AppNavIcon
  /** A ready-made icon element (the built-in entries' icons). */
  iconElement?: React.ReactNode
  shortcut?: string
  destructive?: boolean
  separatorBefore?: boolean
  disabled?: boolean
  onSelect?: () => void
  children?: MenuEntry[]
}

function EntryShortcut({
  shortcut,
  as: Shortcut,
}: {
  shortcut?: string
  as: typeof ContextMenuShortcut | typeof DropdownMenuShortcut
}) {
  const label = useShortcutLabel({ keys: shortcut ?? null })
  return label ? <Shortcut>{label}</Shortcut> : null
}

function EntryIcon({ entry }: { entry: MenuEntry }) {
  if (entry.icon) return <IconSlot icon={entry.icon} />
  return entry.iconElement ?? null
}

function ContextMenuEntries({ entries }: { entries: MenuEntry[] }) {
  return (
    <ContextMenuGroup>
      {entries.map((entry) => (
        <React.Fragment key={entry.id}>
          {entry.separatorBefore && <ContextMenuSeparator />}
          {entry.children ? (
            <ContextMenuSub>
              <ContextMenuSubTrigger disabled={entry.disabled}>
                <EntryIcon entry={entry} />
                {entry.label}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuEntries entries={entry.children} />
              </ContextMenuSubContent>
            </ContextMenuSub>
          ) : (
            <ContextMenuItem
              variant={entry.destructive ? "destructive" : "default"}
              disabled={entry.disabled}
              onClick={entry.onSelect}
            >
              <EntryIcon entry={entry} />
              {entry.label}
              <EntryShortcut
                shortcut={entry.shortcut}
                as={ContextMenuShortcut}
              />
            </ContextMenuItem>
          )}
        </React.Fragment>
      ))}
    </ContextMenuGroup>
  )
}

function DropdownMenuEntries({ entries }: { entries: MenuEntry[] }) {
  return (
    <DropdownMenuGroup>
      {entries.map((entry) => (
        <React.Fragment key={entry.id}>
          {entry.separatorBefore && <DropdownMenuSeparator />}
          {entry.children ? (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={entry.disabled}>
                <EntryIcon entry={entry} />
                {entry.label}
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuEntries entries={entry.children} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem
              variant={entry.destructive ? "destructive" : "default"}
              disabled={entry.disabled}
              onClick={entry.onSelect}
            >
              <EntryIcon entry={entry} />
              {entry.label}
              <EntryShortcut
                shortcut={entry.shortcut}
                as={DropdownMenuShortcut}
              />
            </DropdownMenuItem>
          )}
        </React.Fragment>
      ))}
    </DropdownMenuGroup>
  )
}

function toEntries(actions: AppNavAction[] = []): MenuEntry[] {
  return actions.map((action) => ({ ...action }))
}

// MARK: AppNav

type AppNavContextValue = {
  groups: AppNavGroup[]
  applied: AppNavGroup[]
  preferences: NavPreferences
  updatePreferences: (next: NavPreferences) => void
  activeId: string | null
  renderLink: AppNavRenderLink
  onNavigate?: (item: AppNavItem) => void
  customizable: boolean
  move: (id: string, toParentId: string, toIndex: number) => void
}

/** Whether a list keeps an icon column: a row has an icon or children. */
function hasIconColumn(items: AppNavItem[]) {
  return items.some(
    (item) => item.icon !== undefined || (item.children?.length ?? 0) > 0
  )
}

const AppNavContext = React.createContext<AppNavContextValue | null>(null)

function useAppNav() {
  const context = React.useContext(AppNavContext)
  if (!context) {
    throw new Error("App Nav parts must be used within an AppNav.")
  }
  return context
}

/** Controlled or uncontrolled preferences, reported on every change. */
function usePreferences(
  preferences: NavPreferences | undefined,
  defaultPreferences: NavPreferences,
  onPreferencesChange: ((next: NavPreferences) => void) | undefined
) {
  const [uncontrolled, setUncontrolled] = React.useState(defaultPreferences)
  const current = preferences ?? uncontrolled
  const update = React.useCallback(
    (next: NavPreferences) => {
      setUncontrolled(next)
      onPreferencesChange?.(next)
    },
    [onPreferencesChange]
  )
  return [current, update] as const
}

function AppNav({
  groups,
  pathname = "",
  activeId: activeIdProp,
  preferences: preferencesProp,
  defaultPreferences = EMPTY_NAV_PREFERENCES,
  onPreferencesChange,
  renderLink = renderAnchor,
  onNavigate,
  customizable = false,
  pinnedLabel = "Pinned",
  "aria-label": ariaLabel = "Main",
  className,
  ...props
}: React.ComponentProps<"nav"> & {
  groups: AppNavGroup[]
  /** The current path; the item that owns it is active. */
  pathname?: string
  /** Sets the active item directly instead. */
  activeId?: string | null
  preferences?: NavPreferences
  defaultPreferences?: NavPreferences
  onPreferencesChange?: (preferences: NavPreferences) => void
  renderLink?: AppNavRenderLink
  /** Called when a link row is clicked; the mobile sheet closes by itself. */
  onNavigate?: (item: AppNavItem) => void
  /** Adds Pin and Hide to every row's menu. */
  customizable?: boolean
  pinnedLabel?: string
}) {
  const [preferences, updatePreferences] = usePreferences(
    preferencesProp,
    defaultPreferences,
    onPreferencesChange
  )
  const [announcement, setAnnouncement] = React.useState("")
  const { isMobile, setOpenMobile } = useSidebar()
  const activeId =
    activeIdProp === undefined
      ? getActiveNavItem(groups, pathname)
      : activeIdProp
  const applied = React.useMemo(
    () => applyNavPreferences(groups, preferences),
    [groups, preferences]
  )
  const pinned = React.useMemo(
    () =>
      getPinnedNavItems(groups, preferences).filter(
        (item) => !preferences.hidden.includes(item.id)
      ),
    [groups, preferences]
  )

  const move = React.useCallback(
    (id: string, toParentId: string, toIndex: number) => {
      updatePreferences(
        moveNavItem(preferences, groups, { id, toParentId, toIndex })
      )
      const list = getNavList(applied, toParentId) ?? []
      const total =
        list.length + (list.some((entry) => entry.id === id) ? 0 : 1)
      const label = findNavItem(applied, id)?.label ?? id
      setAnnouncement(describeMove(label, Math.min(toIndex, total - 1), total))
    },
    [preferences, groups, applied, updatePreferences]
  )

  const hasPinnedIcons = hasIconColumn(pinned)
  const contextValue: AppNavContextValue = {
    groups,
    applied,
    preferences,
    updatePreferences,
    activeId,
    renderLink,
    onNavigate: (item) => {
      onNavigate?.(item)
      if (isMobile) setOpenMobile(false)
    },
    customizable,
    move,
  }

  return (
    <AppNavContext.Provider value={contextValue}>
      <nav
        data-slot="app-nav"
        aria-label={ariaLabel}
        className={cn("cn-app-nav flex min-w-0 flex-col", className)}
        {...props}
      >
        <SortableProvider
          axis="y"
          onMove={(change) => move(change.id, change.toGroup, change.toIndex)}
        >
          {pinned.length > 0 && (
            <SidebarGroup data-slot="app-nav-pinned">
              <SidebarGroupLabel>{pinnedLabel}</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {pinned.map((item, index) => (
                    <AppNavRow
                      key={item.id}
                      item={item}
                      parentId={PINNED_GROUP}
                      index={index}
                      count={pinned.length}
                      depth={0}
                      reorderable={false}
                      hasIconColumn={hasPinnedIcons}
                      idPrefix={`${PINNED_GROUP}:`}
                    />
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
          {applied.map((group) => (
            <AppNavGroupSection key={group.id} group={group} />
          ))}
        </SortableProvider>
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </nav>
    </AppNavContext.Provider>
  )
}

/**
 * Called rather than rendered: SidebarGroup finds its header's actions by
 * element type, to keep them on the label row when the rows collapse.
 */
function renderGroupActions(actions: AppNavAction[]) {
  const withIcons = actions.filter((action) => action.icon)
  const rest = actions.filter((action) => !action.icon)
  return (
    <SidebarGroupActions showOnHover>
      {withIcons.map((action) => (
        <SidebarGroupAction
          key={action.id}
          aria-label={action.label}
          title={action.label}
          onClick={action.onSelect}
        >
          <IconSlot icon={action.icon} />
        </SidebarGroupAction>
      ))}
      {rest.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarGroupAction aria-label="More actions" />}
          >
            <IconPlaceholder
              lucide="EllipsisIcon"
              tabler="IconDots"
              hugeicons="MoreHorizontalCircle01Icon"
              phosphor="DotsThreeIcon"
              remixicon="RiMoreLine"
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuEntries entries={toEntries(rest)} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarGroupActions>
  )
}

function AppNavGroupSection({ group }: { group: AppNavGroup }) {
  const hasIcons = hasIconColumn(group.items)
  const { preferences, updatePreferences } = useAppNav()
  const isOpen = preferences.open[group.id] ?? group.defaultOpen ?? true

  return (
    <SidebarGroup
      data-slot="app-nav-group"
      data-group={group.id}
      collapsible={group.collapsible && Boolean(group.label)}
      open={isOpen}
      onOpenChange={(open) =>
        updatePreferences(setNavOpen(preferences, group.id, open))
      }
    >
      {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
      {group.actions &&
        group.actions.length > 0 &&
        renderGroupActions(group.actions)}
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item, index) => (
            <AppNavRow
              key={item.id}
              item={item}
              parentId={group.id}
              index={index}
              count={group.items.length}
              depth={0}
              reorderable={group.reorderable ?? false}
              hasIconColumn={hasIcons}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** Built-in entries (pin, hide, move) followed by the item's own actions. */
function useRowEntries(
  item: AppNavItem,
  {
    parentId,
    index,
    count,
    reorderable,
    canChangeGroup,
  }: {
    parentId: string
    index: number
    count: number
    reorderable: boolean
    /** Top-level rows can move to another reorderable group. */
    canChangeGroup: boolean
  }
) {
  const { applied, preferences, updatePreferences, customizable, move } =
    useAppNav()
  const entries: MenuEntry[] = []

  if (reorderable) {
    const targets = canChangeGroup
      ? applied.filter((entry) => entry.reorderable && entry.id !== parentId)
      : []
    entries.push(
      {
        id: "move-up",
        label: "Move up",
        iconElement: (
          <IconPlaceholder
            lucide="ArrowUpIcon"
            tabler="IconArrowUp"
            hugeicons="ArrowUpIcon"
            phosphor="ArrowUpIcon"
            remixicon="RiArrowUpLine"
          />
        ),
        disabled: index === 0,
        onSelect: () => move(item.id, parentId, index - 1),
      },
      {
        id: "move-down",
        label: "Move down",
        iconElement: (
          <IconPlaceholder
            lucide="ArrowDownIcon"
            tabler="IconArrowDown"
            hugeicons="ArrowDownIcon"
            phosphor="ArrowDownIcon"
            remixicon="RiArrowDownLine"
          />
        ),
        disabled: index >= count - 1,
        onSelect: () => move(item.id, parentId, index + 1),
      }
    )
    if (targets.length > 0) {
      entries.push({
        id: "move-to",
        label: "Move to",
        iconElement: (
          <IconPlaceholder
            lucide="ArrowRightIcon"
            tabler="IconArrowRight"
            hugeicons="ArrowRight01Icon"
            phosphor="ArrowRightIcon"
            remixicon="RiArrowRightLine"
          />
        ),
        children: targets.map((target) => ({
          id: target.id,
          label: target.label ?? target.id,
          onSelect: () => move(item.id, target.id, target.items.length),
        })),
      })
    }
  }

  if (customizable) {
    const isPinned = preferences.pinned.includes(item.id)
    entries.push(
      {
        id: "pin",
        label: isPinned ? "Unpin" : "Pin to top",
        iconElement: (
          <IconPlaceholder
            lucide="StarIcon"
            tabler="IconStar"
            hugeicons="StarIcon"
            phosphor="StarIcon"
            remixicon="RiStarLine"
          />
        ),
        separatorBefore: entries.length > 0,
        onSelect: () =>
          updatePreferences(setNavItemPinned(preferences, item.id, !isPinned)),
      },
      {
        id: "hide",
        label: "Hide",
        iconElement: (
          <IconPlaceholder
            lucide="EyeOffIcon"
            tabler="IconEyeClosed"
            hugeicons="ViewOffIcon"
            phosphor="EyeSlashIcon"
            remixicon="RiEyeOffLine"
          />
        ),
        onSelect: () =>
          updatePreferences(setNavItemHidden(preferences, item.id, true)),
      }
    )
  }

  const own = toEntries(item.actions)
  if (own[0] && entries.length > 0) own[0].separatorBefore = true
  return [...entries, ...own]
}

function RowChevron() {
  return (
    <IconPlaceholder
      lucide="ChevronRightIcon"
      tabler="IconChevronRight"
      hugeicons="ArrowRight01Icon"
      phosphor="CaretRightIcon"
      remixicon="RiArrowRightSLine"
    />
  )
}

/** ← from a row that is closed or has no children moves to its parent. */
function focusParentRow(row: HTMLElement) {
  row
    .closest('[data-sidebar="menu-sub"]')
    ?.closest('[data-sidebar="menu-item"], [data-sidebar="menu-sub-item"]')
    ?.querySelector<HTMLElement>(
      ':scope > [data-sidebar="menu-button"], :scope > [data-sidebar="menu-sub-button"]'
    )
    ?.focus()
}

type AppNavRowProps = {
  item: AppNavItem
  /** The list it sits in: its group's id, or its parent item's. */
  parentId: string
  index: number
  /** The rows in that list. */
  count: number
  /** 0 for a group's rows, one more per level below. */
  depth: number
  reorderable: boolean
  /** Keep the icon column (a sibling has an icon or children). */
  hasIconColumn: boolean
  /** Sortable ids of a second copy of the row (the pinned group). */
  idPrefix?: string
}

/**
 * A row's children have no room on the rail, so pressing it lists them beside it:
 * its own page first, then its children, to any depth, as submenus.
 */
function AppNavRailItems({ item }: { item: AppNavItem }) {
  const { activeId, renderLink, onNavigate } = useAppNav()
  const getEntryProps = (entry: AppNavItem) => ({
    disabled: entry.disabled,
    "data-current": entry.id === activeId ? "" : undefined,
    render: entry.href ? renderLink(entry) : undefined,
    onClick: () => onNavigate?.(entry),
  })
  return (
    <DropdownMenuGroup>
      {item.href ? (
        <DropdownMenuItem {...getEntryProps(item)}>
          {item.label}
        </DropdownMenuItem>
      ) : (
        <DropdownMenuLabel>{item.label}</DropdownMenuLabel>
      )}
      {(item.children ?? []).map((child) =>
        child.children?.length ? (
          <DropdownMenuSub key={child.id}>
            <DropdownMenuSubTrigger disabled={child.disabled}>
              <IconSlot icon={child.icon} />
              {child.label}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <AppNavRailItems item={child} />
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : (
          <DropdownMenuItem key={child.id} {...getEntryProps(child)}>
            <IconSlot icon={child.icon} />
            {child.label}
          </DropdownMenuItem>
        )
      )}
    </DropdownMenuGroup>
  )
}

function AppNavRow({
  item,
  parentId,
  index,
  count,
  depth,
  reorderable,
  hasIconColumn: keepsIconColumn,
  idPrefix = "",
}: AppNavRowProps) {
  const {
    activeId,
    renderLink,
    onNavigate,
    preferences,
    updatePreferences,
    move,
  } = useAppNav()
  const collapse = useSidebarCollapse()
  // On the rail a row's children have no room, so pressing it lists them instead.
  const hasRailMenu = collapse === "icon" && Boolean(item.children?.length)
  const { attach, attachHandle, isDragging } = useSortableItem({
    id: `${idPrefix}${item.id}`,
    index,
    group: `${idPrefix}${parentId}`,
    disabled: !reorderable || item.disabled || hasRailMenu,
    hasVariableHeight: true,
  })
  const isTopLevel = depth === 0
  const entries = useRowEntries(item, {
    parentId,
    index,
    count,
    reorderable,
    canChangeGroup: isTopLevel,
  })
  const children = item.children ?? []
  const hasChildIcons = hasIconColumn(children)
  const hasChildren = children.length > 0
  const isCurrent = item.id === activeId
  const holdsActive = !isCurrent && containsNavItem(item, activeId)
  // An explicit choice wins; otherwise open by default or to show the page.
  const isOpen =
    hasChildren &&
    (preferences.open[item.id] ?? ((item.defaultOpen ?? false) || holdsActive))
  const setOpen = (open: boolean) =>
    updatePreferences(setNavOpen(preferences, item.id, open))
  const toggle = () => setOpen(!isOpen)
  // A row without a page of its own toggles its children.
  const select = item.href || !hasChildren ? () => onNavigate?.(item) : toggle

  const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.altKey && event.shiftKey) {
      if (!reorderable) return
      if (event.key === "ArrowUp" && index > 0) {
        event.preventDefault()
        move(item.id, parentId, index - 1)
      }
      if (event.key === "ArrowDown" && index < count - 1) {
        event.preventDefault()
        move(item.id, parentId, index + 1)
      }
      return
    }
    if (event.altKey || event.shiftKey || event.metaKey || event.ctrlKey) {
      return
    }
    if (hasRailMenu) return
    if (event.key === "ArrowRight" && hasChildren && !isOpen) {
      event.preventDefault()
      setOpen(true)
      return
    }
    if (event.key !== "ArrowLeft") return
    if (isOpen) {
      event.preventDefault()
      setOpen(false)
      return
    }
    if (!isTopLevel) {
      event.preventDefault()
      focusParentRow(event.currentTarget)
    }
  }

  // The Sidebar's `icon` prop takes components; elements go in as children.
  // Without an icon, the row keeps the column when its siblings use it.
  const iconElement = React.isValidElement(item.icon) ? item.icon : null
  const iconComponent = React.isValidElement(item.icon) ? undefined : item.icon
  const content = (
    <>
      {iconElement}
      {item.icon === undefined && (keepsIconColumn || hasChildren) && (
        <span
          aria-hidden
          data-slot="sidebar-menu-icon"
          className="cn-app-nav-icon-space shrink-0"
        />
      )}
      <span>{item.label}</span>
    </>
  )

  const button = isTopLevel ? (
    <SidebarMenuButton
      ref={attachHandle}
      render={item.href && !hasRailMenu ? renderLink(item) : undefined}
      // The selection marks the top-level row that is the page or holds it.
      isActive={isCurrent || holdsActive}
      aria-current={isCurrent ? "page" : undefined}
      aria-expanded={
        !item.href && hasChildren && !hasRailMenu ? isOpen : undefined
      }
      icon={iconComponent}
      status={item.status}
      tooltip={getNavRailLabel(item)}
      disabled={item.disabled}
      onClick={hasRailMenu ? undefined : select}
      onKeyDown={handleKeyDown}
    >
      {content}
    </SidebarMenuButton>
  ) : (
    <SidebarMenuSubButton
      ref={attachHandle}
      render={item.href ? renderLink(item) : <button type="button" />}
      isActive={isCurrent}
      aria-current={isCurrent ? "page" : undefined}
      aria-expanded={!item.href && hasChildren ? isOpen : undefined}
      aria-disabled={item.disabled || undefined}
      icon={iconComponent}
      onClick={select}
      onKeyDown={handleKeyDown}
    >
      {content}
    </SidebarMenuSubButton>
  )

  const Item = isTopLevel ? SidebarMenuItem : SidebarMenuSubItem

  return (
    <Item
      ref={attach}
      data-slot="app-nav-item"
      data-dragging={isDragging ? "" : undefined}
      data-badge={item.badge !== undefined ? "" : undefined}
      className="cn-app-nav-item"
    >
      {hasRailMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger render={button} />
          <DropdownMenuContent
            side="right"
            align="start"
            className="cn-app-nav-menu"
          >
            <AppNavRailItems item={item} />
            {entries.length > 0 && <DropdownMenuSeparator />}
            <DropdownMenuEntries entries={entries} />
          </DropdownMenuContent>
        </DropdownMenu>
      ) : entries.length > 0 ? (
        <ContextMenu>
          <ContextMenuTrigger render={button} />
          <ContextMenuContent className="cn-app-nav-menu">
            <ContextMenuEntries entries={entries} />
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        button
      )}
      {hasChildren && !hasRailMenu && (
        // A row without a page is its own toggle; this one serves the
        // pointer there, and the keyboard on rows that link.
        <button
          type="button"
          data-slot="app-nav-toggle"
          data-bare={item.icon === undefined ? "" : undefined}
          data-sortable-ignore=""
          aria-label={`${isOpen ? "Collapse" : "Expand"} ${item.label}`}
          aria-expanded={isOpen}
          aria-hidden={item.href ? undefined : true}
          tabIndex={item.href ? undefined : -1}
          onClick={toggle}
          className="cn-app-nav-toggle absolute flex items-center justify-center"
        >
          <RowChevron />
        </button>
      )}
      {item.badge !== undefined && (
        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
      )}
      {entries.length > 0 && (
        <SidebarMenuActions showOnHover data-sortable-ignore="">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuAction aria-label={`${item.label} actions`} />
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
            <DropdownMenuContent
              side="right"
              align="start"
              className="cn-app-nav-menu"
            >
              <DropdownMenuEntries entries={entries} />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuActions>
      )}
      {hasChildren && !hasRailMenu && (
        <SidebarMenuSub open={isOpen}>
          {children.map((child, childIndex) => (
            <AppNavRow
              key={child.id}
              item={child}
              parentId={item.id}
              index={childIndex}
              count={children.length}
              depth={depth + 1}
              reorderable={reorderable}
              hasIconColumn={hasChildIcons}
              idPrefix={idPrefix}
            />
          ))}
        </SidebarMenuSub>
      )}
    </Item>
  )
}

// MARK: Customize

type CustomizeRowStyle = React.CSSProperties & { "--app-nav-depth": number }

type CustomizeRowsProps = {
  /** The group or item the list belongs to. */
  parentId: string
  depth: number
  idPrefix: string
  preferences: NavPreferences
  onPreferencesChange: (preferences: NavPreferences) => void
  onMove: (id: string, toParentId: string, toIndex: number) => void
}

/** A row: a grip to move it, its name, and a switch to show or hide it. */
function CustomizeRow({
  item,
  parentId,
  index,
  count,
  depth,
  idPrefix,
  preferences,
  onPreferencesChange: updatePreferences,
  onMove,
}: CustomizeRowsProps & {
  item: AppNavItem
  index: number
  count: number
}) {
  const { attach, attachHandle, isDragging } = useSortableItem({
    id: item.id,
    index,
    group: parentId,
    disabled: count < 2,
    hasVariableHeight: true,
  })
  const indent: CustomizeRowStyle = { "--app-nav-depth": depth }
  const switchId = `${idPrefix}-${item.id}`
  const moveTo = (button: HTMLElement, toIndex: number) => {
    onMove(item.id, parentId, toIndex)
    // React may reinsert the moved row, which drops the focus.
    requestAnimationFrame(() => button.focus())
  }

  return (
    <li
      ref={attach}
      data-dragging={isDragging ? "" : undefined}
      className="cn-app-nav-customize-item flex flex-col"
    >
      <div
        style={indent}
        className="cn-app-nav-customize-row flex items-center"
      >
        <button
          ref={attachHandle}
          type="button"
          data-slot="app-nav-customize-handle"
          aria-label={`Move ${item.label}`}
          disabled={count < 2}
          onKeyDown={(event) => {
            if (event.key === "ArrowUp" && index > 0) {
              event.preventDefault()
              moveTo(event.currentTarget, index - 1)
            }
            if (event.key === "ArrowDown" && index < count - 1) {
              event.preventDefault()
              moveTo(event.currentTarget, index + 1)
            }
          }}
          className="cn-app-nav-customize-handle flex items-center justify-center"
        >
          <IconPlaceholder
            lucide="GripVerticalIcon"
            tabler="IconGripVertical"
            hugeicons="DragDropVerticalIcon"
            phosphor="DotsSixVerticalIcon"
            remixicon="RiDraggable"
          />
        </button>
        <label htmlFor={switchId} className="cn-app-nav-customize-name flex">
          <IconSlot icon={item.icon} />
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </label>
        <Switch
          id={switchId}
          aria-label={item.label}
          checked={!preferences.hidden.includes(item.id)}
          onCheckedChange={(checked) =>
            updatePreferences(setNavItemHidden(preferences, item.id, !checked))
          }
        />
      </div>
      {item.children && item.children.length > 0 && (
        <CustomizeRows
          items={item.children}
          parentId={item.id}
          depth={depth + 1}
          idPrefix={idPrefix}
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          onMove={onMove}
        />
      )}
    </li>
  )
}

/** A list of rows, children indented under their parent. */
function CustomizeRows({
  items,
  ...props
}: CustomizeRowsProps & { items: AppNavItem[] }) {
  return (
    <ul className="cn-app-nav-customize-rows flex flex-col">
      {items.map((item, index) => (
        <CustomizeRow
          key={item.id}
          item={item}
          index={index}
          count={items.length}
          {...props}
        />
      ))}
    </ul>
  )
}

/** The default trigger's icon and label, on the sidebar's row grid. */
function CustomizeRowContent({ label }: { label: string }) {
  return (
    <>
      <IconPlaceholder
        lucide="Settings2Icon"
        tabler="IconAdjustmentsHorizontal"
        hugeicons="SlidersHorizontalIcon"
        phosphor="SlidersHorizontalIcon"
        remixicon="RiEqualizerLine"
      />
      <span>{label}</span>
    </>
  )
}

/** A dialog that lists every item to show or hide, and resets the rest. */
function AppNavCustomize({
  groups,
  preferences,
  onPreferencesChange: updatePreferences,
  children,
  label = "Customize",
  title = "Customize sidebar",
  description = "Choose what shows in the sidebar, and drag rows to put them in order.",
}: {
  /** The same groups and preferences the AppNav gets. */
  groups: AppNavGroup[]
  preferences: NavPreferences
  onPreferencesChange: (preferences: NavPreferences) => void
  /** The trigger element, without children. Default: a sidebar row. */
  children?: React.ReactElement
  /** The trigger's text. */
  label?: string
  title?: string
  description?: string
}) {
  const idPrefix = React.useId()
  const [announcement, setAnnouncement] = React.useState("")
  const rows = getCustomizableNavGroups(groups, preferences)
  const move = (id: string, toParentId: string, toIndex: number) => {
    updatePreferences(
      moveCustomizableNavItem(preferences, groups, { id, toParentId, toIndex })
    )
    const total = getNavList(rows, toParentId)?.length ?? 1
    const label = findNavItem(rows, id)?.label ?? id
    setAnnouncement(describeMove(label, toIndex, total))
  }
  return (
    <Dialog>
      <DialogTrigger render={children ?? <SidebarMenuButton tooltip={label} />}>
        {children ? label : <CustomizeRowContent label={label} />}
      </DialogTrigger>
      <DialogContent className="cn-app-nav-customize">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="cn-app-nav-customize-list flex flex-col">
          <SortableProvider
            axis="y"
            onMove={(change) => move(change.id, change.toGroup, change.toIndex)}
          >
            {rows.map((group) => (
              <section
                key={group.id}
                aria-label={group.label ?? group.id}
                className="cn-app-nav-customize-group flex flex-col"
              >
                {group.label && (
                  <h3 className="cn-app-nav-customize-label">{group.label}</h3>
                )}
                <CustomizeRows
                  items={group.items}
                  parentId={group.id}
                  depth={0}
                  idPrefix={idPrefix}
                  preferences={preferences}
                  onPreferencesChange={updatePreferences}
                  onMove={move}
                />
              </section>
            ))}
          </SortableProvider>
        </div>
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => updatePreferences(EMPTY_NAV_PREFERENCES)}
          >
            Reset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// MARK: Bottom bar

/** The items marked `mobile: "tab"` (at any depth), as the phone tab bar. */
function AppNavBottomBar({
  groups,
  pathname = "",
  activeId: activeIdProp,
  renderLink = renderAnchor,
  className,
  ...props
}: React.ComponentProps<typeof AppShellBottomNav> & {
  groups: AppNavGroup[]
  pathname?: string
  activeId?: string | null
  renderLink?: AppNavRenderLink
}) {
  const activeId =
    activeIdProp === undefined
      ? getActiveNavItem(groups, pathname)
      : activeIdProp
  const items = getMobileTabItems(groups)
  return (
    <AppShellBottomNav className={className} {...props}>
      {items.map((item) => (
        <AppShellBottomNavItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          isActive={containsNavItem(item, activeId)}
          render={renderLink(item)}
        />
      ))}
    </AppShellBottomNav>
  )
}

export {
  AppNav,
  AppNavBottomBar,
  AppNavCustomize,
  type AppNavAction,
  type AppNavGroup,
  type AppNavIcon,
  type AppNavItem,
  type AppNavRenderLink,
}
