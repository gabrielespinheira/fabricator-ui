// Tab Strip: document tabs, as in a browser or an editor. Tabs are data the app
// owns (value + onValueChange, like Tabs); useTabStripState keeps that data for
// apps without a store of their own.
//
// - Pinned tabs lead and show only their icon; a preview tab is italic.
// - The close button's slot is always reserved, so titles never reflow. A dirty
//   tab shows its dot there, and the slot still closes it.
// - A long press opens one menu for the tab: pin, rename, move, close variants,
//   reopen, plus the tab's own actions. Moving through it stands in for the
//   website's drag, until the strip takes up lib/sortable.
// - The strip scrolls sideways and keeps the active tab in view.
import * as React from "react"
import {
  ChevronDownIcon,
  CircleAlertIcon,
  IconProvider,
  PlusIcon,
  XIcon,
  type IconProps,
} from "@fabricator-ui/icons-react-native"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native"
import { useCSSVariable } from "uniwind"

import {
  activateTab,
  closeOtherTabs,
  closeTabs,
  closeTabsToRight,
  describeMove,
  EMPTY_TAB_STRIP_STATE,
  getActiveTab,
  getShellStorageKey,
  moveTab,
  openTab,
  parseTabStripState,
  readStoredJson,
  reopenClosedTab,
  togglePinnedTab,
  type OpenTabOptions,
  type ShellStorage,
  type TabStripState,
} from "@/registry/fabricator/shared/lib/app-shell-model"
import { noteStep } from "@/registry/fabricator/shared/lib/sound-recipes"
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
import {
  getTabScrollOffset,
  orderTabs,
} from "@/registry/native/lib/tab-strip-model"
import { Button } from "@/registry/native/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/registry/native/ui/context-menu"
import { DensityScope, useControlSize } from "@/registry/native/ui/density"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/native/ui/dropdown-menu"
import { Spinner } from "@/registry/native/ui/spinner"
import { renderTextChildren, Text, TextStyle } from "@/registry/native/ui/text"

type IconLike = React.ComponentType<IconProps> | React.ReactElement

type TabStripAction = {
  id: string
  label: string
  icon?: IconLike
  destructive?: boolean
  separatorBefore?: boolean
  onSelect: () => void
}

type TabStripStatus = "loading" | "error" | "dirty" | "waiting"

/** What the strip knows about each tab, for its menus. */
type TabInfo = {
  index: number
  title: string
  pinned: boolean
  closable: boolean
  actions: TabStripAction[]
}

type TabStripContextValue = {
  value: string | null
  onActivate: (value: string) => void
  onClose?: (values: string[]) => void
  onReorder?: (value: string, index: number) => void
  onPin?: (value: string, pinned: boolean) => void
  onRename?: (value: string, title: string) => void
  onReopen?: () => void
  onNew?: () => void
  renaming: string | null
  setRenaming: (value: string | null) => void
  registerTab: (value: string, info: TabInfo) => () => void
  getTabs: () => { value: string; info: TabInfo }[]
  moveBy: (value: string, offset: number) => void
}

const TabStripContext = React.createContext<TabStripContextValue | null>(null)

// The lit tab turns foreground too; only the active one turns semibold.
const tabStripTextVariants = cva("cn-tab-strip-tab-text")
const tabStripLitTextVariants = cva("cn-tab-strip-tab-text-lit")
const tabStripActiveTextVariants = cva("cn-tab-strip-tab-text-active")

function useTabStrip() {
  const context = React.use(TabStripContext)
  if (!context) {
    throw new Error("Tab Strip parts must be used within a TabStrip.")
  }
  return context
}

const TabStripListContext = React.createContext<{
  onTabLayout: (value: string, start: number, end: number) => void
} | null>(null)

const TabIndexContext = React.createContext(0)

const NO_ACTIONS: TabStripAction[] = []

function TabStrip({
  value,
  onValueChange,
  onClose,
  onReorder,
  onPin,
  onRename,
  onReopen,
  onNew,
  panelId: _panelId,
  size = "default",
  shortcuts: _shortcuts = true,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<typeof View>, "children"> & {
  /** The active tab. */
  value: string | null
  onValueChange: (value: string) => void
  /** Closes tabs. Without it, tabs have no close button. */
  onClose?: (values: string[]) => void
  /** Moves a tab to its final index. Without it, the menu has no move items. */
  onReorder?: (value: string, index: number) => void
  onPin?: (value: string, pinned: boolean) => void
  onRename?: (value: string, title: string) => void
  onReopen?: () => void
  onNew?: () => void
  /** Kept so code moves across: React Native has no `aria-controls`. */
  panelId?: string
  /** `sm` pins the strip to the compact density. */
  size?: "default" | "sm"
  /** Kept so code moves across: the App Shell's shortcuts aren't native yet. */
  shortcuts?: boolean
  children?: React.ReactNode
}) {
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const tabs = React.useRef(new Map<string, TabInfo>())

  const registerTab = React.useCallback((tabValue: string, info: TabInfo) => {
    tabs.current.set(tabValue, info)
    return () => {
      tabs.current.delete(tabValue)
    }
  }, [])

  const getTabs = React.useCallback(() => orderTabs(tabs.current), [])

  const moveBy = React.useCallback(
    (tabValue: string, offset: number) => {
      if (!onReorder) return
      const order = getTabs()
      const index = order.findIndex((tab) => tab.value === tabValue)
      const target = index + offset
      if (index === -1 || target < 0 || target >= order.length) return
      onReorder(tabValue, target)
      const title = order[index]?.info.title ?? tabValue
      AccessibilityInfo.announceForAccessibility(
        describeMove(title, target, order.length)
      )
    },
    [onReorder, getTabs]
  )

  const contextValue: TabStripContextValue = {
    value,
    onActivate: onValueChange,
    onClose,
    onReorder,
    onPin,
    onRename,
    onReopen,
    onNew,
    renaming,
    setRenaming,
    registerTab,
    getTabs,
    moveBy,
  }

  const { density } = useControlSize(size)
  return (
    <TabStripContext value={contextValue}>
      <DensityScope density={density}>
        <View
          data-slot="tab-strip"
          data-size={size}
          className={cn(
            "cn-tab-strip min-w-0 shrink-0 flex-row items-center",
            className
          )}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
      </DensityScope>
    </TabStripContext>
  )
}

function TabStripList({
  className,
  children,
  "aria-label": ariaLabel = "Tabs",
  onLayout,
  onScroll,
  ...props
}: React.ComponentProps<typeof ScrollView>) {
  const strip = useTabStrip()
  const { value } = strip
  const motion = useMotion("move")
  const fluid = useFluidHover({ selected: value ?? undefined })
  const scrollRef = React.useRef<React.ComponentRef<typeof ScrollView>>(null)
  const viewport = React.useRef({ offset: 0, width: 0 })
  const frames = React.useRef(new Map<string, { start: number; end: number }>())
  const shouldAnimate = !motion.isOff && !motion.isReduced

  const keepInView = React.useCallback(
    (tabValue: string) => {
      const frame = frames.current.get(tabValue)
      if (!frame) return
      const target = getTabScrollOffset({
        ...frame,
        scrollOffset: viewport.current.offset,
        viewportWidth: viewport.current.width,
      })
      if (target !== null) {
        scrollRef.current?.scrollTo({ x: target, animated: shouldAnimate })
      }
    },
    [shouldAnimate]
  )

  React.useEffect(() => {
    if (value) keepInView(value)
  }, [keepInView, value])

  const context = React.useMemo(
    () => ({
      onTabLayout: (tabValue: string, start: number, end: number) => {
        frames.current.set(tabValue, { start, end })
        if (tabValue === value) keepInView(tabValue)
      },
    }),
    [keepInView, value]
  )

  // Each tab learns its position for the menu. Keyed by the tab's own key, so
  // reordering moves tabs instead of remounting them.
  const items = React.Children.toArray(children).map((child, index) => (
    <TabIndexContext
      key={React.isValidElement(child) ? child.key : index}
      value={index}
    >
      {child}
    </TabIndexContext>
  ))

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      scrollEventThrottle={16}
      data-slot="tab-strip-list"
      className={cn("cn-tab-strip-list min-w-0 shrink grow-0", className)}
      onLayout={(event) => {
        viewport.current.width = event.nativeEvent.layout.width
        if (value) keepInView(value)
        onLayout?.(event)
      }}
      onScroll={(event) => {
        viewport.current.offset = event.nativeEvent.contentOffset.x
        onScroll?.(event)
      }}
      {...props}
    >
      <ContextMenu className="h-full">
        <ContextMenuTrigger
          // Not one accessible element: each tab must stay reachable.
          accessible={false}
          role="tablist"
          aria-label={ariaLabel}
          disabled={!hasMenuEntries(strip, false)}
          className="cn-tab-strip-list-content relative grow flex-row items-stretch"
        >
          <FluidHoverSelection
            selection={fluid.selection}
            className="cn-tab-strip-selection"
          />
          <FluidHoverHighlight
            hover={fluid.hover}
            className="cn-tab-strip-highlight"
          />
          <FluidHoverProvider fluid={fluid}>
            <TabStripListContext value={context}>{items}</TabStripListContext>
          </FluidHoverProvider>
        </ContextMenuTrigger>
        <ContextMenuContent className="cn-tab-strip-menu">
          <TabStripMenuItems strip={strip} tabValue={null} />
        </ContextMenuContent>
      </ContextMenu>
    </ScrollView>
  )
}

/** Whether the strip's menu has anything for a tab, or for the empty strip. */
function hasMenuEntries(strip: TabStripContextValue, isTab: boolean) {
  if (isTab) {
    return Boolean(
      strip.onPin ||
        strip.onRename ||
        strip.onReorder ||
        strip.onClose ||
        strip.onReopen
    )
  }
  return Boolean(strip.onNew || strip.onReopen)
}

/**
 * The menu's rows. It mounts as the menu opens, so it reads the tabs as they are
 * then. It takes the strip as a prop: the menu's portal leaves the React tree.
 */
function TabStripMenuItems({
  strip,
  tabValue,
}: {
  strip: TabStripContextValue
  tabValue: string | null
}) {
  const { getTabs, onClose, onReorder, onPin, onRename, onReopen, onNew } =
    strip
  const order = getTabs()
  const index = order.findIndex((tab) => tab.value === tabValue)
  const tab = order[index]
  const unpinned = (list: typeof order) =>
    list.filter((entry) => !entry.info.pinned).map((entry) => entry.value)

  // Groups render with a separator between each pair that exists.
  const groups: React.ReactNode[] = []
  if (tab && (onPin || onRename || onReorder)) {
    groups.push(
      <ContextMenuGroup key="tab">
        {onPin && (
          <ContextMenuItem onPress={() => onPin(tab.value, !tab.info.pinned)}>
            {tab.info.pinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
        )}
        {onRename && (
          <ContextMenuItem onPress={() => strip.setRenaming(tab.value)}>
            Rename
          </ContextMenuItem>
        )}
        {onReorder && (
          <>
            <ContextMenuItem
              disabled={index <= 0}
              onPress={() => strip.moveBy(tab.value, -1)}
            >
              Move left
            </ContextMenuItem>
            <ContextMenuItem
              disabled={index >= order.length - 1}
              onPress={() => strip.moveBy(tab.value, 1)}
            >
              Move right
            </ContextMenuItem>
          </>
        )}
      </ContextMenuGroup>
    )
  }
  if (tab && onClose) {
    groups.push(
      <ContextMenuGroup key="close">
        {tab.info.closable && (
          <ContextMenuItem onPress={() => onClose([tab.value])}>
            Close
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onPress={() =>
            onClose(unpinned(order).filter((entry) => entry !== tab.value))
          }
        >
          Close others
        </ContextMenuItem>
        <ContextMenuItem
          disabled={index >= order.length - 1}
          onPress={() => onClose(unpinned(order.slice(index + 1)))}
        >
          Close to the right
        </ContextMenuItem>
        <ContextMenuItem onPress={() => onClose(unpinned(order))}>
          Close all
        </ContextMenuItem>
      </ContextMenuGroup>
    )
  }
  if (tab && tab.info.actions.length > 0) {
    groups.push(
      <ContextMenuGroup key="actions">
        {tab.info.actions.map((action) => (
          <React.Fragment key={action.id}>
            {action.separatorBefore && <ContextMenuSeparator />}
            <ContextMenuItem
              variant={action.destructive ? "destructive" : "default"}
              onPress={action.onSelect}
            >
              <IconSlot icon={action.icon} />
              {action.label}
            </ContextMenuItem>
          </React.Fragment>
        ))}
      </ContextMenuGroup>
    )
  }
  if (!tab && onNew) {
    groups.push(
      <ContextMenuGroup key="new">
        <ContextMenuItem onPress={onNew}>New tab</ContextMenuItem>
      </ContextMenuGroup>
    )
  }
  if (onReopen) {
    groups.push(
      <ContextMenuGroup key="reopen">
        <ContextMenuItem onPress={onReopen}>Reopen closed tab</ContextMenuItem>
      </ContextMenuGroup>
    )
  }

  return groups.map((group, groupIndex) => (
    <React.Fragment key={groupIndex}>
      {groupIndex > 0 && <ContextMenuSeparator />}
      {group}
    </React.Fragment>
  ))
}

function getText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getText).join("")
  return ""
}

function IconSlot({ icon }: { icon?: IconLike }) {
  if (!icon) return null
  if (React.isValidElement(icon)) return icon
  const IconComponent = icon
  return <IconComponent />
}

function TabStatusIcon({
  status,
  icon,
  size,
}: {
  status?: TabStripStatus
  icon?: IconLike
  size: number
}) {
  if (status === "loading") {
    return <Spinner data-slot="tab-strip-spinner" size={size} />
  }
  if (status === "error") {
    return (
      <TextStyle className="cn-tab-strip-error-text">
        <View data-slot="tab-strip-error" className="cn-tab-strip-error">
          <CircleAlertIcon />
        </View>
      </TextStyle>
    )
  }
  return <IconSlot icon={icon} />
}

function TabStripTab({
  value: tabValue,
  title: titleProp,
  pinned = false,
  preview = false,
  status,
  icon,
  closable: closableProp,
  actions = NO_ACTIONS,
  className,
  children,
  onLayout,
  ...props
}: Omit<React.ComponentProps<typeof ContextMenu>, "children"> & {
  value: string
  /** The tab's name for menus, renaming and announcements. Default: its text. */
  title?: string
  /** Leads the strip and shows only its icon. */
  pinned?: boolean
  /** An italic tab the next preview replaces. */
  preview?: boolean
  status?: TabStripStatus
  icon?: IconLike
  /** Default: true unless pinned. */
  closable?: boolean
  /** Extra items for this tab's menu. */
  actions?: TabStripAction[]
  children?: React.ReactNode
}) {
  const strip = useTabStrip()
  const list = React.use(TabStripListContext)
  const index = React.use(TabIndexContext)
  const feedback = useFeedback()
  const isActive = strip.value === tabValue
  const title = titleProp ?? getText(children)
  const closable = (closableProp ?? !pinned) && strip.onClose !== undefined
  const isRenaming = strip.renaming === tabValue
  const { isLit, rowProps } = useFluidRow({
    itemKey: tabValue,
    onLayout: (event) => {
      const { x, width } = event.nativeEvent.layout
      list?.onTabLayout(tabValue, x, x + width)
      onLayout?.(event)
    },
  })
  const [iconToken, padToken] = useCSSVariable([
    "--density-icon-14",
    "--density-4",
  ])
  const iconSize = parseNumber(iconToken, 14)
  // A press takes the strip's whole height. The list scrolls, so it clips any
  // reach past its own edges.
  const tabSlop = parseNumber(padToken, 4)

  const { registerTab } = strip
  React.useLayoutEffect(
    () => registerTab(tabValue, { index, title, pinned, closable, actions }),
    [registerTab, tabValue, index, title, pinned, closable, actions]
  )

  // The primitive's `disabled` turns off its press too, and a tab with no menu
  // still has to select, so it's a plain press.
  const Trigger =
    hasMenuEntries(strip, true) || actions.length > 0
      ? ContextMenuTrigger
      : Pressable
  const content = (
    <IconProvider size={iconSize} strokeWidth={isActive || isLit ? 2 : 1.5}>
      {isRenaming ? (
        <TabRenameInput value={tabValue} title={title} />
      ) : (
        <Trigger
          data-slot="tab-strip-trigger"
          data-pinned={pinned}
          role="tab"
          accessibilityLabel={title}
          aria-selected={isActive}
          aria-disabled={false}
          accessibilityState={{ selected: isActive }}
          hitSlop={{ top: tabSlop, bottom: tabSlop }}
          className="cn-tab-strip-trigger min-w-0 flex-1 flex-row items-center data-[pinned=true]:flex-none"
          onPress={() => {
            feedback("note", { pitch: noteStep(index) })
            strip.onActivate(tabValue)
          }}
          onPressIn={rowProps.onPressIn}
          onPressOut={rowProps.onPressOut}
        >
          <TabStatusIcon status={status} icon={icon} size={iconSize} />
          {pinned ? null : (
            <Text
              data-slot="tab-strip-title"
              data-active={isActive}
              data-preview={preview}
              numberOfLines={1}
              className="cn-tab-strip-title flex-1 shrink"
            >
              {children}
            </Text>
          )}
          {status === "waiting" && (
            <View
              data-slot="tab-strip-waiting"
              className="cn-tab-strip-waiting"
            />
          )}
        </Trigger>
      )}
      {closable && !isRenaming && (
        <View
          data-slot="tab-strip-close-slot"
          className="cn-tab-strip-close-slot relative shrink-0 items-center justify-center"
        >
          {status === "dirty" && (
            <View
              data-slot="tab-strip-dirty"
              pointerEvents="none"
              className="cn-tab-strip-dirty absolute"
            />
          )}
          <Pressable
            data-slot="tab-strip-close"
            role="button"
            accessibilityLabel={`Close ${title}`}
            hitSlop={12}
            className="cn-tab-strip-close items-center justify-center"
            onPress={() => {
              feedback("tap")
              strip.onClose?.([tabValue])
            }}
          >
            {/* The dot takes the icon's place; the slot still closes. */}
            {status === "dirty" ? null : <XIcon />}
          </Pressable>
        </View>
      )}
    </IconProvider>
  )

  return (
    <ContextMenu
      data-slot="tab-strip-tab"
      data-value={tabValue}
      data-active={isActive}
      data-pinned={pinned}
      data-preview={preview}
      data-status={status}
      data-closable={closable}
      role="presentation"
      className={cn(
        "cn-tab-strip-tab relative flex-row items-center",
        className
      )}
      onLayout={rowProps.onLayout}
      {...props}
    >
      <TextStyle
        eases
        className={cn(
          tabStripTextVariants(),
          isActive
            ? tabStripActiveTextVariants()
            : isLit
              ? tabStripLitTextVariants()
              : undefined
        )}
      >
        {content}
      </TextStyle>
      <ContextMenuContent className="cn-tab-strip-menu">
        <TabStripMenuItems strip={strip} tabValue={tabValue} />
      </ContextMenuContent>
    </ContextMenu>
  )
}

function TabRenameInput({ value, title }: { value: string; title: string }) {
  const { onRename, setRenaming } = useTabStrip()
  const [draft, setDraft] = React.useState(title)
  const isDone = React.useRef(false)
  const finish = () => {
    if (isDone.current) return
    isDone.current = true
    const next = draft.trim()
    if (next && next !== title) onRename?.(value, next)
    setRenaming(null)
  }
  return (
    <TextInput
      autoFocus
      selectTextOnFocus
      accessibilityLabel="Tab name"
      value={draft}
      data-slot="tab-strip-rename"
      returnKeyType="done"
      selectionColorClassName="accent-primary"
      onChangeText={setDraft}
      onBlur={finish}
      onSubmitEditing={finish}
      className="cn-tab-strip-rename min-w-0 flex-1"
    />
  )
}

function TabStripNew({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { onNew } = useTabStrip()
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      accessibilityLabel="New tab"
      data-slot="tab-strip-new"
      onPress={onNew}
      className={cn("cn-tab-strip-new", className)}
      {...props}
    >
      {children ?? <PlusIcon />}
    </Button>
  )
}

/** A menu of every tab, for strips that overflow. */
function TabStripOverflow({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { value, onActivate, getTabs } = useTabStrip()
  const [order, setOrder] = React.useState<ReturnType<typeof getTabs>>([])
  return (
    <DropdownMenu onOpenChange={(open) => open && setOrder(getTabs())}>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            accessibilityLabel="All tabs"
            data-slot="tab-strip-overflow"
            className={cn("cn-tab-strip-overflow", className)}
            {...props}
          />
        }
      >
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="cn-tab-strip-overflow-menu">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Tabs</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={value ?? ""}
            onValueChange={(next) => {
              if (typeof next === "string") onActivate(next)
            }}
          >
            {order.map((tab) => (
              // Picked on a phone, the menu is in the way of what it picked.
              <DropdownMenuRadioItem
                key={tab.value}
                value={tab.value}
                closeOnClick
              >
                <Text numberOfLines={1}>{tab.info.title}</Text>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Keeps a tab strip's state: open tabs, pinned tabs, the most recent, the
 * preview tab and the reopen stack. Spread `stripProps` onto TabStrip.
 */
function useTabStripState({
  defaultState = EMPTY_TAB_STRIP_STATE,
  storage,
  storageKey,
}: {
  defaultState?: TabStripState
  /** Saves the strip (your own, over MMKV or AsyncStorage). */
  storage?: ShellStorage
  /** Names the saved strip: `app-shell.<storageKey>.tabs`. */
  storageKey?: string
} = {}) {
  const [state, setState] = React.useState(defaultState)
  const key = storageKey ? getShellStorageKey(storageKey, "tabs") : null

  // Adopt the saved strip after mounting, as the website does.
  React.useEffect(() => {
    if (!storage || !key) return
    const stored = readStoredJson(storage, key)
    if (stored !== null) setState(parseTabStripState(stored))
  }, [storage, key])

  const update = React.useCallback(
    (change: (current: TabStripState) => TabStripState) =>
      setState((current) => {
        const next = change(current)
        if (storage && key && next !== current) {
          storage.set(key, JSON.stringify(next))
        }
        return next
      }),
    [storage, key]
  )

  const actions = React.useMemo(
    () => ({
      open: (id: string, options?: OpenTabOptions) =>
        update((current) => openTab(current, id, options)),
      activate: (id: string) => update((current) => activateTab(current, id)),
      close: (ids: string[]) => update((current) => closeTabs(current, ids)),
      closeOthers: (id: string) =>
        update((current) => closeOtherTabs(current, id)),
      closeToRight: (id: string) =>
        update((current) => closeTabsToRight(current, id)),
      move: (id: string, index: number) =>
        update((current) => moveTab(current, id, index)),
      setPinned: (id: string, pinned: boolean) =>
        update((current) =>
          current.pinned.includes(id) === pinned
            ? current
            : togglePinnedTab(current, id)
        ),
      reopen: () => update(reopenClosedTab),
    }),
    [update]
  )

  const activeId = getActiveTab(state)

  return {
    state,
    activeId,
    ...actions,
    stripProps: {
      value: activeId,
      onValueChange: actions.activate,
      onClose: actions.close,
      onReorder: actions.move,
      onPin: actions.setPinned,
      onReopen: actions.reopen,
    },
  }
}

export {
  TabStrip,
  TabStripList,
  TabStripNew,
  TabStripOverflow,
  TabStripTab,
  useTabStripState,
  type TabStripAction,
  type TabStripStatus,
}
