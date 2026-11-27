// Copy, paste and duplicate for the Canvas. A copied selection is versioned
// JSON, so it pastes into another canvas, another tab or another app built
// with the Canvas. Pasted elements get new ids, keep their connections to
// each other and land at the pointer, or a step down and across.

import {
  getAbsolutePosition,
  getDescendantIds,
  getNodesBounds,
  indexNodes,
  type CanvasEdge,
  type CanvasNode,
  type CanvasPosition,
} from "./canvas-model"

const CANVAS_CLIPBOARD_VERSION = 1
const CANVAS_CLIPBOARD_KIND = "fabricator-canvas"
/** How far a paste without a target lands from what was copied. */
const PASTE_OFFSET = 24

type CanvasClipboard<
  TNode extends CanvasNode = CanvasNode,
  TEdge extends CanvasEdge = CanvasEdge,
> = {
  kind: typeof CANVAS_CLIPBOARD_KIND
  version: typeof CANVAS_CLIPBOARD_VERSION
  nodes: TNode[]
  edges: TEdge[]
}

function stripTransient<
  TElement extends { selected?: boolean; dragging?: boolean },
>(element: TElement): TElement {
  return { ...element, selected: undefined, dragging: undefined }
}

/**
 * The selected nodes, everything inside selected groups, and the edges whose
 * both ends are copied. A node copied without its parent gets its canvas
 * position and no parent.
 */
function copyCanvasSelection<
  TNode extends CanvasNode,
  TEdge extends CanvasEdge,
>(
  nodes: readonly TNode[],
  edges: readonly TEdge[],
  nodeIds: readonly string[]
): CanvasClipboard<TNode, TEdge> | null {
  if (nodeIds.length === 0) return null
  const nodesById = indexNodes(nodes)
  const copied = new Set(nodeIds.filter((id) => nodesById.has(id)))
  for (const id of getDescendantIds(nodes, copied)) copied.add(id)
  const copiedNodes: TNode[] = []
  for (const node of nodes) {
    if (!copied.has(node.id)) continue
    const isOrphan = node.parentId !== undefined && !copied.has(node.parentId)
    copiedNodes.push(
      stripTransient(
        isOrphan
          ? {
              ...node,
              parentId: undefined,
              extent: undefined,
              position: getAbsolutePosition(node, nodesById),
            }
          : node
      )
    )
  }
  const copiedEdges = edges
    .filter((edge) => copied.has(edge.source) && copied.has(edge.target))
    .map(stripTransient)
  return {
    kind: CANVAS_CLIPBOARD_KIND,
    version: CANVAS_CLIPBOARD_VERSION,
    nodes: copiedNodes,
    edges: copiedEdges,
  }
}

function serializeCanvasClipboard(clipboard: CanvasClipboard) {
  return JSON.stringify(clipboard)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isNodeShape(value: unknown): value is CanvasNode {
  if (!isRecord(value)) return false
  const position = value.position
  return (
    typeof value.id === "string" &&
    isRecord(position) &&
    typeof position.x === "number" &&
    typeof position.y === "number" &&
    isRecord(value.data)
  )
}

function isEdgeShape(value: unknown): value is CanvasEdge {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.source === "string" &&
    typeof value.target === "string"
  )
}

/**
 * Reads clipboard text. Text that isn't a Canvas selection (a sentence, a
 * newer version) returns null, so paste falls through to the page.
 */
function parseCanvasClipboard(text: string): CanvasClipboard | null {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    return null
  }
  if (
    !isRecord(value) ||
    value.kind !== CANVAS_CLIPBOARD_KIND ||
    value.version !== CANVAS_CLIPBOARD_VERSION ||
    !Array.isArray(value.nodes) ||
    !Array.isArray(value.edges) ||
    !value.nodes.every(isNodeShape) ||
    !value.edges.every(isEdgeShape)
  ) {
    return null
  }
  return {
    kind: CANVAS_CLIPBOARD_KIND,
    version: CANVAS_CLIPBOARD_VERSION,
    nodes: value.nodes,
    edges: value.edges,
  }
}

/**
 * The nodes and edges a paste adds: new ids from `createId`, selected, the
 * top start corner of the copied bounds at `at`, or offset from where they
 * were copied.
 */
function getPastedElements<TNode extends CanvasNode, TEdge extends CanvasEdge>(
  clipboard: CanvasClipboard<TNode, TEdge>,
  { createId, at }: { createId: () => string; at?: CanvasPosition }
): { nodes: TNode[]; edges: TEdge[] } {
  const roots = clipboard.nodes.filter((node) => !node.parentId)
  const bounds = getNodesBounds(roots)
  const shift = bounds
    ? at
      ? { x: at.x - bounds.x, y: at.y - bounds.y }
      : { x: PASTE_OFFSET, y: PASTE_OFFSET }
    : { x: 0, y: 0 }
  const ids = new Map(clipboard.nodes.map((node) => [node.id, createId()]))
  const nodes = clipboard.nodes.map((node) => {
    const id = ids.get(node.id) ?? createId()
    const parentId = node.parentId ? ids.get(node.parentId) : undefined
    return {
      ...node,
      id,
      parentId,
      selected: true,
      position: parentId
        ? node.position
        : { x: node.position.x + shift.x, y: node.position.y + shift.y },
    }
  })
  const edges = clipboard.edges.flatMap((edge) => {
    const source = ids.get(edge.source)
    const target = ids.get(edge.target)
    if (!source || !target) return []
    return [{ ...edge, id: createId(), source, target, selected: false }]
  })
  return { nodes, edges }
}

export {
  CANVAS_CLIPBOARD_KIND,
  CANVAS_CLIPBOARD_VERSION,
  copyCanvasSelection,
  getPastedElements,
  parseCanvasClipboard,
  PASTE_OFFSET,
  serializeCanvasClipboard,
  type CanvasClipboard,
}
