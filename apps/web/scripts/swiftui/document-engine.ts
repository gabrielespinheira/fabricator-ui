import { z } from "zod"

import {
  getRunsText,
  type EditorBlock,
  type EditorInline,
} from "../../registry/fabricator/shared/lib/editor-model"
import { parseMarkdown } from "../../registry/fabricator/shared/lib/markdown-parse"
import {
  getHeadingLevel,
  getMarkdownTree,
  getStringAttribute,
  getTableAlign,
  getTableRows,
  isTaskChecked,
  type MarkdownTableAlign,
  type MarkdownTreeNode,
} from "../../registry/fabricator/shared/lib/markdown-tree"
import {
  getCodeLanguage,
  getLanguageLabel,
  highlightCode,
  resolveLanguage,
} from "../../registry/fabricator/shared/lib/syntax-highlight-model"

const requestSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("markdown"), source: z.string() }),
  z.object({
    action: z.literal("syntax"),
    source: z.string(),
    language: z.string().optional(),
    filename: z.string().optional(),
  }),
])

function getRuns(runs: readonly EditorInline[]) {
  return runs.map((run) => ({
    text: run.text,
    isRaw: run.raw === true,
    marks: (run.marks ?? []).map((mark) => ({
      type: mark.type,
      attributes: mark.attrs ?? {},
    })),
  }))
}

type Runs = ReturnType<typeof getRuns>
type DocumentNode = { id: string } & (
  | { kind: "paragraph" | "quote"; runs: Runs }
  | { kind: "heading"; level: number; runs: Runs }
  | {
      kind: "code"
      code: { source: string; language: string | null; filename?: string }
    }
  | { kind: "divider" }
  | { kind: "raw"; source: string }
  | {
      kind: "image"
      image: { source: string; alt: string; title: string | null }
    }
  | { kind: "table"; table: { rows: Runs[][]; align: MarkdownTableAlign[] } }
  | {
      kind: "list"
      list: {
        isOrdered: boolean
        start: number
        items: {
          id: string
          runs: Runs
          isChecked: boolean | null
          children: DocumentNode[]
        }[]
      }
    }
)

function getBlock(block: EditorBlock): DocumentNode {
  const id = block.id
  const runs = getRuns(block.content)
  switch (block.type) {
    case "heading":
      return { id, kind: "heading", level: getHeadingLevel(block), runs }
    case "quote":
      return { id, kind: "quote", runs }
    case "code":
      return {
        id,
        kind: "code",
        code: {
          source: getRunsText(block.content),
          language: getStringAttribute(block, "language"),
          filename: getStringAttribute(block, "meta")?.match(
            /title=["']([^"']+)["']/
          )?.[1],
        },
      }
    case "divider":
      return { id, kind: "divider" }
    case "raw":
      return { id, kind: "raw", source: getRunsText(block.content) }
    case "image":
      return {
        id,
        kind: "image",
        image: {
          source: getStringAttribute(block, "src") ?? "",
          alt: getStringAttribute(block, "alt") ?? "",
          title: getStringAttribute(block, "title"),
        },
      }
    case "table":
      return {
        id,
        kind: "table",
        table: {
          rows: getTableRows(block).map((row) => row.map(getRuns)),
          align: getTableAlign(block),
        },
      }
    default:
      return { id, kind: "paragraph", runs }
  }
}

function getNodes(nodes: readonly MarkdownTreeNode[]): DocumentNode[] {
  return nodes.map((node) =>
    node.kind === "block"
      ? getBlock(node.block)
      : {
          id: node.items[0]?.block.id ?? "empty-list",
          kind: "list",
          list: {
            isOrdered: node.ordered,
            start: node.start,
            items: node.items.map(({ block, children }) => ({
              id: block.id,
              runs: getRuns(block.content),
              isChecked: block.type === "task" ? isTaskChecked(block) : null,
              children: getNodes(children),
            })),
          },
        }
  )
}

function callDocumentEngine(input: string) {
  try {
    const request = requestSchema.parse(JSON.parse(input))
    if (request.action === "markdown") {
      return JSON.stringify({
        ok: true,
        value: {
          nodes: getNodes(
            getMarkdownTree(parseMarkdown(request.source).blocks)
          ),
        },
      })
    }
    const language = getCodeLanguage(request.language, request.filename)
    return JSON.stringify({
      ok: true,
      value: {
        language,
        label: getLanguageLabel(language),
        isShell: ["bash", "docker", "makefile"].includes(
          resolveLanguage(language) ?? ""
        ),
        lines: highlightCode(request.source, language),
      },
    })
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: {
        name: error instanceof Error ? error.name : "Error",
        message: error instanceof Error ? error.message : String(error),
      },
    })
  }
}

Object.assign(globalThis, { fabricatorDocumentCall: callDocumentEngine })
