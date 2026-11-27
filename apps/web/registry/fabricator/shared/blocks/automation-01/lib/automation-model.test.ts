import { describe, expect, it } from "vitest"

import {
  type CanvasEdge,
  type CanvasNode,
} from "@/registry/bases/__base__/lib/canvas-model"

import {
  AUTOMATION_EDGES,
  AUTOMATION_NODES,
  AUTOMATION_SAMPLE,
} from "./automation-data"
import {
  connectNewStep,
  exportWorkflow,
  getRunDuration,
  getRunPath,
  insertStepOnEdge,
  type AutomationStepData,
} from "./automation-model"

function step(
  id: string,
  kind: AutomationStepData["kind"],
  extra: Partial<AutomationStepData> = {}
): CanvasNode {
  return {
    id,
    type: kind === "resource" ? "resource" : "step",
    position: { x: 0, y: 0 },
    data: {
      title: id,
      description: "",
      kind,
      icon: "zap",
      app: "Test",
      settings: [],
      sample: { durationMs: 100, output: "" },
      ...extra,
    },
  }
}

function edge(
  source: string,
  target: string,
  extra: Partial<CanvasEdge> = {}
): CanvasEdge {
  return { id: `${source}-${target}`, source, target, ...extra }
}

describe("getRunPath", () => {
  const nodes = [
    step("start", "trigger"),
    step("model", "resource", { resource: "model" }),
    step("agent", "agent"),
    step("route", "router", {
      routes: [
        { id: "a", label: "A" },
        { id: "b", label: "B" },
      ],
    }),
    step("a1", "action"),
    step("a2", "action"),
    step("b1", "action"),
    step("merge", "action"),
    { id: "note", type: "note", position: { x: 0, y: 0 }, data: { text: "" } },
  ]
  const edges = [
    edge("start", "agent"),
    edge("model", "agent", { targetHandle: "model" }),
    edge("agent", "route"),
    edge("route", "a1", { sourceHandle: "a" }),
    edge("route", "b1", { sourceHandle: "b" }),
    edge("a1", "a2"),
    edge("a2", "merge"),
    edge("b1", "merge"),
  ]

  it("follows the chosen route and runs resources with their agent", () => {
    expect(getRunPath(nodes, edges, { route: "a" })).toEqual([
      "start",
      "model",
      "agent",
      "route",
      "a1",
      "a2",
      "merge",
    ])
  })

  it("makes a merge wait for every reached step before it", () => {
    const both = [...edges, edge("start", "b1")]
    const path = getRunPath(nodes, both, { route: "a" })
    expect(path.indexOf("merge")).toBeGreaterThan(path.indexOf("b1"))
    expect(path.indexOf("merge")).toBeGreaterThan(path.indexOf("a2"))
  })

  it("stops at a router with no chosen route", () => {
    expect(getRunPath(nodes, edges, {})).toEqual([
      "start",
      "model",
      "agent",
      "route",
    ])
  })

  it("takes the sample ticket down the billing lane", () => {
    const path = getRunPath(
      AUTOMATION_NODES,
      AUTOMATION_EDGES,
      AUTOMATION_SAMPLE.choices
    )
    expect(path[0]).toBe("new-ticket")
    expect(path).toContain("refund-payment")
    expect(path).not.toContain("create-issue")
    expect(path.at(-1)).toBe("log-run")
  })
})

describe("getRunDuration", () => {
  it("adds up the samples of the steps taken", () => {
    const nodes = [step("a", "trigger"), step("b", "action")]
    expect(getRunDuration(nodes, ["a", "b", "missing"])).toBe(200)
  })
})

describe("connectNewStep", () => {
  it("runs forwards from an output and backwards into an input", () => {
    expect(
      connectNewStep({ nodeId: "a", handleId: "yes", kind: "source" }, "new")
    ).toMatchObject({
      source: "a",
      sourceHandle: "yes",
      target: "new",
      targetHandle: "item",
      type: "smoothstep",
    })
    expect(
      connectNewStep({ nodeId: "a", handleId: "item", kind: "target" }, "new")
    ).toMatchObject({ source: "new", target: "a", targetHandle: "item" })
  })

  it("plugs a new tool into an agent's tool port", () => {
    expect(
      connectNewStep({ nodeId: "agent", handleId: "tool", kind: "target" }, "t")
    ).toEqual({
      id: "t-agent",
      type: undefined,
      source: "t",
      sourceHandle: "tool",
      target: "agent",
      targetHandle: "tool",
    })
  })
})

describe("insertStepOnEdge", () => {
  it("splits a connection around the new step, keeping its label first", () => {
    const edges = [
      edge("route", "next", { sourceHandle: "a", label: "A", selected: true }),
    ]
    expect(insertStepOnEdge(edges, "route-next", "new")).toEqual([
      {
        id: "route-next-in",
        source: "route",
        sourceHandle: "a",
        target: "new",
        targetHandle: "item",
        label: "A",
        selected: true,
      },
      {
        id: "route-next-out",
        source: "new",
        sourceHandle: "item",
        target: "next",
        label: undefined,
        selected: false,
      },
    ])
  })

  it("leaves the edges alone for an unknown id", () => {
    const edges = [edge("a", "b")]
    expect(insertStepOnEdge(edges, "missing", "new")).toEqual(edges)
  })
})

describe("exportWorkflow", () => {
  it("keeps what was built and drops run and view state", () => {
    const file = JSON.parse(
      exportWorkflow(
        "Flow",
        [{ ...step("a", "trigger"), selected: true, status: "success" }],
        [{ ...edge("a", "b"), animated: true }]
      )
    )
    expect(file.name).toBe("Flow")
    expect(file.nodes[0]).not.toHaveProperty("selected")
    expect(file.nodes[0]).not.toHaveProperty("status")
    expect(file.edges[0]).toEqual({ id: "a-b", source: "a", target: "b" })
  })
})
