// The automation block's rules, apart from any screen: which steps a run
// takes, how long it took, inserting a step on a connection, and the workflow
// as a file. The page and its hooks only wire these to the Canvas.

import { type AutomationIconName } from "@/registry/bases/__base__/blocks/automation-01/components/automation-icons"
import {
  type CanvasData,
  type CanvasEdge,
  type CanvasNode,
} from "@/registry/bases/__base__/lib/canvas-model"

export type AutomationStepKind =
  | "trigger"
  | "action"
  | "agent"
  | "router"
  | "condition"
  | "wait"
  | "resource"

/** What a resource gives the agent it plugs into. */
export type AutomationResource = "model" | "memory" | "tool"

export type AutomationRoute = { id: string; label: string }

export type AutomationStepData = {
  title: string
  description: string
  kind: AutomationStepKind
  icon: AutomationIconName
  /** The app the step runs in. */
  app: string
  settings: readonly { label: string; value: string }[]
  /** A router's outputs, in order. A condition's are its yes and no. */
  routes?: readonly AutomationRoute[]
  resource?: AutomationResource
  /** What a test run returns from this step. */
  sample?: { durationMs: number; output: string }
}

export type AutomationRun = {
  status: "running" | "success" | "stopped"
  startedAt: number
  /** Node ids in the order the run took them. */
  path: readonly string[]
  durationMs: number
}

/** The routes a test run takes: router or condition id to the route's id. */
export type AutomationChoices = Readonly<Record<string, string>>

const FLOW_HANDLE = "item"

export function isStepData(data: CanvasData): data is AutomationStepData {
  return (
    typeof data.title === "string" &&
    typeof data.kind === "string" &&
    typeof data.icon === "string" &&
    Array.isArray(data.settings)
  )
}

export function readStep(node: CanvasNode | undefined) {
  return node && isStepData(node.data) ? node.data : null
}

function hasRoutes(step: AutomationStepData) {
  return step.kind === "router" || step.kind === "condition"
}

/**
 * The steps a run takes, in the order they run. It starts at the triggers,
 * follows only the chosen route out of a router or condition, and runs a
 * step once every step before it on the path has run, so a merge waits for
 * its branch. An agent's resources run with it, just before it.
 */
export function getRunPath(
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[],
  choices: AutomationChoices
): string[] {
  const steps = new Map<string, AutomationStepData>()
  for (const node of nodes) {
    const step = readStep(node)
    if (step) steps.set(node.id, step)
  }
  const flow = edges.filter((edge) => {
    const source = steps.get(edge.source)
    if (!source || !steps.has(edge.target) || edge.hidden) return false
    if (source.kind === "resource") return false
    if (hasRoutes(source)) return edge.sourceHandle === choices[edge.source]
    return true
  })

  const reached = new Set<string>()
  const queue = [...steps]
    .filter(([, step]) => step.kind === "trigger")
    .map(([id]) => id)
  while (queue.length > 0) {
    const id = queue.shift()
    if (id === undefined || reached.has(id)) continue
    reached.add(id)
    for (const edge of flow) if (edge.source === id) queue.push(edge.target)
  }

  const waiting = new Map<string, number>()
  for (const edge of flow) {
    if (!reached.has(edge.source)) continue
    waiting.set(edge.target, (waiting.get(edge.target) ?? 0) + 1)
  }
  const ready = [...reached].filter((id) => !waiting.get(id))
  const path: string[] = []
  while (ready.length > 0) {
    const id = ready.shift()
    if (id === undefined) break
    for (const edge of edges) {
      if (edge.target !== id || steps.get(edge.source)?.kind !== "resource")
        continue
      path.push(edge.source)
    }
    path.push(id)
    for (const edge of flow) {
      if (edge.source !== id) continue
      const left = (waiting.get(edge.target) ?? 0) - 1
      waiting.set(edge.target, left)
      if (left === 0) ready.push(edge.target)
    }
  }
  return path
}

/** How long a run along `path` takes, from each step's sample. */
export function getRunDuration(
  nodes: readonly CanvasNode[],
  path: readonly string[]
) {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  return path.reduce(
    (total, id) => total + (readStep(byId.get(id))?.sample?.durationMs ?? 0),
    0
  )
}

export function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`
  return `${(ms / 1000).toFixed(1)} s`
}

/** The connections of a new flow step, from its one input to its one output. */
export function getFlowHandles() {
  return { sourceHandle: FLOW_HANDLE, targetHandle: FLOW_HANDLE }
}

/** Where a connection was dropped on empty canvas: a node's handle. */
export type AutomationDropSource = {
  nodeId: string
  handleId: string | null
  kind: "source" | "target"
}

/**
 * The edge that joins a step created where a connection was dropped to the
 * handle it was dragged from: forwards from an output, backwards into an
 * input. A tool joins an agent's tool port; anything else joins the flow.
 */
export function connectNewStep(
  from: AutomationDropSource,
  stepId: string
): CanvasEdge {
  const port = from.handleId ?? FLOW_HANDLE
  const isTool = port === "tool"
  const own = isTool ? "tool" : FLOW_HANDLE
  const type = isTool ? undefined : "smoothstep"
  return from.kind === "source"
    ? {
        id: `${from.nodeId}-${stepId}`,
        type,
        source: from.nodeId,
        sourceHandle: port,
        target: stepId,
        targetHandle: own,
      }
    : {
        id: `${stepId}-${from.nodeId}`,
        type,
        source: stepId,
        sourceHandle: own,
        target: from.nodeId,
        targetHandle: port,
      }
}

/**
 * Splits a connection around a new step: the old edge's source runs into
 * the step, and the step into the old target.
 */
export function insertStepOnEdge(
  edges: readonly CanvasEdge[],
  edgeId: string,
  stepId: string
): CanvasEdge[] {
  const edge = edges.find(({ id }) => id === edgeId)
  if (!edge) return [...edges]
  // A route's label stays on the half that leaves the router.
  return edges.flatMap((current) =>
    current.id === edgeId
      ? [
          {
            ...edge,
            id: `${edge.id}-in`,
            target: stepId,
            targetHandle: FLOW_HANDLE,
          },
          {
            ...edge,
            id: `${edge.id}-out`,
            source: stepId,
            sourceHandle: FLOW_HANDLE,
            label: undefined,
            selected: false,
          },
        ]
      : [current]
  )
}

/** The workflow as a file: what was built, without run or view state. */
export function exportWorkflow(
  name: string,
  nodes: readonly CanvasNode[],
  edges: readonly CanvasEdge[]
) {
  return JSON.stringify(
    {
      name,
      nodes: nodes.map(
        ({ id, type, position, data, parentId, width, height }) => ({
          id,
          type,
          position,
          data,
          parentId,
          width,
          height,
        })
      ),
      edges: edges.map(
        ({ id, source, sourceHandle, target, targetHandle, label }) => ({
          id,
          source,
          sourceHandle,
          target,
          targetHandle,
          label,
        })
      ),
    },
    null,
    2
  )
}
