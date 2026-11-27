import { describe, expect, it } from "vitest"

import { getLayoutChanges, type CanvasLayoutEngine } from "./canvas-layout"
import { layoutWithDagre } from "./canvas-layout-dagre"
import { applyCanvasNodeChanges, type CanvasNode } from "./canvas-model"

function node(id: string, extra: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id,
    position: { x: 0, y: 0 },
    data: {},
    width: 120,
    height: 40,
    ...extra,
  }
}

const nodes = [
  node("root"),
  node("left"),
  node("right"),
  node("child", { parentId: "root" }),
  node("ghost", { hidden: true }),
]
const edges = [
  { id: "1", source: "root", target: "left" },
  { id: "2", source: "root", target: "right" },
  { id: "3", source: "root", target: "ghost" },
]

describe("getLayoutChanges", () => {
  it("lays out top-level visible nodes only, through the engine", () => {
    const seen: string[] = []
    const engine: CanvasLayoutEngine = (graph) => {
      seen.push(
        ...graph.nodes.map(({ id }) => id),
        ...graph.edges.map(({ target }) => target)
      )
      return new Map(
        graph.nodes.map(({ id }, index) => [id, { x: index * 10, y: 0 }])
      )
    }
    const changes = getLayoutChanges(nodes, edges, engine)
    expect(seen).toEqual(["root", "left", "right", "left", "right"])
    // root lands where it is, so only two nodes move.
    expect(changes.map(({ id }) => id)).toEqual(["left", "right"])
  })

  it("ranks a group by the connections of the nodes inside it", () => {
    let seen: string[] = []
    getLayoutChanges(
      [
        node("start"),
        node("group", { type: "group" }),
        node("inside", { parentId: "group" }),
        node("deeper", { parentId: "inside" }),
        node("end"),
      ],
      [
        { id: "1", source: "start", target: "deeper" },
        { id: "2", source: "deeper", target: "inside" },
        { id: "3", source: "inside", target: "end" },
      ],
      (graph) => {
        seen = graph.edges.map(({ source, target }) => `${source}>${target}`)
        return new Map()
      }
    )
    expect(seen).toEqual(["start>group", "group>end"])
  })

  it("gives unmeasured nodes a fallback size", () => {
    let width = 0
    getLayoutChanges(
      [node("a", { width: undefined, height: undefined })],
      [],
      (graph) => {
        width = graph.nodes[0].width
        return new Map()
      }
    )
    expect(width).toBe(160)
  })
})

describe("layoutWithDagre", () => {
  it("puts children below their parent going down", () => {
    const next = applyCanvasNodeChanges(
      nodes,
      getLayoutChanges(nodes, edges, layoutWithDagre)
    )
    const byId = new Map(next.map((item) => [item.id, item.position]))
    const root = byId.get("root")
    const left = byId.get("left")
    const right = byId.get("right")
    if (!root || !left || !right) throw new Error("expected positions")
    expect(left.y).toBeGreaterThan(root.y)
    expect(left.y).toBe(right.y)
    expect(left.x).not.toBe(right.x)
    expect(Number.isInteger(left.x)).toBe(true)
  })

  it("puts children to the right going right", () => {
    const next = applyCanvasNodeChanges(
      nodes,
      getLayoutChanges(nodes, edges, layoutWithDagre, { direction: "right" })
    )
    const byId = new Map(next.map((item) => [item.id, item.position]))
    expect(byId.get("left")?.x).toBeGreaterThan(byId.get("root")?.x ?? Infinity)
  })
})
