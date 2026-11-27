// Whether a connection may be made, and why not. Both platforms ask this
// while a connection is dragged, before it lands, and when keyboard connect
// lists its targets, so the answer is the same however a person connects.
// Reasons are codes: the component turns them into the project's words.

import {
  getNodeRect,
  hasConnection,
  indexNodes,
  type CanvasConnection,
  type CanvasEdge,
  type CanvasHandleKind,
  type CanvasHandleSpec,
  type CanvasNode,
} from "./canvas-model"

type CanvasConnectionIssue =
  | "self-loop"
  | "duplicate"
  | "cycle"
  | "type-mismatch"
  | "handle-full"
  | "not-connectable"
  | "rule"

type CanvasConnectionResult =
  | { isValid: true }
  | { isValid: false; issue: CanvasConnectionIssue; message?: string }

/** A project's own rule: true to allow, a message to refuse. */
type CanvasConnectionRule = (
  connection: CanvasConnection,
  graph: { nodes: readonly CanvasNode[]; edges: readonly CanvasEdge[] }
) => true | string

type CanvasValidationOptions = {
  nodes: readonly CanvasNode[]
  edges: readonly CanvasEdge[]
  /** The handles the nodes drew, keyed by `getHandleKey`. */
  handles?: ReadonlyMap<string, CanvasHandleSpec>
  allowSelfLoops?: boolean
  allowCycles?: boolean
  rule?: CanvasConnectionRule
}

function getHandleKey(
  nodeId: string,
  kind: CanvasHandleKind,
  handleId: string | null | undefined
) {
  return `${nodeId}:${kind}:${handleId ?? ""}`
}

/** Whether `to` can be reached from `from` by following edges forwards. */
function isReachable(
  edges: readonly CanvasEdge[],
  from: string,
  to: string
): boolean {
  const outgoing = new Map<string, string[]>()
  for (const edge of edges) {
    const list = outgoing.get(edge.source)
    if (list) list.push(edge.target)
    else outgoing.set(edge.source, [edge.target])
  }
  const seen = new Set<string>([from])
  const queue = [from]
  while (queue.length > 0) {
    const id = queue.pop()
    if (id === undefined) break
    if (id === to) return true
    for (const next of outgoing.get(id) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  return false
}

function countHandleConnections(
  edges: readonly CanvasEdge[],
  handle: CanvasHandleSpec
) {
  let count = 0
  for (const edge of edges) {
    if (handle.kind === "source") {
      if (
        edge.source === handle.nodeId &&
        (edge.sourceHandle ?? null) === handle.id
      )
        count++
    } else if (
      edge.target === handle.nodeId &&
      (edge.targetHandle ?? null) === handle.id
    ) {
      count++
    }
  }
  return count
}

function isTypeCompatible(
  source?: CanvasHandleSpec,
  target?: CanvasHandleSpec
) {
  if (!source?.produces || !target?.accepts) return true
  return (
    target.accepts.includes("*") || target.accepts.includes(source.produces)
  )
}

function validateCanvasConnection(
  connection: CanvasConnection,
  {
    nodes,
    edges,
    handles,
    allowSelfLoops = false,
    allowCycles = true,
    rule,
  }: CanvasValidationOptions
): CanvasConnectionResult {
  if (!allowSelfLoops && connection.source === connection.target) {
    return { isValid: false, issue: "self-loop" }
  }
  const nodesById = indexNodes(nodes)
  const source = nodesById.get(connection.source)
  const target = nodesById.get(connection.target)
  if (
    !source ||
    !target ||
    source.connectable === false ||
    target.connectable === false
  ) {
    return { isValid: false, issue: "not-connectable" }
  }
  if (hasConnection(edges, connection)) {
    return { isValid: false, issue: "duplicate" }
  }
  const sourceHandle = handles?.get(
    getHandleKey(connection.source, "source", connection.sourceHandle)
  )
  const targetHandle = handles?.get(
    getHandleKey(connection.target, "target", connection.targetHandle)
  )
  if (!isTypeCompatible(sourceHandle, targetHandle)) {
    return { isValid: false, issue: "type-mismatch" }
  }
  for (const handle of [sourceHandle, targetHandle]) {
    if (handle?.max === undefined) continue
    if (countHandleConnections(edges, handle) >= handle.max) {
      return { isValid: false, issue: "handle-full" }
    }
  }
  if (
    !allowCycles &&
    connection.source !== connection.target &&
    isReachable(edges, connection.target, connection.source)
  ) {
    return { isValid: false, issue: "cycle" }
  }
  if (rule) {
    const answer = rule(connection, { nodes, edges })
    if (answer !== true)
      return { isValid: false, issue: "rule", message: answer }
  }
  return { isValid: true }
}

/**
 * Every target handle a source handle could connect to, nearest first. This
 * is the list keyboard and menu connect step through.
 */
function getConnectableTargets(
  source: CanvasHandleSpec,
  options: CanvasValidationOptions & {
    handles: ReadonlyMap<string, CanvasHandleSpec>
  }
): CanvasHandleSpec[] {
  const nodesById = indexNodes(options.nodes)
  const sourceNode = nodesById.get(source.nodeId)
  if (!sourceNode) return []
  const origin = getNodeRect(sourceNode, nodesById)
  const targets: { handle: CanvasHandleSpec; distance: number }[] = []
  for (const handle of options.handles.values()) {
    if (handle.kind !== "target") continue
    const result = validateCanvasConnection(
      {
        source: source.nodeId,
        sourceHandle: source.id,
        target: handle.nodeId,
        targetHandle: handle.id,
      },
      options
    )
    if (!result.isValid) continue
    const node = nodesById.get(handle.nodeId)
    if (!node) continue
    const rect = getNodeRect(node, nodesById)
    targets.push({
      handle,
      distance: Math.hypot(rect.x - origin.x, rect.y - origin.y),
    })
  }
  return targets
    .sort((a, b) => a.distance - b.distance)
    .map(({ handle }) => handle)
}

export {
  getConnectableTargets,
  getHandleKey,
  isReachable,
  validateCanvasConnection,
  type CanvasConnectionIssue,
  type CanvasConnectionResult,
  type CanvasConnectionRule,
  type CanvasValidationOptions,
}
