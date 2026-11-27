// The Canvas's graph: nodes, edges and the changes between them, shared by
// React web and React Native. Every shape here is a structural subset of
// React Flow's (`Node`, `Edge`, `NodeChange`, `EdgeChange`), so data written
// for React Flow drops in and the web engine passes it through without a copy.
// Nothing here draws or touches a platform.

import { type CanvasSide } from "./canvas-geometry"
import { type PaletteColorName, type PaletteRole } from "./palette-model"

type CanvasData = Record<string, unknown>

type CanvasPosition = { x: number; y: number }

type CanvasSize = { width: number; height: number }

type CanvasRect = CanvasPosition & CanvasSize

type CanvasNodeStatus =
  | "idle"
  | "running"
  | "success"
  | "warning"
  | "error"
  | "skipped"

type CanvasNode<
  TData extends CanvasData = CanvasData,
  TType extends string = string,
> = {
  id: string
  type?: TType
  position: CanvasPosition
  data: TData
  width?: number
  height?: number
  /** The size the renderer measured; set by the engine. */
  measured?: Partial<CanvasSize>
  parentId?: string
  /** Keeps a child inside its parent while it drags. */
  extent?: "parent"
  selected?: boolean
  dragging?: boolean
  resizing?: boolean
  hidden?: boolean
  draggable?: boolean
  selectable?: boolean
  connectable?: boolean
  deletable?: boolean
  focusable?: boolean
  zIndex?: number
  /** Run state shown on the node. */
  status?: CanvasNodeStatus
  /** Palette colour for the node's icon tile and accent. */
  color?: PaletteColorName | PaletteRole
  /** A required input is missing; the reason shows in the node's footer. */
  invalid?: string
}

type CanvasEdgeType = "bezier" | "smoothstep" | "step" | "straight"

type CanvasEdge<TData extends CanvasData = CanvasData> = {
  id: string
  source: string
  target: string
  sourceHandle?: string | null
  targetHandle?: string | null
  type?: CanvasEdgeType | (string & {})
  label?: string
  /** Draws data flowing along the edge, for a run in progress. */
  animated?: boolean
  selected?: boolean
  hidden?: boolean
  deletable?: boolean
  selectable?: boolean
  reconnectable?: boolean
  focusable?: boolean
  zIndex?: number
  data?: TData
  /** An arrowhead at the target end; off by default, where ports show the ends. */
  marker?: "arrow" | "none"
}

type CanvasConnection = {
  source: string
  target: string
  sourceHandle: string | null
  targetHandle: string | null
}

type CanvasViewport = { x: number; y: number; zoom: number }

type CanvasHandleKind = "source" | "target"

/** A handle as the model knows it, for validation and keyboard connect. */
type CanvasHandleSpec = {
  id: string | null
  nodeId: string
  kind: CanvasHandleKind
  side: CanvasSide
  /** Value types this target takes; any when unset. */
  accepts?: readonly string[]
  /** The value type this source gives. */
  produces?: string
  /** Most connections the handle takes. */
  max?: number
  label?: string
}

/** The layout fields a change can set without knowing a node's data type. */
type CanvasNodePatch = Partial<Omit<CanvasNode, "id" | "type" | "data">>

type CanvasNodeChange<TNode extends CanvasNode = CanvasNode> =
  | {
      id: string
      type: "dimensions"
      dimensions?: CanvasSize
      resizing?: boolean
      setAttributes?: boolean | "width" | "height"
    }
  | {
      id: string
      type: "position"
      position?: CanvasPosition
      positionAbsolute?: CanvasPosition
      dragging?: boolean
    }
  | { id: string; type: "select"; selected: boolean }
  | { id: string; type: "remove" }
  | { id: string; type: "add"; item: TNode; index?: number }
  | { id: string; type: "replace"; item: TNode }
  | { id: string; type: "update"; item: Partial<TNode> | CanvasNodePatch }
  | { id: string; type: "data"; data: Partial<TNode["data"]>; replace?: false }
  | { id: string; type: "data"; data: TNode["data"]; replace: true }

type CanvasEdgeChange<TEdge extends CanvasEdge = CanvasEdge> =
  | { id: string; type: "select"; selected: boolean }
  | { id: string; type: "remove" }
  | { id: string; type: "add"; item: TEdge; index?: number }
  | { id: string; type: "replace"; item: TEdge }
  | { id: string; type: "update"; item: Partial<TEdge> }
  | {
      id: string
      type: "data"
      data: Partial<NonNullable<TEdge["data"]>>
      replace?: false
    }
  | {
      id: string
      type: "data"
      data: NonNullable<TEdge["data"]>
      replace: true
    }

class CanvasNodeNotFoundError extends Error {
  constructor(id: string) {
    super(`Canvas has no node "${id}".`)
    this.name = "CanvasNodeNotFoundError"
  }
}

function groupChangesById<TChange extends { id: string }>(changes: TChange[]) {
  const byId = new Map<string, TChange[]>()
  for (const change of changes) {
    const list = byId.get(change.id)
    if (list) list.push(change)
    else byId.set(change.id, [change])
  }
  return byId
}

// One pass for nodes and edges, as React Flow does it: a removal wins, a
// replacement swaps the element, everything else patches a copy. Elements
// without a change keep their identity, which memoized nodes rely on.
function applyChanges<
  TElement extends { id: string },
  TChange extends {
    id: string
    type: string
    item?: unknown
  },
>(
  elements: TElement[],
  changes: TChange[],
  applyOne: (element: TElement, change: TChange) => TElement
): TElement[] {
  if (changes.length === 0) return elements
  const byId = groupChangesById(changes)
  const added: { element: TElement; index?: number }[] = []
  const existing = new Set(elements.map((element) => element.id))
  for (const change of changes) {
    if (change.type !== "add" || existing.has(change.id)) continue
    const item = change.item
    if (!isElementLike<TElement>(item)) continue
    added.push({ element: item, index: getChangeIndex(change) })
    existing.add(change.id)
  }

  const next: TElement[] = []
  for (const element of elements) {
    const elementChanges = byId.get(element.id)
    if (!elementChanges) {
      next.push(element)
      continue
    }
    const patched = patchElement(element, elementChanges, applyOne)
    if (patched) next.push(patched)
  }
  for (const { element, index } of added) {
    const elementChanges = byId
      .get(element.id)
      ?.filter((change) => change.type !== "add")
    const patched = elementChanges?.length
      ? patchElement(element, elementChanges, applyOne)
      : element
    if (!patched) continue
    if (index === undefined || index >= next.length) next.push(patched)
    else next.splice(Math.max(0, index), 0, patched)
  }
  return next
}

function isElementLike<TElement>(item: unknown): item is TElement {
  return typeof item === "object" && item !== null && "id" in item
}

function getChangeIndex(change: object) {
  return "index" in change && typeof change.index === "number"
    ? change.index
    : undefined
}

function patchElement<
  TElement,
  TChange extends { type: string; item?: unknown },
>(
  element: TElement,
  changes: TChange[],
  applyOne: (element: TElement, change: TChange) => TElement
): TElement | null {
  let next = element
  for (const change of changes) {
    if (change.type === "remove") return null
    if (change.type === "add") continue
    if (change.type === "replace" && isElementLike<TElement>(change.item)) {
      next = change.item
      continue
    }
    next = applyOne(next, change)
  }
  return next
}

function applyNodeChange<TNode extends CanvasNode>(
  node: TNode,
  change: CanvasNodeChange<TNode>
): TNode {
  switch (change.type) {
    case "select":
      return node.selected === change.selected
        ? node
        : { ...node, selected: change.selected }
    case "position":
      return {
        ...node,
        ...(change.position ? { position: change.position } : {}),
        ...(change.dragging !== undefined ? { dragging: change.dragging } : {}),
      }
    case "dimensions": {
      if (!change.dimensions && change.resizing === undefined) return node
      const next = { ...node }
      if (change.dimensions) {
        next.measured = { ...change.dimensions }
        const attributes = change.setAttributes
        if (attributes === true || attributes === "width")
          next.width = change.dimensions.width
        if (attributes === true || attributes === "height")
          next.height = change.dimensions.height
      }
      if (change.resizing !== undefined) next.resizing = change.resizing
      return next
    }
    case "update":
      return { ...node, ...change.item }
    case "data":
      return {
        ...node,
        data: change.replace ? change.data : { ...node.data, ...change.data },
      }
    default:
      return node
  }
}

function applyEdgeChange<TEdge extends CanvasEdge>(
  edge: TEdge,
  change: CanvasEdgeChange<TEdge>
): TEdge {
  switch (change.type) {
    case "select":
      return edge.selected === change.selected
        ? edge
        : { ...edge, selected: change.selected }
    case "update":
      return { ...edge, ...change.item }
    case "data":
      return {
        ...edge,
        data: change.replace ? change.data : { ...edge.data, ...change.data },
      }
    default:
      return edge
  }
}

function applyCanvasNodeChanges<TNode extends CanvasNode>(
  nodes: TNode[],
  changes: CanvasNodeChange<TNode>[]
): TNode[] {
  return applyChanges(nodes, changes, applyNodeChange)
}

function applyCanvasEdgeChanges<TEdge extends CanvasEdge>(
  edges: TEdge[],
  changes: CanvasEdgeChange<TEdge>[]
): TEdge[] {
  return applyChanges(edges, changes, applyEdgeChange)
}

/** The size a node is drawn at: measured first, then the size it was given. */
function getNodeSize(node: CanvasNode): CanvasSize {
  return {
    width: node.measured?.width ?? node.width ?? 0,
    height: node.measured?.height ?? node.height ?? 0,
  }
}

function indexNodes<TNode extends CanvasNode>(nodes: readonly TNode[]) {
  return new Map(nodes.map((node) => [node.id, node]))
}

/** A node's position on the canvas, adding up its parents' positions. */
function getAbsolutePosition(
  node: CanvasNode,
  nodesById: ReadonlyMap<string, CanvasNode>
): CanvasPosition {
  let x = node.position.x
  let y = node.position.y
  let parentId = node.parentId
  const seen = new Set<string>([node.id])
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = nodesById.get(parentId)
    if (!parent) break
    x += parent.position.x
    y += parent.position.y
    parentId = parent.parentId
  }
  return { x, y }
}

function getNodeRect(
  node: CanvasNode,
  nodesById: ReadonlyMap<string, CanvasNode>
): CanvasRect {
  return { ...getAbsolutePosition(node, nodesById), ...getNodeSize(node) }
}

/** The smallest rect holding every given node; null for none. */
function getNodesBounds(
  nodes: readonly CanvasNode[],
  nodesById: ReadonlyMap<string, CanvasNode> = indexNodes(nodes)
): CanvasRect | null {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const node of nodes) {
    if (node.hidden) continue
    const rect = getNodeRect(node, nodesById)
    minX = Math.min(minX, rect.x)
    minY = Math.min(minY, rect.y)
    maxX = Math.max(maxX, rect.x + rect.width)
    maxY = Math.max(maxY, rect.y + rect.height)
  }
  if (minX === Infinity) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/** Every node inside a node, at any depth. */
function getDescendantIds(
  nodes: readonly CanvasNode[],
  parentIds: Iterable<string>
): Set<string> {
  const childrenByParent = new Map<string, string[]>()
  for (const node of nodes) {
    if (!node.parentId) continue
    const children = childrenByParent.get(node.parentId)
    if (children) children.push(node.id)
    else childrenByParent.set(node.parentId, [node.id])
  }
  const result = new Set<string>()
  const queue = [...parentIds]
  while (queue.length > 0) {
    const id = queue.pop()
    if (id === undefined) break
    for (const child of childrenByParent.get(id) ?? []) {
      if (result.has(child)) continue
      result.add(child)
      queue.push(child)
    }
  }
  return result
}

function getConnectedEdges<TEdge extends CanvasEdge>(
  nodeIds: ReadonlySet<string>,
  edges: readonly TEdge[]
): TEdge[] {
  return edges.filter(
    (edge) => nodeIds.has(edge.source) || nodeIds.has(edge.target)
  )
}

function getIncomers<TNode extends CanvasNode>(
  nodeId: string,
  nodes: readonly TNode[],
  edges: readonly CanvasEdge[]
): TNode[] {
  const ids = new Set(
    edges.filter((edge) => edge.target === nodeId).map((edge) => edge.source)
  )
  return nodes.filter((node) => ids.has(node.id))
}

function getOutgoers<TNode extends CanvasNode>(
  nodeId: string,
  nodes: readonly TNode[],
  edges: readonly CanvasEdge[]
): TNode[] {
  const ids = new Set(
    edges.filter((edge) => edge.source === nodeId).map((edge) => edge.target)
  )
  return nodes.filter((node) => ids.has(node.id))
}

function getEdgeId(connection: CanvasConnection) {
  return `${connection.source}${connection.sourceHandle ?? ""}-${connection.target}${connection.targetHandle ?? ""}`
}

function isSameConnection(edge: CanvasEdge, connection: CanvasConnection) {
  return (
    edge.source === connection.source &&
    edge.target === connection.target &&
    (edge.sourceHandle ?? null) === connection.sourceHandle &&
    (edge.targetHandle ?? null) === connection.targetHandle
  )
}

function hasConnection(
  edges: readonly CanvasEdge[],
  connection: CanvasConnection
) {
  return edges.some((edge) => isSameConnection(edge, connection))
}

/** The edge a connection makes, or null when it already exists. */
function createEdge<TData extends CanvasData = CanvasData>(
  edges: readonly CanvasEdge[],
  connection: CanvasConnection,
  defaults: Partial<CanvasEdge<TData>> = {}
): CanvasEdge<TData> | null {
  if (hasConnection(edges, connection)) return null
  return {
    ...defaults,
    id: getEdgeId(connection),
    source: connection.source,
    target: connection.target,
    ...(connection.sourceHandle
      ? { sourceHandle: connection.sourceHandle }
      : {}),
    ...(connection.targetHandle
      ? { targetHandle: connection.targetHandle }
      : {}),
  }
}

/** A handle's key within its node: its kind and id. */
function getPortKey(
  kind: CanvasHandleKind,
  handleId: string | null | undefined
) {
  return `${kind}:${handleId ?? ""}`
}

/** For each node, the ports (`getPortKey`) at least one edge plugs into. */
function getConnectedPorts(
  edges: readonly CanvasEdge[]
): Map<string, Set<string>> {
  const ports = new Map<string, Set<string>>()
  const add = (nodeId: string, key: string) => {
    const set = ports.get(nodeId)
    if (set) set.add(key)
    else ports.set(nodeId, new Set([key]))
  }
  for (const edge of edges) {
    if (edge.hidden) continue
    add(edge.source, getPortKey("source", edge.sourceHandle))
    add(edge.target, getPortKey("target", edge.targetHandle))
  }
  return ports
}

function isDeletable(element: { deletable?: boolean }) {
  return element.deletable !== false
}

/**
 * The changes that delete nodes and edges: a group takes its children, a node
 * takes its edges, and anything marked `deletable: false` stays.
 */
function getRemovalChanges<TNode extends CanvasNode, TEdge extends CanvasEdge>(
  nodes: readonly TNode[],
  edges: readonly TEdge[],
  { nodeIds, edgeIds }: { nodeIds: Iterable<string>; edgeIds: Iterable<string> }
): {
  nodeChanges: CanvasNodeChange<TNode>[]
  edgeChanges: CanvasEdgeChange<TEdge>[]
} {
  const nodesById = indexNodes(nodes)
  const requested = [...nodeIds].filter((id) => {
    const node = nodesById.get(id)
    return node !== undefined && isDeletable(node)
  })
  const removedNodes = new Set(requested)
  for (const id of getDescendantIds(nodes, requested)) removedNodes.add(id)
  const removedEdges = new Set<string>()
  const edgesById = new Map(edges.map((edge) => [edge.id, edge]))
  for (const id of edgeIds) {
    const edge = edgesById.get(id)
    if (edge && isDeletable(edge)) removedEdges.add(id)
  }
  for (const edge of getConnectedEdges(removedNodes, edges)) {
    removedEdges.add(edge.id)
  }
  return {
    nodeChanges: [...removedNodes].map((id) => ({ id, type: "remove" })),
    edgeChanges: [...removedEdges].map((id) => ({ id, type: "remove" })),
  }
}

function getSelectedIds(
  elements: readonly { id: string; selected?: boolean }[]
) {
  return elements.filter((element) => element.selected).map(({ id }) => id)
}

/** Selects exactly the given ids, deselecting everything else. */
function getSelectionChanges(
  elements: readonly { id: string; selected?: boolean; selectable?: boolean }[],
  ids: ReadonlySet<string>
): { id: string; type: "select"; selected: boolean }[] {
  const changes: { id: string; type: "select"; selected: boolean }[] = []
  for (const element of elements) {
    const isSelected = ids.has(element.id) && element.selectable !== false
    if (Boolean(element.selected) !== isSelected) {
      changes.push({ id: element.id, type: "select", selected: isSelected })
    }
  }
  return changes
}

/**
 * Wraps nodes in a new group node sized to them plus padding. The children
 * keep their place on screen: their positions become relative to the group.
 */
function getGroupChanges<TNode extends CanvasNode>(
  nodes: readonly TNode[],
  ids: readonly string[],
  /** The group node; its position and size are computed. */
  group: TNode,
  padding = 24
): CanvasNodeChange<TNode>[] {
  const nodesById = indexNodes(nodes)
  const members = ids
    .map((id) => nodesById.get(id))
    .filter((node): node is TNode => node !== undefined)
  // Only the outermost selected nodes move; a child keeps its own parent.
  const memberIds = new Set(members.map((node) => node.id))
  const roots = members.filter(
    (node) => !node.parentId || !memberIds.has(node.parentId)
  )
  const bounds = getNodesBounds(roots, nodesById)
  if (!bounds || roots.length === 0) return []
  const position = { x: bounds.x - padding, y: bounds.y - padding }
  const parentId = roots[0].parentId
  const parent = parentId ? nodesById.get(parentId) : undefined
  const parentOrigin = parent
    ? getAbsolutePosition(parent, nodesById)
    : { x: 0, y: 0 }
  const item: TNode = {
    ...group,
    position: {
      x: position.x - parentOrigin.x,
      y: position.y - parentOrigin.y,
    },
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
    parentId,
  }
  const changes: CanvasNodeChange<TNode>[] = [
    // The group goes first, so it draws under its children.
    { id: item.id, type: "add", item, index: 0 },
  ]
  for (const node of roots) {
    const absolute = getAbsolutePosition(node, nodesById)
    changes.push({
      id: node.id,
      type: "update",
      item: {
        parentId: item.id,
        position: { x: absolute.x - position.x, y: absolute.y - position.y },
      },
    })
  }
  return changes
}

/** Removes a group node and puts its children back where they are on screen. */
function getUngroupChanges<TNode extends CanvasNode>(
  nodes: readonly TNode[],
  groupId: string
): CanvasNodeChange<TNode>[] {
  const nodesById = indexNodes(nodes)
  const group = nodesById.get(groupId)
  if (!group) throw new CanvasNodeNotFoundError(groupId)
  const changes: CanvasNodeChange<TNode>[] = []
  for (const node of nodes) {
    if (node.parentId !== groupId) continue
    changes.push({
      id: node.id,
      type: "update",
      item: {
        parentId: group.parentId,
        extent: undefined,
        position: {
          x: node.position.x + group.position.x,
          y: node.position.y + group.position.y,
        },
      },
    })
  }
  changes.push({ id: groupId, type: "remove" })
  return changes
}

/** Raises or lowers nodes above or below every other node. */
function getZOrderChanges<TNode extends CanvasNode>(
  nodes: readonly TNode[],
  ids: readonly string[],
  direction: "front" | "back"
): CanvasNodeChange<TNode>[] {
  const levels = nodes.map((node) => node.zIndex ?? 0)
  const target =
    direction === "front"
      ? Math.max(0, ...levels) + 1
      : Math.min(0, ...levels) - 1
  return ids.map((id) => ({
    id,
    type: "update",
    item: { zIndex: target },
  }))
}

/**
 * Nodes in reading order: rows from top to bottom, start to end inside a
 * row. Nodes whose tops are within `rowTolerance` share a row.
 */
function getReadingOrder<TNode extends CanvasNode>(
  nodes: readonly TNode[],
  rowTolerance = 24
): TNode[] {
  const nodesById = indexNodes(nodes)
  const placed = nodes
    .filter((node) => !node.hidden)
    .map((node) => ({ node, ...getAbsolutePosition(node, nodesById) }))
    .sort((a, b) => a.y - b.y || a.x - b.x)
  const rows: (typeof placed)[] = []
  for (const entry of placed) {
    const row = rows[rows.length - 1]
    if (row && Math.abs(entry.y - row[0].y) <= rowTolerance) row.push(entry)
    else rows.push([entry])
  }
  return rows.flatMap((row) =>
    row.sort((a, b) => a.x - b.x).map(({ node }) => node)
  )
}

export {
  applyCanvasEdgeChanges,
  applyCanvasNodeChanges,
  CanvasNodeNotFoundError,
  createEdge,
  getAbsolutePosition,
  getConnectedEdges,
  getConnectedPorts,
  getDescendantIds,
  getEdgeId,
  getGroupChanges,
  getIncomers,
  getNodeRect,
  getNodesBounds,
  getNodeSize,
  getOutgoers,
  getPortKey,
  getReadingOrder,
  getRemovalChanges,
  getSelectedIds,
  getSelectionChanges,
  getUngroupChanges,
  getZOrderChanges,
  hasConnection,
  indexNodes,
  type CanvasConnection,
  type CanvasData,
  type CanvasEdge,
  type CanvasEdgeChange,
  type CanvasEdgeType,
  type CanvasHandleKind,
  type CanvasHandleSpec,
  type CanvasNode,
  type CanvasNodeChange,
  type CanvasNodePatch,
  type CanvasNodeStatus,
  type CanvasPosition,
  type CanvasRect,
  type CanvasSize,
  type CanvasViewport,
}
