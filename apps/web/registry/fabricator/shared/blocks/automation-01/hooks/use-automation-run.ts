"use client"

import * as React from "react"

import {
  getRunDuration,
  getRunPath,
  readStep,
  type AutomationChoices,
  type AutomationRun,
} from "@/registry/bases/__base__/blocks/automation-01/lib/automation-model"
import {
  type CanvasEdge,
  type CanvasNode,
  type CanvasNodeStatus,
} from "@/registry/bases/__base__/lib/canvas-model"

type SetGraph<T> = React.Dispatch<React.SetStateAction<T[]>>

// A test run plays the path on the canvas: each step runs in turn, the
// connections into it flow, and steps off the path end skipped. Replace the
// timer with your run's events, streamed from your backend.
const MIN_STEP_MS = 180
const MAX_STEP_MS = 900

function getStepDelay(node: CanvasNode | undefined) {
  const ms = readStep(node)?.sample?.durationMs ?? 0
  return Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, ms * 0.3))
}

function setStatus(
  nodes: CanvasNode[],
  getStatus: (node: CanvasNode) => CanvasNodeStatus | undefined
) {
  return nodes.map((node) => {
    if (!readStep(node)) return node
    const status = getStatus(node)
    return status === node.status ? node : { ...node, status }
  })
}

export function useAutomationRun({
  setNodes,
  setEdges,
}: {
  setNodes: SetGraph<CanvasNode>
  setEdges: SetGraph<CanvasEdge>
}) {
  const [run, setRun] = React.useState<AutomationRun | null>(null)
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined)

  React.useEffect(() => () => clearTimeout(timer.current), [])

  function stopFlow() {
    setEdges((edges) =>
      edges.map((edge) => (edge.animated ? { ...edge, animated: false } : edge))
    )
  }

  function start(
    nodes: readonly CanvasNode[],
    edges: readonly CanvasEdge[],
    choices: AutomationChoices,
    onFinish: (run: AutomationRun) => void
  ) {
    clearTimeout(timer.current)
    const path = getRunPath(nodes, edges, choices)
    const byId = new Map(nodes.map((node) => [node.id, node]))
    const started: AutomationRun = {
      status: "running",
      startedAt: Date.now(),
      path,
      durationMs: getRunDuration(nodes, path),
    }
    setRun(started)
    setNodes((current) => setStatus(current, () => "idle"))

    const runStep = (index: number) => {
      const id = path[index]
      if (id === undefined) {
        const taken = new Set(path)
        setNodes((current) =>
          setStatus(current, (node) =>
            taken.has(node.id) ? "success" : "skipped"
          )
        )
        stopFlow()
        const done = { ...started, status: "success" as const }
        setRun(done)
        onFinish(done)
        return
      }
      const before = new Set(path.slice(0, index))
      setNodes((current) =>
        setStatus(current, (node) =>
          node.id === id
            ? "running"
            : before.has(node.id)
              ? "success"
              : node.status
        )
      )
      setEdges((current) =>
        current.map((edge) => {
          const isFlowing = edge.target === id && before.has(edge.source)
          return edge.animated === isFlowing
            ? edge
            : { ...edge, animated: isFlowing }
        })
      )
      timer.current = setTimeout(
        () => runStep(index + 1),
        getStepDelay(byId.get(id))
      )
    }
    runStep(0)
  }

  function stop() {
    clearTimeout(timer.current)
    setNodes((current) =>
      setStatus(current, (node) =>
        node.status === "running" ? "skipped" : node.status
      )
    )
    stopFlow()
    setRun((current) => current && { ...current, status: "stopped" })
  }

  return { run, isRunning: run?.status === "running", start, stop }
}
