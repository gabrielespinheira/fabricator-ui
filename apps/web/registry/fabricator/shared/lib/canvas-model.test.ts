import { describe, expect, it } from "vitest"

import {
  applyCanvasEdgeChanges,
  applyCanvasNodeChanges,
  CanvasNodeNotFoundError,
  createEdge,
  getAbsolutePosition,
  getConnectedPorts,
  getGroupChanges,
  getIncomers,
  getNodesBounds,
  getOutgoers,
  getReadingOrder,
  getRemovalChanges,
  getSelectionChanges,
  getUngroupChanges,
  getZOrderChanges,
  indexNodes,
  type CanvasEdge,
  type CanvasNode,
} from "./canvas-model"

function node(
  id: string,
  x: number,
  y: number,
  extra: Partial<CanvasNode> = {}
): CanvasNode {
  return {
    id,
    position: { x, y },
    data: {},
    width: 100,
    height: 40,
    ...extra,
  }
}

function edge(source: string, target: string, extra: Partial<CanvasEdge> = {}) {
  return { id: `${source}-${target}`, source, target, ...extra }
}

describe("applyCanvasNodeChanges", () => {
  const nodes = [node("a", 0, 0), node("b", 200, 0), node("c", 400, 0)]

  it("keeps the identity of nodes without a change", () => {
    const next = applyCanvasNodeChanges(nodes, [
      { id: "b", type: "position", position: { x: 210, y: 5 }, dragging: true },
    ])
    expect(next[0]).toBe(nodes[0])
    expect(next[2]).toBe(nodes[2])
    expect(next[1]).toMatchObject({
      position: { x: 210, y: 5 },
      dragging: true,
    })
  })

  it("returns the same array for no changes", () => {
    expect(applyCanvasNodeChanges(nodes, [])).toBe(nodes)
  })

  it("lets a removal win over other changes to the node", () => {
    const next = applyCanvasNodeChanges(nodes, [
      { id: "a", type: "select", selected: true },
      { id: "a", type: "remove" },
    ])
    expect(next.map(({ id }) => id)).toEqual(["b", "c"])
  })

  it("adds at an index, or at the end", () => {
    const next = applyCanvasNodeChanges(nodes, [
      { id: "d", type: "add", item: node("d", 0, 0) },
      { id: "g", type: "add", item: node("g", 0, 0), index: 0 },
    ])
    expect(next.map(({ id }) => id)).toEqual(["g", "a", "b", "c", "d"])
  })

  it("ignores an add for an id that exists", () => {
    const next = applyCanvasNodeChanges(nodes, [
      { id: "a", type: "add", item: node("a", 9, 9) },
    ])
    expect(next).toHaveLength(3)
    expect(next[0].position).toEqual({ x: 0, y: 0 })
  })

  it("records measured sizes and sets attributes only when asked", () => {
    const [measured] = applyCanvasNodeChanges(nodes, [
      { id: "a", type: "dimensions", dimensions: { width: 120, height: 48 } },
    ])
    expect(measured.measured).toEqual({ width: 120, height: 48 })
    expect(measured.width).toBe(100)
    const [resized] = applyCanvasNodeChanges(nodes, [
      {
        id: "a",
        type: "dimensions",
        dimensions: { width: 160, height: 60 },
        setAttributes: true,
        resizing: true,
      },
    ])
    expect(resized).toMatchObject({ width: 160, height: 60, resizing: true })
  })

  it("merges data, or replaces it", () => {
    const withData = [node("a", 0, 0, { data: { title: "Fetch", retries: 2 } })]
    expect(
      applyCanvasNodeChanges(withData, [
        { id: "a", type: "data", data: { retries: 3 } },
      ])[0].data
    ).toEqual({ title: "Fetch", retries: 3 })
    expect(
      applyCanvasNodeChanges(withData, [
        { id: "a", type: "data", data: { title: "Parse" }, replace: true },
      ])[0].data
    ).toEqual({ title: "Parse" })
  })

  it("keeps a node when a selection change matches its state", () => {
    const selected = [node("a", 0, 0, { selected: true })]
    const next = applyCanvasNodeChanges(selected, [
      { id: "a", type: "select", selected: true },
    ])
    expect(next[0]).toBe(selected[0])
  })
})

describe("applyCanvasEdgeChanges", () => {
  it("replaces, selects and removes edges", () => {
    const edges = [edge("a", "b"), edge("b", "c")]
    const next = applyCanvasEdgeChanges(edges, [
      { id: "a-b", type: "select", selected: true },
      { id: "b-c", type: "remove" },
    ])
    expect(next).toEqual([{ ...edges[0], selected: true }])
  })
})

describe("positions and bounds", () => {
  const nodes = [
    node("group", 100, 100, { width: 300, height: 200 }),
    node("child", 20, 30, { parentId: "group" }),
    node("grandchild", 5, 5, { parentId: "child" }),
  ]
  const byId = indexNodes(nodes)

  it("adds up parent positions", () => {
    expect(getAbsolutePosition(nodes[2], byId)).toEqual({ x: 125, y: 135 })
  })

  it("survives a parent loop", () => {
    const looped = [
      node("a", 1, 1, { parentId: "b" }),
      node("b", 2, 2, { parentId: "a" }),
    ]
    expect(getAbsolutePosition(looped[0], indexNodes(looped))).toEqual({
      x: 3,
      y: 3,
    })
  })

  it("measures bounds, preferring measured sizes and skipping hidden nodes", () => {
    const bounds = getNodesBounds([
      node("a", 0, 0, { measured: { width: 50, height: 20 } }),
      node("b", 200, 100),
      node("c", 900, 900, { hidden: true }),
    ])
    expect(bounds).toEqual({ x: 0, y: 0, width: 300, height: 140 })
  })

  it("has no bounds for no nodes", () => {
    expect(getNodesBounds([])).toBeNull()
  })
})

describe("connections", () => {
  const nodes = [node("a", 0, 0), node("b", 200, 0), node("c", 400, 0)]
  const edges = [edge("a", "b"), edge("b", "c")]

  it("creates an edge with a stable id and skips duplicates", () => {
    const connection = {
      source: "a",
      target: "c",
      sourceHandle: "out",
      targetHandle: null,
    }
    expect(createEdge(edges, connection)).toEqual({
      id: "aout-c",
      source: "a",
      target: "c",
      sourceHandle: "out",
    })
    expect(
      createEdge(
        [...edges, { id: "x", source: "a", target: "c", sourceHandle: "out" }],
        connection
      )
    ).toBeNull()
  })

  it("finds incomers and outgoers", () => {
    expect(getIncomers("b", nodes, edges).map(({ id }) => id)).toEqual(["a"])
    expect(getOutgoers("b", nodes, edges).map(({ id }) => id)).toEqual(["c"])
  })
})

describe("getRemovalChanges", () => {
  const nodes = [
    node("group", 0, 0),
    node("child", 10, 10, { parentId: "group" }),
    node("keep", 300, 0),
    node("locked", 500, 0, { deletable: false }),
  ]
  const edges = [edge("child", "keep"), edge("keep", "locked")]

  it("takes a group's children and every edge touching them", () => {
    const { nodeChanges, edgeChanges } = getRemovalChanges(nodes, edges, {
      nodeIds: ["group"],
      edgeIds: [],
    })
    expect(nodeChanges.map(({ id }) => id).sort()).toEqual(["child", "group"])
    expect(edgeChanges.map(({ id }) => id)).toEqual(["child-keep"])
  })

  it("keeps what isn't deletable", () => {
    const { nodeChanges } = getRemovalChanges(nodes, edges, {
      nodeIds: ["locked"],
      edgeIds: [],
    })
    expect(nodeChanges).toEqual([])
  })
})

describe("getSelectionChanges", () => {
  it("selects exactly the given ids and skips unselectable ones", () => {
    const nodes = [
      node("a", 0, 0, { selected: true }),
      node("b", 0, 0),
      node("c", 0, 0, { selectable: false }),
    ]
    expect(getSelectionChanges(nodes, new Set(["b", "c"]))).toEqual([
      { id: "a", type: "select", selected: false },
      { id: "b", type: "select", selected: true },
    ])
  })
})

describe("grouping", () => {
  const nodes = [node("a", 100, 100), node("b", 300, 200)]
  const group = node("g", 0, 0, { type: "group" })

  it("wraps nodes in a padded group and keeps them in place on screen", () => {
    const changes = getGroupChanges(nodes, ["a", "b"], group, 20)
    const next = applyCanvasNodeChanges(nodes, changes)
    const byId = indexNodes(next)
    expect(next[0]).toMatchObject({
      id: "g",
      position: { x: 80, y: 80 },
      width: 340,
      height: 180,
    })
    expect(getAbsolutePosition(byId.get("a") ?? group, byId)).toEqual({
      x: 100,
      y: 100,
    })
    expect(byId.get("b")?.parentId).toBe("g")
  })

  it("puts children back where they were when ungrouped", () => {
    const grouped = applyCanvasNodeChanges(
      nodes,
      getGroupChanges(nodes, ["a", "b"], group, 20)
    )
    const ungrouped = applyCanvasNodeChanges(
      grouped,
      getUngroupChanges(grouped, "g")
    )
    expect(
      ungrouped.map(({ id, position, parentId }) => ({
        id,
        position,
        parentId,
      }))
    ).toEqual([
      { id: "a", position: { x: 100, y: 100 }, parentId: undefined },
      { id: "b", position: { x: 300, y: 200 }, parentId: undefined },
    ])
  })

  it("throws for a group that doesn't exist", () => {
    expect(() => getUngroupChanges(nodes, "missing")).toThrow(
      CanvasNodeNotFoundError
    )
  })
})

describe("getZOrderChanges", () => {
  it("raises above and lowers below every node", () => {
    const nodes = [node("a", 0, 0, { zIndex: 3 }), node("b", 0, 0)]
    expect(getZOrderChanges(nodes, ["b"], "front")).toEqual([
      { id: "b", type: "update", item: { zIndex: 4 } },
    ])
    expect(getZOrderChanges(nodes, ["a"], "back")).toEqual([
      { id: "a", type: "update", item: { zIndex: -1 } },
    ])
  })
})

describe("getReadingOrder", () => {
  it("reads rows top to bottom, start to end inside a row", () => {
    const nodes = [
      node("second-row", 0, 200),
      node("end", 400, 10),
      node("start", 0, 0),
      node("hidden", 0, -50, { hidden: true }),
    ]
    expect(getReadingOrder(nodes).map(({ id }) => id)).toEqual([
      "start",
      "end",
      "second-row",
    ])
  })
})

describe("getConnectedPorts", () => {
  it("lists the ports edges plug into, per node, skipping hidden edges", () => {
    const ports = getConnectedPorts([
      { id: "1", source: "a", target: "b", sourceHandle: "out" },
      { id: "2", source: "a", target: "c" },
      { id: "3", source: "c", target: "a", hidden: true },
    ])
    expect([...(ports.get("a") ?? [])]).toEqual(["source:out", "source:"])
    expect([...(ports.get("b") ?? [])]).toEqual(["target:"])
    expect(ports.has("d")).toBe(false)
  })
})
