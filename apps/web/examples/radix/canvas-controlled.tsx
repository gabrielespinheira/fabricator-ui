"use client"

import {
  Canvas,
  CanvasControls,
  CanvasOutline,
  CanvasPanel,
  useCanvasState,
  type CanvasEdgeRecord,
} from "@/styles/radix-fabricator/ui/canvas"

const initialNodes = [
  { id: "idea", position: { x: 0, y: 0 }, data: { title: "Idea" } },
  { id: "spec", position: { x: 260, y: 0 }, data: { title: "Spec" } },
  { id: "build", position: { x: 520, y: 0 }, data: { title: "Build" } },
]

const initialEdges: CanvasEdgeRecord[] = [
  { id: "1", source: "idea", target: "spec" },
  { id: "2", source: "spec", target: "build" },
]

// The app holds the graph; the outline beside it reads the same state, the
// way a screen reader or a phone's list view does.
export function CanvasControlled() {
  const { nodes, edges, onNodesChange, onEdgesChange } = useCanvasState(
    initialNodes,
    initialEdges
  )
  return (
    <Canvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      label="Product flow"
      className="h-96 w-full rounded-xl"
    >
      <CanvasPanel position="top-end">
        <CanvasOutline className="w-48 rounded-xl bg-card p-1 shadow-surface-2" />
      </CanvasPanel>
      <CanvasControls />
    </Canvas>
  )
}
