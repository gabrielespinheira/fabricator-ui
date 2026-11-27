"use client"

import {
  Canvas,
  CanvasControls,
  type CanvasEdgeRecord,
} from "@/styles/aria-fabricator/ui/canvas"

// Connection rules: no loops, and a rule of the project's own with its
// reason. The server refuses every connection into "Archive", so it lands,
// waits, then goes back with a toast and Retry.
const nodes = [
  { id: "draft", position: { x: 0, y: 0 }, data: { title: "Draft" } },
  { id: "review", position: { x: 280, y: 0 }, data: { title: "Review" } },
  { id: "publish", position: { x: 560, y: 0 }, data: { title: "Publish" } },
  { id: "archive", position: { x: 280, y: 160 }, data: { title: "Archive" } },
]

const edges: CanvasEdgeRecord[] = [
  { id: "1", source: "draft", target: "review" },
  { id: "2", source: "review", target: "publish" },
]

export function CanvasValidation() {
  return (
    <Canvas
      defaultNodes={nodes}
      defaultEdges={edges}
      allowCycles={false}
      validateConnection={(connection) =>
        connection.source === "publish"
          ? "Published pages can't move back"
          : true
      }
      onConnect={async (connection) => {
        await new Promise((resolve) => setTimeout(resolve, 900))
        if (connection.target === "archive") {
          throw new Error("Archiving is turned off for this workspace.")
        }
      }}
      label="Page states"
      className="h-80 w-full rounded-xl"
    >
      <CanvasControls />
    </Canvas>
  )
}
