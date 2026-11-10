import * as React from "react"
import { ChevronRightIcon } from "@fabricator-ui/icons-react-native"
import { FileTypeIcon } from "@fabricator-ui/icons-react-native/files"
import { cva } from "class-variance-authority"
import { cn } from "cn"
import { Pressable, View, type GestureResponderEvent } from "react-native"

import {
  getFileTreeDeleteNodes,
  getFileTreeIconKind,
  getFileTreeSelection,
  getVisibleFileTreeNodes,
  type FileTreeNode,
  type FileTreeSelectionMode,
} from "@/registry/fabricator/shared/lib/file-tree-model"
import { FluidHoverList, useFluidRow } from "@/registry/native/lib/fluid-hover"
import { Text } from "@/registry/native/ui/text"

const highlightVariants = cva("cn-file-tree-highlight")
const selectionVariants = cva("cn-file-tree-selection")

type FileTreeProps = Omit<
  React.ComponentProps<typeof View>,
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
  onOpen?: (node: FileTreeNode) => void
  onDelete?: (nodes: FileTreeNode[]) => void
  onNodeContextMenu?: (node: FileTreeNode, event: GestureResponderEvent) => void
  renderIcon?: (node: FileTreeNode, expanded: boolean) => React.ReactNode
  emptyContent?: React.ReactNode
  disabled?: boolean
}
function FileTreeEntry({
  itemKey,
  disabled,
  ...props
}: React.ComponentProps<typeof Pressable> & { itemKey: string }) {
  const { rowProps } = useFluidRow({ itemKey, disabled })
  return (
    <Pressable
      {...props}
      disabled={disabled}
      {...rowProps}
      unstable_pressDelay={0}
    />
  )
}
function FileTree({
  nodes,
  selectionMode = "single",
  selectedIds,
  defaultSelectedIds = [],
  onSelectionChange,
  expandedIds,
  defaultExpandedIds = [],
  onExpandedChange,
  onOpen,
  onDelete,
  onNodeContextMenu,
  renderIcon,
  emptyContent,
  disabled = false,
  className,
  ...props
}: FileTreeProps) {
  const [localSelection, setLocalSelection] = React.useState(defaultSelectedIds)
  const [localExpanded, setLocalExpanded] = React.useState(defaultExpandedIds)
  const selected = selectedIds ?? localSelection
  const expanded = expandedIds ?? localExpanded
  const rows = React.useMemo(
    () => getVisibleFileTreeNodes(nodes, expanded),
    [nodes, expanded]
  )
  const lastPress = React.useRef({ id: "", at: 0 })
  function toggle(id: string) {
    const next = expanded.includes(id)
      ? expanded.filter((entry) => entry !== id)
      : [...expanded, id]
    if (expandedIds === undefined) setLocalExpanded(next)
    onExpandedChange?.(next)
  }
  return (
    <FluidHoverList
      selected={selectionMode === "single" ? selected[0] : undefined}
      highlightClassName={highlightVariants()}
      selectionClassName={selectionVariants()}
      data-slot="file-tree"
      data-disabled={disabled}
      className={cn("cn-file-tree w-full", className)}
      {...props}
    >
      {rows.length === 0
        ? (emptyContent ?? (
            <Text className="text-muted-foreground">No files.</Text>
          ))
        : rows.map(({ node, level, isDisabled }) => {
            const isExpanded = expanded.includes(node.id)
            const isSelected = selected.includes(node.id)
            return (
              <FileTreeEntry
                itemKey={node.id}
                key={node.id}
                data-slot="file-tree-item"
                data-disabled={disabled || isDisabled}
                data-muted={node.muted}
                accessibilityRole="button"
                accessibilityLabel={node.name}
                accessibilityState={{
                  selected: isSelected,
                  disabled: disabled || isDisabled,
                  ...(node.children && { expanded: isExpanded }),
                }}
                disabled={disabled || isDisabled}
                className={cn(
                  "cn-file-tree-item min-h-11 flex-row items-center rounded-md px-2 active:bg-hover",
                  isSelected && selectionMode === "multiple" && "bg-active"
                )}
                style={{ paddingLeft: level * 20 + 4 }}
                onPress={() => {
                  const next = getFileTreeSelection(rows, selected, node.id, {
                    mode: selectionMode,
                    toggle: selectionMode === "multiple",
                  })
                  if (selectedIds === undefined) setLocalSelection(next)
                  onSelectionChange?.(next)
                  const now = Date.now()
                  if (
                    lastPress.current.id === node.id &&
                    now - lastPress.current.at < 350
                  ) {
                    if (node.children) toggle(node.id)
                    else onOpen?.(node)
                  }
                  lastPress.current = { id: node.id, at: now }
                }}
                onLongPress={(event) => onNodeContextMenu?.(node, event)}
                accessibilityActions={[
                  ...(onOpen ? [{ name: "activate", label: "Open" }] : []),
                  ...(onDelete ? [{ name: "delete", label: "Delete" }] : []),
                ]}
                onAccessibilityAction={(event) => {
                  if (event.nativeEvent.actionName === "delete")
                    onDelete?.(
                      getFileTreeDeleteNodes(
                        nodes,
                        isSelected ? selected : [node.id]
                      )
                    )
                  else if (node.children) toggle(node.id)
                  else onOpen?.(node)
                }}
              >
                {Array.from({ length: level }, (_, index) => (
                  <View
                    key={index}
                    pointerEvents="none"
                    data-slot="file-tree-guide"
                    className="cn-file-tree-guide absolute inset-y-0 border-l border-border"
                    style={{ left: index * 20 + 16 }}
                  />
                ))}
                {node.children ? (
                  <Pressable
                    data-slot="file-tree-chevron"
                    accessibilityRole="button"
                    accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} ${node.name}`}
                    className="cn-file-tree-chevron min-h-11 w-6 items-center justify-center"
                    onPress={(event) => {
                      event.stopPropagation()
                      toggle(node.id)
                    }}
                  >
                    <ChevronRightIcon
                      size={14}
                      style={{
                        transform: [{ rotate: isExpanded ? "90deg" : "0deg" }],
                      }}
                    />
                  </Pressable>
                ) : (
                  <View className="w-6" />
                )}
                {renderIcon ? (
                  renderIcon(node, isExpanded)
                ) : (
                  <FileTreeIcon node={node} expanded={isExpanded} />
                )}
                <Text
                  data-slot="file-tree-name"
                  numberOfLines={1}
                  className={cn(
                    "cn-file-tree-name flex-1",
                    node.muted && "text-muted-foreground"
                  )}
                >
                  {node.name}
                </Text>
              </FileTreeEntry>
            )
          })}
    </FluidHoverList>
  )
}
function FileTreeIcon({
  node,
  expanded = false,
  className,
  ...props
}: React.ComponentProps<typeof View> & {
  node: FileTreeNode
  expanded?: boolean
}) {
  return (
    <View
      data-slot="file-tree-icon"
      data-kind={getFileTreeIconKind(node)}
      data-folder={Boolean(node.children)}
      data-expanded={expanded}
      className={cn("cn-file-tree-icon items-center justify-center", className)}
      {...props}
    >
      <FileTypeIcon
        name={node.name}
        kind={node.children ? "folder" : "file"}
        open={expanded}
        size={18}
      />
    </View>
  )
}
export {
  FileTree,
  FileTreeIcon,
  type FileTreeProps,
  type FileTreeNode,
  type FileTreeSelectionMode,
}
