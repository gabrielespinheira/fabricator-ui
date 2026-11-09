type FileTreeNode = {
  /** Unique across the whole tree; a full relative path works well. */
  id: string
  name: string
  /** Present, including an empty array, for a folder. */
  children?: readonly FileTreeNode[]
  disabled?: boolean
  /** Ignored or generated files remain interactive, but look quieter. */
  muted?: boolean
}

type FileTreeRow = {
  node: FileTreeNode
  level: number
  parentId: string | null
  position: number
  count: number
  isDisabled: boolean
}

type FileTreeSelectionMode = "single" | "multiple" | "none"

function getFileTreeNavigationTarget(
  rows: readonly FileTreeRow[],
  id: string,
  key: string
) {
  const enabled = rows.filter((row) => !row.isDisabled)
  const index = enabled.findIndex(({ node }) => node.id === id)
  if (key === "Home") return enabled[0]
  if (key === "End") return enabled[enabled.length - 1]
  if (index < 0) return undefined
  if (key === "ArrowUp") return enabled[Math.max(0, index - 1)]
  if (key === "ArrowDown")
    return enabled[Math.min(enabled.length - 1, index + 1)]
  if (key === "ArrowRight") return enabled.find((row) => row.parentId === id)
  if (key === "ArrowLeft")
    return enabled.find((row) => row.node.id === enabled[index].parentId)
  return undefined
}

function getFileTreeTypeaheadTarget(
  rows: readonly FileTreeRow[],
  id: string,
  text: string
) {
  const enabled = rows.filter((row) => !row.isDisabled)
  const index = enabled.findIndex(({ node }) => node.id === id)
  const query = [...text].every((character) => character === text[0])
    ? text[0]
    : text
  const ordered = [...enabled.slice(index + 1), ...enabled.slice(0, index + 1)]
  return ordered.find(({ node }) => node.name.toLowerCase().startsWith(query))
}

function getVisibleFileTreeNodes(
  nodes: readonly FileTreeNode[],
  expandedIds: readonly string[]
): FileTreeRow[] {
  const expanded = new Set(expandedIds)
  const rows: FileTreeRow[] = []
  function visit(
    children: readonly FileTreeNode[],
    level: number,
    parentId: string | null,
    isDisabled: boolean
  ) {
    children.forEach((node, index) => {
      const disabled = isDisabled || Boolean(node.disabled)
      rows.push({
        node,
        level,
        parentId,
        position: index + 1,
        count: children.length,
        isDisabled: disabled,
      })
      if (node.children && expanded.has(node.id))
        visit(node.children, level + 1, node.id, disabled)
    })
  }
  visit(nodes, 1, null, false)
  return rows
}

function getFileTreeSelection(
  rows: readonly FileTreeRow[],
  selectedIds: readonly string[],
  targetId: string,
  {
    mode,
    anchorId,
    range = false,
    toggle = false,
  }: {
    mode: FileTreeSelectionMode
    anchorId?: string | null
    range?: boolean
    toggle?: boolean
  }
): string[] {
  const target = rows.findIndex(({ node }) => node.id === targetId)
  if (mode === "none" || target < 0 || rows[target].isDisabled)
    return [...selectedIds]
  if (mode === "single") return [targetId]
  const anchor = rows.findIndex(({ node }) => node.id === anchorId)
  if (range && anchor >= 0) {
    const ids = rows
      .slice(Math.min(anchor, target), Math.max(anchor, target) + 1)
      .filter((row) => !row.isDisabled)
      .map(({ node }) => node.id)
    return toggle ? [...new Set([...selectedIds, ...ids])] : ids
  }
  if (!toggle) return [targetId]
  return selectedIds.includes(targetId)
    ? selectedIds.filter((id) => id !== targetId)
    : [...selectedIds, targetId]
}

/** Requests only the highest selected ancestors, including collapsed selections. */
function getFileTreeDeleteNodes(
  nodes: readonly FileTreeNode[],
  selectedIds: readonly string[]
): FileTreeNode[] {
  const selected = new Set(selectedIds)
  const result: FileTreeNode[] = []
  function visit(children: readonly FileTreeNode[]) {
    for (const node of children) {
      if (node.disabled) continue
      if (selected.has(node.id)) result.push(node)
      else if (node.children) visit(node.children)
    }
  }
  visit(nodes)
  return result
}

function getFileTreeIconKind(node: FileTreeNode) {
  const name = node.name.toLowerCase()
  if (node.children) {
    if (["app", "apps", "desktop", "mobile"].includes(name)) return "app"
    if (["src", "components", "lib", "hooks"].includes(name))
      return "code-folder"
    if (["public", "assets", "styles", "content"].includes(name))
      return "assets"
    if (["packages", "node_modules"].includes(name)) return "package"
    if (["docs", "scripts", ".github"].includes(name)) return "special-folder"
    return "folder"
  }
  if (name.startsWith(".env") || /(?:config|lock)(?:\.|$)/.test(name))
    return "config"
  if (/\.(tsx|jsx)$/.test(name)) return "react"
  if (/\.(ts|js|mjs|cjs)$/.test(name)) return "code"
  if (/\.(json|jsonc|yaml|yml|toml)$/.test(name)) return "json"
  if (/\.(md|mdx|txt)$/.test(name)) return "markdown"
  if (/\.(css|scss|sass)$/.test(name)) return "style"
  if (/\.(png|jpe?g|svg|webp|gif|ico)$/.test(name)) return "image"
  return "file"
}

/** Removes data from an in-memory tree; the caller still owns persistence and Undo. */
function removeFileTreeNodes(
  nodes: readonly FileTreeNode[],
  ids: readonly string[]
): FileTreeNode[] {
  const removed = new Set(ids)
  function visit(children: readonly FileTreeNode[]): FileTreeNode[] {
    return children
      .filter((node) => !removed.has(node.id))
      .map((node) =>
        node.children ? { ...node, children: visit(node.children) } : node
      )
  }
  return visit(nodes)
}

export {
  getVisibleFileTreeNodes,
  getFileTreeSelection,
  getFileTreeDeleteNodes,
  getFileTreeIconKind,
  getFileTreeNavigationTarget,
  getFileTreeTypeaheadTarget,
  removeFileTreeNodes,
  type FileTreeNode,
  type FileTreeRow,
  type FileTreeSelectionMode,
}
