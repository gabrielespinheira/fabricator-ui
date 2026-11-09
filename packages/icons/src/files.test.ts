import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import {
  FileDartIcon,
  FileEslintIcon,
  FileSvelteIcon,
  FileTypeIcon,
  FileTypescriptIcon,
  FolderNodeIcon,
  FolderNodeOpenIcon,
  getFileIconName,
  getFolderIconName,
} from "./files"

describe("file associations", () => {
  it.each([
    ["package.json", "file-node"],
    ["COMPONENT.TSX", "file-react-typescript"],
    ["button.test.ts", "file-test-blue"],
    ["/project/src/index.ts", "file-typescript"],
    ["unknown.xyzzy", "default-file"],
    ["__proto__", "default-file"],
    ["constructor", "default-file"],
  ])("resolves %s", (name, icon) => expect(getFileIconName(name)).toBe(icon))

  it("resolves named folders and their expanded drawing", () => {
    expect(getFolderIconName("Components")).toBe("folder-component")
    expect(getFolderIconName("Components", true)).toBe("folder-component-open")
    expect(getFolderIconName("unknown", true)).toBe("default-folder-open")
    expect(getFolderIconName("__proto__")).toBe("default-folder")
  })
})

describe("file icon rendering", () => {
  it("keeps mask ids unique when the same icon appears twice", () => {
    const svg = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(FileSvelteIcon),
        createElement(FileSvelteIcon)
      )
    )
    const ids = [...svg.matchAll(/<mask[^>]*id="([^"]+)"/g)].map(
      (match) => match[1]
    )
    expect(new Set(ids).size).toBe(2)
    for (const id of ids) expect(svg).toContain(`mask="url(#${id})"`)
  })
  it("renders a named icon at its native grid size with theme paint", () => {
    const svg = renderToStaticMarkup(createElement(FileTypescriptIcon))
    expect(svg).toContain('viewBox="0 0 16 16"')
    expect(svg).toContain('width="16"')
    expect(svg).toContain('aria-hidden="true"')
    expect(svg).toContain("var(--file-icon-blue, light-dark(")
  })

  it("selects artwork by filename and preserves SVG props and accessible labels", () => {
    const svg = renderToStaticMarkup(
      createElement(FileTypeIcon, {
        name: "index.ts",
        size: 20,
        "aria-label": "TypeScript",
      })
    )
    expect(svg).toContain('width="20"')
    expect(svg).toContain('aria-label="TypeScript"')
    expect(svg).not.toContain('aria-hidden="true"')
    expect(svg).toContain("fab-file-typescript")
  })
})

it.each([FileDartIcon, FileEslintIcon, FolderNodeIcon, FolderNodeOpenIcon])(
  "renders file artwork with inline blend styles",
  (Icon) => {
    const svg = renderToStaticMarkup(createElement(Icon))
    expect(svg).toMatch(/style="mix-blend-mode:plus-(darker|lighter)"/)
  }
)
