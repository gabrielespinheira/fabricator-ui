"use client"

import {
  Canvas,
  CanvasControls,
  CanvasMinimap,
  type CanvasEdgeRecord,
} from "@/styles/aria-fabricator/ui/canvas"

// A thousand nodes and their edges. Offscreen nodes aren't drawn, and below
// half zoom nodes show only their header.
const COLUMNS = 40
const nodes = Array.from({ length: 1000 }, (_, index) => ({
  id: `n${index}`,
  position: {
    x: (index % COLUMNS) * 260,
    y: Math.floor(index / COLUMNS) * 140,
  },
  data: {
    title: `Step ${index + 1}`,
    description: "A step in a long pipeline.",
  },
}))
const edges: CanvasEdgeRecord[] = nodes.slice(1).map((node, index) => ({
  id: `e${index}`,
  source: `n${index}`,
  target: node.id,
}))

export function CanvasLarge() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      fitView={false}
      defaultViewport={{ x: 40, y: 40, zoom: 0.6 }}
      label="Large pipeline"
      className="h-[520px] w-full rounded-xl"
    >
      <CanvasControls />
      <CanvasMinimap />
    </Canvas>
  )
}
