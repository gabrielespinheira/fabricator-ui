"use client"

import {
  Canvas,
  CanvasControls,
  type CanvasEdgeRecord,
} from "@/styles/aria-fabricator/ui/canvas"

// Groups hold nodes that move together. Select nodes and press ⌘G to group
// them, ⇧⌘G to ungroup.
const nodes = [
  {
    id: "frontend",
    type: "group",
    position: { x: 0, y: 0 },
    width: 320,
    height: 220,
    data: { label: "Frontend" },
  },
  {
    id: "web",
    parentId: "frontend",
    extent: "parent" as const,
    position: { x: 24, y: 48 },
    data: { title: "Web app" },
  },
  {
    id: "admin",
    parentId: "frontend",
    extent: "parent" as const,
    position: { x: 24, y: 136 },
    data: { title: "Admin" },
  },
  {
    id: "backend",
    type: "group",
    position: { x: 420, y: 0 },
    width: 320,
    height: 220,
    data: { label: "Backend" },
  },
  {
    id: "api",
    parentId: "backend",
    extent: "parent" as const,
    position: { x: 24, y: 48 },
    data: { title: "API" },
  },
  {
    id: "jobs",
    parentId: "backend",
    extent: "parent" as const,
    position: { x: 24, y: 136 },
    data: { title: "Jobs" },
  },
]

const edges: CanvasEdgeRecord[] = [
  { id: "1", source: "web", target: "api" },
  { id: "2", source: "admin", target: "api" },
  { id: "3", source: "api", target: "jobs", type: "smoothstep" },
]

export function CanvasSubflows() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      label="Architecture"
      className="h-96 w-full rounded-xl"
    >
      <CanvasControls />
    </Canvas>
  )
}
