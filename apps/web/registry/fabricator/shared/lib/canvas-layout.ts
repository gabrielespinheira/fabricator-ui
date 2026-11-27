// Automatic layout for the Canvas, as a port: a layout engine takes node
// sizes and edges and returns where each node goes. `canvas-layout-dagre.ts`
// is the adapter Fabricator ships; any other engine (ELK, a server) fits the
// same type. The changes it produces go through history like any edit.

import {
  getNodeSize,
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeChange,
  type CanvasPosition,
} from "./canvas-model"

type CanvasLayoutDirection = "down" | "right" | "up" | "left"

type CanvasLayoutOptions = {
  direction?: CanvasLayoutDirection
  /** Space between nodes in a rank, in canvas units. */
  nodeGap?: number
  /** Space between ranks, in canvas units. */
  rankGap?: number
}

type CanvasLayoutGraph = {
  nodes: { id: string; width: number; height: number }[]
  edges: { source: string; target: string }[]
}

/** Returns each node's top start corner. */
type CanvasLayoutEngine = (
  graph: CanvasLayoutGraph,
  options: Required<CanvasLayoutOptions>
) => Map<string, CanvasPosition>

/** A node measured as nothing gets this size, so it still takes room. */
const FALLBACK_SIZE = { width: 160, height: 48 }

const DEFAULT_LAYOUT: Required<CanvasLayoutOptions> = {
  direction: "down",
  nodeGap: 48,
  rankGap: 72,
}

/**
 * Lays out the top-level nodes (children stay put inside their group) and
 * returns the position changes. Hidden nodes and their edges are left out.
 */
function getLayoutChanges<TNode extends CanvasNode>(
  nodes: readonly TNode[],
  edges: readonly CanvasEdge[],
  engine: CanvasLayoutEngine,
  options: CanvasLayoutOptions = {}
): CanvasNodeChange<TNode>[] {
  const placed = nodes.filter((node) => !node.parentId && !node.hidden)
  const ids = new Set(placed.map((node) => node.id))
  const graph: CanvasLayoutGraph = {
    nodes: placed.map((node) => {
      const size = getNodeSize(node)
      return {
        id: node.id,
        width: size.width || FALLBACK_SIZE.width,
        height: size.height || FALLBACK_SIZE.height,
      }
    }),
    edges: edges
      .filter((edge) => ids.has(edge.source) && ids.has(edge.target))
      .map(({ source, target }) => ({ source, target })),
  }
  const positions = engine(graph, { ...DEFAULT_LAYOUT, ...options })
  const changes: CanvasNodeChange<TNode>[] = []
  for (const node of placed) {
    const position = positions.get(node.id)
    if (!position) continue
    if (position.x === node.position.x && position.y === node.position.y)
      continue
    changes.push({ id: node.id, type: "position", position })
  }
  return changes
}

export {
  DEFAULT_LAYOUT,
  getLayoutChanges,
  type CanvasLayoutDirection,
  type CanvasLayoutEngine,
  type CanvasLayoutGraph,
  type CanvasLayoutOptions,
}
