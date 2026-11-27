"use client"

import { DatabaseIcon, GlobeIcon, ServerIcon } from "@fabricator-ui/icons"

import {
  Canvas,
  type CanvasEdgeRecord,
} from "@/styles/radix-fabricator/ui/canvas"

// A diagram as a picture in a page: no controls, no edits, refits when its
// box changes size, and the page scrolls straight past it.
const nodes = [
  {
    id: "web",
    position: { x: 0, y: 0 },
    data: { title: "Web app", icon: <GlobeIcon /> },
    color: "blue" as const,
  },
  {
    id: "api",
    position: { x: 300, y: 0 },
    data: { title: "API", icon: <ServerIcon /> },
    color: "purple" as const,
  },
  {
    id: "db",
    position: { x: 600, y: 0 },
    data: { title: "Database", icon: <DatabaseIcon /> },
    color: "green" as const,
  },
]

const edges: CanvasEdgeRecord[] = [
  { id: "1", source: "web", target: "api", label: "HTTPS" },
  { id: "2", source: "api", target: "db", label: "SQL" },
]

export function CanvasStatic() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      mode="static"
      background="none"
      label="How requests reach the database"
      className="h-56 min-h-0 w-full rounded-xl"
    />
  )
}
