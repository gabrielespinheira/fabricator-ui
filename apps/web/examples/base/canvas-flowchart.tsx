"use client"

import { layoutWithDagre } from "@/styles/base-fabricator/lib/canvas-layout-dagre"
import {
  Canvas,
  CanvasControls,
  type CanvasEdgeRecord,
} from "@/styles/base-fabricator/ui/canvas"

// Default nodes flow top to bottom, with arrowheads for a process; "Tidy up" in the canvas's menu (right
// click the empty canvas) arranges them with dagre.
const nodes = [
  {
    id: "request",
    position: { x: 0, y: 0 },
    data: { title: "Refund requested", orientation: "vertical" },
  },
  {
    id: "eligible",
    position: { x: 40, y: 140 },
    data: { title: "Within 30 days?", orientation: "vertical" },
  },
  {
    id: "approve",
    position: { x: -160, y: 300 },
    data: { title: "Approve refund", orientation: "vertical" },
  },
  {
    id: "review",
    position: { x: 220, y: 280 },
    data: { title: "Send to review", orientation: "vertical" },
  },
  {
    id: "notify",
    position: { x: 20, y: 440 },
    data: { title: "Email the customer", orientation: "vertical" },
  },
]

const edges: CanvasEdgeRecord[] = [
  {
    id: "1",
    source: "request",
    target: "eligible",
    type: "smoothstep",
    marker: "arrow",
  },
  {
    id: "2",
    source: "eligible",
    target: "approve",
    type: "smoothstep",
    marker: "arrow",
    label: "Yes",
  },
  {
    id: "3",
    source: "eligible",
    target: "review",
    type: "smoothstep",
    marker: "arrow",
    label: "No",
  },
  {
    id: "4",
    source: "approve",
    target: "notify",
    type: "smoothstep",
    marker: "arrow",
  },
  {
    id: "5",
    source: "review",
    target: "notify",
    type: "smoothstep",
    marker: "arrow",
  },
]

export function CanvasFlowchart() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      layout={layoutWithDagre}
      edgeDefaults={{ type: "smoothstep", marker: "arrow" }}
      background="lines"
      snapToGrid
      label="Refund process"
      className="h-[520px] w-full rounded-xl"
    >
      <CanvasControls />
    </Canvas>
  )
}
