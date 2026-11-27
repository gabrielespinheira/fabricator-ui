import { describe, expect, it } from "vitest"

import {
  copyCanvasSelection,
  getPastedElements,
  parseCanvasClipboard,
  serializeCanvasClipboard,
} from "./canvas-clipboard"
import { type CanvasEdge, type CanvasNode } from "./canvas-model"

const nodes: CanvasNode[] = [
  {
    id: "group",
    position: { x: 100, y: 100 },
    data: {},
    width: 300,
    height: 200,
    selected: true,
  },
  {
    id: "child",
    position: { x: 20, y: 20 },
    data: { title: "Fetch" },
    parentId: "group",
    width: 100,
    height: 40,
  },
  {
    id: "loose",
    position: { x: 10, y: 10 },
    data: {},
    parentId: "other",
    width: 100,
    height: 40,
  },
  {
    id: "other",
    position: { x: 500, y: 0 },
    data: {},
    width: 300,
    height: 200,
  },
  {
    id: "outside",
    position: { x: 900, y: 0 },
    data: {},
    width: 100,
    height: 40,
  },
]
const edges: CanvasEdge[] = [
  { id: "inside", source: "group", target: "child" },
  { id: "leaving", source: "child", target: "outside" },
]

describe("copyCanvasSelection", () => {
  it("copies groups with their children and only edges between copied nodes", () => {
    const clipboard = copyCanvasSelection(nodes, edges, ["group"])
    expect(clipboard?.nodes.map(({ id }) => id)).toEqual(["group", "child"])
    expect(clipboard?.edges.map(({ id }) => id)).toEqual(["inside"])
    expect(clipboard?.nodes[0].selected).toBeUndefined()
  })

  it("frees a node copied without its parent at its canvas position", () => {
    const clipboard = copyCanvasSelection(nodes, edges, ["loose"])
    expect(clipboard?.nodes[0]).toMatchObject({
      parentId: undefined,
      position: { x: 510, y: 10 },
    })
  })

  it("copies nothing for an empty selection", () => {
    expect(copyCanvasSelection(nodes, edges, [])).toBeNull()
  })
})

describe("parseCanvasClipboard", () => {
  it("round-trips a copy", () => {
    const clipboard = copyCanvasSelection(nodes, edges, ["group"])
    if (!clipboard) throw new Error("expected a copy")
    expect(
      parseCanvasClipboard(serializeCanvasClipboard(clipboard))?.nodes
    ).toHaveLength(2)
  })

  it("ignores text that isn't a canvas selection", () => {
    expect(parseCanvasClipboard("Hello")).toBeNull()
    expect(
      parseCanvasClipboard(
        '{"kind":"fabricator-canvas","version":2,"nodes":[],"edges":[]}'
      )
    ).toBeNull()
    expect(
      parseCanvasClipboard(
        '{"kind":"fabricator-canvas","version":1,"nodes":[{"id":1}],"edges":[]}'
      )
    ).toBeNull()
  })
})

describe("getPastedElements", () => {
  let next = 0
  const createId = () => `new-${++next}`

  it("remaps ids, keeps internal edges and offsets the paste", () => {
    next = 0
    const clipboard = copyCanvasSelection(nodes, edges, ["group"])
    if (!clipboard) throw new Error("expected a copy")
    const pasted = getPastedElements(clipboard, { createId })
    expect(
      pasted.nodes.map(({ id, parentId, position, selected }) => ({
        id,
        parentId,
        position,
        selected,
      }))
    ).toEqual([
      {
        id: "new-1",
        parentId: undefined,
        position: { x: 124, y: 124 },
        selected: true,
      },
      {
        id: "new-2",
        parentId: "new-1",
        position: { x: 20, y: 20 },
        selected: true,
      },
    ])
    expect(pasted.edges).toEqual([
      { id: "new-3", source: "new-1", target: "new-2", selected: false },
    ])
  })

  it("lands the copied bounds at a point", () => {
    const clipboard = copyCanvasSelection(nodes, edges, ["outside"])
    if (!clipboard) throw new Error("expected a copy")
    expect(
      getPastedElements(clipboard, { createId, at: { x: 0, y: 0 } }).nodes[0]
        .position
    ).toEqual({ x: 0, y: 0 })
  })
})
