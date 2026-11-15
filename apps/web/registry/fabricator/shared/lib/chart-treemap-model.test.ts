import { describe, expect, it } from "vitest"

import {
  getTreemapCellAt,
  getTreemapLabels,
  getTreemapModel,
  getTreemapTable,
  getTreemapTooltip,
  interpolateTreemapCells,
  revealTreemapCell,
  TREEMAP_GAP,
  type TreemapCell,
} from "./chart-treemap-model"

const data = [
  {
    name: "Technology",
    children: [
      { name: "Northwind", value: 40 },
      { name: "Contoso", value: 20 },
    ],
  },
  {
    name: "Health",
    children: [
      { name: "Fabrikam", value: 25 },
      { name: "Litware", value: 5 },
    ],
  },
  { name: "Cash", value: 10 },
]
const size = { width: 400, height: 300 }

function model(options: Partial<Parameters<typeof getTreemapModel>[0]> = {}) {
  return getTreemapModel({ data, size, ...options })
}

function overlaps(a: TreemapCell, b: TreemapCell) {
  return (
    a.x < b.x + b.width - 1e-6 &&
    b.x < a.x + a.width - 1e-6 &&
    a.y < b.y + b.height - 1e-6 &&
    b.y < a.y + a.height - 1e-6
  )
}

describe("getTreemapModel", () => {
  it("draws one cell per leaf, sized by value", () => {
    const { cells, total } = model()
    expect(cells).toHaveLength(5)
    expect(total).toBe(100)
    const northwind = cells.find((cell) => cell.name === "Northwind")
    const contoso = cells.find((cell) => cell.name === "Contoso")
    const area = (cell?: TreemapCell) =>
      (cell?.width ?? 0) * (cell?.height ?? 0)
    expect(area(northwind) / area(contoso)).toBeGreaterThan(1.6)
    expect(northwind?.share).toBeCloseTo(0.4)
  })

  it("fills the plot and keeps cells apart", () => {
    const { cells } = model()
    for (const cell of cells) {
      expect(cell.x).toBeGreaterThanOrEqual(0)
      expect(cell.y).toBeGreaterThanOrEqual(0)
      expect(cell.x + cell.width).toBeLessThanOrEqual(size.width + 1e-6)
      expect(cell.y + cell.height).toBeLessThanOrEqual(size.height + 1e-6)
    }
    for (const a of cells) {
      for (const b of cells) {
        if (a !== b) expect(overlaps(a, b)).toBe(false)
      }
    }
  })

  it("leaves a 2px gap between neighbouring cells", () => {
    const { cells } = model()
    const gaps = cells.flatMap((a) =>
      cells.flatMap((b) => {
        const gap = b.x - (a.x + a.width)
        const sharesRows = a.y < b.y + b.height && b.y < a.y + a.height
        return a !== b && sharesRows && gap >= 0 && gap < 5 ? [gap] : []
      })
    )
    expect(gaps.length).toBeGreaterThan(0)
    for (const gap of gaps) expect(gap).toBeCloseTo(TREEMAP_GAP)
  })

  it("colours cells by top-level group, in data order", () => {
    const { cells, groups } = model()
    expect(groups.map((group) => group.key)).toEqual([
      "Technology",
      "Health",
      "Cash",
    ])
    expect(cells.find((cell) => cell.name === "Contoso")?.paint).toEqual({
      token: "chart-series-1",
    })
    expect(cells.find((cell) => cell.name === "Litware")?.paint).toEqual({
      token: "chart-series-2",
    })
    expect(cells.find((cell) => cell.name === "Cash")?.paint).toEqual({
      token: "chart-series-3",
    })
  })

  it("takes a group's colour and label from config", () => {
    const { cells, groups } = model({
      config: { Health: { label: "Healthcare", color: "chart-series-6" } },
    })
    expect(groups[1].label).toBe("Healthcare")
    expect(cells.find((cell) => cell.name === "Fabrikam")?.paint).toEqual({
      token: "chart-series-6",
    })
  })

  it("keys cells by their path", () => {
    const ids = model().cells.map((cell) => cell.id)
    expect(ids).toContain("Technology/Northwind")
    expect(ids).toContain("Cash")
  })

  it("orders cells group by group, each top to bottom then start to end", () => {
    const { cells } = model()
    const groupOrder = cells.map((cell) => cell.group)
    // Each group's cells are contiguous.
    expect(new Set(groupOrder).size).toBe(
      groupOrder.filter((group, index) => group !== groupOrder[index - 1])
        .length
    )
    for (let index = 1; index < cells.length; index++) {
      const [a, b] = [cells[index - 1], cells[index]]
      if (a.group !== b.group) continue
      expect(a.y < b.y - 1 || (Math.abs(a.y - b.y) <= 1 && a.x < b.x)).toBe(
        true
      )
    }
    expect(cells[0].x).toBeCloseTo(0)
    expect(cells[0].y).toBeCloseTo(0)
  })

  it("drops hidden groups and zero or missing values, keeping colours", () => {
    const { cells, groups, total } = getTreemapModel({
      data: [...data, { name: "Empty", value: 0 }, { name: "Missing" }],
      size,
      hidden: new Set(["Technology"]),
    })
    expect(cells.map((cell) => cell.name).sort()).toEqual([
      "Cash",
      "Fabrikam",
      "Litware",
    ])
    expect(total).toBe(40)
    expect(groups).toHaveLength(5)
    expect(cells.find((cell) => cell.name === "Cash")?.paint).toEqual({
      token: "chart-series-3",
    })
  })

  it("reads custom keys and deeper levels", () => {
    const { cells } = getTreemapModel({
      data: [
        {
          label: "Root",
          items: [
            { label: "A", items: [{ label: "A1", amount: 3 }] },
            { label: "B", amount: 1 },
          ],
        },
      ],
      nameKey: "label",
      valueKey: "amount",
      childrenKey: "items",
      size,
    })
    expect(cells.map((cell) => cell.id).sort()).toEqual(["Root/A/A1", "Root/B"])
    expect(cells.every((cell) => cell.group === "Root")).toBe(true)
  })

  it("is flat when every group is a leaf", () => {
    expect(model().isFlat).toBe(false)
    expect(
      getTreemapModel({
        data: [
          { name: "A", value: 1 },
          { name: "B", value: 2 },
        ],
        size,
      }).isFlat
    ).toBe(true)
  })

  it("draws nothing without values or room", () => {
    expect(getTreemapModel({ data: [], size }).cells).toEqual([])
    expect(model({ size: { width: 0, height: 0 } }).cells).toEqual([])
  })

  it("formats each cell's value", () => {
    const { cells } = model({ formatValue: (value) => `$${value}` })
    expect(cells.find((cell) => cell.name === "Northwind")?.valueText).toBe(
      "$40"
    )
  })
})

describe("getTreemapLabels", () => {
  const cell = { x: 10, y: 20, name: "Northwind", valueText: "40" }

  it("sets the name and the value at the start edge when both fit", () => {
    const labels = getTreemapLabels({ ...cell, width: 200, height: 80 }, 12)
    expect(labels.name?.x).toBe(18)
    expect(labels.value?.x).toBe(18)
    expect(labels.value?.y ?? 0).toBeGreaterThan(labels.name?.y ?? 0)
  })

  it("drops the value first, then the name", () => {
    const short = getTreemapLabels({ ...cell, width: 200, height: 30 }, 12)
    expect(short.name).not.toBeNull()
    expect(short.value).toBeNull()
    const narrow = getTreemapLabels({ ...cell, width: 40, height: 80 }, 12)
    expect(narrow).toEqual({ name: null, value: null })
  })
})

describe("getTreemapCellAt", () => {
  it("finds the cell under a point, and the nearer cell in a gap", () => {
    const current = model()
    const first = current.cells[0]
    expect(
      getTreemapCellAt(current, {
        x: first.x + first.width / 2,
        y: first.y + first.height / 2,
      })
    ).toBe(0)
    expect(
      getTreemapCellAt(current, {
        x: first.x + first.width + 0.5,
        y: first.y + 1,
      })
    ).toBe(0)
    expect(getTreemapCellAt(current, { x: -20, y: -20 })).toBe(-1)
  })
})

describe("revealTreemapCell", () => {
  it("scales a cell up from its centre while it fades in", () => {
    const rect = { x: 0, y: 0, width: 100, height: 50 }
    const start = revealTreemapCell(rect, 0)
    expect(start.opacity).toBe(0)
    expect(start.cell.width).toBeCloseTo(60)
    expect(start.cell.x + start.cell.width / 2).toBeCloseTo(50)
    expect(revealTreemapCell(rect, 1)).toEqual({ cell: rect, opacity: 1 })
  })
})

describe("interpolateTreemapCells", () => {
  const q1 = model()
  const q2 = getTreemapModel({
    data: [
      {
        name: "Technology",
        children: [
          { name: "Northwind", value: 10 },
          { name: "Contoso", value: 50 },
          { name: "Tailspin", value: 15 },
        ],
      },
      { name: "Health", children: [{ name: "Fabrikam", value: 25 }] },
    ],
    size,
  })

  it("moves cells that stay", () => {
    const halfway = interpolateTreemapCells(q1.cells, q2.cells, 0.5) ?? []
    const from = q1.cells.find((cell) => cell.id === "Technology/Contoso")
    const to = q2.cells.find((cell) => cell.id === "Technology/Contoso")
    const cell = halfway.find((item) => item.id === "Technology/Contoso")
    expect(cell?.width).toBeCloseTo(((from?.width ?? 0) + (to?.width ?? 0)) / 2)
  })

  it("grows new cells from their centre and shrinks leaving ones", () => {
    const start = interpolateTreemapCells(q1.cells, q2.cells, 0) ?? []
    const entering = start.find((cell) => cell.id === "Technology/Tailspin")
    expect(entering?.width).toBe(0)
    const end = interpolateTreemapCells(q1.cells, q2.cells, 1) ?? []
    const leaving = end.find((cell) => cell.id === "Health/Litware")
    expect(leaving?.isLeaving).toBe(true)
    expect(leaving?.width).toBe(0)
  })

  it("can't morph between maps that share no cell", () => {
    const other = getTreemapModel({ data: [{ name: "Z", value: 1 }], size })
    expect(interpolateTreemapCells(q1.cells, other.cells, 0.5)).toBeNull()
  })
})

describe("getTreemapTooltip", () => {
  it("names the leaf, its group, value and share", () => {
    const current = model()
    const index = current.cells.findIndex((cell) => cell.name === "Fabrikam")
    expect(getTreemapTooltip(current, index)).toEqual({
      title: "Fabrikam",
      rows: [
        expect.objectContaining({ label: "Health", value: "25" }),
        expect.objectContaining({ label: "Share of total", value: "25%" }),
      ],
    })
  })
})

describe("getTreemapTable", () => {
  it("lists every leaf with its group, value and share", () => {
    const table = getTreemapTable(model(), (value) => `$${value}`)
    expect(table.columns).toEqual(["Group", "Value", "Share of total"])
    expect(table.rows).toContainEqual({
      header: "Litware",
      cells: ["Health", "$5", "5%"],
    })
  })
})
