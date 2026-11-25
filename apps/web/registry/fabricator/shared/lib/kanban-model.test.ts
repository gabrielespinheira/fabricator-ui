import { describe, expect, it } from "vitest"

import {
  applyKanbanMove,
  applyKanbanPageChange,
  getKanbanCardShift,
  getKanbanCover,
  getKanbanDropSlot,
  getKanbanLimitState,
  getKanbanPlacement,
  getKanbanRange,
  groupKanbanItems,
  insertKanbanItems,
  isKanbanFieldShown,
  mergeKanbanPage,
  renameKanbanColumn,
  showKanbanField,
  unassignedColumn,
  type KanbanPage,
} from "./kanban-model"

const items = [
  { id: "a", status: "todo" },
  { id: "b", status: "done" },
  { id: "c", status: "done" },
]
const getId = (item: (typeof items)[number]) => item.id
const columns = [
  { id: "todo", name: "To do" },
  { id: "done", name: "Done" },
]

describe("Kanban moves", () => {
  it("records neighbours past a partially loaded boundary", () => {
    expect(
      getKanbanPlacement("done", null, ["b", "c"], ["a"], 2, false)
    ).toEqual({
      columnId: "done",
      laneId: null,
      afterId: "c",
      beforeId: null,
      isEndLoaded: false,
    })
  })

  it("disregards dragged rows when finding neighbours", () => {
    expect(
      getKanbanPlacement("done", null, ["a", "b", "c"], ["b"], 2, true)
    ).toMatchObject({
      afterId: "a",
      beforeId: "c",
    })
  })

  it("rebases a batch against incoming rows without resurrecting deleted cards", () => {
    const incoming = [{ id: "d", status: "done" }, ...items.slice(0, 2)]
    const placement = getKanbanPlacement(
      "done",
      null,
      ["b", "c"],
      ["a", "c"],
      0,
      true
    )
    expect(
      applyKanbanMove(
        incoming,
        ["a", "c"],
        placement,
        getId,
        (item, target) => ({ ...item, status: target.columnId })
      )
    ).toEqual([incoming[0], { id: "a", status: "done" }, items[1]])
  })
})

describe("Kanban data", () => {
  it("preserves unassigned and stale values", () => {
    const rows = [...items, { id: "d", status: "old" }, { id: "e", status: "" }]
    const groups = groupKanbanItems(rows, columns, (row) => row.status || null)
    expect(groups.map((group) => group.items.map(getId))).toEqual([
      ["a"],
      ["b", "c"],
      ["e"],
      ["d"],
    ])
  })

  it("merges overlapping pages without changing the first occurrence's position", () => {
    expect(
      mergeKanbanPage(
        items,
        [
          { id: "b", status: "todo" },
          { id: "d", status: "done" },
        ],
        getId
      )
    ).toEqual([
      items[0],
      { id: "b", status: "todo" },
      items[2],
      { id: "d", status: "done" },
    ])
  })
})

describe("Saved Kanban changes", () => {
  it("counts unique loaded records and preserves a move to an unassigned page", () => {
    const columns = new Map<string, KanbanPage<(typeof items)[number]>>([
      [
        "done",
        { items: [items[1], items[2], items[2]], nextCursor: "next", total: 9 },
      ],
    ])
    const changed = applyKanbanPageChange(
      columns,
      (records) =>
        records.map((item) =>
          item.id === "b" ? { ...item, status: "" } : item
        ),
      getId,
      (item) => item.status || null
    )
    expect(changed.get("done")).toEqual({
      items: [items[2]],
      nextCursor: "next",
      total: 8,
    })
    expect(changed.get(unassignedColumn.id)).toEqual({
      items: [{ id: "b", status: "" }],
      nextCursor: null,
    })
  })
})

describe("Kanban drop slots", () => {
  // Three cards of 40, 80 and 40 with a gap of 8.
  const boxes = [
    { index: 0, top: 0, height: 40 },
    { index: 1, top: 48, height: 80 },
    { index: 2, top: 136, height: 40 },
  ]
  const gap = 8

  it("opens before the first card whose centre is below the dragged card's", () => {
    expect(
      getKanbanDropSlot({
        boxes,
        sourceIndex: null,
        height: 40,
        center: 60,
        gap,
      })
    ).toEqual({ index: 1, top: 48 })
  })

  it("opens at the end past the last centre, and at the top of an empty list", () => {
    expect(
      getKanbanDropSlot({
        boxes,
        sourceIndex: null,
        height: 40,
        center: 400,
        gap,
      })
    ).toEqual({ index: 3, top: 184 })
    expect(
      getKanbanDropSlot({
        boxes: [],
        sourceIndex: null,
        height: 40,
        center: 400,
        gap,
      })
    ).toEqual({ index: 0, top: 0 })
  })

  it("measures the list without the dragged card, so cards of unequal height settle", () => {
    const drop = getKanbanDropSlot({
      boxes,
      sourceIndex: 0,
      height: 40,
      center: 45,
      gap,
    })
    expect(drop).toEqual({ index: 2, top: 88 })
    expect(
      boxes.map(({ index }) =>
        getKanbanCardShift({
          index,
          sourceIndex: 0,
          dropIndex: drop.index,
          distance: 48,
        })
      )
    ).toEqual([0, -48, 0])
  })

  it("closes the gap the card left when it is over another column", () => {
    expect(
      boxes.map(({ index }) =>
        getKanbanCardShift({
          index,
          sourceIndex: 1,
          dropIndex: null,
          distance: 88,
        })
      )
    ).toEqual([0, 0, -88])
  })
})

describe("Kanban limits", () => {
  it("names a column at or over its limit", () => {
    expect(getKanbanLimitState({ id: "a", name: "A" }, 9)).toBeNull()
    expect(getKanbanLimitState({ id: "a", name: "A", limit: 3 }, 2)).toBeNull()
    expect(getKanbanLimitState({ id: "a", name: "A", limit: 3 }, 3)).toBe("at")
    expect(getKanbanLimitState({ id: "a", name: "A", limit: 3 }, 4)).toBe(
      "over"
    )
  })
})

describe("Kanban selection and inserts", () => {
  it("selects everything between two cards in either direction", () => {
    expect(getKanbanRange(["a", "b", "c", "d"], "c", "a")).toEqual([
      "a",
      "b",
      "c",
    ])
    expect(getKanbanRange(["a", "b"], "z", "b")).toEqual(["b"])
  })

  it("inserts beside a neighbour, once", () => {
    const placement = getKanbanPlacement("done", null, ["b", "c"], [], 1, true)
    const created = { id: "x", status: "done" }
    const rows = insertKanbanItems(items, [created], placement, getId)
    expect(rows.map(getId)).toEqual(["a", "b", "x", "c"])
    expect(insertKanbanItems(rows, [created], placement, getId)).toEqual(rows)
  })
})

describe("Kanban column names", () => {
  it("renames one column and keeps the others as they were", () => {
    const renamed = renameKanbanColumn(columns, "todo", "  Up next ")
    expect(renamed).toEqual([
      { id: "todo", name: "Up next" },
      { id: "done", name: "Done" },
    ])
    expect(renamed?.[1]).toBe(columns[1])
  })

  it("has nothing to save for a blank, unchanged or unknown name", () => {
    expect(renameKanbanColumn(columns, "todo", "   ")).toBeNull()
    expect(renameKanbanColumn(columns, "todo", " To do ")).toBeNull()
    expect(renameKanbanColumn(columns, "missing", "Up next")).toBeNull()
  })
})

describe("Kanban card fields", () => {
  const properties = [
    { id: "name", name: "Name", type: "title" },
    { id: "status", name: "Status", type: "status" },
    { id: "labels", name: "Labels", type: "multi-select" },
    { id: "secret", name: "Secret", type: "text", visibility: "hide" as const },
    { id: "media", name: "Media", type: "files" },
  ]
  const [title, status, labels, secret, media] = properties
  const view = { groupBy: "status" }

  it("shows what the view picks, or all that isn't hidden", () => {
    expect(isKanbanFieldShown(labels, view)).toBe(true)
    expect(isKanbanFieldShown(secret, view)).toBe(false)
    const picked = { ...view, visibleProperties: ["secret"] }
    expect(isKanbanFieldShown(labels, picked)).toBe(false)
    expect(isKanbanFieldShown(secret, picked)).toBe(true)
  })

  it("has no say over the title and the grouping, which cards never list", () => {
    expect(isKanbanFieldShown(title, view)).toBeUndefined()
    expect(isKanbanFieldShown(status, view)).toBeUndefined()
    expect(isKanbanFieldShown(status, { groupBy: "labels" })).toBe(true)
  })

  it("turns one property on or off and leaves the rest as they were", () => {
    expect(showKanbanField(properties, view, "labels", false)).toEqual([
      "name",
      "status",
      "media",
    ])
    expect(
      showKanbanField(
        properties,
        { ...view, visibleProperties: ["labels"] },
        "media",
        true
      )
    ).toEqual(["labels", "media"])
    expect(
      showKanbanField(
        properties,
        { ...view, visibleProperties: ["labels"] },
        "labels",
        true
      )
    ).toEqual(["labels"])
  })

  it("covers cards only with a property they show", () => {
    expect(getKanbanCover(properties, view)).toBe(media)
    expect(getKanbanCover(properties, { ...view, cover: null })).toBeUndefined()
    expect(
      getKanbanCover(properties, { ...view, visibleProperties: ["labels"] })
    ).toBeUndefined()
    expect(
      getKanbanCover(properties, {
        ...view,
        cover: "media",
        visibleProperties: ["labels"],
      })
    ).toBeUndefined()
  })
})
