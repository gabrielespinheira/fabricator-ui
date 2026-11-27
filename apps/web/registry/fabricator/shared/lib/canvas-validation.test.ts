import { describe, expect, it } from "vitest"

import {
  type CanvasEdge,
  type CanvasHandleSpec,
  type CanvasNode,
} from "./canvas-model"
import {
  getConnectableTargets,
  getHandleKey,
  isReachable,
  validateCanvasConnection,
} from "./canvas-validation"

function node(id: string, x = 0, extra: Partial<CanvasNode> = {}): CanvasNode {
  return {
    id,
    position: { x, y: 0 },
    data: {},
    width: 100,
    height: 40,
    ...extra,
  }
}

function handle(spec: CanvasHandleSpec): [string, CanvasHandleSpec] {
  return [getHandleKey(spec.nodeId, spec.kind, spec.id), spec]
}

const nodes = [
  node("prompt", 0),
  node("model", 300),
  node("image", 600),
  node("locked", 900, { connectable: false }),
]
const edges: CanvasEdge[] = [
  {
    id: "e1",
    source: "prompt",
    target: "model",
    sourceHandle: "text",
    targetHandle: "in",
  },
]
const handles = new Map([
  handle({
    id: "text",
    nodeId: "prompt",
    kind: "source",
    side: "right",
    produces: "text",
  }),
  handle({
    id: "in",
    nodeId: "model",
    kind: "target",
    side: "left",
    accepts: ["text"],
    max: 1,
  }),
  handle({
    id: "out",
    nodeId: "model",
    kind: "source",
    side: "right",
    produces: "text",
  }),
  handle({
    id: "in",
    nodeId: "image",
    kind: "target",
    side: "left",
    accepts: ["image"],
  }),
  handle({
    id: "any",
    nodeId: "image",
    kind: "target",
    side: "top",
    accepts: ["*"],
  }),
])

function connect(
  source: string,
  sourceHandle: string | null,
  target: string,
  targetHandle: string | null
) {
  return { source, sourceHandle, target, targetHandle }
}

describe("validateCanvasConnection", () => {
  const options = { nodes, edges, handles }

  it("allows a compatible connection", () => {
    expect(
      validateCanvasConnection(connect("model", "out", "image", "any"), options)
    ).toEqual({ isValid: true })
  })

  it("refuses a self loop unless allowed", () => {
    expect(
      validateCanvasConnection(connect("model", "out", "model", "in"), options)
    ).toMatchObject({ issue: "self-loop" })
    expect(
      validateCanvasConnection(connect("model", "out", "model", "in"), {
        ...options,
        allowSelfLoops: true,
      })
    ).toMatchObject({ issue: "handle-full" })
  })

  it("refuses a duplicate", () => {
    expect(
      validateCanvasConnection(
        connect("prompt", "text", "model", "in"),
        options
      )
    ).toMatchObject({ issue: "duplicate" })
  })

  it("refuses mismatched value types", () => {
    expect(
      validateCanvasConnection(connect("model", "out", "image", "in"), options)
    ).toMatchObject({ issue: "type-mismatch" })
  })

  it("refuses a full handle", () => {
    expect(
      validateCanvasConnection(connect("image", null, "model", "in"), {
        ...options,
        handles: new Map(),
      })
    ).toEqual({ isValid: true })
    expect(
      validateCanvasConnection(connect("image", null, "model", "in"), options)
    ).toMatchObject({ issue: "handle-full" })
  })

  it("refuses a node that doesn't connect", () => {
    expect(
      validateCanvasConnection(connect("model", "out", "locked", null), options)
    ).toMatchObject({ issue: "not-connectable" })
  })

  it("refuses a cycle when cycles are off", () => {
    const chain = [...edges, { id: "e2", source: "model", target: "image" }]
    expect(
      validateCanvasConnection(connect("image", null, "prompt", null), {
        nodes,
        edges: chain,
        allowCycles: false,
      })
    ).toMatchObject({ issue: "cycle" })
    expect(
      validateCanvasConnection(connect("image", null, "prompt", null), {
        nodes,
        edges: chain,
      })
    ).toEqual({ isValid: true })
  })

  it("passes the project's rule message through", () => {
    expect(
      validateCanvasConnection(connect("model", "out", "image", "any"), {
        ...options,
        rule: () => "Images need a caption first",
      })
    ).toEqual({
      isValid: false,
      issue: "rule",
      message: "Images need a caption first",
    })
  })
})

describe("isReachable", () => {
  it("follows edges forwards only", () => {
    const chain = [
      { id: "1", source: "a", target: "b" },
      { id: "2", source: "b", target: "c" },
    ]
    expect(isReachable(chain, "a", "c")).toBe(true)
    expect(isReachable(chain, "c", "a")).toBe(false)
  })
})

describe("getConnectableTargets", () => {
  it("lists valid targets nearest first", () => {
    const source = handles.get(getHandleKey("model", "source", "out"))
    if (!source) throw new Error("fixture")
    expect(
      getConnectableTargets(source, { nodes, edges, handles }).map(
        (target) => `${target.nodeId}:${target.id}`
      )
    ).toEqual(["image:any"])
  })
})
