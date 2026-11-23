import { describe, expect, it } from "vitest"

import {
  getSankeyHighlight,
  getSankeyLabels,
  getSankeyLinkPath,
  getSankeyMark,
  getSankeyMarkAt,
  getSankeyModel,
  getSankeyTable,
  getSankeyTooltip,
  interpolateSankey,
  SANKEY_NODE_WIDTH,
  SankeyLayoutError,
  type SankeyLinkDatum,
  type SankeyModel,
  type SankeyNodeDatum,
} from "./chart-sankey-model"

const nodes: SankeyNodeDatum[] = [
  { id: "direct", label: "Direct" },
  { id: "partners", label: "Partners" },
  { id: "platform", label: "Platform" },
  { id: "support", label: "Support" },
  { id: "americas", label: "Americas" },
  { id: "emea", label: "EMEA" },
]
const links: SankeyLinkDatum[] = [
  { source: "direct", target: "platform", value: 60 },
  { source: "direct", target: "support", value: 20 },
  { source: "partners", target: "platform", value: 30 },
  { source: "partners", target: "support", value: 10 },
  { source: "platform", target: "americas", value: 50 },
  { source: "platform", target: "emea", value: 40 },
  { source: "support", target: "americas", value: 10 },
  { source: "support", target: "emea", value: 20 },
]
const size = { width: 600, height: 300 }

function model(
  options: Partial<Parameters<typeof getSankeyModel>[0]> = {}
): SankeyModel {
  return getSankeyModel({ nodes, links, size, fontSize: 12, ...options })
}

function node(current: SankeyModel, id: string) {
  const found = current.nodes.find((item) => item.id === id)
  if (!found) throw new Error(`No node ${id}`)
  return found
}

describe("getSankeyModel: columns", () => {
  it("puts each node in the column of its longest path from a source", () => {
    const current = model()
    expect(current.columns).toBe(3)
    expect(node(current, "direct").column).toBe(0)
    expect(node(current, "platform").column).toBe(1)
    expect(node(current, "emea").column).toBe(2)
  })

  it("counts the longest path, not the shortest", () => {
    const current = getSankeyModel({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      links: [
        { source: "a", target: "b", value: 1 },
        { source: "b", target: "c", value: 1 },
        { source: "a", target: "c", value: 1 },
        { source: "c", target: "d", value: 2 },
      ],
      size,
      fontSize: 12,
    })
    expect(node(current, "c").column).toBe(2)
    expect(node(current, "d").column).toBe(3)
  })

  it("pushes sinks to the last column", () => {
    const current = getSankeyModel({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "early" }],
      links: [
        { source: "a", target: "b", value: 5 },
        { source: "b", target: "c", value: 5 },
        { source: "a", target: "early", value: 2 },
      ],
      size,
      fontSize: 12,
    })
    expect(node(current, "early").column).toBe(2)
    expect(node(current, "early").x).toBeCloseTo(size.width - SANKEY_NODE_WIDTH)
  })

  it("spreads columns across the width, the last at the end edge", () => {
    const current = model()
    expect(node(current, "direct").x).toBe(0)
    expect(node(current, "platform").x).toBeCloseTo(
      (size.width - SANKEY_NODE_WIDTH) / 2
    )
    expect(node(current, "americas").x + SANKEY_NODE_WIDTH).toBeCloseTo(
      size.width
    )
  })
})

describe("getSankeyModel: flow", () => {
  it("sizes each node by the larger of its inflow and outflow", () => {
    const current = model()
    const platform = node(current, "platform")
    expect(platform.valueIn).toBe(90)
    expect(platform.valueOut).toBe(90)
    expect(node(current, "direct").value).toBe(80)
    const ratio =
      node(current, "direct").height / node(current, "partners").height
    expect(ratio).toBeCloseTo(2)
  })

  it("conserves flow: links fill each node's stack exactly", () => {
    const current = model()
    for (const item of current.nodes) {
      const leaving = current.links.filter((link) => link.source === item.id)
      const arriving = current.links.filter((link) => link.target === item.id)
      const out = leaving.reduce((total, link) => total + link.value, 0)
      const into = arriving.reduce((total, link) => total + link.value, 0)
      expect(out).toBe(item.valueOut)
      expect(into).toBe(item.valueIn)
      const thickness = (edges: { top: number; bottom: number }[]) =>
        edges.reduce((total, edge) => total + edge.bottom - edge.top, 0)
      if (leaving.length) {
        const span = thickness(
          leaving.map((link) => ({
            top: link.sourceTop,
            bottom: link.sourceBottom,
          }))
        )
        expect(span).toBeCloseTo((item.height * item.valueOut) / item.value)
        for (const link of leaving) {
          expect(link.sourceTop).toBeGreaterThanOrEqual(item.y - 1e-6)
          expect(link.sourceBottom).toBeLessThanOrEqual(
            item.y + item.height + 1e-6
          )
        }
      }
      if (arriving.length) {
        const span = thickness(
          arriving.map((link) => ({
            top: link.targetTop,
            bottom: link.targetBottom,
          }))
        )
        expect(span).toBeCloseTo((item.height * item.valueIn) / item.value)
      }
    }
  })

  it("makes a link as thick at both ends as its value", () => {
    const current = model()
    const scale = node(current, "direct").height / 80
    for (const link of current.links) {
      expect(link.sourceBottom - link.sourceTop).toBeCloseTo(link.value * scale)
      expect(link.targetBottom - link.targetTop).toBeCloseTo(link.value * scale)
    }
  })

  it("gives each link its share of its source's outflow", () => {
    const link = model().links.find((item) => item.id === "direct→platform")
    expect(link?.share).toBeCloseTo(0.75)
  })

  it("starts links at the source's end edge and ends them at the target's start", () => {
    const current = model()
    for (const link of current.links) {
      const source = node(current, link.source)
      const target = node(current, link.target)
      expect(link.x0).toBeCloseTo(source.x + source.width)
      expect(link.x1).toBeCloseTo(target.x)
    }
  })

  it("leaves out zero and invalid links, and nodes with no flow", () => {
    const current = getSankeyModel({
      nodes: [...nodes, { id: "unused" }],
      links: [...links, { source: "direct", target: "emea", value: 0 }],
      size,
      fontSize: 12,
    })
    expect(current.links).toHaveLength(links.length)
    expect(current.nodes.map((item) => item.id)).not.toContain("unused")
    expect(current.series.map((item) => item.key)).toContain("unused")
  })
})

describe("getSankeyModel: placement", () => {
  it("keeps nodes in a column apart and inside the plot", () => {
    const many = getSankeyModel({
      nodes: [
        { id: "s" },
        ...Array.from({ length: 8 }, (_, index) => ({ id: `t${index}` })),
      ],
      links: Array.from({ length: 8 }, (_, index) => ({
        source: "s",
        target: `t${index}`,
        value: index + 1,
      })),
      size,
      fontSize: 12,
    })
    for (const current of [model(), many]) {
      for (let column = 0; column < current.columns; column++) {
        const stack = current.nodes
          .filter((item) => item.column === column)
          .sort((a, b) => a.y - b.y)
        for (const item of stack) {
          expect(item.y).toBeGreaterThanOrEqual(-1e-6)
          expect(item.y + item.height).toBeLessThanOrEqual(size.height + 1e-6)
        }
        for (let index = 1; index < stack.length; index++) {
          const above = stack[index - 1]
          expect(stack[index].y).toBeGreaterThan(above.y + above.height)
        }
      }
    }
  })

  it("moves nodes towards their neighbours, so a lone flow runs level", () => {
    const current = getSankeyModel({
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }],
      links: [
        { source: "a", target: "c", value: 10 },
        { source: "b", target: "d", value: 30 },
      ],
      size,
      fontSize: 12,
    })
    const middle = (id: string) => {
      const item = node(current, id)
      return item.y + item.height / 2
    }
    expect(middle("c")).toBeCloseTo(middle("a"), 0)
    expect(middle("d")).toBeCloseTo(middle("b"), 0)
  })

  it("stacks a node's links in the order of their other ends", () => {
    const current = model()
    const leaving = current.links
      .filter((link) => link.source === "platform")
      .sort((a, b) => a.sourceTop - b.sourceTop)
    const targets = leaving.map((link) => node(current, link.target).y)
    expect(targets).toEqual([...targets].sort((a, b) => a - b))
  })

  it("orders nodes and links for reading: column by column, top down", () => {
    const current = model()
    for (let index = 1; index < current.nodes.length; index++) {
      const [a, b] = [current.nodes[index - 1], current.nodes[index]]
      expect(a.column < b.column || (a.column === b.column && a.y < b.y)).toBe(
        true
      )
    }
    for (let index = 1; index < current.links.length; index++) {
      const [a, b] = [current.links[index - 1], current.links[index]]
      const columnA = node(current, a.source).column
      const columnB = node(current, b.source).column
      expect(
        columnA < columnB || (columnA === columnB && a.sourceTop <= b.sourceTop)
      ).toBe(true)
    }
  })

  it("colours nodes in data order unless they have their own colour", () => {
    const current = getSankeyModel({
      nodes: nodes.map((item) =>
        item.id === "emea" ? { ...item, color: "muted-foreground" } : item
      ),
      links,
      size,
      fontSize: 12,
    })
    expect(node(current, "direct").paint).toEqual({ token: "chart-series-1" })
    expect(node(current, "support").paint).toEqual({ token: "chart-series-4" })
    expect(node(current, "emea").paint).toEqual({ token: "muted-foreground" })
    const link = current.links.find((item) => item.source === "support")
    expect(link?.paint).toEqual({ token: "chart-series-4" })
  })

  it("drops a hidden node and every link touching it", () => {
    const current = model({ hidden: new Set(["support"]) })
    expect(current.nodes.map((item) => item.id)).not.toContain("support")
    expect(
      current.links.some(
        (link) => link.source === "support" || link.target === "support"
      )
    ).toBe(false)
  })

  it("draws nothing without links or room", () => {
    expect(model({ links: [] }).nodes).toEqual([])
    expect(model({ size: { width: 0, height: 0 } }).links).toEqual([])
  })
})

describe("getSankeyModel: errors", () => {
  it("rejects a cycle with a typed error naming the loop", () => {
    const run = () =>
      getSankeyModel({
        nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
        links: [
          { source: "a", target: "b", value: 1 },
          { source: "b", target: "c", value: 1 },
          { source: "c", target: "a", value: 1 },
        ],
        size,
        fontSize: 12,
      })
    expect(run).toThrow(SankeyLayoutError)
    try {
      run()
    } catch (error) {
      expect(error).toBeInstanceOf(SankeyLayoutError)
      if (error instanceof SankeyLayoutError) {
        expect(error.code).toBe("cycle")
        expect(error.nodes).toEqual(["a", "b", "c", "a"])
      }
    }
  })

  it("rejects a link back to its own node", () => {
    expect(() =>
      getSankeyModel({
        nodes: [{ id: "a" }],
        links: [{ source: "a", target: "a", value: 1 }],
        size,
        fontSize: 12,
      })
    ).toThrow(expect.objectContaining({ code: "cycle", nodes: ["a", "a"] }))
  })

  it("rejects unknown and repeated nodes", () => {
    expect(() =>
      model({ links: [{ source: "direct", target: "nowhere", value: 1 }] })
    ).toThrow(
      expect.objectContaining({ code: "unknown-node", nodes: ["nowhere"] })
    )
    expect(() => model({ nodes: [...nodes, { id: "direct" }] })).toThrow(
      expect.objectContaining({ code: "duplicate-node" })
    )
  })
})

describe("getSankeyLabels", () => {
  it("puts the name and value after the node, before it in the last column", () => {
    const current = model()
    const direct = node(current, "direct")
    expect(direct.labelLines).toBe(2)
    const labels = getSankeyLabels(direct, 12)
    expect(labels.name?.x).toBe(direct.x + direct.width + 6)
    expect(labels.name?.anchor).toBe("start")
    expect(labels.value?.y ?? 0).toBeGreaterThan(labels.name?.y ?? 0)
    const emea = getSankeyLabels(node(current, "emea"), 12)
    expect(emea.name?.anchor).toBe("end")
    expect(emea.name?.x).toBe(node(current, "emea").x - 6)
  })

  it("drops the value, then the name, when they don't fit", () => {
    const narrow = model({ size: { width: 140, height: 300 } })
    expect(node(narrow, "direct").labelLines).toBe(0)
    const short = model({ size: { width: 600, height: 40 } })
    expect(node(short, "partners").labelLines).toBeLessThan(2)
  })
})

describe("getSankeyLinkPath", () => {
  it("closes a ribbon between two cubic curves", () => {
    expect(
      getSankeyLinkPath({
        x0: 10,
        x1: 110,
        sourceTop: 0,
        sourceBottom: 20,
        targetTop: 50,
        targetBottom: 70,
      })
    ).toBe("M10,0C60,0 60,50 110,50L110,70C60,70 60,20 10,20Z")
  })
})

describe("getSankeyMarkAt", () => {
  it("finds a node, with a reach wider than the node", () => {
    const current = model()
    const direct = node(current, "direct")
    const index = getSankeyMarkAt(current, {
      x: direct.x + direct.width + 5,
      y: direct.y + direct.height / 2,
    })
    const mark = getSankeyMark(current, index)
    expect(mark?.kind === "node" && mark.node.id).toBe("direct")
  })

  it("finds the link under a point between columns", () => {
    const current = model()
    const link = current.links[0]
    const x = (link.x0 + link.x1) / 2
    const y =
      (link.sourceTop +
        link.sourceBottom +
        link.targetTop +
        link.targetBottom) /
      4
    expect(getSankeyMarkAt(current, { x, y })).toBe(0)
    expect(getSankeyMarkAt(current, { x: -50, y: -50 })).toBe(-1)
  })

  it("keeps the previous mark on a miss", () => {
    const current = model()
    expect(getSankeyMarkAt(current, { x: -50, y: -50 }, 3)).toBe(3)
  })

  it("lets a hit replace the previous mark", () => {
    const current = model()
    const link = current.links[0]
    const x = (link.x0 + link.x1) / 2
    const y =
      (link.sourceTop +
        link.sourceBottom +
        link.targetTop +
        link.targetBottom) /
      4
    expect(getSankeyMarkAt(current, { x, y }, 3)).toBe(0)
  })

  it("drops a previous mark the model no longer has", () => {
    const current = model()
    const count = current.links.length + current.nodes.length
    expect(getSankeyMarkAt(current, { x: -50, y: -50 }, count)).toBe(-1)
  })
})

describe("getSankeyHighlight", () => {
  it("lights a node, its links and the nodes at their other ends", () => {
    const current = model()
    const at = (id: string) =>
      current.links.length + current.nodes.indexOf(node(current, id))
    const platform = getSankeyHighlight(current, at("platform"))
    expect([...(platform?.nodes ?? [])].sort()).toEqual([
      "americas",
      "direct",
      "emea",
      "partners",
      "platform",
    ])
    expect([...(platform?.links ?? [])].sort()).toEqual([
      "direct→platform",
      "partners→platform",
      "platform→americas",
      "platform→emea",
    ])
    const direct = getSankeyHighlight(current, at("direct"))
    expect([...(direct?.nodes ?? [])].sort()).toEqual([
      "direct",
      "platform",
      "support",
    ])
    expect(direct?.links.size).toBe(2)
  })

  it("lights a link and the two nodes it joins", () => {
    const current = model()
    const index = current.links.findIndex((link) => link.id === "support→emea")
    const lit = getSankeyHighlight(current, index)
    expect([...(lit?.links ?? [])]).toEqual(["support→emea"])
    expect([...(lit?.nodes ?? [])].sort()).toEqual(["emea", "support"])
  })

  it("lights nothing for an index past the marks", () => {
    expect(getSankeyHighlight(model(), 999)).toBeNull()
  })
})

describe("interpolateSankey", () => {
  const next = model({
    links: [
      ...links.filter((link) => link.target !== "support"),
      { source: "platform", target: "americas", value: 10 },
    ].filter((link) => link.source !== "support"),
  })

  it("moves what stays and thins what leaves", () => {
    const from = model()
    const halfway = interpolateSankey(from, next, 0.5)
    const direct = halfway?.nodes.find((item) => item.id === "direct")
    expect(direct?.height).toBeCloseTo(
      (node(from, "direct").height + node(next, "direct").height) / 2
    )
    const end = interpolateSankey(from, next, 1)
    const support = end?.nodes.find((item) => item.id === "support")
    expect(support?.isLeaving).toBe(true)
    expect(support?.height).toBe(0)
    const leavingLink = end?.links.find((link) => link.id === "direct→support")
    expect(leavingLink?.isLeaving).toBe(true)
    expect(
      (leavingLink?.sourceBottom ?? 1) - (leavingLink?.sourceTop ?? 0)
    ).toBe(0)
  })

  it("grows a new link from its middle", () => {
    const start = interpolateSankey(next, model(), 0)
    const link = start?.links.find((item) => item.id === "support→emea")
    expect(link?.sourceTop).toBeCloseTo(link?.sourceBottom ?? -1)
  })

  it("can't morph between diagrams that share no node", () => {
    const other = getSankeyModel({
      nodes: [{ id: "x" }, { id: "y" }],
      links: [{ source: "x", target: "y", value: 1 }],
      size,
      fontSize: 12,
    })
    expect(interpolateSankey(model(), other, 0.5)).toBeNull()
  })
})

describe("getSankeyTooltip", () => {
  it("gives a link's flow and share of its source", () => {
    const current = model()
    const index = current.links.findIndex(
      (link) => link.id === "direct→platform"
    )
    expect(getSankeyTooltip(current, index)).toEqual({
      title: "Direct → Platform",
      rows: [
        expect.objectContaining({ label: "Flow", value: "60" }),
        expect.objectContaining({ label: "Of Direct", value: "75%" }),
      ],
    })
  })

  it("gives a node's totals in and out, and only out for a source", () => {
    const current = model()
    const at = (id: string) =>
      current.links.length + current.nodes.indexOf(node(current, id))
    expect(
      getSankeyTooltip(current, at("platform")).rows.map((row) => row.label)
    ).toEqual(["In", "Out"])
    expect(getSankeyTooltip(current, at("direct"))).toEqual({
      title: "Direct",
      rows: [expect.objectContaining({ label: "Out", value: "80" })],
    })
  })
})

describe("getSankeyTable", () => {
  it("lists every link", () => {
    const table = getSankeyTable(model())
    expect(table.columns).toEqual(["Flow", "Share of source"])
    expect(table.rows).toHaveLength(links.length)
    expect(table.rows).toContainEqual({
      header: "Support → EMEA",
      cells: ["20", "66.7%"],
    })
  })
})
