"use client"

// Tab Strip: document tabs, as in a browser or an editor. Tabs are data the
// app owns (value + onValueChange, like Tabs); useTabStripState keeps that
// data for apps without a store of their own.
//
// - Pinned tabs lead and show only their icon; a preview tab is italic.
// - The close button's slot is always reserved, so titles never reflow; a
//   dirty dot turns into the close button on hover.
// - Middle-click closes; double-click or F2 renames.
// - Arrow keys move focus, Delete closes, ⌥⇧← / ⌥⇧→ move the tab.
// - Drag to reorder; dropping inside the pinned run pins.
// - One context menu for the strip: pin, rename, move, close variants,
//   reopen, plus each tab's own actions.
// - Inside an AppShell it registers ⌘T, ⌘W, ⇧⌘T, ⌃Tab, ⇧⌘[ / ⇧⌘] and
//   ⌘1–9, with browser-safe alternatives on the web.
import * as React from "react"
import { cn } from "cn"

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
} from "@/registry/bases/base/lib/app-shell-model"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/base/lib/fluid-hover"
import {
  SortableProvider,
  useSortableItem,
} from "@/registry/bases/base/lib/sortable"
import {
  IconSlot,
  useDragRegionProps,
  useShellShortcut,
  useShortcutLabel,
  type IconLike,
  type ShellShortcut,
} from "@/registry/bases/base/ui/app-shell"
import { Button } from "@/registry/bases/base/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/registry/bases/base/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/registry/bases/base/ui/dropdown-menu"
import { Spinner } from "@/registry/bases/base/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/registry/bases/base/ui/tooltip"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

const TAB = '[role="tab"]'
const TAB_ITEM = '[data-slot="tab-strip-tab"]'

type TabStripAction = {
  id: string
  label: string
  icon?: IconLike
  destructive?: boolean
  separatorBefore?: boolean
  onSelect: () => void
}

type TabStripStatus = "loading" | "error" | "dirty" | "waiting"

/** What the strip knows about each tab, for its menus and shortcuts. */
type TabInfo = {
  title: string
  pinned: boolean
  closable: boolean
  actions: TabStripAction[]
}

type TabStripContextValue = {
  value: string | null
  size: "default" | "sm"
  panelId?: string
  onActivate: (value: string) => void
  onClose?: (values: string[]) => void
  onReorder?: (value: string, index: number) => void
  onPin?: (value: string, pinned: boolean) => void
  onRename?: (value: string, title: string) => void
  onReopen?: () => void
  onNew?: () => void
  renaming: string | null
  setRenaming: (value: string | null) => void
  menuTab: string | null
  setMenuTab: (value: string | null) => void
  isDragging: boolean
  setIsDragging: (isDragging: boolean) => void
  registerTab: (value: string, info: TabInfo) => () => void
  getTabs: () => { value: string; info: TabInfo }[]
  listRef: React.RefObject<HTMLDivElement | null>
  moveBy: (value: string, offset: number) => void
  announce: (message: string) => void
}

const TabStripContext = React.createContext<TabStripContextValue | null>(null)

function useTabStrip() {
  const context = React.useContext(TabStripContext)
  if (!context) {
    throw new Error("Tab Strip parts must be used within a TabStrip.")
  }
  return context
}

const TabIndexContext = React.createContext(0)

/** Tab values in the order they show. */
function getTabOrder(list: HTMLElement | null) {
  if (!list) return []
  return Array.from(
    list.querySelectorAll<HTMLElement>('[data-slot="tab-strip-tab"]')
  ).flatMap((tab) => (tab.dataset.value ? [tab.dataset.value] : []))
}

function TabStrip({
  value,
  onValueChange,
  onClose,
  onReorder,
  onPin,
  onRename,
  onReopen,
  onNew,
  panelId,
  size = "default",
  shortcuts = true,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  /** The active tab. */
  value: string | null
  onValueChange: (value: string) => void
  /** Closes tabs. Without it, tabs have no close button. */
  onClose?: (values: string[]) => void
  /** Moves a tab to its final index. Without it, tabs don't drag. */
  onReorder?: (value: string, index: number) => void
  onPin?: (value: string, pinned: boolean) => void
  onRename?: (value: string, title: string) => void
  onReopen?: () => void
  onNew?: () => void
  /** The id of the element the tabs show (`aria-controls`). */
  panelId?: string
  /** `sm` pins the strip to the compact density. */
  size?: "default" | "sm"
  /** Register the tab shortcuts with the surrounding AppShell. Default true. */
  shortcuts?: boolean
}) {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [renaming, setRenaming] = React.useState<string | null>(null)
  const [menuTab, setMenuTab] = React.useState<string | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [announcement, setAnnouncement] = React.useState("")
  const tabs = React.useRef(new Map<string, TabInfo>())
  const dragRegion = useDragRegionProps()

  const registerTab = React.useCallback((tabValue: string, info: TabInfo) => {
    tabs.current.set(tabValue, info)
    return () => {
      tabs.current.delete(tabValue)
    }
  }, [])

  const getTabs = React.useCallback(
    () =>
      getTabOrder(listRef.current).flatMap((tabValue) => {
        const info = tabs.current.get(tabValue)
        return info ? [{ value: tabValue, info }] : []
      }),
    []
  )

  const announce = React.useCallback((message: string) => {
    setAnnouncement(message)
  }, [])

  const moveBy = React.useCallback(
    (tabValue: string, offset: number) => {
      if (!onReorder) return
      const order = getTabs()
      const index = order.findIndex((tab) => tab.value === tabValue)
      const target = index + offset
      if (index === -1 || target < 0 || target >= order.length) return
      onReorder(tabValue, target)
      const title = order[index]?.info.title ?? tabValue
      announce(describeMove(title, target, order.length))
    },
    [onReorder, getTabs, announce]
  )

  const contextValue: TabStripContextValue = {
    value,
    size,
    panelId,
    onActivate: onValueChange,
    onClose,
    onReorder,
    onPin,
    onRename,
    onReopen,
    onNew,
    renaming,
    setRenaming,
    menuTab,
    setMenuTab,
    isDragging,
    setIsDragging,
    registerTab,
    getTabs,
    listRef,
    moveBy,
    announce,
  }

  return (
    <TabStripContext.Provider value={contextValue}>
      <div
        data-slot="tab-strip"
        data-size={size}
        {...dragRegion}
        className={cn(
          "cn-tab-strip flex min-w-0 shrink-0 items-center",
          className
        )}
        {...props}
      >
        {children}
        <div role="status" aria-live="polite" className="sr-only">
          {announcement}
        </div>
      </div>
      {shortcuts && <TabStripShortcuts />}
    </TabStripContext.Provider>
  )
}

function ShortcutBinding({
  shortcut,
  enabled = true,
  onPress,
}: {
  shortcut: ShellShortcut
  enabled?: boolean
  onPress: () => void
}) {
  useShellShortcut({ ...shortcut, enabled }, onPress)
  return null
}

const POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9]

function TabStripShortcuts() {
  const { value, onActivate, onClose, onReopen, onNew, getTabs } = useTabStrip()
  const activeInfo = () => getTabs().find((tab) => tab.value === value)?.info

  const step = (direction: 1 | -1) => () => {
    const order = getTabs()
    if (order.length === 0) return
    const index = order.findIndex((tab) => tab.value === value)
    const next = order[(index + direction + order.length) % order.length]
    if (next) onActivate(next.value)
  }

  return (
    <>
      <ShortcutBinding
        shortcut={{
          id: "tabs.new",
          keys: "mod+t",
          webKeys: "alt+mod+t",
          label: "New tab",
        }}
        enabled={onNew !== undefined}
        onPress={() => onNew?.()}
      />
      <ShortcutBinding
        shortcut={{
          id: "tabs.close",
          keys: "mod+w",
          webKeys: "alt+mod+w",
          label: "Close tab",
        }}
        enabled={onClose !== undefined}
        onPress={() => {
          if (value && activeInfo()?.closable) onClose?.([value])
        }}
      />
      <ShortcutBinding
        shortcut={{
          id: "tabs.reopen",
          keys: "shift+mod+t",
          webKeys: "alt+shift+mod+t",
          label: "Reopen closed tab",
        }}
        enabled={onReopen !== undefined}
        onPress={() => onReopen?.()}
      />
      <ShortcutBinding
        shortcut={{
          id: "tabs.next",
          keys: "ctrl+tab",
          webKeys: null,
          label: "Next tab",
        }}
        onPress={step(1)}
      />
      <ShortcutBinding
        shortcut={{
          id: "tabs.previous",
          keys: "ctrl+shift+tab",
          webKeys: null,
          label: "Previous tab",
        }}
        onPress={step(-1)}
      />
      <ShortcutBinding
        shortcut={{
          id: "tabs.next-bracket",
          keys: "shift+mod+]",
          webKeys: "alt+shift+]",
          label: "Next tab",
        }}
        onPress={step(1)}
      />
      <ShortcutBinding
        shortcut={{
          id: "tabs.previous-bracket",
          keys: "shift+mod+[",
          webKeys: "alt+shift+[",
          label: "Previous tab",
        }}
        onPress={step(-1)}
      />
      {POSITIONS.map((position) => (
        <ShortcutBinding
          key={position}
          shortcut={{
            id: `tabs.select-${position}`,
            keys: `mod+${position}`,
            webKeys: `alt+${position}`,
            label: position === 9 ? "Last tab" : `Tab ${position}`,
          }}
          onPress={() => {
            const order = getTabs()
            const tab = position === 9 ? order.at(-1) : order[position - 1]
            if (tab) onActivate(tab.value)
          }}
        />
      ))}
    </>
  )
}

function TabStripList({
  className,
  children,
  "aria-label": ariaLabel = "Tabs",
  ...props
}: React.ComponentProps<"div">) {
  const strip = useTabStrip()
  const {
    listRef,
    onReorder,
    setIsDragging,
    isDragging,
    value,
    setMenuTab,
    announce,
    getTabs,
  } = strip
  const [isMenuOpen, setIsMenuOpen] = React.useState(false)
  // The highlight and the active pill cover the whole tab, close button
  // included.
  const fluid = useFluidHover<HTMLDivElement>({
    items: TAB_ITEM,
    selected: `${TAB_ITEM}[data-active]`,
    axis: "x",
  })
  const mergedRef = useMergedRef(fluid.attach, listRef)

  // Keep the active tab in view, without scrollIntoView moving the page.
  React.useEffect(() => {
    const list = listRef.current
    if (!list || !value) return
    const tab = Array.from(
      list.querySelectorAll<HTMLElement>('[data-slot="tab-strip-tab"]')
    ).find((element) => element.dataset.value === value)
    if (!tab) return
    const start = tab.offsetLeft
    const end = start + tab.offsetWidth
    if (start < list.scrollLeft) list.scrollLeft = start
    else if (end > list.scrollLeft + list.clientWidth) {
      list.scrollLeft = end - list.clientWidth
    }
  }, [listRef, value])

  // Each tab learns its position for dragging. Keyed by the tab's own key,
  // so reordering moves tabs instead of remounting them.
  const items = React.Children.toArray(children).map((child, index) => (
    <TabIndexContext.Provider
      key={
        React.isValidElement(child) && child.key !== null ? child.key : index
      }
      value={index}
    >
      {child}
    </TabIndexContext.Provider>
  ))

  return (
    <SortableProvider
      axis="x"
      onDraggingChange={setIsDragging}
      onMove={(move) => {
        onReorder?.(move.id, move.toIndex)
        const order = getTabs()
        const title =
          order.find((tab) => tab.value === move.id)?.info.title ?? move.id
        announce(describeMove(title, move.toIndex, order.length))
      }}
    >
      <ContextMenu
        open={isMenuOpen}
        onOpenChange={(open, details) => {
          if (!open) {
            // The tab stays until the next open, so the items don't change
            // while the menu animates out.
            setIsMenuOpen(false)
            return
          }
          const target = details.event.target
          const tab =
            target instanceof Element
              ? target.closest<HTMLElement>('[data-slot="tab-strip-tab"]')
              : null
          const tabValue = tab?.dataset.value ?? null
          setMenuTab(tabValue)
          // Nothing to offer here: no menu at all, rather than an empty one.
          setIsMenuOpen(hasMenuEntries(strip, tabValue))
        }}
      >
        <ContextMenuTrigger
          render={
            <div
              ref={mergedRef}
              role="tablist"
              aria-orientation="horizontal"
              aria-label={ariaLabel}
              data-slot="tab-strip-list"
              data-dragging={isDragging ? "" : undefined}
              {...fluid.props}
              className={cn(
                "cn-tab-strip-list relative isolate flex min-w-0 flex-1 items-center overflow-x-auto overscroll-x-contain",
                className
              )}
              {...props}
            />
          }
        >
          <FluidHoverSelection
            selection={fluid.selection}
            className="cn-tab-strip-selection"
          />
          <FluidHoverHighlight hover={fluid.hover} />
          {items}
        </ContextMenuTrigger>
        <TabStripMenu />
      </ContextMenu>
    </SortableProvider>
  )
}

/** Whether the strip's menu has anything for this tab (or the empty strip). */
function hasMenuEntries(strip: TabStripContextValue, tabValue: string | null) {
  const tab = strip.getTabs().find((entry) => entry.value === tabValue)
  if (tab) {
    return Boolean(
      strip.onPin ||
        strip.onRename ||
        strip.onReorder ||
        strip.onClose ||
        strip.onReopen ||
        tab.info.actions.length > 0
    )
  }
  return Boolean(strip.onNew || strip.onReopen)
}

function TabStripMenu() {
  const {
    menuTab,
    getTabs,
    onClose,
    onReorder,
    onPin,
    onRename,
    onReopen,
    onNew,
    setRenaming,
    moveBy,
  } = useTabStrip()
  const closeLabel = useShortcutLabel({ keys: "mod+w", webKeys: "alt+mod+w" })
  const reopenLabel = useShortcutLabel({
    keys: "shift+mod+t",
    webKeys: "alt+shift+mod+t",
  })
  const newLabel = useShortcutLabel({ keys: "mod+t", webKeys: "alt+mod+t" })

  const order = getTabs()
  const index = order.findIndex((tab) => tab.value === menuTab)
  const tab = order[index]
  const unpinned = (list: typeof order) =>
    list.filter((entry) => !entry.info.pinned).map((entry) => entry.value)

  // Groups render with a separator between each pair that exists.
  const groups: React.ReactNode[] = []
  if (tab && (onPin || onRename || onReorder)) {
    groups.push(
      <ContextMenuGroup key="tab">
        {onPin && (
          <ContextMenuItem onClick={() => onPin(tab.value, !tab.info.pinned)}>
            {tab.info.pinned ? "Unpin" : "Pin"}
          </ContextMenuItem>
        )}
        {onRename && (
          <ContextMenuItem onClick={() => setRenaming(tab.value)}>
            Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
        )}
        {onReorder && (
          <>
            <ContextMenuItem
              disabled={index <= 0}
              onClick={() => moveBy(tab.value, -1)}
            >
              Move left
            </ContextMenuItem>
            <ContextMenuItem
              disabled={index >= order.length - 1}
              onClick={() => moveBy(tab.value, 1)}
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
          <ContextMenuItem onClick={() => onClose([tab.value])}>
            Close
            {closeLabel && (
              <ContextMenuShortcut>{closeLabel}</ContextMenuShortcut>
            )}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          onClick={() =>
            onClose(unpinned(order).filter((entry) => entry !== tab.value))
          }
        >
          Close others
        </ContextMenuItem>
        <ContextMenuItem
          disabled={index >= order.length - 1}
          onClick={() => onClose(unpinned(order.slice(index + 1)))}
        >
          Close to the right
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onClose(unpinned(order))}>
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
              onClick={action.onSelect}
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
        <ContextMenuItem onClick={onNew}>
          New tab
          {newLabel && <ContextMenuShortcut>{newLabel}</ContextMenuShortcut>}
        </ContextMenuItem>
      </ContextMenuGroup>
    )
  }
  if (onReopen) {
    groups.push(
      <ContextMenuGroup key="reopen">
        <ContextMenuItem onClick={onReopen}>
          Reopen closed tab
          {reopenLabel && (
            <ContextMenuShortcut>{reopenLabel}</ContextMenuShortcut>
          )}
        </ContextMenuItem>
      </ContextMenuGroup>
    )
  }

  return (
    <ContextMenuContent className="cn-tab-strip-menu">
      {groups.map((group, groupIndex) => (
        <React.Fragment key={groupIndex}>
          {groupIndex > 0 && <ContextMenuSeparator />}
          {group}
        </React.Fragment>
      ))}
    </ContextMenuContent>
  )
}

function getText(node: React.ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node)
  if (Array.isArray(node)) return node.map(getText).join("")
  return ""
}

function TabStatusIcon({
  status,
  icon,
}: {
  status?: TabStripStatus
  icon?: IconLike
}) {
  if (status === "loading") {
    return <Spinner data-slot="tab-strip-spinner" />
  }
  if (status === "error") {
    return (
      <span data-slot="tab-strip-error" className="cn-tab-strip-error">
        <IconPlaceholder
          lucide="CircleAlertIcon"
          tabler="IconAlertCircle"
          hugeicons="AlertCircleIcon"
          phosphor="WarningCircleIcon"
          remixicon="RiErrorWarningLine"
        />
      </span>
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
  actions = [],
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
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
  /** Extra items for this tab's context menu. */
  actions?: TabStripAction[]
}) {
  const strip = useTabStrip()
  const index = React.useContext(TabIndexContext)
  const isActive = strip.value === tabValue
  const title = titleProp ?? getText(children)
  const closable = (closableProp ?? !pinned) && strip.onClose !== undefined
  const isRenaming = strip.renaming === tabValue
  const { attach, isDragging } = useSortableItem({
    id: tabValue,
    index,
    disabled: !strip.onReorder || isRenaming,
  })
  const tabId = `${React.useId()}-tab`

  const { registerTab } = strip
  React.useLayoutEffect(
    () => registerTab(tabValue, { title, pinned, closable, actions }),
    [registerTab, tabValue, title, pinned, closable, actions]
  )

  const close = () => {
    if (closable) strip.onClose?.([tabValue])
  }

  const focusSibling = (
    current: HTMLElement,
    pick: (tabs: HTMLElement[], index: number) => HTMLElement | undefined
  ) => {
    const list = current.closest('[data-slot="tab-strip-list"]')
    if (!list) return
    const tabs = Array.from(list.querySelectorAll<HTMLElement>(TAB))
    pick(tabs, tabs.indexOf(current))?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const current = event.currentTarget
    if (event.altKey && event.shiftKey) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault()
        strip.moveBy(tabValue, event.key === "ArrowLeft" ? -1 : 1)
      }
      return
    }
    switch (event.key) {
      case "ArrowRight":
        event.preventDefault()
        focusSibling(current, (tabs, at) => tabs[(at + 1) % tabs.length])
        break
      case "ArrowLeft":
        event.preventDefault()
        focusSibling(
          current,
          (tabs, at) => tabs[(at - 1 + tabs.length) % tabs.length]
        )
        break
      case "Home":
        event.preventDefault()
        focusSibling(current, (tabs) => tabs[0])
        break
      case "End":
        event.preventDefault()
        focusSibling(current, (tabs) => tabs.at(-1))
        break
      case "Delete":
        event.preventDefault()
        close()
        break
      case "F2":
        if (strip.onRename) {
          event.preventDefault()
          strip.setRenaming(tabValue)
        }
        break
    }
  }

  const trigger = (
    <button
      type="button"
      role="tab"
      id={tabId}
      aria-selected={isActive}
      aria-controls={strip.panelId}
      aria-keyshortcuts={closable ? "Delete" : undefined}
      // Roving focus: only the active tab is in the tab order.
      tabIndex={isActive || (strip.value === null && index === 0) ? 0 : -1}
      data-slot="tab-strip-trigger"
      onClick={() => strip.onActivate(tabValue)}
      onMouseDown={(event) => {
        // A middle press would start autoscroll.
        if (event.button === 1) event.preventDefault()
      }}
      onAuxClick={(event) => {
        if (event.button === 1) close()
      }}
      onDoubleClick={() => {
        if (strip.onRename && !pinned) strip.setRenaming(tabValue)
      }}
      onKeyDown={handleKeyDown}
      className="cn-tab-strip-trigger flex min-w-0 flex-1 items-center outline-none"
    >
      <TabStatusIcon status={status} icon={icon} />
      <span
        data-slot="tab-strip-title"
        className={cn("cn-tab-strip-title truncate", pinned && "sr-only")}
      >
        {children}
      </span>
      {status === "waiting" && (
        <span data-slot="tab-strip-waiting" className="cn-tab-strip-waiting" />
      )}
    </button>
  )

  return (
    <div
      ref={attach}
      role="presentation"
      data-slot="tab-strip-tab"
      data-value={tabValue}
      data-active={isActive ? "" : undefined}
      data-pinned={pinned ? "" : undefined}
      data-preview={preview ? "" : undefined}
      data-status={status}
      data-closable={closable ? "" : undefined}
      data-dragging={isDragging ? "" : undefined}
      className={cn(
        "cn-tab-strip-tab group/tab-strip-tab relative flex shrink-0 items-center",
        className
      )}
      {...props}
    >
      {isRenaming ? (
        <TabRenameInput value={tabValue} title={title} />
      ) : pinned ? (
        <Tooltip>
          <TooltipTrigger render={trigger} />
          <TooltipContent>{title}</TooltipContent>
        </Tooltip>
      ) : (
        trigger
      )}
      {closable && !isRenaming && (
        <span
          data-slot="tab-strip-close-slot"
          className="cn-tab-strip-close-slot"
        >
          {status === "dirty" && (
            <span data-slot="tab-strip-dirty" className="cn-tab-strip-dirty" />
          )}
          {/* Pointer only: keyboard users close with Delete or ⌘W. */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            title="Close"
            data-slot="tab-strip-close"
            data-sortable-ignore=""
            onClick={close}
            className="cn-tab-strip-close"
          >
            <IconPlaceholder
              lucide="XIcon"
              tabler="IconX"
              hugeicons="Cancel01Icon"
              phosphor="XIcon"
              remixicon="RiCloseLine"
            />
          </button>
        </span>
      )}
    </div>
  )
}

function TabRenameInput({ value, title }: { value: string; title: string }) {
  const { onRename, setRenaming } = useTabStrip()
  const [draft, setDraft] = React.useState(title)
  const isDone = React.useRef(false)
  const finish = (save: boolean) => {
    if (isDone.current) return
    isDone.current = true
    const next = draft.trim()
    if (save && next && next !== title) onRename?.(value, next)
    setRenaming(null)
    // Give focus back to the tab.
    requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          `[data-slot="tab-strip-tab"][data-value="${CSS.escape(value)}"] [role="tab"]`
        )
        ?.focus()
    })
  }
  return (
    <input
      autoFocus
      aria-label="Tab name"
      value={draft}
      data-slot="tab-strip-rename"
      data-sortable-ignore=""
      onChange={(event) => setDraft(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => finish(true)}
      onKeyDown={(event) => {
        if (event.key === "Enter") finish(true)
        if (event.key === "Escape") finish(false)
      }}
      className="cn-tab-strip-rename min-w-0 flex-1 outline-none"
    />
  )
}

function TabStripNew({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { onNew } = useTabStrip()
  const label = useShortcutLabel({ keys: "mod+t", webKeys: "alt+mod+t" })
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="New tab"
            data-slot="tab-strip-new"
            onClick={onNew}
            className={cn("cn-tab-strip-new", className)}
            {...props}
          />
        }
      >
        {children ?? (
          <IconPlaceholder
            lucide="PlusIcon"
            tabler="IconPlus"
            hugeicons="PlusSignIcon"
            phosphor="PlusIcon"
            remixicon="RiAddLine"
          />
        )}
      </TooltipTrigger>
      <TooltipContent>
        New tab
        {label && <span className="cn-tab-strip-shortcut">{label}</span>}
      </TooltipContent>
    </Tooltip>
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
            aria-label="All tabs"
            data-slot="tab-strip-overflow"
            className={cn("cn-tab-strip-overflow", className)}
            {...props}
          />
        }
      >
        <IconPlaceholder
          lucide="ChevronDownIcon"
          tabler="IconChevronDown"
          hugeicons="ArrowDown01Icon"
          phosphor="CaretDownIcon"
          remixicon="RiArrowDownSLine"
        />
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
              <DropdownMenuRadioItem key={tab.value} value={tab.value}>
                <span className="truncate">{tab.info.title}</span>
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
  /** Saves the strip (createLocalStorage from app-shell, or your own). */
  storage?: ShellStorage
  /** Names the saved strip: `app-shell.<storageKey>.tabs`. */
  storageKey?: string
} = {}) {
  const [state, setState] = React.useState(defaultState)
  const key = storageKey ? getShellStorageKey(storageKey, "tabs") : null

  // Adopt the saved strip after mounting, so the server render matches.
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
