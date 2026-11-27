"use client"

import * as React from "react"
import {
  CodeIcon,
  PlayIcon,
  ServerIcon,
  ShieldCheckIcon,
} from "@fabricator-ui/icons"

import { Button } from "@/styles/radix-fabricator/ui/button"
import {
  Canvas,
  CanvasPanel,
  useCanvasState,
  type CanvasEdgeRecord,
} from "@/styles/radix-fabricator/ui/canvas"

type Status = "idle" | "running" | "success" | "error" | "skipped"

const steps = [
  { id: "build", title: "Build", icon: <CodeIcon /> },
  { id: "test", title: "Test", icon: <ShieldCheckIcon /> },
  { id: "deploy", title: "Deploy", icon: <ServerIcon /> },
]

const initialNodes = steps.map((step, index) => ({
  id: step.id,
  position: { x: index * 280, y: 0 },
  status: "idle" as Status,
  data: { title: step.title, icon: step.icon },
}))

const initialEdges: CanvasEdgeRecord[] = [
  { id: "build-test", source: "build", target: "test" },
  { id: "test-deploy", source: "test", target: "deploy" },
]

// A run updates one node's status at a time; only that node re-renders.
// The edge into the running step flows.
export function CanvasPipelineStatus() {
  const { nodes, setNodes, edges, setEdges, onNodesChange, onEdgesChange } =
    useCanvasState(initialNodes, initialEdges)
  const [isRunning, setRunning] = React.useState(false)

  async function run() {
    setRunning(true)
    setNodes((current) => current.map((node) => ({ ...node, status: "idle" })))
    for (const [index, step] of steps.entries()) {
      setNodes((current) =>
        current.map((node) =>
          node.id === step.id ? { ...node, status: "running" } : node
        )
      )
      setEdges((current) =>
        current.map((edge) => ({ ...edge, animated: edge.target === step.id }))
      )
      await new Promise((resolve) => setTimeout(resolve, 1200))
      const failed = index === 2 && Math.random() < 0.4
      setNodes((current) =>
        current.map((node) =>
          node.id === step.id
            ? { ...node, status: failed ? "error" : "success" }
            : node
        )
      )
      if (failed) break
    }
    setEdges((current) => current.map((edge) => ({ ...edge, animated: false })))
    setRunning(false)
  }

  return (
    <Canvas
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      mode="view"
      label="Release pipeline"
      className="h-80 w-full rounded-xl"
    >
      <CanvasPanel position="top-end">
        <Button size="sm" onClick={run} disabled={isRunning}>
          <PlayIcon data-icon="inline-start" />
          {isRunning ? "Running…" : "Run"}
        </Button>
      </CanvasPanel>
    </Canvas>
  )
}
