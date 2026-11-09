import { describe, expect, it } from "vitest"

import {
  getFileTreeDeleteNodes,
  getFileTreeIconKind,
  getFileTreeNavigationTarget,
  getFileTreeSelection,
  getFileTreeTypeaheadTarget,
  getVisibleFileTreeNodes,
  removeFileTreeNodes,
  type FileTreeNode,
} from "./file-tree-model"

const nodes: FileTreeNode[] = [
  {
    id: "src",
    name: "src",
    children: [
      { id: "app", name: "app", children: [{ id: "page", name: "page.tsx" }] },
      { id: "locked", name: "locked.ts", disabled: true },
      { id: "style", name: "styles.css" },
    ],
  },
  { id: "readme", name: "README.md" },
  { id: "empty", name: "empty", children: [] },
]

describe("file tree visibility", () => {
  it("walks expanded folders in display order with explicit ARIA positions", () => {
    const rows = getVisibleFileTreeNodes(nodes, ["src", "app"])
    expect(rows.map(({ node }) => node.id)).toEqual([
      "src",
      "app",
      "page",
      "locked",
      "style",
      "readme",
      "empty",
    ])
    expect(rows[2]).toMatchObject({
      level: 3,
      parentId: "app",
      position: 1,
      count: 1,
    })
    expect(rows[4]).toMatchObject({
      level: 2,
      parentId: "src",
      position: 3,
      count: 3,
    })
    expect(
      getVisibleFileTreeNodes(nodes, []).map(({ node }) => node.id)
    ).toEqual(["src", "readme", "empty"])
  })

  it("inherits disabled state from a parent", () => {
    const rows = getVisibleFileTreeNodes(
      [{ ...nodes[0], id: "locked-folder", name: "locked", disabled: true }],
      ["locked-folder"]
    )
    expect(rows.every((row) => row.isDisabled)).toBe(true)
  })
})

describe("file tree selection", () => {
  const rows = getVisibleFileTreeNodes(nodes, ["src", "app"])

  it("replaces a normal selection and toggles additive selections", () => {
    expect(
      getFileTreeSelection(rows, ["readme"], "page", { mode: "multiple" })
    ).toEqual(["page"])
    expect(
      getFileTreeSelection(rows, ["readme"], "page", {
        mode: "multiple",
        toggle: true,
      })
    ).toEqual(["readme", "page"])
    expect(
      getFileTreeSelection(rows, ["readme", "page"], "page", {
        mode: "multiple",
        toggle: true,
      })
    ).toEqual(["readme"])
  })

  it("selects a visible range in either direction, excluding disabled rows", () => {
    expect(
      getFileTreeSelection(rows, [], "readme", {
        mode: "multiple",
        anchorId: "page",
        range: true,
      })
    ).toEqual(["page", "style", "readme"])
    expect(
      getFileTreeSelection(rows, [], "page", {
        mode: "multiple",
        anchorId: "readme",
        range: true,
      })
    ).toEqual(["page", "style", "readme"])
  })

  it("unions additive ranges and uses the target if the anchor was collapsed", () => {
    expect(
      getFileTreeSelection(rows, ["src"], "readme", {
        mode: "multiple",
        anchorId: "style",
        range: true,
        toggle: true,
      })
    ).toEqual(["src", "style", "readme"])
    expect(
      getFileTreeSelection(
        getVisibleFileTreeNodes(nodes, []),
        ["page"],
        "readme",
        { mode: "multiple", anchorId: "page", range: true }
      )
    ).toEqual(["readme"])
  })

  it("honours single, none and disabled selection", () => {
    expect(
      getFileTreeSelection(rows, ["page"], "readme", {
        mode: "single",
        toggle: true,
        range: true,
        anchorId: "page",
      })
    ).toEqual(["readme"])
    expect(getFileTreeSelection(rows, [], "page", { mode: "none" })).toEqual([])
    expect(
      getFileTreeSelection(rows, ["page"], "locked", { mode: "multiple" })
    ).toEqual(["page"])
  })
})

describe("file tree keyboard navigation", () => {
  const rows = getVisibleFileTreeNodes(nodes, ["src", "app"])

  it("moves through visible enabled rows and stops at the ends", () => {
    expect(
      getFileTreeNavigationTarget(rows, "page", "ArrowDown")?.node.id
    ).toBe("style")
    expect(getFileTreeNavigationTarget(rows, "style", "ArrowUp")?.node.id).toBe(
      "page"
    )
    expect(getFileTreeNavigationTarget(rows, "src", "ArrowUp")?.node.id).toBe(
      "src"
    )
    expect(
      getFileTreeNavigationTarget(rows, "empty", "ArrowDown")?.node.id
    ).toBe("empty")
    expect(getFileTreeNavigationTarget(rows, "style", "Home")?.node.id).toBe(
      "src"
    )
    expect(getFileTreeNavigationTarget(rows, "style", "End")?.node.id).toBe(
      "empty"
    )
  })

  it("moves between parents and direct children, leaving collapsed or empty folders alone", () => {
    expect(
      getFileTreeNavigationTarget(rows, "src", "ArrowRight")?.node.id
    ).toBe("app")
    expect(
      getFileTreeNavigationTarget(rows, "page", "ArrowLeft")?.node.id
    ).toBe("app")
    expect(
      getFileTreeNavigationTarget(rows, "empty", "ArrowRight")
    ).toBeUndefined()
    expect(
      getFileTreeNavigationTarget(
        getVisibleFileTreeNodes(nodes, []),
        "src",
        "ArrowRight"
      )
    ).toBeUndefined()
    expect(getFileTreeNavigationTarget([], "missing", "Home")).toBeUndefined()
  })

  it("wraps typeahead, cycles repeated letters and skips disabled matches", () => {
    expect(getFileTreeTypeaheadTarget(rows, "src", "pa")?.node.id).toBe("page")
    expect(getFileTreeTypeaheadTarget(rows, "style", "s")?.node.id).toBe("src")
    expect(getFileTreeTypeaheadTarget(rows, "src", "ss")?.node.id).toBe("style")
    expect(getFileTreeTypeaheadTarget(rows, "src", "locked")).toBeUndefined()
  })
})

describe("file tree delete requests", () => {
  it("removes requested subtrees without mutating the source or losing empty folders", () => {
    const result = removeFileTreeNodes(nodes, ["page", "readme"])
    expect(result.map((node) => node.id)).toEqual(["src", "empty"])
    expect(result[0].children?.[0].children).toEqual([])
    expect(nodes[0].children?.[0].children).toHaveLength(1)
    expect(removeFileTreeNodes(nodes, ["src"]).map((node) => node.id)).toEqual([
      "readme",
      "empty",
    ])
  })
  it("emits a selected folder once, suppressing selected descendants", () => {
    expect(
      getFileTreeDeleteNodes(nodes, ["page", "src", "readme"]).map(
        (node) => node.id
      )
    ).toEqual(["src", "readme"])
  })

  it("includes selected hidden files but excludes stale and disabled ids", () => {
    expect(
      getFileTreeDeleteNodes(nodes, ["page", "locked", "missing"]).map(
        (node) => node.id
      )
    ).toEqual(["page"])
  })
})

describe("file tree icon kinds", () => {
  it("distinguishes empty folders, project folders and file extensions", () => {
    expect(getFileTreeIconKind({ id: "x", name: "app", children: [] })).toBe(
      "app"
    )
    expect(getFileTreeIconKind({ id: "x", name: "misc", children: [] })).toBe(
      "folder"
    )
    expect(getFileTreeIconKind({ id: "x", name: "view.TSX" })).toBe("react")
    expect(getFileTreeIconKind({ id: "x", name: "package.json" })).toBe("json")
    expect(getFileTreeIconKind({ id: "x", name: ".env.local" })).toBe("config")
    expect(getFileTreeIconKind({ id: "x", name: "README.md" })).toBe("markdown")
  })
})
