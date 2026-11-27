// The Canvas's layout adapter for dagre (@dagrejs/dagre, MIT): layered
// layouts for flows, trees and org charts. The only file that imports dagre.

import dagre, { type EdgeConfig, type GraphLabel } from "@dagrejs/dagre"

import {
  type CanvasLayoutDirection,
  type CanvasLayoutEngine,
} from "./canvas-layout"

const RANK_DIRECTIONS = {
  down: "TB",
  right: "LR",
  up: "BT",
  left: "RL",
} as const satisfies Record<CanvasLayoutDirection, string>

const layoutWithDagre: CanvasLayoutEngine = (graph, options) => {
  const layout = new dagre.graphlib.Graph<
    GraphLabel,
    { width: number; height: number; x?: number; y?: number },
    EdgeConfig
  >()
  layout.setGraph({
    rankdir: RANK_DIRECTIONS[options.direction],
    nodesep: options.nodeGap,
    ranksep: options.rankGap,
  })
  layout.setDefaultEdgeLabel(() => ({}))
  for (const node of graph.nodes) {
    layout.setNode(node.id, { width: node.width, height: node.height })
  }
  for (const edge of graph.edges) layout.setEdge(edge.source, edge.target)
  dagre.layout(layout)

  // dagre places centres; the Canvas places top start corners. Rounded, so
  // nodes rest on whole pixels.
  const positions = new Map<string, { x: number; y: number }>()
  for (const node of graph.nodes) {
    const placed = layout.node(node.id)
    if (placed.x === undefined || placed.y === undefined) continue
    positions.set(node.id, {
      x: Math.round(placed.x - node.width / 2),
      y: Math.round(placed.y - node.height / 2),
    })
  }
  return positions
}

export { layoutWithDagre }
