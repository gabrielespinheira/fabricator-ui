"use client"

import * as React from "react"
import { FileTypeIcon } from "@fabricator-ui/icons/files"
import { cn } from "cn"

import {
  getFileTreeDeleteNodes,
  getFileTreeIconKind,
  getFileTreeNavigationTarget,
  getFileTreeSelection,
  getFileTreeTypeaheadTarget,
  getVisibleFileTreeNodes,
  type FileTreeNode,
  type FileTreeRow,
  type FileTreeSelectionMode,
} from "@/registry/bases/__base__/lib/file-tree-model"
import {
  FluidHoverHighlight,
  FluidHoverSelection,
  useFluidHover,
  useMergedRef,
} from "@/registry/bases/__base__/lib/fluid-hover"
import { IconPlaceholder } from "@/app/(create)/components/icon-placeholder"

type FileTreeProps = Omit<
  React.ComponentProps<"div">,
  "children" | "onSelect"
> & {
  nodes: readonly FileTreeNode[]
  selectionMode?: FileTreeSelectionMode
  selectedIds?: readonly string[]
  defaultSelectedIds?: readonly string[]
  onSelectionChange?: (ids: string[]) => void
  expandedIds?: readonly string[]
  defaultExpandedIds?: readonly string[]
  onExpandedChange?: (ids: string[]) => void
  /** Enter or double-click on a file. Selecting does not open it. */
  onOpen?: (node: FileTreeNode) => void
  /** Delete requests, never filesystem mutations. Confirm or offer Undo in the app. */
  onDelete?: (nodes: FileTreeNode[]) => void
  onNodeContextMenu?: (
    node: FileTreeNode,
    event: React.MouseEvent<HTMLDivElement>
  ) => void
  renderIcon?: (node: FileTreeNode, expanded: boolean) => React.ReactNode
  emptyContent?: React.ReactNode
  disabled?: boolean
}

// Hover owns only the two overlays. Moving the pointer must not render every
// file, rebuild its icon, or detach and reattach all the row refs.
function FileTreeSurface({
  selectionMode,
  ref,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  children,
  ...props
}: React.ComponentProps<"div"> & { selectionMode: FileTreeSelectionMode }) {
  const fluid = useFluidHover<HTMLDivElement>({
    items: "[data-slot=file-tree-item]",
    selected:
      selectionMode === "single"
        ? "[data-slot=file-tree-item][data-selected]"
        : undefined,
    gapClick: false,
  })
  const mergedRef = useMergedRef(fluid.attach, ref)
  return (
    <div
      {...props}
      ref={mergedRef}
      data-fluid-hover={fluid.props["data-fluid-hover"]}
      onPointerEnter={(event) => {
        fluid.props.onPointerEnter(event)
        onPointerEnter?.(event)
      }}
      onPointerMove={(event) => {
        fluid.props.onPointerMove(event)
        onPointerMove?.(event)
      }}
      onPointerLeave={(event) => {
        fluid.props.onPointerLeave()
        onPointerLeave?.(event)
      }}
    >
      {selectionMode === "single" && (
        <FluidHoverSelection
          selection={fluid.selection}
          className="cn-file-tree-selection"
        />
      )}
      <FluidHoverHighlight
        hover={fluid.hover}
        className="cn-file-tree-highlight"
      />
      {children}
    </div>
  )
}

function FileTree({
  nodes,
  selectionMode = "single",
  selectedIds: controlledSelectedIds,
  defaultSelectedIds = [],
  onSelectionChange,
  expandedIds: controlledExpandedIds,
  defaultExpandedIds = [],
  onExpandedChange,
  onOpen,
  onDelete,
  onNodeContextMenu,
  renderIcon,
  emptyContent,
  disabled = false,
  className,
  ref,
  onFocusCapture,
  onBlurCapture,
  onPointerEnter,
  onPointerMove,
  onPointerLeave,
  ...props
}: FileTreeProps) {
  const [localSelectedIds, setLocalSelectedIds] =
    React.useState(defaultSelectedIds)
  const [localExpandedIds, setLocalExpandedIds] =
    React.useState(defaultExpandedIds)
  const [focusedId, setFocusedId] = React.useState<string | null>(null)
  const anchorId = React.useRef<string | null>(null)
  const elements = React.useRef(new Map<string, HTMLDivElement>())
  const lastFocusedElement = React.useRef<HTMLDivElement | null>(null)
  const treeElement = React.useRef<HTMLDivElement | null>(null)
  const hasFocus = React.useRef(false)
  const search = React.useRef({ text: "", time: 0 })
  const selectedIds = controlledSelectedIds ?? localSelectedIds
  const expandedIds = controlledExpandedIds ?? localExpandedIds
  const selected = new Set(selectedIds)
  const expanded = new Set(expandedIds)
  const rows = React.useMemo(
    () => getVisibleFileTreeNodes(nodes, expandedIds),
    [nodes, expandedIds]
  )
  const enabledRows = rows.filter((row) => !row.isDisabled)
  const tabId =
    enabledRows.find(({ node }) => node.id === focusedId)?.node.id ??
    enabledRows.find(({ node }) => selected.has(node.id))?.node.id ??
    enabledRows[0]?.node.id

  // Removing a focused file must not strand keyboard focus on the document.
  React.useLayoutEffect(() => {
    if (
      hasFocus.current &&
      lastFocusedElement.current &&
      !lastFocusedElement.current.isConnected
    ) {
      if (tabId) elements.current.get(tabId)?.focus()
      else treeElement.current?.focus()
    }
  })

  function changeSelection(ids: string[]) {
    if (controlledSelectedIds === undefined) setLocalSelectedIds(ids)
    onSelectionChange?.(ids)
  }

  function changeExpanded(ids: string[]) {
    if (controlledExpandedIds === undefined) setLocalExpandedIds(ids)
    onExpandedChange?.(ids)
  }

  function toggleFolder(node: FileTreeNode) {
    if (!node.children) return
    changeExpanded(
      expanded.has(node.id)
        ? expandedIds.filter((id) => id !== node.id)
        : [...expandedIds, node.id]
    )
  }

  function selectNode(id: string, range = false, toggle = false) {
    if (selectionMode === "none") return
    changeSelection(
      getFileTreeSelection(rows, selectedIds, id, {
        mode: selectionMode,
        anchorId: anchorId.current ?? focusedId ?? tabId,
        range,
        toggle,
      })
    )
    if (!range) anchorId.current = id
  }

  function moveFocus(row: FileTreeRow | undefined, event: React.KeyboardEvent) {
    if (!row) return
    if (event.shiftKey && selectionMode === "multiple") {
      anchorId.current ??= focusedId ?? tabId ?? row.node.id
      selectNode(row.node.id, true, event.metaKey || event.ctrlKey)
    } else if (selectionMode === "single" && !event.ctrlKey && !event.metaKey) {
      selectNode(row.node.id)
    }
    elements.current.get(row.node.id)?.focus()
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLDivElement>,
    row: FileTreeRow
  ) {
    if (
      event.defaultPrevented ||
      event.nativeEvent.isComposing ||
      disabled ||
      row.isDisabled
    )
      return
    const { node } = row
    const modifier = event.ctrlKey || event.metaKey
    if (
      modifier &&
      event.key.toLowerCase() === "a" &&
      selectionMode === "multiple"
    ) {
      event.preventDefault()
      changeSelection(enabledRows.map(({ node }) => node.id))
      anchorId.current = node.id
      return
    }
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Home":
      case "End": {
        event.preventDefault()
        moveFocus(getFileTreeNavigationTarget(rows, node.id, event.key), event)
        return
      }
      case "ArrowRight":
        event.preventDefault()
        if (!node.children) return
        if (!expanded.has(node.id)) toggleFolder(node)
        else
          moveFocus(
            getFileTreeNavigationTarget(rows, node.id, event.key),
            event
          )
        return
      case "ArrowLeft":
        event.preventDefault()
        if (node.children && expanded.has(node.id)) toggleFolder(node)
        else
          moveFocus(
            getFileTreeNavigationTarget(rows, node.id, event.key),
            event
          )
        return
      case "Enter":
        event.preventDefault()
        if (node.children) toggleFolder(node)
        else onOpen?.(node)
        return
      case " ":
        event.preventDefault()
        selectNode(node.id, event.shiftKey, selectionMode === "multiple")
        return
      case "Escape":
        if (selectionMode === "none") return
        event.preventDefault()
        changeSelection([])
        anchorId.current = null
        return
      case "Delete":
      case "Backspace": {
        if (!onDelete || selectionMode === "none" || modifier || event.altKey)
          return
        const targets = getFileTreeDeleteNodes(nodes, selectedIds)
        if (targets.length === 0) return
        event.preventDefault()
        onDelete(targets)
        return
      }
      case "*": {
        event.preventDefault()
        const siblings = enabledRows
          .filter(
            (item) => item.parentId === row.parentId && item.node.children
          )
          .map(({ node }) => node.id)
        changeExpanded([...new Set([...expandedIds, ...siblings])])
        return
      }
    }
    if (modifier || event.altKey || event.key.length !== 1) return
    event.preventDefault()
    const time = Date.now()
    const text =
      (time - search.current.time < 500 ? search.current.text : "") +
      event.key.toLowerCase()
    search.current = { text, time }
    moveFocus(getFileTreeTypeaheadTarget(rows, node.id, text), event)
  }

  return (
    <FileTreeSurface
      selectionMode={selectionMode}
      aria-label="Files"
      {...props}
      role="tree"
      aria-multiselectable={selectionMode === "multiple" ? true : undefined}
      aria-disabled={disabled || undefined}
      tabIndex={!disabled && !tabId ? 0 : undefined}
      ref={ref}
      data-slot="file-tree"
      data-selection-mode={selectionMode}
      data-disabled={disabled ? "" : undefined}
      className={cn(
        "cn-file-tree group/file-tree relative isolate flex flex-col overflow-auto outline-none select-none",
        className
      )}
      onPointerEnter={onPointerEnter}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      onFocusCapture={(event) => {
        treeElement.current = event.currentTarget
        hasFocus.current = true
        onFocusCapture?.(event)
      }}
      onBlurCapture={(event) => {
        hasFocus.current = Boolean(
          event.relatedTarget &&
            event.currentTarget.contains(event.relatedTarget)
        )
        onBlurCapture?.(event)
      }}
    >
      {rows.length === 0 && emptyContent}
      {rows.map((row) => {
        const { node } = row
        const isExpanded = expanded.has(node.id)
        const isDisabled = disabled || row.isDisabled
        return (
          <div
            key={node.id}
            ref={(element) => {
              if (element) elements.current.set(node.id, element)
              else elements.current.delete(node.id)
            }}
            role="treeitem"
            aria-label={node.name}
            aria-level={row.level}
            aria-posinset={row.position}
            aria-setsize={row.count}
            aria-selected={
              selectionMode === "none" ? undefined : selected.has(node.id)
            }
            aria-expanded={node.children ? isExpanded : undefined}
            aria-disabled={isDisabled || undefined}
            tabIndex={!isDisabled && tabId === node.id ? 0 : -1}
            data-slot="file-tree-item"
            data-selected={
              selectionMode !== "none" && selected.has(node.id) ? "" : undefined
            }
            data-disabled={isDisabled ? "" : undefined}
            data-muted={node.muted ? "" : undefined}
            className="cn-file-tree-item relative flex shrink-0 items-center outline-none"
            onFocus={(event) => {
              setFocusedId(node.id)
              lastFocusedElement.current = event.currentTarget
            }}
            onKeyDown={(event) => handleKeyDown(event, row)}
            onClick={(event) => {
              if (isDisabled) return
              event.currentTarget.focus()
              const isDisclosure =
                event.target instanceof Element &&
                Boolean(event.target.closest('[data-slot="file-tree-chevron"]'))
              if (isDisclosure) {
                toggleFolder(node)
                return
              }
              selectNode(
                node.id,
                event.shiftKey,
                event.metaKey || event.ctrlKey
              )
              if (
                !event.shiftKey &&
                !event.metaKey &&
                !event.ctrlKey &&
                event.detail < 2
              )
                toggleFolder(node)
            }}
            onDoubleClick={() => {
              if (!isDisabled && !node.children) onOpen?.(node)
            }}
            onContextMenu={(event) => {
              if (isDisabled) return
              event.currentTarget.focus()
              if (!selected.has(node.id)) selectNode(node.id)
              onNodeContextMenu?.(node, event)
            }}
          >
            {Array.from({ length: row.level - 1 }, (_, index) => (
              <span
                key={index}
                aria-hidden
                data-slot="file-tree-guide"
                className="cn-file-tree-guide relative shrink-0 self-stretch"
              />
            ))}
            <span
              aria-hidden
              data-slot="file-tree-chevron"
              data-expanded={isExpanded ? "" : undefined}
              data-folder={node.children ? "" : undefined}
              className="cn-file-tree-chevron flex shrink-0 items-center justify-center"
            >
              {node.children && (
                <IconPlaceholder
                  lucide="ChevronRightIcon"
                  tabler="IconChevronRight"
                  hugeicons="ArrowRight01Icon"
                  phosphor="CaretRightIcon"
                  remixicon="RiArrowRightSLine"
                />
              )}
            </span>
            {renderIcon ? (
              <span
                aria-hidden
                data-slot="file-tree-icon"
                className="cn-file-tree-icon flex shrink-0 items-center justify-center"
              >
                {renderIcon(node, isExpanded)}
              </span>
            ) : (
              <FileTreeIcon node={node} expanded={isExpanded} />
            )}
            <span
              data-slot="file-tree-name"
              className="cn-file-tree-name min-w-0 truncate"
            >
              {node.name}
            </span>
          </div>
        )
      })}
    </FileTreeSurface>
  )
}

function FileTreeIcon({
  node,
  expanded = false,
  className,
  ...props
}: React.ComponentProps<"span"> & { node: FileTreeNode; expanded?: boolean }) {
  const kind = getFileTreeIconKind(node)
  return (
    <span
      {...props}
      aria-hidden
      data-slot="file-tree-icon"
      data-kind={kind}
      data-folder={node.children ? "" : undefined}
      data-expanded={expanded ? "" : undefined}
      className={cn(
        "cn-file-tree-icon relative flex shrink-0 items-center justify-center",
        className
      )}
    >
      <FileTypeIcon
        name={node.name}
        kind={node.children ? "folder" : "file"}
        open={expanded}
        className="size-full"
      />
    </span>
  )
}

export {
  FileTree,
  FileTreeIcon,
  type FileTreeProps,
  type FileTreeNode,
  type FileTreeSelectionMode,
}
