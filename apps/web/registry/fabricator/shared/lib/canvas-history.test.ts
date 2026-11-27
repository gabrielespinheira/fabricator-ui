import { describe, expect, it } from "vitest"

import {
  createHistoryEntry,
  EMPTY_HISTORY,
  getHistoryChanges,
  pushHistory,
  redoHistory,
  undoHistory,
} from "./canvas-history"
import {
  applyCanvasEdgeChanges,
  applyCanvasNodeChanges,
  type CanvasEdge,
  type CanvasNode,
} from "./canvas-model"

function node(
  id: string,
  x: number,
  extra: Partial<CanvasNode> = {}
): CanvasNode {
  return { id, position: { x, y: 0 }, data: {}, ...extra }
}

const before = {
  nodes: [node("a", 0), node("b", 100), node("c", 200)],
  edges: [{ id: "a-b", source: "a", target: "b" }] satisfies CanvasEdge[],
}

describe("createHistoryEntry", () => {
  it("records only what an edit changed", () => {
    const after = {
      nodes: applyCanvasNodeChanges(before.nodes, [
        { id: "b", type: "position", position: { x: 150, y: 0 } },
        { id: "c", type: "select", selected: true },
      ]),
      edges: before.edges,
    }
    const entry = createHistoryEntry(
      before,
      after,
      { nodeIds: ["b", "c"], edgeIds: [] },
      { time: 0 }
    )
    expect(entry?.nodes.map(({ id }) => id)).toEqual(["b"])
  })

  it("drops a step that only changed selection or measuring", () => {
    const after = {
      nodes: applyCanvasNodeChanges(before.nodes, [
        { id: "a", type: "select", selected: true },
        { id: "b", type: "dimensions", dimensions: { width: 10, height: 10 } },
      ]),
      edges: before.edges,
    }
    expect(
      createHistoryEntry(
        before,
        after,
        { nodeIds: ["a", "b"], edgeIds: [] },
        { time: 0 }
      )
    ).toBeNull()
  })
})

describe("undo and redo", () => {
  it("restores a deleted node and its edge in place, and deletes them again", () => {
    const after = {
      nodes: applyCanvasNodeChanges(before.nodes, [
        { id: "a", type: "remove" },
      ]),
      edges: applyCanvasEdgeChanges(before.edges, [
        { id: "a-b", type: "remove" },
      ]),
    }
    const entry = createHistoryEntry(
      before,
      after,
      { nodeIds: ["a"], edgeIds: ["a-b"] },
      { time: 0 }
    )
    if (!entry) throw new Error("expected an entry")

    const undo = getHistoryChanges(entry, "undo")
    const undone = {
      nodes: applyCanvasNodeChanges(after.nodes, undo.nodeChanges),
      edges: applyCanvasEdgeChanges(after.edges, undo.edgeChanges),
    }
    expect(undone.nodes.map(({ id }) => id)).toEqual(["a", "b", "c"])
    expect(undone.edges).toEqual(before.edges)

    const redo = getHistoryChanges(entry, "redo")
    expect(
      applyCanvasNodeChanges(undone.nodes, redo.nodeChanges).map(({ id }) => id)
    ).toEqual(["b", "c"])
  })

  it("moves entries between past and future, and a new step clears the future", () => {
    const entry = { nodes: [], edges: [], time: 0 }
    let history = pushHistory(EMPTY_HISTORY, entry)
    const undone = undoHistory(history)
    expect(undone?.history).toEqual({ past: [], future: [entry] })
    history = undone?.history ?? history
    expect(redoHistory(history)?.history).toEqual({ past: [entry], future: [] })
    expect(pushHistory(history, { ...entry, time: 5 }).future).toEqual([])
    expect(undoHistory(EMPTY_HISTORY)).toBeNull()
  })

  it("merges a run of nudges into one step that undoes to the start", () => {
    const first = createHistoryEntry(
      before,
      {
        ...before,
        nodes: applyCanvasNodeChanges(before.nodes, [
          { id: "a", type: "position", position: { x: 8, y: 0 } },
        ]),
      },
      { nodeIds: ["a"], edgeIds: [] },
      { key: "nudge:a", time: 0 }
    )
    const middle = applyCanvasNodeChanges(before.nodes, [
      { id: "a", type: "position", position: { x: 8, y: 0 } },
    ])
    const second = createHistoryEntry(
      { ...before, nodes: middle },
      {
        ...before,
        nodes: applyCanvasNodeChanges(middle, [
          { id: "a", type: "position", position: { x: 16, y: 0 } },
        ]),
      },
      { nodeIds: ["a"], edgeIds: [] },
      { key: "nudge:a", time: 400 }
    )
    if (!first || !second) throw new Error("expected entries")
    const history = pushHistory(pushHistory(EMPTY_HISTORY, first), second)
    expect(history.past).toHaveLength(1)
    expect(history.past[0].nodes[0].before?.position).toEqual({ x: 0, y: 0 })
    expect(history.past[0].nodes[0].after?.position).toEqual({ x: 16, y: 0 })

    const late = { ...second, time: 2000 }
    expect(pushHistory(history, late).past).toHaveLength(2)
  })

  it("keeps at most the limit", () => {
    let history = EMPTY_HISTORY
    for (let time = 0; time < 5; time++) {
      history = pushHistory(history, { nodes: [], edges: [], time }, 3)
    }
    expect(history.past.map(({ time }) => time)).toEqual([2, 3, 4])
  })
})
