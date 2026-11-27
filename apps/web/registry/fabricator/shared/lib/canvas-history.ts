// Undo and redo for the Canvas. A step stores, for each element it touched,
// the element before and after (null when it didn't exist) and where it sat
// in the list, never a copy of the whole graph. Selection, measuring and the
// drag flag are not edits, so a step that only changes them is dropped.

import {
  type CanvasEdge,
  type CanvasEdgeChange,
  type CanvasNode,
  type CanvasNodeChange,
} from "./canvas-model"

type CanvasElementDiff<TElement> = {
  id: string
  before: TElement | null
  after: TElement | null
  index: number
}

type CanvasHistoryEntry<
  TNode extends CanvasNode = CanvasNode,
  TEdge extends CanvasEdge = CanvasEdge,
> = {
  nodes: CanvasElementDiff<TNode>[]
  edges: CanvasElementDiff<TEdge>[]
  /** Steps with the same key, close together, merge into one (a key nudge run). */
  key?: string
  time: number
}

type CanvasHistory<
  TNode extends CanvasNode = CanvasNode,
  TEdge extends CanvasEdge = CanvasEdge,
> = {
  past: CanvasHistoryEntry<TNode, TEdge>[]
  future: CanvasHistoryEntry<TNode, TEdge>[]
}

/** Fields that change without the person editing anything. */
const TRANSIENT_FIELDS = new Set([
  "selected",
  "dragging",
  "resizing",
  "measured",
])

/** How long after a step another with the same key still merges into it, in ms. */
const MERGE_WINDOW = 1000

function isEditDifference(before: object | null, after: object | null) {
  if (before === after) return false
  if (!before || !after) return true
  const keys = new Set([...Object.keys(before), ...Object.keys(after)])
  for (const key of keys) {
    if (TRANSIENT_FIELDS.has(key)) continue
    const a: unknown = Reflect.get(before, key)
    const b: unknown = Reflect.get(after, key)
    if (a === b) continue
    if (
      typeof a === "object" &&
      typeof b === "object" &&
      a !== null &&
      b !== null &&
      JSON.stringify(a) === JSON.stringify(b)
    )
      continue
    return true
  }
  return false
}

function diffElements<TElement extends { id: string }>(
  before: readonly TElement[],
  after: readonly TElement[],
  ids: Iterable<string>
): CanvasElementDiff<TElement>[] {
  const beforeIndex = new Map(
    before.map((element, index) => [element.id, index])
  )
  const afterIndex = new Map(after.map((element, index) => [element.id, index]))
  const diffs: CanvasElementDiff<TElement>[] = []
  for (const id of new Set(ids)) {
    const previous = beforeIndex.has(id)
      ? before[beforeIndex.get(id) ?? 0]
      : null
    const next = afterIndex.has(id) ? after[afterIndex.get(id) ?? 0] : null
    if (!isEditDifference(previous, next)) continue
    diffs.push({
      id,
      before: previous,
      after: next,
      index: afterIndex.get(id) ?? beforeIndex.get(id) ?? 0,
    })
  }
  return diffs
}

/**
 * The step between two states of the graph, looking only at the given ids
 * (the ids the changes named). Null when nothing but transient state moved.
 */
function createHistoryEntry<TNode extends CanvasNode, TEdge extends CanvasEdge>(
  previous: { nodes: readonly TNode[]; edges: readonly TEdge[] },
  next: { nodes: readonly TNode[]; edges: readonly TEdge[] },
  touched: { nodeIds: Iterable<string>; edgeIds: Iterable<string> },
  options: { key?: string; time: number }
): CanvasHistoryEntry<TNode, TEdge> | null {
  const nodes = diffElements(previous.nodes, next.nodes, touched.nodeIds)
  const edges = diffElements(previous.edges, next.edges, touched.edgeIds)
  if (nodes.length === 0 && edges.length === 0) return null
  return { nodes, edges, key: options.key, time: options.time }
}

function mergeDiffs<TElement>(
  first: CanvasElementDiff<TElement>[],
  second: CanvasElementDiff<TElement>[]
) {
  const byId = new Map(first.map((diff) => [diff.id, diff]))
  for (const diff of second) {
    const earlier = byId.get(diff.id)
    byId.set(diff.id, earlier ? { ...diff, before: earlier.before } : diff)
  }
  return [...byId.values()]
}

function pushHistory<TNode extends CanvasNode, TEdge extends CanvasEdge>(
  history: CanvasHistory<TNode, TEdge>,
  entry: CanvasHistoryEntry<TNode, TEdge>,
  limit = 100
): CanvasHistory<TNode, TEdge> {
  const last = history.past[history.past.length - 1]
  if (
    last &&
    entry.key !== undefined &&
    last.key === entry.key &&
    entry.time - last.time <= MERGE_WINDOW
  ) {
    const merged = {
      nodes: mergeDiffs(last.nodes, entry.nodes),
      edges: mergeDiffs(last.edges, entry.edges),
      key: entry.key,
      time: entry.time,
    }
    return { past: [...history.past.slice(0, -1), merged], future: [] }
  }
  const past = [...history.past, entry]
  return { past: past.slice(Math.max(0, past.length - limit)), future: [] }
}

function getRestoreChanges<TElement extends { id: string }>(
  diffs: CanvasElementDiff<TElement>[],
  direction: "undo" | "redo"
) {
  const changes: (
    | { id: string; type: "remove" }
    | { id: string; type: "add"; item: TElement; index: number }
    | { id: string; type: "replace"; item: TElement }
  )[] = []
  // Adds go in list order so each index is valid when it's applied.
  const ordered = [...diffs].sort((a, b) => a.index - b.index)
  for (const diff of ordered) {
    const target = direction === "undo" ? diff.before : diff.after
    const current = direction === "undo" ? diff.after : diff.before
    if (target === null) changes.push({ id: diff.id, type: "remove" })
    else if (current === null)
      changes.push({
        id: diff.id,
        type: "add",
        item: target,
        index: diff.index,
      })
    else changes.push({ id: diff.id, type: "replace", item: target })
  }
  return changes
}

/** The changes that take the graph back across a step, or forward again. */
function getHistoryChanges<TNode extends CanvasNode, TEdge extends CanvasEdge>(
  entry: CanvasHistoryEntry<TNode, TEdge>,
  direction: "undo" | "redo"
): {
  nodeChanges: CanvasNodeChange<TNode>[]
  edgeChanges: CanvasEdgeChange<TEdge>[]
} {
  return {
    nodeChanges: getRestoreChanges(entry.nodes, direction),
    edgeChanges: getRestoreChanges(entry.edges, direction),
  }
}

function undoHistory<TNode extends CanvasNode, TEdge extends CanvasEdge>(
  history: CanvasHistory<TNode, TEdge>
) {
  const entry = history.past[history.past.length - 1]
  if (!entry) return null
  return {
    entry,
    history: {
      past: history.past.slice(0, -1),
      future: [entry, ...history.future],
    },
  }
}

function redoHistory<TNode extends CanvasNode, TEdge extends CanvasEdge>(
  history: CanvasHistory<TNode, TEdge>
) {
  const [entry, ...future] = history.future
  if (!entry) return null
  return { entry, history: { past: [...history.past, entry], future } }
}

const EMPTY_HISTORY: CanvasHistory<never, never> = { past: [], future: [] }

export {
  createHistoryEntry,
  EMPTY_HISTORY,
  getHistoryChanges,
  isEditDifference,
  pushHistory,
  redoHistory,
  undoHistory,
  type CanvasElementDiff,
  type CanvasHistory,
  type CanvasHistoryEntry,
}
