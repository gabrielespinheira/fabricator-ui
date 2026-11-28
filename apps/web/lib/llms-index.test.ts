import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const DOCS_DIRECTORY = path.join(process.cwd(), "content/docs")
const LLMS = fs.readFileSync(
  path.join(process.cwd(), "public/llms.txt"),
  "utf8"
)
const DOCS_LINK = /https:\/\/fabricator-ui\.vercel\.app\/docs(\/[^)\s]*)?\.md/g

const linked = new Set(
  [...LLMS.matchAll(DOCS_LINK)].map(([, page]) => page?.slice(1) ?? "")
)

function hasDocsPage(page: string) {
  return [
    `${page}.mdx`,
    `${page}/index.mdx`,
    `(root)/${page || "index"}.mdx`,
  ].some((candidate) => fs.existsSync(path.join(DOCS_DIRECTORY, candidate)))
}

function readPages(folder: string) {
  const meta = JSON.parse(
    fs.readFileSync(path.join(DOCS_DIRECTORY, folder, "meta.json"), "utf8")
  ) as { pages: string[] }
  // `form` stays in the tree for upstream's redirect, with no page of its own.
  return meta.pages
    .map((page) => `${folder}/${page}`)
    .filter((page) => hasDocsPage(page))
}

function readFolder(folder: string) {
  return fs
    .readdirSync(path.join(DOCS_DIRECTORY, folder), { recursive: true })
    .map(String)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => `${folder}/${file.replace(/\.mdx$/, "")}`)
}

// public/llms.txt is written by hand; these keep it in step with the docs.
describe("llms.txt", () => {
  it("links only to docs pages that exist", () => {
    expect([...linked].filter((page) => !hasDocsPage(page))).toEqual([])
  })

  it("lists every Base UI component, foundation and installation guide", () => {
    const pages = [
      ...readPages("components/base"),
      ...readPages("foundations"),
      ...readPages("installation"),
      ...readFolder("advanced"),
      ...readFolder("app-shell"),
    ]
    expect(pages.filter((page) => !linked.has(page))).toEqual([])
  })
})
