// App Nav: renders a navigation model into the Sidebar. The model (groups of items
// with icons, badges, statuses, children and actions) is plain data from
// lib/app-shell-model, the same value the website's App Nav takes.
//
// - The active item comes from the pathname: the longest match wins. Its top-level
//   row is raised; a nested page sits on a quieter wash.
// - Items nest to any depth. A row with children has a chevron at its end, always
//   shown because touch has no hover; a row without a page opens from anywhere on it.
// - Rows in reorderable groups drag to a new place in their list on a long press.
//   Their menu moves them too, and is how a row changes group.
// - A row's actions are in its menu: the trailing button, or a long press on a row
//   that doesn't drag.
// - With `customizable`, people can pin items to the top and hide them;
//   AppNavCustomize lists everything to show or hide again, and to reorder.
// - Everything a person changes is one serializable value (preferences).
import * as React from "react"
import {
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowUpIcon,
  EllipsisIcon,
  EyeOffIcon,
  GripVerticalIcon,
  IconProvider,
  Settings2Icon,
  StarIcon,
} from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
  type AccessibilityActionEvent,
} from "react-native"
import { GestureDetector } from "react-native-gesture-handler"
import Animated from "react-native-reanimated"
import { useCSSVariable } from "uniwind"

import {
  applyNavPreferences,
  containsNavItem,
  EMPTY_NAV_PREFERENCES,
  getActiveNavItem,
  getCustomizableNavGroups,
  getMobileTabItems,
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
} from "@/registry/fabricator/shared/lib/app-shell-model"
import {
  getMoveAnnouncement,
  getNavRowEntries,
  getNavRowState,
  hasIconColumn,
  isNavGroupOpen,
  type NavRowEntry,
} from "@/registry/native/lib/app-nav-model"
import { useFeedback } from "@/registry/native/lib/feedback"
import { parseNumber } from "@/registry/native/lib/motion-tokens"
import {
  SortableProvider,
  useSortableItem,
} from "@/registry/native/lib/sortable"
import {
  AppShellBottomNav,
  AppShellBottomNavItem,
  IconSlot,
  type IconLike,
} from "@/registry/native/ui/app-shell"
import { Button } from "@/registry/native/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/registry/native/ui/context-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/registry/native/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import {
  SidebarChevron,
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
  useSidebarMenuRow,
} from "@/registry/native/ui/sidebar"
import { Switch } from "@/registry/native/ui/switch"
import { Text, TextStyle } from "@/registry/native/ui/text"

/** A component (`icon={HomeIcon}`) or an element (`icon={<HomeIcon />}`). */
type AppNavIcon = IconLike
type AppNavItem = NavItem<AppNavIcon>
type AppNavGroup = NavGroup<AppNavIcon>
type AppNavAction = NavAction<AppNavIcon>

/** Returns the link element for an item, without children (a router Link). */
type AppNavRenderLink = (item: AppNavItem) => React.ReactElement<{
  children?: React.ReactNode
}>

/** The pinned rows repeat items from their groups; their drag ids differ. */
const PINNED_GROUP = "app-nav-pinned"

const CUSTOMIZE_LIST_HEIGHT_FRACTION = 0.6

const appNavCustomizeListVariants = cva("cn-app-nav-customize-list flex-col")

const ENTRY_ICONS: Record<string, React.ComponentType> = {
  "move-up": ArrowUpIcon,
  "move-down": ArrowDownIcon,
  "move-to": ArrowRightIcon,
  pin: StarIcon,
  hide: EyeOffIcon,
}

// MARK: Menus

type RunEntry = (entry: NavRowEntry<AppNavIcon>) => void

function EntryIcon({ entry }: { entry: NavRowEntry<AppNavIcon> }) {
  if (entry.icon) return <IconSlot icon={entry.icon} />
  const BuiltIn = ENTRY_ICONS[entry.id]
  return BuiltIn ? <BuiltIn /> : null
}

function ContextMenuEntries({
  entries,
  run,
}: {
  entries: NavRowEntry<AppNavIcon>[]
  run: RunEntry
}) {
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
                <ContextMenuEntries entries={entry.children} run={run} />
              </ContextMenuSubContent>
            </ContextMenuSub>
          ) : (
            <ContextMenuItem
              variant={entry.destructive ? "destructive" : "default"}
              disabled={entry.disabled}
              onPress={() => run(entry)}
            >
              <EntryIcon entry={entry} />
              {entry.label}
            </ContextMenuItem>
          )}
        </React.Fragment>
      ))}
    </ContextMenuGroup>
  )
}

function DropdownMenuEntries({
  entries,
  run,
}: {
  entries: NavRowEntry<AppNavIcon>[]
  run: RunEntry
}) {
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
                <DropdownMenuEntries entries={entry.children} run={run} />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          ) : (
            <DropdownMenuItem
              variant={entry.destructive ? "destructive" : "default"}
              disabled={entry.disabled}
              onPress={() => run(entry)}
            >
              <EntryIcon entry={entry} />
              {entry.label}
            </DropdownMenuItem>
          )}
        </React.Fragment>
      ))}
    </DropdownMenuGroup>
  )
}

// MARK: AppNav

type AppNavContextValue = {
  groups: AppNavGroup[]
  applied: AppNavGroup[]
  preferences: NavPreferences
  updatePreferences: (next: NavPreferences) => void
  activeId: string | null
  renderLink?: AppNavRenderLink
  onNavigate?: (item: AppNavItem) => void
  customizable: boolean
  move: (id: string, toParentId: string, toIndex: number) => void
}

const AppNavContext = React.createContext<AppNavContextValue | null>(null)

function useAppNav() {
  const context = React.use(AppNavContext)
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
  renderLink,
  onNavigate,
  customizable = false,
  pinnedLabel = "Pinned",
  "aria-label": ariaLabel = "Main",
  className,
  ...props
}: React.ComponentProps<typeof View> & {
  groups: AppNavGroup[]
  /** The current path; the item that owns it is active. */
  pathname?: string
  /** Sets the active item directly instead. */
  activeId?: string | null
  preferences?: NavPreferences
  defaultPreferences?: NavPreferences
  onPreferencesChange?: (preferences: NavPreferences) => void
  /** Wraps a link row in your router's link. Rows press `onNavigate` without it. */
  renderLink?: AppNavRenderLink
  /** Called when a link row is pressed; the phone's sidebar closes by itself. */
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
      AccessibilityInfo.announceForAccessibility(
        getMoveAnnouncement(applied, { id, toParentId, toIndex })
      )
    },
    [preferences, groups, applied, updatePreferences]
  )

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
    <AppNavContext value={contextValue}>
      <View
        data-slot="app-nav"
        role="navigation"
        aria-label={ariaLabel}
        className={cn("cn-app-nav min-w-0 flex-col", className)}
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
                      hasIconColumn={hasIconColumn(pinned)}
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
      </View>
    </AppNavContext>
  )
}

/**
 * Called rather than rendered: SidebarGroup finds its header's actions by element
 * type, to keep them on the label row when the rows collapse.
 */
function renderGroupActions(actions: AppNavAction[]) {
  const withIcons = actions.filter((action) => action.icon)
  const rest = actions.filter((action) => !action.icon)
  const run: RunEntry = (entry) => {
    if (entry.action?.kind === "select") entry.action.onSelect()
  }
  return (
    <SidebarGroupActions showOnHover>
      {withIcons.map((action) => (
        <SidebarGroupAction
          key={action.id}
          accessibilityLabel={action.label}
          onPress={action.onSelect}
        >
          <IconSlot icon={action.icon} />
        </SidebarGroupAction>
      ))}
      {rest.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={<SidebarGroupAction accessibilityLabel="More actions" />}
          >
            <EllipsisIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuEntries
              entries={rest.map((action) => ({
                ...action,
                action: { kind: "select", onSelect: action.onSelect },
              }))}
              run={run}
            />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </SidebarGroupActions>
  )
}

function AppNavGroupSection({ group }: { group: AppNavGroup }) {
  const { preferences, updatePreferences } = useAppNav()
  return (
    <SidebarGroup
      data-slot="app-nav-group"
      data-group={group.id}
      collapsible={group.collapsible && Boolean(group.label)}
      open={isNavGroupOpen(group, preferences)}
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
              hasIconColumn={hasIconColumn(group.items)}
            />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

/** The chevron at a row's end. It serves rows that link, which a press navigates. */
function RowToggle({
  label,
  isOpen,
  onToggle,
}: {
  label: string
  isOpen: boolean
  onToggle: () => void
}) {
  const row = useSidebarMenuRow()
  const collapse = useSidebarCollapse()
  const feedback = useFeedback()
  const setHasToggle = row?.setHasToggle
  React.useLayoutEffect(() => {
    setHasToggle?.(true)
    return () => setHasToggle?.(false)
  }, [setHasToggle])
  return (
    <TextStyle className="cn-app-nav-toggle-text">
      <Pressable
        data-slot="app-nav-toggle"
        data-collapsible={collapse}
        data-row-size={row?.size ?? "default"}
        role="button"
        accessibilityLabel={`${isOpen ? "Collapse" : "Expand"} ${label}`}
        aria-expanded={isOpen}
        hitSlop={4}
        onPress={() => {
          feedback(isOpen ? "collapse" : "expand")
          onToggle()
        }}
        className="cn-app-nav-toggle absolute items-center justify-center"
        style={{ right: row?.trailing.toggleEnd }}
      >
        <SidebarChevron open={isOpen} />
      </Pressable>
    </TextStyle>
  )
}

/** The icon column of a row without an icon. */
function RowIconSpace({ isNested }: { isNested: boolean }) {
  return (
    <View
      data-slot="sidebar-menu-icon"
      data-nested={isNested}
      className="cn-app-nav-icon-space shrink-0"
    />
  )
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
    applied,
    activeId,
    customizable,
    renderLink,
    onNavigate,
    preferences,
    updatePreferences,
    move,
  } = useAppNav()
  const collapse = useSidebarCollapse()
  const sortable = useSortableItem({
    id: `${idPrefix}${item.id}`,
    index,
    group: `${idPrefix}${parentId}`,
    disabled: !reorderable || item.disabled,
    hasVariableHeight: true,
  })
  const isTopLevel = depth === 0
  const entries = getNavRowEntries({
    item,
    parentId,
    index,
    count,
    reorderable,
    canChangeGroup: isTopLevel,
    customizable,
    applied,
    preferences,
  })
  const run: RunEntry = ({ action }) => {
    if (action?.kind === "move") {
      move(item.id, action.toParentId, action.toIndex)
    } else if (action?.kind === "pin") {
      updatePreferences(setNavItemPinned(preferences, item.id, action.pinned))
    } else if (action?.kind === "hide") {
      updatePreferences(setNavItemHidden(preferences, item.id, true))
    } else if (action?.kind === "select") {
      action.onSelect()
    }
  }
  const { hasChildren, isCurrent, holdsActive, isOpen } = getNavRowState(
    item,
    activeId,
    preferences
  )
  const children = item.children ?? []
  const toggle = () =>
    updatePreferences(setNavOpen(preferences, item.id, !isOpen))
  // A row without a page of its own toggles its children.
  const select = item.href || !hasChildren ? () => onNavigate?.(item) : toggle
  const link = item.href && renderLink ? renderLink(item) : undefined

  const icon =
    item.icon ??
    (keepsIconColumn || hasChildren ? (
      <RowIconSpace isNested={!isTopLevel} />
    ) : undefined)

  // A screen reader can't drag: it moves the row through its actions.
  const accessibilityActions = reorderable
    ? [
        ...(index > 0 ? [{ name: "moveUp", label: "Move up" }] : []),
        ...(index < count - 1
          ? [{ name: "moveDown", label: "Move down" }]
          : []),
      ]
    : undefined
  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === "moveUp") {
      move(item.id, parentId, index - 1)
    }
    if (event.nativeEvent.actionName === "moveDown") {
      move(item.id, parentId, index + 1)
    }
  }

  // Long-pressing a row that drags would start the drag, so its menu is the
  // trailing button's alone. On the rail there's no room for one.
  const hasContextMenu = entries.length > 0 && !reorderable
  const showsTooltip = collapse === "icon" && !hasContextMenu && !reorderable

  const button = isTopLevel ? (
    <SidebarMenuButton
      render={link}
      // The selection marks the top-level row that is the page or holds it.
      isActive={isCurrent || holdsActive}
      aria-expanded={!item.href && hasChildren ? isOpen : undefined}
      icon={icon}
      status={item.status}
      tooltip={showsTooltip ? item.label : undefined}
      disabled={item.disabled}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      onPress={select}
    >
      {item.label}
    </SidebarMenuButton>
  ) : (
    <SidebarMenuSubButton
      render={link}
      isActive={isCurrent}
      aria-expanded={!item.href && hasChildren ? isOpen : undefined}
      icon={icon}
      disabled={item.disabled}
      accessibilityActions={accessibilityActions}
      onAccessibilityAction={onAccessibilityAction}
      onPress={select}
    >
      {item.label}
    </SidebarMenuSubButton>
  )

  const Item = isTopLevel ? SidebarMenuItem : SidebarMenuSubItem

  return (
    <Item
      data-slot="app-nav-item"
      data-dragging={sortable.isDragging}
      className="cn-app-nav-item"
      style={sortable.style}
      onLayout={sortable.onLayout}
    >
      {reorderable ? (
        // Only the row itself: its children have rows and gestures of their own.
        <GestureDetector gesture={sortable.gesture}>
          <Animated.View collapsable={false}>{button}</Animated.View>
        </GestureDetector>
      ) : hasContextMenu ? (
        <ContextMenu>
          <ContextMenuTrigger render={button} />
          <ContextMenuContent className="cn-app-nav-menu">
            <ContextMenuEntries entries={entries} run={run} />
          </ContextMenuContent>
        </ContextMenu>
      ) : (
        button
      )}
      {hasChildren && !sortable.isDragging && (
        <RowToggle label={item.label} isOpen={isOpen} onToggle={toggle} />
      )}
      {item.badge !== undefined && (
        <SidebarMenuBadge>{item.badge}</SidebarMenuBadge>
      )}
      {entries.length > 0 && !sortable.isDragging && (
        <SidebarMenuActions showOnHover>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <SidebarMenuAction
                  accessibilityLabel={`${item.label} actions`}
                />
              }
            >
              <EllipsisIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="right"
              align="start"
              className="cn-app-nav-menu"
            >
              <DropdownMenuEntries entries={entries} run={run} />
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuActions>
      )}
      {hasChildren && (
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
              hasIconColumn={hasIconColumn(children)}
              idPrefix={idPrefix}
            />
          ))}
        </SidebarMenuSub>
      )}
    </Item>
  )
}

// MARK: Customize

type CustomizeRowsProps = {
  /** The group or item the list belongs to. */
  parentId: string
  depth: number
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
  preferences,
  onPreferencesChange: updatePreferences,
  onMove,
}: CustomizeRowsProps & {
  item: AppNavItem
  index: number
  count: number
}) {
  const sortable = useSortableItem({
    id: item.id,
    index,
    group: parentId,
    disabled: count < 2,
    hasVariableHeight: true,
  })
  const [gripToken, indentToken, iconToken] = useCSSVariable([
    "--density-4",
    "--density-16",
    "--density-icon-14",
  ])
  const feedback = useFeedback()
  const isShown = !preferences.hidden.includes(item.id)
  const setShown = (shown: boolean) =>
    updatePreferences(setNavItemHidden(preferences, item.id, !shown))

  return (
    <Animated.View
      data-dragging={sortable.isDragging}
      className="cn-app-nav-customize-item flex-col"
      style={sortable.style}
      onLayout={sortable.onLayout}
    >
      <View
        className="cn-app-nav-customize-row flex-row items-center"
        style={{
          paddingLeft:
            parseNumber(gripToken, 4) + parseNumber(indentToken, 16) * depth,
        }}
      >
        <GestureDetector gesture={sortable.gesture}>
          <TextStyle className="cn-app-nav-customize-handle-text">
            <Pressable
              data-slot="app-nav-customize-handle"
              role="button"
              accessibilityLabel={`Move ${item.label}`}
              accessibilityActions={[
                ...(index > 0 ? [{ name: "moveUp", label: "Move up" }] : []),
                ...(index < count - 1
                  ? [{ name: "moveDown", label: "Move down" }]
                  : []),
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === "moveUp") {
                  onMove(item.id, parentId, index - 1)
                }
                if (event.nativeEvent.actionName === "moveDown") {
                  onMove(item.id, parentId, index + 1)
                }
              }}
              disabled={count < 2}
              hitSlop={8}
              className="cn-app-nav-customize-handle items-center justify-center"
            >
              <IconProvider size={parseNumber(iconToken, 14)} strokeWidth={1.5}>
                <GripVerticalIcon />
              </IconProvider>
            </Pressable>
          </TextStyle>
        </GestureDetector>
        <Pressable
          role="none"
          accessible={false}
          onPress={() => {
            // It stands in for the switch beside it, as a label does.
            feedback(isShown ? "toggle-off" : "toggle-on")
            setShown(!isShown)
          }}
          className="cn-app-nav-customize-name flex-row items-center"
        >
          <IconProvider strokeWidth={1.5}>
            <IconSlot icon={item.icon} />
          </IconProvider>
          <Text numberOfLines={1} className="cn-app-nav-customize-name-text">
            {item.label}
          </Text>
        </Pressable>
        <Switch
          accessibilityLabel={item.label}
          checked={isShown}
          onCheckedChange={setShown}
        />
      </View>
      {item.children && item.children.length > 0 && (
        <CustomizeRows
          items={item.children}
          parentId={item.id}
          depth={depth + 1}
          preferences={preferences}
          onPreferencesChange={updatePreferences}
          onMove={onMove}
        />
      )}
    </Animated.View>
  )
}

/** A list of rows, children indented under their parent. */
function CustomizeRows({
  items,
  ...props
}: CustomizeRowsProps & { items: AppNavItem[] }) {
  return (
    <View className="cn-app-nav-customize-rows flex-col">
      {items.map((item, index) => (
        <CustomizeRow
          key={item.id}
          item={item}
          index={index}
          count={items.length}
          {...props}
        />
      ))}
    </View>
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
  description = "Choose what shows in the sidebar, and hold a grip to drag rows into order.",
}: {
  /** The same groups and preferences the AppNav gets. */
  groups: AppNavGroup[]
  preferences: NavPreferences
  onPreferencesChange: (preferences: NavPreferences) => void
  /** The trigger element, without children. Default: a sidebar row. */
  children?: React.ReactElement<{ children?: React.ReactNode }>
  /** The trigger's text. */
  label?: string
  title?: string
  description?: string
}) {
  const { height } = useWindowDimensions()
  const rows = getCustomizableNavGroups(groups, preferences)
  const move = (id: string, toParentId: string, toIndex: number) => {
    updatePreferences(
      moveCustomizableNavItem(preferences, groups, { id, toParentId, toIndex })
    )
    AccessibilityInfo.announceForAccessibility(
      getMoveAnnouncement(rows, { id, toParentId, toIndex })
    )
  }
  return (
    <Dialog>
      <DialogTrigger
        render={
          children ?? <SidebarMenuButton tooltip={label} icon={Settings2Icon} />
        }
      >
        {label}
      </DialogTrigger>
      <DialogContent className="cn-app-nav-customize">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ScrollView
          style={{ maxHeight: height * CUSTOMIZE_LIST_HEIGHT_FRACTION }}
          contentContainerClassName={appNavCustomizeListVariants()}
        >
          <SortableProvider
            axis="y"
            onMove={(change) => move(change.id, change.toGroup, change.toIndex)}
          >
            {rows.map((group) => (
              <View
                key={group.id}
                aria-label={group.label ?? group.id}
                className="cn-app-nav-customize-group flex-col"
              >
                {group.label && (
                  <Text role="heading" className="cn-app-nav-customize-label">
                    {group.label}
                  </Text>
                )}
                <CustomizeRows
                  items={group.items}
                  parentId={group.id}
                  depth={0}
                  preferences={preferences}
                  onPreferencesChange={updatePreferences}
                  onMove={move}
                />
              </View>
            ))}
          </SortableProvider>
        </ScrollView>
        <DialogFooter>
          <Button
            variant="outline"
            onPress={() => updatePreferences(EMPTY_NAV_PREFERENCES)}
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
  renderLink,
  onNavigate,
  className,
  ...props
}: React.ComponentProps<typeof AppShellBottomNav> & {
  groups: AppNavGroup[]
  pathname?: string
  activeId?: string | null
  renderLink?: AppNavRenderLink
  /** Called when a tab is pressed. */
  onNavigate?: (item: AppNavItem) => void
}) {
  const activeId =
    activeIdProp === undefined
      ? getActiveNavItem(groups, pathname)
      : activeIdProp
  return (
    <AppShellBottomNav className={className} {...props}>
      {getMobileTabItems(groups).map((item) => (
        <AppShellBottomNavItem
          key={item.id}
          icon={item.icon}
          label={item.label}
          disabled={item.disabled}
          isActive={containsNavItem(item, activeId)}
          render={item.href && renderLink ? renderLink(item) : undefined}
          onPress={() => onNavigate?.(item)}
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
