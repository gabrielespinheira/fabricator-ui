import { SearchParamsContext } from "next/dist/shared/lib/hooks-client-context.shared-runtime"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { FileTree } from "../file-tree"

function renderTree(props: React.ComponentProps<typeof FileTree>) {
  return renderToStaticMarkup(
    <SearchParamsContext.Provider value={new URLSearchParams()}>
      <NuqsTestingAdapter>
        <FileTree {...props} />
      </NuqsTestingAdapter>
    </SearchParamsContext.Provider>
  )
}

const nodes = [
  {
    id: "app",
    name: "app",
    children: [
      { id: "page", name: "page.tsx" },
      { id: "disabled", name: "disabled.ts", disabled: true },
    ],
  },
]

describe("FileTree", () => {
  it("uses the file icon pack, including expanded folders", () => {
    const html = renderTree({ nodes, defaultExpandedIds: ["app"] })
    expect(html).toContain("fab-folder-client-open")
    expect(html).toContain("fab-file-react-typescript")
  })
  it("exposes the hierarchy, expansion and selection to assistive technology", () => {
    const html = renderTree({
      "aria-label": "Project files",
      nodes,
      selectionMode: "multiple",
      defaultExpandedIds: ["app"],
      defaultSelectedIds: ["page"],
    })
    expect(html).toContain('role="tree"')
    expect(html).toContain('aria-label="Project files"')
    expect(html).toContain('aria-multiselectable="true"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toMatch(
      /role="treeitem"[^>]*aria-level="2"[^>]*aria-posinset="1"[^>]*aria-setsize="2"[^>]*aria-selected="true"/
    )
    expect(html.match(/tabindex="0"/g)).toHaveLength(1)
    expect(html).toContain('aria-disabled="true"')
  })

  it("keeps collapsed children out of the accessibility tree", () => {
    const html = renderTree({ nodes })
    expect(html).not.toContain("page.tsx")
    expect(html).toContain('aria-expanded="false"')
  })

  it("keeps an empty tree focusable and renders a caller's empty state", () => {
    const html = renderTree({ nodes: [], emptyContent: "No files" })
    expect(html).toContain('tabindex="0"')
    expect(html).toContain("No files")
  })

  it("glides one shared hover highlight over the rows", () => {
    const html = renderTree({ nodes })
    expect(html).toMatch(/role="tree"[^>]*data-fluid-hover=""/)
    expect(html).toContain('data-slot="fluid-hover-highlight"')
  })

  it("slides a single selection, and paints each row of a multiple one", () => {
    expect(renderTree({ nodes, selectionMode: "single" })).toContain(
      'data-slot="fluid-hover-selection"'
    )
    expect(renderTree({ nodes, selectionMode: "multiple" })).not.toContain(
      'data-slot="fluid-hover-selection"'
    )
    expect(renderTree({ nodes, selectionMode: "none" })).not.toContain(
      'data-slot="fluid-hover-selection"'
    )
  })

  it("marks the selection mode so a multiple selection's rows can join", () => {
    expect(renderTree({ nodes, selectionMode: "multiple" })).toMatch(
      /role="tree"[^>]*data-selection-mode="multiple"/
    )
  })

  it("omits selection semantics in navigation-only mode", () => {
    const html = renderTree({ nodes, selectionMode: "none", disabled: true })
    expect(html).not.toContain("aria-selected")
    expect(html).not.toContain('tabindex="0"')
  })
})
