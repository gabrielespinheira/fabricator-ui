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
// - A phone's width holds one tab and a half, so there the strip folds into a
//   switcher, as a phone's browser does: the active tab with a count of the tabs.
//   A press opens a sheet of every tab as a card, to switch, close or long press
//   for the tab's menu; the new tab button moves into the sheet.
import * as React from "react"
import {
  ChevronDownIcon,
  CircleAlertIcon,
  FileIcon,
  IconProvider,
  PinIcon,
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
  useWindowDimensions,
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
  describeTabCount,
  describeTabPosition,
  getTabCountLabel,
  getTabScrollOffset,
  isCompactTabStrip,
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
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/registry/native/ui/drawer"
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
  preview: boolean
  status?: TabStripStatus
  icon?: IconLike
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
  /** On a phone: the strip is its active tab, and the rest are in a switcher. */
  isCompact: boolean
  openSwitcher: () => void
}

const TabStripContext = React.createContext<TabStripContextValue | null>(null)

// The lit tab turns foreground too; only the active one turns semibold.
const tabStripTextVariants = cva("cn-tab-strip-tab-text")
const tabStripLitTextVariants = cva("cn-tab-strip-tab-text-lit")
const tabStripActiveTextVariants = cva("cn-tab-strip-tab-text-active")
// A scroll view's content takes its classes here: the compiler reads className
// and cn() only.
const tabStripSwitcherGridVariants = cva(
  "cn-tab-strip-switcher-grid flex-row flex-wrap"
)
const tabStripCardTextVariants = cva("cn-tab-strip-card-text")
const tabStripCardActiveTextVariants = cva("cn-tab-strip-card-text-active")

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
  const [isSwitcherOpen, setIsSwitcherOpen] = React.useState(false)
  const tabs = React.useRef(new Map<string, TabInfo>())
  const { width } = useWindowDimensions()
  const isCompact = isCompactTabStrip(width)
  // The compact strip draws its tabs from what they registered, so it renders
  // again as they change. The full strip draws each tab where it is.
  const isCompactRef = React.useRef(isCompact)
  isCompactRef.current = isCompact
  const [, refresh] = React.useReducer((count: number) => count + 1, 0)

  const registerTab = React.useCallback((tabValue: string, info: TabInfo) => {
    tabs.current.set(tabValue, info)
    if (isCompactRef.current) refresh()
    return () => {
      tabs.current.delete(tabValue)
      if (isCompactRef.current) refresh()
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
    isCompact,
    openSwitcher: () => setIsSwitcherOpen(true),
  }

  const { density } = useControlSize(size)
  return (
    <TabStripContext value={contextValue}>
      <DensityScope density={density}>
        <View
          data-slot="tab-strip"
          data-size={size}
          data-compact={isCompact}
          className={cn(
            "cn-tab-strip min-w-0 shrink-0 flex-row items-center",
            className
          )}
          {...props}
        >
          {renderTextChildren(children)}
        </View>
        {isCompact && (
          <TabSwitcher
            strip={contextValue}
            open={isSwitcherOpen}
            onOpenChange={setIsSwitcherOpen}
          />
        )}
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

  // The tabs still mount, to register, and draw nothing.
  if (strip.isCompact) {
    return (
      <>
        <CompactTab strip={strip} label={ariaLabel} />
        <FluidHoverProvider fluid={fluid}>
          <TabStripListContext value={context}>{items}</TabStripListContext>
        </FluidHoverProvider>
      </>
    )
  }

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
    () =>
      registerTab(tabValue, {
        index,
        title,
        pinned,
        preview,
        status,
        icon,
        closable,
        actions,
      }),
    [
      registerTab,
      tabValue,
      index,
      title,
      pinned,
      preview,
      status,
      icon,
      closable,
      actions,
    ]
  )

  // The compact strip draws the active tab, and the switcher every tab.
  if (strip.isCompact) return null

  // The primitive's `disabled` turns off its press too, and a tab with no menu
  // still has to select, so it's a plain press.
  const Trigger =
    hasMenuEntries(strip, true) || actions.length > 0
      ? ContextMenuTrigger
      : Pressable
  const content = (
    <IconProvider size={iconSize} strokeWidth={isActive || isLit ? 2 : 1.5}>
      {isRenaming ? (
        <TabRenameInput strip={strip} value={tabValue} title={title} />
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

/** Takes the strip as a prop: the switcher's sheet leaves the React tree. */
function TabRenameInput({
  strip,
  value,
  title,
}: {
  strip: TabStripContextValue
  value: string
  title: string
}) {
  const { onRename, setRenaming } = strip
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
  const { onNew, isCompact } = useTabStrip()
  // On a phone the switcher's sheet has the new tab button.
  if (isCompact) return null
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

/** A menu of every tab, for strips that overflow. A phone's pill holds the count. */
function TabStripOverflow({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { value, onActivate, getTabs, isCompact } = useTabStrip()
  const [order, setOrder] = React.useState<ReturnType<typeof getTabs>>([])
  if (isCompact) return null
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

// MARK: Compact strip

/** The tab's status or its own icon, or a page for a tab without one. */
function TabIcon({ info, size }: { info: TabInfo; size: number }) {
  if (info.status === "loading" || info.status === "error" || info.icon) {
    return <TabStatusIcon status={info.status} icon={info.icon} size={size} />
  }
  return <FileIcon />
}

/**
 * The active tab, on a phone: its icon and name on a raised pill. A press shows
 * every tab; a long press opens the tab's menu.
 */
function CompactTab({
  strip,
  label,
}: {
  strip: TabStripContextValue
  label: string
}) {
  const feedback = useFeedback()
  const [iconToken] = useCSSVariable(["--density-icon-14"])
  const iconSize = parseNumber(iconToken, 14)
  const order = strip.getTabs()
  const index = order.findIndex((tab) => tab.value === strip.value)
  const tab = order[index]
  if (!tab) {
    return <View data-slot="tab-strip-compact" className="min-w-0 flex-1" />
  }
  if (strip.renaming === tab.value) {
    return (
      <View
        data-slot="tab-strip-compact"
        className="cn-tab-strip-compact-tab min-w-0 flex-1 flex-row items-center"
      >
        <TabRenameInput
          strip={strip}
          value={tab.value}
          title={tab.info.title}
        />
      </View>
    )
  }
  const Trigger =
    hasMenuEntries(strip, true) || tab.info.actions.length > 0
      ? ContextMenuTrigger
      : Pressable
  return (
    <ContextMenu
      data-slot="tab-strip-compact"
      data-value={tab.value}
      data-preview={tab.info.preview}
      data-status={tab.info.status}
      className="min-w-0 flex-1 self-stretch"
    >
      <IconProvider size={iconSize} strokeWidth={2}>
        <Trigger
          data-slot="tab-strip-compact-tab"
          role="button"
          accessibilityLabel={describeTabPosition(
            tab.info.title,
            index,
            order.length
          )}
          accessibilityHint={`Shows every tab in ${label}`}
          className="cn-tab-strip-compact-tab min-w-0 flex-1 flex-row items-center"
          onPress={() => {
            feedback("tap")
            strip.openSwitcher()
          }}
        >
          <TextStyle className="cn-tab-strip-compact-text">
            <TabIcon info={tab.info} size={iconSize} />
            <Text
              data-slot="tab-strip-title"
              data-preview={tab.info.preview}
              numberOfLines={1}
              className="cn-tab-strip-title flex-1 shrink"
            >
              {tab.info.title}
            </Text>
            {tab.info.status === "waiting" && (
              <View
                data-slot="tab-strip-waiting"
                className="cn-tab-strip-waiting"
              />
            )}
          </TextStyle>
          <View
            data-slot="tab-strip-count"
            className="cn-tab-strip-count items-center justify-center"
          >
            <Text className="cn-tab-strip-count-text">
              {getTabCountLabel(order.length)}
            </Text>
          </View>
        </Trigger>
      </IconProvider>
      <ContextMenuContent className="cn-tab-strip-menu">
        <TabStripMenuItems strip={strip} tabValue={tab.value} />
      </ContextMenuContent>
    </ContextMenu>
  )
}

/** One tab in the switcher. Takes the strip as a prop: the sheet's portal leaves the tree. */
function TabCard({
  strip,
  tab,
  index,
  count,
  width,
  onPick,
}: {
  strip: TabStripContextValue
  tab: { value: string; info: TabInfo }
  index: number
  count: number
  width: number
  onPick: () => void
}) {
  const feedback = useFeedback()
  const [iconToken, closeToken] = useCSSVariable([
    "--density-icon-16",
    "--density-icon-14",
  ])
  const iconSize = parseNumber(iconToken, 16)
  const closeSize = parseNumber(closeToken, 14)
  const isActive = strip.value === tab.value
  const { title, pinned, preview, closable, actions } = tab.info
  const Trigger =
    hasMenuEntries(strip, true) || actions.length > 0
      ? ContextMenuTrigger
      : Pressable
  return (
    <ContextMenu
      data-slot="tab-strip-card"
      data-value={tab.value}
      data-active={isActive}
      data-pinned={pinned}
      data-preview={preview}
      className="relative"
      style={{ width }}
    >
      <IconProvider size={iconSize} strokeWidth={isActive ? 2 : 1.5}>
        <Trigger
          data-slot="tab-strip-card-trigger"
          data-active={isActive}
          role="tab"
          aria-selected={isActive}
          accessibilityState={{ selected: isActive }}
          accessibilityLabel={describeTabPosition(title, index, count)}
          className="cn-tab-strip-card justify-between"
          onPress={() => {
            feedback("note", { pitch: noteStep(index) })
            strip.onActivate(tab.value)
            onPick()
          }}
        >
          <TextStyle
            className={
              isActive
                ? tabStripCardActiveTextVariants()
                : tabStripCardTextVariants()
            }
          >
            <View className="flex-row items-center gap-1">
              <TabIcon info={tab.info} size={iconSize} />
              {pinned && <PinIcon />}
            </View>
            {strip.renaming === tab.value ? (
              <TabRenameInput strip={strip} value={tab.value} title={title} />
            ) : (
              <Text
                data-slot="tab-strip-title"
                data-active={isActive}
                data-preview={preview}
                numberOfLines={2}
                className="cn-tab-strip-title cn-tab-strip-card-title"
              >
                {title}
              </Text>
            )}
          </TextStyle>
        </Trigger>
      </IconProvider>
      {closable && (
        <Pressable
          data-slot="tab-strip-close"
          role="button"
          accessibilityLabel={`Close ${title}`}
          hitSlop={8}
          className="cn-tab-strip-card-close absolute items-center justify-center"
          onPress={() => {
            feedback("tap")
            strip.onClose?.([tab.value])
          }}
        >
          <TextStyle className="cn-tab-strip-card-text">
            <IconProvider size={closeSize}>
              <XIcon />
            </IconProvider>
          </TextStyle>
        </Pressable>
      )}
      <ContextMenuContent className="cn-tab-strip-menu">
        <TabStripMenuItems strip={strip} tabValue={tab.value} />
      </ContextMenuContent>
    </ContextMenu>
  )
}

const SWITCHER_COLUMNS = 2

/** Every tab as a card, in a sheet from the bottom. */
function TabSwitcher({
  strip,
  open,
  onOpenChange,
}: {
  strip: TabStripContextValue
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [gridWidth, setGridWidth] = React.useState(0)
  // The grid's own gap and inset, from its rule in the style map, size the cards.
  const [gapToken, insetToken] = useCSSVariable([
    "--density-12",
    "--density-16",
  ])
  const gap = parseNumber(gapToken, 12)
  const inset = parseNumber(insetToken, 16)
  const order = strip.getTabs()
  const cardWidth =
    (gridWidth - inset * 2 - gap * (SWITCHER_COLUMNS - 1)) / SWITCHER_COLUMNS
  const close = () => onOpenChange(false)
  return (
    <Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
      <DrawerContent data-slot="tab-strip-switcher">
        <DrawerHeader>
          <DrawerTitle>{describeTabCount(order.length)}</DrawerTitle>
        </DrawerHeader>
        <ScrollView
          role="tablist"
          aria-label="Tabs"
          className="cn-tab-strip-switcher-scroll"
          contentContainerClassName={tabStripSwitcherGridVariants()}
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
        >
          {gridWidth > 0 &&
            order.map((tab, index) => (
              <TabCard
                key={tab.value}
                strip={strip}
                tab={tab}
                index={index}
                count={order.length}
                width={cardWidth}
                onPick={close}
              />
            ))}
        </ScrollView>
        <DrawerFooter className="flex-row">
          {strip.onNew && (
            <Button
              variant="outline"
              className="flex-1"
              onPress={() => {
                strip.onNew?.()
                close()
              }}
            >
              <PlusIcon />
              New tab
            </Button>
          )}
          <DrawerClose render={<Button className="flex-1" />}>Done</DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
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
